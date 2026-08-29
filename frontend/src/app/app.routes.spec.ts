import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';

/**
 * Prova o roteamento de autenticação (m2-06): as rotas públicas `/login` e `/registro`
 * resolvem (apesar da rota `''` da home coexistir com a `''` que carrega o módulo de
 * autenticação) e a rota privada `/campanhas` redireciona ao login quando não há sessão.
 */
describe('Rotas — autenticação', () => {
  const CHAVE_SESSAO = 'contratados-rpg.sessao';

  async function navegar(url: string): Promise<{ elemento: HTMLElement; urlFinal: string }> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
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

  it('expõe a simulação na rota pública /simulacao', () => {
    const rota = routes.find((candidata) => candidata.path === 'simulacao');

    expect(rota).toBeDefined();
    expect(rota?.loadChildren).toBeDefined();
    expect(routes.some((candidata) => candidata.path === 'calculadora')).toBe(false);
  });

  it('resolve a tela pública de login', async () => {
    const { elemento } = await navegar('/login');
    expect(elemento.querySelector('.autenticacao')).not.toBeNull();
  });

  it('resolve a tela pública de registro', async () => {
    const { elemento } = await navegar('/registro');
    expect(elemento.querySelector('.autenticacao')).not.toBeNull();
  });

  it('redireciona /campanhas ao login quando sem sessão', async () => {
    const { urlFinal } = await navegar('/campanhas');
    expect(urlFinal).toBe('/login?retorno=%2Fcampanhas');
  });

  it('libera /campanhas com sessão aberta (lista de campanhas)', async () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ token: 't', id: 1, login: 'a', nome: 'Agente A' }),
    );
    const { elemento, urlFinal } = await navegar('/campanhas');
    expect(urlFinal).toBe('/campanhas');
    expect(elemento.querySelector('.campanhas')).not.toBeNull();
  });

  it('redireciona /perfil ao login quando sem sessão', async () => {
    const { urlFinal } = await navegar('/perfil');
    expect(urlFinal).toBe('/login?retorno=%2Fperfil');
  });

  it('libera /perfil com sessão aberta (tela de perfil)', async () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ token: 't', id: 1, login: 'a', nome: 'Agente A' }),
    );
    const { elemento, urlFinal } = await navegar('/perfil');
    expect(urlFinal).toBe('/perfil');
    expect(elemento.querySelector('.perfil')).not.toBeNull();
  });

  it('redireciona a criação de ficha ao login quando sem sessão', async () => {
    const { urlFinal } = await navegar('/campanhas/1/ficha/nova');
    expect(urlFinal).toBe('/login?retorno=%2Fcampanhas%2F1%2Fficha%2Fnova');
  });

  it('libera a criação de ficha com sessão aberta', async () => {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ token: 't', id: 1, login: 'a', nome: 'Agente A' }),
    );
    const { elemento, urlFinal } = await navegar('/campanhas/1/ficha/nova');
    expect(urlFinal).toBe('/campanhas/1/ficha/nova');
    expect(elemento.querySelector('.ficha-pagina')).not.toBeNull();
  });

  it('não mantém rota nem redirecionamento de compatibilidade para /painel', () => {
    expect(routes.some((candidata) => candidata.path?.startsWith('painel'))).toBe(false);
  });
});
