import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'anasesem.jpg'],
      manifest: {
        name: 'Anansesɛm Orders Manager',
        short_name: 'Amaya',
        description: 'Lightweight SaaS-ready web app for small creative/production teams',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'anasesem.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'anasesem.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})