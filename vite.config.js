const { defineConfig } = require('vite');

module.exports = defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
