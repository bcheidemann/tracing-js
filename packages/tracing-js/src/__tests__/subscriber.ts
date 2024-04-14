import { vi, Mock } from "vitest";
import { ISubscriber } from "../subscriber";

export function createTestSubscriber({
  enabledForLevel = undefined,
  enabled = undefined,
  newSpan = vi.fn().mockReturnValue(Symbol("span")),
  event = vi.fn(),
  enter = vi.fn(),
  exit = vi.fn(),
  clone = undefined,
}: {
  enabledForLevel?: Mock<any, any>,
  enabled?: Mock<any, any>,
  newSpan?: Mock<any, any>,
  event?: Mock<any, any>,
  enter?: Mock<any, any>,
  exit?: Mock<any, any>,
  clone?: Mock<any, any>,
} = {}) {
  const subscriber = {
    enabledForLevel,
    enabled,
    newSpan,
    event,
    enter,
    exit,
    clone: clone ?? vi.fn<any, any>(),
  } satisfies ISubscriber<unknown>;

  if (!clone) {
    subscriber.clone.mockReturnValue(subscriber);
  }

  return subscriber;
}
