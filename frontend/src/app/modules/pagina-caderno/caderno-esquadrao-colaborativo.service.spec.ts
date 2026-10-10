import { TestBed } from '@angular/core/testing';
import { ClasseEnum, TipoCampanhaMembroPapelEnum, TipoPaginaCadernoEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroFichaResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAlteradaDto } from '@contratados-rpg/shared/dtos/ficha';
import { Subject, of } from 'rxjs';
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessaoService } from '../../core/services/sessao.service';
import { TempoRealService } from '../../core/services/tempo-real.service';
import { CadernoEsquadraoColaborativoService } from './caderno-esquadrao-colaborativo.service';
import { PaginaCadernoService } from './pagina-caderno.service';
import { CampanhaService } from '../campanha/campanha.service';

describe('CadernoEsquadraoColaborativoService', () => {
  const pagina = {
    id: 31,
    campanhaId: 3,
    usuarioAutorId: null,
    autorNome: null,
    tipo: TipoPaginaCadernoEnum.ESQUADRAO,
    titulo: 'Plano',
    conteudoMarkdown: 'Ponto de encontro',
    somenteLeitura: false,
    createdDate: '2026-08-27T12:00:00.000Z',
    updatedDate: '2026-08-27T12:00:00.000Z',
  };
  let servico: CadernoEsquadraoColaborativoService;
  let api: { recuperarEstadoPaginaEsquadrao: ReturnType<typeof vi.fn>; alterarPaginaEsquadrao: ReturnType<typeof vi.fn> };
  let presencaEsquadraoCaderno$: Subject<{ campanhaId: number; paginaId: number; atualizacao: string }>;
  let enviarPresencaEsquadrao: ReturnType<typeof vi.fn>;
  let fichaAlterada$: Subject<FichaAlteradaDto>;
  let entrarSalaFicha: ReturnType<typeof vi.fn>;
  let sairSalaFicha: ReturnType<typeof vi.fn>;
  let listarMembros: ReturnType<typeof vi.fn>;
  let reconexao$: Subject<void>;

  beforeEach(() => {
    vi.useFakeTimers();
    const documento = new Y.Doc();
    documento.getText('titulo').insert(0, pagina.titulo);
    const estado = btoa(String.fromCharCode(...Y.encodeStateAsUpdate(documento)));
    api = {
      recuperarEstadoPaginaEsquadrao: vi.fn(() => of({ pagina, estado })),
      alterarPaginaEsquadrao: vi.fn(() => of({ campanhaId: 3, paginaId: 31, atualizacao: estado, pagina })),
    };
    presencaEsquadraoCaderno$ = new Subject();
    enviarPresencaEsquadrao = vi.fn();
    fichaAlterada$ = new Subject();
    entrarSalaFicha = vi.fn();
    sairSalaFicha = vi.fn();
    listarMembros = vi.fn(() => of([]));
    reconexao$ = new Subject();
    TestBed.configureTestingModule({
      providers: [
        CadernoEsquadraoColaborativoService,
        { provide: PaginaCadernoService, useValue: api },
        { provide: CampanhaService, useValue: { listarMembros } },
        {
          provide: TempoRealService,
          useValue: {
            paginaEsquadraoAlterada$: new Subject(),
            paginaEsquadraoExcluida$: new Subject(),
            presencaEsquadraoCaderno$,
            fichaAlterada$,
            reconexao$,
            entrarSalaFicha,
            sairSalaFicha,
            conectar: vi.fn(),
            entrarSalaCampanha: vi.fn(),
            enviarPresencaEsquadrao,
          },
        },
        {
          provide: SessaoService,
          useValue: { usuario: () => ({ id: 7, nome: 'QA' }) },
        },
      ],
    });
    servico = TestBed.inject(CadernoEsquadraoColaborativoService);
  });

  afterEach(() => vi.useRealTimers());

  it('envia um delta CRDT ao alterar o título, sem substituir o documento', () => {
    servico.abrir(31);
    servico.definirConteudoMarkdown('Ponto de encontro');
    servico.definirTitulo('Plano revisado');
    vi.advanceTimersByTime(180);

    expect(api.alterarPaginaEsquadrao).toHaveBeenCalledWith(
      31,
      expect.objectContaining({ titulo: 'Plano revisado', conteudoMarkdown: 'Ponto de encontro' }),
    );
    expect(servico.documento()?.getText('titulo').toString()).toBe('Plano revisado');
  });

  describe('presença (P-039)', () => {
    function definirFichas(fichas: readonly CampanhaMembroFichaResumoDto[]): void {
      const membros = [{
        usuarioId: 7, nome: 'QA', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas,
      }];
      listarMembros.mockReturnValue(of(membros));
      servico.definirMembros(membros);
    }

    function ficha(id: number, updatedDate: string, cor: string | null): CampanhaMembroFichaResumoDto {
      return {
        id, updatedDate, cor, nome: 'Agente', classe: ClasseEnum.COMBATENTE,
        arquetipo: null, imagemUrl: null, acessoCompleto: true,
        morrendo: false, machucado: false, inconsciente: false,
      };
    }

    it('anuncia a cor da ficha própria mais recente, sem usar a de outro membro', () => {
      const propria = ficha(4, '2026-10-09T10:00:00Z', '#22c55e');
      listarMembros.mockReturnValue(of([{
        usuarioId: 7, nome: 'QA', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [propria],
      }]));
      servico.definirMembros([
        { usuarioId: 9, nome: 'Outro', papel: TipoCampanhaMembroPapelEnum.MESTRE,
          fichas: [ficha(6, '2026-10-09T12:00:00Z', '#38bdf8')] },
        { usuarioId: 7, nome: 'QA', papel: TipoCampanhaMembroPapelEnum.JOGADOR,
          fichas: [propria] },
      ]);
      servico.abrir(31);
      expect(servico.awareness()?.getLocalState()?.['user']).toEqual({ name: 'QA', color: propria.cor });
      expect(entrarSalaFicha).toHaveBeenCalledExactlyOnceWith(4);
    });

    it('uma edição da outra ficha própria muda a identidade sem recriar o Y.Doc', () => {
      definirFichas([
        ficha(4, '2026-10-09T10:00:00Z', '#22c55e'),
        ficha(5, '2026-10-08T10:00:00Z', '#38bdf8'),
      ]);
      servico.abrir(31);
      const documento = servico.documento();
      const awareness = servico.awareness();
      listarMembros.mockReturnValue(of([{
        usuarioId: 7, nome: 'QA', papel: TipoCampanhaMembroPapelEnum.JOGADOR,
        fichas: [ficha(4, '2026-10-09T10:00:00Z', '#22c55e'),
          ficha(5, '2026-10-09T12:00:00Z', '#38bdf8')],
      }]));
      fichaAlterada$.next({ id: 5, campanhaId: 3 } as FichaAlteradaDto);
      expect(awareness?.getLocalState()?.['user']).toEqual({ name: 'QA', color: '#38bdf8' });
      expect(servico.documento()).toBe(documento);
      expect(servico.awareness()).toBe(awareness);
      expect(api.alterarPaginaEsquadrao).not.toHaveBeenCalled();
    });

    it('releitura antiga e evento fora da campanha não restauram a identidade', () => {
      const antiga = ficha(4, '2026-10-08T10:00:00Z', '#22c55e');
      definirFichas([antiga]);
      servico.abrir(31);
      listarMembros.mockReturnValue(of([{
        usuarioId: 7, nome: 'QA', papel: TipoCampanhaMembroPapelEnum.JOGADOR,
        fichas: [ficha(4, '2026-10-09T12:00:00Z', '#38bdf8')],
      }]));
      fichaAlterada$.next({ id: 4, campanhaId: 3 } as FichaAlteradaDto);
      definirFichas([antiga]);
      fichaAlterada$.next({ id: 4, campanhaId: 99 } as FichaAlteradaDto);
      expect(servico.awareness()?.getLocalState()?.['user']).toEqual({ name: 'QA', color: '#38bdf8' });
    });

    it('releituras sem mudança não repetem presença e remoção libera a sala', () => {
      const propria = ficha(4, '2026-10-09T10:00:00Z', '#22c55e');
      listarMembros.mockReturnValue(of([{
        usuarioId: 7, nome: 'QA', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [propria],
      }]));
      definirFichas([propria]);
      servico.abrir(31);
      enviarPresencaEsquadrao.mockClear();
      definirFichas([propria]);
      expect(enviarPresencaEsquadrao).not.toHaveBeenCalled();
      expect(entrarSalaFicha).toHaveBeenCalledTimes(1);
      definirFichas([]);
      expect(sairSalaFicha).toHaveBeenCalledExactlyOnceWith(4);
      expect(servico.awareness()?.getLocalState()?.['user']).toEqual({ name: 'QA', color: '#f43f5e' });
    });

    it('fechar libera somente suas referências e reabrir recupera a identidade', () => {
      definirFichas([ficha(4, '2026-10-09T10:00:00Z', '#22c55e')]);
      servico.abrir(31);
      servico.fechar();
      expect(sairSalaFicha).toHaveBeenCalledExactlyOnceWith(4);
      servico.abrir(31);
      expect(entrarSalaFicha).toHaveBeenCalledTimes(2);
      expect(servico.awareness()?.getLocalState()?.['user']).toEqual({ name: 'QA', color: '#22c55e' });
    });

    it('reconexão renova presença e relê a identidade sem trocar documento', () => {
      definirFichas([ficha(4, '2026-10-09T10:00:00Z', '#22c55e')]);
      servico.abrir(31);
      const documento = servico.documento();
      listarMembros.mockClear();
      listarMembros.mockReturnValue(of([{
        usuarioId: 7, nome: 'QA', papel: TipoCampanhaMembroPapelEnum.JOGADOR,
        fichas: [ficha(4, '2026-10-09T12:00:00Z', '#38bdf8')],
      }]));
      enviarPresencaEsquadrao.mockClear();
      reconexao$.next();
      expect(listarMembros).toHaveBeenCalledExactlyOnceWith(3);
      expect(enviarPresencaEsquadrao).toHaveBeenCalled();
      expect(servico.documento()).toBe(documento);
      expect(servico.awareness()?.getLocalState()?.['user']).toEqual({ name: 'QA', color: '#38bdf8' });
    });

    it('ao reabrir, usa a data atual mesmo com o recorte do hospedeiro antigo', () => {
      definirFichas([ficha(4, '2026-10-09T10:00:00Z', '#22c55e')]);
      listarMembros.mockReturnValue(of([{
        usuarioId: 7, nome: 'QA', papel: TipoCampanhaMembroPapelEnum.JOGADOR,
        fichas: [ficha(4, '2026-10-09T12:00:00Z', '#38bdf8')],
      }]));
      servico.abrir(31);
      expect(servico.awareness()?.getLocalState()?.['user']).toEqual({ name: 'QA', color: '#38bdf8' });
    });

    it('com o Caderno fechado não busca identidade nem participa das salas de ficha', () => {
      definirFichas([ficha(4, '2026-10-09T10:00:00Z', '#22c55e')]);
      fichaAlterada$.next({ id: 4, campanhaId: 3 } as FichaAlteradaDto);
      reconexao$.next();
      expect(listarMembros).not.toHaveBeenCalled();
      expect(entrarSalaFicha).not.toHaveBeenCalled();
    });
    it('ao abrir, anuncia a própria presença com nome/cor derivados da sessão', () => {
      servico.abrir(31);

      expect(servico.awareness()).not.toBeNull();
      expect(enviarPresencaEsquadrao).toHaveBeenCalledWith(
        expect.objectContaining({ campanhaId: 3, paginaId: 31 }),
      );
    });

    it('aplica uma atualização de presença remota e projeta o colaborador em participantes()', () => {
      servico.abrir(31);
      const remoto = new Awareness(new Y.Doc());
      remoto.setLocalStateField('user', { name: 'Mestre', color: '#38bdf8' });
      const atualizacao = encodeAwarenessUpdate(remoto, [remoto.clientID]);
      const base64 = btoa(String.fromCharCode(...atualizacao));

      presencaEsquadraoCaderno$.next({ campanhaId: 3, paginaId: 31, atualizacao: base64 });

      expect(servico.participantes()).toEqual([
        expect.objectContaining({ nome: 'Mestre', cor: '#38bdf8' }),
      ]);
    });

    it('ignora presença remota de outra página aberta (evento de sessão anterior/alheia)', () => {
      servico.abrir(31);

      presencaEsquadraoCaderno$.next({ campanhaId: 3, paginaId: 999, atualizacao: 'AAA=' });

      expect(servico.participantes()).toEqual([]);
    });

    it('ao fechar, limpa o awareness e a lista de participantes', () => {
      servico.abrir(31);

      servico.fechar();

      expect(servico.awareness()).toBeNull();
      expect(servico.participantes()).toEqual([]);
    });
  });
});
