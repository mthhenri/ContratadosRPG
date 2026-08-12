import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '../../config/config.service';
import { SessaoTokenService } from './sessao-token.service';

/** Configuração compartilhada e única do JWT e de sua projeção de sessão. */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const { secreto, expiracao } = configService.obterConfiguracaoJwt();
        return { secret: secreto, signOptions: { expiresIn: expiracao as `${number}d` } };
      },
    }),
  ],
  providers: [SessaoTokenService],
  exports: [JwtModule, SessaoTokenService],
})
export class SessaoTokenModule {}
