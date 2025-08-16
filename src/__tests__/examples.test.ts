import { Buffer, mergeReadableStreams } from "@std/streams";
import { assertSnapshot } from "@std/testing/snapshot";
import { assert } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

example("all-features");
example("api-class-instrumentation");
example("basic");
example("basic-json");
// EXPLANATION: The legacy-decorators test results in an error when generating
//              a coverage report: Error generating coverage report: Missing
//              transpiled source code for: "file:///Users/benheidemann/repos/tracing/src/examples/__utils__/snapshotHelper.ts".
//              It's not clear why, so for now we'll omit this from the coverage
//              tests.
if (Deno.env.get("IS_COVERAGE_RUN") === undefined) {
  example("legacy-decorators");
}

function example(name: string) {
  describe(`${name} example`, () => {
    it("should match the snapshot", async (context) => {
      const cache = await new Deno.Command("deno", {
        cwd: `src/examples/${name}`,
        args: ["cache", "main.ts"],
      }).output();
      assert(
        cache.success,
        [
          "Caching dependencies failed.",
          "---stdout---",
          new TextDecoder().decode(cache.stdout),
          "---stderr---",
          new TextDecoder().decode(cache.stderr),
        ].join("\n"),
      );
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
        await assertSnapshot(
          context,
          output.replace(/\sat .+/g, " at <wildcard>"),
        );
      }
    });
  });
}
