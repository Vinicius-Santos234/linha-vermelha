import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['{motor,cliente,fases,jogo,desafio}/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
