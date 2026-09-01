import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://xianning-tools.pages.dev',
  // GitHub Pages 部署在 /xianning-me/ 子路径下，必须带 base；
  // Cloudflare Pages (xianning-tools.pages.dev) 部署在根域名，base 留空。
  base: process.env.ASTRO_BASE || '/',
});
