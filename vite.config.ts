import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
      tsDecorators: true,
    }),
    commonjs()
  ],
  build: {
    target: 'es2020',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: ['petra-plugin-wallet-adapter'],
      output: {
        globals: {
          'petra-plugin-wallet-adapter': 'PetraPluginWalletAdapter'
        }
      }
    }
  },
  optimizeDeps: {
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
