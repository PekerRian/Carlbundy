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
    },
    include: ['petra-plugin-wallet-adapter']
  },
  build: {
    target: 'es2020',
    commonjsOptions: {
      include: [/petra-plugin-wallet-adapter/, /node_modules/]
    },
    rollupOptions: {
      external: ['@telegram-apps/bridge'],
      output: {
        manualChunks: {
          vendor: ['petra-plugin-wallet-adapter', '@aptos-labs/wallet-adapter-react']
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
