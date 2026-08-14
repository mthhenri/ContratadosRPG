import { Injectable } from '@nestjs/common';
import type {
  PaginaCadernoAlterarDto,
  PaginaCadernoCriarDto,
  PaginaCadernoDto,
  PaginaCadernoExcluirDto,
  PaginaCadernoInternoRecuperadaDto,
  PaginaCadernoListarDto,
  PaginaCadernoMembroListarDto,
  PaginaCadernoRecuperarDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  PAGINA_CADERNO_CONTEUDO_MAXIMO,
  PAGINA_CADERNO_TITULO_MAXIMO,
} from '@contratados-rpg/shared/validators';

import {
  BusinessException,
  ResourceConflictException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
import { PaginaCadernoRepository } from './pagina-caderno.repository';

/** Regras de autoria, leitura do mestre, validação e concorrência das páginas de caderno. */
@Injectable()
export class PaginaCadernoService {
  constructor(
    private readonly paginaCadernoRepositorio: PaginaCadernoRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
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

  private validarAutoria(pagina: PaginaCadernoInternoRecuperadaDto, usuarioAtivoId: number): void {
    if (pagina.usuarioAutorId !== usuarioAtivoId) {
      throw new UnauthorizedAccessException();
    }
  }

  private mapearPagina(
    pagina: PaginaCadernoInternoRecuperadaDto,
    somenteLeitura: boolean,
  ): PaginaCadernoDto {
    return { ...pagina, somenteLeitura };
  }
}
