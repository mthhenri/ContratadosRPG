import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import type { CampanhaPainelEspectadorDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaProjecaoService } from './campanha-projecao.service';

/** Prova o cliente HTTP das projeções de leitura do espectador (m8-03) — rota e parâmetros de página. */
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
});
