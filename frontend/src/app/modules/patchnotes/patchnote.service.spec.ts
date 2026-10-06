import { HttpContext, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { PatchnoteRecuperadoDto, PatchnoteResumoDto } from '@contratados-rpg/shared/dtos/patchnote';

import { ERROS_TRATADOS_NA_TELA } from '../../core/interceptors/error-handler.interceptor';
import { PatchnoteService } from './patchnote.service';

const resumo: PatchnoteResumoDto = { versao: '1.1.0', data: '2026-09-29', titulo: 'Cenas' };
const completo: PatchnoteRecuperadoDto = { ...resumo, conteudoMarkdown: '## Novidades' };

describe('PatchnoteService', () => {
  let servico: PatchnoteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(PatchnoteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function tratados(contexto: HttpContext): readonly number[] {
    return contexto.get(ERROS_TRATADOS_NA_TELA);
  }

  it('lista o índice extraindo o `dados` do envelope', () => {
    let recebido: PatchnoteResumoDto[] | undefined;
    servico.listar().subscribe((itens) => (recebido = itens));

    const requisicao = http.expectOne('/patchnote');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({ sucesso: true, dados: [resumo], mensagem: 'ok' });

    expect(recebido).toEqual([resumo]);
  });

  it('recupera a nota da versão pela rota do backend', () => {
    let recebido: PatchnoteRecuperadoDto | undefined;
    servico.recuperar('1.1.0').subscribe((nota) => (recebido = nota));

    http.expectOne('/patchnote/1.1.0').flush({ sucesso: true, dados: completo, mensagem: 'ok' });

    expect(recebido).toEqual(completo);
  });

  it('escapa a versão na URL', () => {
    servico.recuperar('../x').subscribe({ error: () => undefined });
    http.expectOne('/patchnote/..%2Fx').flush('', { status: 404, statusText: 'Not Found' });
  });

  it('declara 404, falhas do servidor e rede fora do ar como tratadas na tela (sem toast)', () => {
    servico.listar().subscribe();
    servico.recuperar('1.1.0').subscribe();

    for (const requisicao of http.match(() => true)) {
      expect(tratados(requisicao.request.context)).toEqual([0, 404, 500, 502, 503, 504]);
      requisicao.flush({ sucesso: true, dados: [], mensagem: 'ok' });
    }
  });

  it('lê sem o cache do navegador só quando pedido (pn-06)', () => {
    servico.listar().subscribe();
    expect(http.expectOne('/patchnote').request.headers.has('Cache-Control')).toBe(false);

    servico.listar({ semCacheNavegador: true }).subscribe();
    servico.recuperar('1.1.0', { semCacheNavegador: true }).subscribe();
    const indice = http.expectOne('/patchnote');
    const nota = http.expectOne('/patchnote/1.1.0');
    expect(indice.request.headers.get('Cache-Control')).toBe('no-cache');
    expect(nota.request.headers.get('Cache-Control')).toBe('no-cache');
    expect(tratados(nota.request.context)).toContain(404);
  });

  it('reinicia o cache da API por POST, com o toast global de erro (pn-06)', () => {
    let recebido: { entradasRemovidas: number } | undefined;
    servico.reiniciarCache().subscribe((resultado) => (recebido = resultado));

    const requisicao = http.expectOne('/patchnote/cache/reiniciar');
    expect(requisicao.request.method).toBe('POST');
    expect(tratados(requisicao.request.context)).toEqual([]);
    requisicao.flush({ sucesso: true, dados: { entradasRemovidas: 3 }, mensagem: 'ok' });

    expect(recebido).toEqual({ entradasRemovidas: 3 });
  });
});
