import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import type {
  UsuarioPerfilAlterarDto,
  UsuarioPerfilAlteradoDto,
  UsuarioRecuperadoDto,
  UsuarioSenhaAlterarDto,
  UsuarioSenhaAlteradaDto,
} from '@contratados-rpg/shared/dtos/usuario';
import { ActiveUser } from '../../core/decorators';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { UsuarioService } from './usuario.service';

/**
 * Endpoints self-service do usuário autenticado — perfil e troca de senha. Rotas
 * **protegidas** (sem `@Public()`): o `JwtAuthGuard` global exige o JWT e o `@ActiveUser()`
 * injeta o payload. Controller burra: só expõe a rota e repassa à service (proibição #2),
 * montando o DTO com o `id` do token (microinteligência sancionada — §7.1).
 */
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Get('perfil')
  recuperarPerfil(@ActiveUser() usuarioAtivo: JwtPayload): Promise<UsuarioRecuperadoDto> {
    return this.usuarioService.recuperarPerfil({ id: usuarioAtivo.sub });
  }

  @Patch('senha')
  alterarSenha(
    @Body() dto: UsuarioSenhaAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<UsuarioSenhaAlteradaDto> {
    return this.usuarioService.alterarSenha(dto, usuarioAtivo);
  }

  @Patch('perfil')
  alterarPerfil(
    @Body() dto: UsuarioPerfilAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<UsuarioPerfilAlteradoDto> {
    return this.usuarioService.alterarPerfil(dto, usuarioAtivo);
  }

  @Delete()
  excluirConta(@ActiveUser() usuarioAtivo: JwtPayload): Promise<void> {
    return this.usuarioService.excluirConta({ id: usuarioAtivo.sub });
  }
}
