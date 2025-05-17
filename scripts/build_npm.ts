// ex. scripts/build_npm.ts
import { build, emptyDir } from "@deno/dnt";
import denoJson from "../deno.json" with { type: "json" };

await emptyDir("./npm");

await build({
  entryPoints: Object.entries(denoJson.exports).map(([name, path]) => ({
    kind: "export",
    name,
    path,
  })),
  typeCheck: false,
  test: false,
  outDir: "./npm",
  shims: {
    deno: true,
  },
  package: {
    name: "@tracing-js/tracing",
    version: denoJson.version,
    description: "An extensible structured logging system for JavaScript.",
    license: "ISC",
    repository: {
      type: "git",
      url: "git+https://github.com/bcheidemann/tracing-js.git",
    },
    bugs: {
      url: "https://github.com/bcheidemann/tracing-js/issues",
    },
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
