import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

function normalizeBasePath(basePath?: string) {
  if (!basePath || basePath.trim() === '') {
    return '/'
  }

  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

const basePath = normalizeBasePath(process.env.VITE_BASE_PATH)

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react()],

  // Path resolution
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@store': fileURLToPath(new URL('./src/store', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
    },
  },

  // Development server configuration
  server: {
    port: 3001,
    host: true,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8006',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'query': ['@tanstack/react-query'],
          'ui': ['@headlessui/react', 'framer-motion', 'lucide-react'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'charts': ['recharts'],
          'http': ['axios'],
          'state': ['zustand'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  // Preview server (for production build testing)
  preview: {
    port: 3001,
    host: true,
    cors: true,
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  // Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'zustand',
      'lucide-react',
      'recharts',
      'react-hook-form',
      'zod',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
    force: true,
  },

  // Performance optimizations
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
