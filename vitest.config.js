// Separate vitest config so that the complex API-proxy code in vite.config.js
// (which uses duplicate `let` declarations that trip rolldown's strict parser)
// is never loaded during test runs.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Per-file environment overrides (// @vitest-environment ...) still work.
    environment: "node",
  },
});
