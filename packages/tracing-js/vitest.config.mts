import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    // Currently required to use "using" declarations
    // See https://github.com/vitejs/vite/discussions/14327#discussioncomment-7275394
    target: "es2022",
  },
})
