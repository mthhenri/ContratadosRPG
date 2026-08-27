import type {
  FichaAtributosDto,
  FichaDerivadosDto,
  FichaEstadoDto,
  FichaHabilidadeDto,
} from '../../dtos/ficha';
import type { ClasseEnum } from '../../enums';
import type { AmplificadorAplicadoDto, CarrinhoItemDto } from '../compras';
import {
  ajusteBloqueioAmplificadores,
  ajusteDefesaAmplificadores,
  ajusteEnergiaAmplificadores,
  ajusteEsquivaAmplificadores,
  ajusteVidaAmplificadores,
} from './amplificador';
import { calcularBonusDefesaEquipamento, calcularContraAtaque, calcularDefesa } from './defesa';
import { calcularEnergia, calcularVida } from './saude';

/** Entrada para compor os stats efetivos de uma ficha de agente na leitura. */
export interface StatsEfetivosCalcularDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
  readonly atributos: Pick<FichaAtributosDto, 'vigor' | 'destreza' | 'luta'>;
  readonly habilidades: readonly FichaHabilidadeDto[];
  /** Snapshot editável persistido em `dados.derivados` (m3-10). */
  readonly derivados?: Pick<FichaDerivadosDto, 'defesa' | 'esquiva' | 'bloqueio' | 'contraAtaque'>;
  /** Snapshot editável persistido em `dados.estado` (m3-10). */
  readonly estado: Pick<FichaEstadoDto, 'vidaMaxima' | 'energiaMaxima'>;
  readonly itens?: readonly CarrinhoItemDto[];
  readonly amplificadores?: readonly AmplificadorAplicadoDto[];
}

/** Stats que a ficha exibe após os bônus transitórios de porte/equipamento. */
export interface StatsEfetivosDto {
  readonly vidaMaxima: number;
  readonly energiaMaxima: number;
  readonly defesa: number | null;
  readonly esquiva: number | null;
  readonly bloqueio: number | null;
  readonly contraAtaque: number | null;
}

/**
 * Compõe o valor **efetivo** da ficha: o snapshot stored/editável vence a fórmula calculada e os
 * bônus de amplificador e equipamento entram só na leitura. Defesa Final cascateia para Esquiva,
 * Bloqueio e Contra-Ataque, como definido em `sistema-v4.1.0.md` — "Defesa".
 *
 * Nenhum ajuste é persistido aqui: isso evita gravar um delta transitório como override manual e
 * reaplicá-lo numa leitura futura. Frontend, resumo de ficha e encontro usam esta mesma composição.
 */
export function calcularStatsEfetivos(dto: StatsEfetivosCalcularDto): StatsEfetivosDto {
  const amplificadores = dto.amplificadores ?? [];
  const itens = dto.itens ?? [];
  const habilidades = dto.habilidades ?? [];
  const defesaCalculada = calcularDefesa({
    classe: dto.classe,
    nivel: dto.nivel,
    destreza: dto.atributos.destreza,
    vigor: dto.atributos.vigor,
  });
  const contraAtaqueCalculado = calcularContraAtaque({
    luta: dto.atributos.luta,
    vigor: dto.atributos.vigor,
    defesa: defesaCalculada?.defesa ?? null,
    habilidades,
  });
  const bonusEquipamento = calcularBonusDefesaEquipamento(itens);
  const bonusDefesa = ajusteDefesaAmplificadores(amplificadores) + bonusEquipamento.defesa;
  const defesaBase = dto.derivados?.defesa ?? defesaCalculada?.defesa ?? null;
  const esquivaBase = dto.derivados?.esquiva ?? defesaCalculada?.esquiva ?? null;
  const bloqueioBase = dto.derivados?.bloqueio ?? defesaCalculada?.bloqueio ?? null;
  const contraAtaqueBase = dto.derivados?.contraAtaque ?? contraAtaqueCalculado ?? null;
  const vidaBase =
    dto.estado.vidaMaxima ??
    calcularVida({
      classe: dto.classe,
      nivel: dto.nivel,
      vigor: dto.atributos.vigor,
      habilidades,
    });
  const energiaBase =
    dto.estado.energiaMaxima ??
    calcularEnergia({ classe: dto.classe, nivel: dto.nivel, destreza: dto.atributos.destreza });

  return {
    vidaMaxima: vidaBase + ajusteVidaAmplificadores(amplificadores, dto.nivel),
    energiaMaxima: energiaBase + ajusteEnergiaAmplificadores(amplificadores, dto.nivel),
    defesa: defesaBase === null ? null : defesaBase + bonusDefesa,
    esquiva:
      esquivaBase === null
        ? null
        : esquivaBase + bonusDefesa + ajusteEsquivaAmplificadores(amplificadores) + bonusEquipamento.esquiva,
    bloqueio:
      bloqueioBase === null
        ? null
        : bloqueioBase + bonusDefesa + ajusteBloqueioAmplificadores(amplificadores) + bonusEquipamento.bloqueio,
    contraAtaque: contraAtaqueBase === null ? null : contraAtaqueBase + bonusDefesa,
  };
}
