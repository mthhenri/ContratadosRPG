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
  // Abas com página real: agente (m1-07); dt, novo-agente e patente (m1-08); descanso (m1-09);
  // compras (m1-10). Todas montam a raiz `.calc` e ativam sua aba. `agente` é validada à parte
  // por ser o redirect da base.
  const abasReais = [
    { url: '/dt', tituloAba: 'DT' },
    { url: '/novo-agente', tituloAba: 'Novo Agente' },
    { url: '/patente', tituloAba: 'Patentes' },
    { url: '/descanso', tituloAba: 'Descanso' },
    { url: '/compras', tituloAba: 'Compras' },
  ];

  async function navegar(url: string): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter(calculadoraRoutes)] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness.routeNativeElement as HTMLElement;
  }

  it('redireciona a base para a aba agente (página real)', async () => {
    const raiz = await navegar('/');
    expect(raiz.querySelector('.agente')).not.toBeNull();
    expect(raiz.querySelector('.abas__item--ativo')?.textContent).toContain('Agente / Civil');
  });

  it('carrega a página real do agente e ativa sua aba', async () => {
    const raiz = await navegar('/agente');
    expect(raiz.querySelector('.agente')).not.toBeNull();
    expect(raiz.querySelector('.abas__item--ativo')?.textContent).toContain('Agente / Civil');
  });

  for (const aba of abasReais) {
    it(`carrega a página real e ativa a aba de ${aba.url}`, async () => {
      const raiz = await navegar(aba.url);
      expect(raiz.querySelector('.calc')).not.toBeNull();
      expect(raiz.querySelector('.abas__item--ativo')?.textContent).toContain(aba.tituloAba);
    });
  }
});
