import { Body, Controller, Post } from '@nestjs/common';
import type {
  UsuarioAutenticadoDto,
  UsuarioAutenticarDto,
  UsuarioCriadoDto,
  UsuarioCriarDto,
} from '@contratados-rpg/shared/dtos/usuario';
import { Public } from '../../core/decorators';
import { AutenticacaoService } from './autenticacao.service';

/**
 * Endpoints de autenticação — registro e login. Controller burra: só expõe a rota, aplica
 * `@Public()` (dispensam JWT, ao contrário do resto da API sob o `JwtAuthGuard`) e repassa
 * à service (proibição #2). A saída é embrulhada em `StandardResponse<T>` pelo interceptor.
 */
@Controller('autenticacao')
export class AutenticacaoController {
  constructor(private readonly autenticacaoService: AutenticacaoService) {}

  @Public()
  @Post('registro')
  registrar(@Body() dto: UsuarioCriarDto): Promise<UsuarioCriadoDto> {
    return this.autenticacaoService.registrar(dto);
  }

  @Public()
  @Post('login')
  logar(@Body() dto: UsuarioAutenticarDto): Promise<UsuarioAutenticadoDto> {
    return this.autenticacaoService.autenticar(dto);
  }
}
