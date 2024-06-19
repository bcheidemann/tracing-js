import { describe, it } from "@std/testing/bdd";
import { fn } from "jest-mock";
import { expect } from "expect";
import { createTestSubscriber } from "./subscriber.ts";
import { context, createSubscriberContext } from "../context.ts";
import { critical, debug, error, event, info, trace, warn } from "../event.ts";
import { Level } from "../level.ts";

describe("event", () => {
  describe("event", () => {
    it("should call subscriber.event on subscriber when a new event is created", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);

      // Act
      event(Level.INFO, "test", { foo: "bar" });

      // Assert
      expect(subscriber.event).toHaveBeenCalled();
      expect(subscriber.event).toHaveBeenCalledWith({
        isEvent: true,
        level: Level.INFO,
        message: "test",
        fields: { foo: "bar" },
      });
    });

    it("should not call subscriber.event on subscriber when subscriber.enabledForLevel returns false", () => {
      // Arrange
      const subscriber = createTestSubscriber({
        enabledForLevel: fn().mockReturnValue(false),
      });
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);

      // Act
      event(Level.INFO, "test", { foo: "bar" });

      // Assert
      expect(subscriber.event).not.toHaveBeenCalled();
    });

    it("should not call subscriber.event on subscriber when subscriber.enabled returns false", () => {
      // Arrange
      const subscriber = createTestSubscriber({
        enabled: fn().mockReturnValue(false),
      });
      const ctx = createSubscriberContext(subscriber);
      context.enterWith(ctx);

      // Act
      event(Level.INFO, "test", { foo: "bar" });

      // Assert
      expect(subscriber.event).not.toHaveBeenCalled();
    });
  });

  for (
    const [levelFmt, level, fn] of [
      ["trace", Level.TRACE, trace],
      ["debug", Level.DEBUG, debug],
      ["info", Level.INFO, info],
      ["warn", Level.WARN, warn],
      ["error", Level.ERROR, error],
      ["critical", Level.CRITICAL, critical],
    ] satisfies [unknown, unknown, unknown][]
  ) {
    describe(levelFmt, () => {
      it("should call subscriber.event with the correct level", () => {
        // Arrange
        const subscriber = createTestSubscriber();
        const ctx = createSubscriberContext(subscriber);
        context.enterWith(ctx);

        // Act
        fn("test", { foo: "bar" });

        // Assert
        expect(subscriber.event).toHaveBeenCalled();
        expect(subscriber.event).toHaveBeenCalledWith({
          isEvent: true,
          level,
          message: "test",
          fields: { foo: "bar" },
        });
      });
    });
  }
});
