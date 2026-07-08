import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gestão HB — Vendedor',
        short_name: 'HB Vendedor',
        description: 'Pedidos e comissões em campo',
        lang: 'pt-BR',
        display: 'standalone',
        start_url: '/',
        background_color: '#eef3f8',
        theme_color: '#0f2a43',
        icons: [
          { src: 'icons/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icone-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  server: { port: 3001 }
});
