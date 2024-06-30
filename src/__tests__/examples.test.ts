import { Buffer, mergeReadableStreams } from "@std/streams";
import { assertSnapshot } from "@std/testing/snapshot";
import { assert } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

example("all-features");
example("basic");
example("basic-json");
example("api-class-instrumentation");

function example(name: string) {
  describe(`${name} example`, () => {
    it("should match the snapshot", async (context) => {
      const command = new Deno.Command("deno", {
        args: [
          "run",
          "--allow-env=IS_SNAPSHOT_RUN",
          `src/examples/${name}/main.ts`,
        ],
        env: {
          IS_SNAPSHOT_RUN: "true",
          NO_COLOR: "true",
        },
        stdout: "piped",
        stderr: "piped",
      }).spawn();
      const buf = new Buffer();
      mergeReadableStreams(command.stdout, command.stderr).pipeTo(buf.writable);
      const status = await command.status;
      const output = new TextDecoder().decode(buf.bytes());
      assert(status.success, `The command failed:\n\n${output}`);
      // TODO: Look into why snapshots are not working on windows
      if (Deno.build.os !== "windows") {
        await assertSnapshot(context, output);
      }
    });
  });
}
