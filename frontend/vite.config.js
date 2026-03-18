import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '0.0.0.0', port: 3000, proxy: { '/api': 'http://localhost:3001' } },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Code splitting: chunk per sezione (nome file nel build)
          if (id.includes('src/components/Dashboard')) return 'dashboard'
          if (id.includes('src/components/Inventory')) return 'inventario'
          if (id.includes('src/components/Loans')) return 'prestiti'
          if (id.includes('src/components/Repairs')) return 'riparazioni'
          if (id.includes('src/components/Statistics')) return 'statistiche'
          if (id.includes('src/components/SystemStatus')) return 'sistema'
          if (id.includes('src/components/UserManagement')) return 'utenti'
          if (id.includes('src/components/Penalties')) return 'penalita'
          if (id.includes('src/user/UserArea')) return 'user-area'
          if (id.includes('src/auth/Login')) return 'login'
          if (id.includes('src/auth/ResetPassword')) return 'reset-password'
          if (id.includes('src/components/NotificationsPanel')) return 'notifications'
          if (id.includes('src/components/MobileMenu')) return 'mobile-menu'
          if (id.includes('src/components/Footer')) return 'footer'
        }
      }
    }
  }
})
