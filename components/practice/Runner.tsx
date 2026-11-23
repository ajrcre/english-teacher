"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Art, StarGlyph } from "@/components/Art";
import type { ClientItem, ItemResponse } from "@/lib/content/client";
import { BADGE_BY_ID } from "@/lib/gamification/badges";
import type { RewardEvent, Rewards } from "@/lib/gamification/engine";
import type { SessionMode } from "@/lib/scheduling/sessionBuilder";
import type { AnswerFeedback, DailyStatus, StatsSummary, SubmitResult } from "@/lib/services/practice";
import { badgeArt, cx } from "@/lib/ui";
import { playSfx, setSoundEnabled, speakWord, type Sfx } from "../sound";
import { QuestionInput, RichSentence, SpeakerIcon, questionTitle } from "./inputs";

type QueueItem = ClientItem & { lessonId: string; isNew: boolean; retry?: number; key: string };

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
}

const MODE_LABEL: Record<SessionMode, string> = {
  review: "Round 1 · Review",
  explore: "Round 2 · Explore",
  lesson: "Lesson practice",
  mistakes: "Mistake gym",
};

const MAX_RETRIES = 3;

export function Runner({ mode, lessonId, lessonTitle, soundOn }: { mode: SessionMode; lessonId?: string; lessonTitle?: string; soundOn: boolean }) {
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
  const [tally, setTally] = useState<Tally>({ answered: 0, correct: 0, xp: 0, stars: 0, fixed: 0, badges: [], levelUp: null, streak: null });
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
        body: JSON.stringify({ mode, lessonId: lessonId ?? null }),
      });
      if (res.status === 401) {
        router.replace("/join");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start");
      const items = (data.items as (ClientItem & { lessonId: string; isNew: boolean })[]).map((it, i) => ({ ...it, key: `${it.id}#${i}` }));
      setQueue(items);
      setIndex(0);
      setDaily(data.daily);
      setDoneBanner(false);
      setTally({ answered: 0, correct: 0, xp: 0, stars: 0, fixed: 0, badges: [], levelUp: null, streak: null });
      setPhase(items.length ? { kind: "answering" } : { kind: "empty" });
      startedAt.current = Date.now();
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "Could not start" });
    }
  }, [mode, lessonId, router]);

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

  async function submit(selfVerdict?: "correct" | "incorrect") {
    const resp = selfVerdict ? lastResponse : response;
    if (!current || !resp) return;
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
        return;
      }
      const verdict = data.feedback.verdict;
      playSfx(verdict === "correct" ? "correct" : "wrong", verdict === "correct" ? 0.5 : 0.35);
      setStats(data.stats);
      if (data.daily.done && !daily?.done) setDoneBanner(true);
      setDaily(data.daily);
      setTally((t) => ({ ...t, answered: t.answered + 1, correct: t.correct + (verdict === "correct" ? 1 : 0) }));
      applyRewards(data.rewards);
      // Re-practise mistakes later in this same session, until they are right.
      if (verdict !== "correct" && (current.retry ?? 0) < MAX_RETRIES) {
        setQueue((q) => {
          const gap = 3 + Math.floor(Math.random() * 3);
          const at = Math.min(index + 1 + gap, q.length);
          const copy: QueueItem = { ...current, retry: (current.retry ?? 0) + 1, key: `${current.id}#retry${(current.retry ?? 0) + 1}` };
          return [...q.slice(0, at), copy, ...q.slice(at)];
        });
      }
      setPhase({ kind: "feedback", feedback: data.feedback, xp: data.rewards.xp });
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not check your answer");
      setPhase({ kind: "answering" });
    }
  }

  const advance = useCallback(() => {
    setResponse(null);
    setToast(null);
    if (index + 1 >= queue.length) {
      setPhase({ kind: "summary" });
      return;
    }
    setIndex(index + 1);
    setPhase({ kind: "answering" });
    startedAt.current = Date.now();
  }, [index, queue.length]);

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
    void (async () => {
      const res = await fetch("/api/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, answered: tally.answered }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { rewards: Rewards; stats: StatsSummary; daily: DailyStatus; counted: boolean };
      setStats(data.stats);
      setDaily(data.daily);
      applyRewards(data.rewards);
      if (data.rewards.events.some((e) => e.kind === "goal_met")) playSfx("streak");
      if (celebrationQueue.current.length) showNextCelebration();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  // Enter = continue after feedback.
  useEffect(() => {
    if (phase.kind !== "feedback") return;
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
  }, [phase.kind, next]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const progress = queue.length ? Math.min(1, (index + (phase.kind === "feedback" || phase.kind === "summary" ? 1 : 0)) / queue.length) : 0;
  const locked = phase.kind !== "answering";
  const review = phase.kind === "feedback" ? { modelAnswer: phase.feedback.modelAnswer, details: phase.feedback.details, verdict: phase.feedback.verdict } : undefined;

  return (
    <main className="night-sky min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-40 pt-4 sm:px-6">
        <header className="flex items-center gap-3">
          <Link href="/home" className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-xl text-ink-200 hover:bg-white/10" aria-label="Close and go back">
            ×
          </Link>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div className="h-full rounded-full bg-amber-400" animate={{ width: `${progress * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-sm font-bold" aria-label="XP this round">
            <StarGlyph className="h-4 w-4 text-amber-300" />
            {tally.xp}
          </div>
        </header>
        <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">{lessonTitle ?? MODE_LABEL[mode]}</p>

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

        {current && phase.kind !== "summary" && phase.kind !== "loading" && phase.kind !== "error" && phase.kind !== "empty" && (
          <AnimatePresence mode="wait">
            <motion.section key={current.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }} className="paper-card relative mt-5 p-5 sm:p-7">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {current.retry ? <Chip tone="rose">Second chance</Chip> : current.isNew ? <Chip tone="amber">New</Chip> : <Chip tone="ink">Review</Chip>}
              </div>
              <QuestionTitle item={current} />
              <div className="mt-5">
                <QuestionInput key={current.key} item={current} onChange={setResponse} onSubmit={() => !locked && response && void submit()} locked={locked} review={review} />
              </div>
            </motion.section>
          </AnimatePresence>
        )}

        {phase.kind === "summary" && <Summary tally={tally} stats={stats} daily={daily} mode={mode} onAgain={() => void start()} />}
      </div>

      {/* Bottom action area: submit, or feedback panel. */}
      {current && (phase.kind === "answering" || phase.kind === "submitting") && (
        <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-ink-900/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button className="btn btn-primary w-full text-lg" disabled={!response || phase.kind === "submitting"} onClick={() => void submit()}>
              {phase.kind === "submitting" ? "Checking…" : "Check answer"}
            </button>
          </div>
        </div>
      )}
      <AnimatePresence>{phase.kind === "feedback" && <FeedbackPanel feedback={phase.feedback} xp={phase.xp} onNext={next} />}</AnimatePresence>
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
  const showModel = feedback.verdict !== "correct" || feedback.byLlm || feedback.notes.length > 0;
  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className={cx("fixed inset-x-0 bottom-0 z-30 max-h-[75dvh] overflow-y-auto border-t-4 text-text", palette.bg, palette.border)} role="status" aria-live="polite">
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
      return { eyebrow: "New badge", title: b?.title ?? "Badge", body: b?.description ?? "", art: badgeArt(b?.icon ?? event.id) };
    }
    if (event.kind === "star_lit") return { eyebrow: "Star lit", title: "A new star shines", body: "You mastered every question in a lesson!", art: "/art/scenes/star-lit.webp" };
    return null;
  }, [event]);
  if (!content) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-6 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={content.title}>
      <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 18 }} className="w-full max-w-xs text-center" onClick={(e) => e.stopPropagation()}>
        <Art src={content.art} alt="" className="mx-auto h-48 w-48 rounded-full object-cover shadow-[0_0_80px_rgb(242_169_59/0.45)]" fallback={<StarGlyph className="h-16 w-16 text-amber-400" />} />
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

function Summary({ tally, stats, daily, mode, onAgain }: { tally: Tally; stats: StatsSummary | null; daily: DailyStatus | null; mode: SessionMode; onAgain: () => void }) {
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
