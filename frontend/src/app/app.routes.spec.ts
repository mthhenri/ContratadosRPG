import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';

/**
 * Prova o roteamento de autenticação (m2-06): as rotas públicas `/login` e `/registro`
 * resolvem (apesar da rota `''` da home coexistir com a `''` que carrega o módulo de
 * autenticação) e a rota privada `/painel` redireciona ao login quando não há sessão.
 */
describe('Rotas — autenticação', () => {
  const CHAVE_SESSAO = 'contratados-rpg.sessao';

  async function navegar(url: string): Promise<{ elemento: HTMLElement; urlFinal: string }> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        MessageService,
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return {
      elemento: harness.routeNativeElement as HTMLElement,
      urlFinal: TestBed.inject(Router).url,
    };
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('resolve a tela pública de login', async () => {
    const { elemento } = await navegar('/login');
    expect(elemento.querySelector('.autenticacao')).not.toBeNull();
  });

  it('resolve a tela pública de registro', async () => {
    const { elemento } = await navegar('/registro');
    expect(elemento.querySelector('.autenticacao')).not.toBeNull();
  });

  it('redireciona /painel ao login quando sem sessão', async () => {
    const { urlFinal } = await navegar('/painel');
    expect(urlFinal).toBe('/login?retorno=%2Fpainel');
  });

  it('libera /painel com sessão aberta (lista de campanhas)', async () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ token: 't', id: 1, login: 'a', nome: 'Agente A' }),
    );
    const { elemento, urlFinal } = await navegar('/painel');
    expect(urlFinal).toBe('/painel');
    expect(elemento.querySelector('.campanhas')).not.toBeNull();
  });
});
