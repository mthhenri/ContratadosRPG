import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  DocumentoLeitorDto,
  DocumentoLeitoresDto,
  DocumentoLeituraConexaoInternoRemoverDto,
  DocumentoLeituraDocumentoInternoRemoverDto,
  DocumentoLeituraInternoRegistrarDto,
  DocumentoLeituraUsuarioInternoRemoverDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';

/** O que uma conexão (socket) está lendo — uma leitura por conexão, a última informada. */
interface LeituraConexao {
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly papel: TipoCampanhaMembroPapelEnum;
  readonly documentoId: number | null;
}

/**
 * Presença de leitura da Biblioteca (`m9-09`) — quem está com cada documento aberto, para o mestre.
 *
 * **Efêmera e em memória**: nada vai ao banco. O mapa vale por processo, como as salas do
 * Socket.IO (sem adapter compartilhado); se o backend reinicia, cada cliente informa de novo na
 * reconexão. O estado vive aqui, nunca no gateway (proibição #25/#28): o `CampanhaGateway` só
 * encaminha o que chega do socket e emite o que esta service manda.
 *
 * Esta service **não decide permissão** — recebe só leituras já validadas pela `DocumentoService`
 * (`informarLeitura`), dona do recorte "quem pode ler o quê".
 *
 * **Retrato**: a campanha inteira, agrupada por usuário e documento (duas abas no mesmo documento
 * contam uma vez), sem o mestre. Só é emitido — e só para `campanha:<id>:mestre` — quando muda;
 * um socket do mestre que informa recebe o retrato atual direto, para quem abre a Biblioteca
 * depois dos jogadores.
 */
@Injectable()
export class DocumentoLeituraService {
  private readonly leituraPorConexao = new Map<string, LeituraConexao>();

  constructor(
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
  ) {}

  /** Grava a leitura da conexão (substituindo a anterior, de qualquer campanha). */
  registrarLeitura(dto: DocumentoLeituraInternoRegistrarDto): void {
    const leituraAnterior = this.leituraPorConexao.get(dto.conexaoId);
    const campanhasAfetadas = new Set<number>([dto.campanhaId]);
    if (leituraAnterior) {
      campanhasAfetadas.add(leituraAnterior.campanhaId);
    }

    this.aplicarMudanca(campanhasAfetadas, () => {
      this.leituraPorConexao.set(dto.conexaoId, {
        campanhaId: dto.campanhaId,
        usuarioId: dto.usuarioId,
        papel: dto.papel,
        documentoId: dto.documentoId,
      });
    });

    if (dto.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
      this.campanhaGateway.emitirDocumentoLeitoresParaConexao(
        dto.conexaoId,
        this.montarRetrato(dto.campanhaId),
      );
    }
  }

  /** Limpa a leitura de uma conexão: desconexão (`campanhaId` `null`) ou `campanha:sair`. */
  removerLeituraConexao(dto: DocumentoLeituraConexaoInternoRemoverDto): void {
    const leitura = this.leituraPorConexao.get(dto.conexaoId);
    if (!leitura || (dto.campanhaId !== null && leitura.campanhaId !== dto.campanhaId)) {
      return;
    }
    this.aplicarMudanca(new Set([leitura.campanhaId]), () => {
      this.leituraPorConexao.delete(dto.conexaoId);
    });
  }

  /** Limpa toda leitura de um usuário na campanha — papel alterado ou acesso revogado. */
  removerLeituraUsuario(dto: DocumentoLeituraUsuarioInternoRemoverDto): void {
    this.removerOnde(
      dto.campanhaId,
      (leitura) => leitura.usuarioId === dto.usuarioId,
    );
  }

  /**
   * Tira do documento ocultado ou removido todo leitor que não é mestre, sem esperar o cliente
   * informar — chamada pela `DocumentoService` depois da mutação.
   */
  removerLeitoresDocumento(dto: DocumentoLeituraDocumentoInternoRemoverDto): void {
    this.removerOnde(
      dto.campanhaId,
      (leitura) =>
        leitura.documentoId === dto.documentoId &&
        leitura.papel !== TipoCampanhaMembroPapelEnum.MESTRE,
    );
  }

  /** Retrato atual da campanha: um item por usuário e documento, sem o mestre, em ordem estável. */
  montarRetrato(campanhaId: number): DocumentoLeitoresDto {
    const leitoresPorChave = new Map<string, DocumentoLeitorDto>();
    for (const leitura of this.leituraPorConexao.values()) {
      if (
        leitura.campanhaId !== campanhaId ||
        leitura.documentoId === null ||
        leitura.papel === TipoCampanhaMembroPapelEnum.MESTRE
      ) {
        continue;
      }
      leitoresPorChave.set(`${leitura.documentoId}:${leitura.usuarioId}`, {
        documentoId: leitura.documentoId,
        usuarioId: leitura.usuarioId,
        papel: leitura.papel,
      });
    }
    const leitores = [...leitoresPorChave.values()].sort(
      (primeiro, segundo) =>
        primeiro.documentoId - segundo.documentoId || primeiro.usuarioId - segundo.usuarioId,
    );
    return { campanhaId, leitores };
  }

  private removerOnde(campanhaId: number, remover: (leitura: LeituraConexao) => boolean): void {
    this.aplicarMudanca(new Set([campanhaId]), () => {
      for (const [conexaoId, leitura] of this.leituraPorConexao) {
        if (leitura.campanhaId === campanhaId && remover(leitura)) {
          this.leituraPorConexao.delete(conexaoId);
        }
      }
    });
  }

  /** Aplica a mudança e emite o retrato de cada campanha afetada cujo retrato de fato mudou. */
  private aplicarMudanca(campanhasAfetadas: ReadonlySet<number>, mudar: () => void): void {
    const retratosAnteriores = new Map<number, string>();
    for (const campanhaId of campanhasAfetadas) {
      retratosAnteriores.set(campanhaId, JSON.stringify(this.montarRetrato(campanhaId)));
    }
    mudar();
    for (const campanhaId of campanhasAfetadas) {
      const retrato = this.montarRetrato(campanhaId);
      if (JSON.stringify(retrato) !== retratosAnteriores.get(campanhaId)) {
        this.campanhaGateway.emitirDocumentoLeitores(retrato);
      }
    }
  }
}
