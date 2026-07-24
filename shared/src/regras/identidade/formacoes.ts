import type { FichaAtributosDto, FichaDerivadosDto, FichaFormacaoDto } from '../../dtos/ficha';
import { FormacaoBonusEnum, TipoDanoEnum } from '../../enums';
import { incrementarDadosDanoFurtivo, somarDanoFixo } from '../agente/dano';
import { ABREVIACOES_ATRIBUTO, resolverTipoDanoSimples } from '../rolagem';
import { FORMACOES } from './formacoes.dados';
import type { EfeitoFormacao, FormacaoDefinicaoDto } from './identidade.dtos';

/** Alvos de `EfeitoFormacao` com campo hoje em `FichaDerivadosDto` — espelha os `case`s de `aplicarEfeitoUnico`. Exportado para o teste não manter uma cópia própria (drift). */
export const ALVOS_APLICAVEIS = new Set(['DERIVADO', 'DERIVADO_ESCOLHA', 'DANO_CORPO', 'DANO_FURTIVO_DADO']);

/**
 * Aplica o `efeito` de uma linha de Formação a um `FichaDerivadosDto`, multiplicado por `sinal`
 * (`1` aplica, `-1` desfaz — ver `removerFormacaoDosDerivados`). Só os quatro alvos com campo hoje
 * (`DERIVADO`/`DERIVADO_ESCOLHA`/`DANO_CORPO`/`DANO_FURTIVO_DADO`) mudam algo; os demais
 * (`ROLAGEM`/`RESISTENCIA`/`SOBRECARGA`/`INICIATIVA`/`DT_REPARO`) são ignorados sem quebrar — ainda
 * sem campo onde aterrissar (m3-23).
 */
function aplicarEfeitoUnico(
  derivados: FichaDerivadosDto,
  efeito: EfeitoFormacao,
  parametro: string | null,
  sinal: 1 | -1,
): FichaDerivadosDto {
  switch (efeito.alvo) {
    case 'DERIVADO': {
      // `!== undefined`, não `??`: um derivado ausente (undefined) é "a classe não possui essa
      // stat" — tratar como 0 fabricaria uma stat que a classe não tem. Ver DERIVADO_ESCOLHA.
      const atual = derivados[efeito.campo];
      return atual !== undefined
        ? { ...derivados, [efeito.campo]: atual + sinal * efeito.valor }
        : derivados;
    }
    case 'DERIVADO_ESCOLHA': {
      const escolha = efeito.campos.find((campo) => campo.toLowerCase() === (parametro ?? '').toLowerCase());
      const atual = escolha ? derivados[escolha] : undefined;
      // Civil não possui esquiva/bloqueio (`calcularDefesa` retorna `null` → campos `undefined` em
      // `FichaDerivadosDto`, doc do próprio DTO): `!== undefined` evita fabricar a stat com `?? 0`.
      return escolha && atual !== undefined
        ? { ...derivados, [escolha]: atual + sinal * efeito.valor }
        : derivados;
    }
    case 'DANO_CORPO':
      return derivados.danoCorpoACorpo
        ? { ...derivados, danoCorpoACorpo: somarDanoFixo(derivados.danoCorpoACorpo, sinal * efeito.valor) }
        : derivados;
    case 'DANO_FURTIVO_DADO':
      // Bônus de Formação concede só DADO (sistema-v4.1.0.md "⬦ Formação") — incrementarDadosDanoFurtivo,
      // não incrementarDanoFurtivo (que soma dado E fixo, contrato de marco de progressão/Letalidade).
      return derivados.danoFurtivo
        ? {
            ...derivados,
            danoFurtivo: incrementarDadosDanoFurtivo(derivados.danoFurtivo, sinal * efeito.valor),
          }
        : derivados;
    default:
      return derivados;
  }
}

/**
 * Aplica os bônus de Formação de uma Origem a um `FichaDerivadosDto` (m3-23). **Delta único**, no
 * momento em que a Origem é definida (mesmo padrão de `obterBonusAtributos`, m3-10): `derivados` deve
 * ser a base **sem** os efeitos desta Formação já somados — quem troca de Origem re-deriva a partir
 * dessa base com a Formação nova (não soma incrementalmente sobre o resultado anterior), espelhando
 * `ajustarClasse`. Ignora silenciosamente `bonus: null` (bônus custom autorizado pelo Mestre — sem
 * definição em `FORMACOES`) e os 16 alvos ainda sem campo, sem quebrar.
 */
