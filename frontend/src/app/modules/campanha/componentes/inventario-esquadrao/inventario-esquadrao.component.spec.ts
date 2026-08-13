import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';

import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { InventarioEsquadrao } from './inventario-esquadrao.component';

describe('InventarioEsquadrao', () => {
  let fixture: ComponentFixture<InventarioEsquadrao>;
  const campanhaService = {
    adicionarItemInventario: vi.fn(() => of({ itens: [] })),
    ajustarQuantidadeItemInventario: vi.fn(() => of({ itens: [] })),
    removerItemInventario: vi.fn(() => of({ itens: [] })),
  };
  const fichaService = { pegarItemInventario: vi.fn(() => of({ id: 3 })) };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InventarioEsquadrao],
      providers: [
        { provide: CampanhaService, useValue: campanhaService },
        { provide: FichaService, useValue: fichaService },
      ],
    });
    fixture = TestBed.createComponent(InventarioEsquadrao);
    fixture.componentRef.setInput('campanhaId', 8);
    fixture.componentRef.setInput('itens', []);
    fixture.componentRef.setInput('fichas', [{ id: 3, nome: 'Vera' }]);
    fixture.componentRef.setInput('bloqueado', false);
    fixture.detectChanges();
  });

  it('orienta a adicionar quando o inventário está vazio', () => {
    expect(fixture.nativeElement.textContent).toContain('Nenhum item armazenado');
    expect(fixture.nativeElement.querySelector('.inventario-esquadrao__adicionar')).not.toBeNull();
  });

  it('lista item e encaminha ajuste, remoção e transferência', () => {
    fixture.componentRef.setInput('itens', [{
      id: 'item-1', nome: 'Kit médico', categoria: ItemCategoriaEnum.MEDICINAL,
      custo: 2, peso: 1, quantidade: 2,
    }]);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Kit médico');
    (raiz.querySelector('[aria-label="Aumentar quantidade de Kit médico"]') as HTMLButtonElement).click();
    (raiz.querySelector('[aria-label="Remover Kit médico"]') as HTMLButtonElement).click();
    (raiz.querySelector('.inventario-esquadrao__pegar') as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('.inventario-esquadrao__confirmar') as HTMLButtonElement).click();

    expect(campanhaService.ajustarQuantidadeItemInventario).toHaveBeenCalledWith(8, 'item-1', 1);
    expect(campanhaService.removerItemInventario).toHaveBeenCalledWith(8, 'item-1');
    expect(fichaService.pegarItemInventario).toHaveBeenCalledWith(3, 'item-1', 2);
  });

  it('bloqueia as ações do jogador durante a missão', () => {
    fixture.componentRef.setInput('bloqueado', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('indisponível durante a missão');
    expect(fixture.nativeElement.querySelector('.inventario-esquadrao__adicionar')).toBeNull();
  });
});
