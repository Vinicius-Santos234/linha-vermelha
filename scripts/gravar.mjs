// Regrava o ataque.gravado.json de cada fase a partir do ataque.ts.
import { spawnSync } from 'node:child_process'

const r = spawnSync('npx', ['vitest', 'run', 'fases'], { stdio: 'inherit', shell: true, env: { ...process.env, GRAVAR: '1' } })
process.exit(r.status ?? 1)
