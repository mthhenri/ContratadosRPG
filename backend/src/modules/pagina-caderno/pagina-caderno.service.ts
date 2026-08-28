import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type {
  BuscaCampanhaDto,
  BuscaCampanhaResultadoDto,
  PaginaCadernoAlterarDto,
  PaginaCadernoCriarDto,
  PaginaCadernoDto,
  PaginaCadernoEsquadraoAlteradaDto,
  PaginaCadernoEsquadraoAlterarDto,
  PaginaCadernoEsquadraoCriarDto,
  PaginaCadernoEsquadraoEstadoDto,
  PaginaCadernoExcluirDto,
  PaginaCadernoInternoRecuperadaDto,
  PaginaCadernoListarDto,
  PaginaCadernoMembroListarDto,
  PaginaCadernoRecuperarDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import {
  BuscaCampanhaFonteEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import { PaginatedResult } from '@contratados-rpg/shared/interfaces';
import {
  BUSCA_CAMPANHA_LIMITE_MAXIMO,
  BUSCA_CAMPANHA_TERMO_MAXIMO,
  PAGINA_CADERNO_CONTEUDO_MAXIMO,
  PAGINA_CADERNO_TITULO_MAXIMO,
} from '@contratados-rpg/shared/validators';

import {
  BusinessException,
  ResourceConflictException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import { CampanhaGateway } from '../../core/gateway/campanha.gateway';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { PaginaCadernoRepository } from './pagina-caderno.repository';
import * as Y from 'yjs';

/** Regras de autoria, leitura do mestre, validação e concorrência das páginas de caderno. */
@Injectable()
export class PaginaCadernoService {
  constructor(
    private readonly paginaCadernoRepositorio: PaginaCadernoRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
    @Inject(forwardRef(() => CampanhaGateway))
    private readonly campanhaGateway: CampanhaGateway,
  ) {}

  async criarPagina(dto: PaginaCadernoCriarDto, usuarioAtivo: JwtPayload): Promise<PaginaCadernoDto> {
    const conteudoValidado = this.validarConteudo(dto.titulo, dto.conteudoMarkdown);
    await this.recuperarPapelMembro({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const paginaCriada = await this.paginaCadernoRepositorio.criarPagina({
      campanhaId: dto.campanhaId,
      usuarioAutorId: usuarioAtivo.sub,
      ...conteudoValidado,
    });
    return this.mapearPagina(paginaCriada, false);
  }

  async listarPaginas(
    dto: PaginaCadernoListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoResumoDto[]> {
    await this.recuperarPapelMembro({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    return this.paginaCadernoRepositorio.listarPaginas({
      campanhaId: dto.campanhaId,
      usuarioAutorId: usuarioAtivo.sub,
    });
  }

  async listarPaginasMembro(
    dto: PaginaCadernoMembroListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoResumoDto[]> {
    const papelAtivo = await this.recuperarPapelMembro({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (papelAtivo !== TipoCampanhaMembroPapelEnum.MESTRE) {
      throw new UnauthorizedAccessException();
    }

    const papelAlvo = await this.recuperarPapelMembro({
      campanhaId: dto.campanhaId,
      usuarioId: dto.usuarioId,
    });
    if (papelAlvo !== TipoCampanhaMembroPapelEnum.JOGADOR) {
      throw new UnauthorizedAccessException();
    }

    return this.paginaCadernoRepositorio.listarPaginas({
      campanhaId: dto.campanhaId,
      usuarioAutorId: dto.usuarioId,
    });
  }

  async recuperarPagina(
    dto: PaginaCadernoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoDto> {
    const pagina = await this.recuperarPaginaPersistida(dto);
    const papelAtivo = await this.recuperarPapelMembro({
      campanhaId: pagina.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    const ehAutor = pagina.usuarioAutorId === usuarioAtivo.sub;
    if (!ehAutor && papelAtivo !== TipoCampanhaMembroPapelEnum.MESTRE) {
      throw new UnauthorizedAccessException();
    }
    return this.mapearPagina(pagina, !ehAutor);
  }

  async alterarPagina(
    dto: PaginaCadernoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoDto> {
    const pagina = await this.recuperarPaginaPersistida({ id: dto.id });
    await this.recuperarPapelMembro({
      campanhaId: pagina.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    this.validarAutoria(pagina, usuarioAtivo.sub);
    const conteudoValidado = this.validarConteudo(dto.titulo, dto.conteudoMarkdown);
    if (!dto.updatedDate || Number.isNaN(Date.parse(dto.updatedDate))) {
      throw new BusinessException('Versão da página inválida');
    }

    const paginaAlterada = await this.paginaCadernoRepositorio.alterarPagina({
      id: dto.id,
      ...conteudoValidado,
      updatedDate: dto.updatedDate,
    });
    if (!paginaAlterada) {
      throw new ResourceConflictException('A página foi alterada em outra sessão');
    }
    return this.mapearPagina(paginaAlterada, false);
  }

  async excluirPagina(dto: PaginaCadernoExcluirDto, usuarioAtivo: JwtPayload): Promise<void> {
    const pagina = await this.recuperarPaginaPersistida(dto);
    await this.recuperarPapelMembro({
      campanhaId: pagina.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    this.validarAutoria(pagina, usuarioAtivo.sub);
    await this.paginaCadernoRepositorio.excluirPagina(dto);
  }

  async criarPaginaEsquadrao(
    dto: PaginaCadernoEsquadraoCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoEsquadraoEstadoDto> {
    const conteudoValidado = this.validarConteudo(dto.titulo, '');
    await this.recuperarPapelMembro({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    const documento = new Y.Doc();
    documento.getText('titulo').insert(0, conteudoValidado.titulo);
    const paginaCriada = await this.paginaCadernoRepositorio.criarPaginaEsquadrao({
      campanhaId: dto.campanhaId,
      ...conteudoValidado,
      estadoColaborativo: Y.encodeStateAsUpdate(documento),
    });
    if (!paginaCriada) {
      throw new ResourceNotFoundException('Campanha');
    }
    const pagina = this.mapearPagina(paginaCriada, false);
    this.campanhaGateway.emitirPaginaEsquadraoCriada(this.mapearResumo(paginaCriada));
    return { pagina, estado: Buffer.from(paginaCriada.estadoColaborativo ?? []).toString('base64') };
  }

  async listarPaginasEsquadrao(
    dto: PaginaCadernoListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoResumoDto[]> {
    await this.recuperarPapelMembro({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    return this.paginaCadernoRepositorio.listarPaginasEsquadrao(dto.campanhaId);
  }

  async recuperarEstadoPaginaEsquadrao(
    dto: PaginaCadernoRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoEsquadraoEstadoDto> {
    const pagina = await this.recuperarPaginaEsquadraoPersistida(dto);
    await this.recuperarPapelMembro({ campanhaId: pagina.campanhaId, usuarioId: usuarioAtivo.sub });
    return {
      pagina: this.mapearPagina(pagina, false),
      estado: Buffer.from(pagina.estadoColaborativo ?? []).toString('base64'),
    };
  }

  async alterarPaginaEsquadrao(
    dto: PaginaCadernoEsquadraoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginaCadernoEsquadraoAlteradaDto> {
    const pagina = await this.recuperarPaginaEsquadraoPersistida({ id: dto.id });
    await this.recuperarPapelMembro({ campanhaId: pagina.campanhaId, usuarioId: usuarioAtivo.sub });
    const conteudoValidado = this.validarConteudo(dto.titulo, dto.conteudoMarkdown);
    const atualizacao = this.decodificarAtualizacao(dto.atualizacao);
    const documento = new Y.Doc();
    try {
      Y.applyUpdate(documento, pagina.estadoColaborativo ?? new Uint8Array());
      Y.applyUpdate(documento, atualizacao);
    } catch {
      throw new BusinessException('Atualização colaborativa inválida');
    }
    const estadoColaborativo = Y.encodeStateAsUpdate(documento);
    if (estadoColaborativo.byteLength > 1_000_000) {
      throw new BusinessException('Estado colaborativo excede o limite permitido');
    }
    const paginaAlterada = await this.paginaCadernoRepositorio.alterarPaginaEsquadrao({
      id: dto.id,
      ...conteudoValidado,
      estadoColaborativo,
    });
    if (!paginaAlterada) {
      throw new ResourceNotFoundException('Página do caderno do Esquadrão');
    }
    const evento: PaginaCadernoEsquadraoAlteradaDto = {
      campanhaId: paginaAlterada.campanhaId,
      paginaId: paginaAlterada.id,
      atualizacao: dto.atualizacao,
      pagina: this.mapearResumo(paginaAlterada),
    };
    this.campanhaGateway.emitirPaginaEsquadraoAtualizada(evento);
    return evento;
  }

  async excluirPaginaEsquadrao(dto: PaginaCadernoExcluirDto, usuarioAtivo: JwtPayload): Promise<void> {
    const pagina = await this.recuperarPaginaEsquadraoPersistida(dto);
    const papel = await this.recuperarPapelMembro({
      campanhaId: pagina.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
    if (papel !== TipoCampanhaMembroPapelEnum.MESTRE) {
      throw new UnauthorizedAccessException();
    }
    await this.paginaCadernoRepositorio.excluirPaginaEsquadrao(dto);
    this.campanhaGateway.emitirPaginaEsquadraoExcluida({
      campanhaId: pagina.campanhaId,
      paginaId: pagina.id,
    });
  }

  async buscarCampanha(
    dto: BuscaCampanhaDto,
    usuarioAtivo: JwtPayload,
  ): Promise<PaginatedResult<BuscaCampanhaResultadoDto>> {
    const papelAtivo = await this.recuperarPapelMembro({
      campanhaId: dto.campanhaId,
      usuarioId: usuarioAtivo.sub,
    });
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

    const fontesPermitidas = this.fontesPermitidas(papelAtivo);
    const fontes = dto.fontes === undefined ? fontesPermitidas : [...dto.fontes];
    const valoresConhecidos = Object.values(BuscaCampanhaFonteEnum) as string[];
    if (fontes.some((fonte) => !valoresConhecidos.includes(fonte))) {
      throw new BusinessException('Fonte de busca inválida');
    }
    if (fontes.some((fonte) => !fontesPermitidas.includes(fonte))) {
      throw new UnauthorizedAccessException('Fonte de busca não permitida');
    }
    if (!termo || fontes.length === 0) {
      return new PaginatedResult({
        itens: [],
        totalItens: 0,
        paginaAtual: pagina,
        totalPaginas: 0,
      });
    }

    return this.paginaCadernoRepositorio.buscarCampanha({
      campanhaId: dto.campanhaId,
      usuarioAtivoId: usuarioAtivo.sub,
      termo,
      fontes,
      pagina,
      limite,
    });
  }

  private validarConteudo(
    titulo: string,
    conteudoMarkdown: string,
  ): { titulo: string; conteudoMarkdown: string } {
    const tituloNormalizado = titulo.trim();
    if (!tituloNormalizado) {
      throw new BusinessException('Título da página é obrigatório');
    }
    if (tituloNormalizado.length > PAGINA_CADERNO_TITULO_MAXIMO) {
      throw new BusinessException(
        `Título da página deve ter no máximo ${PAGINA_CADERNO_TITULO_MAXIMO} caracteres`,
      );
    }
    if (conteudoMarkdown.length > PAGINA_CADERNO_CONTEUDO_MAXIMO) {
      throw new BusinessException(
        `Conteúdo da página deve ter no máximo ${PAGINA_CADERNO_CONTEUDO_MAXIMO} caracteres`,
      );
    }
    return { titulo: tituloNormalizado, conteudoMarkdown };
  }

  private fontesPermitidas(
    papel: TipoCampanhaMembroPapelEnum,
  ): readonly BuscaCampanhaFonteEnum[] {
    return papel === TipoCampanhaMembroPapelEnum.MESTRE
      ? [
          BuscaCampanhaFonteEnum.MEU_CADERNO,
          BuscaCampanhaFonteEnum.CADERNOS_JOGADORES,
          BuscaCampanhaFonteEnum.CADERNO_ESQUADRAO,
          BuscaCampanhaFonteEnum.FICHAS_CAMPANHA,
        ]
      : [
          BuscaCampanhaFonteEnum.MEU_CADERNO,
          BuscaCampanhaFonteEnum.CADERNO_ESQUADRAO,
          BuscaCampanhaFonteEnum.MINHAS_FICHAS,
        ];
  }

  private async recuperarPapelMembro(dto: {
    readonly campanhaId: number;
    readonly usuarioId: number;
  }): Promise<TipoCampanhaMembroPapelEnum> {
    const membro = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membro) {
      throw new UnauthorizedAccessException();
    }
    return membro.papel;
  }

  private async recuperarPaginaPersistida(
    dto: PaginaCadernoRecuperarDto,
  ): Promise<PaginaCadernoInternoRecuperadaDto> {
    const pagina = await this.paginaCadernoRepositorio.recuperarPagina(dto);
    if (!pagina) {
      throw new ResourceNotFoundException('Página do caderno');
    }
    return pagina;
  }

  private async recuperarPaginaEsquadraoPersistida(
    dto: PaginaCadernoRecuperarDto,
  ): Promise<PaginaCadernoInternoRecuperadaDto> {
    const pagina = await this.paginaCadernoRepositorio.recuperarPaginaEsquadrao(dto.id);
    if (!pagina) {
      throw new ResourceNotFoundException('Página do caderno do Esquadrão');
    }
    return pagina;
  }

  private decodificarAtualizacao(valor: string): Uint8Array {
    if (!valor || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(valor)) {
      throw new BusinessException('Atualização colaborativa inválida');
    }
    const atualizacao = Buffer.from(valor, 'base64');
    if (atualizacao.byteLength === 0 || atualizacao.byteLength > 1_000_000) {
      throw new BusinessException('Atualização colaborativa inválida');
    }
    return atualizacao;
  }

  private validarAutoria(pagina: PaginaCadernoInternoRecuperadaDto, usuarioAtivoId: number): void {
    if (pagina.usuarioAutorId !== usuarioAtivoId) {
      throw new UnauthorizedAccessException();
    }
  }

  private mapearPagina(
    pagina: PaginaCadernoInternoRecuperadaDto,
    somenteLeitura: boolean,
  ): PaginaCadernoDto {
    return {
      id: pagina.id,
      campanhaId: pagina.campanhaId,
      usuarioAutorId: pagina.usuarioAutorId,
      autorNome: pagina.autorNome,
      tipo: pagina.tipo,
      titulo: pagina.titulo,
      conteudoMarkdown: pagina.conteudoMarkdown,
      somenteLeitura,
      createdDate: pagina.createdDate,
      updatedDate: pagina.updatedDate,
    };
  }

  private mapearResumo(pagina: PaginaCadernoInternoRecuperadaDto): PaginaCadernoResumoDto {
    return {
      id: pagina.id,
      campanhaId: pagina.campanhaId,
      usuarioAutorId: pagina.usuarioAutorId,
      autorNome: pagina.autorNome,
      tipo: pagina.tipo,
      titulo: pagina.titulo,
      updatedDate: pagina.updatedDate,
    };
  }
}
