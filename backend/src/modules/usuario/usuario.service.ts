import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type {
  UsuarioExcluirDto,
  UsuarioPerfilAlterarDto,
  UsuarioPerfilAlteradoDto,
  UsuarioRecuperadoDto,
  UsuarioRecuperarDto,
  UsuarioSenhaAlterarDto,
  UsuarioSenhaAlteradaDto,
} from '@contratados-rpg/shared/dtos/usuario';
import { BusinessException, ResourceNotFoundException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { UsuarioRepository } from './usuario.repository';

/** Custo (rounds) do bcrypt — mesmo do registro (m2-02) e do seed da migration `0003`. */
const ROUNDS_BCRYPT = 10;

/**
 * Regras self-service do usuário autenticado (SYSTEM.SPEC §13): recuperar o próprio perfil
 * e trocar a própria senha. Toda a inteligência vive aqui — a controller apenas repassa
 * (proibição #2). As queries vêm do `UsuarioRepository` (módulo dono — proibição #23). A
 * `senha` **nunca** volta ao cliente.
 */
@Injectable()
export class UsuarioService {
  constructor(private readonly usuarioRepositorio: UsuarioRepository) {}

  /**
   * Recupera o perfil do usuário autenticado (o `id` vem do JWT via `@ActiveUser()`).
   * Retorna os dados públicos — **sem** a senha. Lança `ResourceNotFoundException` se o
   * usuário do token não existir mais (ex.: conta soft-deletada após a emissão do token).
   */
  async recuperarPerfil(dto: UsuarioRecuperarDto): Promise<UsuarioRecuperadoDto> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorId(dto);
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }
    return {
      id: usuarioEncontrado.id,
      login: usuarioEncontrado.login,
      nome: usuarioEncontrado.nome,
    };
  }

  /**
   * Troca a senha do próprio usuário autenticado: valida a `senhaAtual` com `bcrypt.compare`
   * (incorreta → `BusinessException`), encripta a `novaSenha` (bcrypt) e persiste. Retorna os
   * dados públicos do usuário — **sem** a senha.
   */
  async alterarSenha(
    dto: UsuarioSenhaAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<UsuarioSenhaAlteradaDto> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorId({
      id: usuarioAtivo.sub,
    });
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const senhaAtualConfere = await bcrypt.compare(dto.senhaAtual, usuarioEncontrado.senha);
    if (!senhaAtualConfere) {
      throw new BusinessException('Senha atual incorreta');
    }

    const novaSenhaEncriptada = await bcrypt.hash(dto.novaSenha, ROUNDS_BCRYPT);
    await this.usuarioRepositorio.alterarSenha({
      id: usuarioEncontrado.id,
      senha: novaSenhaEncriptada,
    });

    return {
      id: usuarioEncontrado.id,
      login: usuarioEncontrado.login,
      nome: usuarioEncontrado.nome,
    };
  }

  /**
   * Altera os dados de perfil (`nome`, `login`) do próprio usuário autenticado (o `id` vem do
   * JWT via `@ActiveUser()`). Valida a **unicidade do `login`** (§11): se já houver outra
   * conta ativa com o `login` informado → `BusinessException('Login já está em uso')`;
   * reinformar o próprio `login` é permitido. Retorna os dados públicos — **sem** a senha.
   */
  async alterarPerfil(
    dto: UsuarioPerfilAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<UsuarioPerfilAlteradoDto> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorId({
      id: usuarioAtivo.sub,
    });
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const usuarioComMesmoLogin = await this.usuarioRepositorio.recuperarPorLogin({
      login: dto.login,
    });
    if (usuarioComMesmoLogin && usuarioComMesmoLogin.id !== usuarioEncontrado.id) {
      throw new BusinessException('Login já está em uso');
    }

    return this.usuarioRepositorio.alterarPerfil({
      id: usuarioEncontrado.id,
      nome: dto.nome,
      login: dto.login,
    });
  }

  /**
   * Exclui (soft delete) a **própria** conta do usuário autenticado (o `id` vem do JWT via
   * `@ActiveUser()`). Lança `ResourceNotFoundException` se a conta do token já não existir.
   * O encerramento da sessão do cliente é responsabilidade do frontend (m2-14).
   */
  async excluirConta(dto: UsuarioExcluirDto): Promise<void> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorId({ id: dto.id });
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    await this.usuarioRepositorio.excluirConta({ id: usuarioEncontrado.id });
  }
}
