import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';
import { ApplicationRef, signal } from '@angular/core';
import { RolagemVisibilidadeEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto, CampanhaRecuperadaDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaDetalheDadosService } from './campanha-detalhe-dados.service';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';

/**
 * Prova o serviço de dado/tempo real compartilhado extraído do antigo `CampanhaDetalhe`
 * (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 1) — fetch inicial, `ehMestre`
 * derivado dos membros, recarregar após ação local e reação a eventos de socket.
 */
describe('CampanhaDetalheDadosService', () => {
  const CAMPANHA_ID = 8;

  const campanhaBase: CampanhaRecuperadaDto = {
    id: CAMPANHA_ID,
    nome: 'Contenção Delta',
    descricao: 'Operação em curso',
    codigoConvite: 'DEF456',
    codigoConviteEspectador: 'ESP456',
    naBase: true,
  };

  function membrosCom(usuarioId: number, papel: TipoCampanhaMembroPapelEnum): CampanhaMembroResumoDto[] {
    return [{ usuarioId, nome: 'Agente', papel, fichas: [] }];
  }

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

  function montar(opts: {
    usuarioId: number;
    membros: CampanhaMembroResumoDto[];
    fichas?: FichaResumoDto[];
    rolagens?: RolagemResumoDto[];
  }) {
    const campanhaService = {
      recuperarCampanha: vi.fn(() => of({ ...campanhaBase })),
      listarMembros: vi.fn(() => of(opts.membros)),
      recuperarInventario: vi.fn(() => of({ itens: [] })),
      alterarEstado: vi.fn((_id: number, naBase: boolean) => of({ id: CAMPANHA_ID, naBase })),
    };
    const fichaService = {
      listarFichas: vi.fn(() => of(opts.fichas ?? [])),
    };
    const rolagemService = {
      listarPorCampanha: vi.fn(() => of(opts.rolagens ?? [])),
    };
    const sessaoService = { usuario: () => ({ id: opts.usuarioId, login: 'x', nome: 'x' }) };
    const topbarContexto = { definir: vi.fn(), limpar: vi.fn() };

    const fichaCriada$ = new Subject<FichaResumoDto>();
    const membroEntrou$ = new Subject<unknown>();
    const fichaAlterada$ = new Subject<unknown>();
    const fichaVisibilidadeAlterada$ = new Subject<unknown>();
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const estadoAlterado$ = new Subject<{ id: number; naBase: boolean }>();
    const inventarioAlterado$ = new Subject<{ campanhaId: number }>();
    const reconexao = signal(0);
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      fichaCriada$: fichaCriada$.asObservable(),
      membroEntrou$: membroEntrou$.asObservable(),
      fichaAlterada$: fichaAlterada$.asObservable(),
      fichaVisibilidadeAlterada$: fichaVisibilidadeAlterada$.asObservable(),
      rolagemRegistrada$: rolagemRegistrada$.asObservable() as Observable<RolagemResumoDto>,
      estadoAlterado$: estadoAlterado$.asObservable(),
      inventarioAlterado$: inventarioAlterado$.asObservable(),
      reconexao,
    };

    TestBed.configureTestingModule({
      providers: [
        CampanhaDetalheDadosService,
        { provide: CampanhaService, useValue: campanhaService },
        { provide: FichaService, useValue: fichaService },
        { provide: RolagemService, useValue: rolagemService },
        { provide: SessaoService, useValue: sessaoService },
        { provide: TempoRealService, useValue: tempoRealService },
        { provide: TopbarContextoService, useValue: topbarContexto },
      ],
    });

    const service = TestBed.inject(CampanhaDetalheDadosService);
    service.inicializar(CAMPANHA_ID);
    TestBed.inject(ApplicationRef).tick();

    return {
      service,
      campanhaService,
      fichaService,
      rolagemService,
      tempoRealService,
      rolagemRegistrada$,
      estadoAlterado$,
      inventarioAlterado$,
      fichaAlterada$,
    };
  }

  it('carrega campanha, membros e fichas no boot', () => {
    const { service } = montar({ usuarioId: 1, membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE) });

    expect(service.campanha()?.nome).toBe('Contenção Delta');
    expect(service.membros().length).toBe(1);
    expect(service.carregando()).toBe(false);
  });

  it('deriva ehMestre true quando o usuário autenticado é o MESTRE dos membros', () => {
    const { service } = montar({ usuarioId: 1, membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE) });
    expect(service.ehMestre()).toBe(true);
  });

  it('deriva ehMestre false quando o usuário autenticado não é o MESTRE dos membros', () => {
    const { service } = montar({ usuarioId: 2, membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE) });
    expect(service.ehMestre()).toBe(false);
  });

  it('carrega o feed de rolagens no boot e prepend em tempo real', () => {
    const { service, rolagemRegistrada$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      rolagens: [rolagem({ id: 1 })],
    });
    expect(service.rolagensFeed().length).toBe(1);

    rolagemRegistrada$.next(rolagem({ id: 2 }));
    expect(service.rolagensFeed()[0].id).toBe(2);
    expect(service.rolagensFeed().length).toBe(2);
  });

  it('recarregarMembrosEFichas refaz o fetch de membros e fichas', () => {
    const { service, campanhaService, fichaService } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.listarMembros.mockClear();
    fichaService.listarFichas.mockClear();

    service.recarregarMembrosEFichas();

    expect(campanhaService.listarMembros).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(fichaService.listarFichas).toHaveBeenCalledWith(CAMPANHA_ID);
  });

  it('refaz o fetch de membros/fichas ao receber ficha:alterada em tempo real', () => {
    const { service, fichaService, fichaAlterada$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    fichaService.listarFichas.mockClear();

    fichaAlterada$.next({});

    expect(fichaService.listarFichas).toHaveBeenCalledWith(CAMPANHA_ID);
    void service;
  });

  it('recarrega campanha e inventário ao receber estadoAlterado$ da própria campanha', () => {
    const { service, campanhaService, estadoAlterado$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.recuperarCampanha.mockClear();

    estadoAlterado$.next({ id: CAMPANHA_ID, naBase: false });

    expect(campanhaService.recuperarCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    void service;
  });

  it('recarrega o inventário ao receber inventarioAlterado$ da própria campanha', () => {
    const { service, campanhaService, inventarioAlterado$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.recuperarInventario.mockClear();

    inventarioAlterado$.next({ campanhaId: CAMPANHA_ID });

    expect(campanhaService.recuperarInventario).toHaveBeenCalledWith(CAMPANHA_ID);
    void service;
  });

  it('sincronizarSalasFicha entra/sai das salas conforme o conjunto de fichas visíveis muda', () => {
    const { service, tempoRealService } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    tempoRealService.entrarSalaFicha.mockClear();
    tempoRealService.sairSalaFicha.mockClear();

    service.sincronizarSalasFicha([{ id: 10 } as FichaResumoDto]);
    expect(tempoRealService.entrarSalaFicha).toHaveBeenCalledWith(10);

    service.sincronizarSalasFicha([{ id: 11 } as FichaResumoDto]);
    expect(tempoRealService.sairSalaFicha).toHaveBeenCalledWith(10);
    expect(tempoRealService.entrarSalaFicha).toHaveBeenCalledWith(11);
  });
});
