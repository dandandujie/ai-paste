import { defineConfig } from 'vite';
import { resolve } from 'path';

// Content script 单独构建为 IIFE 格式
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'AIPasteContent',
      formats: ['iife'],
      fileName: () => 'content/content.js'
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
        // 确保非 ASCII 字符被转义为 Unicode 转义序列
        generatedCode: {
          constBindings: true
        }
      }
    },
    // 确保输出为 ASCII 安全
    minify: 'terser',
    terserOptions: {
      format: {
        ascii_only: true
      }
    }
  }
});
