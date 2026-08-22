import { TestBed } from '@angular/core/testing';

import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';

import { BandejaDados } from './bandeja-dados.component';
import { BandejaDadosService } from './bandeja-dados.service';

describe('BandejaDados', () => {
  it.each([
    [RolagemVisibilidadeEnum.PRIVADA, 'Privada', 'olho-fechado'],
    [RolagemVisibilidadeEnum.PUBLICA, 'Pública', 'olho'],
  ])('identifica a carta como %s', (visibilidade, rotulo, icone) => {
    const fixture = TestBed.createComponent(BandejaDados);
    TestBed.inject(BandejaDadosService).mostrar({
      rotulo: 'Teste',
      visibilidade,
      resultado: { dados: [], atributos: [], constante: 7, total: 7 },
    });
    fixture.detectChanges();

    const selo = (fixture.nativeElement as HTMLElement).querySelector('.bandeja__visibilidade');
    expect(selo?.textContent).toContain(rotulo);
    expect(selo?.querySelector(`app-icone`)).not.toBeNull();
    expect(selo?.getAttribute('data-icone')).toBe(icone);
  });
});
