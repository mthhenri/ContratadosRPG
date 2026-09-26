import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type {
  CenaCriadaDto,
  CenaRecuperadaDto,
  CenaResumoDto,
} from '@contratados-rpg/shared/dtos/cena';
import { CenaStatusEnum, CenaTipoEnum } from '@contratados-rpg/shared/enums';
import type { StandardResponse } from '@contratados-rpg/shared/interfaces';

import { CenaService } from './cena.service';

const resumo: CenaResumoDto = {
  id: 5,
  nome: 'Galpão 7',
  tipo: CenaTipoEnum.INVESTIGACAO,
  status: CenaStatusEnum.PLANEJADA,
  temEncontro: false,
};
const recuperada: CenaRecuperadaDto = {
  id: 5,
  campanhaId: 3,
  nome: 'Galpão 7',
  tipo: CenaTipoEnum.INVESTIGACAO,
  status: CenaStatusEnum.ATIVA,
  encontro: null,
};

/** Prova o transporte do `CenaService` (m7-23): verbo, rota da m7-22, corpo e o `dados` extraído. */
describe('CenaService', () => {
  function envelope<T>(dados: T): StandardResponse<T> {
    return { sucesso: true, dados, mensagem: 'ok' };
  }

  function criar(): { servico: CenaService; http: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { servico: TestBed.inject(CenaService), http: TestBed.inject(HttpTestingController) };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('cria a cena tipada sob a campanha, sem o id da campanha no corpo', () => {
    const { servico, http } = criar();
    const criada: CenaCriadaDto = {
      id: 5,
      campanhaId: 3,
      nome: 'Galpão 7',
      tipo: CenaTipoEnum.COMBATE,
      status: CenaStatusEnum.ATIVA,
    };
    let recebido: CenaCriadaDto | undefined;

    servico
      .criarCena(3, { nome: 'Galpão 7', tipo: CenaTipoEnum.COMBATE, ativarImediatamente: true })
      .subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/cena'));
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({
      nome: 'Galpão 7',
      tipo: CenaTipoEnum.COMBATE,
      ativarImediatamente: true,
    });
    requisicao.flush(envelope(criada));

    expect(recebido).toEqual(criada);
  });

  it('lista as cenas da campanha', () => {
    const { servico, http } = criar();
    let recebido: CenaResumoDto[] | undefined;

    servico.listarPorCampanha(3).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/cena'));
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(envelope([resumo]));

    expect(recebido).toEqual([resumo]);
  });

  it('reordena enviando a lista inteira das planejadas', () => {
    const { servico, http } = criar();

    servico.reordenarCenas(3, [8, 5]).subscribe();
    const requisicao = http.expectOne((req) => req.url.endsWith('/campanha/3/cena/ordem'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ ordem: [8, 5] });
    requisicao.flush(envelope([resumo]));
  });

  it.each([
    ['recuperarCena', 'GET', '/cena/5'],
    ['abrirCena', 'POST', '/cena/5/abrir'],
    ['encerrarCena', 'POST', '/cena/5/encerrar'],
  ] as const)('%s usa %s %s e devolve o estado completo', (metodo, verbo, rota) => {
    const { servico, http } = criar();
    let recebido: CenaRecuperadaDto | undefined;

    servico[metodo](5).subscribe((dados) => (recebido = dados));
    const requisicao = http.expectOne((req) => req.url.endsWith(rota));
    expect(requisicao.request.method).toBe(verbo);
    requisicao.flush(envelope(recuperada));

    expect(recebido).toEqual(recuperada);
  });
});
