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
    fichas$?: Observable<FichaResumoDto[]>;
    rolagens?: RolagemResumoDto[];
  }) {
    const campanhaService = {
      recuperarCampanha: vi.fn(() => of({ ...campanhaBase })),
      listarMembros: vi.fn(() => of(opts.membros)),
      recuperarInventario: vi.fn(() => of({ itens: [] })),
      alterarEstado: vi.fn((_id: number, naBase: boolean) => of({ id: CAMPANHA_ID, naBase })),
    };
    const fichaService = {
      listarFichas: vi.fn(() => opts.fichas$ ?? of(opts.fichas ?? [])),
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
    const fichaRecortesAlterados$ = new Subject<{
      campanhaId: number;
      fichas: boolean;
      membros: boolean;
    }>();
    const fichaRemovidaDaCampanha$ = new Subject<unknown>();
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const rolagemExcluida$ = new Subject<{ id: number }>();
    const estadoAlterado$ = new Subject<{ id: number; naBase: boolean }>();
    const inventarioAlterado$ = new Subject<{ campanhaId: number }>();
    const reconexao = signal(0);
    const reconexao$ = new Subject<void>();
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
      fichaRecortesAlterados$: fichaRecortesAlterados$.asObservable(),
      fichaRemovidaDaCampanha$: fichaRemovidaDaCampanha$.asObservable(),
      rolagemRegistrada$: rolagemRegistrada$.asObservable() as Observable<RolagemResumoDto>,
      rolagemExcluida$: rolagemExcluida$.asObservable(),
      estadoAlterado$: estadoAlterado$.asObservable(),
      inventarioAlterado$: inventarioAlterado$.asObservable(),
      reconexao,
      reconexao$: reconexao$.asObservable(),
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
      rolagemExcluida$,
      estadoAlterado$,
      inventarioAlterado$,
      fichaAlterada$,
      fichaRemovidaDaCampanha$,
      fichaRecortesAlterados$,
      reconexao$,
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

  it('ficha:recortes-alterados da própria campanha refaz o fetch de membros marcado', async () => {
    const { campanhaService, fichaRecortesAlterados$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.listarMembros.mockClear();

    fichaRecortesAlterados$.next({ campanhaId: CAMPANHA_ID, fichas: false, membros: true });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(campanhaService.listarMembros).toHaveBeenCalledWith(CAMPANHA_ID);
  });

  it('ficha:recortes-alterados de outra campanha não refaz o fetch de membros', async () => {
    const { campanhaService, fichaRecortesAlterados$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.listarMembros.mockClear();

    fichaRecortesAlterados$.next({ campanhaId: CAMPANHA_ID + 1, fichas: false, membros: true });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(campanhaService.listarMembros).not.toHaveBeenCalled();
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

  // === P-083: reconexão via `reconexao$` (não `reconexao()` num `effect`) — só reconexões
  // futuras à montagem do serviço refazem membros/fichas.

  it('reconexao$ (reconexão real) refaz membros e fichas', () => {
    const { campanhaService, fichaService, reconexao$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.listarMembros.mockClear();
    fichaService.listarFichas.mockClear();

    reconexao$.next();

    expect(campanhaService.listarMembros).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(fichaService.listarFichas).toHaveBeenCalledWith(CAMPANHA_ID);
  });

  // === P-084: reconexão coordena TODOS os recursos carregados, não só membros/fichas — sem
  // replay de eventos (§9), estado/inventário/feed alterados durante a queda ficavam presos no
  // último GET antes da queda.

  it('reconexao$ também recarrega campanha/estado, inventário e o feed de rolagens', () => {
    const { campanhaService, rolagemService, reconexao$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      rolagens: [rolagem({ id: 1 })],
    });
    campanhaService.recuperarCampanha.mockClear();
    campanhaService.recuperarInventario.mockClear();
    rolagemService.listarPorCampanha.mockClear();

    reconexao$.next();

    expect(campanhaService.recuperarCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(campanhaService.recuperarInventario).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(rolagemService.listarPorCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
  });

  it('reconexao$ traz uma rolagem feita durante a queda para o feed', () => {
    const { service, rolagemService, reconexao$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      rolagens: [rolagem({ id: 1 })],
    });
    rolagemService.listarPorCampanha.mockReturnValue(of([rolagem({ id: 2 }), rolagem({ id: 1 })]));

    reconexao$.next();

    expect(service.rolagensFeed().map((item) => item.id)).toEqual([2, 1]);
  });

  it('a releitura do feed nunca ressuscita uma rolagem excluída por uma resposta antiga (P-084)', () => {
    // Simula o GET de recuperação em voo: a exclusão chega por socket ANTES da resposta (lenta)
    // do GET, que ainda traz a rolagem excluída — a reconciliação por id não pode ressuscitá-la.
    const respostaLenta$ = new Subject<RolagemResumoDto[]>();
    const { service, rolagemService, rolagemExcluida$, reconexao$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      rolagens: [rolagem({ id: 1 }), rolagem({ id: 2 })],
    });
    rolagemService.listarPorCampanha.mockReturnValue(respostaLenta$);

    reconexao$.next();
    rolagemExcluida$.next({ id: 2 });
    expect(service.rolagensFeed().map((item) => item.id)).toEqual([1]);

    // Resposta antiga do GET (pedida antes da exclusão) ainda traz o id 2.
    respostaLenta$.next([rolagem({ id: 2 }), rolagem({ id: 1 })]);

    expect(service.rolagensFeed().map((item) => item.id)).toEqual([1]);
  });

  it('não ressuscita um item que sumiu do servidor sem nenhum evento de socket (queda total) — achado ao vivo', () => {
    // Verificação ao vivo (backend derrubado de verdade + exclusão direto no Postgres, sem
    // nenhum evento de socket possível durante a queda): a 1ª versão desta reconciliação usava
    // `rolagensFeed()` atual como "extra" a preservar, e um item que só sumiu do servidor —
    // sem exclusão vista por evento — era reintroduzido como se fosse um registro concorrente.
    const { service, rolagemService, reconexao$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      rolagens: [rolagem({ id: 1 }), rolagem({ id: 2 })],
    });
    rolagemService.listarPorCampanha.mockReturnValue(of([rolagem({ id: 1 })]));

    reconexao$.next();

    expect(service.rolagensFeed().map((item) => item.id)).toEqual([1]);
  });

  it('a releitura do feed preserva um registro chegado por socket enquanto o GET estava em voo', () => {
    const respostaLenta$ = new Subject<RolagemResumoDto[]>();
    const { service, rolagemService, rolagemRegistrada$, reconexao$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      rolagens: [rolagem({ id: 1 })],
    });
    rolagemService.listarPorCampanha.mockReturnValue(respostaLenta$);

    reconexao$.next();
    rolagemRegistrada$.next(rolagem({ id: 3, createdDate: '2099-01-01T00:00:00Z' }));
    expect(service.rolagensFeed().map((item) => item.id)).toEqual([3, 1]);

    // Resposta do GET, disparada antes do registro 3 existir, ainda não o inclui.
    respostaLenta$.next([rolagem({ id: 1 })]);

    expect(service.rolagensFeed().map((item) => item.id)).toEqual([3, 1]);
  });

  it('uma reconexão ocorrida antes de `inicializar` não duplica a carga inicial (P-083)', () => {
    // `reconexao$` é um Subject comum — se o serviço fosse montado depois de uma reconexão já
    // emitida em OUTRO Subject, ele nunca a veria (nada a assinar ainda existia). O achado
    // original era o `effect(() => reconexao() > 0)`, que via o contador **já** maior que zero no
    // primeiro ciclo e recarregava de novo; a troca para `reconexao$` elimina essa classe de
    // bug por construção — não há nada além do fetch normal do boot.
    const { campanhaService, fichaService } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });

    expect(campanhaService.listarMembros).toHaveBeenCalledTimes(1);
    expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);
  });

  it('não usa ficha:alterada para invalidar a lista de fichas', () => {
    const { service, fichaService, fichaAlterada$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      fichas: [{ id: 1 } as FichaResumoDto],
    });
    fichaService.listarFichas.mockClear();

    fichaAlterada$.next({ id: 1 });

    expect(fichaService.listarFichas).not.toHaveBeenCalled();
    void service;
  });

  it('não relê listas por ficha:alterada sem invalidador de recorte', () => {
    const { campanhaService, fichaService, fichaAlterada$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      fichas: [{ id: 1 } as FichaResumoDto],
    });
    campanhaService.listarMembros.mockClear();
    fichaService.listarFichas.mockClear();

    fichaAlterada$.next({ id: 1 });

    expect(campanhaService.listarMembros).not.toHaveBeenCalled();
    expect(fichaService.listarFichas).not.toHaveBeenCalled();
  });

  it('relê no máximo uma vez cada lista marcada na mesma invalidação', async () => {
    const { campanhaService, fichaService, fichaRecortesAlterados$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.listarMembros.mockClear();
    fichaService.listarFichas.mockClear();

    fichaRecortesAlterados$.next({ campanhaId: CAMPANHA_ID, fichas: true, membros: true });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(campanhaService.listarMembros).toHaveBeenCalledTimes(1);
    expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);
  });

  it('refaz após invalidação durante GET lento e ignora a resposta antiga', async () => {
    const primeiraResposta$ = new Subject<FichaResumoDto[]>();
    const segundaResposta$ = new Subject<FichaResumoDto[]>();
    const { service, fichaService, fichaRecortesAlterados$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      fichas: [{ id: 1, nome: 'Inicial' } as FichaResumoDto],
    });
    fichaService.listarFichas.mockClear();
    fichaService.listarFichas
      .mockReturnValueOnce(primeiraResposta$)
      .mockReturnValueOnce(segundaResposta$);

    fichaRecortesAlterados$.next({ campanhaId: CAMPANHA_ID, fichas: true, membros: false });
    await new Promise((resolve) => setTimeout(resolve, 30));
    fichaRecortesAlterados$.next({ campanhaId: CAMPANHA_ID, fichas: true, membros: false });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);
    primeiraResposta$.next([{ id: 1, nome: 'Resposta antiga' } as FichaResumoDto]);
    primeiraResposta$.complete();
    expect(fichaService.listarFichas).toHaveBeenCalledTimes(2);
    expect(service.fichas()[0].nome).toBe('Inicial');

    segundaResposta$.next([{ id: 1, nome: 'Resposta recente' } as FichaResumoDto]);
    segundaResposta$.complete();
    expect(service.fichas()[0].nome).toBe('Resposta recente');
  });

  it('protege também a leitura inicial quando a invalidação chega antes da resposta', async () => {
    const respostaInicial$ = new Subject<FichaResumoDto[]>();
    const respostaRecente$ = new Subject<FichaResumoDto[]>();
    const { service, fichaService, fichaRecortesAlterados$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
      fichas$: respostaInicial$,
    });
    fichaService.listarFichas.mockClear();
    fichaService.listarFichas.mockReturnValue(respostaRecente$);

    fichaRecortesAlterados$.next({ campanhaId: CAMPANHA_ID, fichas: true, membros: false });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(fichaService.listarFichas).not.toHaveBeenCalled();

    respostaInicial$.next([{ id: 1, nome: 'Resposta inicial antiga' } as FichaResumoDto]);
    respostaInicial$.complete();
    expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);
    expect(service.fichas()).toEqual([]);

    respostaRecente$.next([{ id: 1, nome: 'Resposta recente' } as FichaResumoDto]);
    respostaRecente$.complete();
    expect(service.fichas()[0].nome).toBe('Resposta recente');
  });

  it('refaz o fetch de membros/fichas ao receber ficha:removida-da-campanha em tempo real', () => {
    const { fichaService, fichaRemovidaDaCampanha$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    fichaService.listarFichas.mockClear();

    fichaRemovidaDaCampanha$.next({ fichaId: 5, campanhaId: CAMPANHA_ID });

    expect(fichaService.listarFichas).toHaveBeenCalledWith(CAMPANHA_ID);
  });

  // === P-086: `estadoAlterado$` aplica `naBase` direto no signal, sem refazer campanha/
  // inventário — a mutação/eco do próprio evento nunca produz GET.

  it('aplica naBase de estadoAlterado$ direto no signal, sem GET de campanha nem inventário', () => {
    const { service, campanhaService, estadoAlterado$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.recuperarCampanha.mockClear();
    campanhaService.recuperarInventario.mockClear();

    estadoAlterado$.next({ id: CAMPANHA_ID, naBase: false });

    expect(service.campanha()?.naBase).toBe(false);
    expect(campanhaService.recuperarCampanha).not.toHaveBeenCalled();
    expect(campanhaService.recuperarInventario).not.toHaveBeenCalled();
  });

  it('estadoAlterado$ de outra campanha não altera naBase nem produz GET', () => {
    const { service, campanhaService, estadoAlterado$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.recuperarCampanha.mockClear();

    estadoAlterado$.next({ id: CAMPANHA_ID + 1, naBase: false });

    expect(service.campanha()?.naBase).toBe(true);
    expect(campanhaService.recuperarCampanha).not.toHaveBeenCalled();
  });

  it('resposta/eco duplicados do mesmo naBase são idempotentes, sem GET adicional', () => {
    const { service, campanhaService, estadoAlterado$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.recuperarCampanha.mockClear();

    estadoAlterado$.next({ id: CAMPANHA_ID, naBase: false });
    estadoAlterado$.next({ id: CAMPANHA_ID, naBase: false });

    expect(service.campanha()?.naBase).toBe(false);
    expect(campanhaService.recuperarCampanha).not.toHaveBeenCalled();
  });

  it('evento chega durante reconexão (GET lento): o naBase novo permanece após a leitura antiga terminar', () => {
    const respostaLenta$ = new Subject<CampanhaRecuperadaDto>();
    const { service, campanhaService, estadoAlterado$, reconexao$ } = montar({
      usuarioId: 1,
      membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE),
    });
    campanhaService.recuperarCampanha.mockReturnValue(respostaLenta$);

    reconexao$.next();
    estadoAlterado$.next({ id: CAMPANHA_ID, naBase: false });
    expect(service.campanha()?.naBase).toBe(false);

    // Resposta antiga do GET (pedida antes do evento) ainda traz o naBase anterior.
    respostaLenta$.next({ ...campanhaBase, naBase: true });

    expect(service.campanha()?.naBase).toBe(false);
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
