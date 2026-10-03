import {
  expandirAtalhosDano,
  type FormulaInterpretadaDto,
  type FormulaTokenizadaDto,
  interpretarFormula,
  montarFormula,
  type PecaFormulaDto,
} from '@contratados-rpg/shared/regras/rolagem';

import type { MontadorModo } from './montador-modelo';
import {
  aplicarTipoPeca,
  type DadoExtra,
  FACES_MONTADOR,
  fonteDaSigla,
  lerDadoExtra,
  lerManterDado,
  lerTeste,
  lerTipoPeca,
  type ManterDado,
  MARGEM_CRITICO_MAXIMA,
  QUANTIDADE_DADOS_MONTADOR,
  siglaDaFonte,
  type TipoPecaMontador,
} from './montador-pecas';

/**
 * Versão **Blocos** do montador (`montador-exp-04`, E3.2): a fórmula como formulário de blocos de dano. Cada bloco
 * tem o próprio tipo (e segundo tipo), **uma contagem por dado** (com sinal: negativa subtrai), atributos com sinal,
 * bônus fixo e — nos dados livres — opções que valem para todos os dados do bloco. Os atalhos `CORPO`/`FURTIVO` vão
 * no **início** do texto (no fim, cada atalho carimbava o atributo anterior — achado da E3.2). Até 2 blocos no dano de
 * arma e 3 nos dados livres.
 *
 * Como nos outros editores, nada é reescrito em silêncio: `lerBlocos` só aceita a fórmula se o texto escrito a partir
 * dos blocos for **equivalente** ao original no motor (`formulasEquivalentes`); senão ela é "avançada".
 */

export const BLOCOS_MAXIMO_DANO = 2;
export const BLOCOS_MAXIMO_LIVRES = 3;

export interface FonteBloco {
  readonly sigla: string;
  readonly sinal: 1 | -1;
}

export interface BlocoMontador {
  readonly tipo: TipoPecaMontador;
  /** Contagem por face (`{ 6: 2, 4: -1 }` = `2d6 − 1d4`); ausente ou 0 = sem esse dado. */
  readonly dados: Readonly<Record<number, number>>;
  readonly fontes: readonly FonteBloco[];
  /** Soma dos números fixos, com sinal. */
  readonly bonus: number;
  readonly manter: ManterDado;
  readonly extra: DadoExtra;
  /** 0 = sem margem; 1…3. */
  readonly margem: number;
}

export interface FormulaBlocos {
  readonly blocos: readonly BlocoMontador[];
  readonly atalhos: readonly ('CORPO' | 'FURTIVO')[];
  readonly repeticoes: number;
}

export const BLOCO_VAZIO: BlocoMontador = {
  tipo: { primeiro: null, segundo: null },
  dados: {},
  fontes: [],
  bonus: 0,
  manter: 'TODOS',
  extra: 'NENHUM',
  margem: 0,
};

function chaveTipo(tipo: TipoPecaMontador): string {
  return `${tipo.primeiro ?? ''}|${tipo.segundo ?? ''}`;
}

