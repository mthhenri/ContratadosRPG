import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { EncontroService } from '../encontro/encontro.service';
import { routes } from '../../app.routes';
import { redirecionarEncontroParaCena } from './redirecionar-encontro-para-cena';

/**
 * Prova o redirect das URLs da antiga tela "Iniciativa" (m7-23): o combate do histórico
 * (`/iniciativa/:encontroId`) vai para a cena dona do encontro, resolvida no backend; se a consulta
 * falha, o hub. A rota sem id é um `redirectTo` estático, provado pela própria tabela de rotas.
 */
describe('redirecionarEncontroParaCena', () => {
  function executar(recuperarEncontro: () => Observable<unknown>): Promise<string> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: EncontroService, useValue: { recuperarEncontro } }],
    });
    const resultado = TestBed.runInInjectionContext(() =>
      redirecionarEncontroParaCena({
        params: { campanhaId: '9', encontroId: '13' },
      } as never),
    ) as Observable<UrlTree>;
    return firstValueFrom(resultado).then((arvore) => TestBed.inject(Router).serializeUrl(arvore));
  }

  it('leva o combate do histórico à cena dona do encontro', async () => {
    const recuperar = vi.fn(() => of({ id: 13, cenaId: 44 }));

    await expect(executar(recuperar)).resolves.toBe('/campanhas/9/cenas/44');
    expect(recuperar).toHaveBeenCalledWith(13);
  });

  it('encontro inexistente ou de cena que o usuário não vê (403/404): cai no hub', async () => {
    await expect(executar(() => throwError(() => new Error('403')))).resolves.toBe(
      '/campanhas/9/cenas',
    );
  });

  it('a tabela de rotas manda `/iniciativa` ao hub e `/iniciativa/:id` ao redirect acima', () => {
    const mesa = routes.find((rota) => rota.path === 'campanhas/:campanhaId/iniciativa');
    const historico = routes.find(
      (rota) => rota.path === 'campanhas/:campanhaId/iniciativa/:encontroId',
    );

    expect(mesa).toEqual(
      expect.objectContaining({ pathMatch: 'full', redirectTo: 'campanhas/:campanhaId/cenas' }),
    );
    expect(historico?.redirectTo).toBe(redirecionarEncontroParaCena);
  });
});
