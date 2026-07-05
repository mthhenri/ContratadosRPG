import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { calculadoraRoutes } from './calculadora.routes';

/**
 * Prova de que as 6 rotas lazy da calculadora resolvem, que o deep-link por rota funciona e
 * que a aba correspondente à URL fica ativa (paridade com o `switchTab`/`VALID_TABS` do site
 * antigo, agora dirigido pela URL em vez do hash).
 */
describe('Calculadora — roteamento', () => {
  const abas = [
    { url: '/agente', titulo: 'Agente / Civil' },
    { url: '/dt', titulo: 'DT' },
    { url: '/novo-agente', titulo: 'Novo Agente' },
    { url: '/patente', titulo: 'Patentes' },
    { url: '/descanso', titulo: 'Descanso' },
    { url: '/compras', titulo: 'Compras' },
  ];

  async function navegar(url: string): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter(calculadoraRoutes)] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness.routeNativeElement as HTMLElement;
  }

  it('redireciona a base para a aba agente', async () => {
    const raiz = await navegar('/');
    expect(raiz.querySelector('.stub-pagina__titulo')?.textContent).toContain('Agente / Civil');
  });

  for (const aba of abas) {
    it(`carrega a página lazy e ativa a aba de ${aba.url}`, async () => {
      const raiz = await navegar(aba.url);
      expect(raiz.querySelector('.stub-pagina__titulo')?.textContent).toContain(aba.titulo);
      expect(raiz.querySelector('.abas__item--ativo')?.textContent).toContain(aba.titulo);
    });
  }
});
