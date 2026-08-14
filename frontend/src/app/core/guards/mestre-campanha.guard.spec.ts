import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaService } from '../../modules/campanha/campanha.service';
import { SessaoService } from '../services/sessao.service';
import { mestreCampanhaGuard } from './mestre-campanha.guard';

describe('mestreCampanhaGuard', () => {
  async function executar(membros: CampanhaMembroResumoDto[] | 'erro', usuarioId = 1): Promise<true | UrlTree> {
    const campanhaService = {
      listarMembros: vi.fn(() => (membros === 'erro' ? throwError(() => new Error('falhou')) : of(membros))),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CampanhaService, useValue: campanhaService },
        { provide: SessaoService, useValue: { usuario: () => ({ id: usuarioId, login: 'agente', nome: 'Agente' }) } },
      ],
    });
    const rota = { paramMap: { get: () => '57' } } as unknown as ActivatedRouteSnapshot;
    const resultado = TestBed.runInInjectionContext(() => mestreCampanhaGuard(rota, {} as RouterStateSnapshot));
    return firstValueFrom(resultado as Observable<true | UrlTree>);
  }

  it('libera o mestre da campanha', async () => {
    const membros: CampanhaMembroResumoDto[] = [
      { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    ];
    expect(await executar(membros)).toBe(true);
  });

  it('redireciona a acesso-negado quem não é mestre', async () => {
    const membros: CampanhaMembroResumoDto[] = [
      { usuarioId: 1, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
      { usuarioId: 2, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    ];
    const resultado = await executar(membros, 1);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/acesso-negado');
  });

  it('redireciona a acesso-negado quando a listagem de membros falha', async () => {
    const resultado = await executar('erro');
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/acesso-negado');
  });
});
