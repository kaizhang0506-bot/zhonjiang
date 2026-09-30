import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 前端端口：必须从环境变量读取（沙箱注入 DEPLOY_RUN_PORT），禁止硬编码
const port = Number(process.env.DEPLOY_RUN_PORT) || 5000
// 后端 FastAPI 独立端口（前后端分离），可通过 BACKEND_PORT 覆盖
const backendPort = Number(process.env.BACKEND_PORT) || 8001

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    // HMR 不显式指定端口：vite 默认走与应用同端口（5000），
    // 沙箱公网网关只暴露主端口，独立 HMR 端口(6000)无法转发会导致 dev 白屏
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Element Plus 全量引入的 vendor 产物本就超过 500 kB，属预期体积，调高告警阈值
    chunkSizeWarningLimit: 1500,
  },
})

