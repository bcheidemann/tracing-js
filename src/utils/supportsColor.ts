import { isDeno } from "./platform/deno.ts";
import { isNode } from "./platform/node.ts";

export function supportsColor(): boolean {
  if (isDeno()) {
    return supportsColorDeno();
  }
  if (isNode()) {
    return supportsColorNode();
  }
  return supportsColorUnknownRuntime();
}

export function supportsColorDeno(): boolean {
  return Deno.stdin.isTerminal() && !Deno.noColor;
}

export function supportsColorNode(): boolean {
  return typeof global.process.stdin !== "undefined" &&
    global.process.stdin.isTTY && !global.process.env.NO_COLOR;
}

export function supportsColorUnknownRuntime(): boolean {
  return false;
}
