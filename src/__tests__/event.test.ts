import { vi, describe, it, expect } from "vitest";
import { createTestSubscriber } from "./subscriber";
import { context, createContext } from "../context";
import { critical, debug, error, event, info, trace, warn } from "../event";
import { Level } from "../level";

describe("event", () => {
  describe("event", () => {
    it("should call subscriber.event on subscriber when a new event is created", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
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
        enabledForLevel: vi.fn().mockReturnValue(false),
      });
      const ctx = createContext(subscriber);
      context.enterWith(ctx);

      // Act
      event(Level.INFO, "test", { foo: "bar" });

      // Assert
      expect(subscriber.event).not.toHaveBeenCalled();
    });

    it("should not call subscriber.event on subscriber when subscriber.enabled returns false", () => {
      // Arrange
      const subscriber = createTestSubscriber({
        enabled: vi.fn().mockReturnValue(false),
      });
      const ctx = createContext(subscriber);
      context.enterWith(ctx);

      // Act
      event(Level.INFO, "test", { foo: "bar" });

      // Assert
      expect(subscriber.event).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ["trace", Level.TRACE, trace],
    ["debug", Level.DEBUG, debug],
    ["info", Level.INFO, info],
    ["warn", Level.WARN, warn],
    ["error", Level.ERROR, error],
    ["critical", Level.CRITICAL, critical],
  ])(`%s`, (_, level, fn) => {
    it("should call subscriber.event with the correct level", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
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
});
