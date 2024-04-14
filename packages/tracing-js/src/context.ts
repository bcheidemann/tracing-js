import { AsyncLocalStorage } from "async_hooks";
import { ISubscriber } from "./subscriber";

export type Context = {
  subscriber: ISubscriber<unknown>;
  clone(): Context;
};

export const context = new AsyncLocalStorage<Context>();

export function createContext(subscriber: ISubscriber<unknown>): Context {
  return {
    subscriber,
    clone() {
      return createContext(this.subscriber.clone());
    },
  };
}

export function getContext(): Context {
  const ctx = context.getStore();

  if (!ctx) {
    throw new Error("No context found");
  }

  return ctx;
}
