import { FragmentoModuloEnum, FragmentoTipoEnum, ModificacaoEfeitoTipoEnum } from '../../enums';
import { BONUS_POTENCIALIZADOR, CUSTO_ENERGIA_MAXIMA_MODULO } from './fragmento.dados';
import { ModificacaoEfeitoDto } from './compras.dtos';

/**
 * Custos de Energia dos Fragmentos (m3-35) — funções puras conferidas contra
 * `docs/core/sistema-v4.1.0.md` — "⬡ Fragmentos". Só o núcleo desta task: adquirir (portar),
 * acoplar e remover (ver `fragmento.dados.ts` para o que fica de fora).
 */

/**
 * Custo em Energia Máxima de **adquirir** um fragmento — o dobro para Construtor (doc — "⬦
 * Construtor").
 */
export function custoAquisicaoFragmento(tipo: FragmentoTipoEnum, modulo: FragmentoModuloEnum): number {
  const base = CUSTO_ENERGIA_MAXIMA_MODULO[modulo];
  return tipo === FragmentoTipoEnum.CONSTRUTOR ? base * 2 : base;
}

/** Débito de Energia atual **e** Energia Máxima ao **acoplar** um Potencializador a um item/ser. */
export interface CustoAcoplarFragmentoDto {
  readonly energia: number;
  readonly energiaMaxima: number;
}

/**
 * Custo de **acoplar** um fragmento Potencializador (doc — "⬥ Acoplamento": "acoplar um fragmento
 * de módulo IV em um item custa 7 de Energia + 7 de Energia Máxima"). Só Potencializador acopla —
 * Construtor **é** a peça, não se prende a outra.
 */
export function custoAcoplarFragmento(modulo: FragmentoModuloEnum): CustoAcoplarFragmentoDto {
  const custo = CUSTO_ENERGIA_MAXIMA_MODULO[modulo];
  return { energia: custo, energiaMaxima: custo };
}

/** Custo de **remover** (desacoplar) um fragmento aplicado: Energia × 2 (doc — "⬥ Acoplamento"). */
export function custoRemoverFragmento(modulo: FragmentoModuloEnum): number {
  return CUSTO_ENERGIA_MAXIMA_MODULO[modulo] * 2;
}

/** Uma opção selecionável do cardápio de bônus "em um item" do Potencializador. */
export interface OpcaoBonusFragmentoDto {
  readonly rotulo: string;
  readonly efeito: ModificacaoEfeitoDto;
}

/**
 * Cardápio de bônus "em um item" de um fragmento Potencializador de `modulo` — o jogador escolhe
 * UMA opção ao aplicar (doc — "⬦ Potencializador", tabela). Mapeado aos `ModificacaoEfeitoTipoEnum`
 * já existentes (`DANO_DADOS_BASE`/`BONUS_TESTE`/`DANO_FIXO`/`RESISTENCIA`) — zero motor novo em
 * `calcularStatItem`, que já soma esses tipos vindos de qualquer modificação custom.
 */
export function listarBonusFragmentoPotencializador(
  modulo: FragmentoModuloEnum,
): readonly OpcaoBonusFragmentoDto[] {
  const valores = BONUS_POTENCIALIZADOR[modulo];
  return [
    {
      rotulo: `+${valores.dadosBase} dados no dado base (dano)`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: valores.dadosBase },
    },
    {
      rotulo: `+${valores.dadoTeste} dado(s) no teste`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: valores.dadoTeste, variante: 'DADO' },
    },
    {
      rotulo: `+${valores.valorFixo} no teste`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: valores.valorFixo, variante: 'FIXO' },
    },
    {
      rotulo: `+${valores.valorFixo} de dano (efeito)`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: valores.valorFixo },
    },
    {
      rotulo: `+${valores.valorFixo} de resistência`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: valores.valorFixo },
    },
  ];
}
