import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoOrganizacaoRecuperadaDto,
} from '@contratados-rpg/shared/dtos/documento';
import { DocumentoAlteracaoEnum, TipoDocumentoOrganizacaoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../core/services/tempo-real.service';
import { BibliotecaOrganizacaoStore } from './biblioteca-organizacao.store';
import { DocumentoService } from './documento.service';

describe('BibliotecaOrganizacaoStore', () => {
  const CAMPANHA_ID = 9;

  const organizacao = (
    sobrescrita: Partial<DocumentoOrganizacaoRecuperadaDto> = {},
  ): DocumentoOrganizacaoRecuperadaDto => ({
    campanhaId: CAMPANHA_ID,
    organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
    editavel: true,
    pastas: [{ id: 1, nome: 'Mapas', pastaMaeId: null, ordem: 1 }],
    vinculos: [],
    ...sobrescrita,
  });

  function montar(leitura = organizacao()) {
    const documentoOrganizacaoAlterada$ = new Subject<{
      campanhaId: number;
      organizacao: TipoDocumentoOrganizacaoEnum;
    }>();
    const documentoAlterado$ = new Subject<DocumentoBibliotecaAlteradaDto>();
    const reconexao$ = new Subject<void>();
    const documentoService = {
      recuperarOrganizacao: vi.fn(() => of(leitura)),
      criarPasta: vi.fn(() => of({})),
      renomearPasta: vi.fn(() => of({})),
      moverPasta: vi.fn(() => of({})),
      removerPasta: vi.fn(() => of(undefined)),
      moverDocumento: vi.fn(() => of({})),
    };
    TestBed.configureTestingModule({
      providers: [
        BibliotecaOrganizacaoStore,
        { provide: DocumentoService, useValue: documentoService },
        {
          provide: TempoRealService,
          useValue: {
            documentoOrganizacaoAlterada$: documentoOrganizacaoAlterada$.asObservable(),
            documentoAlterado$: documentoAlterado$.asObservable(),
            reconexao$: reconexao$.asObservable(),
          },
        },
      ],
    });
    const store = TestBed.inject(BibliotecaOrganizacaoStore);
    return {
      store,
      documentoService,
      documentoOrganizacaoAlterada$,
      documentoAlterado$,
      reconexao$,
    };
  }

  it('lê a organização do cargo ao iniciar, uma vez, e expõe se pode editar', () => {
    const { store, documentoService } = montar();

    expect(store.carregando()).toBe(true);
    store.iniciar(CAMPANHA_ID);
    store.iniciar(CAMPANHA_ID);

    expect(documentoService.recuperarOrganizacao).toHaveBeenCalledTimes(1);
    expect(documentoService.recuperarOrganizacao).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(store.carregando()).toBe(false);
    expect(store.organizacao()?.pastas).toHaveLength(1);
    expect(store.editavel()).toBe(true);
  });

  it('o espectador navega: editavel vem falso do servidor', () => {
    const { store } = montar(organizacao({ editavel: false }));
    store.iniciar(CAMPANHA_ID);

    expect(store.editavel()).toBe(false);
  });

  it('refaz a leitura quando a organização do cargo muda na campanha, e ignora outra campanha', () => {
    const { store, documentoService, documentoOrganizacaoAlterada$ } = montar();
    store.iniciar(CAMPANHA_ID);
    const chamadas = documentoService.recuperarOrganizacao.mock.calls.length;

    documentoOrganizacaoAlterada$.next({
      campanhaId: 99,
      organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
    });
    expect(documentoService.recuperarOrganizacao).toHaveBeenCalledTimes(chamadas);

    documentoOrganizacaoAlterada$.next({
      campanhaId: CAMPANHA_ID,
      organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
    });
    expect(documentoService.recuperarOrganizacao).toHaveBeenCalledTimes(chamadas + 1);
  });

  it('refaz a leitura quando um documento é revelado, ocultado ou excluído (vínculos mudam)', () => {
    const { store, documentoService, documentoAlterado$ } = montar();
    store.iniciar(CAMPANHA_ID);
    const chamadas = documentoService.recuperarOrganizacao.mock.calls.length;

    documentoAlterado$.next({
      campanhaId: CAMPANHA_ID,
      documentoId: 4,
      alteracao: DocumentoAlteracaoEnum.OCULTADO,
    });
    documentoAlterado$.next({
      campanhaId: 99,
      documentoId: 4,
      alteracao: DocumentoAlteracaoEnum.REMOVIDO,
    });

    expect(documentoService.recuperarOrganizacao).toHaveBeenCalledTimes(chamadas + 1);
  });

  it('refaz a leitura na reconexão (P-083)', () => {
    const { store, documentoService, reconexao$ } = montar();
    store.iniciar(CAMPANHA_ID);
    const chamadas = documentoService.recuperarOrganizacao.mock.calls.length;

    reconexao$.next();

    expect(documentoService.recuperarOrganizacao).toHaveBeenCalledTimes(chamadas + 1);
  });

  it('uma falha na leitura mantém o que já estava na tela', () => {
    const { store, documentoService, reconexao$ } = montar();
    store.iniciar(CAMPANHA_ID);
    documentoService.recuperarOrganizacao.mockReturnValue(throwError(() => new Error('rede')));

    reconexao$.next();

    expect(store.organizacao()?.pastas).toHaveLength(1);
  });

  describe('escritas', () => {
    it('cada escrita chama a API e, ao concluir, refaz a leitura (fonte única: o GET)', () => {
      const { store, documentoService } = montar();
      store.iniciar(CAMPANHA_ID);
      const chamadas = documentoService.recuperarOrganizacao.mock.calls.length;

      store.criarPasta('Cidade', 1).subscribe();
      store.renomearPasta(1, 'Mapas da cidade').subscribe();
      store.moverPasta(1, null, 0).subscribe();
      store.removerPasta(1).subscribe();
      store.moverDocumento(7, 1).subscribe();

      expect(documentoService.criarPasta).toHaveBeenCalledWith(CAMPANHA_ID, 'Cidade', 1);
      expect(documentoService.renomearPasta).toHaveBeenCalledWith(1, 'Mapas da cidade');
      expect(documentoService.moverPasta).toHaveBeenCalledWith(1, null, 0);
      expect(documentoService.removerPasta).toHaveBeenCalledWith(1);
      expect(documentoService.moverDocumento).toHaveBeenCalledWith(7, 1, undefined);
      expect(documentoService.recuperarOrganizacao).toHaveBeenCalledTimes(chamadas + 5);
    });

    it('trava enquanto a escrita está em voo e destrava ao concluir ou falhar', () => {
      const { store, documentoService } = montar();
      store.iniciar(CAMPANHA_ID);
      const resposta$ = new Subject<unknown>();
      documentoService.criarPasta.mockReturnValue(resposta$ as never);

      store.criarPasta('Cidade', null).subscribe();
      expect(store.emOperacao()).toBe(true);
      resposta$.next({});
      resposta$.complete();
      expect(store.emOperacao()).toBe(false);

      documentoService.removerPasta.mockReturnValue(throwError(() => new Error('403')));
      store.removerPasta(1).subscribe({ error: () => undefined });
      expect(store.emOperacao()).toBe(false);
    });

    it('falha na escrita não refaz a leitura', () => {
      const { store, documentoService } = montar();
      store.iniciar(CAMPANHA_ID);
      const chamadas = documentoService.recuperarOrganizacao.mock.calls.length;
      documentoService.moverPasta.mockReturnValue(throwError(() => new Error('400')));

      store.moverPasta(1, 2).subscribe({ error: () => undefined });

      expect(documentoService.recuperarOrganizacao).toHaveBeenCalledTimes(chamadas);
    });
  });
});
