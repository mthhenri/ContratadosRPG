import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../services/sessao.service';
import { tipoGuard } from './tipo.guard';

describe('tipoGuard', () => {
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
        tipoGuard([TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER])(
          {} as ActivatedRouteSnapshot,
          { url: '/modulo-em-teste?secao=1' } as RouterStateSnapshot,
        ) as true | UrlTree,
    );
  }

  it.each([TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER])('libera o tipo %s', (tipo) => {
    expect(executar(tipo)).toBe(true);
  });

  it('redireciona uma sessao sem o tipo exigido para acesso negado', () => {
    const resultado = executar(TipoUsuarioEnum.NORMAL);

    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/acesso-negado');
  });

  it('redireciona uma sessao ausente ao login preservando o retorno', () => {
    const resultado = executar(null);

    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe(
      '/login?retorno=%2Fmodulo-em-teste%3Fsecao%3D1',
    );
  });
});
