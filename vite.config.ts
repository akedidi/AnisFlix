import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('wouter')) {
              return 'vendor-router';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
            // Autres dépendances
            return 'vendor-misc';
          }
          
          // Chunks de l'application
          if (id.includes('components')) {
            return 'app-components';
          }
          if (id.includes('pages')) {
            return 'app-pages';
          }
          if (id.includes('hooks')) {
            return 'app-hooks';
          }
          if (id.includes('lib')) {
            return 'app-lib';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
