import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import type { CampanhaPreviaJogadorDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaProjecaoService } from '../../modules/campanha/campanha-projecao.service';
import { previaJogadorCampanhaGuard } from './previa-jogador-campanha.guard';

const PREVIA: CampanhaPreviaJogadorDto = {
  campanha: { id: 57, nome: 'Contenção', descricao: null, naBase: true },
  fichas: [],
  membros: [],
  rolagens: [],
  podeAcessarInventarioEsquadrao: true,
  encontroAtivo: null,
};

describe('previaJogadorCampanhaGuard', () => {
  async function executar(resultado: 'ok' | 'erro'): Promise<true | UrlTree> {
    const campanhaProjecaoService = {
      recuperarPreviaJogador: vi.fn(() =>
        resultado === 'erro' ? throwError(() => new Error('falhou')) : of(PREVIA),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CampanhaProjecaoService, useValue: campanhaProjecaoService },
      ],
    });
    const rota = {
      paramMap: { get: (nome: string) => (nome === 'id' ? '57' : '99') },
    } as unknown as ActivatedRouteSnapshot;
    const valor = TestBed.runInInjectionContext(() =>
      previaJogadorCampanhaGuard(rota, {} as RouterStateSnapshot),
    );
    return firstValueFrom(valor as Observable<true | UrlTree>);
  }

  it('libera quando o backend aceita a projeção (mestre da campanha, alvo JOGADOR ativo)', async () => {
    expect(await executar('ok')).toBe(true);
  });

  it('redireciona a acesso-negado quando o backend recusa (não-mestre, ou alvo não-JOGADOR)', async () => {
    const resultado = await executar('erro');
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/acesso-negado');
  });
});
