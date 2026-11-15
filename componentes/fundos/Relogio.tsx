// O fundo do Desafio diário: um mostrador de 24 horas. O arco aceso é o quanto do dia já
// passou; quando ele fecha a volta, à meia-noite, o desafio troca.
const polar = (angulo: number, raio: number) => {
  const a = ((angulo - 90) * Math.PI) / 180
  return [200 + Math.cos(a) * raio, 200 + Math.sin(a) * raio] as const
}

/** `fracao`: de 0 (meia-noite) a 1 (a meia-noite seguinte). */
export function Relogio({ fracao }: { fracao: number }) {
  const angulo = Math.min(Math.max(fracao, 0.001), 0.999) * 360
  const [fx, fy] = polar(angulo, 176)
  const [px, py] = polar(angulo, 150)
  return (
    <svg viewBox="0 0 400 400" className="relogio" data-fracao={fracao.toFixed(3)} aria-hidden>
      <defs>
        <linearGradient id="relogio-arco" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4c8df6" />
          <stop offset="0.4" stopColor="#a078e0" />
          <stop offset="0.7" stopColor="#e8708a" />
          <stop offset="1" stopColor="#ff8a1f" />
        </linearGradient>
      </defs>
      <circle className="aro" cx="200" cy="200" r="176" />
      <circle className="aro fino" cx="200" cy="200" r="150" />
      {Array.from({ length: 96 }, (_, i) => {
        const hora = i % 4 === 0
        const [x1, y1] = polar(i * 3.75, hora ? 160 : 168)
        const [x2, y2] = polar(i * 3.75, 176)
        return <line key={i} className={hora ? 'marca hora' : 'marca'} x1={x1} y1={y1} x2={x2} y2={y2} />
      })}
      {[0, 6, 12, 18].map((h) => {
        const [x, y] = polar(h * 15, 132)
        return (
          <text key={h} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            {String(h).padStart(2, '0')}
          </text>
        )
      })}
      <path className="arco" d={`M200 24 A176 176 0 ${angulo > 180 ? 1 : 0} 1 ${fx} ${fy}`} />
      <line className="ponteiro" x1="200" y1="200" x2={px} y2={py} />
      <circle className="eixo" cx="200" cy="200" r="5" />
      <circle className="ponta" cx={fx} cy={fy} r="6" />
    </svg>
  )
}
