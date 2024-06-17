import { AsyncLocalStorage } from "node:async_hooks";
import type { ISubscriber } from "./subscriber.ts";

export type Context = {
  subscriber: ISubscriber<unknown>;
  clone(): Context;
};

export const context: AsyncLocalStorage<Context> = new AsyncLocalStorage<
  Context
>();

export function createContext(subscriber: ISubscriber<unknown>): Context {
  return {
    subscriber,
    clone() {
      return createContext(this.subscriber.clone());
    },
  };
}

export function getContextOrThrow(): Context {
  const ctx = context.getStore();

  if (!ctx) {
    throw new Error("No context found");
  }

  return ctx;
}

export function getContext(): Context | undefined {
  return context.getStore();
}
