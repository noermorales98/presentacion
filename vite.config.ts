import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "Noxy Digital — ¿Y si programar ya no fuera lo más importante?",
        short_name: "Noxy Talk",
        description: "Presentación interactiva sobre IA, agentes y nuevas formas de desarrollar.",
        theme_color: "#0B0B18",
        background_color: "#0B0B18",
        display: "fullscreen",
        orientation: "landscape",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // La presentación, diagramas y terminal simulada funcionan offline.
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ["**/*.{js,wasm,css,html,ico,png,jpg,avif,svg,webmanifest,ttf,woff,woff2}"],
        runtimeCaching: [
          {
            // videos: caché primero, con Range (reproducción desde caché)
            urlPattern: /\.mp4$/i,
            handler: "CacheFirst",
            options: { cacheName: "noxy-videos", rangeRequests: true, cacheableResponse: { statuses: [200] } },
          },
          {
            // fuentes de Google Fonts: caché en tiempo de ejecución
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "noxy-fonts",
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
