import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import type { FichaAcessoRevogadoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { SessaoService } from '../../../../core/services/sessao.service';
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
  const USUARIO_ID = 7;

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
    const acessoRevogado$ = new Subject<FichaAcessoRevogadoDto>();
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
      acessoRevogado$: acessoRevogado$.asObservable(),
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
        { provide: SessaoService, useValue: { usuario: () => ({ id: USUARIO_ID }) } },
      ],
    });
    const fixture = TestBed.createComponent(HistoricoRolagensJanela);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      rolagemService,
      reconexao$,
      acessoRevogado$,
    };
  }

  it('acesso revogado ou suspenso por ocultação esvazia a janela e ignora a página em voo', () => {
    const { fixture, raiz, rolagemService, reconexao$, acessoRevogado$ } = montar();
    expect(raiz.querySelector('.historico-janela__erro')).toBeNull();

    acessoRevogado$.next({ fichaId: FICHA_ID, usuarioId: 99 });
    acessoRevogado$.next({ fichaId: 1, usuarioId: USUARIO_ID });
    fixture.detectChanges();
    expect(raiz.querySelector('.historico-janela__erro')).toBeNull();

    const pagina$ = new Subject<{ itens: RolagemResumoDto[]; totalItens: number; paginaAtual: number; totalPaginas: number }>();
    rolagemService.listarPorFicha.mockReturnValue(pagina$.asObservable() as never);
    reconexao$.next();
    acessoRevogado$.next({ fichaId: FICHA_ID, usuarioId: USUARIO_ID });
    pagina$.next({ itens: [rolagem(2)], totalItens: 1, paginaAtual: 1, totalPaginas: 1 });
    fixture.detectChanges();

    expect(raiz.querySelector('.historico-janela__erro')?.textContent).toContain(
      'Não foi possível acessar esta ficha.',
    );
    expect(fixture.componentInstance['itens']()).toEqual([]);
    expect(fixture.componentInstance['contexto']()).toBe('Ficha');
  });

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
