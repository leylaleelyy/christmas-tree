import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 重要：设置 base 为你的仓库名
  base: '/christmas-tree/',
})
