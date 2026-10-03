import {
  expandirAtalhosDano,
  type FormulaTokenizadaDto,
  interpretarFormula,
  montarFormula,
  type PecaFormulaDto,
  tokenizarFormula,
} from '@contratados-rpg/shared/regras/rolagem';

/**
 * Modelo de estado das versões novas do montador (`montador-exp-02`). **O texto da fórmula é a única fonte de
 * verdade** (decisão 6): o estado da tela é derivado dele (`analisarFormulaMontador`) e toda edição produz um texto
 * novo (`montarFormula`). Funções puras — nenhuma regra de jogo: quem lê e valida é o motor (`shared/regras`).
 */

/** Dano C. a C./Furtivo atuais da ficha (mesmo contrato de `RolagemRapida.atalhosDano`). */
export interface AtalhosDanoMontador {
  readonly corpo?: string | null;
  readonly furtivo?: string | null;
}

/**
 * Estado de uma fórmula para o montador: `VAZIA` (nada escrito), `PECAS` (editável por controles),
 * `AVANCADA` (válida, mas sem representação em peças — só o texto a edita, nunca é reescrita em silêncio) e
 * `INVALIDA` (o motor recusa; `erro` traz o motivo).
 */
export type MontadorFormulaEstado = 'VAZIA' | 'PECAS' | 'AVANCADA' | 'INVALIDA';

export interface MontadorFormulaAnalise {
  readonly estado: MontadorFormulaEstado;
  /** Peças da fórmula — presentes só no estado `PECAS`. */
  readonly tokenizada: FormulaTokenizadaDto | null;
  /** Motivo do motor, no estado `INVALIDA`. */
  readonly erro?: string;
}

/**
 * Lê o texto da barra para o montador. A validade é a do motor com os atalhos da ficha expandidos (um `CORPO`
 * sem valor na ficha é inválido, como na barra); as peças vêm do texto **como escrito** (o atalho vira peça).
 */
export function analisarFormulaMontador(texto: string, atalhos: AtalhosDanoMontador): MontadorFormulaAnalise {
  if (!(texto ?? '').trim()) {
    return { estado: 'VAZIA', tokenizada: null };
  }
  const interpretacao = interpretarFormula(expandirAtalhosDano(texto, atalhos));
  if (!interpretacao.valida) {
    return { estado: 'INVALIDA', tokenizada: null, erro: interpretacao.erro };
  }
  const tokenizada = tokenizarFormula(texto);
  return tokenizada ? { estado: 'PECAS', tokenizada } : { estado: 'AVANCADA', tokenizada: null };
}

/** Atalhos que a ficha sabe expandir agora — o montador só oferece estes (sem valor, sem botão). */
export function listarAtalhosDisponiveis(atalhos: AtalhosDanoMontador): readonly ('CORPO' | 'FURTIVO')[] {
  return [...(atalhos.corpo ? ['CORPO' as const] : []), ...(atalhos.furtivo ? ['FURTIVO' as const] : [])];
}

// ── Pontos de partida ────────────────────────────────────────────────────────

/** Modo de edição: o teste de atributo tem controles próprios; dano de arma e dados livres editam termos. */
export type MontadorModo = 'TESTE' | 'DANO' | 'LIVRE';

/** Receita de partida ("Começar por" / "Modelos"): o texto inicial de cada modo. */
export interface ReceitaMontador {
  readonly modo: MontadorModo;
  readonly titulo: string;
  readonly descricao: string;
  readonly formula: string;
}

/** As três receitas, na ordem dos mockups E3.x. Dados livres começa em branco. */
export const RECEITAS_MONTADOR: readonly ReceitaMontador[] = [
  {
    modo: 'TESTE',
    titulo: 'Teste de atributo',
    descricao: 'Um ou dois atributos, dados a mais, crítico',
    formula: 'LUTd20kh1 + PROF',
  },
  { modo: 'DANO', titulo: 'Dano de arma', descricao: 'Já vem com 2d6 + Força [Físico]', formula: '2d6 + FOR [F]' },
  { modo: 'LIVRE', titulo: 'Dados livres', descricao: 'Começa em branco, tem todas as opções', formula: '' },
];

