"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ClientItem, ClientItemOf, ItemResponse } from "@/lib/content/client";
import type { GradeDetails } from "@/lib/grading/types";
import { cx } from "@/lib/ui";
import { playDictation, playSfx } from "../sound";

/** Renders "**bold**" and "___" blanks inside a sentence. */
export function RichSentence({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_{3,})/g).filter(Boolean);
  return (
    <p className={className}>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <strong key={i} className="rounded bg-amber-300/50 px-1 font-bold">
            {p.slice(2, -2)}
          </strong>
        ) : /^_{3,}$/.test(p) ? (
          <span key={i} className="mx-1 inline-block w-16 border-b-2 border-ink-800 align-baseline" aria-label="blank" />
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

export interface InputProps<T extends ClientItem["type"]> {
  item: ClientItemOf<T>;
  /** Called whenever the answer changes; null means "not ready to submit". */
  onChange: (response: ItemResponse | null) => void;
  onSubmit: () => void;
  locked: boolean;
  /** After grading: which option was right, details for multi-part items. */
  review?: { modelAnswer: string; details?: GradeDetails; verdict: string };
}

function McqInput({ item, onChange, onSubmit, locked, review }: InputProps<"mcq">) {
  const [choice, setChoice] = useState<string | null>(null);
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= item.options.length && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        const o = item.options[n - 1];
        setChoice(o);
        onChange({ type: "mcq", choice: o });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item.options, locked, onChange]);

  return (
    <div className="space-y-2.5">
      {item.sentence && <RichSentence text={item.sentence} className="mb-4 rounded-2xl bg-paper-50 p-4 text-lg leading-relaxed" />}
      {item.options.map((o, i) => {
        const state = review ? (o === review.modelAnswer ? "right" : o === choice ? "wrong" : undefined) : undefined;
        return (
          <button
            key={o}
            className="choice flex items-start gap-3"
            data-selected={choice === o}
            data-state={state}
            disabled={locked}
            onClick={() => {
              setChoice(o);
              onChange({ type: "mcq", choice: o });
              playSfx("tap", 0.25);
            }}
            onDoubleClick={() => !locked && onSubmit()}
          >
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-paper-300 text-xs font-bold text-text-soft">{i + 1}</span>
            <span>{o}</span>
          </button>
        );
      })}
    </div>
  );
}

function TextAnswer({
  onText,
  onSubmit,
  locked,
  placeholder,
  initial = "",
  multiline = false,
  autoFocus = true,
  big = false,
}: {
  onText: (t: string) => void;
  onSubmit: () => void;
  locked: boolean;
  placeholder: string;
  initial?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  big?: boolean;
}) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus && !locked) ref.current?.focus({ preventScroll: true });
  }, [autoFocus, locked]);
  useEffect(() => {
    onText(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const common = {
    ref,
    value: text,
    disabled: locked,
    placeholder,
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: false,
    autoComplete: "off",
    "aria-label": "Your answer",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setText(e.target.value);
      onText(e.target.value);
    },
  };
  return multiline ? (
    <textarea
      {...common}
      rows={5}
      className="field min-h-[8rem] resize-y leading-relaxed"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit();
      }}
    />
  ) : (
    <input
      {...common}
      className={cx("field", big && "text-center text-2xl tracking-wide")}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit();
      }}
    />
  );
}

function TypedInput({ item, onChange, onSubmit, locked }: InputProps<"typed">) {
  return (
    <div className="space-y-4">
      {item.sentence && <RichSentence text={item.sentence} className="rounded-2xl bg-paper-50 p-4 text-lg leading-relaxed" />}
      <TextAnswer locked={locked} onSubmit={onSubmit} placeholder="Type your answer" onText={(t) => onChange(t.trim() ? { type: "typed", text: t } : null)} />
    </div>
  );
}

