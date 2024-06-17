/**
 * @module
 * This module provides functions and type definitions to work with the AsyncLocalStorage tracing context.
 * It's primarily intended for internal use, but the API is public, and may be useful when creating custom
 * subscribers.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { ISubscriber } from "./subscriber.ts";

/**
 * The subscriber context. This holds a reference to the current subscriber registered in the async context.
 */
export type Context = {
  /**
   * The subscriber registered in the async context.
   */
  subscriber: ISubscriber<unknown>;
  /**
   * Clones the current context.
   */
  clone(): Context;
};

/**
 * The AsyncLocalStorage instance used to store the subscriber context.
 */
export const context: AsyncLocalStorage<Context> = new AsyncLocalStorage<
  Context
>();

/**
 * Creates a new context with the provided subscriber.
 *
 * @param subscriber The subscriber to use in the new context.
 * @returns The new context.
 */
export function createContext(subscriber: ISubscriber<unknown>): Context {
  return {
    subscriber,
    clone() {
      return createContext(this.subscriber.clone());
    },
  };
}

/**
 * Retrieves the current subscriber context or throws an error if no context is found.
 *
 * @returns The current subscriber context or throws an error if no context is found.
 */
export function getContextOrThrow(): Context {
  const ctx = context.getStore();

  if (!ctx) {
    throw new Error("No context found");
  }

  return ctx;
}

/**
 * Retrieves the current subscriber context or `undefined` if no context is found.
 *
 * @returns The current subscriber context or `undefined` if no context is found.
 */
export function getContext(): Context | undefined {
  return context.getStore();
}
