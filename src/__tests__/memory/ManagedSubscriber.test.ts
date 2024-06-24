import { isolatedTestCase } from "@bcheidemann/deno-isolated-test-case";
import { ManagedSubscriber } from "../../subscriber.ts";
import { span } from "../../span.ts";
import { Level } from "../../level.ts";
import { createSubscriberContext, setDefaultGlobalSubscriber } from "../../context.ts";
import { assertLess } from "@std/assert";

isolatedTestCase("ManagedSubscriber should not leak memory due to unused spans", () => {
  // Arrange
  class ManagedSubscriberImpl extends ManagedSubscriber {
    protected onEvent(): void {
      // No-op
    }

    public static setGlobalDefault(): ManagedSubscriberImpl {
      const subscriber = new ManagedSubscriberImpl(Level.DISABLED);
      setDefaultGlobalSubscriber(createSubscriberContext(subscriber));
      return subscriber;
    }
  }
  ManagedSubscriberImpl.setGlobalDefault();
  // Arrange
  const SOME_LARGE_OBJECT: Record<string, string> = {};
  for (let i = 0; i < 1000; i++) {
    const key = Math.random().toString();
    const value = Math.random().toString();
    SOME_LARGE_OBJECT[key] = value;
  }
  function leak() {
    span(Level.INFO, "memory leak", structuredClone(SOME_LARGE_OBJECT));
  }
  leak();
  for (let i = 0; i < 1_000; i++) {
    leak();
  }
  // @ts-ignore -- V8 expose GC flag is enabled
  gc();
  const initialHeapTotal = Deno.memoryUsage().heapTotal;

  // Act
  for (let i = 0; i < 5_000; i++) {
    leak();
  }

  // Assert
  // @ts-ignore -- V8 expose GC flag is enabled
  gc();
  const heapIncrease = Deno.memoryUsage().heapTotal - initialHeapTotal;
  assertLess(heapIncrease, 10_000_000);
}, {
  denoFlags: ["--v8-flags=--expose_gc"]
});
