// O build do site, nos dois idiomas (D16). O português sai na raiz e o inglês em /en/:
// é o mesmo código, construído de novo com NEXT_PUBLIC_IDIOMA=en e basePath '/en', e
// copiado para dentro da pasta exportada. Nenhuma rota muda, e nada troca de idioma em
// tempo de execução.
//
// SAIDA escolhe a pasta exportada (padrão: out). SO_PT=1 pula o inglês, para provas que
// não precisam dele.
//
// Na Vercel, o vercel.json desliga o preset do Next ("framework": null) e publica a pasta
// out/ como site estático. Com o preset ligado, o adaptador do Next na Vercel grava a saída
// do deploy no fim de cada `next build`, e o build do inglês apagava o do português: em
// 17/11/2026 a raiz do site ficou em 404 e só /en/ respondia.
import { spawnSync } from 'node:child_process'
import { cp, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const saida = process.env.SAIDA || 'out'

function rodar(comando, args, env) {
  const r = spawnSync(comando, args, { cwd: raiz, shell: true, stdio: 'inherit', env: { ...process.env, ...env } })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function construir(env) {
  rodar('npx', ['next', 'build'], env)
  rodar('node', ['scripts/pos-build.mjs'], env)
}

// O português primeiro e com a configuração de sempre: é dele a pasta .next que a Vercel lê.
construir({ NEXT_PUBLIC_IDIOMA: '' })

if (!process.env.SO_PT) {
  const temporaria = `${saida}-en`
  construir({ NEXT_PUBLIC_IDIOMA: 'en', SAIDA: temporaria })
  const destino = join(raiz, saida, 'en')
  await rm(destino, { recursive: true, force: true })
  for (const item of await readdir(join(raiz, temporaria))) {
    // O PGlite é o mesmo arquivo nos dois idiomas, e o Worker o busca na raiz do site.
    if (item.startsWith('pglite-')) continue
    await cp(join(raiz, temporaria, item), join(destino, item), { recursive: true })
  }
  await rm(join(raiz, temporaria), { recursive: true, force: true })
  console.log(`construir: inglês em ${saida}/en/`)
}
