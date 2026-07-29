/**
 * Visibilidade de uma rolagem registrada (m3-27): quem, além do autor, enxerga a rolagem no
 * histórico da ficha e no feed da campanha. `PRIVADA` = autor + mestre da campanha (o mesmo
 * mecanismo cobre o mestre rolando "só para si": autor = mestre). Enum de **coluna** — espelha a
 * tabela de referência `tipo_rolagem_visibilidade` (§10.2.12); o repositório traduz `codigo ↔ id`
 * no SQL. Diferente dos enums de conteúdo de jogo do JSONB `ficha.dados` (§10.3), que não têm
 * tabela `tipo_*` — `visibilidade` é coluna relacional de `rolagem`, não conteúdo de documento.
 */
export enum RolagemVisibilidadeEnum {
  PUBLICA = 'PUBLICA',
  PRIVADA = 'PRIVADA',
}
