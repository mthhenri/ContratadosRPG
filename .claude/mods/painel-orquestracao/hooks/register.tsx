import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Delegacao, Painel } from '../types'

const PAINEL = 'painel-orquestracao'
const INTERVALO_MS = 5000
const RECENTE_MS = 10 * 60 * 1000

// Pares que o CLAUDE.md exige idênticos ("Sincronização com CLAUDE.md").
const PARES = [
  ['CLAUDE.md', 'AGENTS.md'],
  ['.claude/skills', '.agents/skills'],
] as const
const SINCRONIZADO = /(^|[\\/])(CLAUDE\.md|AGENTS\.md)$|[\\/]\.(claude|agents)[\\/]skills[\\/]/

const VAZIO: Painel = { emAndamento: [], ultimas: [], divergencias: [], contexto: null, custo: null }
const estado = atom({ plugin: 'painel-orquestracao', key: 'estado' } as const, VAZIO)

// Linha TSV de scripts/agentes/_comum.sh (registrar): data destino modo modelo esforço s status hash pasta
export function lerLinha(linha: string): Delegacao | null {
  const c = linha.split('\t')
  if (c.length < 7) return null
  const [quando = '', destino = '', modo = '', modelo = '', esforco = '', segundos = '0', status = '0'] = c
  return { quando, destino, modo, modelo, esforco, segundos: Number(segundos), status: Number(status) }
}

export function resumir(d: Delegacao): string {
  const ok = d.status === 0 ? 'ok' : `falhou(${d.status})`
  return `${d.destino} ${d.modo} · ${d.modelo} · ${d.esforco} · ${d.segundos}s · ${ok}`
}

async function lerDelegacoes($: any): Promise<Delegacao[]> {
  const texto: string = await $.fs.read('.agentes/delegacoes.log').catch(() => '')
  return texto.split('\n').map(lerLinha).filter((d): d is Delegacao => d !== null).slice(-8)
}

async function lerVagas($: any): Promise<string[]> {
  const itens: { name: string; kind: string }[] = await $.fs.list('.agentes/vagas').catch(() => [])
  return itens.filter(i => i.kind === 'dir').map(i => i.name.split('.')[0] ?? i.name)
}

// Depois de um Edit/Write bem-sucedido numa das cópias, revalida os pares; true se foi uma delas.
async function aposEditar($: any, caminho: string, ran: { deny?: unknown; isError?: boolean }): Promise<boolean> {
  if (ran.deny !== undefined || ran.isError === true || !SINCRONIZADO.test(caminho)) return false
  await atualizar($, true)
  return true
}

// `git diff --no-index` compara arquivos e pastas; saída 1 = diferem.
async function verificarCopias($: any): Promise<string[]> {
  const divergem: string[] = []
  for (const [a, b] of PARES) {
    const r = await $.process.run(['git', 'diff', '--no-index', '--quiet', a, b]).catch(() => null)
    if (r !== null && r.exitCode === 1) divergem.push(`${a} ≠ ${b}`)
  }
  return divergem
}

function textoStatus(p: Painel): string | undefined {
  const partes: string[] = []
  if (p.contexto !== null) partes.push(`ctx ${Math.round(p.contexto)}%`)
  if (p.custo !== null) partes.push(`US$ ${p.custo.toFixed(2)}`)
  if (p.emAndamento.length > 0) partes.push(`deleg ${p.emAndamento.join('+')}`)
  if (p.divergencias.length > 0) partes.push('⚠ cópias divergem')
  return partes.length > 0 ? partes.join(' · ') : undefined
}

