import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
      tsDecorators: true,
    }),
    commonjs({
      requireReturnsDefault: 'auto',
      transformMixedEsModules: true
    })
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      },
      external: ['eventemitter3']
    }
  },
  optimizeDeps: {
    include: ['petra-plugin-wallet-adapter', 'eventemitter3'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  }
})
