import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type {
  CampanhaAlteradaDto,
  CampanhaConviteRegeneradoDto,
  CampanhaConviteRegenerarDto,
  CampanhaCriadaDto,
  CampanhaCriarDto,
  CampanhaEntradaDto,
  CampanhaEntrarDto,
  CampanhaExcluirDto,
  CampanhaInternoAlterarDto,
  CampanhaListarDto,
  CampanhaMembroInternoRecuperarDto,
  CampanhaMembroResumoDto,
  CampanhaMembrosListarDto,
  CampanhaRecuperadaDto,
  CampanhaRecuperarDto,
  CampanhaResumoDto,
} from '@contratados-rpg/shared/dtos/campanha';
import {
  BusinessException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from './campanha.repository';

/** Alfabeto do código de convite — sem caracteres ambíguos (0/O/1/I). */
const ALFABETO_CONVITE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Tamanho do código de convite gerado na criação da campanha. */
const TAMANHO_CONVITE = 8;

/**
 * Regras de campanha (SYSTEM.SPEC §13/§14): CRUD com o criador virando `MESTRE`, listagem
 * das campanhas de que o usuário é membro, gestão (alterar/excluir) restrita ao mestre,
 * entrada por código de convite (papel `JOGADOR`), regeneração do convite (só mestre) e
 * listagem de membros. Toda a inteligência — incluindo as **permissões** — vive aqui; a
 * service é o único árbitro (proibição #28) e a controller apenas repassa (proibição #2). As
 * queries vêm do `CampanhaRepository` (módulo dono — proibição #23).
 */
@Injectable()
export class CampanhaService {
  constructor(private readonly campanhaRepositorio: CampanhaRepository) {}

  /**
   * Cria uma campanha: gera um `codigoConvite` único, persiste a `campanha` e cria o
   * `campanha_membro` do criador com papel `MESTRE`. Uma campanha tem exatamente um mestre
   * no v1 (SYSTEM.SPEC §14).
   */
  async criarCampanha(
    dto: CampanhaCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaCriadaDto> {
    const campanhaCriada = await this.campanhaRepositorio.criarCampanha({
      nome: dto.nome,
      descricao: dto.descricao,
      codigoConvite: this.gerarCodigoConvite(),
    });

    await this.campanhaRepositorio.criarMembro({
      campanhaId: campanhaCriada.id,
      usuarioId: usuarioAtivo.sub,
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
    });

    return campanhaCriada;
  }

  /**
   * Lista as campanhas de que o usuário autenticado é membro (o `usuarioId` vem do JWT via
   * `@ActiveUser()`), com o `papel` dele em cada uma.
   */
  async listarCampanhas(dto: CampanhaListarDto): Promise<CampanhaResumoDto[]> {
    return this.campanhaRepositorio.listarPorUsuario(dto);
  }

  /**
   * Recupera uma campanha pelo `id`. Exige que o usuário autenticado seja membro dela
   * (`UnauthorizedAccessException` caso contrário); `ResourceNotFoundException` se a campanha
   * não existir.
   */
  async recuperarCampanha(
    dto: CampanhaRecuperarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaRecuperadaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId(dto);
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMembro({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
    return campanhaEncontrada;
  }

  /**
   * Altera `nome`/`descricao` da campanha — só o mestre pode (SYSTEM.SPEC §14). O `id` vem no
   * DTO (montado pela controller com o `@Param`). `ResourceNotFoundException` se a campanha
   * não existir; `UnauthorizedAccessException` se o autor não for o mestre.
   */
  async alterarCampanha(
    dto: CampanhaInternoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaAlteradaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
    return this.campanhaRepositorio.alterarCampanha(dto);
  }

  /**
   * Exclui a campanha (soft delete) — só o mestre pode (SYSTEM.SPEC §14).
   * `ResourceNotFoundException` se a campanha não existir; `UnauthorizedAccessException` se o
   * autor não for o mestre.
   */
  async excluirCampanha(dto: CampanhaExcluirDto, usuarioAtivo: JwtPayload): Promise<void> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
    await this.campanhaRepositorio.excluirCampanha(dto);
  }

  /**
   * Faz o usuário autenticado ingressar numa campanha pelo `codigoConvite`, com papel
   * `JOGADOR` (SYSTEM.SPEC §14). Código inexistente/inválido → `ResourceNotFoundException`;
   * usuário que já é membro → `BusinessException` (respeitando o índice único
   * `uix_campanha_membro_campanha_usuario_ativo`).
   */
  async entrarCampanha(
    dto: CampanhaEntrarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaEntradaDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorCodigoConvite({
      codigoConvite: dto.codigoConvite,
    });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    const membroExistente = await this.campanhaRepositorio.recuperarMembro({
      campanhaId: campanhaEncontrada.id,
      usuarioId: usuarioAtivo.sub,
    });
    if (membroExistente) {
      throw new BusinessException('Você já é membro desta campanha');
    }

    await this.campanhaRepositorio.criarMembro({
      campanhaId: campanhaEncontrada.id,
      usuarioId: usuarioAtivo.sub,
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });

    return {
      id: campanhaEncontrada.id,
      nome: campanhaEncontrada.nome,
      descricao: campanhaEncontrada.descricao,
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    };
  }

  /**
   * Regenera o `codigoConvite` da campanha — só o mestre pode (SYSTEM.SPEC §14). Gera um novo
   * código único e invalida o anterior (o antigo deixa de resolver para a campanha). O `id`
   * vem no DTO (montado pela controller com o `@Param`). `ResourceNotFoundException` se a
   * campanha não existir; `UnauthorizedAccessException` se o autor não for o mestre.
   */
  async regenerarConvite(
    dto: CampanhaConviteRegenerarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaConviteRegeneradoDto> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({ id: dto.id });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMestre({ campanhaId: dto.id, usuarioId: usuarioAtivo.sub });
    return this.campanhaRepositorio.alterarConvite({
      id: dto.id,
      codigoConvite: this.gerarCodigoConvite(),
    });
  }

  /**
   * Lista os membros da campanha (nome do usuário + papel). Visível a qualquer membro da
   * campanha (§14). `ResourceNotFoundException` se a campanha não existir;
   * `UnauthorizedAccessException` se o autor não for membro.
   */
  async listarMembros(
    dto: CampanhaMembrosListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<CampanhaMembroResumoDto[]> {
    const campanhaEncontrada = await this.campanhaRepositorio.recuperarPorId({
      id: dto.campanhaId,
    });
    if (!campanhaEncontrada) {
      throw new ResourceNotFoundException('Campanha');
    }

    await this.validarMembro({ campanhaId: dto.campanhaId, usuarioId: usuarioAtivo.sub });
    return this.campanhaRepositorio.listarMembros(dto);
  }

  /**
   * Garante que o usuário é membro da campanha (dono/mestre ou jogador) — do contrário lança
   * `UnauthorizedAccessException`. Base da visualização de campanha (§14).
   */
  private async validarMembro(dto: CampanhaMembroInternoRecuperarDto): Promise<void> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membroEncontrado) {
      throw new UnauthorizedAccessException();
    }
  }

  /**
   * Garante que o usuário é o mestre da campanha — do contrário lança
   * `UnauthorizedAccessException`. Gate da gestão de campanha (alterar/excluir — §14).
   */
  private async validarMestre(dto: CampanhaMembroInternoRecuperarDto): Promise<void> {
    const membroEncontrado = await this.campanhaRepositorio.recuperarMembro(dto);
    if (!membroEncontrado || membroEncontrado.papel !== TipoCampanhaMembroPapelEnum.MESTRE) {
      throw new UnauthorizedAccessException();
    }
  }

  /**
   * Gera um código de convite aleatório (alfabeto sem caracteres ambíguos). A unicidade entre
   * campanhas ativas é garantida pelo índice único parcial `uix_campanha_codigo_convite_ativo`.
   */
  private gerarCodigoConvite(): string {
    const bytes = randomBytes(TAMANHO_CONVITE);
    let codigo = '';
    for (let indice = 0; indice < TAMANHO_CONVITE; indice += 1) {
      codigo += ALFABETO_CONVITE[bytes[indice] % ALFABETO_CONVITE.length];
    }
    return codigo;
  }
}
