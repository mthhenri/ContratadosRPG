import { TestBed } from '@angular/core/testing';

import type {
  EncontroCombatenteResumoDto,
  EncontroEventoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import {
  CadenciaEnum,
  CombatenteOrigemEnum,
  EncontroEventoTipoEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { LogEncontro } from './log-encontro.component';

/**
 * Prova o painel "Log da rodada" (m7-07). O que importa aqui é a **apresentação**, porque é só isso
 * que o componente faz: o marcador de rodada/turno, o recorte por rodada (corrente primeiro,
 * anteriores sob demanda), a ordem do mais recente para o mais antigo e o destaque do nome dentro
 * de uma frase que veio pronta do backend.
 */
describe('LogEncontro', () => {
  const combatentes: readonly EncontroCombatenteResumoDto[] = [
    {
      id: 7,
      encontroId: 1,
      origem: CombatenteOrigemEnum.FICHA,
      fichaId: 40,
      tipoFicha: TipoFichaEnum.JOGADOR,
      nome: 'K. Amaral',
      iniciativa: 18,
      cadencia: CadenciaEnum.SINGULAR,
      ordem: 1,
      vidaAtual: 20,
      vidaMaxima: 31,
      energiaAtual: 6,
      energiaMaxima: 16,
      defesa: 14,
      esquiva: 15,
      bloqueio: 6,
      contraAtaque: 9,
      condicoes: [],
      morrendo: false,
      machucado: false,
      inconsciente: false,
      destreza: 4,
      iniciativaBonus: 0,
      corFicha: null,
      imagemUrl: null,
      imagemFoco: null,
      donoNome: null,
      classe: null,
      arquetipo: null,
      resistencias: null,
      revelado: true,
    },
  ];

  function evento(parcial: Partial<EncontroEventoDto> & { id: number }): EncontroEventoDto {
    return {
      tipo: EncontroEventoTipoEnum.DANO,
      rodada: 3,
      turno: 2,
      texto: 'K. Amaral sofreu 11 de dano de V. Corvalho',
      combatenteId: 7,
      createdDate: '2026-08-18T12:00:00.000Z',
      ...parcial,
    };
  }

  function montar(eventos: readonly EncontroEventoDto[], rodadaAtual = 3) {
    const fixture = TestBed.createComponent(LogEncontro);
    fixture.componentRef.setInput('eventos', eventos);
    fixture.componentRef.setInput('combatentes', combatentes);
    fixture.componentRef.setInput('rodadaAtual', rodadaAtual);
    fixture.detectChanges();
    return fixture;
  }

  const elemento = (fixture: ReturnType<typeof montar>): HTMLElement => fixture.nativeElement;

  /** Espaços colapsados: o texto do item vem quebrado em vários nós (antes + nome + depois). */
  const linhas = (fixture: ReturnType<typeof montar>): string[] =>
    Array.from(elemento(fixture).querySelectorAll('.log__item')).map((item) =>
      (item.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

  const marcadores = (fixture: ReturnType<typeof montar>): string[] =>
    Array.from(elemento(fixture).querySelectorAll('.log__marcador')).map((item) =>
      (item.textContent ?? '').trim(),
    );

  const botao = (fixture: ReturnType<typeof montar>, rotulo: string): HTMLButtonElement | null =>
    Array.from(elemento(fixture).querySelectorAll<HTMLButtonElement>('.log__acao')).find(
      (item) => (item.textContent ?? '').trim() === rotulo,
    ) ?? null;

  it('marca o evento de turno com rodada e turno, e a virada de rodada só com a rodada', () => {
    const fixture = montar([
      evento({ id: 2 }),
      evento({
        id: 1,
        tipo: EncontroEventoTipoEnum.RODADA_INICIADA,
        turno: 1,
        texto: 'Rodada 3 iniciada',
        combatenteId: null,
      }),
    ]);
    expect(marcadores(fixture)).toEqual(['T3 · 2', 'R3']);
  });

  it('destaca o nome do combatente sem alterar a frase do backend', () => {
    const fixture = montar([evento({ id: 1 })]);
    const nome = elemento(fixture).querySelector('.log__nome');
    expect(nome?.textContent?.trim()).toBe('K. Amaral');
    expect(linhas(fixture)).toEqual(['T3 · 2 K. Amaral sofreu 11 de dano de V. Corvalho']);
  });

  it('destaca no accent a mudança de estado', () => {
    const fixture = montar([
      evento({
        id: 1,
        tipo: EncontroEventoTipoEnum.ESTADO_ALTERADO,
        texto: 'K. Amaral perdeu o turno',
      }),
    ]);
    expect(elemento(fixture).querySelector('.log__nome--alerta')).not.toBeNull();
  });

  it('mantém a frase inteira quando o nome não está no texto', () => {
    const fixture = montar([
      evento({ id: 1, texto: 'Sangramento aplicado em alguém que saiu', combatenteId: 999 }),
    ]);
    expect(elemento(fixture).querySelector('.log__nome')).toBeNull();
    expect(linhas(fixture)).toEqual(['T3 · 2 Sangramento aplicado em alguém que saiu']);
  });

  it('lista da entrada mais recente para a mais antiga', () => {
    const fixture = montar([
      evento({ id: 1, texto: 'primeira' }),
      evento({ id: 3, texto: 'terceira' }),
      evento({ id: 2, texto: 'segunda' }),
    ]);
    expect(linhas(fixture)).toEqual([
      'T3 · 2 terceira',
      'T3 · 2 segunda',
      'T3 · 2 primeira',
    ]);
  });

  it('abre na rodada corrente e alcança as anteriores sob demanda', () => {
    const fixture = montar([
      evento({ id: 3, rodada: 3, texto: 'agora' }),
      evento({ id: 2, rodada: 2, texto: 'antes' }),
      evento({ id: 1, rodada: 1, texto: 'começo' }),
    ]);
    expect(linhas(fixture)).toEqual(['T3 · 2 agora']);

    botao(fixture, 'Rodada anterior')?.click();
    fixture.detectChanges();
    expect(linhas(fixture)).toEqual(['T3 · 2 agora', 'T2 · 2 antes']);

    botao(fixture, 'Rodada anterior')?.click();
    fixture.detectChanges();
    expect(linhas(fixture)).toEqual(['T3 · 2 agora', 'T2 · 2 antes', 'T1 · 2 começo']);
    // Chegou ao início do que foi carregado: não há mais o que abrir.
    expect(botao(fixture, 'Rodada anterior')).toBeNull();

    botao(fixture, 'Rodada atual')?.click();
    fixture.detectChanges();
    expect(linhas(fixture)).toEqual(['T3 · 2 agora']);
  });

  it('não oferece rodada anterior quando o combate só tem a corrente', () => {
    const fixture = montar([evento({ id: 1 })]);
    expect(botao(fixture, 'Rodada anterior')).toBeNull();
    expect(botao(fixture, 'Rodada atual')).toBeNull();
  });

  it('nasce recolhido e conta as entradas no gatilho do mobile (m7-08)', () => {
    const fixture = montar([evento({ id: 1 }), evento({ id: 2 })]);
    const elementoAtual = elemento(fixture);
    const gatilho = elementoAtual.querySelector<HTMLButtonElement>('.log__gatilho');

    // O recolhimento é do CSS (jsdom não aplica media query); o que o teste prova é o estado que
    // o CSS lê — a classe no painel e o rótulo do gatilho.
    expect(gatilho?.getAttribute('aria-expanded')).toBe('false');
    expect(gatilho?.textContent?.trim()).toBe('2 entradas');
    expect(elementoAtual.querySelector('.log')?.classList).not.toContain('log--aberto');

    gatilho?.click();
    fixture.detectChanges();
    expect(elementoAtual.querySelector('.log')?.classList).toContain('log--aberto');
    expect(
      elementoAtual.querySelector<HTMLButtonElement>('.log__gatilho')?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(elementoAtual.querySelector('.log__gatilho')?.textContent?.trim()).toBe('Fechar');
  });

  it('avisa quando a rodada corrente ainda não registrou nada', () => {
    const fixture = montar([evento({ id: 1, rodada: 1, texto: 'começo' })], 3);
    expect(linhas(fixture)).toEqual([]);
    expect(elemento(fixture).querySelector('.log__vazio')?.textContent?.trim()).toBe(
      'Nada registrado nesta rodada ainda.',
    );
  });
});
