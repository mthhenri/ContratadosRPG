import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  CenaDocumentoAnexarDto,
  CenaDocumentoReordenarDto,
  CenaDocumentoResumoDto,
  CenaEspectadorDocumentosListarDto,
  CenaEspectadorDocumentoRecuperarDto,
} from '@contratados-rpg/shared/dtos/cena';
import type { DocumentoRecuperadoDto } from "@contratados-rpg/shared/dtos/documento";
import type { CenaLinhaDto } from '@contratados-rpg/shared/dtos/cena';
import { CenaStatusEnum, CenaTipoEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { BusinessException, ResourceNotFoundException, UnauthorizedAccessException } from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import { TransacaoService } from '../../database/transacao.service';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { DocumentoService } from '../documento/documento.service';
import { CenaDocumentoRepository } from './cena-documento.repository';
import { CenaRepository } from './cena.repository';

/**
 * Regras da coluna Documentos do painel de Investigação (`m7-25`) — anexar, remover, reordenar,
 * focar no palco e apresentar. "Apresentar" chama `DocumentoService.revelarDocumento` (M9), nunca o
 * repository dela: a visibilidade do documento nunca é um segundo estado aqui.
 *
 * **Mestre-only.** Toda mutação exige ser o mestre da campanha; uma cena `ENCERRADA` é somente
 * leitura, como o resto do módulo `cena` (decisão #4 do milestone).
 *
 * **Foco não emite.** "Focar" é navegação do palco do mestre — não muda o que jogador/espectador
 * veem, então não dispara `cena:documento-alterado`; a própria resposta HTTP já atualiza quem
 * chamou. As demais mutações emitem depois de persistir (§9), dataless como
 * `campanha:inventario-alterado`: quem recebe refaz o `GET`, já no próprio recorte.
 */
@Injectable()
export class CenaDocumentoService {
  constructor(
    private readonly cenaDocumentoRepositorio: CenaDocumentoRepository,
    private readonly cenaRepositorio: CenaRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
    private readonly documentoService: DocumentoService,
    private readonly transacaoService: TransacaoService,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
  ) {}

  /** A coluna Documentos da cena — mestre vê tudo; jogador/espectador, só o revelado. */
  async listar(
    dto: { cenaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    const cena = await this.recuperarCenaObrigatoria(dto.cenaId);
    const ehMestre = await this.ehMestre(cena.campanhaId, usuarioAtivo);
    if (!ehMestre && cena.status === CenaStatusEnum.PLANEJADA) {
      throw new UnauthorizedAccessException();
    }
    const linhas = await this.cenaDocumentoRepositorio.listarPorCena({
      cenaId: dto.cenaId,
      apenasRevelados: !ehMestre,
    });
    return linhas.map(this.paraResumo);
  }

  /** Documentos revelados da Investigação ativa; quem chama já autorizou espectador ou prévia. */
  async listarDocumentosParaEspectador(
    dto: CenaEspectadorDocumentosListarDto,
  ): Promise<CenaDocumentoResumoDto[]> {
    await this.validarInvestigacaoAtiva(dto);
    const linhas = await this.cenaDocumentoRepositorio.listarPorCena({
      cenaId: dto.cenaId, apenasRevelados: true,
    });
    return linhas.filter((linha) => linha.revelado)
      .map((linha) => ({ ...this.paraResumo(linha), emFoco: false }));
  }

  /** Leitura direta exige vínculo ativo e documento ainda revelado, inclusive na prévia do mestre. */
  async recuperarDocumentoParaEspectador(
    dto: CenaEspectadorDocumentoRecuperarDto,
  ): Promise<DocumentoRecuperadoDto> {
    await this.validarInvestigacaoAtiva(dto);
    const vinculo = await this.cenaDocumentoRepositorio.recuperarPorCenaEDocumento({
      cenaId: dto.cenaId, documentoId: dto.documentoId,
    });
    if (!vinculo || !vinculo.revelado) {
      throw new ResourceNotFoundException("Documento");
    }
    return this.documentoService.recuperarDocumentoRevelado({
      id: dto.documentoId, campanhaId: dto.campanhaId,
    });
  }

  /** Restringe a projeção nova à Investigação atual; não amplia acesso a histórico. */
  private async validarInvestigacaoAtiva(dto: CenaEspectadorDocumentosListarDto): Promise<void> {
    const cena = await this.recuperarCenaObrigatoria(dto.cenaId);
    if (
      cena.campanhaId !== dto.campanhaId || cena.status !== CenaStatusEnum.ATIVA
      || cena.tipo !== CenaTipoEnum.INVESTIGACAO
    ) {
      throw new ResourceNotFoundException("Cena");
    }
  }

  /** Anexa um documento da biblioteca da campanha à cena, no fim da fila. Idempotente. */
  async anexar(
    dto: CenaDocumentoAnexarDto & { cenaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    const cena = await this.validarMestreENaoEncerrada(dto.cenaId, usuarioAtivo);
    const documento = await this.documentoService.recuperarDocumento(
      { id: dto.documentoId },
      usuarioAtivo,
    );
    if (documento.campanhaId !== cena.campanhaId) {
      throw new BusinessException('O documento não pertence a esta campanha');
    }
    const existente = await this.cenaDocumentoRepositorio.recuperarPorCenaEDocumento({
      cenaId: dto.cenaId,
      documentoId: dto.documentoId,
    });
    if (!existente) {
      const maiorOrdem = await this.cenaDocumentoRepositorio.recuperarMaiorOrdem({
        cenaId: dto.cenaId,
      });
      await this.cenaDocumentoRepositorio.anexar({
        cenaId: dto.cenaId,
        documentoId: dto.documentoId,
        ordem: maiorOrdem + 1,
      });
    }
    return this.listarEEmitir(cena);
  }

  /** Remove o vínculo com a cena — nunca afeta o documento na biblioteca. */
  async remover(
    dto: { cenaId: number; documentoId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    const cena = await this.validarMestreENaoEncerrada(dto.cenaId, usuarioAtivo);
    const existente = await this.recuperarVinculoObrigatorio(dto.cenaId, dto.documentoId);
    await this.cenaDocumentoRepositorio.remover({ id: existente.id });
    return this.listarEEmitir(cena);
  }

  /** Reordena a coluna Documentos — `ordem` precisa listar exatamente os documentos da cena. */
  async reordenar(
    dto: CenaDocumentoReordenarDto & { cenaId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    const cena = await this.validarMestreENaoEncerrada(dto.cenaId, usuarioAtivo);
    const linhas = await this.cenaDocumentoRepositorio.listarPorCena({
      cenaId: dto.cenaId,
      apenasRevelados: false,
    });
    const idPorDocumento = new Map(linhas.map((linha) => [linha.documentoId, linha.id]));
    const ordem = dto.ordem ?? [];
    if (
      ordem.length !== idPorDocumento.size ||
      new Set(ordem).size !== ordem.length ||
      ordem.some((documentoId) => !idPorDocumento.has(documentoId))
    ) {
      throw new BusinessException('A nova ordem precisa listar exatamente os documentos da cena');
    }

    await this.transacaoService.executar(async () => {
      for (const [indice, documentoId] of ordem.entries()) {
        await this.cenaDocumentoRepositorio.alterarOrdem({
          id: idPorDocumento.get(documentoId) as number,
          ordem: indice + 1,
        });
      }
    });
    return this.listarEEmitir(cena);
  }

  /** Abre o documento no palco do mestre — não revela, não emite. */
  async focar(
    dto: { cenaId: number; documentoId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    const cena = await this.validarMestreENaoEncerrada(dto.cenaId, usuarioAtivo);
    const existente = await this.recuperarVinculoObrigatorio(dto.cenaId, dto.documentoId);
    await this.cenaDocumentoRepositorio.definirFoco({ cenaId: cena.id, id: existente.id });
    const linhas = await this.cenaDocumentoRepositorio.listarPorCena({
      cenaId: cena.id,
      apenasRevelados: false,
    });
    return linhas.map(this.paraResumo);
  }

  /** Revela o documento à mesa (M9) e o marca em foco no palco — a ação "Apresentar". */
  async apresentar(
    dto: { cenaId: number; documentoId: number },
    usuarioAtivo: JwtPayload,
  ): Promise<CenaDocumentoResumoDto[]> {
    const cena = await this.validarMestreENaoEncerrada(dto.cenaId, usuarioAtivo);
    const existente = await this.recuperarVinculoObrigatorio(dto.cenaId, dto.documentoId);
    await this.documentoService.revelarDocumento({ id: dto.documentoId }, usuarioAtivo);
    await this.cenaDocumentoRepositorio.definirFoco({ cenaId: cena.id, id: existente.id });
    return this.listarEEmitir(cena);
  }

  // ── Apoio ──────────────────────────────────────────────────────────────────

  private async recuperarCenaObrigatoria(id: number): Promise<CenaLinhaDto> {
    const cena = await this.cenaRepositorio.recuperarPorId({ id });
    if (!cena) {
      throw new ResourceNotFoundException('Cena');
    }
    return cena;
  }

  private async recuperarVinculoObrigatorio(cenaId: number, documentoId: number) {
    const existente = await this.cenaDocumentoRepositorio.recuperarPorCenaEDocumento({
      cenaId,
      documentoId,
    });
    if (!existente) {
      throw new ResourceNotFoundException('Documento da cena');
    }
    return existente;
  }

  private async validarMestreENaoEncerrada(
    cenaId: number,
    usuarioAtivo: JwtPayload,
  ): Promise<CenaLinhaDto> {
    const cena = await this.recuperarCenaObrigatoria(cenaId);
    await this.validarMestre(cena.campanhaId, usuarioAtivo);
    if (cena.status === CenaStatusEnum.ENCERRADA) {
      throw new BusinessException('Uma cena encerrada é somente leitura');
    }
    return cena;
  }

  private async ehMestre(campanhaId: number, usuarioAtivo: JwtPayload): Promise<boolean> {
    const membro = await this.campanhaRepositorio.recuperarMembro({
      campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (!membro) {
      throw new UnauthorizedAccessException();
    }
    return membro.papel === TipoCampanhaMembroPapelEnum.MESTRE;
  }

  private async validarMestre(campanhaId: number, usuarioAtivo: JwtPayload): Promise<void> {
    if (!(await this.ehMestre(campanhaId, usuarioAtivo))) {
      throw new UnauthorizedAccessException();
    }
  }

  private paraResumo = (linha: {
    documentoId: number;
    titulo: string;
    tipo: CenaDocumentoResumoDto['tipo'];
    revelado: boolean;
    ordem: number;
    emFoco: boolean;
  }): CenaDocumentoResumoDto => ({
    documentoId: linha.documentoId,
    titulo: linha.titulo,
    tipo: linha.tipo,
    revelado: linha.revelado,
    ordem: linha.ordem,
    emFoco: linha.emFoco,
  });

  /** Lista a coluna completa (sem recorte — chamado só depois de mutação mestre-only) e emite. */
  private async listarEEmitir(cena: CenaLinhaDto): Promise<CenaDocumentoResumoDto[]> {
    const linhas = await this.cenaDocumentoRepositorio.listarPorCena({
      cenaId: cena.id,
      apenasRevelados: false,
    });
    this.campanhaGateway.emitirCenaDocumentoAlterado({
      campanhaId: cena.campanhaId,
      cenaId: cena.id,
    });
    return linhas.map(this.paraResumo);
  }
}
