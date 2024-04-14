import { AnonymousSpanId } from "../span";

export function createAnonymousSpanId(): AnonymousSpanId {
  return Symbol() as AnonymousSpanId;
}
