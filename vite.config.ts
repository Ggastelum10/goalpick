import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.png", "favicon.ico", "og-image.png", "offline.html", "pwa-192x192.png", "pwa-512x512.png", "pwa-maskable-512x512.svg", "splash-1290x2796.png", "splash-2048x1536.png"],
      manifest: {
        name: "GOALPICK - Football Predictions 2026",
        short_name: "GOALPICK",
        description: "Join the ultimate football prediction platform. Compete with friends, earn points, and win prizes!",
        theme_color: "#1e3a5f",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-maskable-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      navigateFallbackDenylist: [/^\/~oauth/],
      runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: "NetworkOnly" as const,
            options: {
              plugins: [
              {
                  handlerDidError: async () => {
                    // @ts-ignore - caches is available in service worker context
                    return (self as any).caches.match('/offline.html') || Response.error();
                  },
                },
              ],
            },
          },
          {
            urlPattern: /^https:\/\/wucmklmlexkkiskwmvqb\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
