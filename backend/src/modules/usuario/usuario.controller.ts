import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type {
  UsuarioCriadoDto,
  UsuarioAutenticadoDto,
  UsuarioImpersonarDto,
  UsuarioAdministrativoCriarDto,
  UsuarioListadosDto,
  UsuarioPerfilAlterarDto,
  UsuarioPerfilAlteradoDto,
  UsuarioRecuperadoDto,
  UsuarioReativadoDto,
  UsuarioSenhaAlterarDto,
  UsuarioSenhaAlteradaDto,
  UsuarioSenhaResetadaDto,
  UsuarioSenhaResetarDto,
  UsuarioTipoAlteradoDto,
  UsuarioTipoAlterarDto,
} from '@contratados-rpg/shared/dtos/usuario';
import { TipoUsuarioEnum, UsuarioSituacaoEnum } from '@contratados-rpg/shared/enums';
import { ActiveUser, TiposPermitidos } from '../../core/decorators';
import { DocumentarController } from '../../core/openapi';
import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { UsuarioService } from './usuario.service';

/**
 * Endpoints self-service do usuário autenticado — perfil e troca de senha. Rotas
 * **protegidas** (sem `@Public()`): o `JwtAuthGuard` global exige o JWT e o `@ActiveUser()`
 * injeta o payload. Controller burra: só expõe a rota e repassa à service (proibição #2),
 * montando o DTO com o `id` do token (microinteligência sancionada — §7.1).
 */
@Controller('usuario')
@DocumentarController('Usuários')
@TiposPermitidos(TipoUsuarioEnum.ADMIN)
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Get('perfil')
  @TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.NORMAL, TipoUsuarioEnum.TESTER)
  recuperarPerfil(@ActiveUser() usuarioAtivo: JwtPayload): Promise<UsuarioRecuperadoDto> {
    return this.usuarioService.recuperarPerfil({ id: usuarioAtivo.sub });
  }

  @Patch('senha')
  @TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.NORMAL, TipoUsuarioEnum.TESTER)
  alterarSenha(
    @Body() dto: UsuarioSenhaAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<UsuarioSenhaAlteradaDto> {
    return this.usuarioService.alterarSenha(dto, usuarioAtivo);
  }

  @Patch('perfil')
  @TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.NORMAL, TipoUsuarioEnum.TESTER)
  alterarPerfil(
    @Body() dto: UsuarioPerfilAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<UsuarioPerfilAlteradoDto> {
    return this.usuarioService.alterarPerfil(dto, usuarioAtivo);
  }

  @Delete()
  @TiposPermitidos(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.NORMAL, TipoUsuarioEnum.TESTER)
  excluirConta(@ActiveUser() usuarioAtivo: JwtPayload): Promise<void> {
    return this.usuarioService.excluirConta({ id: usuarioAtivo.sub });
  }

  @Get('admin')
  listar(
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('itensPorPagina', new DefaultValuePipe(20), ParseIntPipe) itensPorPagina: number,
    @Query('ordenarPor', new DefaultValuePipe('nome')) ordenarPor: string,
    @Query('direcao', new DefaultValuePipe('ASC')) direcao: 'ASC' | 'DESC',
    @Query('allRows', new DefaultValuePipe(false), ParseBoolPipe) allRows: boolean,
    @Query('login') login?: string,
    @Query('nome') nome?: string,
    @Query('busca') busca?: string,
    @Query('tipo') tipo?: TipoUsuarioEnum,
    @Query('situacao') situacao?: UsuarioSituacaoEnum,
    @Query('apenasExcluidos', new DefaultValuePipe(false), ParseBoolPipe)
    apenasExcluidos?: boolean,
  ): Promise<UsuarioListadosDto> {
    return this.usuarioService.listar({
      pagina,
      itensPorPagina,
      ordenarPor,
      direcao,
      allRows,
      login,
      nome,
      busca,
      tipo,
      situacao,
      apenasExcluidos,
    });
  }

  @Post('admin')
  criar(@Body() dto: UsuarioAdministrativoCriarDto): Promise<UsuarioCriadoDto> {
    return this.usuarioService.criarAdministrativo(dto);
  }

  @Post('admin/impersonar')
  @TiposPermitidos(TipoUsuarioEnum.ADMIN)
  impersonar(
    @Body() dto: UsuarioImpersonarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<UsuarioAutenticadoDto> {
    return this.usuarioService.impersonar(dto, usuarioAtivo);
  }

  @Patch('admin/:id')
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UsuarioPerfilAlterarDto,
  ): Promise<UsuarioPerfilAlteradoDto> {
    return this.usuarioService.alterar({ ...dto, id });
  }

  @Delete('admin/:id')
  excluir(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<void> {
    return this.usuarioService.excluir({ id }, usuarioAtivo);
  }

  @Patch('admin/:id/reativar')
  reativar(@Param('id', ParseIntPipe) id: number): Promise<UsuarioReativadoDto> {
    return this.usuarioService.reativar({ id });
  }

  @Patch('admin/:id/tipo')
  alterarTipo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UsuarioTipoAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ): Promise<UsuarioTipoAlteradoDto> {
    return this.usuarioService.alterarTipo({ ...dto, id }, usuarioAtivo);
  }

  @Patch('admin/:id/senha')
  resetarSenha(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UsuarioSenhaResetarDto,
  ): Promise<UsuarioSenhaResetadaDto> {
    return this.usuarioService.resetarSenha({ ...dto, id });
  }
}
