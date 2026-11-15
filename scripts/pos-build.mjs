// Depois do `next build`: o export estático grava o pré-carregamento das rotas dinâmicas
// em subpastas (__next.fase/$d$id/ataque/__PAGE__.txt), mas o navegador o pede com pontos
// (__next.fase.$d$id.ataque.__PAGE__.txt). Num host estático comum isso dá 404 em todo
// link. Aqui cada arquivo ganha uma cópia com o nome que o navegador pede (D15).
import { copyFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = fileURLToPath(new URL(`../${process.env.SAIDA || 'out'}`, import.meta.url))
let copias = 0

async function percorrer(pasta) {
  for (const item of await readdir(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name)
    if (!item.isDirectory()) continue
    if (item.name.startsWith('__next.')) await achatar(pasta, caminho)
    else if (item.name !== '_next') await percorrer(caminho)
  }
}

async function achatar(destino, pasta) {
  for (const item of await readdir(pasta, { withFileTypes: true, recursive: true })) {
    if (!item.isFile() || !item.name.endsWith('.txt')) continue
    const origem = join(item.parentPath, item.name)
    await copyFile(origem, join(destino, relative(destino, origem).split(sep).join('.')))
    copias++
  }
}

await percorrer(out)
console.log(`pos-build: ${copias} arquivo(s) de pré-carregamento com o nome que o navegador pede`)
