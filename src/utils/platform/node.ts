import type process from "node:process";
import { assert } from "@std/assert";

/** @internal */
export function isNode() {
  return "process" in globalThis;
}

type NodeGlobalThis = typeof globalThis & {
  process: typeof process;
};

/** @internal */
export function getNodeGlobalThis(): NodeGlobalThis {
  assert("process" in globalThis, "process not in globalThis");

  return globalThis as NodeGlobalThis;
}
