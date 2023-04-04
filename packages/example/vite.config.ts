import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@monoid-dev/mobx-zod-form': require.resolve('../mobx-zod-form/src/index.ts'),
      '@monoid-dev/mobx-zod-form-react': require.resolve('../mobx-zod-form-react/src/index.tsx'),
    }
  }
});
