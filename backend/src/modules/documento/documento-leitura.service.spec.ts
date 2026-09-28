import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { DocumentoLeitoresDto } from '@contratados-rpg/shared/dtos/documento';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import { DocumentoLeituraService } from './documento-leitura.service';

const { MESTRE, JOGADOR, ESPECTADOR } = TipoCampanhaMembroPapelEnum;

describe('DocumentoLeituraService (m9-09, presença de leitura)', () => {
  let campanhaGateway: {
    emitirDocumentoLeitores: Mock<(retrato: DocumentoLeitoresDto) => void>;
    emitirDocumentoLeitoresParaConexao: Mock<(conexaoId: string, retrato: DocumentoLeitoresDto) => void>;
  };
  let service: DocumentoLeituraService;

  /** Registra a leitura de uma conexão (já validada pela `DocumentoService`). */
  function ler(
    conexaoId: string,
    usuarioId: number,
    papel: TipoCampanhaMembroPapelEnum,
    documentoId: number | null,
    campanhaId = 5,
  ): void {
    service.registrarLeitura({ conexaoId, campanhaId, usuarioId, papel, documentoId });
  }

  function retratosEmitidos(): DocumentoLeitoresDto[] {
    return campanhaGateway.emitirDocumentoLeitores.mock.calls.map(([retrato]) => retrato);
  }

  beforeEach(() => {
    campanhaGateway = {
      emitirDocumentoLeitores: vi.fn(),
      emitirDocumentoLeitoresParaConexao: vi.fn(),
    };
    service = new DocumentoLeituraService(campanhaGateway as unknown as CampanhaGateway);
  });

  it('abrir, trocar e fechar emitem o retrato completo a cada mudança', () => {
    ler('s-j', 2, JOGADOR, 70);
    ler('s-j', 2, JOGADOR, 71);
    ler('s-j', 2, JOGADOR, null);

    expect(retratosEmitidos()).toEqual([
      { campanhaId: 5, leitores: [{ documentoId: 70, usuarioId: 2, papel: JOGADOR }] },
      { campanhaId: 5, leitores: [{ documentoId: 71, usuarioId: 2, papel: JOGADOR }] },
      { campanhaId: 5, leitores: [] },
    ]);
  });

  it('duas abas do mesmo usuário no mesmo documento contam uma vez', () => {
    ler('aba-1', 2, JOGADOR, 70);
    ler('aba-2', 2, JOGADOR, 70);

    expect(campanhaGateway.emitirDocumentoLeitores).toHaveBeenCalledTimes(1);
    expect(service.montarRetrato(5).leitores).toEqual([{ documentoId: 70, usuarioId: 2, papel: JOGADOR }]);

    service.removerLeituraConexao({ conexaoId: 'aba-1', campanhaId: null });
    expect(campanhaGateway.emitirDocumentoLeitores).toHaveBeenCalledTimes(1);
    expect(service.montarRetrato(5).leitores).toHaveLength(1);
  });

  it('o retrato agrupa por usuário e documento, em ordem estável, com o espectador marcado', () => {
    ler('s-e', 3, ESPECTADOR, 71);
    ler('s-j', 2, JOGADOR, 71);
    ler('s-j2', 4, JOGADOR, 70);

    expect(service.montarRetrato(5).leitores).toEqual([
      { documentoId: 70, usuarioId: 4, papel: JOGADOR },
      { documentoId: 71, usuarioId: 2, papel: JOGADOR },
      { documentoId: 71, usuarioId: 3, papel: ESPECTADOR },
    ]);
  });

  it('o mestre fica fora do retrato, e a leitura dele não emite para a sala', () => {
    ler('s-m', 1, MESTRE, 70);

    expect(campanhaGateway.emitirDocumentoLeitores).not.toHaveBeenCalled();
    expect(service.montarRetrato(5).leitores).toEqual([]);
  });

  it('o mestre que informa recebe o retrato atual direto na conexão dele', () => {
    ler('s-j', 2, JOGADOR, 70);
    ler('s-m', 1, MESTRE, null);

    expect(campanhaGateway.emitirDocumentoLeitoresParaConexao).toHaveBeenCalledWith('s-m', {
      campanhaId: 5,
      leitores: [{ documentoId: 70, usuarioId: 2, papel: JOGADOR }],
    });
  });

  it('não entrega retrato por conexão a jogador nem espectador', () => {
    ler('s-j', 2, JOGADOR, 70);
    ler('s-e', 3, ESPECTADOR, null);

    expect(campanhaGateway.emitirDocumentoLeitoresParaConexao).not.toHaveBeenCalled();
  });

  it('só emite quando o retrato muda', () => {
    ler('s-j', 2, JOGADOR, 70);
    ler('s-j', 2, JOGADOR, 70);
    ler('s-e', 3, ESPECTADOR, null);

    expect(campanhaGateway.emitirDocumentoLeitores).toHaveBeenCalledTimes(1);
  });

  it('desconexão limpa a leitura da conexão em qualquer campanha', () => {
    ler('s-j', 2, JOGADOR, 70);

    service.removerLeituraConexao({ conexaoId: 's-j', campanhaId: null });

    expect(retratosEmitidos().at(-1)).toEqual({ campanhaId: 5, leitores: [] });
  });

  it('campanha:sair limpa só a leitura daquela campanha', () => {
    ler('s-j', 2, JOGADOR, 70);

    service.removerLeituraConexao({ conexaoId: 's-j', campanhaId: 8 });
    expect(service.montarRetrato(5).leitores).toHaveLength(1);

    service.removerLeituraConexao({ conexaoId: 's-j', campanhaId: 5 });
    expect(service.montarRetrato(5).leitores).toEqual([]);
    expect(retratosEmitidos().at(-1)).toEqual({ campanhaId: 5, leitores: [] });
  });

  it('a conexão que passa a ler em outra campanha sai do retrato da anterior', () => {
    ler('s-j', 2, JOGADOR, 70, 5);
    ler('s-j', 2, JOGADOR, 90, 8);

    expect(service.montarRetrato(5).leitores).toEqual([]);
    expect(retratosEmitidos().slice(-2)).toEqual(
      expect.arrayContaining([
        { campanhaId: 5, leitores: [] },
        { campanhaId: 8, leitores: [{ documentoId: 90, usuarioId: 2, papel: JOGADOR }] },
      ]),
    );
  });

  it('papel alterado ou acesso revogado limpa todas as conexões do usuário na campanha', () => {
    ler('aba-1', 2, JOGADOR, 70);
    ler('aba-2', 2, JOGADOR, 71);
    ler('s-e', 3, ESPECTADOR, 70);

    service.removerLeituraUsuario({ campanhaId: 5, usuarioId: 2 });

    expect(service.montarRetrato(5).leitores).toEqual([{ documentoId: 70, usuarioId: 3, papel: ESPECTADOR }]);
  });

  it('documento ocultado ou removido perde os leitores não-mestre; o resto fica', () => {
    ler('s-m', 1, MESTRE, 70);
    ler('s-j', 2, JOGADOR, 70);
    ler('s-e', 3, ESPECTADOR, 71);
    campanhaGateway.emitirDocumentoLeitores.mockClear();

    service.removerLeitoresDocumento({ campanhaId: 5, documentoId: 70 });

    expect(retratosEmitidos()).toEqual([
      { campanhaId: 5, leitores: [{ documentoId: 71, usuarioId: 3, papel: ESPECTADOR }] },
    ]);
  });
});
