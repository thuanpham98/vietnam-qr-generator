import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react-swc";
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    dts({ insertTypesEntry: true, })
  ],
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    format:"esm",
  },
  build: {
    lib: {
      entry: "src/index.ts",
      fileName: 'vietnam-qr-generator',
      formats: ['cjs', 'es'],
      name: 'vietnam-qr-generator',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
        }
      },
    },
    emptyOutDir: true,
    outDir: "dist",
    minify: true,
    cssMinify: true,
    sourcemap: true,
    cssCodeSplit: true,
  }
})
