import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('astro').AstroUserConfig} */
export default defineConfig({
  site: 'https://prajwal.is-a.dev',
  output: 'static',
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/connect4/connect4_'),
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@lib': path.resolve(root, 'src/lib'),
        '@scripts': path.resolve(root, 'src/scripts'),
      },
    },
  },
});