export function aplicarFormacaoAosDerivados(
  derivados: FichaDerivadosDto,
  formacoes: readonly FichaFormacaoDto[],
  sinal: 1 | -1 = 1,
): FichaDerivadosDto {
  return formacoes.reduce((acumulado, formacao) => {
    if (!formacao.bonus) {
      return acumulado;
    }
    // Sem validação/trava ainda (m3-24): um código persistido que não exista mais em `FORMACOES`
    // (ficha legada, enum renomeado) é ignorado como `bonus: null`, não derruba o cálculo.
    const definicao = FORMACOES[formacao.bonus] as FormacaoDefinicaoDto | undefined;
    if (!definicao) {
      return acumulado;
    }
    return aplicarEfeitoUnico(acumulado, definicao.efeito, formacao.parametro, sinal);
  }, derivados);
}

/**
 * Desfaz os bônus de Formação de uma Origem sobre um `FichaDerivadosDto` (m3-25) — `sinal: -1` de
 * `aplicarFormacaoAosDerivados`, reusando a mesma tabela/switch (proibições #26/#27). Usada pela
 * ficha ao **trocar** a Origem (só o mestre, m3-24): remove o delta da Origem anterior antes de
 * aplicar o da nova, campo a campo, preservando qualquer ajuste manual fora dos campos que a
 * Formação toca (mesmo espírito de `aplicarDeltaBonus`/`ajustarClasse`, m3-10).
 */
export function removerFormacaoDosDerivados(
  derivados: FichaDerivadosDto,
  formacoes: readonly FichaFormacaoDto[],
): FichaDerivadosDto {
  return aplicarFormacaoAosDerivados(derivados, formacoes, -1);
}

/**
 * Códigos de Formação com consumidor **fora** do bloco `derivados` (m3-41): não passam por
 * `aplicarFormacaoAosDerivados`/`aplicarEfeitoUnico` — cada um tem sua própria função abaixo,
 * chamada direto de onde o valor é exibido/rolado (resistência da aba Combate, limiar de
 * "Sobrecarregado" do Inventário, teste de atributo da Visão Geral). As demais linhas de `ROLAGEM`
 * (categoria de arma/condição) e `INICIATIVA`/`DT_REPARO`/`DURACAO_EFEITO` continuam pendentes — não
 * há tela/motor de categoria de arma, iniciativa, reparo ou duração de efeito na ficha ainda.
 */
const CODIGOS_APLICAVEIS_FORA_DERIVADOS = new Set<FormacaoBonusEnum>([
  FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO,
  FormacaoBonusEnum.LOGISTICA_SOBRECARGA,
  FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO,
  FormacaoBonusEnum.PERICIA_BONUS_ATRIBUTO,
]);

/**
 * Devolve, estruturadas, as linhas de `formacoes` cujo efeito ainda **não tem consumidor algum**
 * (nem no bloco `derivados`, nem nas funções dedicadas de m3-41) — útil para auditar a cobertura da
 * tabela. Chamada com `FORMACOES` inteira devolve as 12 pendentes.
 */
export function listarEfeitosPendentes(
  formacoes: Readonly<Record<FormacaoBonusEnum, FormacaoDefinicaoDto>>,
): readonly FormacaoDefinicaoDto[] {
  return Object.values(formacoes).filter(
    (definicao) =>
      !ALVOS_APLICAVEIS.has(definicao.efeito.alvo) && !CODIGOS_APLICAVEIS_FORA_DERIVADOS.has(definicao.codigo),
  );
}

/** Remove acentos e caixa — casamento tolerante do `parametro` livre digitado pelo jogador. */
function normalizarParametro(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase();
}

/** Nome por extenso (com acento) de cada atributo — o que o jogador tipicamente digita no campo livre. */
const NOMES_ATRIBUTO: Readonly<Record<keyof FichaAtributosDto, string>> = {
  destreza: 'Destreza',
  forca: 'Força',
  luta: 'Luta',
  pontaria: 'Pontaria',
  vigor: 'Vigor',
  intelecto: 'Intelecto',
  medicina: 'Medicina',
  sentidos: 'Sentidos',
  social: 'Social',
  vontade: 'Vontade',
};

/** `parametro` livre (nome por extenso ou abreviação de 3 letras, tolerante a caixa/acento) → chave do atributo. */
const MAPA_ATRIBUTO_LIVRE: Readonly<Record<string, keyof FichaAtributosDto>> = {
  ...Object.fromEntries(Object.entries(ABREVIACOES_ATRIBUTO).map(([abreviacao, chave]) => [abreviacao, chave])),
  ...Object.fromEntries(
    Object.entries(NOMES_ATRIBUTO).map(([chave, nome]) => [normalizarParametro(nome), chave as keyof FichaAtributosDto]),
  ),
};

