import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import type { ItemFicha } from '../../campanha-equipe.util';
import { EspectadorFichaCard, type EspectadorFichaCardDados } from './espectador-ficha-card.component';

/**
 * Prova o cartão de ficha do Painel do espectador (m8-07): renderiza o recorte esperado (dono,
 * nome, classe, Vida/Energia, reações) sem nenhum controle de escrita, e a faixa "Última rolagem"
 * nas suas duas formas (com/sem rolagem carregada) — nunca "nunca rolou".
 */
describe('EspectadorFichaCard', () => {
  let fixture: ComponentFixture<EspectadorFichaCard>;

  function ficha(sobrescritas: Partial<ItemFicha> = {}): EspectadorFichaCardDados {
    return {
      id: 5,
      usuarioId: 12,
      imagemUrl: null,
      cor: '#ff0000',
      nome: 'Kane',
      classeTexto: 'Combatente - Ranger',
      nivel: 3,
      vidaAtual: 8,
      vidaMaxima: 20,
      energiaAtual: 4,
      energiaMaxima: 10,
      condicoes: [],
      critico: false,
      patenteTexto: 'Recruta',
      defesa: 12,
      esquiva: 10,
      bloqueio: 8,
      contraAtaque: undefined,
      identidadeTexto: null,
      sobrecarregado: false,
      donoNome: 'Matheus',
      ...sobrescritas,
    };
  }

  function rolagem(sobrescritas: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
    return {
      id: 1,
      fichaId: 5,
      encontroCombatenteId: null,
      campanhaId: 8,
      usuarioId: 12,
      nomeAutor: 'Matheus',
      nomeFicha: 'Kane',
      rotulo: '1d20+5',
      formula: '1d20+5',
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { dados: [], atributos: [], constante: 5, total: 17 },
      createdDate: new Date().toISOString(),
      corFicha: '#ff0000',
      ...sobrescritas,
    };
  }

  function montar(
    dados: EspectadorFichaCardDados,
    ultimaRolagem: RolagemResumoDto | null = null,
    ultimaRolagemTempo: string | null = null,
  ) {
    TestBed.configureTestingModule({ imports: [EspectadorFichaCard] });
    fixture = TestBed.createComponent(EspectadorFichaCard);
    fixture.componentRef.setInput('ficha', dados);
    fixture.componentRef.setInput('ultimaRolagem', ultimaRolagem);
    fixture.componentRef.setInput('ultimaRolagemTempo', ultimaRolagemTempo);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra dono, nome, classe e as duas barras de recurso', () => {
    const raiz = montar(ficha());

    expect(raiz.querySelector('.espectador-ficha__dono')?.textContent?.trim()).toBe('Matheus');
    expect(raiz.querySelector('.espectador-ficha__nome')?.textContent?.trim()).toBe('Kane');
    expect(raiz.querySelector('.espectador-ficha__classe')?.textContent?.trim()).toBe(
      'Combatente - Ranger',
    );
    expect(raiz.querySelectorAll('app-barra-recurso')).toHaveLength(2);
  });

  it('mostra Def/Esq/Blo quando presentes, omite Con ausente', () => {
    const raiz = montar(ficha());

    const reacoes = raiz.querySelector('.espectador-ficha__reacoes')?.textContent ?? '';
    expect(reacoes).toContain('Def');
    expect(reacoes).toContain('12');
    expect(reacoes).toContain('Esq');
    expect(reacoes).toContain('10');
    expect(reacoes).toContain('Blo');
    expect(reacoes).toContain('8');
    expect(reacoes).not.toContain('Con');
  });

  it('omite a faixa de reações por completo quando nenhum dos quatro valores existe', () => {
    const raiz = montar(
      ficha({
        defesa: undefined,
        esquiva: undefined,
        bloqueio: undefined,
        contraAtaque: undefined,
      }),
    );
    expect(raiz.querySelector('.espectador-ficha__reacoes')).toBeNull();
  });

  it('mostra rótulo, resultado e tempo relativo da última rolagem quando fornecida', () => {
    const raiz = montar(ficha(), rolagem(), 'há 8s');

    expect(raiz.querySelector('.espectador-ficha__ultima-rolagem-rotulo')?.textContent).toContain(
      'Última rolagem',
    );
    expect(raiz.querySelector('.espectador-ficha__ultima-rolagem-texto')?.textContent).toContain(
      '1d20+5',
    );
    expect(raiz.querySelector('.espectador-ficha__ultima-rolagem-texto')?.textContent).toContain(
      '17',
    );
    expect(raiz.querySelector('.espectador-ficha__ultima-rolagem-tempo')?.textContent).toBe(
      'há 8s',
    );
    expect(raiz.querySelector('.espectador-ficha__ultima-rolagem-vazio')).toBeNull();
  });

  it('mostra "Nenhuma rolagem carregada ainda" — nunca "nunca rolou" — sem rolagem', () => {
    const raiz = montar(ficha(), null);

    expect(raiz.querySelector('.espectador-ficha__ultima-rolagem-vazio')?.textContent).toBe(
      'Nenhuma rolagem carregada ainda',
    );
    expect(raiz.textContent).not.toContain('nunca rolou');
  });

  it('não tem nenhum controle de escrita — sem input, button ou stepper de vitalidade', () => {
    const raiz = montar(ficha());

    expect(raiz.querySelector('input')).toBeNull();
    expect(raiz.querySelector('button')).toBeNull();
  });

  it('sinaliza crítico (vida ≤ 0) na borda do card', () => {
    const raiz = montar(ficha({ critico: true }));
    expect(raiz.querySelector('.espectador-ficha--critico')).not.toBeNull();
  });

  it('não renderiza abrir-ficha nem o gatilho do menu quando mostrarAcoes é false (padrão)', () => {
    const raiz = montar(ficha());
    expect(raiz.querySelector('.espectador-ficha__abrir-ficha')).toBeNull();
    expect(raiz.querySelector('.espectador-ficha__menu-botao')).toBeNull();
  });

  it('renderiza abrir-ficha e o gatilho do menu quando mostrarAcoes é true', () => {
    montar(ficha());
    fixture.componentRef.setInput('mostrarAcoes', true);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.espectador-ficha__abrir-ficha')).not.toBeNull();
    expect(raiz.querySelector('.espectador-ficha__menu-botao')).not.toBeNull();
  });

  it('emite abrirFicha ao clicar no ícone de abrir', () => {
    montar(ficha());
    fixture.componentRef.setInput('mostrarAcoes', true);
    fixture.detectChanges();
    const emitido = vi.fn();
    fixture.componentInstance.abrirFicha.subscribe(emitido);
    (
      fixture.nativeElement.querySelector('.espectador-ficha__abrir-ficha') as HTMLButtonElement
    ).click();
    expect(emitido).toHaveBeenCalled();
  });

  it('emite alternarMenu ao clicar no gatilho "⋯"', () => {
    montar(ficha());
    fixture.componentRef.setInput('mostrarAcoes', true);
    fixture.detectChanges();
    const emitido = vi.fn();
    fixture.componentInstance.alternarMenu.subscribe(emitido);
    (
      fixture.nativeElement.querySelector('.espectador-ficha__menu-botao') as HTMLButtonElement
    ).click();
    expect(emitido).toHaveBeenCalled();
  });
});