function DictationInput({ item, onChange, onSubmit, locked }: InputProps<"dictation">) {
  const [playing, setPlaying] = useState<"word" | "sentence" | null>(null);
  const play = async (part: "word" | "sentence") => {
    setPlaying(part);
    await playDictation(item.id, item.audioId, part);
    setPlaying(null);
  };
  useEffect(() => {
    // Auto-play the word once when the question appears.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void play("word");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-ink" onClick={() => void play("word")} disabled={playing !== null}>
          <SpeakerIcon /> {playing === "word" ? "Playing…" : "Hear the word"}
        </button>
        <button type="button" className="btn btn-ghost !text-text" style={{ borderColor: "var(--color-paper-300)" }} onClick={() => void play("sentence")} disabled={playing !== null}>
          <SpeakerIcon /> {playing === "sentence" ? "Playing…" : "Hear it in a sentence"}
        </button>
      </div>
      <TextAnswer big locked={locked} onSubmit={onSubmit} placeholder="Spell the word" onText={(t) => onChange(t.trim() ? { type: "dictation", text: t } : null)} />
    </div>
  );
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Zm-2.5-8.8v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6Z" />
    </svg>
  );
}

const PAIR_COLORS = ["#f2a93b", "#3fb3a8", "#9c8bd8", "#e0707a", "#5fa8e0", "#8dbf4c", "#c9a77a"];

