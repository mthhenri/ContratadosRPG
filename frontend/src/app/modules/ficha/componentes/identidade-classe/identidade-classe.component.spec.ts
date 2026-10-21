import { TestBed } from '@angular/core/testing';

import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';

import { IdentidadeClasse } from './identidade-classe.component';

function montar(classe: ClasseEnum, arquetipo: ArquetipoEnum | null) {
  const fixture = TestBed.createComponent(IdentidadeClasse);
  fixture.componentRef.setInput('classe', classe);
  fixture.componentRef.setInput('arquetipo', arquetipo);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  return {
    raiz,
    texto: raiz.textContent?.replace(/\s+/g, ' ').trim(),
    icones: Array.from(raiz.querySelectorAll('app-icone')).map((icone) => icone.querySelector('svg') !== null),
  };
}

describe('IdentidadeClasse', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [IdentidadeClasse] }));

  it('classe-base e arquétipo: mantém o texto "Classe - Arquétipo" e põe um ícone antes de cada parte', () => {
    const { texto, icones } = montar(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR);
    expect(texto).toBe('Combatente - Lutador');
    expect(icones).toEqual([true, true]);
  });

  it('subclasse de Experimento: classe-base e depois a subclasse', () => {
    const { texto, icones } = montar(ClasseEnum.EXPERIMENTO_BESTIAL, null);
    expect(texto).toBe('Combatente - Experimento Bestial');
    expect(icones).toHaveLength(2);
  });

  it('Civil: um ícone só e nenhum separador', () => {
    const { texto, icones, raiz } = montar(ClasseEnum.CIVIL, null);
    expect(texto).toBe('Civil');
    expect(icones).toHaveLength(1);
    expect(raiz.querySelector('.identidade-classe__separador')).toBeNull();
  });
});
