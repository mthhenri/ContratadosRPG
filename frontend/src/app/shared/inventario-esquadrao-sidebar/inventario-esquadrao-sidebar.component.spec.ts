import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { CampanhaService } from '../../modules/campanha/campanha.service';
import { FichaService } from '../../modules/ficha/ficha.service';
import { InventarioEsquadraoSidebar } from './inventario-esquadrao-sidebar.component';

describe('InventarioEsquadraoSidebar', () => {
  it('abre e fecha o drawer pelo gatilho e pelo fundo', () => {
    vi.useFakeTimers();
    try {
      TestBed.configureTestingModule({
        imports: [InventarioEsquadraoSidebar],
        providers: [
          { provide: CampanhaService, useValue: {} },
          { provide: FichaService, useValue: { pegarItemInventario: () => of({}) } },
        ],
      });
      const fixture = TestBed.createComponent(InventarioEsquadraoSidebar);
      fixture.componentRef.setInput('campanhaId', 8);
      fixture.componentRef.setInput('itens', []);
      fixture.componentRef.setInput('fichas', []);
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('.inventario-sidebar__gatilho') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.inventario-sidebar__painel')).not.toBeNull();
      expect(fixture.componentRef.instance.aberto()).toBe(true);
      (fixture.nativeElement.querySelector('.inventario-sidebar__fundo') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.componentRef.instance.aberto()).toBe(false);
      expect(fixture.nativeElement.querySelector('.inventario-sidebar__painel')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.inventario-sidebar__painel--saindo')).not.toBeNull();
      vi.advanceTimersByTime(260);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.inventario-sidebar__painel')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
