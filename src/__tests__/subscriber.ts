import { fn } from "jest-mock";
import type { ISubscriber } from "../subscriber.ts";

type Mock = ReturnType<typeof fn>;

export function createTestSubscriber({
  enabledForLevel = undefined,
  enabled = undefined,
  newSpan = fn().mockReturnValue(Symbol("span")),
  event = fn(),
  enter = fn(),
  exit = fn(),
  record = fn(),
  currentSpan = fn(),
  clone = undefined,
}: {
  enabledForLevel?: Mock;
  enabled?: Mock;
  newSpan?: Mock;
  event?: Mock;
  enter?: Mock;
  exit?: Mock;
  record?: Mock;
  currentSpan?: Mock;
  clone?: Mock;
} = {}) {
  const subscriber = {
    enabledForLevel,
    enabled,
    newSpan,
    event,
    enter,
    exit,
    record,
    currentSpan,
    clone: clone ?? fn(),
  } satisfies ISubscriber<unknown>;

  if (!clone) {
    subscriber.clone.mockReturnValue(subscriber);
  }

  return subscriber;
}
