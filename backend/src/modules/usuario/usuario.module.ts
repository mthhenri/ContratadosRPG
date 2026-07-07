import { Module } from '@nestjs/common';
import { UsuarioController } from './usuario.controller';
import { UsuarioRepository } from './usuario.repository';
import { UsuarioService } from './usuario.service';

/**
 * Módulo `usuario` (SYSTEM.SPEC §13): perfil e troca de senha self-service (m2-03), sobre a
 * persistência `UsuarioRepository` (m2-02, também consumida pelo `autenticacao` no registro/
 * login). Expõe o repositório para os módulos que o injetam.
 */
@Module({
  controllers: [UsuarioController],
  providers: [UsuarioRepository, UsuarioService],
  exports: [UsuarioRepository],
})
export class UsuarioModule {}
