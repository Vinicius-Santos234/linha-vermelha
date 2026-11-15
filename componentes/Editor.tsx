'use client'

import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { PostgreSQL, sql } from '@codemirror/lang-sql'
import { Prec } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { basicSetup } from 'codemirror'
import { useEffect, useRef } from 'react'

const tema = EditorView.theme(
  {
    '&': { color: '#e3e3e3', backgroundColor: 'transparent' },
    '.cm-content': { caretColor: '#fff', padding: '12px 0' },
    '.cm-cursor': { borderLeftColor: '#fff' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#5f6368', border: 'none', paddingLeft: '6px' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.035)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#c4c7c5' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(76,141,246,0.32)',
    },
    '.cm-matchingBracket': { backgroundColor: 'rgba(255,255,255,0.14)', outline: 'none' },
    '.cm-tooltip': { backgroundColor: '#282a2c', border: '1px solid #3c4043', borderRadius: '10px', overflow: 'hidden' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: '#3c4043', color: '#fff' },
  },
  { dark: true },
)

const cores = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: '#c58af9' },
    { tag: [tags.string, tags.special(tags.string)], color: '#fdc830' },
    { tag: [tags.number, tags.bool, tags.null, tags.atom], color: '#ff8a65' },
    { tag: [tags.comment], color: '#80868b', fontStyle: 'italic' },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#8ab4f8' },
    { tag: [tags.propertyName], color: '#a8c7fa' },
    { tag: [tags.typeName, tags.className], color: '#ee9cf7' },
    { tag: [tags.operator, tags.punctuation], color: '#c4c7c5' },
  ]),
)

export function Editor({
  valor,
  aoMudar,
  aoExecutar,
  linguagem,
  rotulo,
}: {
  valor: string
  aoMudar(valor: string): void
  aoExecutar(): void
  linguagem: 'js' | 'sql'
  rotulo: string
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  // As funções mudam a cada render; o editor é criado uma vez só e lê sempre a mais nova.
  const acoes = useRef({ aoMudar, aoExecutar })
  acoes.current = { aoMudar, aoExecutar }

  useEffect(() => {
    const editor = new EditorView({
      parent: caixa.current!,
      doc: valor,
      extensions: [
        Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (acoes.current.aoExecutar(), true) }])),
        basicSetup,
        linguagem === 'js' ? javascript() : sql({ dialect: PostgreSQL, upperCaseKeywords: false }),
        tema,
        cores,
        EditorView.contentAttributes.of({ 'aria-label': rotulo }),
        EditorView.updateListener.of((u) => u.docChanged && acoes.current.aoMudar(u.state.doc.toString())),
      ],
    })
    view.current = editor
    return () => editor.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linguagem])

  // Quando o valor muda por fora (restaurar o SQL inicial), o editor acompanha.
  useEffect(() => {
    const editor = view.current
    if (editor && editor.state.doc.toString() !== valor) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: valor } })
    }
  }, [valor])

  return <div ref={caixa} />
}
