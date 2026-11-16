import type { ReactNode } from 'react'

// As ilhas do mapa são peças de computador vistas de cima. Cada desenho cabe em 120×84 e
// usa três classes: .f (corpo da peça), .t (traço) e .d (detalhe que acende com o progresso).
const vezes = (n: number) => Array.from({ length: n }, (_, i) => i)

const peca = (desenho: ReactNode) => (
  <svg viewBox="0 0 120 84" className="arte" aria-hidden>
    {desenho}
  </svg>
)

/** As peças, uma por fase, na ordem das fases. */
export const ARTES: ReactNode[] = [
  // 1. Pente de RAM
  peca(
    <>
      <rect className="f" x="5" y="20" width="110" height="38" rx="3" />
      {vezes(5).map((i) => (
        <rect key={i} className="d" x={12 + i * 20.5} y="27" width="14" height="17" rx="1.5" />
      ))}
      <path className="t" d={vezes(17).map((i) => `M${10 + i * 6.2} 58v9`).join('')} />
      <path className="t" d="M58 58v-5h4v5" />
    </>,
  ),
  // 2. SSD M.2
  peca(
    <>
      <rect className="f" x="8" y="26" width="104" height="30" rx="3" />
      <rect className="d" x="18" y="32" width="26" height="18" rx="2" />
      <rect className="d" x="50" y="32" width="18" height="18" rx="2" />
      <path className="t" d="M76 36h22M76 42h22M76 48h14" />
      <circle className="t" cx="106" cy="41" r="3" />
      <path className="t" d={vezes(6).map((i) => `M${4} ${30 + i * 4.4}h4`).join('')} />
    </>,
  ),
  // 3. Cooler
  peca(
    <>
      <rect className="f" x="24" y="6" width="72" height="72" rx="8" />
      <circle className="t" cx="60" cy="42" r="29" />
      {vezes(6).map((i) => (
        <path key={i} className="d" d="M60 42c3-10 12-17 20-15-2 9-9 16-20 15Z" transform={`rotate(${i * 60} 60 42)`} />
      ))}
      <circle className="f t" cx="60" cy="42" r="6" />
      {[
        [31, 13],
        [89, 13],
        [31, 71],
        [89, 71],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} className="t" cx={x} cy={y} r="2.2" />
      ))}
    </>,
  ),
  // 4. Placa-mãe
  peca(
    <>
      <rect className="f" x="8" y="4" width="104" height="76" rx="4" />
      <rect className="d" x="20" y="14" width="30" height="30" rx="2" />
      <rect className="t" x="27" y="21" width="16" height="16" />
      <path className="t" d="M62 12v34M70 12v34M78 12v34M86 12v34" />
      <path className="t" d="M18 54h50M18 62h50M18 70h34" />
      <circle className="d" cx="92" cy="62" r="9" />
      <path className="t" d="M100 14h6v14h-6z" />
    </>,
  ),
  // 5. CPU
  peca(
    <>
      <path className="t" d={vezes(8).map((i) => `M${27 + i * 9.4} 6v8M${27 + i * 9.4} 70v8M18 ${15 + i * 7.7}h8M94 ${15 + i * 7.7}h8`).join('')} />
      <rect className="f" x="26" y="12" width="68" height="60" rx="5" />
      <rect className="d" x="40" y="26" width="40" height="32" rx="3" />
      <path className="t" d="M32 66l8-8" />
      <path className="t" d="M48 36h24M48 42h24M48 48h16" />
    </>,
  ),
  // 6. Placa de vídeo
  peca(
    <>
      <rect className="f" x="10" y="16" width="104" height="46" rx="5" />
      <circle className="t" cx="40" cy="39" r="16" />
      <circle className="t" cx="84" cy="39" r="16" />
      {[40, 84].map((cx) =>
        vezes(4).map((i) => <path key={`${cx}-${i}`} className="d" d={`M${cx} 39c2-6 7-10 12-9-1 6-6 10-12 9Z`} transform={`rotate(${i * 90} ${cx} 39)`} />),
      )}
      <path className="t" d="M4 12v58M4 22h6M4 56h6" />
      <path className="t" d={vezes(9).map((i) => `M${22 + i * 5} 62v7`).join('')} />
    </>,
  ),
  // 7. Fonte
  peca(
    <>
      <rect className="f" x="14" y="12" width="74" height="60" rx="5" />
      <circle className="t" cx="51" cy="42" r="22" />
      <circle className="t" cx="51" cy="42" r="13" />
      <circle className="d" cx="51" cy="42" r="5" />
      <path className="t" d="M51 20v44M29 42h44" />
      <path className="t" d="M88 26c12 0 8 10 20 10M88 42c12 0 10 6 22 6M88 58c10 0 8-6 18-6" />
      <rect className="d" x="20" y="16" width="10" height="6" rx="1" />
    </>,
  ),
  // 8. Roteador
  peca(
    <>
      <path className="t" d="M30 46V10M60 46V4M90 46V10" />
      <circle className="d" cx="30" cy="10" r="3" />
      <circle className="d" cx="60" cy="5" r="3" />
      <circle className="d" cx="90" cy="10" r="3" />
      <rect className="f" x="10" y="44" width="100" height="26" rx="6" />
      {vezes(5).map((i) => (
        <circle key={i} className="d" cx={24 + i * 11} cy="57" r="2.4" />
      ))}
      <path className="t" d="M84 53h16M84 61h16" />
      <path className="t" d="M22 70v6M98 70v6" />
    </>,
  ),
  // 9. Chip
  peca(
    <>
      <path className="t" d={vezes(7).map((i) => `M${27 + i * 11} 14v10M${27 + i * 11} 60v10`).join('')} />
      <rect className="f" x="16" y="22" width="88" height="40" rx="4" />
      <path className="t" d="M16 36a6 6 0 0 0 0 12" />
      <rect className="d" x="34" y="32" width="54" height="20" rx="2" />
      <circle className="t" cx="27" cy="54" r="2" />
    </>,
  ),
  // 10. Servidor
  peca(
    <>
      <rect className="f" x="18" y="4" width="84" height="76" rx="5" />
      {vezes(4).map((i) => (
        <g key={i}>
          <rect className="t" x="25" y={10 + i * 17} width="70" height="13" rx="2" />
          <circle className="d" cx="32" cy={16.5 + i * 17} r="2.4" />
          <circle className="d" cx="40" cy={16.5 + i * 17} r="2.4" />
          <path className="t" d={`M52 ${16.5 + i * 17}h36`} />
        </g>
      ))}
    </>,
  ),
  // 11. Disco rígido
  peca(
    <>
      <rect className="f" x="14" y="6" width="92" height="72" rx="6" />
      <circle className="t" cx="54" cy="40" r="26" />
      <circle className="d" cx="54" cy="40" r="15" />
      <circle className="f t" cx="54" cy="40" r="5" />
      <path className="t" d="M92 66 62 46" />
      <circle className="d" cx="92" cy="66" r="6" />
      <path className="t" d="M88 14h12M88 20h12" />
    </>,
  ),
  // 12. Terminal
  peca(
    <>
      <rect className="f" x="12" y="6" width="96" height="58" rx="5" />
      <rect className="t" x="19" y="13" width="82" height="44" rx="2" />
      <path className="d" d="M26 22l9 7-9 7z" />
      <path className="t" d="M40 36h20M26 46h34" />
      <path className="t" d="M48 64v9M72 64v9M36 74h48" />
    </>,
  ),
  // 13. Teclado
  peca(
    <>
      <rect className="f" x="6" y="20" width="108" height="46" rx="6" />
      {vezes(3).map((l) =>
        vezes(9).map((c) => <rect key={`${l}-${c}`} className={(l + c) % 4 === 0 ? 'd' : 't'} x={13 + c * 10.6} y={27 + l * 9.5} width="7.6" height="6.4" rx="1.2" />),
      )}
      <rect className="d" x="34" y="56" width="52" height="5" rx="1.5" />
    </>,
  ),
]

/** O fim da rota: um banco de dados com o X do tesouro. */
export const TESOURO = peca(
  <>
    <path className="f" d="M26 22v40c0 7 15 12 34 12s34-5 34-12V22" />
    <ellipse className="f t" cx="60" cy="22" rx="34" ry="12" />
    <path className="t" d="M26 36c0 7 15 12 34 12s34-5 34-12M26 50c0 7 15 12 34 12s34-5 34-12" />
    <path className="x" d="M50 14l20 16M70 14 50 30" />
  </>,
)

/** A rosa dos ventos, para o canto do mapa. */
export const BUSSOLA = (
  <svg viewBox="0 0 100 100" className="bussola" aria-hidden>
    <circle cx="50" cy="50" r="38" />
    <circle cx="50" cy="50" r="30" strokeDasharray="2 5" />
    <path className="agulha" d="M50 14 58 50 50 86 42 50Z" />
    <path d="M14 50 50 44 86 50 50 56Z" />
    <text x="50" y="10" textAnchor="middle">
      N
    </text>
  </svg>
)
