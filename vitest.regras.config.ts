import { defineConfig } from 'vitest/config'

// As regras do Firestore rodam à parte, contra o emulador (npm run prova:regras).
export default defineConfig({
  test: { include: ['regras/**/*.test.ts'] },
})
