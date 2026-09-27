import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type {
  DocumentoAlteradoDto,
  DocumentoCriadoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';
import type { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { ERROS_TRATADOS_NA_TELA } from '../../core/interceptors/error-handler.interceptor';
import { DocumentoService } from './documento.service';

const completo: DocumentoCriadoDto = {
  id: 7,
  campanhaId: 3,
  titulo: 'Carta do informante',
  tipo: TipoDocumentoEnum.TEXTO,
  conteudoMarkdown: '# Carta',
  imagemUrl: null,
  revelado: false,
  ordem: 1,
  createdDate: '2026-09-26T10:00:00.000000Z',
  updatedDate: '2026-09-26T10:00:00.000000Z',
};
const resumo: DocumentoResumoDto = {
  id: 7,
  campanhaId: 3,
  titulo: 'Carta do informante',
  tipo: TipoDocumentoEnum.TEXTO,
  imagemUrl: null,
  revelado: false,
  ordem: 1,
  updatedDate: '2026-09-26T10:00:00.000000Z',
};

/** Prova o transporte do `DocumentoService` (m9-04): verbo, rota da m9-02, corpo e `dados`. */
describe('DocumentoService', () => {
  function envelope<T>(dados: T): StandardResponse<T> {
    return { sucesso: true, dados, mensagem: 'ok' };
  }

  function criar(): { servico: DocumentoService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      servico: TestBed.inject(DocumentoService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista a biblioteca sob a campanha', () => {
    const { servico, http } = criar();
    let recebido: DocumentoResumoDto[] | undefined;
    servico.listar(3).subscribe((dados) => (recebido = dados));

    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/documento'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope([resumo]));
    expect(recebido).toEqual([resumo]);
  });

  it('busca na biblioteca com termo, página e limite na query', () => {
    const { servico, http } = criar();
    let recebido: unknown;
    servico
      .buscar({ campanhaId: 3, termo: 'galpão do porto', pagina: 2, limite: 20 })
      .subscribe((dados) => (recebido = dados));

    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/documento/busca'));
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('termo')).toBe('galpão do porto');
    expect(requisicao.request.params.get('pagina')).toBe('2');
    expect(requisicao.request.params.get('limite')).toBe('20');
    const pagina = { itens: [], totalItens: 0, paginaAtual: 2, totalPaginas: 0 };
    requisicao.flush(envelope(pagina));
    expect(recebido).toEqual(pagina);
  });

  it('recupera o documento completo por id', () => {
    const { servico, http } = criar();
    let recebido: unknown;
    servico.recuperar(7).subscribe((dados) => (recebido = dados));

    const requisicao = http.expectOne((req) => req.url.endsWith('/documento/7'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(completo));
    expect(recebido).toEqual(completo);
  });

  it('cria sob a campanha, sem o id da campanha no corpo', () => {
    const { servico, http } = criar();
    let recebido: unknown;
    servico
      .criar(3, { titulo: 'Mapa', tipo: TipoDocumentoEnum.IMAGEM })
      .subscribe((dados) => (recebido = dados));

    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/documento'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ titulo: 'Mapa', tipo: TipoDocumentoEnum.IMAGEM });
    requisicao.flush(envelope(completo));
    expect(recebido).toEqual(completo);
  });

  it('altera com a versão otimista, id só na rota, e trata o 409 na tela', () => {
    const { servico, http } = criar();
    let recebido: DocumentoAlteradoDto | undefined;
    servico
      .alterar({
        id: 7,
        titulo: 'Carta',
        conteudoMarkdown: 'texto',
        updatedDate: completo.updatedDate,
      })
      .subscribe((dados) => (recebido = dados));

    const requisicao = http.expectOne((req) => req.url.endsWith('/documento/7'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({
      titulo: 'Carta',
      conteudoMarkdown: 'texto',
      updatedDate: completo.updatedDate,
    });
    expect(requisicao.request.context.get(ERROS_TRATADOS_NA_TELA)).toEqual([409]);
    requisicao.flush(envelope(completo));
    expect(recebido).toEqual(completo);
  });

  it('remove com DELETE', () => {
    const { servico, http } = criar();
    let concluiu = false;
    servico.remover(7).subscribe(() => (concluiu = true));

    const requisicao = http.expectOne((req) => req.url.endsWith('/documento/7'));
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(envelope(null));
    expect(concluiu).toBe(true);
  });

  it('revela e oculta por POST nas rotas próprias', () => {
    const { servico, http } = criar();
    const recebidos: unknown[] = [];
    servico.revelar(7).subscribe((dados) => recebidos.push(dados));
    servico.ocultar(7).subscribe((dados) => recebidos.push(dados));

    const revelar = http.expectOne((req) => req.url.endsWith('/documento/7/revelar'));
    expect(revelar.request.method).toBe('POST');
    revelar.flush(envelope({ id: 7, revelado: true, updatedDate: 'v2' }));
    const ocultar = http.expectOne((req) => req.url.endsWith('/documento/7/ocultar'));
    expect(ocultar.request.method).toBe('POST');
    ocultar.flush(envelope({ id: 7, revelado: false, updatedDate: 'v3' }));

    expect(recebidos).toEqual([
      { id: 7, revelado: true, updatedDate: 'v2' },
      { id: 7, revelado: false, updatedDate: 'v3' },
    ]);
  });

  it('reordena com a lista completa de ids sob a campanha', () => {
    const { servico, http } = criar();
    let recebido: unknown;
    servico.reordenar(3, [9, 7, 8]).subscribe((dados) => (recebido = dados));

    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/documento/ordem'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ ordem: [9, 7, 8] });
    requisicao.flush(envelope([resumo]));
    expect(recebido).toEqual([resumo]);
  });

  it('envia a imagem em multipart no campo `arquivo` e trata o 400 na tela', () => {
    const { servico, http } = criar();
    const arquivo = new File([new Uint8Array([1, 2, 3])], 'mapa.png', { type: 'image/png' });
    let recebido: unknown;
    servico.enviarImagem(7, arquivo).subscribe((dados) => (recebido = dados));

    const requisicao = http.expectOne((req) => req.url.endsWith('/documento/7/imagem'));
    expect(requisicao.request.method).toBe('POST');
    const corpo = requisicao.request.body as FormData;
    expect(corpo.get('arquivo')).toBe(arquivo);
    expect(requisicao.request.context.get(ERROS_TRATADOS_NA_TELA)).toEqual([400]);
    requisicao.flush(envelope({ id: 7, imagemUrl: '/uploads/documentos/a.png', updatedDate: 'v2' }));
    expect(recebido).toEqual({ id: 7, imagemUrl: '/uploads/documentos/a.png', updatedDate: 'v2' });
  });
});
