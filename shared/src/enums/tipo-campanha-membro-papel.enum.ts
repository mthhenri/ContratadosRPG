/**
 * Papel de um membro numa campanha — distinto do papel **global** da conta (`TipoUsuarioEnum`:
 * `NORMAL`/`ADMIN`/`TESTER`, válido em qualquer campanha). Enum de COLUNA — espelha a tabela de
 * referência `tipo_campanha_membro_papel` (BaseEntity + `codigo` + `descricao`); a coluna de
 * negócio é INTEGER FK `tipo_campanha_membro_papel_id` e o repositório traduz `codigo ↔ id` no
 * SQL (§10.2.12 / SCHEMA.md). Difere dos enums de conteúdo de jogo (dentro do JSONB
 * `ficha.dados`), que não têm tabela `tipo_*` (§10.3).
 *
 * `ESPECTADOR` (m8-01) entra com seu próprio convite (`campanha.codigo_convite_espectador`),
 * independente do convite de `JOGADOR`; o efeito de permissão desse papel (leitura sem ficha
 * própria) é escopo de `m8-02` em diante — esta task só prepara banco e contratos.
 */
export enum TipoCampanhaMembroPapelEnum {
  MESTRE = 'MESTRE',
  JOGADOR = 'JOGADOR',
  ESPECTADOR = 'ESPECTADOR',
}
