"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Art, StarGlyph } from "@/components/Art";
import { BadgeIcon } from "@/components/pixel/BadgeIcon";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { ChestReveal } from "@/components/rewards/ChestReveal";
import { BOSS_RULES, TEST_BOSS_RULES, type ChestContents } from "@/lib/gamification/collection";
import { GREY_FOX } from "@/lib/pixel/sprites/greyFox";
import { hatSprite } from "@/lib/pixel/sprites/hats";
import { novaSprites } from "@/lib/pixel/sprites/nova";
import { FoxArena } from "./FoxArena";
import { bossFor } from "@/lib/pixel/sprites/bosses";
import { heartEmpty, heartFull } from "@/lib/pixel/sprites/ui";
import type { ClientItem, ItemResponse } from "@/lib/content/client";
import { BADGE_BY_ID } from "@/lib/gamification/badges";
import type { RewardEvent, Rewards } from "@/lib/gamification/engine";
import type { SessionMode } from "@/lib/scheduling/sessionBuilder";
import type { AnswerFeedback, DailyStatus, StatsSummary, SubmitResult } from "@/lib/services/practice";
import { cx } from "@/lib/ui";
import { playSfx, setSoundEnabled, speakWord, type Sfx } from "../sound";
import { BossArena, type BattleBeat } from "./BossArena";
import { LaneRunner, type RunnerResult } from "./game/LaneRunner";
import { StarCatch } from "./game/StarCatch";
import { JourneyStrip, type JourneyBeat } from "./JourneyStrip";
import { nextPace, runnerEligible } from "@/lib/game/runner";
import { mcqGame, pickDecoy, starEligible } from "@/lib/game/starCatch";
import { QuestionInput, RichSentence, SpeakerIcon, questionTitle } from "./inputs";

type QueueItem = ClientItem & { lessonId: string; unitId: string; isNew: boolean; retry?: number; key: string };

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "answering" }
  | { kind: "submitting" }
  | { kind: "feedback"; feedback: AnswerFeedback; xp: number }
  | { kind: "self_check"; modelAnswer: string; keyPoints: string[]; reason: string }
  | { kind: "summary" };

interface Tally {
  answered: number;
  correct: number;
  xp: number;
  stars: number;
  fixed: number;
  badges: string[];
  levelUp: { level: number; title: string } | null;
  streak: number | null;
  chest: ChestContents | null;
}

/** Boss battle state, only used in boss mode. */
interface Battle {
  hp: number;
  hits: number;
  heartsLeft: number;
  /** Correct answers in a row during this battle (3+ = critical hits). */
  run: number;
  beat: BattleBeat | null;
  message: string;
  outcome: "won" | "lost" | null;
}

interface BossClaim {
  status: "pending" | "done" | "error";
  first?: boolean;
  rewarded?: boolean;
  heartsLeft?: number;
  xp?: number;
  stars?: number;
  error?: string;
}

const EMPTY_TALLY: Tally = { answered: 0, correct: 0, xp: 0, stars: 0, fixed: 0, badges: [], levelUp: null, streak: null, chest: null };

const MODE_LABEL: Record<SessionMode, string> = {
  review: "Round 1 · Review",
  explore: "Round 2 · Explore",
  lesson: "Lesson practice",
  mistakes: "Mistake gym",
  boss: "Boss battle",
  "test-boss": "Boss battle",
};

const MAX_RETRIES = 3;

/** Written answers: in game mode they are fought out with the unit's "story monster". */
const STORY_TYPES = new Set<ClientItem["type"]>(["open", "rewrite", "proofread"]);

const GAME_MODE_KEY = "starlight.gameMode";

/**
 * Game mode is on unless switched off on this device. With reduced motion the runner still
 * plays, but its gates wait in place until the student presses GO.
 */
function readGameMode(): boolean {
  try {
    const saved = localStorage.getItem(GAME_MODE_KEY);
    if (saved) return saved === "on";
  } catch {
    /* private mode */
  }
  return true;
}

