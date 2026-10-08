import { expect, test } from 'claude-code/testing'

import { relatorio } from '../hooks/register'

const base = { emAndamento: [], ultimas: [], divergencias: [], contexto: null, custo: null }

test('relatorio sem dados diz o que falta, sem inventar números', () => {
  const texto = relatorio(base)

  expect(texto).toContain('Contexto: — · Custo: —')
  expect(texto).toContain('idênticas')
  expect(texto).toContain('nenhuma registrada')
})

test('relatorio destaca divergência, delegação em andamento e a última delegação primeiro', () => {
  const antiga = { quando: 'a', destino: 'codex', modo: 'consulta', modelo: 'padrao', esforco: 'high', segundos: 3, status: 0 }
  const nova = { ...antiga, destino: 'claude', segundos: 9, status: 1 }
  const texto = relatorio({ ...base, divergencias: ['CLAUDE.md ≠ AGENTS.md'], emAndamento: ['codex'], ultimas: [antiga, nova], contexto: 41.6, custo: 1.234 })

  expect(texto).toContain('DIVERGEM — CLAUDE.md ≠ AGENTS.md')
  expect(texto).toContain('Delegações em andamento: codex')
  expect(texto).toContain('Contexto: 42% · Custo: US$ 1.23')
  expect(texto.indexOf('claude consulta')).toBeLessThan(texto.indexOf('codex consulta'))
})
