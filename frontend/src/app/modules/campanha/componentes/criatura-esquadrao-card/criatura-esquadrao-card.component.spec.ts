import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import {
  CriaturaEsquadraoCard,
  type CriaturaEsquadraoCardDados,
} from './criatura-esquadrao-card.component';

/**
 * Prova o cartão de criatura da grade "Criaturas" (visão de mestre) — mesmo recorte de verificação
 * do análogo `EspectadorFichaCard`: identidade (registro/nome/classificação), barra de Vida, a
 * linha de reação (só Defesa) e a faixa "Última rolagem" nas duas formas.
 */
describe('CriaturaEsquadraoCard', () => {
  let fixture: ComponentFixture<CriaturaEsquadraoCard>;

  function criatura(sobrescritas: Partial<CriaturaEsquadraoCardDados> = {}): CriaturaEsquadraoCardDados {
    return {
      id: 9,
      usuarioId: 1,
      imagemUrl: null,
      cor: '#7a3b3b',
      nome: 'Aberração',
      registroTexto: 'SCP-049',
      porteTexto: 'Grande',
      comportamentoTexto: 'Caçadora',
      naTexto: 'Média',
      vidaAtual: 20,
      vidaMaxima: 20,
      defesa: 10,
      critico: false,
      ...sobrescritas,
    };
  }

  function rolagem(sobrescritas: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
    return {
      id: 1,
      fichaId: 9,
      encontroCombatenteId: null,
      campanhaId: 8,
      usuarioId: 1,
      nomeAutor: 'Mestre',
      nomeFicha: 'Aberração',
      rotulo: '1d20+2',
      formula: '1d20+2',
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { dados: [], atributos: [], constante: 2, total: 14 },
      createdDate: new Date().toISOString(),
      corFicha: '#7a3b3b',
      ...sobrescritas,
    };
  }

  function montar(
    dados: CriaturaEsquadraoCardDados,
    ultimaRolagem: RolagemResumoDto | null = null,
    ultimaRolagemTempo: string | null = null,
  ) {
    TestBed.configureTestingModule({ imports: [CriaturaEsquadraoCard] });
    fixture = TestBed.createComponent(CriaturaEsquadraoCard);
    fixture.componentRef.setInput('criatura', dados);
    fixture.componentRef.setInput('ultimaRolagem', ultimaRolagem);
    fixture.componentRef.setInput('ultimaRolagemTempo', ultimaRolagemTempo);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra registro, nome, porte/comportamento/NA e a barra de Vida', () => {
    const raiz = montar(criatura());

    expect(raiz.querySelector('.criatura-card__registro')?.textContent?.trim()).toBe('SCP-049');
    expect(raiz.querySelector('.criatura-card__nome')?.textContent?.trim()).toBe('Aberração');
    expect(raiz.querySelector('.criatura-card__classificacao')?.textContent).toContain('Grande');
    expect(raiz.querySelector('.criatura-card__classificacao')?.textContent).toContain('Caçadora');
    expect(raiz.querySelector('.criatura-card__classificacao')?.textContent).toContain('Média');
    expect(raiz.querySelectorAll('app-barra-recurso')).toHaveLength(1);
  });

  it('mostra só Defesa na linha de reação — criatura não tem Esquiva/Bloqueio/Contra-ataque', () => {
    const raiz = montar(criatura());

    const reacoes = raiz.querySelector('.criatura-card__reacoes')?.textContent ?? '';
    expect(reacoes).toContain('Def');
    expect(reacoes).toContain('10');
    expect(reacoes).not.toContain('Esq');
    expect(reacoes).not.toContain('Con');
  });

  it('omite a linha de reação quando a criatura não tem Defesa salva', () => {
    const raiz = montar(criatura({ defesa: undefined }));
    expect(raiz.querySelector('.criatura-card__reacoes')).toBeNull();
  });

  it('mostra rótulo, resultado e tempo relativo da última rolagem quando fornecida', () => {
    const raiz = montar(criatura(), rolagem(), 'há 3min');

    expect(raiz.querySelector('.criatura-card__ultima-rolagem-rotulo')?.textContent).toContain(
      'Última rolagem',
    );
    expect(raiz.querySelector('.criatura-card__ultima-rolagem-texto')?.textContent).toContain('1d20+2');
    expect(raiz.querySelector('.criatura-card__ultima-rolagem-texto')?.textContent).toContain('14');
    expect(raiz.querySelector('.criatura-card__ultima-rolagem-tempo')?.textContent).toBe('há 3min');
    expect(raiz.querySelector('.criatura-card__ultima-rolagem-vazio')).toBeNull();
  });

  it('mostra "Nenhuma rolagem carregada ainda" — nunca "nunca rolou" — sem rolagem', () => {
    const raiz = montar(criatura(), null);

    expect(raiz.querySelector('.criatura-card__ultima-rolagem-vazio')?.textContent).toBe(
      'Nenhuma rolagem carregada ainda',
    );
    expect(raiz.textContent).not.toContain('nunca rolou');
  });

  it('sinaliza crítico (vida ≤ 0) na borda do card', () => {
    const raiz = montar(criatura({ critico: true }));
    expect(raiz.querySelector('.criatura-card--critico')).not.toBeNull();
  });

  it('sempre renderiza abrir-ficha e o gatilho do menu "⋯" (grade só existe na visão de mestre)', () => {
    const raiz = montar(criatura());
    expect(raiz.querySelector('.criatura-card__abrir-ficha')).not.toBeNull();
    expect(raiz.querySelector('.criatura-card__menu-botao')).not.toBeNull();
  });

  it('emite abrirFicha ao clicar no ícone de abrir', () => {
    montar(criatura());
    const emitido = vi.fn();
    fixture.componentInstance.abrirFicha.subscribe(emitido);
    (
      fixture.nativeElement.querySelector('.criatura-card__abrir-ficha') as HTMLButtonElement
    ).click();
    expect(emitido).toHaveBeenCalled();
  });

  it('emite alternarMenu ao clicar no gatilho "⋯"', () => {
    montar(criatura());
    const emitido = vi.fn();
    fixture.componentInstance.alternarMenu.subscribe(emitido);
    (
      fixture.nativeElement.querySelector('.criatura-card__menu-botao') as HTMLButtonElement
    ).click();
    expect(emitido).toHaveBeenCalled();
  });
});