/** Lê as peças como blocos (sem verificar equivalência) ou `null` quando alguma peça não cabe num bloco. */
function lerBlocosBrutos(tokenizada: FormulaTokenizadaDto): FormulaBlocos | null {
  const atalhos: ('CORPO' | 'FURTIVO')[] = [];
  const grupos: { tipo: TipoPecaMontador; pecas: PecaFormulaDto[] }[] = [];
  for (const peca of tokenizada.pecas) {
    if (peca.tipo === 'ATALHO') {
      if (peca.sinal !== 1 || atalhos.includes(peca.atalho)) return null;
      atalhos.push(peca.atalho);
      continue;
    }
    const tipo = lerTipoPeca(peca);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && chaveTipo(ultimo.tipo) === chaveTipo(tipo)) ultimo.pecas.push(peca);
    else grupos.push({ tipo, pecas: [peca] });
  }

  const blocos: BlocoMontador[] = [];
  for (const grupo of grupos) {
    const dados: Record<number, number> = {};
    const fontes: FonteBloco[] = [];
    let bonus = 0;
    let opcoes: { manter: ManterDado; extra: DadoExtra; margem: number } | null = null;
    for (const peca of grupo.pecas) {
      if (peca.tipo === 'DADO') {
        if (peca.quantidade.tipo !== 'NUMERO' || !FACES_MONTADOR.includes(peca.faces)) return null;
        if (peca.manterMaior !== undefined && peca.manterMaior !== 1) return null;
        if (peca.manterMenor !== undefined && peca.manterMenor !== 1) return null;
        if (peca.explosao !== undefined && peca.explosao !== peca.faces) return null;
        if (peca.implosao !== undefined && peca.implosao !== 1) return null;
        if ((peca.margemCritico ?? 0) > MARGEM_CRITICO_MAXIMA) return null;
        const desta = { manter: lerManterDado(peca), extra: lerDadoExtra(peca), margem: peca.margemCritico ?? 0 };
        if (opcoes && JSON.stringify(opcoes) !== JSON.stringify(desta)) return null;
        opcoes = desta;
        const atual = dados[peca.faces] ?? 0;
        const contagem = peca.sinal * peca.quantidade.valor;
        // Uma contagem por dado: o mesmo dado duas vezes só soma com o mesmo sinal (2d4 + 2d4 = 4d4).
        if (atual !== 0 && Math.sign(atual) !== Math.sign(contagem)) return null;
        if (Math.abs(atual + contagem) > QUANTIDADE_DADOS_MONTADOR) return null;
        dados[peca.faces] = atual + contagem;
      } else if (peca.tipo === 'FONTE') {
        if (peca.multiplicador || peca.divisor) return null;
        fontes.push({ sigla: siglaDaFonte(peca.fonte), sinal: peca.sinal });
      } else if (peca.tipo === 'NUMERO') {
        bonus += peca.sinal * peca.valor;
      } else {
        return null;
      }
    }
    blocos.push({
      tipo: grupo.tipo,
      dados,
      fontes,
      bonus,
      manter: opcoes?.manter ?? 'TODOS',
      extra: opcoes?.extra ?? 'NENHUM',
      margem: opcoes?.margem ?? 0,
    });
  }
  if (blocos.length > BLOCOS_MAXIMO_LIVRES) return null;
  return { blocos, atalhos, repeticoes: tokenizada.repeticoes ?? 1 };
}

/** Peças a partir dos blocos: atalhos primeiro; em cada bloco, dados por face crescente, atributos, bônus. */
export function escreverBlocos(formula: FormulaBlocos): FormulaTokenizadaDto {
  const pecas: PecaFormulaDto[] = formula.atalhos.map((atalho) => ({ tipo: 'ATALHO', sinal: 1, atalho }));
  for (const bloco of formula.blocos) {
    const doBloco: PecaFormulaDto[] = [];
    for (const faces of FACES_MONTADOR) {
      const contagem = bloco.dados[faces] ?? 0;
      if (contagem === 0) continue;
      doBloco.push({
        tipo: 'DADO',
        sinal: contagem < 0 ? -1 : 1,
        quantidade: { tipo: 'NUMERO', valor: Math.abs(contagem) },
        faces,
        ...(bloco.manter === 'MAIOR' ? { manterMaior: 1 } : bloco.manter === 'MENOR' ? { manterMenor: 1 } : {}),
        ...(bloco.margem > 0 ? { margemCritico: bloco.margem } : {}),
        ...(bloco.extra === 'EXPLODE' ? { explosao: faces } : bloco.extra === 'IMPLODE' ? { implosao: 1 } : {}),
      });
    }
    for (const fonte of bloco.fontes) {
      doBloco.push({ tipo: 'FONTE', sinal: fonte.sinal, fonte: fonteDaSigla(fonte.sigla), nome: fonte.sigla });
    }
    if (bloco.bonus !== 0) {
      doBloco.push({ tipo: 'NUMERO', sinal: bloco.bonus < 0 ? -1 : 1, valor: Math.abs(bloco.bonus) });
    }
    pecas.push(...doBloco.map((peca) => aplicarTipoPeca(peca, bloco.tipo)));
  }
  return formula.repeticoes >= 2 ? { pecas, repeticoes: formula.repeticoes } : { pecas };
}

// ── Equivalência no motor ────────────────────────────────────────────────────

const ATALHOS_VERIFICACAO = [
  { corpo: '2D6 [Físico]', furtivo: '2D6+2' },
  { corpo: '4D6+7 [Físico]', furtivo: '1D6+1' },
] as const;

/**
 * Forma normal de uma fórmula interpretada para comparar **valor**: soma é comutativa, então a ordem dos termos não
 * importa; dados iguais sem opções (mesma face, sinal e tipo) somam a quantidade (`2d4 + 2d4` = `4d4`); constantes
 * tipadas somam por tipo. Rótulos de exibição ficam de fora. Duas fórmulas com a mesma forma normal têm a mesma
 * distribuição de resultados.
 */
