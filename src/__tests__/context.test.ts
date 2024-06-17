import { describe, it } from "@std/testing/bdd";
import { expect } from "expect";
import { context, createContext, getContextOrThrow } from "../context.ts";
import { createTestSubscriber } from "./subscriber.ts";

describe("context", () => {
  describe("getContext", () => {
    it("should throw an error if no context is found", () => {
      // Act
      const fn = () => getContextOrThrow();

      // Assert
      expect(fn).toThrowError("No context found");
    });

    it("should return the current context", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);

      // Act
      const result = getContextOrThrow();

      // Assert
      expect(result).toBe(ctx);
    });
  });

  describe("Context.clone", () => {
    it("should clone the subscriber when context.clone is called", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);

      // Act
      ctx.clone();

      // Assert
      expect(subscriber.clone).toHaveBeenCalled();
    });

    it("should use the cloned subscriber when context.clone is called", () => {
      // Arrange
      const subscriber = createTestSubscriber();
      const ctx = createContext(subscriber);
      context.enterWith(ctx);
      const clonedSubscriber = createTestSubscriber();
      subscriber.clone.mockReturnValue(clonedSubscriber);

      // Act
      const result = ctx.clone();

      // Assert
      expect(result.subscriber).toBe(clonedSubscriber);
    });
  });
});
