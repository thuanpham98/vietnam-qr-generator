import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts({ insertTypesEntry: true })],
  esbuild: {
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
  build: {
    lib: {
      entry: "src/index.ts",
      fileName: "vietnam-qr-generator",
      formats: ["cjs", "es"],
      name: "vietnam-qr-generator",
    },
    emptyOutDir: true,
    outDir: "dist",
    minify: true,
    cssMinify: true,
    sourcemap: true,
    cssCodeSplit: true,
  },
});
