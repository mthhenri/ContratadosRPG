export type Delegacao = {
  quando: string
  destino: string
  modo: string
  modelo: string
  esforco: string
  segundos: number
  status: number
}

export type Painel = {
  /** Vagas ocupadas em .agentes/vagas, ex.: "codex" (uma entrada por vaga). */
  emAndamento: string[]
  /** Últimas linhas de .agentes/delegacoes.log, da mais antiga para a mais nova. */
  ultimas: Delegacao[]
  /** Pares de cópias idênticas que divergem, ex.: "CLAUDE.md ≠ AGENTS.md". */
  divergencias: string[]
  /** Preenchimento da janela de contexto (0–100), se conhecido. */
  contexto: number | null
  /** Custo da sessão em USD, se conhecido. */
  custo: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'painel-orquestracao': { estado: Painel }
  }
}