// ── Edição por peças ─────────────────────────────────────────────────────────

/** Fórmula sem nenhuma peça — ponto de partida de "Dados livres". */
export const FORMULA_VAZIA: FormulaTokenizadaDto = { pecas: [] };

/** Texto de uma fórmula em peças (ou `''` sem peças). */
export function escreverFormula(tokenizada: FormulaTokenizadaDto): string {
  return montarFormula(tokenizada);
}

/** Acrescenta uma peça no fim. */
export function adicionarPeca(tokenizada: FormulaTokenizadaDto, peca: PecaFormulaDto): FormulaTokenizadaDto {
  return { ...tokenizada, pecas: [...tokenizada.pecas, peca] };
}

/** Insere uma peça na posição dada (limitada ao intervalo da lista). */
export function inserirPeca(
  tokenizada: FormulaTokenizadaDto,
  peca: PecaFormulaDto,
  posicao: number,
): FormulaTokenizadaDto {
  const indice = Math.max(0, Math.min(posicao, tokenizada.pecas.length));
  return { ...tokenizada, pecas: [...tokenizada.pecas.slice(0, indice), peca, ...tokenizada.pecas.slice(indice)] };
}

/** Troca a peça da posição dada; posição inexistente devolve a fórmula como está. */
export function substituirPeca(
  tokenizada: FormulaTokenizadaDto,
  indice: number,
  peca: PecaFormulaDto,
): FormulaTokenizadaDto {
  if (indice < 0 || indice >= tokenizada.pecas.length) {
    return tokenizada;
  }
  return { ...tokenizada, pecas: tokenizada.pecas.map((atual, posicao) => (posicao === indice ? peca : atual)) };
}

/** Remove a peça da posição dada; sem peças, a repetição também sai (não há o que repetir). */
export function removerPeca(tokenizada: FormulaTokenizadaDto, indice: number): FormulaTokenizadaDto {
  const pecas = tokenizada.pecas.filter((_, posicao) => posicao !== indice);
  return pecas.length === 0 ? { pecas } : { ...tokenizada, pecas };
}

/** Liga (N ≥ 2) ou desliga (`null`, 1) a repetição `(…)#N` da fórmula inteira. */
export function alterarRepeticoes(tokenizada: FormulaTokenizadaDto, repeticoes: number | null): FormulaTokenizadaDto {
  const { pecas } = tokenizada;
  return repeticoes !== null && repeticoes >= 2 ? { pecas, repeticoes } : { pecas };
}

/** Inverte o sinal de uma peça (soma ↔ subtrai). */
export function alternarSinalPeca(peca: PecaFormulaDto): PecaFormulaDto {
  return { ...peca, sinal: peca.sinal === 1 ? -1 : 1 };
}

// ── Desfazer ─────────────────────────────────────────────────────────────────

/** Quantos passos o Desfazer guarda (os mais antigos saem). */
export const HISTORICO_MONTADOR_LIMITE = 50;

/** Pilha de textos anteriores da fórmula, do mais antigo ao mais recente. */
export type HistoricoMontador = readonly string[];

/**
 * Registra o texto **anterior** a uma edição do montador. Não empilha o mesmo texto duas vezes seguidas (uma
 * edição que não mudou nada não vira passo de desfazer).
 */
export function registrarPassoHistorico(historico: HistoricoMontador, textoAnterior: string): HistoricoMontador {
  if (historico[historico.length - 1] === textoAnterior) {
    return historico;
  }
  return [...historico, textoAnterior].slice(-HISTORICO_MONTADOR_LIMITE);
}

/** Desfaz um passo: devolve o texto a restaurar e a pilha sem ele, ou `null` quando não há o que desfazer. */
export function desfazerPassoHistorico(
  historico: HistoricoMontador,
): { readonly texto: string; readonly historico: HistoricoMontador } | null {
  if (historico.length === 0) {
    return null;
  }
  return { texto: historico[historico.length - 1], historico: historico.slice(0, -1) };
}
