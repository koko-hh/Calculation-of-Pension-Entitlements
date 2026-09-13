import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 相对资源路径让 dist/index.html 可通过 file:// 直接打开，也可部署到任意子路径。
export default defineConfig({ base: './', plugins: [react()] })
