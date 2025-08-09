import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import commonjs from '@rollup/plugin-commonjs'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
      tsDecorators: true,
    }),
    commonjs({
      requireReturnsDefault: 'auto',
      transformMixedEsModules: true
    }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      protocolImports: true
    })
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom']
        }
      },
      external: [
        'eventemitter3',
        'tweetnacl',
        '@noble/hashes/hmac',
        '@noble/hashes/sha512'
      ]
    }
  },
  optimizeDeps: {
    include: [
      'petra-plugin-wallet-adapter',
      'eventemitter3',
      'tweetnacl',
      '@noble/hashes/hmac',
      '@noble/hashes/sha512'
    ],
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
  },
  resolve: {
    alias: {
      'tweetnacl': 'tweetnacl/nacl-fast.js',
      '@noble/hashes': '@noble/hashes/dist/index.js'
    }
  }
})
