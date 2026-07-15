import { ItemCategoriaEnum, PatenteEnum } from '../../enums';

/**
 * Dados tipados da aba compras (m1-05): categorias, custos, limites de
 * modificação por patente, catálogo de modificações por categoria e catálogo de
 * amplificadores. Migrados de `contratados-calculadora/src/script.js`
 * (`CATALOGO_CATS`, `MOD_CUSTO`, `PATENTES_MOD`, `MODIFICACOES`,
 * `CATALOGO_ITENS.amplificador`) e conferidos contra docs/core/sistema-v4.1.0.md
 * — "Equipamentos", "Prestígio e Patentes" e "Amplificadores". Em conflito, o
 * documento vence (proibição #27). O catálogo de itens vive em `catalogo.dados`.
 */

// ── Constantes de regra ──────────────────────────────────────────────────────

/** Peso somado por empilhamento de modificação, salvo indicação contrária na modificação (doc — "Modificações"). */
export const PESO_MODIFICACAO_PADRAO = 0.2;

/** Custo por modificação, fixo e independente da quantidade já aplicada (doc — "$ 750 por modificação"). */
export const CUSTO_MODIFICACAO_PADRAO = 750;

/** Custo do primeiro empilhamento de um amplificador (doc — "Amplificadores"). */
export const CUSTO_PRIMEIRO_AMPLIFICADOR = 3000;

/** Custo de cada empilhamento de amplificador além do primeiro. */
export const CUSTO_EMPILHAMENTO_AMPLIFICADOR = 1000;

/** Penalidade em testes de Vontade por empilhamento de amplificador além do 1º de cada amplificador. */
export const PENALIDADE_VONTADE_POR_EMPILHAMENTO = 2;

/** Limite total de empilhamentos de amplificador = Vontade × este multiplicador (doc — "Vontade × 3"). */
export const MULTIPLICADOR_LIMITE_AMPLIFICADOR = 3;

// ── Categorias do catálogo ───────────────────────────────────────────────────

/** Uma categoria do catálogo: a chave de enum, o rótulo e o ícone exibidos na UI. */
export interface CategoriaCatalogo {
  readonly categoria: ItemCategoriaEnum;
  readonly rotulo: string;
  readonly icone: string;
}

/** Categorias do catálogo, na ordem de exibição do site antigo (`CATALOGO_CATS`). */
export const CATALOGO_CATEGORIAS: readonly CategoriaCatalogo[] = [
  { categoria: ItemCategoriaEnum.CORPO_A_CORPO, rotulo: 'Corpo a Corpo', icone: '🗡️' },
  { categoria: ItemCategoriaEnum.EXPLOSIVOS, rotulo: 'Explosivos', icone: '💥' },
  { categoria: ItemCategoriaEnum.ARMAS_DE_FOGO, rotulo: 'Armas de Fogo', icone: '🔫' },
  { categoria: ItemCategoriaEnum.MUNICOES, rotulo: 'Munições', icone: '🔹' },
  { categoria: ItemCategoriaEnum.PROTECOES, rotulo: 'Proteções', icone: '🛡️' },
  { categoria: ItemCategoriaEnum.EXOTICOS, rotulo: 'Exóticos', icone: '⚡' },
  { categoria: ItemCategoriaEnum.ARMAZENAMENTO, rotulo: 'Armazenamento', icone: '🎒' },
  { categoria: ItemCategoriaEnum.OPERACIONAL, rotulo: 'Operacional', icone: '🔧' },
  { categoria: ItemCategoriaEnum.MEDICINAL, rotulo: 'Medicinal', icone: '💊' },
  { categoria: ItemCategoriaEnum.AMPLIFICADOR, rotulo: 'Amplificadores', icone: '🔬' },
  { categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR, rotulo: 'Fragmento Construtor', icone: '🧬' },
  { categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, rotulo: 'Fragmento Potencializador', icone: '🧬' },
];

// ── Custo de modificação por categoria ───────────────────────────────────────

