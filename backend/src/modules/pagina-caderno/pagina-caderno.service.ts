import { Injectable } from '@nestjs/common';
import type {
  BuscaCampanhaDto,
  BuscaCampanhaResultadoDto,
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
import { BuscaCampanhaFonteEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
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
          BuscaCampanhaFonteEnum.FICHAS_CAMPANHA,
        ]
      : [BuscaCampanhaFonteEnum.MEU_CADERNO, BuscaCampanhaFonteEnum.MINHAS_FICHAS];
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
