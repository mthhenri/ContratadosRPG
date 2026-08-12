import { forwardRef, Module } from '@nestjs/common';
import { CampanhaModule } from '../campanha/campanha.module';
import { SessaoTokenModule } from '../autenticacao/sessao-token.module';
import { UsuarioImpersonacaoRepository } from './usuario-impersonacao.repository';
import { UsuarioController } from './usuario.controller';
import { UsuarioRepository } from './usuario.repository';
import { UsuarioService } from './usuario.service';

/**
 * Módulo `usuario` (SYSTEM.SPEC §13): perfil e troca de senha self-service (m2-03), sobre a
 * persistência `UsuarioRepository` (m2-02, também consumida pelo `autenticacao` no registro/
 * login). Expõe o repositório para os módulos que o injetam.
 */
@Module({
  imports: [forwardRef(() => CampanhaModule), SessaoTokenModule],
  controllers: [UsuarioController],
  providers: [UsuarioRepository, UsuarioImpersonacaoRepository, UsuarioService],
  exports: [UsuarioRepository, UsuarioService],
})
export class UsuarioModule {}
