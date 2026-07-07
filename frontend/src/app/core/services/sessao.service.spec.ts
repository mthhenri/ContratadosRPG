import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import { UsuarioAutenticadoDto, UsuarioCriadoDto } from '@contratados-rpg/shared/dtos/usuario';

import { SessaoService } from './sessao.service';

/**
 * Prova a sessão do frontend (m2-06): abertura da sessão no login com persistência em
 * `localStorage`, restauração no boot (F5), encerramento no `sair` e o registro sem sessão.
 */
describe('SessaoService', () => {
  const CHAVE_SESSAO = 'contratados-rpg.sessao';
  const usuarioAutenticado: UsuarioAutenticadoDto = {
    token: 'jwt-de-teste',
    id: 7,
    login: 'agente.007',
    nome: 'Agente Sete',
  };

  function envelope<T>(dados: T): StandardResponse<T> {
    return { sucesso: true, dados, mensagem: 'ok' };
  }

  function criar(): { servico: SessaoService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      servico: TestBed.inject(SessaoService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('começa deslogado sem sessão persistida', () => {
    const { servico } = criar();
    expect(servico.autenticado()).toBe(false);
    expect(servico.usuario()).toBeNull();
    expect(servico.obterToken()).toBeNull();
  });

  it('abre e persiste a sessão no login', () => {
    const { servico, http } = criar();

    servico.logar({ login: 'agente.007', senha: 'secreta' }).subscribe();
    const requisicao = http.expectOne((req) => req.url.endsWith('/autenticacao/login'));
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush(envelope(usuarioAutenticado));

    expect(servico.autenticado()).toBe(true);
    expect(servico.usuario()).toEqual(usuarioAutenticado);
    expect(servico.obterToken()).toBe('jwt-de-teste');
    expect(JSON.parse(localStorage.getItem(CHAVE_SESSAO) ?? 'null')).toEqual(usuarioAutenticado);
  });

  it('restaura a sessão persistida no boot (F5)', () => {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuarioAutenticado));
    const { servico } = criar();

    expect(servico.autenticado()).toBe(true);
    expect(servico.obterToken()).toBe('jwt-de-teste');
  });

  it('encerra a sessão e limpa o localStorage no sair', () => {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuarioAutenticado));
    const { servico } = criar();

    servico.sair();

    expect(servico.autenticado()).toBe(false);
    expect(servico.usuario()).toBeNull();
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it('registra sem abrir sessão', () => {
    const { servico, http } = criar();
    const usuarioCriado: UsuarioCriadoDto = { id: 9, login: 'novo.agente', nome: 'Novo Agente' };

    servico.registrar({ nome: 'Novo Agente', login: 'novo.agente', senha: 'secreta' }).subscribe();
    const requisicao = http.expectOne((req) => req.url.endsWith('/autenticacao/registro'));
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush(envelope(usuarioCriado));

    expect(servico.autenticado()).toBe(false);
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });

  it('ignora sessão persistida corrompida', () => {
    localStorage.setItem(CHAVE_SESSAO, '{ nao-e-json');
    const { servico } = criar();

    expect(servico.autenticado()).toBe(false);
    expect(localStorage.getItem(CHAVE_SESSAO)).toBeNull();
  });
});
