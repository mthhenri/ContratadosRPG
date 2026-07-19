import type { FichaDerivadosDto, FichaFormacaoDto } from '../../dtos/ficha';
import type { FormacaoBonusEnum } from '../../enums';
import { incrementarDadosDanoFurtivo, somarDanoFixo } from '../agente/dano';
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
 * Devolve, estruturadas, as linhas de `formacoes` cujo efeito ainda **não tem campo onde aterrissar**
 * (`ROLAGEM`/`RESISTENCIA`/`SOBRECARGA`/`INICIATIVA`/`DT_REPARO`) — útil para auditar a cobertura da
 * tabela. Chamada com `FORMACOES` inteira devolve as 16 pendentes (m3-23).
 */
export function listarEfeitosPendentes(
  formacoes: Readonly<Record<FormacaoBonusEnum, FormacaoDefinicaoDto>>,
): readonly FormacaoDefinicaoDto[] {
  return Object.values(formacoes).filter((definicao) => !ALVOS_APLICAVEIS.has(definicao.efeito.alvo));
}
