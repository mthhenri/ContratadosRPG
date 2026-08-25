import type { FichaAtributosDto, FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  ajusteDadoIniciativaAmplificadores,
  calcularAtributosEfetivos,
  calcularProficiencia,
} from '@contratados-rpg/shared/regras/agente';
import { obterDadoExtraIniciativaFormacao } from '@contratados-rpg/shared/regras/identidade';

import { executarPassoPreset, NOME_PRESET_INICIATIVA, type PassoExecutadoDto } from './executar-rolagem';

/**
 * Rolagem de **Iniciativa de um agente** a partir do documento da ficha (m7-06) — extraída de
 * `FichaVisualizacao.rolarIniciativa` porque a tela "Iniciativa" precisa exatamente da mesma coisa
 * fora da ficha: o jogador rola a própria iniciativa lá, e teria de recompor a mesma pilha
 * (Destreza efetiva + Proficiência + dado extra de `Atento`/Formação) para chegar ao mesmo número.
 * Duas composições paralelas divergiriam no primeiro ajuste de regra — daí a extração.
 *
 * Continua **sem motor próprio**: tudo aqui é composição de `shared/regras` com
 * `executarPassoPreset`. O bônus de Iniciativa do agente não é um número somado ao final — são
 * **dados extras** no pool de Destreza —, e é por isso que ele só se resolve do documento inteiro
 * (o `Rolar tudo` do mestre, que só tem o resumo do combatente, é fallback).
 */

/**
 * Atributo **efetivo** do agente (base − lesões, `calcularAtributosEfetivos`) — a Iniciativa rola
 * pelo atributo de Destreza (`sistema-v4.1.0.md`: "definida pelo seu atributo de Destreza"), não
 * pelo atributo ajustado pra testes: `dadosTeste` (ajuste manual) e a penalidade de equipamento
 * (Armadura Pesada, −1 dado em Destreza) só valem pra testes de atributo, e não reduzem a Destreza
 * em si — só lesão reduz o atributo, e só o dado extra de Iniciativa (abaixo) ou uma condição que
 * mexa nela especificamente reduzem a Iniciativa.
 */
export function atributosEfetivosDaFicha(dados: FichaJogadorDadosDto): FichaAtributosDto {
  return calcularAtributosEfetivos(dados.atributos, dados.estado.lesoes);
}

/** Dados extras de Iniciativa: amplificador `Atento` + Formação da Origem `PERICIA_DADO_INICIATIVA`. */
export function dadoExtraIniciativaDaFicha(dados: FichaJogadorDadosDto): number {
  return (
    ajusteDadoIniciativaAmplificadores(dados.inventario.amplificadores) +
    obterDadoExtraIniciativaFormacao(dados.identidade?.origem?.formacao ?? [])
  );
}

/** Total de d6 que a Iniciativa deste agente rola — a Destreza efetiva mais o dado extra. */
export function dadosDeIniciativaDaFicha(dados: FichaJogadorDadosDto): number {
  return atributosEfetivosDaFicha(dados).destreza + dadoExtraIniciativaDaFicha(dados);
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
    atributos: atributosEfetivosDaFicha(dados),
    proficiencia: calcularProficiencia({ classe: dados.classe, nivel: dados.nivel }),
    nivel: dados.nivel,
    habilidadesDisponiveis: dados.habilidades,
    indicePasso: 0,
    dadoExtraIniciativa: dadoExtraIniciativaDaFicha(dados),
  });
}
