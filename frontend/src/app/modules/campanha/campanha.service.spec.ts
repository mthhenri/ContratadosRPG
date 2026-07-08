import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  CampanhaAlteradaDto,
  CampanhaConviteRegeneradoDto,
  CampanhaCriadaDto,
  CampanhaEntradaDto,
  CampanhaMembroRemovidoDto,
  CampanhaMembroResumoDto,
  CampanhaMestreTransferidoDto,
  CampanhaRecuperadaDto,
  CampanhaResumoDto,
} from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaService } from './campanha.service';

/**
 * Prova o cliente HTTP de campanha (m2-07): cada método atinge a rota/verbo correto dos
 * endpoints das m2-04/m2-05 e devolve o `dados` extraído do `StandardResponse`.
 */
describe('CampanhaService', () => {
  function envelope<T>(dados: T): StandardResponse<T> {
    return { sucesso: true, dados, mensagem: 'ok' };
  }

  function criar(): { servico: CampanhaService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      servico: TestBed.inject(CampanhaService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista as campanhas do usuário', () => {
    const { servico, http } = criar();
    const campanhas: CampanhaResumoDto[] = [
      { id: 1, nome: 'Contenção Alfa', descricao: null, papel: TipoCampanhaMembroPapelEnum.MESTRE },
    ];

    let recebido: CampanhaResumoDto[] | undefined;
    servico.listarCampanhas().subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(campanhas));

    expect(recebido).toEqual(campanhas);
  });

  it('cria uma campanha', () => {
    const { servico, http } = criar();
    const criada: CampanhaCriadaDto = {
      id: 3,
      nome: 'Contenção Beta',
      descricao: null,
      codigoConvite: 'ABC123',
    };

    let recebido: CampanhaCriadaDto | undefined;
    servico.criarCampanha({ nome: 'Contenção Beta' }).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha'));
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush(envelope(criada));

    expect(recebido).toEqual(criada);
  });

  it('entra numa campanha pelo código', () => {
    const { servico, http } = criar();
    const entrada: CampanhaEntradaDto = {
      id: 5,
      nome: 'Contenção Gama',
      descricao: null,
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    };

    let recebido: CampanhaEntradaDto | undefined;
    servico.entrarCampanha({ codigoConvite: 'XYZ789' }).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/entrar'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ codigoConvite: 'XYZ789' });
    requisicao.flush(envelope(entrada));

    expect(recebido).toEqual(entrada);
  });

  it('recupera uma campanha por id', () => {
    const { servico, http } = criar();
    const campanha: CampanhaRecuperadaDto = {
      id: 8,
      nome: 'Contenção Delta',
      descricao: 'Operação em curso',
      codigoConvite: 'DEF456',
    };

    let recebido: CampanhaRecuperadaDto | undefined;
    servico.recuperarCampanha(8).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/8'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(campanha));

    expect(recebido).toEqual(campanha);
  });

  it('lista os membros de uma campanha', () => {
    const { servico, http } = criar();
    const membros: CampanhaMembroResumoDto[] = [
      { usuarioId: 1, nome: 'Agente A', papel: TipoCampanhaMembroPapelEnum.MESTRE },
      { usuarioId: 2, nome: 'Agente B', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    ];

    let recebido: CampanhaMembroResumoDto[] | undefined;
    servico.listarMembros(8).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/8/membros'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(membros));

    expect(recebido).toEqual(membros);
  });

  it('altera nome/descrição de uma campanha', () => {
    const { servico, http } = criar();
    const alterada: CampanhaAlteradaDto = {
      id: 8,
      nome: 'Contenção Épsilon',
      descricao: 'Nova diretriz',
      codigoConvite: 'DEF456',
    };

    let recebido: CampanhaAlteradaDto | undefined;
    servico
      .alterarCampanha(8, { nome: 'Contenção Épsilon', descricao: 'Nova diretriz' })
      .subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/8'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ nome: 'Contenção Épsilon', descricao: 'Nova diretriz' });
    requisicao.flush(envelope(alterada));

    expect(recebido).toEqual(alterada);
  });

  it('exclui uma campanha', () => {
    const { servico, http } = criar();

    let concluiu = false;
    servico.excluirCampanha(8).subscribe(() => (concluiu = true));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/8'));
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(envelope(null));

    expect(concluiu).toBe(true);
  });

  it('regenera o convite de uma campanha', () => {
    const { servico, http } = criar();
    const regenerado: CampanhaConviteRegeneradoDto = { id: 8, codigoConvite: 'NEW999' };

    let recebido: CampanhaConviteRegeneradoDto | undefined;
    servico.regenerarConvite(8).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/8/convite/regenerar'));
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush(envelope(regenerado));

    expect(recebido).toEqual(regenerado);
  });

  it('remove um membro da campanha', () => {
    const { servico, http } = criar();
    const removido: CampanhaMembroRemovidoDto = { campanhaId: 8, usuarioId: 2 };

    let recebido: CampanhaMembroRemovidoDto | undefined;
    servico.removerMembro(8, 2).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/8/membro/2'));
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(envelope(removido));

    expect(recebido).toEqual(removido);
  });

  it('transfere o papel de mestre a outro membro', () => {
    const { servico, http } = criar();
    const transferido: CampanhaMestreTransferidoDto = {
      campanhaId: 8,
      mestreAnteriorUsuarioId: 1,
      novoMestreUsuarioId: 2,
    };

    let recebido: CampanhaMestreTransferidoDto | undefined;
    servico.transferirMestre(8, 2).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/8/mestre/transferir'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ novoMestreUsuarioId: 2 });
    requisicao.flush(envelope(transferido));

    expect(recebido).toEqual(transferido);
  });
});
