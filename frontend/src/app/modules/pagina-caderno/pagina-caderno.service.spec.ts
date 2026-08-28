import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  BuscaCampanhaResultadoDto,
  PaginaCadernoDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import {
  BuscaCampanhaFonteEnum,
  BuscaCampanhaResultadoTipoEnum,
  TipoPaginaCadernoEnum,
} from '@contratados-rpg/shared/enums';
import type { PaginatedResult, StandardResponse } from '@contratados-rpg/shared/interfaces';

import { PaginaCadernoService } from './pagina-caderno.service';

const pagina: PaginaCadernoDto = {
  id: 9,
  campanhaId: 3,
  usuarioAutorId: 7,
  autorNome: 'Agente',
  tipo: TipoPaginaCadernoEnum.PRIVADA,
  titulo: 'Relatório',
  conteudoMarkdown: 'Texto',
  somenteLeitura: false,
  createdDate: '2026-08-14T12:00:00.000Z',
  updatedDate: '2026-08-14T12:00:00.000Z',
};
const resumo: PaginaCadernoResumoDto = {
  id: 9,
  campanhaId: 3,
  usuarioAutorId: 7,
  autorNome: 'Agente',
  tipo: TipoPaginaCadernoEnum.PRIVADA,
  titulo: 'Relatório',
  updatedDate: '2026-08-14T12:00:00.000Z',
};

describe('PaginaCadernoService', () => {
  function envelope<T>(dados: T): StandardResponse<T> {
    return { sucesso: true, dados, mensagem: 'ok' };
  }

  function criar(): { servico: PaginaCadernoService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      servico: TestBed.inject(PaginaCadernoService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista o próprio caderno da campanha', () => {
    const { servico, http } = criar();
    let recebido: readonly PaginaCadernoResumoDto[] | undefined;

    servico.listarPaginas(3).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/caderno/paginas'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope([resumo]));

    expect(recebido).toEqual([resumo]);
  });

  it('lista o caderno de um jogador pela rota do mestre', () => {
    const { servico, http } = criar();

    servico.listarPaginasMembro(3, 7).subscribe();
    const requisicao = http.expectOne((req) =>
      req.url.endsWith('/campanha/3/caderno/membros/7/paginas'),
    );
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope([resumo]));
  });

  it('cria página sem duplicar o id da campanha no corpo', () => {
    const { servico, http } = criar();

    servico.criarPagina(3, { titulo: 'Relatório', conteudoMarkdown: '' }).subscribe();
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/caderno/paginas'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ titulo: 'Relatório', conteudoMarkdown: '' });
    requisicao.flush(envelope(pagina));
  });

  it('recupera, altera e exclui uma página pelas rotas individuais', () => {
    const { servico, http } = criar();

    servico.recuperarPagina(9).subscribe();
    const recuperar = http.expectOne((req) => req.url.endsWith('/pagina-caderno/9'));
    expect(recuperar.request.method).toBe('GET');
    recuperar.flush(envelope(pagina));

    servico
      .alterarPagina(9, {
        titulo: 'Novo',
        conteudoMarkdown: 'Texto',
        updatedDate: pagina.updatedDate,
      })
      .subscribe();
    const alterar = http.expectOne((req) => req.url.endsWith('/pagina-caderno/9'));
    expect(alterar.request.method).toBe('PUT');
    expect(alterar.request.body).toEqual({
      titulo: 'Novo',
      conteudoMarkdown: 'Texto',
      updatedDate: pagina.updatedDate,
    });
    alterar.flush(envelope({ ...pagina, titulo: 'Novo' }));

    servico.excluirPagina(9).subscribe();
    const excluir = http.expectOne((req) => req.url.endsWith('/pagina-caderno/9'));
    expect(excluir.request.method).toBe('DELETE');
    excluir.flush(envelope(null));
  });

  it('serializa filtros combinados e paginação da busca', () => {
    const { servico, http } = criar();
    const resultado: PaginatedResult<BuscaCampanhaResultadoDto> = {
      itens: [
        {
          tipo: BuscaCampanhaResultadoTipoEnum.PAGINA_CADERNO,
          id: 9,
          titulo: 'Relatório',
          trecho: '⟦contenção⟧',
          autorNome: 'Agente',
          updatedDate: pagina.updatedDate,
          relevancia: 0.8,
        },
      ],
      totalItens: 1,
      paginaAtual: 2,
      totalPaginas: 2,
    };

    servico
      .buscarCampanha({
        campanhaId: 3,
        termo: 'contenção',
        fontes: [BuscaCampanhaFonteEnum.MEU_CADERNO, BuscaCampanhaFonteEnum.MINHAS_FICHAS],
        pagina: 2,
        limite: 10,
      })
      .subscribe();
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/busca'));
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('termo')).toBe('contenção');
    expect(requisicao.request.params.get('fontes')).toBe('MEU_CADERNO,MINHAS_FICHAS');
    expect(requisicao.request.params.get('pagina')).toBe('2');
    expect(requisicao.request.params.get('limite')).toBe('10');
    requisicao.flush(envelope(resultado));
  });
});