/**
 * Exceções ao `CUSTO_MODIFICACAO_PADRAO` ($ 750): Explosivos e Munições custam
 * $ 250, Armazenamento custa $ 300 (doc — notas de custo nas tabelas de
 * modificação). Categorias ausentes usam o custo padrão.
 */
export const CUSTO_MODIFICACAO: Partial<Record<ItemCategoriaEnum, number>> = {
  [ItemCategoriaEnum.EXPLOSIVOS]: 250,
  [ItemCategoriaEnum.MUNICOES]: 250,
  [ItemCategoriaEnum.ARMAZENAMENTO]: 300,
};

// ── Limite de modificações por patente ───────────────────────────────────────

/** Limite de modificações de uma patente: empilhamentos por modificação e modificações por item. */
export interface LimiteModificacoes {
  /** Níveis de empilhamento por modificação (o antigo `maxStack`). */
  readonly maxEmpilhamentos: number;
  /** Modificações por item, contando cada empilhamento (o antigo `maxMods`). */
  readonly maxModificacoes: number;
}

/**
 * Limite de modificações por patente. Fonte: docs/core/sistema-v4.1.0.md —
 * "Prestígio e Patentes" (tabela "Limite de Modificações"). Representa o antigo
 * `PATENTES_MOD` do site sem duplicar as faixas de Prestígio: a tradução
 * Prestígio → patente reusa `obterPatente` (m1-03); aqui a tabela é indexada
 * pela `PatenteEnum`.
 */
export const LIMITES_MODIFICACAO: Readonly<Record<PatenteEnum, LimiteModificacoes>> = {
  [PatenteEnum.AGENTE]: { maxEmpilhamentos: 1, maxModificacoes: 2 },
  [PatenteEnum.OPERADOR]: { maxEmpilhamentos: 2, maxModificacoes: 4 },
  [PatenteEnum.EXPERIENTE]: { maxEmpilhamentos: 2, maxModificacoes: 6 },
  [PatenteEnum.VETERANO]: { maxEmpilhamentos: 3, maxModificacoes: 9 },
  [PatenteEnum.FORCA_TAREFA]: { maxEmpilhamentos: 3, maxModificacoes: 12 },
  [PatenteEnum.FORCA_TAREFA_ESPECIAL]: { maxEmpilhamentos: 4, maxModificacoes: 15 },
  [PatenteEnum.OPERACOES_ESPECIAIS]: { maxEmpilhamentos: 4, maxModificacoes: 18 },
  [PatenteEnum.LIDER_OPERACIONAL]: { maxEmpilhamentos: 5, maxModificacoes: 20 },
};

// ── Modificações por categoria ───────────────────────────────────────────────

/**
 * Uma modificação aplicável aos itens de uma categoria. `empilhamentosIniciais`
 * (■ preenchidos) é quanto a primeira compra concede; `empilhamentoMaximo` (□
 * totais) é o teto próprio da modificação. `bloqueia` lista as modificações cujo
 * uso simultâneo é impedido (doc — coluna "Bloqueia"). `peso` sobrescreve o
 * `PESO_MODIFICACAO_PADRAO` quando informado.
 */
export interface ModificacaoDados {
  readonly nome: string;
  readonly empilhamentosIniciais: number;
  readonly empilhamentoMaximo: number;
  readonly bloqueia: readonly string[];
  readonly descricao: string;
  readonly peso?: number;
}

/**
 * Catálogo de modificações por categoria (`MODIFICACOES` do site antigo).
 * Categorias sem modificações (Operacional, Medicinal, Amplificador) não têm
 * entrada. Conferido contra docs/core/sistema-v4.1.0.md — tabelas "Modificações"
 * de cada categoria.
 */
