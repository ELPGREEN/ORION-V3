import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { spawnSync } from "node:child_process";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Regenerates public/sitemap.xml + robots.txt from src/lib/seo/public-routes.ts.
 * Runs once on dev server start and on every production build start.
 */
function sitemapPlugin(): PluginOption {
  let didRun = false;
  const run = () => {
    if (didRun) return;
    didRun = true;
    const result = spawnSync(
      process.execPath,
      ["scripts/generate-sitemap.mjs"],
      { stdio: "inherit" },
    );
    if (result.status !== 0) {
      console.warn("⚠️  sitemap generation failed (non-fatal)");
    }
  };
  return {
    name: "orion-sitemap-generator",
    apply: () => true,
    configResolved: run,
    buildStart: run,
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/App.tsx"],
    },
    watch: {
      ignored: [
        "**/supabase/**",
        "**/public/docs/**",
        "**/public/data/**",
        "**/public/models/**",
        "**/..bfg-report/**",
      ],
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "lucide-react",
      "date-fns",
      "sonner",
      "@tiptap/extension-image",
    ],
    exclude: [],
    holdUntilCrawlEnd: true,
  },
  plugins: [
    sitemapPlugin(),
    react(),
     VitePWA({
       registerType: "autoUpdate",
       devOptions: {
         enabled: false,
       },
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/],
          globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"], // Removed html from pre-cache
          cleanupOutdatedCaches: true,
          // Never cache index.html - always fetch from network (CSP updates)
          runtimeCaching: [
            {
              urlPattern: /^.*\/index\.html$/,
              handler: "NetworkOnly", // Force network for HTML
            },
            {
              urlPattern: /^.*\.(js|css|png|svg|woff2)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "assets-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 86400, // 24 hours
                },
              },
            },
          ],
        },
       manifest: false, // Use existing public/manifest.json
       injectRegister: "script",
       includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
     }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
          ],
          "vendor-icons": ["lucide-react"],
          "vendor-charts": ["recharts"],
          "vendor-editor": ["@tiptap/react", "@tiptap/starter-kit"],
          "vendor-pdf": ["jspdf"],
          "vendor-date": ["date-fns"],
        },
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    target: "es2020",
    // Reduce memory pressure
    chunkSizeWarningLimit: 1000,
  },
}));
