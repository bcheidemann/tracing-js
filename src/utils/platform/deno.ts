export function isDeno(): boolean {
  return "Deno" in globalThis;
}
