import { expect, test } from 'claude-code/testing'

import { lerLinha, resumir } from '../hooks/register'

test('lerLinha interpreta a linha TSV dos wrappers de scripts/agentes', () => {
  const linha = ['2026-10-07T23:06:44Z', 'claude', 'consulta', 'haiku', 'low', '7', '0', 'abc123', '.agentes/execucoes/x'].join('\t')

  expect(lerLinha(linha)).toEqual({
    quando: '2026-10-07T23:06:44Z',
    destino: 'claude',
    modo: 'consulta',
    modelo: 'haiku',
    esforco: 'low',
    segundos: 7,
    status: 0,
  })
})

test('lerLinha ignora linhas vazias ou incompletas', () => {
  expect(lerLinha('')).toBe(null)
  expect(lerLinha('so\tduas')).toBe(null)
})

test('resumir distingue sucesso de falha', () => {
  const base = { quando: '', destino: 'codex', modo: 'consulta', modelo: 'padrao', esforco: 'high', segundos: 12 }

  expect(resumir({ ...base, status: 0 })).toBe('codex consulta · padrao · high · 12s · ok')
  expect(resumir({ ...base, status: 8 })).toBe('codex consulta · padrao · high · 12s · falhou(8)')
})
