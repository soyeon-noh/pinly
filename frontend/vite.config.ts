import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // 기본값은 루트 아래 모든 **/*.html을 스캔한다. frontend-demo/(React 18 스파이크)의
    // index.html까지 읽히지 않도록 본 앱의 진입점만 지정한다.
    entries: ['index.html'],
  },
})
