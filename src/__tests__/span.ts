import type { AnonymousSpanId } from "../span.ts";

export function createAnonymousSpanId(): AnonymousSpanId {
  return Symbol() as AnonymousSpanId;
}
