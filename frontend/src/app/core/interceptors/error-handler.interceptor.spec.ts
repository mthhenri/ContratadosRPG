import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';
import { ERROS_TRATADOS_NA_TELA, errorHandlerInterceptor } from './error-handler.interceptor';

/** Prova o toast de erro do interceptor e a exceção `ERROS_TRATADOS_NA_TELA` (m9-04). */
describe('errorHandlerInterceptor', () => {
  function criar(): {
    http: HttpClient;
    controle: HttpTestingController;
    notificacoes: NotificacaoService;
  } {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorHandlerInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      controle: TestBed.inject(HttpTestingController),
      notificacoes: TestBed.inject(NotificacaoService),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('anuncia o erro em toast com a mensagem do backend e o repassa a quem chamou', () => {
    const { http, controle, notificacoes } = criar();
    let status = 0;
    http.get('/documento/1').subscribe({ error: (erro) => (status = erro.status) });

    controle
      .expectOne('/documento/1')
      .flush({ sucesso: false, mensagem: 'Documento não encontrado' }, { status: 404, statusText: 'Not Found' });

    expect(status).toBe(404);
    expect(notificacoes.fila().map((entrada) => entrada.detalhe)).toEqual(['Documento não encontrado']);
  });

  it('não anuncia o status que a tela declarou tratar no controle, mas ainda o repassa', () => {
    const { http, controle, notificacoes } = criar();
    let status = 0;
    const context = new HttpContext().set(ERROS_TRATADOS_NA_TELA, [409]);
    http.put('/documento/1', {}, { context }).subscribe({ error: (erro) => (status = erro.status) });

    controle
      .expectOne('/documento/1')
      .flush({ sucesso: false, mensagem: 'Alterado em outra sessão' }, { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
    expect(notificacoes.fila()).toEqual([]);
  });

  it('um status fora da lista declarada continua indo para o toast', () => {
    const { http, controle, notificacoes } = criar();
    const context = new HttpContext().set(ERROS_TRATADOS_NA_TELA, [409]);
    http.put('/documento/1', {}, { context }).subscribe({ error: () => undefined });

    controle
      .expectOne('/documento/1')
      .flush({ sucesso: false, mensagem: 'Título obrigatório' }, { status: 400, statusText: 'Bad Request' });

    expect(notificacoes.fila()).toHaveLength(1);
  });
});
