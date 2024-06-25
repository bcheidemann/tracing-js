import { describe, it } from "@std/testing/bdd";
import { createTestSubscriber } from "./subscriber.ts";
import { context, createSubscriberContext } from "../context.ts";
import {
  criticalSpan,
  debugSpan,
  errorSpan,
  infoSpan,
  traceSpan,
  warnSpan,
} from "../span.ts";
import { Level } from "../level.ts";
import { expect } from "expect";

describe("span", () => {
  const testCases: [spanFunction: typeof infoSpan, expectedLevel: Level][] = [
    [traceSpan, Level.TRACE],
    [debugSpan, Level.DEBUG],
    [infoSpan, Level.INFO],
    [warnSpan, Level.WARN],
    [errorSpan, Level.ERROR],
    [criticalSpan, Level.CRITICAL],
  ];

  for (const [spanFunction, expectedLevel] of testCases) {
    it(`should create a span of level ${expectedLevel} when the ${spanFunction.name} function is called`, () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);

      // Act
      spanFunction("test");

      // Assert
      expect(subscriber.newSpan).toHaveBeenCalled();
      expect(subscriber.newSpan).toHaveBeenCalledWith({
        isSpan: true,
        level: expectedLevel,
        message: "test",
        fields: undefined,
      });
    });
  }
});
