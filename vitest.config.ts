import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['{motor,cliente,fases,jogo}/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
