import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
      tsDecorators: true,
    })
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        globals: {
          'petra-plugin-wallet-adapter': 'PetraWallet'
        }
      }
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
