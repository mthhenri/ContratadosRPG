import { describe, expect, it } from 'vitest';

import type {
  EncontroCombatenteResumoDto,
  EncontroRecuperadoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import {
  ArquetipoEnum,
  CadenciaEnum,
  ClasseEnum,
  CombatenteOrigemEnum,
  EncontroEventoTipoEnum,
  EncontroStatusEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { ocultarNaoRevelados } from './encontro-revelacao';

/**
 * Prova o recorte de revelação (m7-06): entrar num encontro **não** revela ficha nenhuma. O que
 * sobra do combatente oculto é só a identidade da ordem de turno; o que some são os números — e o
 * log que os repetiria por escrito.
 */
describe('ocultarNaoRevelados', () => {
  const combatente = (
    id: number,
    extras: Partial<EncontroCombatenteResumoDto> = {},
  ): EncontroCombatenteResumoDto => ({
    id,
    encontroId: 1,
    origem: CombatenteOrigemEnum.FICHA,
    fichaId: id * 10,
    tipoFicha: TipoFichaEnum.JOGADOR,
    nome: `Combatente ${id}`,
    iniciativa: 20 - id,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: id,
    vidaAtual: 31,
    vidaMaxima: 40,
    energiaAtual: 6,
    energiaMaxima: 16,
    defesa: 14,
    esquiva: 15,
    bloqueio: 6,
    contraAtaque: 9,
    condicoes: [{ nome: 'Atordoado', rodadasRestantes: 2, perdeTurno: true }],
    morrendo: false,
    machucado: true,
    inconsciente: false,
    destreza: 4,
    iniciativaBonus: 3,
    dadoExtraIniciativa: 0,
    corFicha: '#4a9d6b',
    imagemUrl: null,
    imagemFoco: null,
    donoNome: 'Bia',
    classe: null,
    arquetipo: null,
    resistencias: null,
    revelado: true,
    ...extras,
  });

  const estado = (
    combatentes: readonly EncontroCombatenteResumoDto[],
  ): EncontroRecuperadoDto => ({
    id: 1,
    campanhaId: 9,
    nome: 'Contenção no Setor 12',
    status: EncontroStatusEnum.ATIVO,
    rodadaAtual: 2,
    turnoIndice: 0,
    combatentes,
    ordemRodada: combatentes.map((item) => ({ combatenteId: item.id, ocorrencia: 1 })),
    eventos: [
      {
        id: 1,
        tipo: EncontroEventoTipoEnum.RODADA_INICIADA,
        rodada: 2,
        turno: 0,
        texto: 'Rodada 2 começou',
        combatenteId: null,
        createdDate: '2026-08-18T00:00:00.000Z',
      },
      {
        id: 2,
        tipo: EncontroEventoTipoEnum.DANO,
        rodada: 2,
        turno: 1,
        texto: 'SCP-1471-A sofreu 12 de dano',
        combatenteId: 2,
        createdDate: '2026-08-18T00:00:01.000Z',
      },
    ],
  });

  it('mantém intacto o combatente cuja ficha o usuário pode abrir', () => {
    const recortado = ocultarNaoRevelados(estado([combatente(1)]), new Set([10]), new Set([10]));
    expect(recortado.combatentes[0]).toEqual(combatente(1));
  });

  it('apaga os números e a identidade visual do combatente não revelado, preservando a ordem', () => {
    const criatura = combatente(2, {
      tipoFicha: TipoFichaEnum.CRIATURA,
      nome: 'SCP-1471-A',
      imagemUrl: '/uploads/criaturas/1471.webp',
      imagemFoco: { x: 40, y: 60, escala: 1.5 },
      donoNome: null,
    });
    const [oculto] = ocultarNaoRevelados(
      estado([criatura]),
      new Set<number>(),
      new Set<number>(),
    ).combatentes;

    // A identidade sem a qual não existe ordem de turno sobrevive…
    expect(oculto.nome).toBe('SCP-1471-A');
    expect(oculto.iniciativa).toBe(18);
    expect(oculto.cadencia).toBe(CadenciaEnum.SINGULAR);
    // …e todo o resto vai embora — criatura não tem "carteirinha" (m7-16 só vale pra agente).
    expect(oculto.revelado).toBe(false);
    expect(oculto.vidaAtual).toBe(0);
    expect(oculto.vidaMaxima).toBe(0);
    expect(oculto.defesa).toBeNull();
    expect(oculto.energiaAtual).toBeNull();
    expect(oculto.condicoes).toEqual([]);
    expect(oculto.machucado).toBeNull();
    expect(oculto.destreza).toBe(0);
    expect(oculto.iniciativaBonus).toBe(0);
    expect(oculto.dadoExtraIniciativa).toBe(0);
    expect(oculto.imagemUrl).toBeNull();
    expect(oculto.imagemFoco).toBeNull();
    expect(oculto.donoNome).toBeNull();
  });

  it('trata o avulso como não revelado — ele não tem ficha para revelar', () => {
    const avulso = combatente(3, {
      origem: CombatenteOrigemEnum.AVULSO,
      fichaId: null,
      tipoFicha: null,
      nome: 'Sujeito Contido',
    });
    const [oculto] = ocultarNaoRevelados(
      estado([avulso]),
      new Set([10, 20, 30]),
      new Set([10, 20, 30]),
    ).combatentes;

    expect(oculto.revelado).toBe(false);
    expect(oculto.vidaMaxima).toBe(0);
    expect(oculto.nome).toBe('Sujeito Contido');
  });

  it('descarta o evento de log preso a um combatente oculto, e só ele', () => {
    const recortado = ocultarNaoRevelados(
      estado([combatente(1), combatente(2)]),
      new Set([10]),
      new Set([10]),
    );
    // O dano da criatura sai (o texto entregaria o número que o resumo escondeu); a virada de
    // rodada fica — é a cronologia da cena, que o jogador viveu.
    expect(recortado.eventos.map((evento) => evento.id)).toEqual([1]);
  });

  it('m7-16: mantém a "carteirinha" do agente de ficha não oculta mesmo sem acesso aos números', () => {
    const agente = combatente(2, {
      nome: 'Max Star',
      donoNome: 'Sirius',
      classe: ClasseEnum.COMBATENTE,
      arquetipo: ArquetipoEnum.LUTADOR,
      imagemUrl: '/uploads/agentes/max-star.webp',
      imagemFoco: { x: 40, y: 60, escala: 1.5 },
    });
    // Fora de `fichaIdsVisiveis` (sem `usuario_ficha_acesso`), mas dentro de
    // `fichaIdsIdentidadeVisivel` (ficha não oculta) — o número some, a carteirinha fica.
    const [oculto] = ocultarNaoRevelados(
      estado([agente]),
      new Set<number>(),
      new Set([20]),
    ).combatentes;

    expect(oculto.revelado).toBe(false);
    expect(oculto.vidaAtual).toBe(0);
    expect(oculto.defesa).toBeNull();
    expect(oculto.condicoes).toEqual([]);
    expect(oculto.imagemUrl).toBe('/uploads/agentes/max-star.webp');
    expect(oculto.imagemFoco).toEqual({ x: 40, y: 60, escala: 1.5 });
    expect(oculto.donoNome).toBe('Sirius');
    expect(oculto.classe).toBe(ClasseEnum.COMBATENTE);
    expect(oculto.arquetipo).toBe(ArquetipoEnum.LUTADOR);
  });

  it('m7-16: some com a "carteirinha" do agente cuja ficha está oculta, igual a uma criatura', () => {
    const agente = combatente(2, {
      nome: 'Max Star',
      donoNome: 'Sirius',
      classe: ClasseEnum.COMBATENTE,
      arquetipo: ArquetipoEnum.LUTADOR,
      imagemUrl: '/uploads/agentes/max-star.webp',
    });
    // Nem em `fichaIdsVisiveis` nem em `fichaIdsIdentidadeVisivel` (ficha oculta pelo dono).
    const [oculto] = ocultarNaoRevelados(
      estado([agente]),
      new Set<number>(),
      new Set<number>(),
    ).combatentes;

    expect(oculto.imagemUrl).toBeNull();
    expect(oculto.donoNome).toBeNull();
    expect(oculto.classe).toBeNull();
    expect(oculto.arquetipo).toBeNull();
  });
});
