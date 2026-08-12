import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type {
  UsuarioCriadoDto,
  UsuarioCriarDto,
  UsuarioTipoAlteradoDto,
  UsuarioTipoAlterarDto,
  UsuarioExcluirDto,
  UsuarioListarDto,
  UsuarioListadosDto,
  UsuarioLoginRecuperarDto,
  UsuarioPerfilAlterarDto,
  UsuarioPerfilAlteradoDto,
  UsuarioRecuperadoDto,
  UsuarioRecuperarDto,
  UsuarioReativadoDto,
  UsuarioReativarDto,
  UsuarioSenhaAlterarDto,
  UsuarioSenhaAlteradaDto,
  UsuarioSenhaResetadaDto,
  UsuarioSenhaResetarDto,
  UsuarioSessaoDto,
  UsuarioSessaoRecuperarDto,
} from '@contratados-rpg/shared/dtos/usuario';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { BusinessException, ResourceNotFoundException } from '../../core/exceptions';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { CampanhaRepository } from '../campanha/campanha.repository';
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
  constructor(
    private readonly usuarioRepositorio: UsuarioRepository,
    private readonly campanhaRepositorio: CampanhaRepository,
  ) {}

  /** Recupera o estado persistido atual usado pela autorização global. */
  async recuperarSessao(dto: UsuarioSessaoRecuperarDto): Promise<UsuarioSessaoDto | null> {
    return this.usuarioRepositorio.recuperarSessao(dto);
  }

  /** Lista contas para a superfície administrativa. */
  async listar(dto: UsuarioListarDto): Promise<UsuarioListadosDto> {
    return this.usuarioRepositorio.listar(dto);
  }

  /** Cria uma conta NORMAL, compartilhando a mesma regra com o registro público. */
  async criar(dto: UsuarioCriarDto): Promise<UsuarioCriadoDto> {
    await this.validarLoginDisponivel({ login: dto.login });
    const senhaEncriptada = await bcrypt.hash(dto.senha, ROUNDS_BCRYPT);
    return this.usuarioRepositorio.criarUsuario({
      login: dto.login,
      senha: senhaEncriptada,
      nome: dto.nome,
      tipo: TipoUsuarioEnum.NORMAL,
    });
  }

  /** Altera nome e login da conta indicada pelo id administrativo. */
  async alterar(
    dto: UsuarioPerfilAlterarDto & { readonly id: number },
  ): Promise<UsuarioPerfilAlteradoDto> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorId({ id: dto.id });
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

  /** Exclui por soft delete a conta administrativa indicada. */
  async excluir(dto: UsuarioExcluirDto, usuarioAtivo: JwtPayload): Promise<void> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorId(dto);
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }
    if (usuarioEncontrado.id === usuarioAtivo.sub) {
      throw new BusinessException(
        'Use a tela de Perfil para excluir a própria conta administrativa',
      );
    }
    if (usuarioEncontrado.tipo === TipoUsuarioEnum.ADMIN) {
      await this.validarAdminRestante(usuarioEncontrado.id);
    }
    const campanhasComoMestre = await this.campanhaRepositorio.contarCampanhasComoMestre({
      id: usuarioEncontrado.id,
    });
    if (campanhasComoMestre > 0) {
      throw new BusinessException(
        'Transfira o mestre ou exclua a campanha antes de excluir este usuário',
      );
    }
    await this.usuarioRepositorio.excluirConta({ id: usuarioEncontrado.id });
  }

  /** Altera o tipo e revoga imediatamente os tokens já emitidos para a conta. */
  async alterarTipo(
    dto: UsuarioTipoAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<UsuarioTipoAlteradoDto> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorId({ id: dto.id });
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }
    if (usuarioEncontrado.id === usuarioAtivo.sub) {
      throw new BusinessException('Não é permitido alterar o próprio tipo pela gestão');
    }
    if (
      usuarioEncontrado.tipo === TipoUsuarioEnum.ADMIN &&
      dto.tipo !== TipoUsuarioEnum.ADMIN
    ) {
      await this.validarAdminRestante(usuarioEncontrado.id);
    }

    const usuarioAlterado = await this.usuarioRepositorio.alterarTipo(dto);
    await this.usuarioRepositorio.incrementarTokenVersao({ id: dto.id });
    return usuarioAlterado;
  }

  /** Redefine a senha administrativamente e revoga os tokens da conta. */
  async resetarSenha(dto: UsuarioSenhaResetarDto): Promise<UsuarioSenhaResetadaDto> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorId({ id: dto.id });
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }

    const senhaEncriptada = await bcrypt.hash(dto.novaSenha, ROUNDS_BCRYPT);
    await this.usuarioRepositorio.alterarSenha({ id: dto.id, senha: senhaEncriptada });
    await this.usuarioRepositorio.incrementarTokenVersao({ id: dto.id });
    return {
      id: usuarioEncontrado.id,
      login: usuarioEncontrado.login,
      nome: usuarioEncontrado.nome,
    };
  }

  /** Reativa uma conta excluída. Conta ativa ou inexistente é tratada como recurso ausente. */
  async reativar(dto: UsuarioReativarDto): Promise<UsuarioReativadoDto> {
    const usuarioReativado = await this.usuarioRepositorio.reativar(dto);
    if (!usuarioReativado) {
      throw new ResourceNotFoundException('Usuário');
    }
    return usuarioReativado;
  }

  /** Validação única de disponibilidade de login usada por criação e registro. */
  async validarLoginDisponivel(dto: UsuarioLoginRecuperarDto): Promise<void> {
    const usuarioExistente = await this.usuarioRepositorio.recuperarPorLogin(dto);
    if (usuarioExistente) {
      throw new BusinessException('Login já está em uso');
    }
  }

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
    return this.alterar({ ...dto, id: usuarioAtivo.sub });
  }

  /**
   * Exclui (soft delete) a **própria** conta do usuário autenticado (o `id` vem do JWT via
   * `@ActiveUser()`). Lança `ResourceNotFoundException` se a conta do token já não existir.
   * O encerramento da sessão do cliente é responsabilidade do frontend (m2-14).
   */
  async excluirConta(dto: UsuarioExcluirDto): Promise<void> {
    const usuarioEncontrado = await this.usuarioRepositorio.recuperarPorId(dto);
    if (!usuarioEncontrado) {
      throw new ResourceNotFoundException('Usuário');
    }
    if (usuarioEncontrado.tipo === TipoUsuarioEnum.ADMIN) {
      await this.validarAdminRestante(usuarioEncontrado.id);
    }
    await this.usuarioRepositorio.excluirConta({ id: usuarioEncontrado.id });
  }

  /** Garante que uma mutação sobre um admin preserve ao menos outro admin ativo. */
  private async validarAdminRestante(idExcluido: number): Promise<void> {
    const totalAdminsRestantes = await this.usuarioRepositorio.contarAdminsAtivos({
      idExcluido,
    });
    if (totalAdminsRestantes < 1) {
      throw new BusinessException('O sistema deve manter ao menos um administrador ativo');
    }
  }
}
