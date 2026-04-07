import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const useHttps = process.env.VITE_DEV_HTTPS === 'true'
const httpsKeyPath = process.env.VITE_DEV_HTTPS_KEY_PATH
const httpsCertPath = process.env.VITE_DEV_HTTPS_CERT_PATH

const httpsOptions =
  useHttps && httpsKeyPath && httpsCertPath
    ? {
        key: fs.readFileSync(path.resolve(__dirname, httpsKeyPath)),
        cert: fs.readFileSync(path.resolve(__dirname, httpsCertPath)),
      }
    : undefined

const backendTarget = 'https://digital-health-record.onrender.com'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    https: httpsOptions,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: true,
      },
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