export const MODIFICACOES: Partial<Record<ItemCategoriaEnum, readonly ModificacaoDados[]>> = {
  [ItemCategoriaEnum.CORPO_A_CORPO]: [
    { nome: 'Balanceada', empilhamentosIniciais: 1, empilhamentoMaximo: 1, bloqueia: [], descricao: '+1 dado nos testes' },
    { nome: 'Confortável', empilhamentosIniciais: 3, empilhamentoMaximo: 4, bloqueia: [], descricao: 'Concede Ataque Duplo (+1E). Extras: −1E/stack' },
    { nome: 'Empunhadura Sofisticada', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: '+2 nos testes de ataque por stack' },
    { nome: 'Explosiva', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Fervente', 'Furtiva', 'Plasma'], descricao: '+1D4 [Explosão] por stack' },
    { nome: 'Fervente', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Explosiva'], descricao: '+1D4 [Químico] por stack' },
    { nome: 'Furtiva', empilhamentosIniciais: 1, empilhamentoMaximo: 2, bloqueia: ['Explosiva', 'Pesada', 'Plasma'], descricao: '−1 peso (mín. 1), sem acréscimo de peso da mod', peso: 0 },
    { nome: 'Impacto', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: 'Atordoar 1E (DT Força). +2 DT/stack extra' },
    { nome: 'Lacerante', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: 'Ignora 5 pts de resist. [Físico] por stack' },
    { nome: 'Letal', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: '+2 de dano por stack' },
    { nome: 'Pesada', empilhamentosIniciais: 3, empilhamentoMaximo: 5, bloqueia: ['Furtiva', 'Tática', 'Veloz'], descricao: '+1 tipo de dado (máx D10), +0,5 peso/stack', peso: 0.5 },
    { nome: 'Plasma', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Explosiva', 'Furtiva', 'Sangramento', 'Venenosa'], descricao: '+1D6 [Químico] por stack, +0,5 peso', peso: 0.5 },
    { nome: 'Reforçada', empilhamentosIniciais: 1, empilhamentoMaximo: 3, bloqueia: [], descricao: '+1 dado de dano por stack' },
    { nome: 'Sangramento', empilhamentosIniciais: 1, empilhamentoMaximo: 4, bloqueia: ['Plasma', 'Venenosa'], descricao: 'Causa Sangramento 2t (DT Força). +2 DT/+1t por stack' },
    { nome: 'Tática', empilhamentosIniciais: 1, empilhamentoMaximo: 3, bloqueia: ['Pesada'], descricao: 'Saque livre. Extras: +1 dado no 1º turno/stack' },
    { nome: 'Veloz', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Pesada'], descricao: 'Atrib. → DES. Extras: +1 iniciativa/stack' },
    { nome: 'Venenosa', empilhamentosIniciais: 1, empilhamentoMaximo: 4, bloqueia: ['Plasma', 'Sangramento'], descricao: 'Causa Envenenado 2t (DT Força). +2 DT/+1t por stack' },
  ],
  [ItemCategoriaEnum.EXPLOSIVOS]: [
    { nome: 'Adesiva', empilhamentosIniciais: 1, empilhamentoMaximo: 3, bloqueia: ['Posicionável'], descricao: 'Reação do alvo −1 dado' },
    { nome: 'Aerodinâmica', empilhamentosIniciais: 1, empilhamentoMaximo: 3, bloqueia: ['Posicionável'], descricao: '+1 nível de alcance. Extras: +2 no teste/stack' },
    { nome: 'Atordoamento', empilhamentosIniciais: 1, empilhamentoMaximo: 3, bloqueia: ['Corrosiva'], descricao: 'Alvos atingidos ficam Atordoados por 1 turno' },
    { nome: 'Corrosiva', empilhamentosIniciais: 1, empilhamentoMaximo: 3, bloqueia: ['Atordoamento', 'Posicionável'], descricao: 'Alvos com −2 Defesa por 1 turno' },
    { nome: 'Estabilizada', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: '+1 metro de raio por stack' },
    { nome: 'Persistente', empilhamentosIniciais: 1, empilhamentoMaximo: 2, bloqueia: [], descricao: '+1 turno de duração por stack' },
    { nome: 'Posicionável', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Adesiva', 'Aerodinâmica', 'Corrosiva'], descricao: 'Instalável e ativável remotamente (30m; DT +2/+5m/stack)' },
    { nome: 'Potente', empilhamentosIniciais: 2, empilhamentoMaximo: 4, bloqueia: [], descricao: '+2 dados de dano por stack' },
    { nome: 'Estilhaços', empilhamentosIniciais: 3, empilhamentoMaximo: 5, bloqueia: [], descricao: 'Ignora 10 pontos de resistência por stack' },
  ],
  [ItemCategoriaEnum.ARMAS_DE_FOGO]: [
    { nome: 'Alcance', empilhamentosIniciais: 1, empilhamentoMaximo: 1, bloqueia: [], descricao: '+1 nível de alcance' },
    { nome: 'Estabilizador', empilhamentosIniciais: 3, empilhamentoMaximo: 4, bloqueia: [], descricao: 'Concede Ataque Duplo (+1E). Extras: −1E/stack' },
    { nome: 'Explosiva', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Furtiva', 'Silenciada', 'Plasma'], descricao: '+1D6 [Explosão] por stack' },
    { nome: 'Furtiva', empilhamentosIniciais: 1, empilhamentoMaximo: 2, bloqueia: ['Plasma', 'Explosiva'], descricao: '−1 peso (mín. 1), sem acréscimo de peso da mod', peso: 0 },
    { nome: 'Mira Dot', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: '+2 nos testes de ataque por stack' },
    { nome: 'Mira Laser', empilhamentosIniciais: 1, empilhamentoMaximo: 1, bloqueia: [], descricao: '+1 dado no teste' },
    { nome: 'Plasma', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Silenciada', 'Furtiva', 'Explosiva'], descricao: '+1D8 [Químico] por stack, +0,5 peso. Mun: Células de Plasma', peso: 0.5 },
    { nome: 'Potência', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: '+2 de dano por stack' },
    { nome: 'Silenciada', empilhamentosIniciais: 1, empilhamentoMaximo: 1, bloqueia: ['Explosiva', 'Plasma'], descricao: 'Não concede bônus ao alvo ao ficar furtivo após ataque furtivo' },
    { nome: 'Tática', empilhamentosIniciais: 1, empilhamentoMaximo: 3, bloqueia: [], descricao: 'Saque livre. Extras: +1 dado no 1º turno/stack' },
  ],
  [ItemCategoriaEnum.MUNICOES]: [
    { nome: 'Calibre', empilhamentosIniciais: 1, empilhamentoMaximo: 4, bloqueia: ['Selante', 'Supressora'], descricao: '+1 dado de dano por stack' },
    { nome: 'Estilhaços', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Incendiária', 'Tóxica'], descricao: '+1D6 [Físico] por stack' },
    { nome: 'Explosiva', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: '+1D6 [Explosão] por stack' },
    { nome: 'Impacto', empilhamentosIniciais: 2, empilhamentoMaximo: 5, bloqueia: [], descricao: 'Atordoar (DT Intelecto). +2 DT/stack extra' },
    { nome: 'Incendiária', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Estilhaços', 'Ponta Oca'], descricao: '+1D6 [Químico] + 50% Em Chamas. Extras: +1 dado +2 DT/stack' },
    { nome: 'Instável', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: '+1D10 [Balístico]. Falhar: 10% de chance de reduzir 1 cena' },
    { nome: 'Munição Extra', empilhamentosIniciais: 3, empilhamentoMaximo: 3, bloqueia: [], descricao: '+1 cena de duração (por 3 stacks iniciais)' },
    { nome: 'Perfurante', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: [], descricao: 'Ignora 5 resist. [Balístico] por stack' },
    { nome: 'Ponta Oca', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Incendiária', 'Tóxica'], descricao: '+1D6 [Físico] + 50% Sangramento. Extras: +1 dado +2 DT/stack' },
    { nome: 'Selante', empilhamentosIniciais: 3, empilhamentoMaximo: 4, bloqueia: ['Calibre', 'Supressora'], descricao: 'Inibe regeneração neste turno. Extras: +5 fraqueza ao dano' },
    { nome: 'Supressora', empilhamentosIniciais: 2, empilhamentoMaximo: 4, bloqueia: ['Calibre', 'Selante'], descricao: 'Ao acertar com crítico, −1 dado no próximo teste de ataque' },
    { nome: 'Tóxica', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Estilhaços', 'Ponta Oca'], descricao: '+1D6 [Químico] por stack' },
  ],
  [ItemCategoriaEnum.PROTECOES]: [
    { nome: 'Antibombas', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Camuflada', 'Espinhos', 'Hazmat', 'Flexível'], descricao: '+2 resist. [Explosão] por stack' },
    { nome: 'Arremesso', empilhamentosIniciais: 2, empilhamentoMaximo: 5, bloqueia: ['Flexível'], descricao: '(Apenas escudos) Arremessa o escudo em alcance curto (FOR). Dano: (Peso)D4+FOR [Físico] máx 6 dados. 3º: retorno automático; 4º e 5º: +1 dado. Recuperar: ação padrão' },
    { nome: 'Blindada', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Camuflada', 'Flexível', 'Reforçada'], descricao: '+2 na resist. principal, +0,5 peso/stack', peso: 0.5 },
    { nome: 'Camuflada', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Antibombas', 'Blindada', 'Espinhos'], descricao: '−1 peso (mín. 1), −1 resist. por stack' },
    { nome: 'Combativo', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Flexível'], descricao: '(Apenas escudos) Usa o escudo como arma CaC. Dano: (Peso)D3+FOR [Físico] máx 5 dados. Sem resist. ao atacar. +1 dado/stack extra' },
    { nome: 'Espinhos', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Antibombas', 'Camuflada', 'Hazmat'], descricao: '1D6+VIG [Físico] ao atacante. +1 dado/stack' },
    { nome: 'Flexível', empilhamentosIniciais: 2, empilhamentoMaximo: 5, bloqueia: ['Antibombas', 'Arremesso', 'Blindada', 'Combativo', 'Resistente'], descricao: '+1 ao Esquivar por stack' },
    { nome: 'Hazmat', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Antibombas', 'Espinhos'], descricao: '+2 resist. [Químico] por stack' },
    { nome: 'Reforçada', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Blindada'], descricao: '+1 na resist. principal por stack' },
    { nome: 'Resistente', empilhamentosIniciais: 2, empilhamentoMaximo: 5, bloqueia: ['Flexível'], descricao: '+1 ao Bloquear por stack' },
  ],
  [ItemCategoriaEnum.EXOTICOS]: [
    { nome: 'Antimatéria', empilhamentosIniciais: 4, empilhamentoMaximo: 4, bloqueia: ['Faz Parte', 'Vibrante', 'Flamejante'], descricao: 'Muda o tipo de dano da arma para Dano Geral' },
    { nome: 'Faz Parte', empilhamentosIniciais: 2, empilhamentoMaximo: 2, bloqueia: ['Antimatéria'], descricao: 'Permite aplicar modificações do tipo especificado' },
    { nome: 'Vibrante', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Antimatéria'], descricao: '+1D8 [Físico] por stack' },
    { nome: 'Flamejante', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Antimatéria'], descricao: '+1D8 [Químico] por stack e causa Em Chamas' },
  ],
  [ItemCategoriaEnum.ARMAZENAMENTO]: [
    // Modificações de armazenamento não agregam peso ao item (doc — "Modificações de
    // Armazenamento"): `peso: 0`. O site antigo somava o padrão 0,2/stack aqui — divergência
    // corrigida em favor do documento (proibição #27).
    { nome: 'Compartimentos Extras', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Espaço Reservado'], descricao: '+1 inventário por stack', peso: 0 },
    { nome: 'Bolso Tático', empilhamentosIniciais: 1, empilhamentoMaximo: 3, bloqueia: [], descricao: 'Seleciona uma arma (ação de movimento) ou item (ação livre) para sacar', peso: 0 },
    { nome: 'Camadas Extras', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Distribuição de Peso'], descricao: '+1 resist. [Físico] e [Balístico] por stack', peso: 0 },
    { nome: 'Espaço Reservado', empilhamentosIniciais: 2, empilhamentoMaximo: 4, bloqueia: ['Compartimentos Extras'], descricao: 'Item selecionado: 2ª repetição não conta peso. Extras: +1 item desconsiderado', peso: 0 },
    { nome: 'Arsenal Reserva', empilhamentosIniciais: 2, empilhamentoMaximo: 5, bloqueia: [], descricao: 'Arma de até 1 peso não conta no inventário. Extras: +1 limite de peso', peso: 0 },
    { nome: 'Distribuição de Peso', empilhamentosIniciais: 1, empilhamentoMaximo: 5, bloqueia: ['Camadas Extras'], descricao: '−1 deslocamento ao Sobrecarregado. 5º: DEF −2, dados −1', peso: 0 },
  ],
};

// ── Amplificadores ───────────────────────────────────────────────────────────

/**
 * Um amplificador (modificação do próprio agente). Como as modificações de item,
 * tem empilhamentos iniciais (■) e um teto (□). Fonte: docs/core/sistema-v4.1.0.md
 * — "Amplificadores".
 */
export interface AmplificadorDados {
  readonly nome: string;
  readonly empilhamentosIniciais: number;
  readonly empilhamentoMaximo: number;
  readonly efeito: string;
}

/** Catálogo de amplificadores (`CATALOGO_ITENS.amplificador` do site antigo). */
export const AMPLIFICADORES: readonly AmplificadorDados[] = [
  { nome: 'Atento', empilhamentosIniciais: 1, empilhamentoMaximo: 3, efeito: '+1 dado de Iniciativa' },
  { nome: 'Conservador', empilhamentosIniciais: 2, empilhamentoMaximo: 2, efeito: '-1 de Energia em custos (mín. 1)' },
  { nome: 'Defesa', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+1 em Defesa (2º+: -1 resist./empilh.)' },
  { nome: 'Duradouro', empilhamentosIniciais: 1, empilhamentoMaximo: 3, efeito: '+1 turno em habilidades com duração' },
  { nome: 'Energia', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+1 Energia/progressão (2º+: -1 Vida/nível)' },
  { nome: 'Interpessoal', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+2 em Social e Vontade (2º+: -1 Luta/Pont.)' },
  { nome: 'Inventário', empilhamentosIniciais: 1, empilhamentoMaximo: 4, efeito: '+5 Inventário Base (2º+: -1m Deslocamento)' },
  { nome: 'Letalidade', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+1D6+1 de dano Furtivo' },
  { nome: 'Muscular', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+2 em Luta e Força (2º+: -1 Intelecto)' },
  { nome: 'Precisão', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+2 em Pontaria e Medicina (2º+: -1 Social)' },
  { nome: 'Reflexos', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+1 Destreza e +1 Esquiva (2º+: -1 Vigor)' },
  { nome: 'Resiliência', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+1 Vigor e +1 Bloqueio (2º+: -1 Destreza)' },
  { nome: 'Resistente', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+1 resist. Geral (2º+: -1 Defesa)' },
  { nome: 'Sinapses', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+2 em Intelecto e Sentidos (2º+: -1 Força)' },
  { nome: 'Veloz', empilhamentosIniciais: 2, empilhamentoMaximo: 4, efeito: '+3m Deslocamento (2º+: -2 Inventário)' },
  { nome: 'Vida', empilhamentosIniciais: 1, empilhamentoMaximo: 5, efeito: '+1 Vida/progressão (2º+: -1 Energia/nível)' },
];
