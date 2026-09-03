import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { RolagemVisibilidadeEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaPainelEspectadorDto, CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaEspectador } from './espectador.page';
import { CampanhaProjecaoService } from '../../campanha-projecao.service';
import { CampanhaService } from '../../campanha.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';

/**
 * Prova o Painel do espectador (m8-03): entrada no painel, visibilidade por papel (espectador vs.
 * mestre em prévia), prepend em tempo real com deduplicação, estados vazio/carregando e a ausência
 * de qualquer controle de escrita no template (fichas, convites, gestão, rolar).
 */
describe('CampanhaEspectador', () => {
  const CAMPANHA_ID = 8;

  function rolagem(sobrescritas: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
    return {
      id: 1,
      fichaId: 3,
      encontroCombatenteId: null,
      campanhaId: CAMPANHA_ID,
      usuarioId: 1,
      nomeAutor: 'Mestre',
      nomeFicha: 'Kane',
      rotulo: '1d20+5',
      formula: '1d20+5',
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { dados: [], atributos: [], constante: 5, total: 17 },
      createdDate: new Date().toISOString(),
      corFicha: null,
      ...sobrescritas,
    };
  }

  function painel(rolagens: RolagemResumoDto[] = [], paginaAtual = 1, totalPaginas = 1): CampanhaPainelEspectadorDto {
    return {
      campanha: { id: CAMPANHA_ID, nome: 'Contenção Delta', descricao: null, naBase: true },
      rolagens: { itens: rolagens, totalItens: rolagens.length, paginaAtual, totalPaginas },
    };
  }

  function montar(opts: {
    painelRetorno?: CampanhaPainelEspectadorDto;
    campanhas?: CampanhaResumoDto[];
  }) {
    const campanhaProjecaoService = {
      recuperarPainelEspectador: vi.fn(() => of(opts.painelRetorno ?? painel())),
    };
    const campanhaService = {
      listarCampanhas: vi.fn(() => of(opts.campanhas ?? [])),
    };
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      rolagemRegistrada$: rolagemRegistrada$.asObservable(),
    };

    TestBed.configureTestingModule({
      imports: [CampanhaEspectador],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => String(CAMPANHA_ID) } } } },
        { provide: CampanhaProjecaoService, useValue: campanhaProjecaoService },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: TempoRealService, useValue: tempoRealService },
      ],
    });

    const fixture = TestBed.createComponent(CampanhaEspectador);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      campanhaProjecaoService,
      campanhaService,
      tempoRealService,
      rolagemRegistrada$,
    };
  }

  it('entra na sala de campanha e carrega o painel — nome, selo e feed', () => {
    const { raiz, tempoRealService, campanhaProjecaoService } = montar({
      painelRetorno: painel([rolagem()]),
    });

    expect(tempoRealService.conectar).toHaveBeenCalled();
    expect(tempoRealService.entrarSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(campanhaProjecaoService.recuperarPainelEspectador).toHaveBeenCalledWith(CAMPANHA_ID, 1, 20);

    expect(raiz.querySelector('.espectador__titulo')?.textContent?.trim()).toBe('Contenção Delta');
    expect(raiz.querySelector('.espectador__selo')?.textContent).toContain('Modo espectador');
    expect(raiz.querySelector('.espectador__item')?.textContent).toContain('1d20+5');
  });

  it('mostra o esqueleto enquanto carrega', () => {
    const campanhaProjecaoService = {
      recuperarPainelEspectador: vi.fn(() => new Subject<CampanhaPainelEspectadorDto>()),
    };
    TestBed.configureTestingModule({
      imports: [CampanhaEspectador],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => String(CAMPANHA_ID) } } } },
        { provide: CampanhaProjecaoService, useValue: campanhaProjecaoService },
        { provide: CampanhaService, useValue: { listarCampanhas: vi.fn(() => of([])) } },
        {
          provide: TempoRealService,
          useValue: {
            conectar: vi.fn(),
            entrarSalaCampanha: vi.fn(),
            sairSalaCampanha: vi.fn(),
            rolagemRegistrada$: new Subject<RolagemResumoDto>().asObservable(),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(CampanhaEspectador);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('.espectador__esqueleto')).not.toBeNull();
    expect(raiz.querySelector('.espectador__item')).toBeNull();
    expect(raiz.querySelector('.espectador__lista')).toBeNull();
  });

  it('mostra o estado vazio quando não há rolagem pública', () => {
    const { raiz } = montar({ painelRetorno: painel([]) });
    expect(raiz.querySelector('app-estado-vazio')).not.toBeNull();
    expect(raiz.querySelector('.espectador__lista')).toBeNull();
  });

  it('espectador real não vê a barra de prévia, e tem "voltar às campanhas"', () => {
    const { raiz } = montar({
      campanhas: [
        { id: CAMPANHA_ID, nome: 'x', descricao: null, papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
          totalMembros: 2, totalFichas: 0, temFichaCritica: false, fichaCriticaNome: null,
          minhaFichaResumo: null, codigoConvite: null, codigoConviteEspectador: null,
          alteradoEm: new Date().toISOString() },
      ],
    });
    expect(raiz.querySelector('.espectador__preview-barra')).toBeNull();
    expect(raiz.querySelector('.espectador__voltar')).not.toBeNull();
  });

  it('mestre em prévia vê a barra inequívoca, com "Sair da visualização" — sem "voltar às campanhas"', () => {
    const { raiz } = montar({
      campanhas: [
        { id: CAMPANHA_ID, nome: 'x', descricao: null, papel: TipoCampanhaMembroPapelEnum.MESTRE,
          totalMembros: 2, totalFichas: 0, temFichaCritica: false, fichaCriticaNome: null,
          minhaFichaResumo: null, codigoConvite: 'ABC', codigoConviteEspectador: 'DEF',
          alteradoEm: new Date().toISOString() },
      ],
    });

    const barra = raiz.querySelector('.espectador__preview-barra');
    expect(barra).not.toBeNull();
    expect(barra?.textContent).toContain('Modo prévia');
    expect(raiz.querySelector('.espectador__preview-sair')?.getAttribute('href')).toBe(
      `/campanhas/${CAMPANHA_ID}`,
    );
    // Mestre em prévia não tem o "voltar às campanhas" genérico — a saída é pela barra.
    expect(raiz.querySelector('.espectador__voltar')).toBeNull();
  });

  it('incorpora rolagem:registrada pública em tempo real, sem duplicar o item que já veio pelo REST', () => {
    const existente = rolagem({ id: 1 });
    const { fixture, raiz, rolagemRegistrada$ } = montar({ painelRetorno: painel([existente]) });

    rolagemRegistrada$.next(existente);
    fixture.detectChanges();
    expect(raiz.querySelectorAll('.espectador__item')).toHaveLength(1);

    const nova = rolagem({ id: 2, rotulo: '2d6+3' });
    rolagemRegistrada$.next(nova);
    fixture.detectChanges();

    const itens = raiz.querySelectorAll('.espectador__item');
    expect(itens).toHaveLength(2);
    expect(itens[0].textContent).toContain('2d6+3');
  });

  it('"Carregar mais" busca a próxima página e acrescenta ao final', () => {
    const { fixture, raiz, campanhaProjecaoService } = montar({
      painelRetorno: painel([rolagem({ id: 1 })], 1, 2),
    });

    campanhaProjecaoService.recuperarPainelEspectador.mockReturnValue(
      of(painel([rolagem({ id: 1 })], 1, 2)),
    );
    expect(raiz.querySelector('.espectador__mais')).not.toBeNull();

    campanhaProjecaoService.recuperarPainelEspectador.mockReturnValue(
      of({
        campanha: { id: CAMPANHA_ID, nome: 'Contenção Delta', descricao: null, naBase: true },
        rolagens: { itens: [rolagem({ id: 2 })], totalItens: 2, paginaAtual: 2, totalPaginas: 2 },
      }),
    );
    (raiz.querySelector('.espectador__mais') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(campanhaProjecaoService.recuperarPainelEspectador).toHaveBeenCalledWith(CAMPANHA_ID, 2, 20);
    expect(raiz.querySelectorAll('.espectador__item')).toHaveLength(2);
    expect(raiz.querySelector('.espectador__mais')).toBeNull();
  });

  it('não tem nenhum controle de escrita — sem card de ficha, convite, gestão de membros ou rolar', () => {
    const { raiz } = montar({ painelRetorno: painel([rolagem()]) });

    expect(raiz.querySelector('.detalhe__ficha-card')).toBeNull();
    expect(raiz.querySelector('.detalhe__codigo')).toBeNull();
    expect(raiz.querySelector('.detalhe__membro-acoes')).toBeNull();
    expect(raiz.querySelector('input')).toBeNull();
    expect(raiz.querySelector('select')).toBeNull();
    expect(raiz.textContent).not.toContain('Rolar');
  });
});
