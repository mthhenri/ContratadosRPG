import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { config as carregarVariaveisDeAmbiente } from 'dotenv';

/** Conexão com o PostgreSQL local/produção (SYSTEM.SPEC §10.6). */
export interface ConfiguracaoBanco {
  host: string;
  porta: number;
  nome: string;
  usuario: string;
  senha: string;
}

/** Emissão e expiração do JWT (SYSTEM.SPEC §10.6, consumido a partir do M2). */
export interface ConfiguracaoJwt {
  secreto: string;
  expiracao: string;
}

/** Porta, ambiente e origem do frontend (CORS + Socket.IO) da aplicação. */
export interface ConfiguracaoAplicacao {
  porta: number;
  ambiente: string;
  frontendOrigem: string;
}

/**
 * Único ponto de leitura de variáveis de ambiente da aplicação (Proibição #10 —
 * `process.env` nunca direto fora daqui). Carrega o `.env` da raiz do repositório (mesmo
 * arquivo lido pelo Docker Compose e pelo `knexfile.ts`) e expõe getters tipados por
 * grupo, conforme SYSTEM.SPEC §10.6.
 */
@Injectable()
export class ConfigService {
  constructor() {
    carregarVariaveisDeAmbiente({ path: resolve(__dirname, '..', '..', '..', '.env') });
  }

  /** Retorna a configuração de conexão com o banco (`DB_*`). */
  obterConfiguracaoBanco(): ConfiguracaoBanco {
    return {
      host: this.obterVariavelObrigatoria('DB_HOST'),
      porta: Number(this.obterVariavelObrigatoria('DB_PORT')),
      nome: this.obterVariavelObrigatoria('DB_NOME'),
      usuario: this.obterVariavelObrigatoria('DB_USUARIO'),
      senha: this.obterVariavelObrigatoria('DB_SENHA'),
    };
  }

  /** Retorna a configuração de emissão do JWT (`JWT_*`). */
  obterConfiguracaoJwt(): ConfiguracaoJwt {
    return {
      secreto: this.obterVariavelObrigatoria('JWT_SECRETO'),
      expiracao: this.obterVariavelObrigatoria('JWT_EXPIRACAO'),
    };
  }

  /** Retorna a configuração geral da aplicação (`APP_*`). */
  obterConfiguracaoAplicacao(): ConfiguracaoAplicacao {
    return {
      porta: Number(this.obterVariavelObrigatoria('APP_PORTA')),
      ambiente: this.obterVariavelObrigatoria('APP_AMBIENTE'),
      frontendOrigem: this.obterVariavelObrigatoria('APP_FRONTEND_ORIGEM'),
    };
  }

  private obterVariavelObrigatoria(nome: string): string {
    const valor = process.env[nome];
    if (!valor) {
      throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
    }
    return valor;
  }
}
