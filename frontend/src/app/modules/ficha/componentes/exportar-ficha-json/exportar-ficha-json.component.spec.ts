import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { TipoFichaEnum, TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaArquivoJsonService } from '../../ficha-arquivo-json.service';
import { ExportarFichaJson } from './exportar-ficha-json.component';

describe('ExportarFichaJson (cabeçalho da ficha)', () => {
  function montar(tipoUsuario: TipoUsuarioEnum) {
    const arquivoJson = { exportar: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({
      imports: [ExportarFichaJson],
      providers: [
        { provide: FichaArquivoJsonService, useValue: arquivoJson },
        { provide: SessaoService, useValue: { usuario: () => ({ id: 1, tipo: tipoUsuario }) } },
      ],
    });
    const fixture = TestBed.createComponent(ExportarFichaJson);
    fixture.componentRef.setInput('fichaId', 12);
    fixture.componentRef.setInput('tipo', TipoFichaEnum.CRIATURA);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, arquivoJson };
  }

  it('não aparece para quem não é administrador', () => {
    const { raiz } = montar(TipoUsuarioEnum.NORMAL);

    expect(raiz.querySelector('button')).toBeNull();
  });

  it('admin abre "Exportar" e cada item exporta a ficha no modo escolhido', () => {
    const { fixture, raiz, arquivoJson } = montar(TipoUsuarioEnum.ADMIN);
    const gatilho = raiz.querySelector<HTMLButtonElement>('button')!;
    expect(gatilho.textContent).toContain('Exportar');

    for (const [indice, modo] of [[0, 'copiar'], [1, 'baixar']] as const) {
      gatilho.click();
      fixture.detectChanges();
      raiz.querySelectorAll<HTMLElement>('[role="menuitem"]')[indice].click();
      fixture.detectChanges();
      expect(arquivoJson.exportar).toHaveBeenLastCalledWith(12, TipoFichaEnum.CRIATURA, modo);
    }
  });
});
