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
