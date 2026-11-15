// Gera o desafio diário de um ano inteiro e confere cada dia contra o banco.
// Uso: npm run prova:diario        (365 dias)
//      DIAS=30 npm run prova:diario
import { spawnSync } from 'node:child_process'

const r = spawnSync('npx', ['vitest', 'run', 'desafio/ano'], { stdio: 'inherit', shell: true, env: { ...process.env, ANO: '1' } })
process.exit(r.status ?? 1)
