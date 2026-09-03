import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import type { CampanhaPainelEspectadorDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaProjecaoService } from '../../modules/campanha/campanha-projecao.service';
import { espectadorCampanhaGuard } from './espectador-campanha.guard';

const PAINEL: CampanhaPainelEspectadorDto = {
  campanha: { id: 57, nome: 'Contenção', descricao: null, naBase: true },
  rolagens: { itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 },
};

describe('espectadorCampanhaGuard', () => {
  async function executar(resultado: 'ok' | 'erro'): Promise<true | UrlTree> {
    const campanhaProjecaoService = {
      recuperarPainelEspectador: vi.fn(() =>
        resultado === 'erro' ? throwError(() => new Error('falhou')) : of(PAINEL),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CampanhaProjecaoService, useValue: campanhaProjecaoService },
      ],
    });
    const rota = { paramMap: { get: () => '57' } } as unknown as ActivatedRouteSnapshot;
    const valor = TestBed.runInInjectionContext(() =>
      espectadorCampanhaGuard(rota, {} as RouterStateSnapshot),
    );
    return firstValueFrom(valor as Observable<true | UrlTree>);
  }

  it('libera quando o backend aceita a projeção (espectador real ou mestre em prévia)', async () => {
    expect(await executar('ok')).toBe(true);
  });

  it('redireciona a acesso-negado quando o backend recusa (jogador, ou não-membro)', async () => {
    const resultado = await executar('erro');
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/acesso-negado');
  });
});
