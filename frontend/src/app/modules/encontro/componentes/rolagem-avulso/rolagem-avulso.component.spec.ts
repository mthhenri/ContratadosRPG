import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import { CadenciaEnum, CombatenteOrigemEnum } from '@contratados-rpg/shared/enums';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';

import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { RolagemAvulso } from './rolagem-avulso.component';

describe('RolagemAvulso', () => {
  const combatente = {
    id: 31,
    encontroId: 12,
    origem: CombatenteOrigemEnum.AVULSO,
    fichaId: null,
    tipoFicha: null,
    nome: 'Capanga',
    iniciativa: 10,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: 1,
    vidaAtual: 10,
    vidaMaxima: 10,
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
    iniciativaFormulaCustom: null,
    corFicha: '#d53030',
    imagemUrl: null,
    imagemFoco: null,
    donoNome: null,
    classe: null,
    arquetipo: null,
    resistencias: null,
    revelado: true,
  } as EncontroCombatenteResumoDto;

  function montar() {
    const registrada = {
      id: 1,
      fichaId: null,
      encontroCombatenteId: 31,
      campanhaId: 5,
      usuarioId: 1,
      nomeAutor: 'Mestre',
      nomeFicha: 'Capanga',
      rotulo: 'Rolagem livre',
      visibilidade: RolagemVisibilidadeEnum.PRIVADA,
      resultado: { dados: [], atributos: [], constante: 3, total: 3 },
      createdDate: '2026-08-22T15:00:00.000Z',
      corFicha: '#d53030',
    };
    const rolagemService = {
      registrarAvulso: vi.fn(() => of(registrada)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: RolagemService, useValue: rolagemService }],
    });
    const fixture = TestBed.createComponent(RolagemAvulso);
    fixture.componentRef.setInput('combatente', combatente);
    fixture.detectChanges();
    return {
      fixture,
      elemento: fixture.nativeElement as HTMLElement,
      rolagemService,
      notificacaoService: TestBed.inject(NotificacaoService),
    };
  }

  it('nasce oculto e pede confirmação antes de tornar as próximas rolagens públicas', () => {
    const { fixture, elemento } = montar();
    const alternador = elemento.querySelector<HTMLButtonElement>('.rolagem-avulso__visibilidade');

    expect(alternador?.getAttribute('aria-pressed')).toBe('true');
    alternador?.click();
    fixture.detectChanges();

    expect(elemento.querySelector('app-modal')).not.toBeNull();
    expect(elemento.querySelector('.modal__fechar')).not.toBeNull();
    expect(elemento.querySelector('.modal__titulo')?.textContent).toContain('Tornar rolagens públicas');
    expect(alternador?.getAttribute('aria-pressed')).toBe('true');

    elemento.querySelector<HTMLButtonElement>('.rolagem-avulso__confirmar-publica')?.click();
    fixture.detectChanges();
    expect(alternador?.getAttribute('aria-pressed')).toBe('false');
  });

  it('pode ser arrastado pelo cabeçalho e permanece dentro do viewport', () => {
    const larguraOriginal = window.innerWidth;
    const { fixture, elemento } = montar();
    const painel = elemento.querySelector<HTMLElement>('.rolagem-avulso')!;
    Object.defineProperty(painel, 'offsetWidth', { configurable: true, value: 360 });
    Object.defineProperty(painel, 'offsetHeight', { configurable: true, value: 220 });
    painel.getBoundingClientRect = () =>
      ({ left: 100, top: 100, width: 360, height: 220, right: 460, bottom: 320 }) as DOMRect;

    elemento.querySelector<HTMLElement>('.rolagem-avulso__cabecalho')?.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 120, clientY: 120, bubbles: true }),
    );
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 250, clientY: 270 }));
    fixture.detectChanges();

    expect(painel.style.left).toBe('230px');
    expect(painel.style.top).toBe('250px');
    expect(painel.classList.contains('rolagem-avulso--posicionada')).toBe(true);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(painel.style.left).toBe('0px');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: larguraOriginal });
  });

  it('rola uma expressão sem ficha e emite o registro privado para o histórico', () => {
    const { fixture, elemento, rolagemService } = montar();
    const registros: unknown[] = [];
    fixture.componentInstance.registrada.subscribe((item) => registros.push(item));
    const campo = elemento.querySelector<HTMLInputElement>('.rolagem-avulso__expressao')!;
    campo.value = '1d6+2';
    campo.dispatchEvent(new Event('input'));
    elemento.querySelector<HTMLFormElement>('.rolagem-avulso__formulario')?.dispatchEvent(
      new Event('submit'),
    );

    expect(rolagemService.registrarAvulso).toHaveBeenCalledWith(12, 31, {
      rotulo: 'Rolagem livre',
      formula: '1d6+2',
      visibilidade: RolagemVisibilidadeEnum.PRIVADA,
      resultado: expect.objectContaining({ total: expect.any(Number) }),
    });
    expect(registros).toHaveLength(1);
  });

  it('confirma a rolagem no botão com um efeito temporário', () => {
    vi.useFakeTimers();
    const { fixture, elemento } = montar();
    const campo = elemento.querySelector<HTMLInputElement>('.rolagem-avulso__expressao')!;
    const botao = elemento.querySelector<HTMLButtonElement>('.rolagem-avulso__rolar')!;
    campo.value = '1d6';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    botao.click();
    fixture.detectChanges();

    expect(botao.classList.contains('rolagem-avulso__rolar--confirmada')).toBe(true);
    expect(botao.textContent).toContain('Rolado');

    vi.advanceTimersByTime(700);
    fixture.detectChanges();
    expect(botao.classList.contains('rolagem-avulso__rolar--confirmada')).toBe(false);
    expect(botao.textContent).toContain('Rolar');
    vi.useRealTimers();
  });

  it('rejeita referências de ficha, porque o avulso não possui atributos, PROF ou NIV', () => {
    const { elemento, rolagemService, notificacaoService } = montar();
    const campo = elemento.querySelector<HTMLInputElement>('.rolagem-avulso__expressao')!;
    campo.value = '1d20+FOR';
    campo.dispatchEvent(new Event('input'));
    elemento.querySelector<HTMLFormElement>('.rolagem-avulso__formulario')?.dispatchEvent(new Event('submit'));

    expect(rolagemService.registrarAvulso).not.toHaveBeenCalled();
    expect(notificacaoService.fila()).toEqual([
      expect.objectContaining({ resumo: 'Expressão sem ficha' }),
    ]);
  });
});
