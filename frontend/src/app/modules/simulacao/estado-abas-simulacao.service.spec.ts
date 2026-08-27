import { TestBed } from '@angular/core/testing';

import { EstadoAbasSimulacaoService } from './estado-abas-simulacao.service';

/**
 * Prova o contrato do singleton em memória (m1-17): guardar e recuperar o valor bruto por aba,
 * sobrescrever o anterior e manter as abas isoladas entre si. Sem I/O — só memória.
 */
describe('EstadoAbasSimulacaoService', () => {
  function criar(): EstadoAbasSimulacaoService {
    return TestBed.inject(EstadoAbasSimulacaoService);
  }

  it('retorna undefined para uma aba ainda não preenchida', () => {
    const servico = criar();
    expect(servico.obterEstado('dt')).toBeUndefined();
  });

  it('guarda e recupera o valor bruto de uma aba', () => {
    const servico = criar();
    servico.definirEstado('dt', { nivel: 15, atributo: 4 });
    expect(servico.obterEstado('dt')).toEqual({ nivel: 15, atributo: 4 });
  });

  it('sobrescreve o valor anterior da mesma aba', () => {
    const servico = criar();
    servico.definirEstado('patente', { prestigio: 10 });
    servico.definirEstado('patente', { prestigio: 40 });
    expect(servico.obterEstado('patente')).toEqual({ prestigio: 40 });
  });

  it('mantém as abas isoladas entre si', () => {
    const servico = criar();
    servico.definirEstado('dt', { nivel: 7, atributo: 2 });
    servico.definirEstado('patente', { prestigio: 5 });
    expect(servico.obterEstado('dt')).toEqual({ nivel: 7, atributo: 2 });
    expect(servico.obterEstado('patente')).toEqual({ prestigio: 5 });
  });
});
