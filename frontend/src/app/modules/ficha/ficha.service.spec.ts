import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import { ClasseEnum } from '@contratados-rpg/shared/enums';
import {
  FichaAcessoConcedidoDto,
  FichaAcessoResumoDto,
  FichaAcessoRevogadoDto,
  FichaAlteradaDto,
  FichaCriadaDto,
  FichaJogadorDadosDto,
  FichaRecuperadaDto,
  FichaResumoDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { FichaService } from './ficha.service';

/**
 * Prova o cliente HTTP de ficha (m3-06/m3-07): cada método atinge a rota/verbo/corpo correto dos
 * endpoints do CRUD de ficha (m3-03) e da concessão de acesso (m3-04), e devolve o `dados`
 * extraído do `StandardResponse`.
 */
describe('FichaService', () => {
  const dados: FichaJogadorDadosDto = {
    classe: ClasseEnum.COMBATENTE,
    arquetipo: null,
    nivel: 0,
    prestigio: 0,
    atributos: {
      destreza: 1,
      forca: 1,
      luta: 1,
      pontaria: 1,
      vigor: 1,
      intelecto: 1,
      medicina: 1,
      sentidos: 1,
      social: 1,
      vontade: 1,
    },
    maestria: null,
    estado: { vidaAtual: 5, energiaAtual: 5, sequelas: [], traumas: [], lesoes: [] },
    habilidades: [],
    inventario: { itens: [], amplificadores: [] },
    anotacoes: '',
  };

  function envelope<T>(conteudo: T): StandardResponse<T> {
    return { sucesso: true, dados: conteudo, mensagem: 'ok' };
  }

  function criar(): { servico: FichaService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      servico: TestBed.inject(FichaService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('cria uma ficha na campanha informada', () => {
    const { servico, http } = criar();
    const criada: FichaCriadaDto = { id: 3, campanhaId: 9, usuarioId: 7, nome: 'Kane', dados };

    let recebido: FichaCriadaDto | undefined;
    servico.criarFicha({ campanhaId: 9, nome: 'Kane', dados }).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ campanhaId: 9, nome: 'Kane', dados });
    requisicao.flush(envelope(criada));

    expect(recebido).toEqual(criada);
  });

  it('recupera uma ficha pelo id', () => {
    const { servico, http } = criar();
    const recuperada: FichaRecuperadaDto = { id: 3, campanhaId: 9, usuarioId: 7, nome: 'Kane', dados };

    let recebido: FichaRecuperadaDto | undefined;
    servico.recuperarFicha(3).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(recuperada));

    expect(recebido).toEqual(recuperada);
  });

  it('altera nome/dados de uma ficha', () => {
    const { servico, http } = criar();
    const alterada: FichaAlteradaDto = { id: 3, campanhaId: 9, usuarioId: 7, nome: 'Novo', dados };

    let recebido: FichaAlteradaDto | undefined;
    servico.alterarFicha(3, { nome: 'Novo', dados }).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ nome: 'Novo', dados });
    requisicao.flush(envelope(alterada));

    expect(recebido).toEqual(alterada);
  });

  it('lista as fichas da campanha pelo campanhaId', () => {
    const { servico, http } = criar();
    const fichas: FichaResumoDto[] = [
      {
        id: 3,
        usuarioId: 7,
        nome: 'Kane',
        classe: ClasseEnum.COMBATENTE,
        nivel: 2,
        vidaAtual: 34,
        vidaMaxima: 34,
        energiaAtual: 18,
        energiaMaxima: 18,
        morrendo: false,
        machucado: false,
        inconsciente: false,
      },
    ];

    let recebido: FichaResumoDto[] | undefined;
    servico.listarFichas(9).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha'));
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('campanhaId')).toBe('9');
    requisicao.flush(envelope(fichas));

    expect(recebido).toEqual(fichas);
  });

  it('lista as concessões de acesso de uma ficha', () => {
    const { servico, http } = criar();
    const acessos: FichaAcessoResumoDto[] = [{ usuarioId: 11, nome: 'Vera' }];

    let recebido: FichaAcessoResumoDto[] | undefined;
    servico.listarAcessos(3).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3/acesso'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(acessos));

    expect(recebido).toEqual(acessos);
  });

  it('concede acesso enviando o usuarioId no corpo', () => {
    const { servico, http } = criar();
    const concedido: FichaAcessoConcedidoDto = { id: 5, fichaId: 3, usuarioId: 11 };

    let recebido: FichaAcessoConcedidoDto | undefined;
    servico.concederAcesso(3, 11).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3/acesso'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ usuarioId: 11 });
    requisicao.flush(envelope(concedido));

    expect(recebido).toEqual(concedido);
  });

  it('revoga acesso pela rota ficha/usuario', () => {
    const { servico, http } = criar();
    const revogado: FichaAcessoRevogadoDto = { fichaId: 3, usuarioId: 11 };

    let recebido: FichaAcessoRevogadoDto | undefined;
    servico.revogarAcesso(3, 11).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3/acesso/11'));
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(envelope(revogado));

    expect(recebido).toEqual(revogado);
  });
});
