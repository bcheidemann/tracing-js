import { FakeTime } from "jsr:@std/testing@^0.225.2/time";

if (Deno.env.get("IS_SNAPSHOT_RUN") === "true") {
  // Use fake timers in snapshot runs
  new FakeTime(new Date(0));
}
