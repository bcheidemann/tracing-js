/**
 * @module
 * This module provides functions and type definitions to work with the AsyncLocalStorage tracing context.
 * It's primarily intended for internal use, but the API is public, and may be useful when creating custom
 * subscribers.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { ISubscriber } from "./subscriber.ts";

let defaultGlobalSubscriber: SubscriberContext | undefined = undefined;

/**
 * The subscriber context. This holds a reference to the current subscriber registered in the async context.
 */
export type SubscriberContext = {
  /**
   * The subscriber registered in the async context.
   */
  subscriber: ISubscriber<unknown>;
  /**
   * Clones the current context.
   */
  clone(): SubscriberContext;
};

/**
 * The AsyncLocalStorage instance used to store the subscriber context.
 */
export const context: AsyncLocalStorage<SubscriberContext> =
  new AsyncLocalStorage<
    SubscriberContext
  >();

/**
 * Creates a new subscriber context with the provided subscriber.
 *
 * @param subscriber The subscriber to use in the new context.
 * @returns The new context.
 */
export function createSubscriberContext(
  subscriber: ISubscriber<unknown>,
): SubscriberContext {
  return {
    subscriber,
    clone() {
      return createSubscriberContext(this.subscriber.clone());
    },
  };
}

/**
 * Retrieves the current subscriber context or throws an error if no context is found.
 *
 * @returns The current subscriber context or throws an error if no context is found.
 */
export function getSubscriberContextOrThrow(): SubscriberContext {
  const ctx = context.getStore() || defaultGlobalSubscriber;

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
export function getSubscriberContext(): SubscriberContext | undefined {
  return context.getStore() || defaultGlobalSubscriber;
}

export function setDefaultGlobalSubscriber(subscriber: SubscriberContext) {
  defaultGlobalSubscriber = subscriber;
}
