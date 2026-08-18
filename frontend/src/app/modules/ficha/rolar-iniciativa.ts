import type { FichaAtributosDto, FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  ajusteDadoIniciativaAmplificadores,
  calcularAjusteDadosEquipamento,
  calcularAtributosParaDados,
  calcularProficiencia,
} from '@contratados-rpg/shared/regras/agente';
import { obterDadoExtraIniciativaFormacao } from '@contratados-rpg/shared/regras/identidade';

import { executarPassoPreset, NOME_PRESET_INICIATIVA, type PassoExecutadoDto } from './executar-rolagem';

/**
 * Rolagem de **Iniciativa de um agente** a partir do documento da ficha (m7-06) — extraída de
 * `FichaVisualizacao.rolarIniciativa` porque a tela "Iniciativa" precisa exatamente da mesma coisa
 * fora da ficha: o jogador rola a própria iniciativa lá, e teria de recompor a mesma pilha
 * (`atributosParaDados` + Proficiência + dado extra de `Atento`/Formação) para chegar ao mesmo
 * número. Duas composições paralelas divergiriam no primeiro ajuste de regra — daí a extração.
 *
 * Continua **sem motor próprio**: tudo aqui é composição de `shared/regras` com
 * `executarPassoPreset`. O bônus de Iniciativa do agente não é um número somado ao final — são
 * **dados extras** no pool de Destreza —, e é por isso que ele só se resolve do documento inteiro
 * (o `Rolar tudo` do mestre, que só tem o resumo do combatente, é fallback).
 */

/**
 * Atributos do agente **contados como dados de rolagem**: efetivos (lesão) + ajuste manual
 * (`dadosTeste`) + ajuste de equipamento (hoje só a Armadura Pesada, −1 dado em Destreza). Mesma
 * receita de `FichaVisualizacao.atributosParaDados`.
 */
export function atributosParaDadosDaFicha(dados: FichaJogadorDadosDto): FichaAtributosDto {
  const manual = dados.dadosTeste ?? {};
  const equipamento = calcularAjusteDadosEquipamento(dados.inventario.itens);
  const combinado: Partial<Record<keyof FichaAtributosDto, number>> = { ...manual };
  (Object.keys(equipamento) as (keyof FichaAtributosDto)[]).forEach((chave) => {
    combinado[chave] = (combinado[chave] ?? 0) + (equipamento[chave] ?? 0);
  });
  return calcularAtributosParaDados(dados.atributos, dados.estado.lesoes, combinado);
}

/** Dados extras de Iniciativa: amplificador `Atento` + Formação da Origem `PERICIA_DADO_INICIATIVA`. */
export function dadoExtraIniciativaDaFicha(dados: FichaJogadorDadosDto): number {
  return (
    ajusteDadoIniciativaAmplificadores(dados.inventario.amplificadores) +
    obterDadoExtraIniciativaFormacao(dados.identidade?.origem?.formacao ?? [])
  );
}

/** Total de d6 que a Iniciativa deste agente rola — a Destreza para dados mais o dado extra. */
export function dadosDeIniciativaDaFicha(dados: FichaJogadorDadosDto): number {
  return atributosParaDadosDaFicha(dados).destreza + dadoExtraIniciativaDaFicha(dados);
}

/**
 * Rola a Iniciativa do agente pelo preset "Iniciativa" seedado no backend (`PRESET_INICIATIVA_PADRAO`,
 * m3-47). `null` quando a ficha não tem mais esse preset (apagado à mão numa ficha antiga) ou
 * quando a fórmula dele não resolve — o chamador decide o que mostrar.
 */
export function rolarIniciativaDaFicha(dados: FichaJogadorDadosDto): PassoExecutadoDto | null {
  const preset = dados.rolagens?.find((item) => item.nome === NOME_PRESET_INICIATIVA) ?? null;
  if (!preset) {
    return null;
  }
  return executarPassoPreset({
    preset,
    atributos: atributosParaDadosDaFicha(dados),
    proficiencia: calcularProficiencia({ classe: dados.classe, nivel: dados.nivel }),
    nivel: dados.nivel,
    habilidadesDisponiveis: dados.habilidades,
    indicePasso: 0,
    dadoExtraIniciativa: dadoExtraIniciativaDaFicha(dados),
  });
}
