/**
 * Tipo do efeito **mecânico** de uma modificação custom. Cobre os arquétipos de
 * efeito que aparecem nas tabelas de modificação de todas as categorias de
 * equipamento (docs/core/sistema-v4.1.0.md — tabelas "Modificações"): as mods do
 * catálogo têm efeito embutido no motor por nome; a mod custom monta o seu a
 * partir destes tipos, então uma mod inventada **funciona de verdade**.
 *
 * Conteúdo de jogo dentro do `ficha.dados` JSONB — sem tabela `tipo_*` (§10.3).
 *
 * Efeitos que o motor **funde no stat computado** do item (`calcularStatItem`),
 * como as mods do catálogo: `DANO_FIXO`, `DANO_DADOS`, `DANO_DADOS_BASE`,
 * `ELEVAR_DADO` (dano) · `RESISTENCIA` (proteção) · `INVENTARIO` (armazenamento).
 * Os demais são **descritivos** (aparecem no chip da mod, como a coluna de efeito
 * do catálogo faz com Perfuração, condições, alcance, etc.).
 */
export enum ModificacaoEfeitoTipoEnum {
  /** +N de dano fixo (ex.: Letal, Potência). */
  DANO_FIXO = 'DANO_FIXO',
  /** +N D`faces` de um `tipoDano` (ex.: Explosiva, Plasma, Vibrante). */
  DANO_DADOS = 'DANO_DADOS',
  /** +N dados no **dado base** da arma (ex.: Reforçada, Calibre). */
  DANO_DADOS_BASE = 'DANO_DADOS_BASE',
  /** +N degrau(s) no tipo do dado de dano, máx. D12 (ex.: Pesada). */
  ELEVAR_DADO = 'ELEVAR_DADO',
  /** Ignora N pontos de resistência de um `tipoDano` (ex.: Lacerante, Perfurante). */
  PERFURACAO = 'PERFURACAO',
  /** +N em teste — `variante` `DADO` (dados) ou `FIXO` (bônus) (ex.: Balanceada, Mira Dot). */
  BONUS_TESTE = 'BONUS_TESTE',
  /** +N de resistência — `tipoDano` vazio = todas; senão o tipo (ex.: Blindada, Hazmat, Antibombas). */
  RESISTENCIA = 'RESISTENCIA',
  /** +N em `variante` `Esquiva` / `Bloqueio` / `Defesa` (ex.: Flexível, Resistente). */
  DEFESA = 'DEFESA',
  /** +N nível(is) de alcance (ex.: Alcance, Aerodinâmica). */
  ALCANCE = 'ALCANCE',
  /** +N metro(s) de raio de explosão (ex.: Estabilizada). */
  RAIO = 'RAIO',
  /** +N turno(s) de duração (ex.: Persistente). */
  DURACAO = 'DURACAO',
  /** Aplica uma `condicao` (Sangramento, Envenenado…), com `atributoDt` e `duracaoTurnos` opcionais. */
  CONDICAO = 'CONDICAO',
  /** +N de inventário (ex.: Compartimentos Extras). */
  INVENTARIO = 'INVENTARIO',
}
