/** @internal */
export function isNodeCompatible() {
  return globalThis.process !== undefined;
}
