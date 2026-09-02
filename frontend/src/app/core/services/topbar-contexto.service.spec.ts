import { TestBed } from '@angular/core/testing';

import { TopbarContextoService } from './topbar-contexto.service';

/**
 * Prova o serviço de contexto da topbar (ui-21): começa vazio, `definir()` publica o rótulo,
 * `limpar()` devolve `null` — a única API que as páginas donas de entidade (campanha/ficha) usam.
 */
describe('TopbarContextoService', () => {
  function criar(): TopbarContextoService {
    TestBed.configureTestingModule({});
    return TestBed.inject(TopbarContextoService);
  }

  it('começa sem contexto', () => {
    expect(criar().contexto()).toBeNull();
  });

  it('definir() publica o rótulo', () => {
    const servico = criar();
    servico.definir('Campanha Alfa');
    expect(servico.contexto()).toBe('Campanha Alfa');
  });

  it('limpar() devolve ao estado vazio', () => {
    const servico = criar();
    servico.definir('Campanha Alfa');
    servico.limpar();
    expect(servico.contexto()).toBeNull();
  });
});
