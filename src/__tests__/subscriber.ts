import { fn } from "jest-mock";
import type { ISubscriber } from "../subscriber.ts";

type Mock = ReturnType<typeof fn>;

function defaultRunInContext<TThis, TArgs extends unknown[], TReturn>(
  callback: (this: TThis, ...args: TArgs) => TReturn,
  thisArg: TThis,
  args: TArgs,
): TReturn {
  return callback.call(thisArg, ...args);
}

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
  instrumentCallback = fn<typeof defaultRunInContext>().mockImplementation(
    defaultRunInContext,
  ),
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
  instrumentCallback?: Mock;
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
    runInContext: instrumentCallback,
  } satisfies ISubscriber<unknown>;

  if (!clone) {
    subscriber.clone.mockReturnValue(subscriber);
  }

  return subscriber;
}
