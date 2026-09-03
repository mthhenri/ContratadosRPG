import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import type {
  CampanhaPainelEspectadorDto,
  CampanhaPreviaJogadorDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { CampanhaProjecaoService } from './campanha-projecao.service';

/**
 * Prova o cliente HTTP das projeções de leitura do espectador (m8-03) e da prévia de jogador
 * (m8-04) — rota e parâmetros.
 */
describe('CampanhaProjecaoService', () => {
  function envelope<T>(dados: T): StandardResponse<T> {
    return { sucesso: true, dados, mensagem: 'ok' };
  }

  function criar(): { servico: CampanhaProjecaoService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      servico: TestBed.inject(CampanhaProjecaoService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('recupera o painel do espectador com pagina/itensPorPagina padrão', () => {
    const { servico, http } = criar();
    const painel: CampanhaPainelEspectadorDto = {
      campanha: { id: 8, nome: 'Contenção Delta', descricao: null, naBase: true },
      rolagens: { itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 },
    };

    let recebido: CampanhaPainelEspectadorDto | undefined;
    servico.recuperarPainelEspectador(8).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne(
      (req) => req.url.endsWith('/campanha/8/painel-espectador'),
    );
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('pagina')).toBe('1');
    expect(requisicao.request.params.get('itensPorPagina')).toBe('20');
    requisicao.flush(envelope(painel));

    expect(recebido).toEqual(painel);
  });

  it('encaminha pagina/itensPorPagina explícitos', () => {
    const { servico, http } = criar();
    servico.recuperarPainelEspectador(8, 2, 10).subscribe();
    const requisicao = http.expectOne(
      (req) => req.url.endsWith('/campanha/8/painel-espectador'),
    );
    expect(requisicao.request.params.get('pagina')).toBe('2');
    expect(requisicao.request.params.get('itensPorPagina')).toBe('10');
    requisicao.flush(
      envelope({
        campanha: { id: 8, nome: 'x', descricao: null, naBase: true },
        rolagens: { itens: [], totalItens: 0, paginaAtual: 2, totalPaginas: 2 },
      }),
    );
  });

  it('recupera a prévia de jogador de um alvo', () => {
    const { servico, http } = criar();
    const previa: CampanhaPreviaJogadorDto = {
      campanha: { id: 8, nome: 'Contenção Delta', descricao: null, naBase: true },
      fichas: [],
      membros: [],
      rolagens: [],
      podeAcessarInventarioEsquadrao: true,
    };

    let recebido: CampanhaPreviaJogadorDto | undefined;
    servico.recuperarPreviaJogador(8, 42).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne(
      (req) => req.url.endsWith('/campanha/8/previa-jogador/42'),
    );
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(previa));

    expect(recebido).toEqual(previa);
  });

  it('recupera a ficha completa da prévia de jogador', () => {
    const { servico, http } = criar();
    const ficha: FichaRecuperadaDto = {
      id: 5,
      campanhaId: 8,
      usuarioId: 42,
      nome: 'Agente Beta',
      cor: null,
      imagemUrl: null,
      imagemFoco: null,
      oculta: false,
      dados: {} as FichaRecuperadaDto['dados'],
    };

    let recebido: FichaRecuperadaDto | undefined;
    servico.recuperarFichaPreviaJogador(8, 42, 5).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne(
      (req) => req.url.endsWith('/campanha/8/previa-jogador/42/ficha/5'),
    );
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope(ficha));

    expect(recebido).toEqual(ficha);
  });
});
