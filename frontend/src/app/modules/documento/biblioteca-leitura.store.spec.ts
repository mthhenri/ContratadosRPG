import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoRecuperadoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { DocumentoAlteracaoEnum, TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../core/services/tempo-real.service';
import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';
import { BibliotecaLeituraStore } from './biblioteca-leitura.store';
import { DocumentoService } from './documento.service';

/**
 * Prova o envio da presença de leitura (m9-09) pela `BibliotecaLeituraStore`: informa ao abrir,
 * ao trocar, ao fechar (inclusive o alternar da `m9-07` e o fechamento por indisponível), ao
 * destruir a página e de novo a cada reconexão. A exibição para o mestre é da `m9-10`.
 */
describe('BibliotecaLeituraStore — presença de leitura (m9-09)', () => {
  const CAMPANHA_ID = 9;
  const V1 = '2026-09-26 10:00:00.000001+00';

  const resumo = (id: number): DocumentoResumoDto => ({
    id,
    campanhaId: CAMPANHA_ID,
    titulo: `Documento ${id}`,
    tipo: TipoDocumentoEnum.TEXTO,
    imagemUrl: null,
    revelado: true,
    ordem: id,
    updatedDate: V1,
  });
  const completo = (id: number): DocumentoRecuperadoDto => ({
    ...resumo(id),
    conteudoMarkdown: '# Texto',
    createdDate: V1,
  });

  function montar() {
    const reconexao$ = new Subject<void>();
    const documentoAlterado$ = new Subject<DocumentoBibliotecaAlteradaDto>();
    const tempoReal = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      informarLeitura: vi.fn(),
      reconexao: signal(0),
      reconexao$: reconexao$.asObservable(),
      documentoAlterado$,
    };
    const documentoService = {
      listar: vi.fn(() => of([resumo(1), resumo(2)])),
      recuperar: vi.fn((id: number) =>
        id === 404 ? throwError(() => new Error('404')) : of(completo(id)),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        BibliotecaLeituraStore,
        { provide: DocumentoService, useValue: documentoService },
        { provide: TempoRealService, useValue: tempoReal },
        { provide: NotificacaoService, useValue: { notificar: vi.fn() } },
      ],
    });
    const store = TestBed.inject(BibliotecaLeituraStore);
    store.iniciar(CAMPANHA_ID);
    return { store, tempoReal, reconexao$, documentoAlterado$ };
  }

  it('não informa nada só por abrir a Biblioteca', () => {
    const { tempoReal } = montar();

    expect(tempoReal.informarLeitura).not.toHaveBeenCalled();
  });

  it('informa ao abrir e ao trocar de documento', () => {
    const { store, tempoReal } = montar();

    store.selecionar(1);
    store.abrirDocumento(2);

    expect(tempoReal.informarLeitura.mock.calls).toEqual([
      [CAMPANHA_ID, 1],
      [CAMPANHA_ID, 2],
    ]);
  });

  it('reabrir o mesmo documento pela busca não reinforma', () => {
    const { store, tempoReal } = montar();

    store.selecionar(1);
    store.abrirDocumento(1);

    expect(tempoReal.informarLeitura).toHaveBeenCalledTimes(1);
  });

  it('informa null ao fechar — pelo voltar e pelo alternar da seleção (m9-07)', () => {
    const { store, tempoReal } = montar();

    store.selecionar(1);
    store.selecionar(1);
    store.selecionar(2);
    store.fecharDocumento();
    store.fecharDocumento();

    expect(tempoReal.informarLeitura.mock.calls).toEqual([
      [CAMPANHA_ID, 1],
      [CAMPANHA_ID, null],
      [CAMPANHA_ID, 2],
      [CAMPANHA_ID, null],
    ]);
  });

  it('informa null quando o aberto fica indisponível (ocultado pelo mestre)', () => {
    const { store, tempoReal, documentoAlterado$ } = montar();
    store.selecionar(1);

    documentoAlterado$.next({
      campanhaId: CAMPANHA_ID,
      documentoId: 1,
      alteracao: DocumentoAlteracaoEnum.OCULTADO,
    });

    expect(tempoReal.informarLeitura).toHaveBeenLastCalledWith(CAMPANHA_ID, null);
  });

  it('informa de novo o aberto a cada reconexão, e null se nada está aberto', () => {
    const { store, tempoReal, reconexao$ } = montar();

    reconexao$.next();
    expect(tempoReal.informarLeitura).toHaveBeenLastCalledWith(CAMPANHA_ID, null);
    store.selecionar(2);
    tempoReal.informarLeitura.mockClear();
    reconexao$.next();

    expect(tempoReal.informarLeitura.mock.calls).toEqual([[CAMPANHA_ID, 2]]);
  });

  it('informa null ao destruir a página, antes de sair da sala', () => {
    const { store, tempoReal } = montar();
    store.selecionar(1);
    tempoReal.informarLeitura.mockClear();

    TestBed.resetTestingModule();

    expect(tempoReal.informarLeitura).toHaveBeenCalledWith(CAMPANHA_ID, null);
    expect(tempoReal.informarLeitura.mock.invocationCallOrder[0]).toBeLessThan(
      tempoReal.sairSalaCampanha.mock.invocationCallOrder[0],
    );
  });
});

