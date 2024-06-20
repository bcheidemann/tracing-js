// deno-lint-ignore-file verbatim-module-syntax
import fs from "node:fs";
// @deno-types="@types/eslint"
import { type ESLint } from 'eslint';
import { preferExplicitResourceManagementRule } from "./rules/preferExplicitResourceManagement.ts";

const pkg = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version
  },
  rules: {
    [preferExplicitResourceManagementRule.name]: preferExplicitResourceManagementRule,
  },
} satisfies ESLint.Plugin;

export default plugin;
