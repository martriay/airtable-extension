import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: JSON.stringify({
            manifest_version: 3,
            name: 'Save to Airtable',
            version: '1.0.0',
            permissions: ['storage', 'activeTab'],
            host_permissions: ['https://*/*', 'http://*/*'],
            action: { default_popup: 'popup.html' },
            background: { service_worker: 'background.js' },
          }, null, 2),
        });
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  define: {
    global: 'globalThis',
  },
});