// Resumo em texto puro, para o chat de qualquer interface (o painel lateral pode não existir nela).
export function relatorio(p: Painel): string {
  const linhas = [
    `Contexto: ${p.contexto === null ? '—' : `${Math.round(p.contexto)}%`} · Custo: ${p.custo === null ? '—' : `US$ ${p.custo.toFixed(2)}`}`,
    `Cópias CLAUDE.md/AGENTS.md e skills: ${p.divergencias.length === 0 ? 'idênticas' : `DIVERGEM — ${p.divergencias.join('; ')}`}`,
    `Delegações em andamento: ${p.emAndamento.length === 0 ? 'nenhuma' : p.emAndamento.join(', ')}`,
    'Últimas delegações:',
    ...(p.ultimas.length === 0 ? ['  nenhuma registrada em .agentes/delegacoes.log'] : [...p.ultimas].reverse().map(d => `  ${resumir(d)}`)),
  ]
  return linhas.join('\n')
}

// Atualiza o que é barato (arquivos e uso da sessão); a checagem de cópias é separada.
async function atualizar($: any, verificar: boolean) {
  const uso = await $.session.usage().catch(() => null)
  const [ultimas, emAndamento] = await Promise.all([lerDelegacoes($), lerVagas($)])
  const divergencias = verificar ? await verificarCopias($) : (await read($, estado)).divergencias
  const novo: Painel = {
    emAndamento,
    ultimas,
    divergencias,
    contexto: uso?.context?.percent ?? null,
    custo: uso?.cost?.usd ?? null,
  }
  await update($, estado, () => novo)
  $.ui.status(textoStatus(novo))
}

export const register: Register = on => {
  let tocouCopias = false

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'painel', description: 'Abre o painel de delegações, contexto e cópias sincronizadas' })
    void atualizar($, true)
    $.clock.every(INTERVALO_MS, () => atualizar($, false))
    return next(e)
  })

  on('command.run', { command: 'painel' }, async $ => {
    await atualizar($, true)
    await $.ui.open({ id: PAINEL, title: 'Orquestração' })
    return { text: relatorio(await read($, estado)) }
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    if (await aposEditar($, e.file_path, ran)) tocouCopias = true
    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (await aposEditar($, e.file_path, ran)) tocouCopias = true
    return ran
  })

  // Entre editar uma cópia e a outra é normal divergir; só avisa se o turno terminou assim.
  on('turn.complete', async ($, e, next) => {
    if (tocouCopias) {
      tocouCopias = false
      await atualizar($, true)
      const { divergencias } = await read($, estado)
      if (divergencias.length > 0) $.ui.toast(`Cópias divergem: ${divergencias.join('; ')}`)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const p = await read($, estado)
    const agora = await $.clock.now()
    const ultima = p.ultimas[p.ultimas.length - 1]
    const recente = ultima !== undefined && agora - Date.parse(ultima.quando) < RECENTE_MS
    if (e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {p.divergencias.length > 0 && <Text color="red">⚠ Cópias divergem: {p.divergencias.join('; ')}</Text>}
        {p.emAndamento.length > 0 && <Text>Delegando agora: {p.emAndamento.join(', ')}</Text>}
        {p.emAndamento.length === 0 && recente && ultima !== undefined && <Text dimColor>Última delegação: {resumir(ultima)}</Text>}
        <Text dimColor>{textoStatus(p) ?? 'painel-orquestracao ativo'}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PAINEL }, async ($, e) => {
    const p = await read($, estado)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Text bold>Sessão</Text>
        <Text>Contexto: {p.contexto === null ? '—' : `${Math.round(p.contexto)}%`} · Custo: {p.custo === null ? '—' : `US$ ${p.custo.toFixed(2)}`}</Text>
        <Text bold>Cópias sincronizadas</Text>
        {p.divergencias.length === 0 ? <Text dimColor>idênticas</Text> : p.divergencias.map(d => <Text color="red">{d}</Text>)}
        <Text bold>Delegações em andamento</Text>
        {p.emAndamento.length === 0 ? <Text dimColor>nenhuma</Text> : <Text>{p.emAndamento.join(', ')}</Text>}
        <Text bold>Últimas delegações</Text>
        {p.ultimas.length === 0 && <Text dimColor>nenhuma registrada em .agentes/delegacoes.log</Text>}
        {[...p.ultimas].reverse().map(d => <Text dimColor={d.status === 0}>{resumir(d)}</Text>)}
      </Box>
    )
  })
}
