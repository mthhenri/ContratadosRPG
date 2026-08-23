import type {
  EncontroCombatenteLinhaDto,
  EncontroCombatenteResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { FichaCriaturaDadosDto, FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import { CombatenteOrigemEnum, TipoDanoEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';
import { calcularEnergia, calcularVida, montarResistencias } from '@contratados-rpg/shared/regras/agente';
import { somarResistenciasCriaturaPorTipo } from '@contratados-rpg/shared/regras/criatura';
import {
  obterDadoExtraIniciativaFormacao,
  obterResistenciaFormacao,
} from '@contratados-rpg/shared/regras/identidade';

/**
 * Traduz a linha crua de `encontro_combatente` (já com a ficha resolvida pelo `JOIN`) no resumo
 * que a tela consome. É aqui que a **fonte única** se materializa: vida, energia e as três
 * condições de quem tem ficha são **lidas** do documento da ficha, nunca de uma cópia no encontro.
 *
 * **Criatura não reage a ataques.** `FichaCriaturaDadosDto` tem apenas `defesa` — Esquiva,
 * Bloqueio e Contra-Ataque saem `null`, contra o que o mockup desenha (a regra vence, §16 #27).
 */

/** Vida/Energia máximas do agente: snapshot da ficha (m3-10) com o cálculo do motor de fallback. */
function resolverMaximosDoAgente(dados: FichaJogadorDadosDto): {
  vidaMaxima: number;
  energiaMaxima: number;
} {
  const vidaMaxima =
    dados.estado.vidaMaxima ??
    calcularVida({ classe: dados.classe, nivel: dados.nivel, vigor: dados.atributos.vigor });
  const energiaMaxima =
    dados.estado.energiaMaxima ??
    calcularEnergia({ classe: dados.classe, nivel: dados.nivel, destreza: dados.atributos.destreza });
  return { vidaMaxima, energiaMaxima };
}

/** Recorte de estado que cada tipo de combatente resolve à sua maneira. */
interface EstadoDoCombatente {
  readonly vidaAtual: number;
  readonly vidaMaxima: number;
  readonly energiaAtual: number | null;
  readonly energiaMaxima: number | null;
  readonly defesa: number | null;
  readonly esquiva: number | null;
  readonly bloqueio: number | null;
  readonly contraAtaque: number | null;
  readonly destreza: number;
  /**
   * Bônus fixo de Iniciativa — só a criatura tem um (`iniciativaBonus`, ≈ 10% do VD). O do
   * agente são **dados extras**, não um número, e depende do documento inteiro: fica `0` aqui e
   * é o jogador quem rola a própria iniciativa (decisão do milestone).
   */
  readonly iniciativaBonus: number;
  readonly morrendo: boolean | null;
  readonly machucado: boolean | null;
  readonly inconsciente: boolean | null;
}

/** Agente: vida/energia e as três condições vêm de `estado`; as defesas, de `derivados`. */
function resolverEstadoDoAgente(dados: FichaJogadorDadosDto): EstadoDoCombatente {
  const { vidaMaxima, energiaMaxima } = resolverMaximosDoAgente(dados);
  return {
    vidaAtual: dados.estado.vidaAtual,
    vidaMaxima,
    energiaAtual: dados.estado.energiaAtual,
    energiaMaxima,
    defesa: dados.derivados?.defesa ?? null,
    esquiva: dados.derivados?.esquiva ?? null,
    bloqueio: dados.derivados?.bloqueio ?? null,
    contraAtaque: dados.derivados?.contraAtaque ?? null,
    destreza: dados.atributos.destreza,
    iniciativaBonus: 0,
    // Flags alternadas à mão por quem joga (m3-10) — o encontro lê, nunca deduz de `vidaAtual`.
    morrendo: dados.estado.morrendo ?? false,
    machucado: dados.estado.machucado ?? false,
    inconsciente: dados.estado.inconsciente ?? false,
  };
}

/** Criatura: só Defesa é real; sem Energia e sem as três condições de agente. */
function resolverEstadoDaCriatura(dados: FichaCriaturaDadosDto): EstadoDoCombatente {
  return {
    vidaAtual: dados.vidaAtual,
    vidaMaxima: dados.vidaMaxima,
    energiaAtual: null,
    energiaMaxima: null,
    defesa: dados.defesa,
    esquiva: null,
    bloqueio: null,
    contraAtaque: null,
    destreza: dados.atributos.destreza,
    iniciativaBonus: dados.iniciativaBonus ?? 0,
    morrendo: null,
    machucado: null,
    inconsciente: null,
  };
}

/**
 * Resistência a dano por tipo (m7-17) — só agente e criatura têm ficha tipada o bastante pra
 * calcular. Agente reusa o mesmo motor da aba Combate da ficha (`montarResistencias`: manual +
 * equipamento + Formação); criatura soma as linhas de `resistencias` (`subtipo` não distingue
 * aqui). NPC (contrato ainda não tipado, m4-05) e avulso saem `null` — não é `0`, é "não existe".
 */
function resolverResistencias(linha: EncontroCombatenteLinhaDto): Partial<Record<TipoDanoEnum, number>> | null {
  if (linha.fichaId === null || linha.fichaDados === null) {
    return null;
  }
  if (linha.tipoFicha === TipoFichaEnum.JOGADOR) {
    const dados = linha.fichaDados as FichaJogadorDadosDto;
    const formacao = obterResistenciaFormacao(dados.identidade?.origem?.formacao ?? []);
    const resistencias = montarResistencias({
      itens: dados.inventario?.itens ?? [],
      amplificadores: dados.inventario?.amplificadores ?? [],
      manual: dados.derivados?.resistencias,
      formacao,
    });
    return Object.fromEntries(resistencias.map((linhaResistencia) => [linhaResistencia.tipo, linhaResistencia.total]));
  }
  if (linha.tipoFicha === TipoFichaEnum.CRIATURA) {
    return somarResistenciasCriaturaPorTipo((linha.fichaDados as FichaCriaturaDadosDto).resistencias ?? []);
  }
  return null;
}

/**
 * Dado extra de Iniciativa vindo de Formação da Origem (m7-18) — só o agente tem Formação;
 * criatura/NPC/avulso saem `0`. Mesmo reaproveitamento do motor puro que `resolverResistencias`
 * já faz para a resistência a dano.
 */
function resolverDadoExtraIniciativa(linha: EncontroCombatenteLinhaDto): number {
  if (linha.fichaId === null || linha.fichaDados === null || linha.tipoFicha !== TipoFichaEnum.JOGADOR) {
    return 0;
  }
  const dados = linha.fichaDados as FichaJogadorDadosDto;
  return obterDadoExtraIniciativaFormacao(dados.identidade?.origem?.formacao ?? []);
}

/**
 * Avulso: sem ficha, o estado é o do próprio encontro — só vida. É o **único** combatente cuja
 * vida mora em `encontro_combatente`.
 */
function resolverEstadoDoAvulso(linha: EncontroCombatenteLinhaDto): EstadoDoCombatente {
  return {
    vidaAtual: linha.vidaAtualAvulso ?? 0,
    vidaMaxima: linha.vidaMaximaAvulso ?? 0,
    energiaAtual: null,
    energiaMaxima: null,
    defesa: null,
    esquiva: null,
    bloqueio: null,
    contraAtaque: null,
    destreza: 0,
    iniciativaBonus: 0,
    morrendo: null,
    machucado: null,
    inconsciente: null,
  };
}

/**
 * NPC ainda não tem contrato tipado (`m4-05` está no backlog). Até lá o combatente NPC entra pelo
 * que é comum a qualquer documento — vida e Destreza —, sem inventar campo: o que faltar fica
 * nulo e a tela simplesmente não desenha.
 */
function resolverEstadoGenerico(dados: Record<string, unknown>): EstadoDoCombatente {
  const numeroOuZero = (valor: unknown): number => (typeof valor === 'number' ? valor : 0);
  const atributos = (dados.atributos ?? {}) as Record<string, unknown>;
  const estado = (dados.estado ?? {}) as Record<string, unknown>;
  return {
    vidaAtual: numeroOuZero(dados.vidaAtual ?? estado.vidaAtual),
    vidaMaxima: numeroOuZero(dados.vidaMaxima ?? estado.vidaMaxima),
    energiaAtual: typeof estado.energiaAtual === 'number' ? estado.energiaAtual : null,
    energiaMaxima: typeof estado.energiaMaxima === 'number' ? estado.energiaMaxima : null,
    defesa: typeof dados.defesaBase === 'number' ? dados.defesaBase : null,
    esquiva: typeof dados.esquivar === 'number' ? dados.esquivar : null,
    bloqueio: typeof dados.bloquear === 'number' ? dados.bloquear : null,
    contraAtaque: null,
    destreza: numeroOuZero(atributos.destreza),
    iniciativaBonus: 0,
    morrendo: null,
    machucado: null,
    inconsciente: null,
  };
}

/** Estado do combatente conforme sua origem e o tipo da ficha. */
function resolverEstado(linha: EncontroCombatenteLinhaDto): EstadoDoCombatente {
  if (linha.fichaId === null || linha.fichaDados === null) {
    return resolverEstadoDoAvulso(linha);
  }
  if (linha.tipoFicha === TipoFichaEnum.JOGADOR) {
    return resolverEstadoDoAgente(linha.fichaDados as FichaJogadorDadosDto);
  }
  if (linha.tipoFicha === TipoFichaEnum.CRIATURA) {
    return resolverEstadoDaCriatura(linha.fichaDados as FichaCriaturaDadosDto);
  }
  return resolverEstadoGenerico(linha.fichaDados as unknown as Record<string, unknown>);
}

/** Monta o resumo de um combatente a partir da linha do repositório. */
export function montarCombatenteResumo(
  linha: EncontroCombatenteLinhaDto,
): EncontroCombatenteResumoDto {
  const estado = resolverEstado(linha);
  return {
    id: linha.id,
    encontroId: linha.encontroId,
    origem: linha.fichaId === null ? CombatenteOrigemEnum.AVULSO : CombatenteOrigemEnum.FICHA,
    fichaId: linha.fichaId,
    tipoFicha: linha.tipoFicha,
    nome: linha.fichaNome ?? linha.nomeAvulso ?? '',
    iniciativa: linha.iniciativa,
    cadencia: linha.cadencia,
    turnosPorRodada:
      linha.tipoFicha === TipoFichaEnum.CRIATURA
        ? ((linha.fichaDados as FichaCriaturaDadosDto).turnosPorRodada ?? linha.turnosPorRodada)
        : linha.turnosPorRodada,
    ordem: linha.ordem,
    vidaAtual: estado.vidaAtual,
    vidaMaxima: estado.vidaMaxima,
    energiaAtual: estado.energiaAtual,
    energiaMaxima: estado.energiaMaxima,
    defesa: estado.defesa,
    esquiva: estado.esquiva,
    bloqueio: estado.bloqueio,
    contraAtaque: estado.contraAtaque,
    condicoes: linha.condicoes ?? [],
    morrendo: estado.morrendo,
    machucado: estado.machucado,
    inconsciente: estado.inconsciente,
    destreza: estado.destreza,
    iniciativaBonus: estado.iniciativaBonus,
    dadoExtraIniciativa: resolverDadoExtraIniciativa(linha),
    corFicha: linha.fichaId === null ? linha.corAvulso : linha.fichaCor,
    imagemUrl: linha.fichaId === null ? linha.imagemUrlAvulso : linha.fichaImagemUrl,
    imagemFoco: linha.fichaImagemFoco,
    donoNome: linha.tipoFicha === TipoFichaEnum.JOGADOR ? linha.fichaDonoNome : null,
    classe:
      linha.tipoFicha === TipoFichaEnum.JOGADOR
        ? (linha.fichaDados as FichaJogadorDadosDto).classe
        : null,
    arquetipo:
      linha.tipoFicha === TipoFichaEnum.JOGADOR
        ? (linha.fichaDados as FichaJogadorDadosDto).arquetipo
        : null,
    resistencias: resolverResistencias(linha),
    // O mapper monta sempre a visão **completa** (a do mestre). O recorte por permissão é uma
    // camada depois, em `encontro-revelacao.ts` — aqui não se decide quem vê o quê.
    revelado: true,
  };
}
