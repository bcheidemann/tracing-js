/** @internal */
export const Deno = {
  stdin: {
    isTerminal() {
      return globalThis.Deno.stdin.isTerminal();
    },
  },
  noColor() {
    return globalThis.Deno.noColor;
  },
};
