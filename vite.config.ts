import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    define: {
      'process.env': {
        TAPO_API_URL: process.env.TAPO_API_URL,
        TAPO_USERNAME: process.env.TAPO_USERNAME,
        TAPO_PASSWORD: process.env.TAPO_PASSWORD,
      }
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_GO2RTC_API_URL || 'http://10.66.66.4:1984',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'hls': ['hls.js'],
            'vendor': ['vue', 'vue-router', 'pinia', '@iconify/vue'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  }
})
