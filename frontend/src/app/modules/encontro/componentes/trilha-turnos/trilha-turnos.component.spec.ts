import { TestBed } from '@angular/core/testing';

import type {
  EncontroCombatenteResumoDto,
  EncontroRecuperadoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import {
  CadenciaEnum,
  CombatenteOrigemEnum,
  EncontroStatusEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { montarCombatentesVisuais } from '../../encontro-leitura.util';
import { TrilhaTurnos } from './trilha-turnos.component';

/**
 * Prova a trilha de turnos da visão do mestre (`ui-37`): a ordem é a que o backend calculou —
 * repetida por Cadência —, quem age e quem já agiu saem das mesmas funções da grade, e nada aqui
 * recalcula ordem.
 */
describe('TrilhaTurnos', () => {
  const combatente = (
    id: number,
    nome: string,
    extras: Partial<EncontroCombatenteResumoDto> = {},
  ): EncontroCombatenteResumoDto => ({
    id,
    encontroId: 1,
    origem: CombatenteOrigemEnum.FICHA,
    fichaId: id * 100,
    tipoFicha: TipoFichaEnum.JOGADOR,
    nome,
    iniciativa: 10,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: id,
    vidaAtual: 10,
    vidaMaxima: 10,
    energiaAtual: 5,
    energiaMaxima: 5,
    defesa: 12,
    esquiva: 11,
    bloqueio: 6,
    contraAtaque: 7,
    condicoes: [],
    morrendo: false,
    machucado: false,
    inconsciente: false,
    destreza: 3,
    iniciativaBonus: 0,
    dadoExtraIniciativa: 0,
    iniciativaFormulaCustom: null,
    corFicha: null,
    imagemUrl: null,
    imagemFoco: null,
    donoNome: null,
    classe: null,
    arquetipo: null,
    resistencias: null,
    revelado: true,
    ...extras,
  });

  // Criatura de Cadência Dupla intercalada entre dois agentes: 1(1º) → 2 → 1(2º) → 3.
  const ativo: EncontroRecuperadoDto = {
    id: 1,
    campanhaId: 9,
    nome: 'Contenção no Setor 12',
    status: EncontroStatusEnum.ATIVO,
    rodadaAtual: 2,
    turnoIndice: 2,
    combatentes: [
      combatente(1, 'SCP-1471-A', {
        tipoFicha: TipoFichaEnum.CRIATURA,
        cadencia: CadenciaEnum.DUPLA,
        iniciativa: 24,
      }),
      combatente(2, 'K. Amaral', { iniciativa: 18, donoNome: 'Bia' }),
      combatente(3, 'Sujeito Contido', {
        origem: CombatenteOrigemEnum.AVULSO,
        fichaId: null,
        tipoFicha: null,
        iniciativa: null,
      }),
    ],
    ordemRodada: [
      { combatenteId: 1, ocorrencia: 1 },
      { combatenteId: 2, ocorrencia: 1 },
      { combatenteId: 1, ocorrencia: 2 },
      { combatenteId: 3, ocorrencia: 1 },
    ],
    eventos: [],
  };

  function montar(encontro: EncontroRecuperadoDto) {
    const fixture = TestBed.createComponent(TrilhaTurnos);
    fixture.componentRef.setInput('encontro', encontro);
    fixture.componentRef.setInput('combatentes', montarCombatentesVisuais(encontro));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const texto = (elemento: Element | null | undefined): string =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('mostra Rodada e Turno atual sobre o total de slots', () => {
    const elemento = montar(ativo);
    const numeros = Array.from(elemento.querySelectorAll('.trilha__numero')).map((numero) =>
      texto(numero),
    );

    expect(numeros).toEqual(['2', '3/4']);
  });

  it('repete quem tem Cadência maior, na ordem exata da rodada', () => {
    const itens = Array.from(montar(ativo).querySelectorAll('.trilha__item'));

    expect(itens.map((item) => texto(item.querySelector('.trilha__nome')))).toEqual([
      'SCP-1471-A',
      'K. Amaral',
      'SCP-1471-A',
      'Sujeito Contido',
    ]);
    expect(itens.map((item) => texto(item.querySelector('.trilha__ocorrencia')))).toEqual([
      '1/2',
      '',
      '2/2',
      '',
    ]);
    expect(texto(itens[0].querySelector('.trilha__sub'))).toBe('Turno 1 de 2');
  });

  it('marca só o slot atual como ativo e recua quem já agiu', () => {
    const itens = Array.from(montar(ativo).querySelectorAll('.trilha__item'));

    expect(itens.map((item) => item.classList.contains('trilha__item--ativa'))).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(itens.map((item) => item.classList.contains('trilha__item--agiu'))).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(itens[2].getAttribute('aria-current')).toBe('step');
    expect(itens[0].hasAttribute('aria-current')).toBe(false);
  });

  it('diz quem é cada um no subtítulo: dono, Ameaça ou Avulso', () => {
    const itens = Array.from(montar(ativo).querySelectorAll('.trilha__item'));

    expect(texto(itens[1].querySelector('.trilha__sub'))).toBe('Bia');
    expect(texto(itens[3].querySelector('.trilha__sub'))).toBe('Avulso');
  });

  it('mostra a iniciativa, com traço quando ainda não há', () => {
    const itens = Array.from(montar(ativo).querySelectorAll('.trilha__item'));

    expect(texto(itens[1].querySelector('.trilha__iniciativa'))).toBe('18');
    expect(texto(itens[3].querySelector('.trilha__iniciativa'))).toBe('—');
  });

  it('usa a sigla sobre a hachura sem imagem e a foto quando há', () => {
    const comImagem: EncontroRecuperadoDto = {
      ...ativo,
      combatentes: ativo.combatentes.map((item) =>
        item.id === 2 ? { ...item, imagemUrl: '/imagens/k-amaral.webp' } : item,
      ),
    };
    const itens = Array.from(montar(comImagem).querySelectorAll('.trilha__item'));

    expect(texto(itens[0].querySelector('.trilha__avatar'))).toBe('SC');
    expect(itens[0].querySelector('img')).toBeNull();
    expect(itens[1].querySelector('img')?.getAttribute('src')).toBe('/imagens/k-amaral.webp');
  });

  it('em montagem mostra a situação e ninguém age nem agiu', () => {
    const montagem: EncontroRecuperadoDto = {
      ...ativo,
      status: EncontroStatusEnum.MONTAGEM,
      turnoIndice: 0,
      ordemRodada: [],
    };
    const elemento = montar(montagem);

    expect(texto(elemento.querySelector('.trilha__contadores .trilha__numero'))).toBe('Montagem');
    expect(elemento.querySelectorAll('.trilha__item--ativa')).toHaveLength(0);
    expect(elemento.querySelectorAll('.trilha__item--agiu')).toHaveLength(0);
    expect(elemento.querySelectorAll('.trilha__item')).toHaveLength(3);
  });
});
