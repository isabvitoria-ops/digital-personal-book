/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/digital-personal-book/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icone.svg", "icone-180.png", "icone-mascara.png"],
      manifest: {
        name: "Meu Caderno",
        short_name: "Caderno",
        description: "Caderno pessoal digital. Tudo guardado no aparelho.",
        lang: "pt-BR",
        start_url: "/digital-personal-book/",
        scope: "/digital-personal-book/",
        display: "standalone",
        background_color: "#f7f4ee",
        theme_color: "#f7f4ee",
        icons: [
          { src: "icone-192.png", sizes: "192x192", type: "image/png" },
          { src: "icone-512.png", sizes: "512x512", type: "image/png" },
          { src: "icone-mascara.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    include: ["testes/**/*.test.ts"],
  },
});
