import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { autenticacaoGuard } from './autenticacao.guard';

/**
 * Prova o guard das áreas privadas (m2-06): libera com sessão aberta e, sem sessão, redireciona
 * ao `/login` guardando o destino em `retorno`.
 */
describe('autenticacaoGuard', () => {
  const CHAVE_SESSAO = 'contratados-rpg.sessao';

  function executar(url: string): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return TestBed.runInInjectionContext(
      () =>
        autenticacaoGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot) as
          | boolean
          | UrlTree,
    );
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('libera a rota quando há sessão', () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ token: 't', id: 1, login: 'a', nome: 'A' }),
    );
    expect(executar('/painel')).toBe(true);
  });

  it('redireciona ao login guardando o destino em retorno', () => {
    const resultado = executar('/painel');
    expect(resultado).toBeInstanceOf(UrlTree);
    const arvore = resultado as UrlTree;
    expect(arvore.root.children['primary'].segments[0].path).toBe('login');
    expect(arvore.queryParams['retorno']).toBe('/painel');
  });
});
