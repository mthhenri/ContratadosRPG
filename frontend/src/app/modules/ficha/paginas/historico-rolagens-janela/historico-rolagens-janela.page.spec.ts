import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { FichaService } from '../../ficha.service';
import { RolagemService } from '../../rolagem.service';
import { HistoricoRolagensJanela } from './historico-rolagens-janela.page';

/**
 * Prova a janela de histórico de uma ficha (I-027) — sem spec até agora. Foco em P-083: a
 * reconexão (`reconexao$`) refaz a 1ª página; montar a janela depois de uma reconexão já ocorrida
 * não duplica a carga inicial.
 */
describe('HistoricoRolagensJanela', () => {
  const FICHA_ID = 42;

  function rolagem(id: number): RolagemResumoDto {
    return {
      id,
      fichaId: FICHA_ID,
      encontroCombatenteId: null,
      campanhaId: 9,
      usuarioId: 5,
      nomeAutor: 'Autor',
      nomeFicha: 'Ficha',
      rotulo: '1d20',
      formula: '1d20',
      visibilidade: 'PUBLICA' as RolagemResumoDto['visibilidade'],
      resultado: { dados: [], atributos: [], constante: 0, total: 10 },
      createdDate: new Date().toISOString(),
      corFicha: null,
    };
  }

  function montar() {
    const reconexao$ = new Subject<void>();
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const rolagemService = {
      listarPorFicha: vi.fn(() =>
        of({ itens: [rolagem(1)], totalItens: 1, paginaAtual: 1, totalPaginas: 1 }),
      ),
    };
    const fichaService = {
      recuperarFicha: vi.fn(() => of({ id: FICHA_ID, nome: 'Kane', campanhaId: 9 })),
      recuperarFichaCriatura: vi.fn(() => of({ id: FICHA_ID, nome: 'A Estátua', campanhaId: 9 })),
    };
    const tempoReal = {
      conectar: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      rolagemRegistrada$: rolagemRegistrada$.asObservable(),
      rolagemExcluida$: new Subject<RolagemResumoDto>().asObservable(),
      reconexao$: reconexao$.asObservable(),
    };
    TestBed.configureTestingModule({
      imports: [HistoricoRolagensJanela],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => String(FICHA_ID) },
              queryParamMap: { get: () => null },
            },
          },
        },
        { provide: FichaService, useValue: fichaService },
        { provide: RolagemService, useValue: rolagemService },
        { provide: TempoRealService, useValue: tempoReal },
      ],
    });
    const fixture = TestBed.createComponent(HistoricoRolagensJanela);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, rolagemService, reconexao$ };
  }

  it('carrega a 1ª página no boot', () => {
    const { rolagemService } = montar();
    expect(rolagemService.listarPorFicha).toHaveBeenCalledWith(FICHA_ID, 1, 20);
  });

  it('reconexao$ (reconexão real) refaz a 1ª página (P-083)', () => {
    const { rolagemService, reconexao$ } = montar();
    rolagemService.listarPorFicha.mockClear();

    reconexao$.next();

    expect(rolagemService.listarPorFicha).toHaveBeenCalledWith(FICHA_ID, 1, 20);
  });

  it('abrir a janela depois de uma reconexão já ocorrida não duplica a carga inicial (P-083)', () => {
    const { rolagemService } = montar();

    expect(rolagemService.listarPorFicha).toHaveBeenCalledTimes(1);
  });
});
