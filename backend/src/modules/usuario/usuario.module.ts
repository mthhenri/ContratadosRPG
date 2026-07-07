import { Module } from '@nestjs/common';
import { UsuarioRepository } from './usuario.repository';

/**
 * Módulo `usuario` — por ora expõe apenas a persistência (`UsuarioRepository`), consumida
 * pelo módulo `autenticacao` (registro e login, m2-02). Perfil e troca de senha nascem na
 * m2-03. Exporta o repositório para os módulos que o injetam.
 */
@Module({
  providers: [UsuarioRepository],
  exports: [UsuarioRepository],
})
export class UsuarioModule {}
