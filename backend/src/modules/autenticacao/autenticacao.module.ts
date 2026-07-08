import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '../../config/config.service';
import { UsuarioModule } from '../usuario/usuario.module';
import { AutenticacaoController } from './autenticacao.controller';
import { AutenticacaoService } from './autenticacao.service';
import { JwtStrategy } from './jwt.strategy';

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
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const { secreto, expiracao } = configService.obterConfiguracaoJwt();
        // `expiracao` vem do .env como string (ex.: "8h"); a tipagem do @nestjs/jwt aceita o
        // formato de duração do pacote `ms`, mas só como literal — daí o cast controlado.
        return { secret: secreto, signOptions: { expiresIn: expiracao as `${number}h` } };
      },
    }),
  ],
  controllers: [AutenticacaoController],
  providers: [AutenticacaoService, JwtStrategy],
  // Exporta o `JwtModule` para o `GatewayModule` validar o JWT do handshake WebSocket com o mesmo
  // mecanismo/segredo do REST (m3-05), sem reconfigurar um segundo validador.
  exports: [JwtModule],
})
export class AutenticacaoModule {}
