import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../services/sessao.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  function executar(tipo: TipoUsuarioEnum | null): true | UrlTree {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessaoService,
          useValue: {
            usuario: () =>
              tipo
                ? { token: 'jwt', id: 1, login: 'agente', nome: 'Agente', tipo }
                : null,
          },
        },
      ],
    });
    return TestBed.runInInjectionContext(
      () =>
        adminGuard(
          {} as ActivatedRouteSnapshot,
          { url: '/admin/usuarios' } as RouterStateSnapshot,
        ) as true | UrlTree,
    );
  }

  it('libera a gestão para administrador', () => {
    expect(executar(TipoUsuarioEnum.ADMIN)).toBe(true);
  });

  it.each([TipoUsuarioEnum.NORMAL, TipoUsuarioEnum.TESTER, null])(
    'redireciona %s ao painel',
    (tipo) => {
      const resultado = executar(tipo);
      expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/painel');
    },
  );
});
