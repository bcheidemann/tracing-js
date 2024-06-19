import type process from "node:process";
import type tty from "node:tty";
import { assert } from "@std/assert";

export function isNode() {
  return "process" in globalThis && "tty" in globalThis;
}

type NodeGlobalThis = typeof globalThis & {
  process: typeof process;
  tty: typeof tty;
};

export function getNodeGlobalThis(): NodeGlobalThis {
  assert("tty" in globalThis, "tty not in globalThis");
  assert("process" in globalThis, "process not in globalThis");

  return globalThis as NodeGlobalThis;
}
