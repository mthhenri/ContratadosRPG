import type { FichaDerivadosDto, FichaFormacaoDto } from '../../dtos/ficha';
import type { FormacaoBonusEnum } from '../../enums';
import { incrementarDanoFurtivo, somarDanoFixo } from '../agente/dano';
import { FORMACOES } from './formacoes.dados';
import type { EfeitoFormacao, FormacaoDefinicaoDto } from './identidade.dtos';

const ALVOS_APLICAVEIS = new Set(['DERIVADO', 'DERIVADO_ESCOLHA', 'DANO_CORPO', 'DANO_FURTIVO_DADO']);

/**
 * Aplica o `efeito` de uma linha de Formação a um `FichaDerivadosDto`. Só os quatro alvos com campo
 * hoje (`DERIVADO`/`DERIVADO_ESCOLHA`/`DANO_CORPO`/`DANO_FURTIVO_DADO`) mudam algo; os demais
 * (`ROLAGEM`/`RESISTENCIA`/`SOBRECARGA`/`INICIATIVA`/`DT_REPARO`) são ignorados sem quebrar — ainda
 * sem campo onde aterrissar (m3-23).
 */
function aplicarEfeitoUnico(
  derivados: FichaDerivadosDto,
  efeito: EfeitoFormacao,
  parametro: string | null,
): FichaDerivadosDto {
  switch (efeito.alvo) {
    case 'DERIVADO':
      return { ...derivados, [efeito.campo]: (derivados[efeito.campo] ?? 0) + efeito.valor };
    case 'DERIVADO_ESCOLHA': {
      const escolha = efeito.campos.find((campo) => campo.toLowerCase() === (parametro ?? '').toLowerCase());
      return escolha ? { ...derivados, [escolha]: (derivados[escolha] ?? 0) + efeito.valor } : derivados;
    }
    case 'DANO_CORPO':
      return derivados.danoCorpoACorpo
        ? { ...derivados, danoCorpoACorpo: somarDanoFixo(derivados.danoCorpoACorpo, efeito.valor) }
        : derivados;
    case 'DANO_FURTIVO_DADO':
      return derivados.danoFurtivo
        ? { ...derivados, danoFurtivo: incrementarDanoFurtivo(derivados.danoFurtivo, 1) }
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
): FichaDerivadosDto {
  return formacoes.reduce((acumulado, formacao) => {
    if (!formacao.bonus) {
      return acumulado;
    }
    return aplicarEfeitoUnico(acumulado, FORMACOES[formacao.bonus].efeito, formacao.parametro);
  }, derivados);
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
