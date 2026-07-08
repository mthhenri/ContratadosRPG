import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import {
  UsuarioPerfilAlteradoDto,
  UsuarioRecuperadoDto,
  UsuarioSenhaAlteradaDto,
} from '@contratados-rpg/shared/dtos/usuario';

import { UsuarioService } from './usuario.service';

/**
 * Prova o cliente HTTP de usuário (m2-14): cada método atinge a rota/verbo correto dos endpoints
 * self-service do perfil (m2-11) e da troca de senha (m2-03) e devolve o `dados` extraído do
 * `StandardResponse`.
 */
describe('UsuarioService', () => {
  function envelope<T>(dados: T): StandardResponse<T> {
    return { sucesso: true, dados, mensagem: 'ok' };
  }

  function criar(): { servico: UsuarioService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      servico: TestBed.inject(UsuarioService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('recupera o perfil do usuário autenticado', () => {
    const { servico, http } = criar();
    const perfil: UsuarioRecuperadoDto = { id: 7, login: 'agente.007', nome: 'Agente Sete' };

    let recebido: UsuarioRecuperadoDto | undefined;
    servico.recuperarPerfil().subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/usuario/perfil'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(perfil));

    expect(recebido).toEqual(perfil);
  });

  it('altera nome/login do perfil', () => {
    const { servico, http } = criar();
    const alterado: UsuarioPerfilAlteradoDto = { id: 7, login: 'novo.login', nome: 'Novo Nome' };

    let recebido: UsuarioPerfilAlteradoDto | undefined;
    servico
      .alterarPerfil({ nome: 'Novo Nome', login: 'novo.login' })
      .subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/usuario/perfil'));
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ nome: 'Novo Nome', login: 'novo.login' });
    requisicao.flush(envelope(alterado));

    expect(recebido).toEqual(alterado);
  });

  it('troca a senha do usuário', () => {
    const { servico, http } = criar();
    const alterada: UsuarioSenhaAlteradaDto = { id: 7, login: 'agente.007', nome: 'Agente Sete' };

    let recebido: UsuarioSenhaAlteradaDto | undefined;
    servico
      .alterarSenha({ senhaAtual: 'antiga', novaSenha: 'novasecreta' })
      .subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/usuario/senha'));
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ senhaAtual: 'antiga', novaSenha: 'novasecreta' });
    requisicao.flush(envelope(alterada));

    expect(recebido).toEqual(alterada);
  });

  it('exclui a própria conta', () => {
    const { servico, http } = criar();

    let concluiu = false;
    servico.excluirConta().subscribe(() => (concluiu = true));
    const requisicao = http.expectOne((req) => req.url.endsWith('/usuario'));
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(envelope(null));

    expect(concluiu).toBe(true);
  });
});
