// Color families used throughout the app's inline styles. Components mostly need the
// same hues at different alphas (border vs. fill vs. glow), so these are alpha-parameterized
// rather than single fixed constants.
export const blue = (a: number) => `rgba(80,160,255,${a})`;
export const green = (a: number) => `rgba(0,255,160,${a})`;
export const red = (a: number) => `rgba(255,80,80,${a})`;
export const amber = (a: number) => `rgba(255,200,50,${a})`;
export const orange = (a: number) => `rgba(255,160,60,${a})`;
export const white = (a: number) => `rgba(255,255,255,${a})`;
export const black = (a: number) => `rgba(0,0,0,${a})`;

export const COLORS = {
  border: white(0.18),
  borderSubtle: white(0.14),
  panelBg: white(0.06),
  panelBgSubtle: white(0.04),
  selectedBorder: blue(0.8),
  selectedBg: blue(0.12),
  correctBorder: green(0.8),
  correctBg: green(0.12),
  wrongBorder: red(0.8),
  wrongBg: red(0.12),
} as const;

export type AnswerState = "idle" | "selected" | "correct" | "wrong";

// Border/background pair for an answer tile/button, given its post-reveal state.
export function answerTileStyle(state: AnswerState): { border: string; background: string } {
  switch (state) {
    case "correct":
      return { border: COLORS.correctBorder, background: COLORS.correctBg };
    case "wrong":
      return { border: COLORS.wrongBorder, background: COLORS.wrongBg };
    case "selected":
      return { border: COLORS.selectedBorder, background: COLORS.selectedBg };
    default:
      return { border: COLORS.border, background: white(0.05) };
  }
}
