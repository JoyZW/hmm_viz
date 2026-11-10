import { defineConfig } from 'vite';

export default defineConfig({
    // Vercel sets VERCEL=1 during its builds and serves the site from the root.
  // GitHub Pages serves it from /hmm_viz/.
  base: process.env.VERCEL ? '/' : '/hmm_viz/',
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
  },
});