/**
 * Prova o que a m9-11 acrescentou à store para o painel flutuante: a forma mestre (lista inteira, o
 * aberto não fecha no `OCULTADO`, só no `REMOVIDO`; Revelar/Ocultar pela regra única do
 * `DocumentoRevelacaoService`), a presença pausada com o painel fechado e o erro de carga.
 */
describe('BibliotecaLeituraStore — painel flutuante (m9-11)', () => {
  const CAMPANHA_ID = 9;
  const V1 = '2026-09-26 10:00:00.000001+00';
  const V2 = '2026-09-26 10:05:00.000002+00';

  const resumo = (id: number, extra: Partial<DocumentoResumoDto> = {}): DocumentoResumoDto => ({
    id,
    campanhaId: CAMPANHA_ID,
    titulo: `Documento ${id}`,
    tipo: TipoDocumentoEnum.TEXTO,
    imagemUrl: null,
    revelado: false,
    ordem: id,
    updatedDate: V1,
    ...extra,
  });

  function montar(opcoes: { mestre?: boolean; falharLista?: boolean } = {}) {
    let lista = [
      resumo(1),
      resumo(2, { revelado: true }),
      resumo(3, { tipo: TipoDocumentoEnum.IMAGEM }),
    ];
    const documentoAlterado$ = new Subject<DocumentoBibliotecaAlteradaDto>();
    const tempoReal = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      informarLeitura: vi.fn(),
      reconexao: signal(0),
      reconexao$: new Subject<void>().asObservable(),
      documentoAlterado$,
    };
    let falhar = opcoes.falharLista ?? false;
    const documentoService = {
      listar: vi.fn(() => (falhar ? throwError(() => new Error('500')) : of([...lista]))),
      recuperar: vi.fn((id: number) =>
        of({ ...lista.find((item) => item.id === id)!, conteudoMarkdown: '# Texto', createdDate: V1 }),
      ),
      revelar: vi.fn((id: number) => of({ id, revelado: true, updatedDate: V2 })),
      ocultar: vi.fn((id: number) => of({ id, revelado: false, updatedDate: V2 })),
    };
    const notificar = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        BibliotecaLeituraStore,
        { provide: DocumentoService, useValue: documentoService },
        { provide: TempoRealService, useValue: tempoReal },
        { provide: NotificacaoService, useValue: { notificar } },
      ],
    });
    const store = TestBed.inject(BibliotecaLeituraStore);
    store.iniciar(CAMPANHA_ID, { mestre: opcoes.mestre });
    const evento = (alteracao: DocumentoAlteracaoEnum, documentoId: number) =>
      documentoAlterado$.next({ campanhaId: CAMPANHA_ID, documentoId, alteracao });
    return {
      store,
      tempoReal,
      documentoService,
      notificar,
      evento,
      alterarLista: (nova: DocumentoResumoDto[]) => (lista = nova),
      voltarAFuncionar: () => (falhar = false),
    };
  }

  it('mestre: o aberto continua aberto quando é ocultado, sem aviso', () => {
    const { store, notificar, evento, alterarLista } = montar({ mestre: true });
    store.selecionar(2);

    alterarLista([resumo(1), resumo(2, { updatedDate: V2 }), resumo(3)]);
    evento(DocumentoAlteracaoEnum.OCULTADO, 2);

    expect(store.abertoId()).toBe(2);
    expect(store.aberto()?.id).toBe(2);
    expect(notificar).not.toHaveBeenCalled();
  });

  it('mestre: REMOVIDO do aberto fecha com o aviso', () => {
    const { store, notificar, evento, alterarLista } = montar({ mestre: true });
    store.selecionar(1);

    alterarLista([resumo(2), resumo(3)]);
    evento(DocumentoAlteracaoEnum.REMOVIDO, 1);

    expect(store.abertoId()).toBeNull();
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({ detalhe: 'Este documento não está mais disponível.' }),
    );
  });

  it('leitura: o OCULTADO do aberto continua fechando (a forma padrão não muda)', () => {
    const { store, evento, alterarLista } = montar();
    store.selecionar(2);

    alterarLista([resumo(1)]);
    evento(DocumentoAlteracaoEnum.OCULTADO, 2);

    expect(store.abertoId()).toBeNull();
  });

  it('mestre: Revelar aplica a versão nova no aberto e na lista e avisa como a página', () => {
    const { store, documentoService, notificar } = montar({ mestre: true });
    store.selecionar(1);

    store.alternarRevelacao();

    expect(documentoService.revelar).toHaveBeenCalledWith(1);
    expect(store.aberto()).toEqual(expect.objectContaining({ revelado: true, updatedDate: V2 }));
    expect(store.documentos().find((item) => item.id === 1)).toEqual(
      expect.objectContaining({ revelado: true, updatedDate: V2 }),
    );
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({ severidade: 'sucesso', resumo: 'Revelado para a mesa' }),
    );
    expect(store.emOperacao()).toBe(false);
  });

  it('mestre: Ocultar o revelado usa ocultar e avisa "Oculto"', () => {
    const { store, documentoService, notificar } = montar({ mestre: true });
    store.selecionar(2);

    store.alternarRevelacao();

    expect(documentoService.ocultar).toHaveBeenCalledWith(2);
    expect(store.aberto()?.revelado).toBe(false);
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ resumo: 'Oculto' }));
  });

  it('mestre: imagem sem arquivo não é revelada (a trava da página)', () => {
    const { store, documentoService } = montar({ mestre: true });
    store.selecionar(3);

    store.alternarRevelacao();

    expect(documentoService.revelar).not.toHaveBeenCalled();
    expect(store.aberto()?.revelado).toBe(false);
  });

  it('leitura: alternarRevelacao não faz nada', () => {
    const { store, documentoService } = montar();
    store.selecionar(1);

    store.alternarRevelacao();

    expect(documentoService.revelar).not.toHaveBeenCalled();
    expect(documentoService.ocultar).not.toHaveBeenCalled();
  });

  it('pausar informa null sem esquecer o aberto; retomar informa o aberto de novo', () => {
    const { store, tempoReal } = montar();
    store.selecionar(1);
    tempoReal.informarLeitura.mockClear();

    store.pausarLeitura();
    store.pausarLeitura();
    expect(store.abertoId()).toBe(1);
    store.retomarLeitura();

    expect(tempoReal.informarLeitura.mock.calls).toEqual([
      [CAMPANHA_ID, null],
      [CAMPANHA_ID, 1],
    ]);
  });

  it('erro na carga da lista: erroLista, e "Tentar novamente" recarrega', () => {
    const { store, documentoService, voltarAFuncionar } = montar({ falharLista: true });

    expect(store.erroLista()).toBe(true);
    expect(store.carregandoLista()).toBe(false);

    voltarAFuncionar();
    store.tentarNovamente();

    expect(documentoService.listar).toHaveBeenCalledTimes(2);
    expect(store.erroLista()).toBe(false);
    expect(store.documentos()).toHaveLength(3);
  });

  it('destruir a store sai da sala uma vez só (a contagem de referência é do TempoRealService)', () => {
    const { tempoReal } = montar();

    TestBed.resetTestingModule();

    expect(tempoReal.entrarSalaCampanha).toHaveBeenCalledTimes(1);
    expect(tempoReal.sairSalaCampanha).toHaveBeenCalledTimes(1);
  });
});
