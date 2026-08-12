import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsuarioModule } from '../usuario/usuario.module';
import { AutenticacaoController } from './autenticacao.controller';
import { AutenticacaoService } from './autenticacao.service';
import { JwtStrategy } from './jwt.strategy';
import { SessaoTokenModule } from './sessao-token.module';

/**
 * Módulo `autenticacao` (SYSTEM.SPEC §12/§13): registro, login e emissão de JWT. Consome a
 * persistência do `UsuarioModule`. O `JwtModule` é configurado a partir do `ConfigService`
 * (`JWT_SECRETO`/`JWT_EXPIRACAO`) — nunca `process.env` direto (proibição #10). Registra a
 * `JwtStrategy`; o `JwtAuthGuard` global é registrado como `APP_GUARD` no `AppModule`.
 */
@Module({
  imports: [
    UsuarioModule,
    PassportModule,
    SessaoTokenModule,
  ],
  controllers: [AutenticacaoController],
  providers: [AutenticacaoService, JwtStrategy],
  // Exporta o `JwtModule` para o `GatewayModule` validar o JWT do handshake WebSocket com o mesmo
  // mecanismo/segredo do REST (m3-05), sem reconfigurar um segundo validador.
  exports: [SessaoTokenModule],
})
export class AutenticacaoModule {}
