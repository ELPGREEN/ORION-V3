import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

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
    react(),
    VitePWA({
      registerType: "prompt",
      devOptions: {
        enabled: false,
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
      },
      manifest: false, // Use existing public/manifest.json
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
  },
}));
