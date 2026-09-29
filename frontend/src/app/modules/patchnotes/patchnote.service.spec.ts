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
});
