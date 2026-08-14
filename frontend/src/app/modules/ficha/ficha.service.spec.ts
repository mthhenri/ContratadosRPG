import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import {
  FichaAcessoConcedidoDto,
  FichaAcessoResumoDto,
  FichaAcessoRevogadoDto,
  FichaAlteradaDto,
  FichaCriadaDto,
  FichaImagemAlteradaDto,
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
    const criada: FichaCriadaDto = { id: 3, campanhaId: 9, usuarioId: 7, nome: 'Kane', cor: null, imagemUrl: null, dados };

    let recebido: FichaCriadaDto | undefined;
    servico.criarFicha({ campanhaId: 9, nome: 'Kane', dados }).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ campanhaId: 9, nome: 'Kane', dados });
    requisicao.flush(envelope(criada));

    expect(recebido).toEqual(criada);
  });

  it('cria uma ficha solta no acervo, sem campanhaId (m3-28)', () => {
    const { servico, http } = criar();
    const criada: FichaCriadaDto = { id: 6, campanhaId: null, usuarioId: 7, nome: 'Solta', cor: null, imagemUrl: null, dados };

    let recebido: FichaCriadaDto | undefined;
    servico.criarFicha({ nome: 'Solta', dados }).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha'));
    expect(requisicao.request.body).toEqual({ nome: 'Solta', dados });
    requisicao.flush(envelope(criada));

    expect(recebido).toEqual(criada);
  });

  it('recupera uma ficha pelo id', () => {
    const { servico, http } = criar();
    const recuperada: FichaRecuperadaDto = { id: 3, campanhaId: 9, usuarioId: 7, nome: 'Kane', cor: null, imagemUrl: null, oculta: false, dados };

    let recebido: FichaRecuperadaDto | undefined;
    servico.recuperarFicha(3).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(recuperada));

    expect(recebido).toEqual(recuperada);
  });

  it('altera nome/dados de uma ficha', () => {
    const { servico, http } = criar();
    const alterada: FichaAlteradaDto = { id: 3, campanhaId: 9, usuarioId: 7, nome: 'Novo', cor: null, imagemUrl: null, oculta: false, dados };

    let recebido: FichaAlteradaDto | undefined;
    servico.alterarFicha(3, { nome: 'Novo', dados }).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ nome: 'Novo', dados });
    requisicao.flush(envelope(alterada));

    expect(recebido).toEqual(alterada);
  });

  it('altera somente a vitalidade pela rota dedicada', () => {
    const { servico, http } = criar();
    servico.alterarVitalidade(3, { vidaAtual: 7 }).subscribe(() => undefined);

    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3/vitalidade'));
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ vidaAtual: 7 });
    requisicao.flush(envelope({
      id: 3,
      campanhaId: 9,
      usuarioId: 7,
      nome: 'Kane',
      cor: '#2563EB',
      imagemUrl: 'https://exemplo.test/kane.webp',
      oculta: true,
      dados,
    } satisfies FichaAlteradaDto));
  });

  it('lista as fichas da campanha pelo campanhaId', () => {
    const { servico, http } = criar();
    const fichas: FichaResumoDto[] = [
      {
        id: 3,
        campanhaId: 9,
        campanhaNome: 'Operação Alfa',
        usuarioId: 7,
        nome: 'Kane',
        imagemUrl: null,
        classe: ClasseEnum.COMBATENTE,
        arquetipo: ArquetipoEnum.LUTADOR,
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

  it('lista as fichas do acervo (m3-28)', () => {
    const { servico, http } = criar();
    const fichas: FichaResumoDto[] = [
      {
        id: 6,
        campanhaId: null,
        campanhaNome: null,
        usuarioId: 7,
        nome: 'Solta',
        imagemUrl: null,
        classe: ClasseEnum.COMBATENTE,
        arquetipo: null,
        nivel: 1,
        vidaAtual: 20,
        vidaMaxima: 20,
        energiaAtual: 10,
        energiaMaxima: 10,
        morrendo: false,
        machucado: false,
        inconsciente: false,
      },
    ];

    let recebido: FichaResumoDto[] | undefined;
    servico.listarMinhasFichas().subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/minhas'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(fichas));

    expect(recebido).toEqual(fichas);
  });

  it('atribui a ficha a uma campanha (m3-28)', () => {
    const { servico, http } = criar();
    const atribuida = { id: 3, campanhaId: 9 };

    let recebido: { id: number; campanhaId: number | null } | undefined;
    servico.atribuirCampanha(3, 9).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3/campanha'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ campanhaId: 9 });
    requisicao.flush(envelope(atribuida));

    expect(recebido).toEqual(atribuida);
  });

  it('desatribui a ficha (campanhaId: null) da campanha', () => {
    const { servico, http } = criar();
    const desatribuida = { id: 3, campanhaId: null };

    let recebido: { id: number; campanhaId: number | null } | undefined;
    servico.atribuirCampanha(3, null).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3/campanha'));
    expect(requisicao.request.body).toEqual({ campanhaId: null });
    requisicao.flush(envelope(desatribuida));

    expect(recebido).toEqual(desatribuida);
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

  it('exclui uma ficha pelo id (m3-52)', () => {
    const { servico, http } = criar();

    let concluido = false;
    servico.excluirFicha(3).subscribe(() => (concluido = true));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3'));
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(envelope(null));

    expect(concluido).toBe(true);
  });

  it('duplica uma ficha pela rota ficha/:id/duplicar (m3-52)', () => {
    const { servico, http } = criar();
    const clonada: FichaCriadaDto = { id: 8, campanhaId: 9, usuarioId: 7, nome: 'Kane (cópia)', cor: null, imagemUrl: null, dados };

    let recebido: FichaCriadaDto | undefined;
    servico.duplicarFicha(3).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3/duplicar'));
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush(envelope(clonada));

    expect(recebido).toEqual(clonada);
  });

  it('troca o avatar via FormData na rota ficha/:id/imagem (m3-62)', () => {
    const { servico, http } = criar();
    const arquivo = new File(['conteudo'], 'avatar.png', { type: 'image/png' });
    const alterada: FichaImagemAlteradaDto = { imagemUrl: '/uploads/agentes/novo.png' };

    let recebido: FichaImagemAlteradaDto | undefined;
    servico.alterarImagem(3, arquivo).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3/imagem'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toBeInstanceOf(FormData);
    expect((requisicao.request.body as FormData).get('arquivo')).toBe(arquivo);
    requisicao.flush(envelope(alterada));

    expect(recebido).toEqual(alterada);
  });

  it('remove o avatar pela rota ficha/:id/imagem (m3-62)', () => {
    const { servico, http } = criar();
    const removida: FichaImagemAlteradaDto = { imagemUrl: null };

    let recebido: FichaImagemAlteradaDto | undefined;
    servico.excluirImagem(3).subscribe((r) => (recebido = r));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/3/imagem'));
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(envelope(removida));

    expect(recebido).toEqual(removida);
  });
  it('transfere itens entre a ficha e o inventário de esquadrão', () => {
    const { servico, http } = criar();

    servico.pegarItemInventario(3, 'item-base', 2).subscribe();
    const pegar = http.expectOne((req) => req.url.endsWith('/ficha/3/inventario/item/pegar'));
    expect(pegar.request.method).toBe('POST');
    expect(pegar.request.body).toEqual({ campanhaItemId: 'item-base', quantidade: 2 });
    pegar.flush(envelope({ id: 3 } as never));

    servico.mandarItemInventarioParaBase(3, 1).subscribe();
    const mandar = http.expectOne((req) => req.url.endsWith('/ficha/3/inventario/item/mandar-para-base'));
    expect(mandar.request.method).toBe('POST');
    expect(mandar.request.body).toEqual({ indice: 1 });
    mandar.flush(envelope({ id: 3 } as never));
  });
});
