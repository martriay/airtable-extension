import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

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
            description: 'Quickly save web pages to Airtable with smart tagging and status management',
            permissions: ['storage', 'activeTab'],
            host_permissions: ['https://*/*', 'http://*/*'],
            action: { 
              default_popup: 'popup.html',
              default_icon: {
                '16': 'icons/icon-16.png',
                '48': 'icons/icon-48.png',
                '128': 'icons/icon-128.png'
              }
            },
            icons: {
              '16': 'icons/icon-16.png',
              '48': 'icons/icon-48.png',
              '128': 'icons/icon-128.png'
            },
            background: { service_worker: 'background.js' },
          }, null, 2),
        });
      },
    },
    {
      name: 'copy-icons',
      generateBundle() {
        // Copy icon files to dist/icons/
        const iconFiles = ['icon-16.png', 'icon-48.png', 'icon-128.png'];
        iconFiles.forEach(iconFile => {
          const iconPath = resolve(__dirname, 'icons', iconFile);
          if (existsSync(iconPath)) {
            const iconContent = readFileSync(iconPath);
            this.emitFile({
              type: 'asset',
              fileName: `icons/${iconFile}`,
              source: iconContent,
            });
          }
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
    // Inject environment variables at build time
    'process.env.BASIC_AUTH_USERNAME': JSON.stringify(process.env.BASIC_AUTH_USERNAME || ''),
    'process.env.BASIC_AUTH_PASSWORD': JSON.stringify(process.env.BASIC_AUTH_PASSWORD || ''),
  },
});