function MatchInput({ item, onChange, locked, review }: InputProps<"match">) {
  const [pairs, setPairs] = useState<Map<string, string>>(new Map());
  const [left, setLeft] = useState<string | null>(null);
  const colorOf = useMemo(() => {
    const m = new Map<string, string>();
    [...pairs.keys()].forEach((l, i) => m.set(l, PAIR_COLORS[i % PAIR_COLORS.length]));
    return m;
  }, [pairs]);
  const rightTaken = new Map([...pairs.entries()].map(([l, r]) => [r, l]));
  const wrongLeft = review?.details?.kind === "pairs" ? new Set(review.details.wrongLeft) : null;
  const correctRight = review?.details?.kind === "pairs" ? new Map(review.details.correctPairs) : null;

  const update = (next: Map<string, string>) => {
    setPairs(next);
    onChange(next.size === item.left.length ? { type: "match", pairs: [...next.entries()] } : null);
  };

  return (
    <div>
      <p className="mb-3 text-sm text-text-soft">Tap a word, then tap its match. Tap a pair again to undo it.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {item.left.map((l) => {
            const paired = pairs.has(l);
            const color = colorOf.get(l);
            return (
              <button
                key={l}
                disabled={locked}
                className="choice min-h-[3.25rem] text-[0.98rem] font-semibold"
                data-selected={left === l}
                data-state={wrongLeft ? (wrongLeft.has(l) ? "wrong" : "right") : undefined}
                style={paired && !review ? { borderColor: color, boxShadow: `0 0 0 2px ${color} inset` } : undefined}
                onClick={() => {
                  if (paired) {
                    const next = new Map(pairs);
                    next.delete(l);
                    update(next);
                    setLeft(null);
                  } else setLeft(left === l ? null : l);
                }}
              >
                {l}
                {review && wrongLeft?.has(l) && <span className="mt-1 block text-sm font-normal text-teal-600">→ {correctRight?.get(l)}</span>}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {item.right.map((r) => {
            const owner = rightTaken.get(r);
            const color = owner ? colorOf.get(owner) : undefined;
            return (
              <button
                key={r}
                disabled={locked || (!left && !owner)}
                className="choice min-h-[3.25rem] text-[0.95rem]"
                style={owner && !review ? { borderColor: color, boxShadow: `0 0 0 2px ${color} inset` } : undefined}
                onClick={() => {
                  const next = new Map(pairs);
                  if (owner) next.delete(owner);
                  if (left) {
                    next.set(left, r);
                    setLeft(null);
                    playSfx("tap", 0.25);
                  }
                  update(next);
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SortInput({ item, onChange, locked, review }: InputProps<"sort">) {
  const [placement, setPlacement] = useState<Record<string, string>>({});
  const wrong = review?.details?.kind === "buckets" ? new Set(review.details.wrong) : null;
  const correct = review?.details?.kind === "buckets" ? review.details.correct : null;
  return (
    <div className="space-y-3">
      {item.entries.map((e) => (
        <div key={e} className={cx("rounded-2xl border-2 bg-paper-50 p-3", wrong ? (wrong.has(e) ? "border-rose-400" : "border-teal-400") : "border-paper-300")}>
          <div className="font-semibold">{e}</div>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={`Group for ${e}`}>
            {item.buckets.map((b) => (
              <button
                key={b}
                role="radio"
                aria-checked={placement[e] === b}
                disabled={locked}
                onClick={() => {
                  const next = { ...placement, [e]: b };
                  setPlacement(next);
                  onChange(Object.keys(next).length === item.entries.length ? { type: "sort", placement: next } : null);
                }}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  placement[e] === b ? "border-ink-800 bg-ink-800 text-paper-100" : "border-paper-300 bg-white text-text hover:border-ink-400",
                  correct && correct[e] === b && "!border-teal-600 !bg-teal-600 !text-white",
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SequenceInput({ item, onChange, locked, review }: InputProps<"sequence">) {
  const [order, setOrder] = useState<string[]>(item.steps);
  useEffect(() => {
    onChange({ type: "sequence", order: item.steps });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    onChange({ type: "sequence", order: next });
  };
  const correct = review?.details?.kind === "order" ? review.details.correctOrder : null;
  return (
    <div>
      <p className="mb-3 text-sm text-text-soft">Use the arrows to put the events in order, first at the top.</p>
      <ol className="space-y-2">
        {order.map((s, i) => (
          <li key={s} className={cx("flex items-center gap-2 rounded-2xl border-2 bg-paper-50 p-2 pl-3", correct ? (correct[i] === s ? "border-teal-400" : "border-rose-400") : "border-paper-300")}>
            <span className="w-6 shrink-0 text-center font-display text-lg font-semibold text-text-soft">{i + 1}</span>
            <span className="flex-1 leading-snug">{s}</span>
            <div className="flex flex-col gap-1">
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-paper-200 disabled:opacity-30" aria-label="Move up" disabled={locked || i === 0} onClick={() => move(i, -1)}>
                ▲
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-paper-200 disabled:opacity-30" aria-label="Move down" disabled={locked || i === order.length - 1} onClick={() => move(i, 1)}>
                ▼
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function OpenInput({ item, onChange, onSubmit, locked }: InputProps<"open">) {
  return (
    <div className="space-y-4">
      {item.context && <blockquote className="rounded-2xl border-l-4 border-amber-400 bg-paper-50 p-4 italic leading-relaxed">{item.context}</blockquote>}
      <TextAnswer multiline locked={locked} onSubmit={onSubmit} placeholder="Write your answer in English — a sentence or two is enough." onText={(t) => onChange(t.trim().length >= 2 ? { type: "open", text: t } : null)} />
      <p className="text-xs text-text-soft">Spelling mistakes won't cost you points here — we check what you mean.</p>
    </div>
  );
}

function RewriteInput({ item, onChange, onSubmit, locked }: InputProps<"rewrite">) {
  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-paper-50 p-4 text-lg leading-relaxed">{item.original}</p>
      <TextAnswer locked={locked} onSubmit={onSubmit} initial={item.starter ? `${item.starter} ` : ""} placeholder="Write the new sentence" onText={(t) => onChange(t.trim().length > (item.starter?.length ?? 0) ? { type: "rewrite", text: t } : null)} />
    </div>
  );
}

function ProofreadInput({ item, onChange, onSubmit, locked }: InputProps<"proofread">) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-soft">Edit the text directly in the box.</p>
      <TextAnswer multiline locked={locked} onSubmit={onSubmit} initial={item.text} placeholder="" onText={(t) => onChange(t.trim() ? { type: "proofread", text: t } : null)} />
    </div>
  );
}

/** Factory: the right input component for each question type. */
const INPUTS: { [K in ClientItem["type"]]: (p: InputProps<K>) => ReactNode } = {
  mcq: McqInput,
  typed: TypedInput,
  dictation: DictationInput,
  match: MatchInput,
  sort: SortInput,
  sequence: SequenceInput,
  open: OpenInput,
  rewrite: RewriteInput,
  proofread: ProofreadInput,
};

export function QuestionInput(props: InputProps<ClientItem["type"]>) {
  const Component = INPUTS[props.item.type] as (p: InputProps<ClientItem["type"]>) => ReactNode;
  return <Component {...props} />;
}

export function questionTitle(item: ClientItem): string {
  switch (item.type) {
    case "open":
      return item.question;
    case "dictation":
      return "Listen and spell the word.";
    default:
      return item.prompt;
  }
}
