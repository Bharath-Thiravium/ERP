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

// PERFORMANCE OPTIMIZED CONFIG
export default defineConfig({
  base: basePath,
  plugins: [react()],

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
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: 'es2020',
    chunkSizeWarningLimit: 500, // Reduced from 1000
    rollupOptions: {
      output: {
        manualChunks: {
          // CRITICAL: Separate login from main app
          'auth': ['./src/pages/auth/LoginPage', './src/pages/auth/TwoFactorPage', './src/pages/auth/ServiceUserLogin'],
          
          // Core vendor chunks (smaller)
          'react-core': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'query': ['@tanstack/react-query'],
          
          // Heavy UI libraries (separate)
          'antd': ['antd'],
          'charts': ['recharts', 'chart.js', 'react-chartjs-2'],
          'animations': ['framer-motion'],
          
          // Utilities
          'utils': ['axios', 'zustand', 'date-fns', 'dayjs'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'icons': ['lucide-react', '@ant-design/icons'],
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
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true,
      },
    },
  },

  preview: {
    port: 3001,
    host: true,
    cors: true,
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  // PERFORMANCE: Aggressive optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'zustand',
    ],
    exclude: [
      'antd', // Don't pre-bundle heavy libraries
      'recharts',
      'chart.js',
      'framer-motion',
    ],
    force: true,
  },

  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
})