function formaNormal(formula: FormulaInterpretadaDto): string {
  const tipoDe = (termo: { tipoDano?: string; composto?: readonly string[] }) =>
    termo.composto ? termo.composto.join('-') : (termo.tipoDano ?? '');
  const dadosSimples = new Map<string, number>();
  const outrosDados: string[] = [];
  for (const termo of formula.dados) {
    const temOpcao =
      termo.manterMaior !== undefined ||
      termo.manterMenor !== undefined ||
      termo.explosao !== undefined ||
      termo.implosao !== undefined ||
      termo.margemCritico !== undefined ||
      termo.quantidadeAtributo !== undefined ||
      termo.quantidadeConta !== undefined;
    if (temOpcao) {
      const { sinal, faces, quantidade } = termo;
      outrosDados.push(JSON.stringify({ ...termo, sinal, faces, quantidade, tipo: tipoDe(termo), tipoDano: undefined, composto: undefined }));
    } else {
      const chave = `${termo.sinal}|${termo.faces}|${tipoDe(termo)}`;
      dadosSimples.set(chave, (dadosSimples.get(chave) ?? 0) + termo.quantidade);
    }
  }
  const atributos = formula.atributos.map((termo) =>
    JSON.stringify([termo.sinal, termo.atributo, termo.multiplicador ?? 1, termo.divisor ?? 1, tipoDe(termo)]),
  );
  const constantes = new Map<string, number>();
  for (const termo of formula.constantesTipadas ?? []) {
    constantes.set(tipoDe(termo), (constantes.get(tipoDe(termo)) ?? 0) + termo.sinal * termo.valor);
  }
  const contas = (formula.contas ?? []).map((termo) => JSON.stringify([termo.sinal, termo.conta, tipoDe(termo)]));
  return JSON.stringify({
    dados: [...dadosSimples.entries()].filter(([, quantidade]) => quantidade !== 0).sort(),
    outrosDados: outrosDados.sort(),
    atributos: atributos.sort(),
    constantes: [...constantes.entries()].filter(([, valor]) => valor !== 0).sort(),
    constante: formula.constante,
    contas: contas.sort(),
    repeticoes: formula.repeticoes ?? 1,
  });
}

/** Se os dois textos valem o mesmo no motor (com expansões representativas dos atalhos). */
export function formulasEquivalentes(textoA: string, textoB: string): boolean {
  return ATALHOS_VERIFICACAO.every((atalhos) => {
    const a = interpretarFormula(expandirAtalhosDano(textoA, atalhos));
    const b = interpretarFormula(expandirAtalhosDano(textoB, atalhos));
    if (!a.valida || !b.valida || !a.formula || !b.formula) return a.valida === b.valida && !a.valida;
    return formaNormal(a.formula) === formaNormal(b.formula);
  });
}

/**
 * Blocos da fórmula, ou `null` quando a versão Blocos não a monta: peça fora dos blocos (conta, atributo escalado,
 * dado por atributo, opção fora dos controles), o mesmo dado com sinais ou opções diferentes no bloco, mais de 3
 * blocos — ou um texto escrito pelos blocos que o motor não leria com o mesmo valor.
 */
export function lerBlocos(tokenizada: FormulaTokenizadaDto): FormulaBlocos | null {
  const blocos = lerBlocosBrutos(tokenizada);
  if (!blocos) return null;
  return formulasEquivalentes(montarFormula(escreverBlocos(blocos)), montarFormula(tokenizada)) ? blocos : null;
}

/** Se a versão Blocos monta a fórmula: como teste de atributo ou como blocos. */
export function podeMontarBlocosOuTeste(tokenizada: FormulaTokenizadaDto): boolean {
  return lerTeste(tokenizada) !== null || lerBlocos(tokenizada) !== null;
}

/** Dano de arma comporta a fórmula: até 2 blocos e sem opções de bloco (que são dos dados livres). */
export function cabeNoDano(formula: FormulaBlocos): boolean {
  return (
    formula.blocos.length <= BLOCOS_MAXIMO_DANO &&
    formula.blocos.every((bloco) => bloco.manter === 'TODOS' && bloco.extra === 'NENHUM' && bloco.margem === 0)
  );
}

/** Modo efetivo da versão Blocos para a fórmula: o escolhido quando ela cabe nele, senão dados livres. */
export function modoDosBlocos(formula: FormulaBlocos, modo: MontadorModo | null): 'DANO' | 'LIVRE' {
  return modo === 'DANO' && cabeNoDano(formula) ? 'DANO' : 'LIVRE';
}
