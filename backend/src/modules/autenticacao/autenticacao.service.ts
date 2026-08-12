import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type {
  UsuarioAutenticadoDto,
  UsuarioAutenticarDto,
  UsuarioCriadoDto,
  UsuarioCriarDto,
  UsuarioInternoRecuperadoDto,
} from '@contratados-rpg/shared/dtos/usuario';
import { BusinessException } from '../../core/exceptions';
import { UsuarioRepository } from '../usuario/usuario.repository';
import { UsuarioService } from '../usuario/usuario.service';
import type { JwtPayload } from './jwt-payload.interface';

/**
 * Regras de autenticação (SYSTEM.SPEC §12): registro com senha encriptada (bcrypt),
 * validação de duplicidade de login e login com emissão de JWT. Toda a inteligência vive
 * aqui — a controller apenas repassa (proibição #2). As queries de usuário vêm do
 * `UsuarioRepository` (módulo dono — proibição #23).
 */
@Injectable()
export class AutenticacaoService {
  constructor(
    private readonly usuarioRepositorio: UsuarioRepository,
    private readonly usuarioService: UsuarioService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registra um novo usuário: recusa login duplicado, encripta a senha com bcrypt e
   * persiste. Retorna os dados públicos do usuário criado — **sem** a senha.
   */
  async registrar(dto: UsuarioCriarDto): Promise<UsuarioCriadoDto> {
    return this.usuarioService.criar(dto);
  }

  /**
   * Autentica um usuário pelo login e senha e retorna um JWT + os dados básicos. Login
   * inexistente e senha incorreta produzem a **mesma** mensagem (não revela qual falhou).
   */
  async autenticar(dto: UsuarioAutenticarDto): Promise<UsuarioAutenticadoDto> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorLogin({
      login: dto.login,
    });
    const senhaConfere =
      usuarioEncontrado !== null && (await bcrypt.compare(dto.senha, usuarioEncontrado.senha));
    if (!usuarioEncontrado || !senhaConfere) {
      throw new BusinessException('Login ou senha inválidos');
    }

    return {
      token: this.gerarToken(usuarioEncontrado),
      id: usuarioEncontrado.id,
      login: usuarioEncontrado.login,
      nome: usuarioEncontrado.nome,
    };
  }

  /** Assina o JWT com o `id` (subject) e o login do usuário. */
  private gerarToken(usuario: UsuarioInternoRecuperadoDto): string {
    const payload: JwtPayload = {
      sub: usuario.id,
      login: usuario.login,
      tipo: usuario.tipo,
      tokenVersao: usuario.tokenVersao,
    };
    return this.jwtService.sign(payload);
  }
}
