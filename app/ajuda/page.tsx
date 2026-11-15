import { Navegacao, Texto } from '../../componentes/Pecas'
import { Sumario } from '../../componentes/Sumario'
import { ajuda } from '../../jogo/fases.gerado'
import { t } from '../../jogo/t'

const ancora = (nome: string) =>
  nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// A ajuda é um manual: cada "## Título" do texto vira uma seção numerada, com âncora.
const secoes = ajuda
  .replace(/\r\n/g, '\n')
  .split(/^## /m)
  .slice(1)
  .map((parte) => {
    const quebra = parte.indexOf('\n')
    const nome = parte.slice(0, quebra).trim()
    return { id: ancora(nome), nome, corpo: parte.slice(quebra + 1).trim() }
  })

export default function Pagina() {
  return (
    <>
      <Navegacao atual="ajuda" />
      <main className="caderno">
        <Sumario titulo={t('ajuda.sumario')} secoes={secoes.map(({ id, nome }) => ({ id, nome }))} />
        <article className="documento">
          <h1>
            <span className="gradiente">{t('ajuda.titulo')}</span>
          </h1>
          <p className="abertura">{t('ajuda.abertura')}</p>
          {secoes.map(({ id, nome, corpo }, i) => (
            <section key={id} id={id}>
              <h2>
                <span>{String(i + 1).padStart(2, '0')}</span>
                {nome}
              </h2>
              <Texto markdown={corpo} />
            </section>
          ))}
        </article>
      </main>
    </>
  )
}
