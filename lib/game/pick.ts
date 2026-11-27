/**
 * Which mini-game the student chose to play (saved per device). Pure, shared by the practice
 * screen and tests.
 *
 * - mix: multiple-choice questions alternate between Star Catch and the runner (the default);
 * - runner / stars: every multiple-choice question in that one game;
 * - cards: no mini-games, questions are answered on cards.
 */
export type GamePick = "mix" | "runner" | "stars" | "cards";

export const GAME_PICKS: { id: GamePick; icon: string; label: string; hint: string }[] = [
  { id: "mix", icon: "🎲", label: "Both", hint: "Star Catch and the runner, taking turns" },
  { id: "runner", icon: "🏃", label: "Runner", hint: "Run through the gate of the right answer" },
  { id: "stars", icon: "⭐", label: "Star Catch", hint: "Catch the star with the right answer" },
  { id: "cards", icon: "📝", label: "Cards", hint: "No games: answer on cards" },
];

/**
 * A saved choice read back. Older versions saved "on" (games) or "off" (cards); anything
 * unknown or missing means the default, both games.
 */
export function parseGamePick(saved: string | null | undefined): GamePick {
  if (saved === "off") return "cards";
  return GAME_PICKS.some((p) => p.id === saved) ? (saved as GamePick) : "mix";
}
