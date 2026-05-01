// vite.config.ts
import { defineConfig } from "file:///C:/Users/elpgr/Documents/orion-v3/ORION-V3/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/elpgr/Documents/orion-v3/ORION-V3/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { spawnSync } from "node:child_process";
import { VitePWA } from "file:///C:/Users/elpgr/Documents/orion-v3/ORION-V3/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\elpgr\\Documents\\orion-v3\\ORION-V3";
function sitemapPlugin() {
  let didRun = false;
  const run = () => {
    if (didRun) return;
    didRun = true;
    const result = spawnSync(
      process.execPath,
      ["scripts/generate-sitemap.mjs"],
      { stdio: "inherit" }
    );
    if (result.status !== 0) {
      console.warn("\u26A0\uFE0F  sitemap generation failed (non-fatal)");
    }
  };
  return {
    name: "orion-sitemap-generator",
    apply: () => true,
    configResolved: run,
    buildStart: run
  };
}
var vite_config_default = defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    },
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/App.tsx"]
    },
    watch: {
      ignored: [
        "**/supabase/**",
        "**/public/docs/**",
        "**/public/data/**",
        "**/public/models/**",
        "**/..bfg-report/**"
      ]
    }
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
      "@tiptap/extension-image"
    ],
    exclude: [],
    holdUntilCrawlEnd: true
  },
  plugins: [
    sitemapPlugin(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        // Removed html from pre-cache
        cleanupOutdatedCaches: true,
        // Never cache index.html - always fetch from network (CSP updates)
        runtimeCaching: [
          {
            urlPattern: /^.*\/index\.html$/,
            handler: "NetworkOnly"
            // Force network for HTML
          },
          {
            urlPattern: /^.*\.(js|css|png|svg|woff2)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400
                // 24 hours
              }
            }
          }
        ]
      },
      manifest: false,
      // Use existing public/manifest.json
      injectRegister: "script",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"]
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
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
            "@radix-ui/react-select"
          ],
          "vendor-icons": ["lucide-react"],
          "vendor-charts": ["recharts"],
          "vendor-editor": ["@tiptap/react", "@tiptap/starter-kit"],
          "vendor-pdf": ["jspdf"],
          "vendor-date": ["date-fns"]
        }
      }
    },
    cssCodeSplit: true,
    sourcemap: false,
    target: "es2020"
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxlbHBnclxcXFxEb2N1bWVudHNcXFxcb3Jpb24tdjNcXFxcT1JJT04tVjNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGVscGdyXFxcXERvY3VtZW50c1xcXFxvcmlvbi12M1xcXFxPUklPTi1WM1xcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvZWxwZ3IvRG9jdW1lbnRzL29yaW9uLXYzL09SSU9OLVYzL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCB0eXBlIFBsdWdpbk9wdGlvbiB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHNwYXduU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XG5cbi8qKlxuICogUmVnZW5lcmF0ZXMgcHVibGljL3NpdGVtYXAueG1sICsgcm9ib3RzLnR4dCBmcm9tIHNyYy9saWIvc2VvL3B1YmxpYy1yb3V0ZXMudHMuXG4gKiBSdW5zIG9uY2Ugb24gZGV2IHNlcnZlciBzdGFydCBhbmQgb24gZXZlcnkgcHJvZHVjdGlvbiBidWlsZCBzdGFydC5cbiAqL1xuZnVuY3Rpb24gc2l0ZW1hcFBsdWdpbigpOiBQbHVnaW5PcHRpb24ge1xuICBsZXQgZGlkUnVuID0gZmFsc2U7XG4gIGNvbnN0IHJ1biA9ICgpID0+IHtcbiAgICBpZiAoZGlkUnVuKSByZXR1cm47XG4gICAgZGlkUnVuID0gdHJ1ZTtcbiAgICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoXG4gICAgICBwcm9jZXNzLmV4ZWNQYXRoLFxuICAgICAgW1wic2NyaXB0cy9nZW5lcmF0ZS1zaXRlbWFwLm1qc1wiXSxcbiAgICAgIHsgc3RkaW86IFwiaW5oZXJpdFwiIH0sXG4gICAgKTtcbiAgICBpZiAocmVzdWx0LnN0YXR1cyAhPT0gMCkge1xuICAgICAgY29uc29sZS53YXJuKFwiXHUyNkEwXHVGRTBGICBzaXRlbWFwIGdlbmVyYXRpb24gZmFpbGVkIChub24tZmF0YWwpXCIpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBcIm9yaW9uLXNpdGVtYXAtZ2VuZXJhdG9yXCIsXG4gICAgYXBwbHk6ICgpID0+IHRydWUsXG4gICAgY29uZmlnUmVzb2x2ZWQ6IHJ1bixcbiAgICBidWlsZFN0YXJ0OiBydW4sXG4gIH07XG59XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKCkgPT4gKHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCI6OlwiLFxuICAgIHBvcnQ6IDgwODAsXG4gICAgaG1yOiB7XG4gICAgICBvdmVybGF5OiBmYWxzZSxcbiAgICB9LFxuICAgIHdhcm11cDoge1xuICAgICAgY2xpZW50RmlsZXM6IFtcIi4vc3JjL21haW4udHN4XCIsIFwiLi9zcmMvQXBwLnRzeFwiXSxcbiAgICB9LFxuICAgIHdhdGNoOiB7XG4gICAgICBpZ25vcmVkOiBbXG4gICAgICAgIFwiKiovc3VwYWJhc2UvKipcIixcbiAgICAgICAgXCIqKi9wdWJsaWMvZG9jcy8qKlwiLFxuICAgICAgICBcIioqL3B1YmxpYy9kYXRhLyoqXCIsXG4gICAgICAgIFwiKiovcHVibGljL21vZGVscy8qKlwiLFxuICAgICAgICBcIioqLy4uYmZnLXJlcG9ydC8qKlwiLFxuICAgICAgXSxcbiAgICB9LFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICBcInJlYWN0XCIsXG4gICAgICBcInJlYWN0LWRvbVwiLFxuICAgICAgXCJyZWFjdC1yb3V0ZXItZG9tXCIsXG4gICAgICBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiLFxuICAgICAgXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIixcbiAgICAgIFwibHVjaWRlLXJlYWN0XCIsXG4gICAgICBcImRhdGUtZm5zXCIsXG4gICAgICBcInNvbm5lclwiLFxuICAgICAgXCJAdGlwdGFwL2V4dGVuc2lvbi1pbWFnZVwiLFxuICAgIF0sXG4gICAgZXhjbHVkZTogW10sXG4gICAgaG9sZFVudGlsQ3Jhd2xFbmQ6IHRydWUsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICBzaXRlbWFwUGx1Z2luKCksXG4gICAgcmVhY3QoKSxcbiAgICAgVml0ZVBXQSh7XG4gICAgICAgcmVnaXN0ZXJUeXBlOiBcImF1dG9VcGRhdGVcIixcbiAgICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICB9LFxuICAgICAgICB3b3JrYm94OiB7XG4gICAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC9+b2F1dGgvXSxcbiAgICAgICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxpY28scG5nLHN2Zyx3b2ZmMn1cIl0sIC8vIFJlbW92ZWQgaHRtbCBmcm9tIHByZS1jYWNoZVxuICAgICAgICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcbiAgICAgICAgICAvLyBOZXZlciBjYWNoZSBpbmRleC5odG1sIC0gYWx3YXlzIGZldGNoIGZyb20gbmV0d29yayAoQ1NQIHVwZGF0ZXMpXG4gICAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsUGF0dGVybjogL14uKlxcL2luZGV4XFwuaHRtbCQvLFxuICAgICAgICAgICAgICBoYW5kbGVyOiBcIk5ldHdvcmtPbmx5XCIsIC8vIEZvcmNlIG5ldHdvcmsgZm9yIEhUTUxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybFBhdHRlcm46IC9eLipcXC4oanN8Y3NzfHBuZ3xzdmd8d29mZjIpJC8sXG4gICAgICAgICAgICAgIGhhbmRsZXI6IFwiQ2FjaGVGaXJzdFwiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgY2FjaGVOYW1lOiBcImFzc2V0cy1jYWNoZVwiLFxuICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwMCxcbiAgICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDg2NDAwLCAvLyAyNCBob3Vyc1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgbWFuaWZlc3Q6IGZhbHNlLCAvLyBVc2UgZXhpc3RpbmcgcHVibGljL21hbmlmZXN0Lmpzb25cbiAgICAgICBpbmplY3RSZWdpc3RlcjogXCJzY3JpcHRcIixcbiAgICAgICBpbmNsdWRlQXNzZXRzOiBbXCJmYXZpY29uLmljb1wiLCBcImFwcGxlLXRvdWNoLWljb24ucG5nXCIsIFwibWFzay1pY29uLnN2Z1wiXSxcbiAgICAgfSksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgXCJ2ZW5kb3ItcmVhY3RcIjogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC1yb3V0ZXItZG9tXCJdLFxuICAgICAgICAgIFwidmVuZG9yLXN1cGFiYXNlXCI6IFtcIkBzdXBhYmFzZS9zdXBhYmFzZS1qc1wiXSxcbiAgICAgICAgICBcInZlbmRvci1xdWVyeVwiOiBbXCJAdGFuc3RhY2svcmVhY3QtcXVlcnlcIl0sXG4gICAgICAgICAgXCJ2ZW5kb3ItdWlcIjogW1xuICAgICAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtZGlhbG9nXCIsXG4gICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51XCIsXG4gICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC10YWJzXCIsXG4gICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC10b29sdGlwXCIsXG4gICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1wb3BvdmVyXCIsXG4gICAgICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zZWxlY3RcIixcbiAgICAgICAgICBdLFxuICAgICAgICAgIFwidmVuZG9yLWljb25zXCI6IFtcImx1Y2lkZS1yZWFjdFwiXSxcbiAgICAgICAgICBcInZlbmRvci1jaGFydHNcIjogW1wicmVjaGFydHNcIl0sXG4gICAgICAgICAgXCJ2ZW5kb3ItZWRpdG9yXCI6IFtcIkB0aXB0YXAvcmVhY3RcIiwgXCJAdGlwdGFwL3N0YXJ0ZXIta2l0XCJdLFxuICAgICAgICAgIFwidmVuZG9yLXBkZlwiOiBbXCJqc3BkZlwiXSxcbiAgICAgICAgICBcInZlbmRvci1kYXRlXCI6IFtcImRhdGUtZm5zXCJdLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIHRhcmdldDogXCJlczIwMjBcIixcbiAgfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNFQsU0FBUyxvQkFBdUM7QUFDNVcsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGlCQUFpQjtBQUMxQixTQUFTLGVBQWU7QUFKeEIsSUFB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
