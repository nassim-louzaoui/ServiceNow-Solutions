import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as fs from 'node:fs';
import * as path from 'node:path';

function readEngineCredentials() {
  const clientPath = path.resolve(__dirname, '../build/lib/engine_client.py');
  if (!fs.existsSync(clientPath)) return { user: '', pass: '', key: '' };
  const src = fs.readFileSync(clientPath, 'utf-8');
  const user = (src.match(/SERVICE_ACCOUNT\s*=\s*"([^"]+)"/) ?? [])[1] ?? '';
  const pass = (src.match(/SERVICE_PASSWORD\s*=\s*"([^"]+)"/) ?? [])[1] ?? '';
  const key  = (src.match(/ENGINE_KEY\s*=\s*"([^"]+)"/) ?? [])[1] ?? '';
  return { user, pass, key };
}

export default defineConfig(() => {
  const creds = readEngineCredentials();
  const auth  = creds.user ? 'Basic ' + Buffer.from(creds.user + ':' + creds.pass).toString('base64') : '';

  return {
    plugins: [react()],
    build: {
      lib: {
        entry: 'src/main.tsx',
        name: 'OIPortal',
        formats: ['iife'],
        fileName: () => 'oi-portal',
      },
      cssCodeSplit: false,
      minify: true,
      outDir: 'dist',
    },
    server: {
      proxy: {
        '/api': {
          target: 'https://everestdev.service-now.com',
          changeOrigin: true,
          secure: true,
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              if (auth) proxyReq.setHeader('Authorization', auth);
              if (creds.key) proxyReq.setHeader('X-Engine-Key', creds.key);
            });
          },
        },
      },
    },
  };
});
