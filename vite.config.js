import { defineConfig } from 'vite';

export default defineConfig({
  base: '/hmm_viz/',
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
  },
});
