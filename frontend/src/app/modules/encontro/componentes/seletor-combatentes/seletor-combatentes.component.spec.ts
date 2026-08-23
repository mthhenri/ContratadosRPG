import { TestBed } from '@angular/core/testing';

import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  ArquetipoEnum,
  CadenciaEnum,
  ClasseEnum,
  CombatenteOrigemEnum,
  NivelAmeacaEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { SeletorCombatentes } from './seletor-combatentes.component';

/**
 * Prova o seletor de combatentes: separação em linhas (Agentes/Criaturas/NPCs), o rótulo
 * sumarizado de cada tipo, e o "marcado" — a leitura de quem já está no encontro a partir dos
 * `combatentes` recebidos, sem nenhuma chamada própria ao backend.
 */
describe('SeletorCombatentes', () => {
  const agente: FichaResumoDto = {
    id: 1,
    campanhaId: 9,
    campanhaNome: 'Campanha',
    usuarioId: 5,
    nome: 'K. Amaral',
    cor: '#4a9d6b',
    tipo: TipoFichaEnum.JOGADOR,
    na: null,
    classe: ClasseEnum.COMBATENTE,
    arquetipo: ArquetipoEnum.MERCENARIO,
    nivel: 3,
    vidaAtual: 31,
    vidaMaxima: 31,
    energiaAtual: 6,
    energiaMaxima: 16,
    morrendo: false,
    machucado: false,
    inconsciente: false,
    imagemUrl: null,
  };

  const criatura: FichaResumoDto = {
    ...agente,
    id: 2,
    nome: 'SCP-1471-A',
    tipo: TipoFichaEnum.CRIATURA,
    na: NivelAmeacaEnum.MEDIA,
    vd: 37,
  };

  function montar(
    fichas: readonly FichaResumoDto[],
    combatentes: readonly EncontroCombatenteResumoDto[] = [],
    entradas: Record<string, unknown> = {},
  ) {
    const fixture = TestBed.createComponent(SeletorCombatentes);
    fixture.componentRef.setInput('fichas', fichas);
    fixture.componentRef.setInput('combatentes', combatentes);
    for (const [nome, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nome, valor);
    }
    fixture.detectChanges();
    return fixture;
  }

  const elemento = (fixture: ReturnType<typeof montar>): HTMLElement => fixture.nativeElement;

  const combatenteDeFicha = (
    fichaId: number,
    extras: Partial<EncontroCombatenteResumoDto> = {},
  ): EncontroCombatenteResumoDto =>
    ({
      id: fichaId * 10,
      encontroId: 1,
      origem: CombatenteOrigemEnum.FICHA,
      fichaId,
      tipoFicha: TipoFichaEnum.JOGADOR,
      nome: 'x',
      iniciativa: null,
      cadencia: CadenciaEnum.SINGULAR,
      ordem: 1,
      vidaAtual: 1,
      vidaMaxima: 1,
      energiaAtual: null,
      energiaMaxima: null,
      defesa: null,
      esquiva: null,
      bloqueio: null,
      contraAtaque: null,
      condicoes: [],
      morrendo: null,
      machucado: null,
      inconsciente: null,
      destreza: 0,
      iniciativaBonus: 0,
      dadoExtraIniciativa: 0,
    corFicha: null,
    imagemUrl: null,
    imagemFoco: null,
      revelado: true,
      ...extras,
    }) as EncontroCombatenteResumoDto;

  it('separa agentes e criaturas em linhas distintas', () => {
    const fixture = montar([agente, criatura]);
    const el = elemento(fixture);
    const titulos = Array.from(el.querySelectorAll('.seletor__titulo')).map((t) =>
      t.textContent?.trim(),
    );
    expect(titulos).toEqual(['Agentes', 'Criaturas']);
    expect(el.querySelectorAll('.seletor__linha')[0].querySelectorAll('.seletor__cartao').length).toBe(1);
    expect(el.querySelectorAll('.seletor__linha')[1].querySelectorAll('.seletor__cartao').length).toBe(1);
  });

  it('não desenha a linha de NPCs quando não há nenhum', () => {
    const fixture = montar([agente, criatura]);
    const titulos = Array.from(elemento(fixture).querySelectorAll('.seletor__titulo')).map((t) =>
      t.textContent?.trim(),
    );
    expect(titulos).not.toContain('NPCs');
  });

  it('desenha a linha de NPCs quando existe um', () => {
    const npc: FichaResumoDto = { ...agente, id: 3, nome: 'Dr. Voss', tipo: TipoFichaEnum.NPC };
    const fixture = montar([agente, criatura, npc]);
    const titulos = Array.from(elemento(fixture).querySelectorAll('.seletor__titulo')).map((t) =>
      t.textContent?.trim(),
    );
    expect(titulos).toEqual(['Agentes', 'Criaturas', 'NPCs']);
  });

  it('mostra classe/arquétipo e nível no cartão do agente', () => {
    const fixture = montar([agente]);
    expect(elemento(fixture).querySelector('.seletor__meta')?.textContent?.trim()).toBe(
      'Combatente - Mercenário · Nível 3',
    );
  });

  it('mostra Nível de Ameaça e VD no cartão da criatura', () => {
    const fixture = montar([criatura]);
    expect(elemento(fixture).querySelector('.seletor__meta')?.textContent?.trim()).toBe(
      'Ameaça · Média · VD 37',
    );
  });

  it('marca o cartão de quem já tem combatente no encontro', () => {
    const fixture = montar([agente, criatura], [combatenteDeFicha(agente.id)]);
    const cartoes = elemento(fixture).querySelectorAll('.seletor__cartao');
    expect(cartoes[0].classList).toContain('seletor__cartao--marcado');
    expect(cartoes[0].getAttribute('aria-pressed')).toBe('true');
    expect(cartoes[1].classList).not.toContain('seletor__cartao--marcado');
    expect(cartoes[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('emite a ficha clicada, marcada ou não, para a página decidir adicionar/remover', () => {
    const fixture = montar([agente, criatura], [combatenteDeFicha(agente.id)]);
    const emitidas: FichaResumoDto[] = [];
    fixture.componentInstance.fichaAlternada.subscribe((ficha) => emitidas.push(ficha));

    const cartoes = elemento(fixture).querySelectorAll<HTMLButtonElement>('.seletor__cartao');
    cartoes[0].click();
    cartoes[1].click();

    expect(emitidas.map((f) => f.id)).toEqual([agente.id, criatura.id]);
  });

  it('não emite nada quando desabilitado', () => {
    const fixture = montar([agente], [], { desabilitado: true });
    const emitidas: FichaResumoDto[] = [];
    fixture.componentInstance.fichaAlternada.subscribe((ficha) => emitidas.push(ficha));

    elemento(fixture).querySelector<HTMLButtonElement>('.seletor__cartao')?.click();
    expect(emitidas).toEqual([]);
    expect(elemento(fixture).querySelector<HTMLButtonElement>('.seletor__cartao')?.disabled).toBe(
      true,
    );
  });

  it('avisa quando a campanha ainda não tem agente/criatura nenhum', () => {
    const fixture = montar([]);
    const vazios = Array.from(elemento(fixture).querySelectorAll('.seletor__vazio')).map((p) =>
      p.textContent?.trim(),
    );
    expect(vazios).toEqual([
      'Nenhum agente na campanha ainda.',
      'Nenhuma criatura na campanha ainda.',
    ]);
  });
});
