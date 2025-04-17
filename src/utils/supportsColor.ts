import { isDeno } from "./platform/deno.ts";
import { isNodeCompatible } from "./platform/node.ts";
import { Deno } from "./stubbable/deno.ts";

/** @internal */
export function supportsColor(): boolean {
  if (isDeno()) {
    return supportsColorDeno();
  }
  if (isNodeCompatible()) {
    return supportsColorNode();
  }
  return supportsColorUnknownRuntime();
}

/** @internal */
function supportsColorDeno(): boolean {
  return Deno.stdin.isTerminal() && !Deno.noColor();
}

/** @internal */
function supportsColorNode(): boolean {
  return typeof globalThis.process.stdin !== "undefined" &&
    globalThis.process.stdin.isTTY && !globalThis.process.env.NO_COLOR;
}

/** @internal */
function supportsColorUnknownRuntime(): boolean {
  return false;
}
