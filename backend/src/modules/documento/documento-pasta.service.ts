import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  DocumentoOrganizacaoRecuperadaDto,
  DocumentoOrganizacaoRecuperarDto,
  DocumentoPastaAlteradaDto,
  DocumentoPastaAlterarDto,
  DocumentoPastaCriadaDto,
  DocumentoPastaCriarDto,
  DocumentoPastaInternoRecuperadaDto,
  DocumentoPastaMovidaDto,
  DocumentoPastaMoverDto,
  DocumentoPastaRemoverDto,
  DocumentoPastaVinculoAlteradoDto,
  DocumentoPastaVinculoAlterarDto,
} from '@contratados-rpg/shared/dtos/documento';
import {
  TipoCampanhaMembroPapelEnum,
  TipoDocumentoOrganizacaoEnum,
} from '@contratados-rpg/shared/enums';
import {
  DOCUMENTO_PASTA_NOME_MAXIMO,
  DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA,
} from '@contratados-rpg/shared/validators';
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import { TransacaoService } from '../../database/transacao.service';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { DocumentoPastaRepository } from './documento-pasta.repository';
import { DocumentoRepository } from './documento.repository';

/** Quem escreve, em qual organização, e se pode escrever. */
interface ContextoOrganizacao {
  readonly organizacao: TipoDocumentoOrganizacaoEnum;
  readonly editavel: boolean;
}

/**
 * Regras das pastas da Biblioteca. Há **duas organizações independentes**, uma por cargo: o mestre
 * tem a sua (só ele a vê e edita); jogadores e espectadores compartilham **uma** (jogadores a
 * editam; espectadores só a veem). O papel do usuário na campanha escolhe a organização — nunca
 * vem do cliente — e a do outro cargo não existe para ele: pasta de outra organização responde 404,
 * a mesma resposta de um id inexistente.
 *
 * O documento não ganha coluna de pasta: o vínculo mora em `documento_pasta_vinculo`. Documento
 * sem vínculo está na raiz. Na organização dos jogadores só entra documento **revelado**; ocultar
 * ou excluir o documento limpa o vínculo, e ele volta à raiz ao ser revelado de novo.
 *
 * Edição simultânea: vence a última gravação. A reordenação lê as irmãs e renumera dentro de uma
 * transação; no pior caso duas gravações empatam numa posição e o desempate por id mantém a
 * ordem estável, sem estado corrompido. Emissão em tempo real só depois de persistir.
 */
@Injectable()
export class DocumentoPastaService {
  constructor(
    private readonly pastaRepositorio: DocumentoPastaRepository,
    private readonly documentoRepositorio: DocumentoRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
    private readonly transacaoService: TransacaoService,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
  ) {}

