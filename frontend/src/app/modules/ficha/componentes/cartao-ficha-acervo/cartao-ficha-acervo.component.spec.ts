import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { CartaoFichaAcervo, type ItemAcervo } from './cartao-ficha-acervo.component';

/** Prova o cartão único do acervo (m4-11): recorte de meta/vitais por tipo e o link por tipo. */
describe('CartaoFichaAcervo', () => {
  const itemAgente: ItemAcervo = {
    id: 1,
    tipo: TipoFichaEnum.JOGADOR,
    nome: 'Kane',
    cor: null,
    imagemUrl: null,
    campanhaId: null,
    campanhaNome: null,
    vidaAtual: 34,
    vidaMaxima: 34,
    classeTexto: 'Combatente - Lutador',
    nivel: 2,
    patenteTexto: 'Recruta',
    energiaAtual: 18,
    energiaMaxima: 18,
  };

  const itemCriatura: ItemAcervo = {
    id: 2,
    tipo: TipoFichaEnum.CRIATURA,
    nome: 'A Estátua',
    cor: null,
    imagemUrl: null,
    campanhaId: null,
    campanhaNome: null,
    vidaAtual: 1050,
    vidaMaxima: 1050,
    naTexto: 'Média',
    vd: 30,
    defesa: 30,
  };

  function montar(item: ItemAcervo) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CartaoFichaAcervo],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(CartaoFichaAcervo);
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  it('agente: mostra classe, arquétipo/subclasse, nível e Patente — e Vida/Energia', () => {
    const { raiz } = montar(itemAgente);

    expect(raiz.textContent).toContain('Combatente - Lutador · Nível 2 · Recruta');
    expect(raiz.textContent).toContain('Vida 34/34');
    expect(raiz.textContent).toContain('Energia 18/18');
    expect(raiz.querySelector('.acervo__cartao-link')?.getAttribute('href')).toBe('/fichas/1');
  });

  it('criatura: mostra Ameaça, NA, VD, Vida e Defesa — sem classe/nível/patente/energia', () => {
    const { raiz } = montar(itemCriatura);

    expect(raiz.textContent).toContain('Ameaça · NA Média · VD 30');
    expect(raiz.textContent).toContain('Vida 1050/1050');
    expect(raiz.textContent).toContain('Defesa 30');
    expect(raiz.textContent).not.toContain('Energia');
    expect(raiz.querySelector('.acervo__cartao-link')?.getAttribute('href')).toBe('/fichas/criatura/2');
  });

  it('campos ausentes caem em "—" (vidaMaxima/vd/defesa)', () => {
    const { raiz } = montar({ ...itemCriatura, vidaMaxima: undefined, vd: undefined, defesa: undefined });

    expect(raiz.textContent).toContain('Vida 1050/—');
    expect(raiz.textContent).toContain('VD —');
    expect(raiz.textContent).toContain('Defesa —');
  });

  it('mostra o chip "Sem campanha" quando solta, e o chip de campanha quando atribuída', () => {
    const { raiz: raizSolta } = montar(itemAgente);
    expect(raizSolta.querySelector('.acervo__chip')?.textContent).toContain('Sem campanha');

    const { raiz: raizAtribuida } = montar({ ...itemAgente, campanhaId: 9, campanhaNome: 'Operação Alfa' });
    expect(raizAtribuida.querySelector('.acervo__chip--campanha')?.textContent).toContain('Operação Alfa');
  });

  it('emite o MouseEvent do kebab clicado, sem abrir o menu por conta própria', () => {
    const { fixture, raiz } = montar(itemAgente);
    const espiao = vi.fn();
    fixture.componentRef.instance.menu.subscribe(espiao);

    (raiz.querySelector('.acervo__menu-botao') as HTMLButtonElement).click();

    expect(espiao).toHaveBeenCalledTimes(1);
  });
});
