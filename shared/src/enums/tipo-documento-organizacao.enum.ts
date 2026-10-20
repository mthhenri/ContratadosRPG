/**
 * Cargo dono de uma organização em pastas da Biblioteca. Enum de COLUNA — espelha a tabela de
 * referência `tipo_documento_organizacao`; a coluna de negócio é INTEGER FK
 * (`documento_pasta.tipo_documento_organizacao_id`) e o repositório traduz `codigo ↔ id` no SQL.
 *
 * `MESTRE` é a árvore que só o mestre vê e edita. `JOGADOR` é a árvore única compartilhada por
 * jogadores (que a editam) e espectadores (que só a veem). Nenhum cargo enxerga a do outro.
 */
export enum TipoDocumentoOrganizacaoEnum {
  MESTRE = 'MESTRE',
  JOGADOR = 'JOGADOR',
}
