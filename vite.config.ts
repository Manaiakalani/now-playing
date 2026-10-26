import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js alone minifies to ~520 kB; it already lives in its own chunk,
    // so raise the warning threshold instead of flagging every build.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Keep the heavyweight vendors in their own long-lived cacheable
        // chunks so app-code changes don't invalidate them.
        codeSplitting: {
          groups: [
            { name: "three", test: /node_modules[\\/]three[\\/]/ },
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