export function Runner({
  mode,
  lessonId,
  lessonIds,
  lessonTitle,
  soundOn,
  unitId,
  bossReady = false,
  hat = null,
}: {
  mode: SessionMode;
  lessonId?: string;
  /** Lesson mode: several topics the student chose to practise together. */
  lessonIds?: string[];
  lessonTitle?: string;
  soundOn: boolean;
  /** The lesson's unit (boss battles use its boss and backdrop). */
  unitId?: string;
  /** Lesson practice: the lesson's boss is unlocked, so the summary offers the battle. */
  bossReady?: boolean;
  /** The hat Nova wears (a shop id), or null. */
  hat?: string | null;
}) {
  const isBoss = mode === "boss" && !!unitId;
  /** The Grey Fox, the test-prep boss. */
  const isFox = mode === "test-boss";
  const inBattle = isBoss || isFox;
  const chosenTopics = lessonIds?.length ? lessonIds.join(",") : null;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<ItemResponse | null>(null);
  const [lastResponse, setLastResponse] = useState<ItemResponse | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [daily, setDaily] = useState<DailyStatus | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<RewardEvent | null>(null);
  const [doneBanner, setDoneBanner] = useState(false);
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const [battle, setBattle] = useState<Battle | null>(null);
  /** The Grey Fox's bubble for the question just answered: ticked (right) or thrown (wrong). */
  const [foxAnswer, setFoxAnswer] = useState<{ key: string; state: "right" | "wrong" } | null>(null);
  const [claim, setClaim] = useState<BossClaim | null>(null);
  const [bossUnlocked, setBossUnlocked] = useState(bossReady);
  /** Height of the feedback sheet, so the page can make room for it below the question. */
  const [sheetHeight, setSheetHeight] = useState(0);
  /** Game mode: multiple-choice questions are played as mini-games, spelling as Star Catch (saved per device). */
  const [gameMode, setGameMode] = useState(true);
  /** The runner's outcome animation is playing: hold the feedback sheet until it ends. */
  const [runnerHold, setRunnerHold] = useState(false);
  /** The story monster for written answers: hits so far, the latest beat and its line. */
  const [story, setStory] = useState<{ hits: number; beat: BattleBeat | null; message: string }>({ hits: 0, beat: null, message: "" });
  /** Runner speed: eases off after mistakes, picks up on a streak. */
  const [pace, setPace] = useState(1);
  /** Nova's journey strip: how far she has walked (never backwards) and the latest step. */
  const [journey, setJourney] = useState<{ progress: number; beat: JourneyBeat | null }>({ progress: 0, beat: null });
  const startedAt = useRef<number>(0);
  const celebrationQueue = useRef<RewardEvent[]>([]);
  /** Set when "Continue" was pressed but a celebration was shown first. */
  const advanceAfterCelebration = useRef(false);
  const completed = useRef(false);

  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  const current = queue[index];

  const start = useCallback(async (showLoading = true) => {
    if (showLoading) setPhase({ kind: "loading" });
    completed.current = false;
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, lessonId: lessonId ?? null, lessonIds: chosenTopics ? chosenTopics.split(",") : null }),
      });
      if (res.status === 401) {
        router.replace("/join");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start");
      const items = (data.items as (ClientItem & { lessonId: string; unitId: string; isNew: boolean })[]).map((it, i) => ({ ...it, key: `${it.id}#${i}` }));
      setQueue(items);
      setIndex(0);
      setDaily(data.daily);
      setDoneBanner(false);
      setTally(EMPTY_TALLY);
      setClaim(null);
      setRunnerHold(false);
      setGameMode(readGameMode());
      setJourney({ progress: 0, beat: null });
      if (unitId || items[0]) {
        const monster = bossFor(items[0]?.unitId ?? unitId!);
        setStory({ hits: 0, beat: null, message: `${monster.name} is loose in this chapter! Write good answers to drive it back.` });
      }
      if (isFox) {
        setBattle({ hp: TEST_BOSS_RULES.hp, hits: 0, heartsLeft: TEST_BOSS_RULES.hearts, run: 0, beat: null, message: `${GREY_FOX.name} appears! ${GREY_FOX.intro}`, outcome: null });
        setFoxAnswer(null);
      }
      if (mode === "boss" && unitId) {
        const boss = bossFor(unitId);
        setBattle({ hp: items.length, hits: 0, heartsLeft: BOSS_RULES.hearts, run: 0, beat: null, message: `${boss.name} appears! ${boss.intro}`, outcome: null });
      }
      setPhase(items.length ? { kind: "answering" } : { kind: "empty" });
      startedAt.current = Date.now();
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "Could not start" });
    }
  }, [mode, lessonId, chosenTopics, router, unitId, isFox]);

  useEffect(() => {
    // Initial phase is already "loading"; start(false) only updates state after the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start(false);
  }, [start]);

  const showNextCelebration = useCallback(() => {
    const next = celebrationQueue.current.shift() ?? null;
    setCelebration(next);
    if (next?.kind === "level_up") playSfx("levelup");
    else if (next?.kind === "badge") playSfx("badge");
    else if (next?.kind === "star_lit") playSfx("star");
  }, []);

  function applyRewards(rewards: Rewards) {
    let sfx: Sfx | null = null;
    for (const e of rewards.events) {
      if (e.kind === "combo") {
        setToast(`${e.value} in a row! ×${e.value >= 10 ? 2 : 1.5} XP`);
        sfx = "combo";
      }
      if (e.kind === "mistake_fixed") setToast("Mistake fixed!");
      if (e.kind === "level_up" || e.kind === "badge" || e.kind === "star_lit") celebrationQueue.current.push(e);
      if (e.kind === "chest") setTally((t) => ({ ...t, chest: e.contents }));
    }
    setTally((t) => ({
      ...t,
      xp: t.xp + rewards.xp,
      stars: t.stars + rewards.stars,
      fixed: t.fixed + rewards.events.filter((e) => e.kind === "mistake_fixed").length,
      badges: [...t.badges, ...rewards.badges],
      levelUp: (rewards.events.find((e) => e.kind === "level_up") as { level: number; title: string } | undefined) ?? t.levelUp,
      streak: (rewards.events.find((e) => e.kind === "goal_met") as { streak: number } | undefined)?.streak ?? t.streak,
    }));
    if (sfx) playSfx(sfx);
  }

  async function submit(selfVerdict?: "correct" | "incorrect", override?: ItemResponse): Promise<RunnerResult> {
    const resp = override ?? (selfVerdict ? lastResponse : response);
    if (!current || !resp) return null;
    setPhase({ kind: "submitting" });
    setLastResponse(resp);
    const seconds = (Date.now() - startedAt.current) / 1000;
    try {
      const res = await fetch("/api/session/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: current.id, response: resp, seconds, mode, selfVerdict }),
      });
      const data = (await res.json()) as SubmitResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not check your answer");
      if (data.status === "self_check") {
        setPhase({ kind: "self_check", modelAnswer: data.modelAnswer, keyPoints: data.keyPoints, reason: data.reason });
        return null;
      }
      const verdict = data.feedback.verdict;
      playSfx(verdict === "correct" ? "correct" : "wrong", verdict === "correct" ? 0.5 : 0.35);
      setStats(data.stats);
      if (data.daily.done && !daily?.done) setDoneBanner(true);
      setDaily(data.daily);
      setTally((t) => ({ ...t, answered: t.answered + 1, correct: t.correct + (verdict === "correct" ? 1 : 0) }));
      applyRewards(data.rewards);
      if (battle) setBattle(nextBeat(battle, verdict === "correct", isFox ? GREY_FOX.name : bossFor(unitId!).name, isFox));
      if (isFox) {
        setFoxAnswer({ key: current.key, state: verdict === "correct" ? "right" : "wrong" });
        // Bring the arena into view: the tick, or the throw at Nova, plays up there.
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (!battle && STORY_TYPES.has(current.type)) {
        const name = bossFor(current.unitId).name;
        const left = queue.filter((q) => STORY_TYPES.has(q.type)).length - (story.hits + (verdict === "incorrect" ? 0 : 1));
        setStory((st) =>
          verdict === "incorrect"
            ? { ...st, beat: { id: (st.beat?.id ?? 0) + 1, kind: "hurt" }, message: `${name} dodges and hits back! That question will come again.` }
            : {
                hits: st.hits + 1,
                beat: { id: (st.beat?.id ?? 0) + 1, kind: data.stats.combo >= 3 ? "crit" : "hit" },
                message: left <= 0 ? `${name} flees! The chapter is safe.` : verdict === "partial" ? `A glancing blow! ${left} to go.` : `Nova strikes! ${left} to go.`,
              },
        );
      }
      // Nova walks a step (or dashes on a combo, or stumbles on a mistake). A mistake adds a retry
      // to the queue; her progress never goes backwards.
      const requeue = verdict !== "correct" && (current.retry ?? 0) < MAX_RETRIES;
      const reached = (index + 1) / (queue.length + (requeue ? 1 : 0));
      setJourney((j) => ({
        progress: Math.max(j.progress, reached),
        beat: { id: (j.beat?.id ?? 0) + 1, kind: verdict !== "correct" ? "trip" : data.stats.combo >= 3 ? "dash" : "step" },
      }));
      // Re-practise mistakes later in this same session, until they are right.
      if (verdict !== "correct" && (current.retry ?? 0) < MAX_RETRIES) {
        setQueue((q) => {
          const gap = 3 + Math.floor(Math.random() * 3);
          const at = Math.min(index + 1 + gap, q.length);
          const copy: QueueItem = { ...current, retry: (current.retry ?? 0) + 1, key: `${current.id}#retry${(current.retry ?? 0) + 1}` };
          return [...q.slice(0, at), copy, ...q.slice(at)];
        });
      }
      setPace((p) => nextPace(p, verdict === "correct", data.stats.combo));
      setPhase({ kind: "feedback", feedback: data.feedback, xp: data.rewards.xp });
      return { verdict, modelAnswer: data.feedback.modelAnswer };
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not check your answer");
      setPhase({ kind: "answering" });
      return null;
    }
  }

  const advance = useCallback(() => {
    setResponse(null);
    setToast(null);
    setRunnerHold(false);
    if (battle?.outcome || index + 1 >= queue.length) {
      setPhase({ kind: "summary" });
      return;
    }
    setIndex(index + 1);
    setPhase({ kind: "answering" });
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" });
    startedAt.current = Date.now();
  }, [index, queue.length, battle?.outcome]);

  const next = useCallback(() => {
    if (celebrationQueue.current.length && !celebration) {
      advanceAfterCelebration.current = true;
      showNextCelebration();
      return;
    }
    advance();
  }, [advance, celebration, showNextCelebration]);

  const closeCelebration = useCallback(() => {
    if (celebrationQueue.current.length) {
      showNextCelebration();
      return;
    }
    setCelebration(null);
    if (advanceAfterCelebration.current) {
      advanceAfterCelebration.current = false;
      advance();
    }
  }, [advance, showNextCelebration]);

  // Finish the round on the server when the summary appears.
  useEffect(() => {
    if (phase.kind !== "summary" || completed.current) return;
    completed.current = true;
    if (inBattle) {
      if (battle?.outcome !== "won") return;
      void (async () => {
        const res = await fetch("/api/boss/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isFox ? { test: true } : { lessonId }) });
        const data = (await res.json()) as { rewards: Rewards; stats: StatsSummary; heartsLeft: number; first: boolean; rewarded: boolean; error?: string };
        if (!res.ok) {
          setClaim({ status: "error", error: data.error ?? "Could not record the victory" });
          return;
        }
        setStats(data.stats);
        applyRewards(data.rewards);
        playSfx("levelup");
        setClaim({ status: "done", first: data.first, rewarded: data.rewarded, heartsLeft: data.heartsLeft, xp: data.rewards.xp, stars: data.rewards.stars });
        if (celebrationQueue.current.length) showNextCelebration();
      })();
      return;
    }
    void (async () => {
      const res = await fetch("/api/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, answered: tally.answered, lessonId: lessonId ?? null }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { rewards: Rewards; stats: StatsSummary; daily: DailyStatus; counted: boolean; bossReady: boolean };
      if (data.bossReady) setBossUnlocked(true);
      setStats(data.stats);
      setDaily(data.daily);
      applyRewards(data.rewards);
      if (data.rewards.events.some((e) => e.kind === "goal_met")) playSfx("streak");
      if (celebrationQueue.current.length) showNextCelebration();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  // When feedback slides up, keep the question's answers in view above it: make room at the
  // bottom of the page and scroll the right answer (or the question) just above the sheet.
  useEffect(() => {
    if (phase.kind !== "feedback" || runnerHold) return;
    const t = setTimeout(() => {
      const sheet = document.getElementById("feedback-sheet");
      if (!sheet) return;
      const h = sheet.getBoundingClientRect().height;
      setSheetHeight(h);
      if (isFox) return; // the Grey Fox's arena stays in view instead
      requestAnimationFrame(() => {
        // The right answer and the student's pick, if they're marked; otherwise the question card.
        const marked = [...document.querySelectorAll<HTMLElement>('main section [data-state="right"], main section [data-state="wrong"]')];
        const targets = marked.length ? marked : [...document.querySelectorAll<HTMLElement>("main section.paper-card, main section[aria-label='Answer runner'], main section[aria-label='Star catch']")];
        if (!targets.length) return;
        const rects = targets.map((t) => t.getBoundingClientRect());
        const top = Math.min(...rects.map((r) => r.top));
        const bottom = Math.max(...rects.map((r) => r.bottom));
        const visibleBottom = window.innerHeight - h - 12;
        if (bottom > visibleBottom) window.scrollBy({ top: Math.min(bottom - visibleBottom, Math.max(0, top - 72)), behavior: "smooth" });
      });
    }, 380);
    return () => clearTimeout(t);
  }, [phase.kind, runnerHold, isFox]);

  // Enter = continue after feedback.
  useEffect(() => {
    if (phase.kind !== "feedback" || runnerHold) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    const t = setTimeout(() => window.addEventListener("keydown", onKey), 250);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase.kind, next, runnerHold]);

  // In game mode, multiple-choice questions are played in blocks of three, in Star Catch and
  // then in the lane runner; spelling words are played as Star Catch letters.
  const playing = phase.kind === "answering" || phase.kind === "submitting" || phase.kind === "feedback";
  const game = useMemo((): "runner" | "stars" | "spell" | "match" | null => {
    if (inBattle || !gameMode || !current || !playing) return null;
    if ((current.type === "dictation" || current.type === "typed") && current.spell) return "spell";
    if (current.type === "match" && current.pairKey) return "match";
    if (current.type !== "mcq" || !runnerEligible(current)) return null;
    const before = queue.slice(0, index).filter((q) => q.type === "mcq" && runnerEligible(q)).length;
    return mcqGame(before, starEligible(current));
  }, [inBattle, gameMode, current, playing, queue, index]);
  const asGame = game !== null;
  /** Star Catch: a third star for two-answer questions, borrowed from the round's other questions. */
  const decoy = useMemo(() => {
    if (game !== "stars" || current?.type !== "mcq") return null;
    const pool = queue.flatMap((q) => (q.type === "mcq" && q.id !== current.id ? q.options : []));
    return pickDecoy(current.id, current.options, pool);
  }, [game, current, queue]);
  const toggleGameMode = () => {
    const next = !gameMode;
    setGameMode(next);
    try {
      localStorage.setItem(GAME_MODE_KEY, next ? "on" : "off");
    } catch {
      /* private mode */
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const locked = phase.kind !== "answering";
  const review = phase.kind === "feedback" ? { modelAnswer: phase.feedback.modelAnswer, details: phase.feedback.details, verdict: phase.feedback.verdict } : undefined;

  return (
    <main className="night-sky min-h-dvh">
      {/* A mini-game takes the whole screen (no page scrolling); questions on cards scroll as a page. */}
      <div
        className={cx(
          "mx-auto flex max-w-2xl flex-col sm:px-6",
          asGame ? "h-dvh overflow-hidden px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:pt-4" : "min-h-dvh px-4 pb-40 pt-4",
        )}
        style={phase.kind === "feedback" && sheetHeight ? { paddingBottom: sheetHeight + 24 } : undefined}
      >
        <header className="flex items-center gap-3">
          <Link href="/home" className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-xl text-ink-200 hover:bg-white/10" aria-label="Close and go back">
            ×
          </Link>
          {inBattle ? (
            <p className="flex-1 text-center font-pixel text-lg tracking-widest text-[#ead39b]">BOSS BATTLE</p>
          ) : (
            <p className="flex-1 truncate text-center font-pixel text-base tracking-wider text-[#ead39b]">{MODE_LABEL[mode]}</p>
          )}
          {!inBattle && (
            <button type="button" onClick={toggleGameMode} className="rounded-full bg-white/5 px-3 py-1.5 font-pixel text-sm text-[#ead39b] hover:bg-white/10" aria-pressed={gameMode} title="Play questions as mini-games (Star Catch and the runner), or answer them on cards">
              {gameMode ? "🎮 Game" : "📝 Cards"}
            </button>
          )}
          <div className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-sm font-bold" aria-label="XP this round">
            <StarGlyph className="h-4 w-4 text-amber-300" />
            {tally.xp}
          </div>
        </header>
        {!inBattle && gameMode && current && STORY_TYPES.has(current.type) && phase.kind !== "summary" && phase.kind !== "loading" && phase.kind !== "error" && phase.kind !== "empty" ? (
          <BossArena
            unitId={current.unitId}
            hp={Math.max(story.hits, queue.filter((q) => STORY_TYPES.has(q.type)).length)}
            hits={story.hits}
            hearts={0}
            heartsLeft={0}
            beat={story.beat}
            message={story.message}
            hat={hat}
            label={`Story monster: ${bossFor(current.unitId).name}`}
            winText="It flees!"
          />
        ) : !inBattle && !asGame && current && phase.kind !== "loading" && phase.kind !== "error" && phase.kind !== "empty" && (
          <JourneyStrip unitId={current.unitId} progress={phase.kind === "summary" ? 1 : journey.progress} beat={journey.beat} done={phase.kind === "summary"} hat={hat} />
        )}
        <p className={cx("mt-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-ink-400", asGame && "hidden sm:block")}>{lessonTitle ?? MODE_LABEL[mode]}</p>
        {battle && isFox && current && phase.kind !== "summary" && phase.kind !== "loading" && phase.kind !== "error" && phase.kind !== "empty" && (
          <FoxArena
            hp={battle.hp}
            hits={battle.hits}
            hearts={TEST_BOSS_RULES.hearts}
            heartsLeft={battle.heartsLeft}
            beat={battle.beat}
            message={battle.message}
            hat={hat}
            bubble={{ key: current.key, prompt: questionTitle(current), sentence: "sentence" in current ? current.sentence : undefined, state: foxAnswer?.key === current.key ? foxAnswer.state : "ask" }}
          />
        )}
        {battle && !isFox && unitId && phase.kind !== "summary" && phase.kind !== "loading" && phase.kind !== "error" && phase.kind !== "empty" && (
          <BossArena unitId={unitId} hp={battle.hp} hits={battle.hits} hearts={BOSS_RULES.hearts} heartsLeft={battle.heartsLeft} beat={battle.beat} message={battle.message} hat={hat} />
        )}

        <AnimatePresence>
          {doneBanner && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm">
              <span className="text-amber-300">★</span>
              <span className="flex-1">That's 20 minutes today — brilliant! Finish this round or stop here.</span>
              <button className="font-bold text-amber-300" onClick={() => setDoneBanner(false)}>
                OK
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {phase.kind === "loading" && <CenterNote title="Gathering your stars…" />}
        {phase.kind === "error" && <CenterNote title="Something went wrong" body={phase.message} action={<button className="btn btn-primary" onClick={() => void start()}>Try again</button>} />}
        {phase.kind === "empty" && (
          <CenterNote
            title={mode === "mistakes" ? "No mistakes to fix!" : "Nothing new right now"}
            body={mode === "mistakes" ? "Everything you got wrong has been fixed. Come back after your next round." : "You've reached today's limit for new questions. Try the Mistake gym or a lesson from your sky."}
            action={<Link className="btn btn-primary" href="/home">Back to your sky</Link>}
          />
        )}

        {game === "runner" && current?.type === "mcq" && (
          <LaneRunner
            key={current.key}
            item={current}
            unitId={current.unitId}
            hat={hat}
            combo={stats?.combo ?? 0}
            pace={pace}
            onChoose={(choice) => {
              setRunnerHold(true);
              return submit(undefined, { type: "mcq", choice });
            }}
            onFinished={(verdict) => {
              if (verdict === "correct") next();
              else setRunnerHold(false);
            }}
          />
        )}
        {(game === "stars" || game === "spell" || game === "match") && current && (
          <StarCatch
            key={current.key}
            item={current as Parameters<typeof StarCatch>[0]["item"]}
            unitId={current.unitId}
            hat={hat}
            combo={stats?.combo ?? 0}
            xp={tally.xp}
            pace={pace}
            decoy={decoy}
            onChoose={(response) => {
              setRunnerHold(true);
              return submit(undefined, response);
            }}
            onFinished={(verdict) => {
              if (verdict === "correct") next();
              else setRunnerHold(false);
            }}
          />
        )}
        {!asGame && current && phase.kind !== "summary" && phase.kind !== "loading" && phase.kind !== "error" && phase.kind !== "empty" && (
          <AnimatePresence mode="wait">
            <motion.section key={current.key} data-item={current.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }} className="paper-card relative mt-5 p-5 sm:p-7">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {current.retry ? <Chip tone="rose">Second chance</Chip> : current.isNew ? <Chip tone="amber">New</Chip> : <Chip tone="ink">Review</Chip>}
              </div>
              {/* With the Grey Fox, the question is in his speech bubble above. */}
              {isFox ? <p className="text-sm font-semibold uppercase tracking-wider text-text-soft">Your answer</p> : <QuestionTitle item={current} />}
              <div className="mt-5">
                <QuestionInput key={current.key} item={current} onChange={setResponse} onSubmit={() => !locked && response && void submit()} locked={locked} review={review} />
              </div>
            </motion.section>
          </AnimatePresence>
        )}

        {phase.kind === "summary" && isFox && battle && <FoxResult battle={battle} claim={claim} onAgain={() => void start()} />}
        {phase.kind === "summary" && isBoss && battle && <BossResult unitId={unitId!} lessonId={lessonId!} battle={battle} claim={claim} tally={tally} onAgain={() => void start()} />}
        {phase.kind === "summary" && !inBattle && <Summary tally={tally} stats={stats} daily={daily} mode={mode} lessonId={lessonId} bossReady={bossUnlocked} onAgain={() => void start()} />}
      </div>

      {/* Bottom action area: submit, or feedback panel. */}
      {current && !asGame && (phase.kind === "answering" || phase.kind === "submitting") && (
        <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-ink-900/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button className="btn btn-primary w-full text-lg" disabled={!response || phase.kind === "submitting"} onClick={() => void submit()}>
              {phase.kind === "submitting" ? "Checking…" : "Check answer"}
            </button>
          </div>
        </div>
      )}
      <AnimatePresence>{phase.kind === "feedback" && !runnerHold && <FeedbackPanel feedback={phase.feedback} xp={phase.xp} onNext={next} />}</AnimatePresence>
      {phase.kind === "self_check" && <SelfCheckPanel {...phase} onChoose={(v) => void submit(v)} />}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
            <div className="rounded-full bg-amber-400 px-4 py-2 font-bold text-ink-900 shadow-[var(--shadow-lift)]">{toast}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{celebration && <Celebration event={celebration} onClose={closeCelebration} />}</AnimatePresence>
    </main>
  );
}

function QuestionTitle({ item }: { item: ClientItem }) {
  const title = questionTitle(item);
  return <RichSentence text={title} className="font-display text-[1.35rem] font-semibold leading-snug sm:text-2xl" />;
}

function Chip({ children, tone }: { children: React.ReactNode; tone: "amber" | "rose" | "ink" }) {
  const cls = tone === "amber" ? "bg-amber-300/60 text-amber-700" : tone === "rose" ? "bg-rose-300/50 text-rose-600" : "bg-paper-200 text-text-soft";
  return <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", cls)}>{children}</span>;
}

function CenterNote({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <Art src="/art/mascot/think.webp" alt="" className="mb-4 h-32 w-32 object-contain" fallback={<StarGlyph className="h-10 w-10 text-amber-400" />} />
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {body && <p className="mt-2 max-w-sm text-ink-300">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function FeedbackPanel({ feedback, xp, onNext }: { feedback: AnswerFeedback; xp: number; onNext: () => void }) {
  const tone = feedback.verdict === "correct" ? "right" : feedback.verdict === "partial" ? "partial" : "wrong";
  const palette = {
    right: { bg: "bg-[#e7f6f3]", border: "border-teal-400", title: "text-teal-600", label: "Correct!" },
    partial: { bg: "bg-[#fdf3e2]", border: "border-amber-400", title: "text-amber-700", label: "Almost there" },
    wrong: { bg: "bg-[#fbecec]", border: "border-rose-400", title: "text-rose-600", label: "Not quite" },
  }[tone];
  // Skip the answer box when the feedback line already names the answer ("The answer is …").
  const saysAnswer = !!feedback.modelAnswer && feedback.feedback.includes(`“${feedback.modelAnswer}”`);
  const showModel = !saysAnswer && (feedback.verdict !== "correct" || feedback.byLlm || feedback.notes.length > 0);
  return (
    <motion.div id="feedback-sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className={cx("fixed inset-x-0 bottom-0 z-30 max-h-[75dvh] overflow-y-auto border-t-4 text-text", palette.bg, palette.border)} role="status" aria-live="polite">
      <div className="mx-auto max-w-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <h2 className={cx("font-display text-2xl font-semibold", palette.title)}>{palette.label}</h2>
          {xp > 0 && <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-amber-700">+{xp} XP</span>}
        </div>
        <p className="mt-1 text-[1.02rem]">{feedback.feedback}</p>
        {showModel && feedback.modelAnswer && (
          <div className="mt-3 rounded-xl bg-white/70 p-3">
            <div className="eyebrow text-text-soft">{feedback.verdict === "correct" ? "Model answer" : "The answer"}</div>
            <p className="mt-1 whitespace-pre-line font-semibold">{feedback.modelAnswer}</p>
          </div>
        )}
        {feedback.notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {feedback.notes.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="text-amber-700">✎</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        )}
        {feedback.explanation && <p className="mt-3 text-sm text-text-soft">{feedback.explanation}</p>}
        {(feedback.feedbackHe || feedback.he) && (
          <p dir="auto" lang="he" className="mt-3 rounded-xl bg-white/60 p-3 text-[1.02rem] leading-relaxed">
            {feedback.feedbackHe ?? feedback.he}
            {feedback.feedbackHe && feedback.he ? <span dir="auto" className="mt-1 block text-sm text-text-soft">{feedback.he}</span> : null}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn btn-ink flex-1 text-lg" onClick={onNext} autoFocus>
            Continue
          </button>
          {feedback.speak && (
            <button className="btn btn-ghost !text-text" style={{ borderColor: "var(--color-paper-300)" }} onClick={() => void speakWord(feedback.speak!)} aria-label={`Hear “${feedback.speak}”`}>
              <SpeakerIcon />
            </button>
          )}
        </div>
        {feedback.source && <p className="mt-3 text-xs text-text-soft">Look it up: {feedback.source}</p>}
      </div>
    </motion.div>
  );
}

function SelfCheckPanel({ modelAnswer, keyPoints, reason, onChoose }: { modelAnswer: string; keyPoints: string[]; reason: string; onChoose: (v: "correct" | "incorrect") => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[75dvh] overflow-y-auto border-t-4 border-sky-400 bg-paper-100 text-text">
      <div className="mx-auto max-w-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <h2 className="font-display text-2xl font-semibold">Check it yourself</h2>
        <p className="mt-1 text-text-soft">{reason === "daily-limit" ? "You've used today's automatic checks." : "The answer checker is busy right now."} Compare your answer with this one:</p>
        <div className="mt-3 rounded-xl bg-white p-3">
          <p className="font-semibold">{modelAnswer}</p>
          {keyPoints.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-text-soft">
              {keyPoints.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-3 font-semibold">Did your answer include the main points?</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button className="btn btn-ink" onClick={() => onChoose("correct")}>
            Yes, it did
          </button>
          <button className="btn btn-ghost !text-text" style={{ borderColor: "var(--color-paper-300)" }} onClick={() => onChoose("incorrect")}>
            Not really
          </button>
        </div>
      </div>
    </div>
  );
}

function Celebration({ event, onClose }: { event: RewardEvent; onClose: () => void }) {
  const content = useMemo(() => {
    if (event.kind === "level_up") return { eyebrow: "Level up", title: `Level ${event.level}`, body: `You're now a ${event.title}.`, art: "/art/scenes/level-up.webp" };
    if (event.kind === "badge") {
      const b = BADGE_BY_ID.get(event.id);
      return { eyebrow: "New badge", title: b?.title ?? "Badge", body: b?.description ?? "", art: "", badge: b };
    }
    if (event.kind === "star_lit") return { eyebrow: "Star lit", title: "A new star shines", body: "You mastered every question in a lesson!", art: "/art/scenes/star-lit.webp" };
    return null;
  }, [event]);
  if (!content) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-6 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={content.title}>
      <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 18 }} className="w-full max-w-xs text-center" onClick={(e) => e.stopPropagation()}>
        {"badge" in content && content.badge ? (
          <BadgeIcon badge={content.badge} size={192} className="shadow-[0_0_80px_rgb(242_169_59/0.45)]" />
        ) : (
          <Art src={content.art} alt="" className="mx-auto h-48 w-48 rounded-full object-cover shadow-[0_0_80px_rgb(242_169_59/0.45)]" fallback={<StarGlyph className="h-16 w-16 text-amber-400" />} />
        )}
        <p className="eyebrow mt-6 text-amber-400">{content.eyebrow}</p>
        <h2 className="mt-1 font-display text-3xl font-semibold">{content.title}</h2>
        <p className="mt-2 text-ink-200">{content.body}</p>
        <button className="btn btn-primary mt-6 w-full" onClick={onClose} autoFocus>
          Wonderful!
        </button>
      </motion.div>
    </motion.div>
  );
}

function Summary({ tally, stats, daily, mode, lessonId, bossReady, onAgain }: { tally: Tally; stats: StatsSummary | null; daily: DailyStatus | null; mode: SessionMode; lessonId?: string; bossReady: boolean; onAgain: () => void }) {
  const accuracy = tally.answered ? Math.round((tally.correct / tally.answered) * 100) : 0;
  const nextMode: SessionMode | null = mode === "review" ? "explore" : null;
  return (
    <section className="mt-8 text-center">
      <Art src="/art/mascot/celebrate.webp" alt="" className="mx-auto h-40 w-40 object-contain" fallback={<StarGlyph className="mx-auto h-14 w-14 text-amber-400" />} />
      <h1 className="mt-4 font-display text-3xl font-semibold">Round complete</h1>
      {tally.streak && <p className="mt-1 text-amber-300">Daily goal met · {tally.streak}-day streak</p>}
      <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
        <Stat label="XP" value={`+${tally.xp}`} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Fixed" value={String(tally.fixed)} />
      </dl>
      {tally.chest && (
        <div className="mt-6">
          <ChestReveal contents={tally.chest} />
        </div>
      )}
      {tally.badges.length > 0 && (
        <div className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-3">
          {tally.badges.map((b) => (
            <span key={b} className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300">
              {BADGE_BY_ID.get(b)?.title ?? b}
            </span>
          ))}
        </div>
      )}
      {stats && (
        <p className="mt-5 text-sm text-ink-300">
          Level {stats.level} · {stats.title} · {Math.max(0, stats.nextLevelXp - stats.xp)} XP to the next level
        </p>
      )}
      {daily && <p className="mt-1 text-sm text-ink-300">{Math.round(daily.secondsToday / 60)} of 20 minutes today</p>}
      <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
        {mode === "lesson" && bossReady && lessonId && (
          <Link href={`/practice?mode=boss&lesson=${encodeURIComponent(lessonId)}`} className="pixel-btn text-lg">
            ⚔ Face the boss
          </Link>
        )}
        {nextMode && !daily?.done ? (
          <Link href={`/practice?mode=${nextMode}`} className="btn btn-primary text-lg">
            Start Round 2
          </Link>
        ) : daily?.done ? null : (
          <button className="btn btn-primary text-lg" onClick={onAgain}>
            Another round
          </button>
        )}
        <Link href="/home" className="btn btn-ghost">
          Back to your sky
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-800 p-3">
      <dt className="text-xs uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold">{value}</dd>
    </div>
  );
}

/** Works out the next moment of a boss battle after an answer. */
function nextBeat(b: Battle, correct: boolean, bossName: string, fox = false): Battle {
  const id = (b.beat?.id ?? 0) + 1;
  if (correct) {
    const hits = b.hits + 1;
    const run = b.run + 1;
    const crit = run >= 3;
    const left = b.hp - hits;
    const message = left <= 0 ? (fox ? `${bossName} is beaten! His hat falls off…` : `${bossName} is beaten! The star is free!`) : crit ? `Critical hit! ${run} in a row! ${left} to go.` : left === 1 ? "Nova strikes! One more hit to win!" : `Nova strikes! ${left} hits to go.`;
    return { ...b, hits, run, beat: { id, kind: crit ? "crit" : "hit" }, message, outcome: left <= 0 ? "won" : null };
  }
  const heartsLeft = b.heartsLeft - 1;
  const message = heartsLeft <= 0 ? `${bossName} got away this time…` : fox ? `${bossName} throws his bubble at Nova! ${heartsLeft === 1 ? "Last heart" : `${heartsLeft} hearts left`}. That question will come back.` : `Ouch! ${bossName} hits back. ${heartsLeft === 1 ? "Last heart" : `${heartsLeft} hearts left`}. That question will come back.`;
  return { ...b, heartsLeft, run: 0, beat: { id, kind: "hurt" }, message, outcome: heartsLeft <= 0 ? "lost" : null };
}

/** After the Grey Fox: his E hat falls to the ground and is Nova's (first win), or he got away. */
function FoxResult({ battle, claim, onAgain }: { battle: Battle; claim: BossClaim | null; onAgain: () => void }) {
  const won = battle.outcome === "won";
  const gotHat = won && claim?.status === "done" && claim.first;
  return (
    <section className="mt-8 text-center font-pixel">
      <div className="pixel-panel mx-auto max-w-sm p-5">
        {won ? (
          <motion.div className="mx-auto grid place-items-center" initial={{ y: -60, rotate: -25, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 9 }}>
            <PixelSprite sprite={hatSprite("e")} scale={7} title="The Grey Fox's E hat" />
          </motion.div>
        ) : (
          <div className="mx-auto grid place-items-center">
            <PixelSprite sprite={GREY_FOX.sprite} scale={3} fps={2} />
          </div>
        )}
        <h1 className="mt-3 text-3xl text-[#ead39b]">{won ? "Victory!" : "He got away!"}</h1>
        <p className="mt-1 text-[#ece4d6]">{won ? `You beat ${GREY_FOX.name}! His E hat fell right off.` : `${GREY_FOX.name} slipped away with a smirk. Practise the test topics a little and try again!`}</p>
        <div className="mt-3 flex justify-center gap-1" aria-label={`${battle.heartsLeft} hearts left`}>
          {Array.from({ length: TEST_BOSS_RULES.hearts }, (_, i) => (
            <PixelSprite key={i} sprite={i < battle.heartsLeft ? heartFull : heartEmpty} scale={3} />
          ))}
        </div>
        {won && (!claim || claim.status === "pending") && <p className="mt-3 text-[#a99cc4]">Picking up the hat…</p>}
        {won && claim?.status === "error" && <p className="mt-3 text-[#cf9f9b]">{claim.error}</p>}
        {gotHat && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <PixelSprite sprite={novaSprites("e").idle} scale={3} fps={3} title="Nova wearing the E hat" />
            <p className="max-w-[12rem] text-left text-lg leading-snug text-[#ead39b]">The E hat is yours! Nova is wearing it now.</p>
          </div>
        )}
        {won && claim?.status === "done" && (
          <p className="mt-3 text-[#ece4d6]">
            {claim.rewarded ? `+${claim.xp} XP${claim.stars ? ` · +${claim.stars} stars` : ""}` : <span className="text-sm text-[#a99cc4]">You already beat him today. Come back tomorrow for more loot!</span>}
          </p>
        )}
      </div>
      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
        {!won && (
          <button className="pixel-btn text-lg" onClick={onAgain}>
            Try again
          </button>
        )}
        {gotHat && (
          <Link href="/shop" className="pixel-btn pixel-btn-ghost">
            See your hats
          </Link>
        )}
        <Link href="/home" className="btn btn-ghost font-sans">
          Back to your sky
        </Link>
      </div>
    </section>
  );
}

function BossResult({ unitId, lessonId, battle, claim, tally, onAgain }: { unitId: string; lessonId: string; battle: Battle; claim: BossClaim | null; tally: Tally; onAgain: () => void }) {
  const boss = bossFor(unitId);
  const won = battle.outcome === "won";
  return (
    <section className="mt-8 text-center font-pixel">
      <div className="pixel-panel mx-auto max-w-sm p-5">
        <div className="mx-auto grid place-items-center" style={{ filter: won ? undefined : "grayscale(0.4) brightness(0.8)" }}>
          <PixelSprite sprite={boss.sprite} scale={5} fps={won ? 0 : 2} />
        </div>
        <h1 className="mt-3 text-3xl text-[#ead39b]">{won ? "Victory!" : "It got away!"}</h1>
        <p className="mt-1 text-[#ece4d6]">{won ? `You beat ${boss.name} and won the star back.` : `${boss.name} escaped with the star. Practise a little and try again!`}</p>
        <div className="mt-3 flex justify-center gap-1" aria-label={`${battle.heartsLeft} hearts left`}>
          {Array.from({ length: BOSS_RULES.hearts }, (_, i) => (
            <PixelSprite key={i} sprite={i < battle.heartsLeft ? heartFull : heartEmpty} scale={3} />
          ))}
        </div>
        {won && (!claim || claim.status === "pending") && <p className="mt-3 text-[#a99cc4]">Counting your loot…</p>}
        {won && claim?.status === "error" && <p className="mt-3 text-[#cf9f9b]">{claim.error}</p>}
        {won && claim?.status === "done" && (
          <p className="mt-3 text-lg text-[#ece4d6]">
            {claim.rewarded ? (
              <>
                +{claim.xp} XP{claim.stars ? ` · +${claim.stars} stars` : ""}
                {claim.first && battle.heartsLeft === BOSS_RULES.hearts && <span className="block text-sm text-[#ead39b]">Flawless! No hearts lost.</span>}
              </>
            ) : (
              <span className="text-sm text-[#a99cc4]">You already beat this boss today. Come back tomorrow for more loot!</span>
            )}
          </p>
        )}
      </div>
      {won && tally.chest && (
        <div className="mt-6">
          <ChestReveal contents={tally.chest} />
        </div>
      )}
      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
        {!won && (
          <button className="pixel-btn text-lg" onClick={onAgain}>
            Try again
          </button>
        )}
        <Link href={`/practice?mode=lesson&lesson=${encodeURIComponent(lessonId)}`} className="pixel-btn pixel-btn-ghost">
          Practise this lesson
        </Link>
        <Link href={`/unit/${unitId}`} className="btn btn-ghost font-sans">
          Back to the unit
        </Link>
      </div>
    </section>
  );
}
