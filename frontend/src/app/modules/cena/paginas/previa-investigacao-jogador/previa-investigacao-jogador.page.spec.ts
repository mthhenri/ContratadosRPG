import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import type { CampanhaPreviaJogadorDto } from '@contratados-rpg/shared/dtos/campanha';
import type { CenaRecuperadaDto } from '@contratados-rpg/shared/dtos/cena';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';
import { CenaStatusEnum, CenaTipoEnum, TipoCampanhaMembroPapelEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { CampanhaProjecaoService } from '../../../campanha/campanha-projecao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { PreviaInvestigacaoJogador } from './previa-investigacao-jogador.page';

describe('PreviaInvestigacaoJogador', () => {
  const previa = (acessoCompleto = true) => ({
    campanha: { id: 9, nome: 'Campanha' },
    membros: [
      { usuarioId: 7, nome: 'Bia', papel: TipoCampanhaMembroPapelEnum.JOGADOR,
        fichas: [{ id: 20, nome: 'Própria', acessoCompleto: true }] },
      { usuarioId: 8, nome: 'Ana', papel: TipoCampanhaMembroPapelEnum.JOGADOR,
        fichas: [{ id: 30, nome: 'Colega', acessoCompleto }] },
    ],
    fichas: [
      { id: 20, usuarioId: 7, tipo: TipoFichaEnum.JOGADOR },
      { id: 30, usuarioId: 8, tipo: TipoFichaEnum.JOGADOR },
    ],
    rolagens: [], podeAcessarInventarioEsquadrao: false, encontroAtivo: null,
  }) as unknown as CampanhaPreviaJogadorDto;
  const cena = (nome = 'Cena atual') => ({
    id: 50, campanhaId: 9, nome, tipo: CenaTipoEnum.INVESTIGACAO,
    status: CenaStatusEnum.ATIVA, encontro: null,
  }) as CenaRecuperadaDto;

  const montar = (acessoCompleto = true) => {
    const eventos = {
      acessoRevogado$: new Subject<{ fichaId: number; usuarioId: number }>(),
      fichaCriada$: new Subject<unknown>(), membroEntrou$: new Subject<unknown>(),
      fichaVisibilidadeAlterada$: new Subject<unknown>(),
      fichaRemovidaDaCampanha$: new Subject<unknown>(),
      fichaRecortesAlterados$: new Subject<unknown>(), fichaAlterada$: new Subject<unknown>(),
      rolagemRegistrada$: new Subject<unknown>(), rolagemExcluida$: new Subject<unknown>(),
      cenaAlterada$: new Subject<{ campanhaId: number }>(), reconexao$: new Subject<void>(),
    };
    const projecao = {
      recuperarPreviaJogador: vi.fn(() => of(previa(acessoCompleto))),
      recuperarCenaAtivaPainelEspectador: vi.fn(() => of(cena())),
      recuperarFichaPreviaJogador: vi.fn(() => of({ id: 20, nome: 'Própria', dados: {} } as FichaRecuperadaDto)),
    };
    const tempoReal = {
      ...eventos, conectar: vi.fn(), entrarSalaCampanha: vi.fn(), sairSalaCampanha: vi.fn(),
      entrarSalaFicha: vi.fn(), sairSalaFicha: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [PreviaInvestigacaoJogador],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: convertToParamMap({ id: '9', usuarioAlvoId: '7' }),
          data: { previaJogador: previa(acessoCompleto) },
        } } },
        { provide: CampanhaProjecaoService, useValue: projecao },
        { provide: TempoRealService, useValue: tempoReal },
        { provide: TopbarContextoService, useValue: { definir: vi.fn(), limpar: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(PreviaInvestigacaoJogador, {
      set: { template: '', imports: [] },
    });
    const fixture = TestBed.createComponent(PreviaInvestigacaoJogador);
    fixture.detectChanges();
    const estado = fixture.componentInstance as unknown as {
      cena: () => CenaRecuperadaDto | null;
      fichaModalId: () => number | null;
      fichaModal: () => FichaRecuperadaDto | null;
      abrirFicha: (id: number) => void;
    };
    return { fixture, estado, projecao, eventos };
  };

  it('usa apenas projeções seguras para a cena e a própria ficha do alvo', () => {
    const { projecao } = montar();
    expect(projecao.recuperarCenaAtivaPainelEspectador).toHaveBeenCalledWith(9);
    expect(projecao.recuperarFichaPreviaJogador).toHaveBeenCalledWith(9, 7, 20);
  });

  it('não abre carteirinha sem concessão', () => {
    const { estado, projecao } = montar(false);
    estado.abrirFicha(30);
    expect(estado.fichaModalId()).toBeNull();
    expect(projecao.recuperarFichaPreviaJogador).not.toHaveBeenCalledWith(9, 7, 30);
  });

  it('revogação fecha a ficha alheia e descarta resposta de abertura atrasada', () => {
    const { estado, projecao, eventos } = montar();
    const pendente = new Subject<FichaRecuperadaDto>();
    projecao.recuperarFichaPreviaJogador.mockReturnValueOnce(pendente);
    estado.abrirFicha(30);
    expect(estado.fichaModalId()).toBe(30);
    projecao.recuperarPreviaJogador.mockReturnValue(of(previa(false)));
    eventos.acessoRevogado$.next({ fichaId: 30, usuarioId: 7 });
    pendente.next({ id: 30, nome: 'Colega' } as FichaRecuperadaDto);
    expect(estado.fichaModalId()).toBeNull();
    expect(estado.fichaModal()).toBeNull();
  });

  it('troca de cena descarta a resposta anterior', () => {
    const { estado, projecao, eventos } = montar();
    const antiga = new Subject<CenaRecuperadaDto>();
    const atual = new Subject<CenaRecuperadaDto>();
    projecao.recuperarCenaAtivaPainelEspectador.mockReturnValueOnce(antiga)
      .mockReturnValueOnce(atual);
    eventos.cenaAlterada$.next({ campanhaId: 9 });
    eventos.cenaAlterada$.next({ campanhaId: 9 });
    atual.next(cena('Nova'));
    antiga.next(cena('Antiga'));
    expect(estado.cena()?.nome).toBe('Nova');
  });
});