  /** A organização do cargo do usuário: pastas e em que pasta está cada documento. */
  async recuperarOrganizacao(
    dto: DocumentoOrganizacaoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoOrganizacaoRecuperadaDto> {
    const contexto = await this.resolverContexto(dto.campanhaId, usuarioAtivo);
    const consulta = { campanhaId: dto.campanhaId, organizacao: contexto.organizacao };
    const [pastas, vinculos] = await Promise.all([
      this.pastaRepositorio.listarPastas(consulta),
      this.pastaRepositorio.listarVinculos({
        ...consulta,
        apenasRevelados: contexto.organizacao === TipoDocumentoOrganizacaoEnum.JOGADOR,
      }),
    ]);
    return {
      campanhaId: dto.campanhaId,
      organizacao: contexto.organizacao,
      editavel: contexto.editavel,
      pastas: pastas.map((pasta) => ({
        id: pasta.id,
        nome: pasta.nome,
        pastaMaeId: pasta.pastaMaeId,
        ordem: pasta.ordem,
      })),
      vinculos,
    };
  }

  /** Cria a pasta no fim das irmãs. O destino respeita o teto de profundidade. */
  async criarPasta(
    dto: DocumentoPastaCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoPastaCriadaDto> {
    const contexto = await this.resolverContexto(dto.campanhaId, usuarioAtivo);
    this.exigirEdicao(contexto);
    const nome = this.validarNome(dto.nome);
    const pastaMaeId = dto.pastaMaeId ?? null;
    if (pastaMaeId !== null) {
      await this.recuperarPastaDaOrganizacao(pastaMaeId, dto.campanhaId, contexto);
      const nivelMae = await this.pastaRepositorio.recuperarNivel(pastaMaeId);
      this.validarProfundidade(nivelMae + 1);
    }

    const pastaCriada = await this.pastaRepositorio.criarPasta({
      campanhaId: dto.campanhaId,
      organizacao: contexto.organizacao,
      nome,
      pastaMaeId,
    });
    this.emitir(dto.campanhaId, contexto.organizacao);
    return this.projetarPasta(pastaCriada);
  }

  /** Renomeia a pasta. */
  async alterarPasta(
    dto: DocumentoPastaAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoPastaAlteradaDto> {
    const { pasta, contexto } = await this.recuperarPastaParaEdicao(dto.id, usuarioAtivo);
    const nome = this.validarNome(dto.nome);

    await this.pastaRepositorio.alterarPasta({ id: pasta.id, nome });
    this.emitir(pasta.campanhaId, contexto.organizacao);
    return this.projetarPasta({ ...pasta, nome });
  }

  /**
   * Move a pasta para outra mãe (ou a raiz) e/ou outra posição entre as irmãs. Recusa mover para
   * dentro de si mesma ou de uma descendente e estourar o teto de profundidade.
   */
  async moverPasta(
    dto: DocumentoPastaMoverDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoPastaMovidaDto> {
    const { pasta, contexto } = await this.recuperarPastaParaEdicao(dto.id, usuarioAtivo);
    const pastaMaeId = dto.pastaMaeId ?? null;
    const posicao = this.validarPosicao(dto.posicao);

    if (pastaMaeId !== null) {
      await this.recuperarPastaDaOrganizacao(pastaMaeId, pasta.campanhaId, contexto);
      const subarvore = await this.pastaRepositorio.listarIdsSubarvore(pasta.id);
      if (subarvore.includes(pastaMaeId)) {
        throw new BusinessException('Uma pasta não pode ser movida para dentro de si mesma');
      }
      const [nivelDestino, alturaPasta] = await Promise.all([
        this.pastaRepositorio.recuperarNivel(pastaMaeId),
        this.pastaRepositorio.recuperarAlturaSubarvore(pasta.id),
      ]);
      this.validarProfundidade(nivelDestino + alturaPasta);
    }

    await this.transacaoService.executar(async () => {
      const irmas = (
        await this.pastaRepositorio.listarIdsIrmas({
          campanhaId: pasta.campanhaId,
          organizacao: contexto.organizacao,
          pastaMaeId,
        })
      ).filter((id) => id !== pasta.id);
      const destino = Math.min(posicao ?? irmas.length, irmas.length);
      irmas.splice(destino, 0, pasta.id);
      for (const [indice, id] of irmas.entries()) {
        await this.pastaRepositorio.alterarPosicaoPasta({
          id,
          pastaMaeId,
          ordem: indice + 1,
        });
      }
    });

    this.emitir(pasta.campanhaId, contexto.organizacao);
    const pastaMovida = (await this.pastaRepositorio.recuperarPasta(
      pasta.id,
    )) as DocumentoPastaInternoRecuperadaDto;
    return this.projetarPasta(pastaMovida);
  }

  /**
   * Exclui a pasta e as descendentes (exclusão lógica). Documentos e subpastas voltam à raiz da
   * mesma organização — nunca é bloqueada, nem exige confirmação.
   */
  async removerPasta(dto: DocumentoPastaRemoverDto, usuarioAtivo: JwtPayload): Promise<void> {
    const { pasta, contexto } = await this.recuperarPastaParaEdicao(dto.id, usuarioAtivo);
    await this.transacaoService.executar(() =>
      this.pastaRepositorio.removerSubarvore({ id: pasta.id }),
    );
    this.emitir(pasta.campanhaId, contexto.organizacao);
  }

  /**
   * Coloca o documento numa pasta (ou devolve à raiz, com `pastaId` `null`). Na organização dos
   * jogadores só documento revelado: um oculto responde 404 como em qualquer leitura.
   */
  async alterarVinculo(
    dto: DocumentoPastaVinculoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoPastaVinculoAlteradoDto> {
    const documento = await this.documentoRepositorio.recuperarPorId({ id: dto.id });
    if (!documento) {
      throw new ResourceNotFoundException('Documento');
    }
    const contexto = await this.resolverContexto(documento.campanhaId, usuarioAtivo);
    if (!documento.revelado && contexto.organizacao === TipoDocumentoOrganizacaoEnum.JOGADOR) {
      throw new ResourceNotFoundException('Documento');
    }
    this.exigirEdicao(contexto);
    const pastaId = dto.pastaId ?? null;
    const posicao = this.validarPosicao(dto.posicao);

    if (pastaId === null) {
      await this.pastaRepositorio.removerVinculo({
        documentoId: documento.id,
        organizacao: contexto.organizacao,
      });
      this.emitir(documento.campanhaId, contexto.organizacao);
      return { documentoId: documento.id, pastaId: null, ordem: null };
    }

    await this.recuperarPastaDaOrganizacao(pastaId, documento.campanhaId, contexto);
    const ordem = await this.transacaoService.executar(async () => {
      const documentosPasta = (await this.pastaRepositorio.listarIdsDocumentosPasta(pastaId)).filter(
        (id) => id !== documento.id,
      );
      const destino = Math.min(posicao ?? documentosPasta.length, documentosPasta.length);
      documentosPasta.splice(destino, 0, documento.id);
      for (const [indice, id] of documentosPasta.entries()) {
        await this.pastaRepositorio.gravarVinculo({
          documentoId: id,
          organizacao: contexto.organizacao,
          pastaId,
          ordem: indice + 1,
        });
      }
      return destino + 1;
    });

    this.emitir(documento.campanhaId, contexto.organizacao);
    return { documentoId: documento.id, pastaId, ordem };
  }

  /**
   * Chamado pela `DocumentoService` ao **ocultar** um documento: ele sai das pastas dos jogadores e
   * volta à raiz quando for revelado de novo. Só emite se algo mudou.
   */
  async limparVinculoJogadores(dto: { campanhaId: number; documentoId: number }): Promise<void> {
    const removidos = await this.pastaRepositorio.removerVinculoJogadores(dto.documentoId);
    if (removidos > 0) {
      this.emitir(dto.campanhaId, TipoDocumentoOrganizacaoEnum.JOGADOR);
    }
  }

  /** Chamado pela `DocumentoService` ao **excluir** um documento: sai de todas as pastas. */
  async limparVinculosDocumento(dto: { campanhaId: number; documentoId: number }): Promise<void> {
    await this.pastaRepositorio.removerVinculosDocumento({ documentoId: dto.documentoId });
    this.emitir(dto.campanhaId, TipoDocumentoOrganizacaoEnum.MESTRE);
    this.emitir(dto.campanhaId, TipoDocumentoOrganizacaoEnum.JOGADOR);
  }

  // ── Apoio ──────────────────────────────────────────────────────────────────

  /**
   * O papel do usuário na campanha escolhe a organização: mestre → a sua; jogador → a dos
   * jogadores, editável; espectador → a dos jogadores, só leitura. Quem não é membro → 403.
   */
  private async resolverContexto(
    campanhaId: number,
    usuarioAtivo: JwtPayload,
  ): Promise<ContextoOrganizacao> {
    const membro = await this.campanhaRepositorio.recuperarMembro({
      campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!membro) {
      throw new UnauthorizedAccessException();
    }
    if (membro.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
      return { organizacao: TipoDocumentoOrganizacaoEnum.MESTRE, editavel: true };
    }
    return {
      organizacao: TipoDocumentoOrganizacaoEnum.JOGADOR,
      editavel: membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR,
    };
  }

  private exigirEdicao(contexto: ContextoOrganizacao): void {
    if (!contexto.editavel) {
      throw new UnauthorizedAccessException();
    }
  }

  /**
   * A pasta, desde que seja da organização do usuário na própria campanha — a de outro cargo (ou
   * de outra campanha) responde 404, como um id inexistente.
   */
  private async recuperarPastaDaOrganizacao(
    pastaId: number,
    campanhaId: number,
    contexto: ContextoOrganizacao,
  ): Promise<DocumentoPastaInternoRecuperadaDto> {
    const pasta = await this.pastaRepositorio.recuperarPasta(pastaId);
    if (
      !pasta ||
      pasta.campanhaId !== campanhaId ||
      pasta.organizacao !== contexto.organizacao
    ) {
      throw new ResourceNotFoundException('Pasta');
    }
    return pasta;
  }

  /** A pasta de um `:id` de rota, para uma mutação: da organização do usuário e editável. */
  private async recuperarPastaParaEdicao(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<{ pasta: DocumentoPastaInternoRecuperadaDto; contexto: ContextoOrganizacao }> {
    const pastaEncontrada = await this.pastaRepositorio.recuperarPasta(id);
    if (!pastaEncontrada) {
      throw new ResourceNotFoundException('Pasta');
    }
    const contexto = await this.resolverContexto(pastaEncontrada.campanhaId, usuarioAtivo);
    const pasta = await this.recuperarPastaDaOrganizacao(id, pastaEncontrada.campanhaId, contexto);
    this.exigirEdicao(contexto);
    return { pasta, contexto };
  }

  private validarNome(nome: unknown): string {
    const nomeAparado = typeof nome === 'string' ? nome.trim() : '';
    if (!nomeAparado) {
      throw new BusinessException('A pasta precisa de um nome');
    }
    if (nomeAparado.length > DOCUMENTO_PASTA_NOME_MAXIMO) {
      throw new BusinessException(
        `O nome da pasta tem no máximo ${DOCUMENTO_PASTA_NOME_MAXIMO} caracteres`,
      );
    }
    return nomeAparado;
  }

  private validarPosicao(posicao: unknown): number | undefined {
    if (posicao === undefined || posicao === null) {
      return undefined;
    }
    if (typeof posicao !== 'number' || !Number.isInteger(posicao) || posicao < 0) {
      throw new BusinessException('Posição inválida');
    }
    return posicao;
  }

  private validarProfundidade(nivel: number): void {
    if (nivel > DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA) {
      throw new BusinessException(
        `As pastas têm no máximo ${DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA} níveis`,
      );
    }
  }

  private projetarPasta(pasta: DocumentoPastaInternoRecuperadaDto): DocumentoPastaCriadaDto {
    return {
      id: pasta.id,
      campanhaId: pasta.campanhaId,
      nome: pasta.nome,
      pastaMaeId: pasta.pastaMaeId,
      ordem: pasta.ordem,
    };
  }

  private emitir(campanhaId: number, organizacao: TipoDocumentoOrganizacaoEnum): void {
    this.campanhaGateway.emitirDocumentoOrganizacaoAlterada({ campanhaId, organizacao });
  }
}
