import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  DocumentoAlteradoDto,
  DocumentoAlterarDto,
  DocumentoBuscaResultadoDto,
  DocumentoBuscarDto,
  DocumentoCriadoDto,
  DocumentoCriarDto,
  DocumentoImagemAlteradaDto,
  DocumentoImagemAlterarDto,
  DocumentoLeituraInternoInformarDto,
  DocumentoListarDto,
  DocumentoOcultadoDto,
  DocumentoOcultarDto,
  DocumentoRecuperadoDto,
  DocumentoRecuperarDto,
  DocumentoRemoverDto,
  DocumentoReordenarDto,
  DocumentoResumoDto,
  DocumentoReveladoDto,
  DocumentoRevelarDto,
} from '@contratados-rpg/shared/dtos/documento';
import {
  DocumentoAlteracaoEnum,
  TipoCampanhaMembroPapelEnum,
  TipoDocumentoEnum,
} from '@contratados-rpg/shared/enums';
import { PaginatedResult } from '@contratados-rpg/shared/interfaces';
import {
  BUSCA_CAMPANHA_LIMITE_MAXIMO,
  BUSCA_CAMPANHA_TERMO_MAXIMO,
  DOCUMENTO_CONTEUDO_MAXIMO,
  DOCUMENTO_IMAGEM_MIMES_PERMITIDOS,
  DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES,
  DOCUMENTO_TITULO_MAXIMO,
} from '@contratados-rpg/shared/validators';
import {
  ARMAZENAMENTO_PROVEDOR,
  ArmazenamentoPastaEnum,
  type ArmazenamentoProvedor,
} from '../../core/armazenamento';
import {
  BusinessException,
  ResourceConflictException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import { TransacaoService } from '../../database/transacao.service';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { CampanhaService } from '../campanha/campanha.service';
import { DocumentoLeituraService } from './documento-leitura.service';
import { DocumentoRepository } from './documento.repository';

/** Extensão de arquivo de cada MIME aceito — nomeia o blob (`documentos/<uuid>.<extensão>`). */
const EXTENSAO_POR_MIME_IMAGEM: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Mensagem da imagem acima do teto — a mesma na service e no interceptor do upload. */
export const MENSAGEM_IMAGEM_DOCUMENTO_GRANDE = `Imagem maior que o limite permitido (${
  DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES / (1024 * 1024)
} MB)`;

/**
 * Regras do módulo `documento` (m9-02) — a biblioteca de documentos da campanha: o mestre cria,
 * edita, ordena e revela; a mesa lê o que foi revelado.
 *
 * **Recorte único.** `podeLerNaoReveladas` decide a leitura em todos os métodos: só o mestre lê um
 * documento oculto. Jogador e espectador leem o revelado (o espectador por revisão explícita da
 * decisão #4 do `m8` — ver `m9-02`, "Decisões assumidas"). Tirar o espectador é mudar só esse
 * predicado.
 *
 * **Trava anti-vazamento.** Para quem não pode lê-lo, um documento oculto não existe: `GET`, e
 * também qualquer mutação, respondem 404 — a mesma resposta de um id inexistente —, a listagem
 * o filtra no SQL e o `documento:alterado` dele só vai à sala do mestre. Uma mutação sobre um
 * documento revelado, por quem não é mestre, é 403.
 *
 * **Emissão depois de persistir (§9)**, sempre fora de transação.
 */
@Injectable()
export class DocumentoService {
  constructor(
    private readonly documentoRepositorio: DocumentoRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
    // `forwardRef` (m9-09): o `CampanhaGateway` passou a importar esta service, e o arquivo da
    // `CampanhaService` importa o gateway — sem ele, a classe chega `undefined` no carregamento.
    @Inject(forwardRef(() => CampanhaService))
    private readonly campanhaService: CampanhaService,
    private readonly transacaoService: TransacaoService,
    private readonly documentoLeituraService: DocumentoLeituraService,
    @Inject(ARMAZENAMENTO_PROVEDOR)
    private readonly armazenamentoProvedor: ArmazenamentoProvedor,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
  ) {}

  /**
   * Cria o documento **oculto**, no fim da biblioteca. `TEXTO` nasce com o markdown informado (ou
   * vazio); `IMAGEM` nasce sem imagem — ela chega por upload — e recusa markdown.
   */
  async criarDocumento(
    dto: DocumentoCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoCriadoDto> {
    await this.validarMestre(dto.campanhaId, usuarioAtivo);
    if (!(Object.values(TipoDocumentoEnum) as string[]).includes(dto.tipo)) {
      throw new BusinessException('Tipo de documento inválido');
    }
    const titulo = this.validarTitulo(dto.titulo);
    const conteudoMarkdown =
      dto.tipo === TipoDocumentoEnum.TEXTO
        ? this.validarMarkdown(dto.conteudoMarkdown ?? '')
        : this.validarSemMarkdown(dto.conteudoMarkdown);

    const documentoCriado = await this.documentoRepositorio.criarDocumento({
      campanhaId: dto.campanhaId,
      titulo,
      tipo: dto.tipo,
      conteudoMarkdown,
    });
    this.emitir(
      documentoCriado.campanhaId,
      documentoCriado.id,
      DocumentoAlteracaoEnum.CRIADO,
      false,
    );
    return documentoCriado;
  }

  /** Biblioteca da campanha: o mestre recebe todos; jogador e espectador, só os revelados. */
  async listarDocumentos(
    dto: DocumentoListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoResumoDto[]> {
    const papel = await this.validarMembro(dto.campanhaId, usuarioAtivo);
    return this.documentoRepositorio.listarPorCampanha({
      campanhaId: dto.campanhaId,
      apenasRevelados: !this.podeLerNaoReveladas(papel),
    });
  }

  /**
   * Busca textual na biblioteca (m9-03): o mestre busca em todos; jogador e espectador, só nos
   * revelados — o mesmo `podeLerNaoReveladas` da listagem, aplicado **antes** da consulta. Termo,
   * página e limite seguem as regras da busca do caderno; termo vazio devolve página vazia sem
   * consultar.
   */
  async buscarDocumentos(
    dto: DocumentoBuscarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginatedResult<DocumentoBuscaResultadoDto>> {
    const papel = await this.validarMembro(dto.campanhaId, usuarioAtivo);
    const termo = typeof dto.termo === 'string' ? dto.termo.trim() : '';
    if (termo.length > BUSCA_CAMPANHA_TERMO_MAXIMO) {
      throw new BusinessException(
        `Termo de busca deve ter no máximo ${BUSCA_CAMPANHA_TERMO_MAXIMO} caracteres`,
      );
    }
    const pagina = dto.pagina ?? 1;
    const limite = dto.limite ?? 20;
    if (!Number.isInteger(pagina) || pagina < 1) {
      throw new BusinessException('Página da busca deve ser um inteiro maior que zero');
    }
    if (!Number.isInteger(limite) || limite < 1 || limite > BUSCA_CAMPANHA_LIMITE_MAXIMO) {
      throw new BusinessException(
        `Limite da busca deve estar entre 1 e ${BUSCA_CAMPANHA_LIMITE_MAXIMO}`,
      );
    }
    if (!termo) {
      return new PaginatedResult({
        itens: [],
        totalItens: 0,
        paginaAtual: pagina,
        totalPaginas: 0,
      });
    }

    return this.documentoRepositorio.buscarDocumentos({
      campanhaId: dto.campanhaId,
      termo,
      apenasRevelados: !this.podeLerNaoReveladas(papel),
      pagina,
      limite,
    });
  }

  /** Documento completo, com o conteúdo para o leitor. Oculto para quem não é mestre → 404. */
  async recuperarDocumento(
    dto: DocumentoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoRecuperadoDto> {
    const { documento } = await this.recuperarLegivel(dto.id, usuarioAtivo);
    return documento;
  }

  /**
   * Altera título e, para `TEXTO`, o markdown — o tipo nunca muda e a imagem troca por upload.
   * `updatedDate` defasado → 409, sem sobrescrever.
   */
  async alterarDocumento(
    dto: DocumentoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoAlteradoDto> {
    const documento = await this.recuperarParaMestre(dto.id, usuarioAtivo);
    const titulo = this.validarTitulo(dto.titulo);
    const conteudoMarkdown =
      documento.tipo === TipoDocumentoEnum.TEXTO
        ? this.validarMarkdown(dto.conteudoMarkdown)
        : this.validarSemMarkdown(dto.conteudoMarkdown);
    if (!dto.updatedDate || Number.isNaN(Date.parse(dto.updatedDate))) {
      throw new BusinessException('Versão do documento inválida');
    }

    const documentoAlterado = await this.documentoRepositorio.alterarDocumento({
      id: dto.id,
      titulo,
      conteudoMarkdown,
      updatedDate: dto.updatedDate,
    });
    if (!documentoAlterado) {
      throw new ResourceConflictException('O documento foi alterado em outra sessão');
    }
    this.emitir(
      documentoAlterado.campanhaId,
      documentoAlterado.id,
      DocumentoAlteracaoEnum.ALTERADO,
      documentoAlterado.revelado,
    );
    return documentoAlterado;
  }

  /**
   * Revela o documento à mesa. Idempotente: revelar um já revelado não grava nem emite. Um `IMAGEM`
   * ainda sem imagem não pode ser revelado.
   */
  async revelarDocumento(
    dto: DocumentoRevelarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoReveladoDto> {
    const documento = await this.recuperarParaMestre(dto.id, usuarioAtivo);
    if (documento.revelado) {
      return { id: documento.id, revelado: documento.revelado, updatedDate: documento.updatedDate };
    }
    if (documento.tipo === TipoDocumentoEnum.IMAGEM && !documento.imagemUrl) {
      throw new BusinessException('Envie a imagem antes de revelar o documento');
    }

    const documentoRevelado = await this.documentoRepositorio.alterarRevelado({
      id: dto.id,
      revelado: true,
    });
    this.emitir(
      documentoRevelado.campanhaId,
      documentoRevelado.id,
      DocumentoAlteracaoEnum.REVELADO,
      true,
    );
    return {
      id: documentoRevelado.id,
      revelado: documentoRevelado.revelado,
      updatedDate: documentoRevelado.updatedDate,
    };
  }

  /**
   * Oculta o documento da mesa. Idempotente como `revelarDocumento`. O evento vai à mesa, que
   * precisa retirar o documento da própria biblioteca.
   */
  async ocultarDocumento(
    dto: DocumentoOcultarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoOcultadoDto> {
    const documento = await this.recuperarParaMestre(dto.id, usuarioAtivo);
    if (!documento.revelado) {
      return { id: documento.id, revelado: documento.revelado, updatedDate: documento.updatedDate };
    }

    const documentoOcultado = await this.documentoRepositorio.alterarRevelado({
      id: dto.id,
      revelado: false,
    });
    this.emitir(
      documentoOcultado.campanhaId,
      documentoOcultado.id,
      DocumentoAlteracaoEnum.OCULTADO,
      true,
    );
    this.documentoLeituraService.removerLeitoresDocumento({
      campanhaId: documentoOcultado.campanhaId,
      documentoId: documentoOcultado.id,
    });
    return {
      id: documentoOcultado.id,
      revelado: documentoOcultado.revelado,
      updatedDate: documentoOcultado.updatedDate,
    };
  }

  /** Exclusão lógica, revelado ou não. O arquivo de imagem fica no armazenamento. */
  async removerDocumento(dto: DocumentoRemoverDto, usuarioAtivo: JwtPayload): Promise<void> {
    const documento = await this.recuperarParaMestre(dto.id, usuarioAtivo);
    await this.documentoRepositorio.removerDocumento({ id: dto.id });
    this.emitir(
      documento.campanhaId,
      documento.id,
      DocumentoAlteracaoEnum.REMOVIDO,
      documento.revelado,
    );
    this.documentoLeituraService.removerLeitoresDocumento({
      campanhaId: documento.campanhaId,
      documentoId: documento.id,
    });
  }

  /**
   * Reordena a biblioteca. `ordem` precisa listar **exatamente** os documentos ativos da campanha,
   * cada um uma vez — faltar, sobrar ou repetir deixaria posições ambíguas. Grava tudo numa
   * transação e devolve a biblioteca completa do mestre.
   */
  async reordenarDocumentos(
    dto: DocumentoReordenarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoResumoDto[]> {
    await this.validarMestre(dto.campanhaId, usuarioAtivo);
    const idsAtivos = new Set(
      await this.documentoRepositorio.listarIdsPorCampanha({ campanhaId: dto.campanhaId }),
    );
    const ordem: readonly number[] = Array.isArray(dto.ordem) ? dto.ordem : [];
    if (
      ordem.length !== idsAtivos.size ||
      new Set(ordem).size !== ordem.length ||
      ordem.some((id) => !idsAtivos.has(id))
    ) {
      throw new BusinessException(
        'A nova ordem precisa listar exatamente os documentos da campanha',
      );
    }

    await this.transacaoService.executar(async () => {
      for (const [indice, id] of ordem.entries()) {
        await this.documentoRepositorio.alterarOrdem({ id, ordem: indice + 1 });
      }
    });

    const documentosReordenados = await this.documentoRepositorio.listarPorCampanha({
      campanhaId: dto.campanhaId,
      apenasRevelados: false,
    });
    this.emitir(dto.campanhaId, null, DocumentoAlteracaoEnum.REORDENADO, true);
    return documentosReordenados;
  }

  /**
   * Troca a imagem de um documento `IMAGEM`: valida formato e tamanho, grava em `documentos/`,
   * apaga a anterior e só então persiste — mesmo fluxo do avatar da ficha.
   */
  async alterarImagemDocumento(
    dto: DocumentoImagemAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoImagemAlteradaDto> {
    const documento = await this.recuperarParaMestre(dto.id, usuarioAtivo);
    if (documento.tipo !== TipoDocumentoEnum.IMAGEM) {
      throw new BusinessException('Só um documento de imagem recebe imagem');
    }
    if (dto.arquivo.tamanho === 0) {
      throw new BusinessException('Envie um arquivo de imagem');
    }
    const extensao = DOCUMENTO_IMAGEM_MIMES_PERMITIDOS.includes(dto.arquivo.mimetype)
      ? EXTENSAO_POR_MIME_IMAGEM[dto.arquivo.mimetype]
      : undefined;
    if (!extensao) {
      throw new BusinessException('Formato de imagem inválido: use JPEG, PNG ou WEBP');
    }
    if (dto.arquivo.tamanho > DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES) {
      throw new BusinessException(MENSAGEM_IMAGEM_DOCUMENTO_GRANDE);
    }

    const imagemSalva = await this.armazenamentoProvedor.salvarImagem({
      pasta: ArmazenamentoPastaEnum.DOCUMENTOS,
      conteudo: dto.arquivo.conteudo,
      mimetype: dto.arquivo.mimetype,
      extensao,
    });
    if (documento.imagemUrl) {
      await this.armazenamentoProvedor.excluirImagem({ caminho: documento.imagemUrl });
    }

    const documentoAlterado = await this.documentoRepositorio.alterarImagem({
      id: dto.id,
      imagemUrl: imagemSalva.caminho,
    });
    this.emitir(
      documentoAlterado.campanhaId,
      documentoAlterado.id,
      DocumentoAlteracaoEnum.ALTERADO,
      documentoAlterado.revelado,
    );
    return {
      id: documentoAlterado.id,
      imagemUrl: imagemSalva.caminho,
      updatedDate: documentoAlterado.updatedDate,
    };
  }

  /**
   * Presença de leitura (`m9-09`): a conexão informa o documento que está lendo, ou `null`. Exige
   * ser membro da campanha (a mesma regra da entrada na sala, `validarAcessoSalaCampanha` —
   * proibição #28); quem não é → lança, e nada é registrado. Um `documentoId` que este usuário não
   * pode ler — oculto para quem não é mestre, inexistente ou de outra campanha — é tratado como
   * `null`: ninguém "lê" um documento que o `GET documento/:id` lhe negaria. O estado e a emissão
   * ficam com a `DocumentoLeituraService`.
   */
  async informarLeitura(
    dto: DocumentoLeituraInternoInformarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<void> {
    if (!Number.isInteger(dto.campanhaId) || dto.campanhaId < 1) {
      throw new BusinessException('Campanha da leitura inválida');
    }
    const documentoInformado = dto.documentoId ?? null;
    if (
      documentoInformado !== null &&
      (!Number.isInteger(documentoInformado) || documentoInformado < 1)
    ) {
      throw new BusinessException('Documento da leitura inválido');
    }

    const membroEncontrado = await this.campanhaService.validarAcessoSalaCampanha(
      { id: dto.campanhaId },
      usuarioAtivo,
    );
    let documentoId: number | null = null;
    if (documentoInformado !== null) {
      try {
        const { documento } = await this.recuperarLegivel(documentoInformado, usuarioAtivo);
        documentoId = documento.campanhaId === dto.campanhaId ? documento.id : null;
      } catch {
        documentoId = null;
      }
    }

    this.documentoLeituraService.registrarLeitura({
      conexaoId: dto.conexaoId,
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
      papel: membroEncontrado.papel,
      documentoId,
    });
  }

  // ── Apoio ──────────────────────────────────────────────────────────────────

  /** O recorte único: só o mestre lê um documento que ainda não foi revelado. */
  private podeLerNaoReveladas(papel: TipoCampanhaMembroPapelEnum): boolean {
    return this.campanhaService.ehMestre(papel);
  }

  /**
   * Recupera o documento que o usuário pode ler. Inexistente, ou oculto para quem não é mestre →
   * a mesma 404; quem não é membro da campanha → 403.
   */
  private async recuperarLegivel(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<{ documento: DocumentoRecuperadoDto; papel: TipoCampanhaMembroPapelEnum }> {
    const documento = await this.documentoRepositorio.recuperarPorId({ id });
    if (!documento) {
      throw new ResourceNotFoundException('Documento');
    }
    const papel = await this.validarMembro(documento.campanhaId, usuarioAtivo);
    if (!documento.revelado && !this.podeLerNaoReveladas(papel)) {
      throw new ResourceNotFoundException('Documento');
    }
    return { documento, papel };
  }

  /** O documento, para uma mutação: além de legível, exige ser o mestre (403). */
  private async recuperarParaMestre(
    id: number,
    usuarioAtivo: JwtPayload,
  ): Promise<DocumentoRecuperadoDto> {
    const { documento, papel } = await this.recuperarLegivel(id, usuarioAtivo);
    if (!this.campanhaService.ehMestre(papel)) {
      throw new UnauthorizedAccessException();
    }
    return documento;
  }

  /** Exige ser membro da campanha; devolve o papel. */
  private async validarMembro(
    campanhaId: number,
    usuarioAtivo: JwtPayload,
  ): Promise<TipoCampanhaMembroPapelEnum> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro({
      campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!membroEncontrado) {
      throw new UnauthorizedAccessException();
    }
    return membroEncontrado.papel;
  }

  /** Exige ser o mestre da campanha — quem cria, edita, ordena e revela documentos. */
  private async validarMestre(campanhaId: number, usuarioAtivo: JwtPayload): Promise<void> {
    const papel = await this.validarMembro(campanhaId, usuarioAtivo);
    if (!this.campanhaService.ehMestre(papel)) {
      throw new UnauthorizedAccessException();
    }
  }

  /** Título aparado, de 1 a `DOCUMENTO_TITULO_MAXIMO` caracteres. */
  private validarTitulo(titulo: unknown): string {
    const tituloAparado = typeof titulo === 'string' ? titulo.trim() : '';
    if (!tituloAparado) {
      throw new BusinessException('O documento precisa de um título');
    }
    if (tituloAparado.length > DOCUMENTO_TITULO_MAXIMO) {
      throw new BusinessException(
        `O título do documento tem no máximo ${DOCUMENTO_TITULO_MAXIMO} caracteres`,
      );
    }
    return tituloAparado;
  }

  /** Markdown de um `TEXTO`: texto (vazio vale), até `DOCUMENTO_CONTEUDO_MAXIMO` caracteres. */
  private validarMarkdown(conteudoMarkdown: unknown): string {
    if (typeof conteudoMarkdown !== 'string') {
      throw new BusinessException('Conteúdo do documento inválido');
    }
    if (conteudoMarkdown.length > DOCUMENTO_CONTEUDO_MAXIMO) {
      throw new BusinessException(
        `O conteúdo do documento tem no máximo ${
          DOCUMENTO_CONTEUDO_MAXIMO.toLocaleString('pt-BR')
        } caracteres`,
      );
    }
    return conteudoMarkdown;
  }

  /** Um `IMAGEM` nunca carrega markdown — informar um é erro, não algo a descartar em silêncio. */
  private validarSemMarkdown(conteudoMarkdown: unknown): null {
    if (conteudoMarkdown !== undefined && conteudoMarkdown !== null) {
      throw new BusinessException('Um documento de imagem não tem conteúdo em texto');
    }
    return null;
  }

  /** `documento:alterado`, na sala que a visibilidade do documento permite. */
  private emitir(
    campanhaId: number,
    documentoId: number | null,
    alteracao: DocumentoAlteracaoEnum,
    visivelParaMesa: boolean,
  ): void {
    this.campanhaGateway.emitirDocumentoAlterado(
      { campanhaId, documentoId, alteracao },
      visivelParaMesa,
    );
  }
}
