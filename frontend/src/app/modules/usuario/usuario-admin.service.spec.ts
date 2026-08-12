import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UsuarioListadosDto } from '@contratados-rpg/shared/dtos/usuario';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { UsuarioAdminService } from './usuario-admin.service';

describe('UsuarioAdminService', () => {
  function envelope<T>(dados: T): StandardResponse<T> {
    return { sucesso: true, dados, mensagem: 'ok' };
  }

  function criar(): { servico: UsuarioAdminService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      servico: TestBed.inject(UsuarioAdminService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista usuários com filtros e extrai o resultado paginado', () => {
    const { servico, http } = criar();
    const resultado = new UsuarioListadosDto({
      itens: [], totalItens: 0, paginaAtual: 2, totalPaginas: 0,
    });
    let recebido: UsuarioListadosDto | undefined;

    servico.listarUsuarios({
      pagina: 2, itensPorPagina: 10, ordenarPor: 'nome', direcao: 'ASC',
      login: 'ana', nome: 'martins', tipo: TipoUsuarioEnum.ADMIN, apenasExcluidos: true,
    }).subscribe((dados) => (recebido = dados));

    const requisicao = http.expectOne((req) => req.url.endsWith('/usuario/admin'));
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('pagina')).toBe('2');
    expect(requisicao.request.params.get('itensPorPagina')).toBe('10');
    expect(requisicao.request.params.get('login')).toBe('ana');
    expect(requisicao.request.params.get('nome')).toBe('martins');
    expect(requisicao.request.params.get('tipo')).toBe(TipoUsuarioEnum.ADMIN);
    expect(requisicao.request.params.get('apenasExcluidos')).toBe('true');
    requisicao.flush(envelope(resultado));
    expect(recebido).toEqual(resultado);
  });

  it('cria uma conta', () => {
    const { servico, http } = criar();
    servico.criarUsuario({
      login: 'ana',
      nome: 'Ana',
      senha: 'senha123',
      tipo: TipoUsuarioEnum.TESTER,
    }).subscribe();
    const requisicao = http.expectOne((req) => req.url.endsWith('/usuario/admin'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({
      login: 'ana',
      nome: 'Ana',
      senha: 'senha123',
      tipo: TipoUsuarioEnum.TESTER,
    });
    requisicao.flush(envelope({ id: 7, login: 'ana', nome: 'Ana' }));
  });

  it('altera nome e login sem repetir o id no corpo', () => {
    const { servico, http } = criar();
    servico.alterarUsuario({ id: 7, login: 'ana.nova', nome: 'Ana Nova' }).subscribe();
    const requisicao = http.expectOne((req) => req.url.endsWith('/usuario/admin/7'));
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ login: 'ana.nova', nome: 'Ana Nova' });
    requisicao.flush(envelope({ id: 7, login: 'ana.nova', nome: 'Ana Nova' }));
  });

  it('redefine senha e troca tipo sem repetir o id no corpo', () => {
    const { servico, http } = criar();
    servico.resetarSenha({ id: 7, novaSenha: 'novaSenha123' }).subscribe();
    let requisicao = http.expectOne((req) => req.url.endsWith('/usuario/admin/7/senha'));
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ novaSenha: 'novaSenha123' });
    requisicao.flush(envelope({ id: 7, login: 'ana', nome: 'Ana' }));

    servico.alterarTipo({ id: 7, tipo: TipoUsuarioEnum.TESTER }).subscribe();
    requisicao = http.expectOne((req) => req.url.endsWith('/usuario/admin/7/tipo'));
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ tipo: TipoUsuarioEnum.TESTER });
    requisicao.flush(envelope({
      id: 7, login: 'ana', nome: 'Ana', tipo: TipoUsuarioEnum.TESTER, tipoDescricao: 'Testador',
    }));
  });

  it('exclui e reativa a conta indicada', () => {
    const { servico, http } = criar();
    servico.excluirUsuario({ id: 7 }).subscribe();
    let requisicao = http.expectOne((req) => req.url.endsWith('/usuario/admin/7'));
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(envelope(null));

    servico.reativarUsuario({ id: 7 }).subscribe();
    requisicao = http.expectOne((req) => req.url.endsWith('/usuario/admin/7/reativar'));
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({});
    requisicao.flush(envelope({ id: 7, login: 'ana', nome: 'Ana' }));
  });

  it('solicita impersonação e devolve a sessão integral do alvo', () => {
    const { servico, http } = criar();
    const alvo = {
      token: 'token-alvo', id: 8, login: 'bia', nome: 'Bia', tipo: TipoUsuarioEnum.NORMAL,
    };
    let resultado: typeof alvo | undefined;

    servico.impersonarUsuario({ id: 8 }).subscribe((sessao) => { resultado = sessao; });
    const requisicao = http.expectOne((req) => req.url.endsWith('/usuario/admin/impersonar'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ id: 8 });
    requisicao.flush(envelope(alvo));

    expect(resultado).toEqual(alvo);
  });
});
