import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest config. Tests are pure-logic by default (node environment); add jsdom
// + @testing-library later if/when component tests are introduced. The `@` alias
// mirrors tsconfig.json's paths so test imports match app imports.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
