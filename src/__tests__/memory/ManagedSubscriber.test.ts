import { isolatedTestCase } from "@bcheidemann/deno-isolated-test-case";
import { ManagedSubscriber } from "../../subscriber.ts";
import { span } from "../../span.ts";
import { Level } from "../../level.ts";
import {
  createSubscriberContext,
  setDefaultGlobalSubscriber,
} from "../../context.ts";
import { assertLess } from "@std/assert";

// Some of the aspects of this test are informed by the "Memory leak regression
// testing with V8/Node.js" article series by Joyee Cheung.
// SEE: https://joyeecheung.github.io/blog/2024/03/17/memory-leak-testing-v8-node-js-1
isolatedTestCase(
  "ManagedSubscriber should not leak memory due to unused spans",
  async () => {
    // Config
    const ITERATIONS_PER_SAMPLE = 100;
    const TOTAL_SAMPLES = 100;
    const TOTAL_ITERATIONS = TOTAL_SAMPLES * ITERATIONS_PER_SAMPLE;

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

    class LargeObject {
      constructor(private data: Record<string, string>) {}
    }

    function makeLargeObject() {
      const data: Record<string, string> = {};
      for (let i = 0; i < 1_000; i++) {
        const key = Math.random().toString();
        const value = Math.random().toString();
        data[key] = value;
      }
      return new LargeObject(data);
    }

    function leak() {
      span(Level.INFO, "memory leak", { obj: makeLargeObject() });
    }

    await forceGc();
    await wait(100);

    // Act
    const samples = [Deno.memoryUsage().heapUsed];
    for (let i = 0; i < TOTAL_ITERATIONS; i++) {
      leak();
      if (i % ITERATIONS_PER_SAMPLE === 0) {
        console.log(
          `Recording heap usage sample (${
            i / ITERATIONS_PER_SAMPLE
          }/${TOTAL_SAMPLES})...`,
        );
        await forceGc();
        await wait(100);
        samples.push(Deno.memoryUsage().heapUsed);
      }
    }

    // Assert
    await forceGc();
    await wait(100);
    samples.push(Deno.memoryUsage().heapUsed);
    leak();

    console.log("--- SAMPLES START ---");
    console.log(samples.join("\n"));
    console.log("--- SAMPLES END ---");

    // discard the first 50 samples to account for initial "spiky" heap fluctuations.
    const includedSamples = samples.slice(50, samples.length);
    const deltaPerLeakInvocation =
      (includedSamples.at(-1)! - includedSamples.at(0)!) /
      (includedSamples.length * ITERATIONS_PER_SAMPLE);
    console.log(`deltaPerLeakInvocation = ${deltaPerLeakInvocation}`);

    // The v8 GC is not deterministic, however with enough allocations the heap
    // usage should stabalise. We allow a 5 byte tollerance. At 18 characters
    // per key, 18 characters per value, and 1,000 entries per object, a single
    // leak would result in an approximately 36kb increase in heap usage, so
    // this threshold should be more than sufficient to ensure there are no
    // memory leaks.
    assertLess(deltaPerLeakInvocation, 5);
  },
  {
    denoFlags: [
      "--v8-flags=-expose-gc,-predictable,-predictable-gc-schedule,-gc-global,-no-concurrent-marking,-no-incremental-marking,-single-threaded,-single-threaded-gc",
    ],
  },
);

async function forceGc() {
  for (let i = 0; i < 10; i++) {
    // @ts-ignore -- V8 expose GC flag is enabled
    gc();
    await wait(10);
  }
}

async function wait(ms: number) {
  await new Promise((res) => setTimeout(res, ms));
}