/** Resolve o `parametro` de uma linha `FormacaoParametroEnum.ATRIBUTO` na chave do atributo, ou `null`. */
function resolverAtributoParametro(parametro: string | null): keyof FichaAtributosDto | null {
  if (!parametro) {
    return null;
  }
  return MAPA_ATRIBUTO_LIVRE[normalizarParametro(parametro)] ?? null;
}

/**
 * Soma o bônus de Formação **Resistência a um tipo de dano** (`COMBATE_RESISTENCIA_TIPO_DANO`, m3-41)
 * por `TipoDanoEnum` — consumido por `montarResistencias` (`shared/regras/agente/resistencia`) como
 * mais uma origem de resistência, ao lado de equipamento/amplificadores. `parametro` é o tipo de dano
 * livre digitado na Origem ("Físico", "Balístico"...); linhas com tipo não reconhecível são ignoradas
 * sem quebrar (mesmo espírito de `aplicarFormacaoAosDerivados`).
 */
export function obterResistenciaFormacao(
  formacoes: readonly FichaFormacaoDto[],
): Partial<Record<TipoDanoEnum, number>> {
  const totais: Partial<Record<TipoDanoEnum, number>> = {};
  formacoes.forEach((formacao) => {
    if (formacao.bonus !== FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO) {
      return;
    }
    const tipo = resolverTipoDanoSimples(formacao.parametro ?? '');
    if (!tipo) {
      return;
    }
    const valor = FORMACOES[formacao.bonus].efeito.valor;
    totais[tipo] = (totais[tipo] ?? 0) + valor;
  });
  return totais;
}

/**
 * Soma a tolerância extra de Sobrecarga (`LOGISTICA_SOBRECARGA`, m3-41: "+3 de tolerância de
 * Sobrecarga") — consumida no Inventário como um deslocamento do limiar de "Sobrecarregado"
 * (`pesoUsado > inventarioEfetivo + tolerância`), **sem** alterar o Inventário efetivo em si (esse é
 * o alvo `DERIVADO`/`LOGISTICA_INVENTARIO_MAXIMO`, já aplicado por `aplicarFormacaoAosDerivados`).
 */
export function obterToleranciaSobrecargaFormacao(formacoes: readonly FichaFormacaoDto[]): number {
  return formacoes.reduce((total, formacao) => {
    if (formacao.bonus !== FormacaoBonusEnum.LOGISTICA_SOBRECARGA) {
      return total;
    }
    return total + FORMACOES[formacao.bonus].efeito.valor;
  }, 0);
}

/** Bônus de Formação num teste de um atributo específico — dados extras no pool e/ou bônus plano no resultado. */
export interface BonusRolagemAtributoFormacaoDto {
  readonly dados: number;
  readonly bonus: number;
}

/**
 * Bônus de Formação num teste do atributo `chave` (m3-41): `PERICIA_DADO_ATRIBUTO` ("+1 dado em
 * testes de um atributo específico") e `PERICIA_BONUS_ATRIBUTO` ("+1 em testes de um atributo
 * específico"). Consumido por `rolarTesteAtributo` (Visão Geral) — `dados` soma ao pool do teste
 * antes de rolar, `bonus` soma ao resultado, junto do modificador manual/amplificador já existente.
 * A linha com condição (`PERICIA_DADO_ATRIBUTO_CONDICAO`) fica de fora — a ficha não modela em que
 * situação um teste está acontecendo, só o atributo.
 */
export function obterBonusRolagemAtributoFormacao(
  formacoes: readonly FichaFormacaoDto[],
  chave: keyof FichaAtributosDto,
): BonusRolagemAtributoFormacaoDto {
  return formacoes.reduce<BonusRolagemAtributoFormacaoDto>(
    (total, formacao) => {
      const eDado = formacao.bonus === FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO;
      const eBonus = formacao.bonus === FormacaoBonusEnum.PERICIA_BONUS_ATRIBUTO;
      if (!eDado && !eBonus) {
        return total;
      }
      if (resolverAtributoParametro(formacao.parametro) !== chave) {
        return total;
      }
      const valor = FORMACOES[formacao.bonus as FormacaoBonusEnum].efeito.valor;
      return eDado ? { ...total, dados: total.dados + valor } : { ...total, bonus: total.bonus + valor };
    },
    { dados: 0, bonus: 0 },
  );
}
