import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

/**
 * Project-site base. GitHub Pages serves this repo at
 * https://kungfudoom.github.io/birds-with-guns/
 * The Vercel/Nitro build keeps `base: "/"` in vite.config.ts.
 */
export const PAGES_BASE = "/birds-with-guns/";

/**
 * Rollup keeps `pages/index.html` nested. Pages hosts the site root, and
 * asset URLs are already absolute under `base`, so the shell can move.
 */
function pagesIndexPlugin(): Plugin {
  return {
    name: "pages-index",
    apply: "build",
    // After vite:build-html emits pages/index.html during its own generateBundle.
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = bundle["pages/index.html"];
      if (!html || html.type !== "asset") {
        this.error(
          `Expected pages/index.html in the GitHub Pages bundle. Keys: ${Object.keys(bundle).join(", ")}`,
        );
        return;
      }
      const source = html.source;
      this.emitFile({ type: "asset", fileName: "index.html", source });
      this.emitFile({ type: "asset", fileName: "404.html", source });
      this.emitFile({ type: "asset", fileName: ".nojekyll", source: "" });
      // Rolldown still honors deletion. Drop the nested shell so Pages serves the root.
      delete bundle["pages/index.html"];
    },
  };
}

export default defineConfig({
  base: PAGES_BASE,
  plugins: [tailwindcss(), react(), pagesIndexPlugin()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": resolve(root, "src"),
    },
  },
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, "pages/index.html"),
    },
  },
});
