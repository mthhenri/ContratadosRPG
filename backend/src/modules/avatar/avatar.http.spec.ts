import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, NestFactory, Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TipoCampanhaMembroPapelEnum, TipoFichaEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { ConfigService } from "../../config/config.service";
import { registrarArquivosPublicos } from "../../core/armazenamento/arquivos-publicos";
import { GlobalExceptionFilter } from "../../core/filters/global-exception.filter";
import { ResponseFormatInterceptor } from "../../core/interceptors/response-format.interceptor";
import { criarDocumentoOpenApi } from "../../core/openapi/openapi.document";
import { JwtAuthGuard } from "../autenticacao/autenticacao.guard";
import { JwtStrategy } from "../autenticacao/jwt.strategy";
import { FichaService } from "../ficha/ficha.service";
import { EncontroService } from "../encontro/encontro.service";
import { AvatarController } from "./avatar.controller";
import { AvatarService } from "./avatar.service";

const bytes = new Uint8Array([137, 80, 78, 71]);
const armazenamento = { lerImagem: () => Promise.resolve({ conteudo: bytes, mimetype: 'image/png' }) };
const ficha = new FichaService({
  recuperarContextoImagem: ({ caminho, usuarioId }: { caminho: string; usuarioId: number }) => caminho.endsWith('/avatar.png') ? {
    ficha: { id: 1, imagemUrl: caminho, usuarioId: 10, campanhaId: 3, tipo: TipoFichaEnum.JOGADOR, oculta: true },
    papelUsuario: usuarioId === 7 ? TipoCampanhaMembroPapelEnum.MESTRE : TipoCampanhaMembroPapelEnum.JOGADOR,
    papelAlvo: null, acessoUsuario: true, acessoAlvo: false,
  } : null,
  recuperarAcesso: () => ({ id: 1 }),
} as never, { recuperarMembro: ({ usuarioId }: { usuarioId: number }) => ({
  papel: usuarioId === 7 ? TipoCampanhaMembroPapelEnum.MESTRE : TipoCampanhaMembroPapelEnum.JOGADOR,
}) } as never, {
  ehEspectador: (papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.ESPECTADOR,
  ehMestre: (papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.MESTRE,
  ehJogador: (papel: TipoCampanhaMembroPapelEnum) => papel === TipoCampanhaMembroPapelEnum.JOGADOR,
} as never, {} as never, armazenamento as never);
const encontro = new EncontroService({
  recuperarImagemAvulso: ({ caminho }: { caminho: string }) => caminho.endsWith('/avulso.png') ? { caminho } : null,
} as never, {} as never, ficha, {} as never, armazenamento as never);

// O transpiler do Vitest não emite design:paramtypes; a compilação Nest/tsc de produção emite.
Reflect.defineMetadata('design:paramtypes', [AvatarService], AvatarController);
Reflect.defineMetadata('design:paramtypes', [FichaService, EncontroService], AvatarService);
Reflect.defineMetadata('design:paramtypes', [ConfigService], JwtStrategy);
Reflect.defineMetadata('design:paramtypes', [Reflector], JwtAuthGuard);

@Module({
  imports: [PassportModule], controllers: [AvatarController],
  providers: [AvatarService, JwtStrategy,
    { provide: FichaService, useValue: ficha }, { provide: EncontroService, useValue: encontro },
    { provide: ConfigService, useValue: { obterConfiguracaoJwt: () => ({ secreto: 'avatar-teste-segredo', expiracao: '1h' }) } },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseFormatInterceptor },
  ],
})
class AvatarHttpModule {}

describe('Avatar HTTP real — JWT, wildcard, cache e arquivos públicos', () => {
  let app: NestExpressApplication;
  let origem: string;
  const diretorio = resolve(__dirname, '../../../../.artifacts/ficha-avatar-leitura-autorizada/http-publicos');
  const nomeArquivo = `${randomUUID()}.png`;
  const jwt = new JwtService({ secret: 'avatar-teste-segredo' });
  const headers = (sub: number) => ({ Authorization: `Bearer ${jwt.sign({ sub, login: `u${sub}`, tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 })}` });

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(AvatarHttpModule, { logger: false, abortOnError: false });
    app.useGlobalFilters(new GlobalExceptionFilter());
    for (const pasta of ['documentos', 'patchnotes']) {
      await mkdir(resolve(diretorio, pasta), { recursive: true });
      await writeFile(resolve(diretorio, pasta, nomeArquivo), bytes);
    }
    registrarArquivosPublicos(app, diretorio);
    await app.listen(0, '127.0.0.1');
    origem = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all(['documentos', 'patchnotes'].map(pasta => rm(resolve(diretorio, pasta, nomeArquivo), { force: true })));
  });

  it('não permite acesso canônico sem JWT; legado com subpasta também exige leitura atual', async () => {
    expect((await fetch(`${origem}/uploads/fichas/avatar.png`)).status).toBe(401);
    expect((await fetch(`${origem}/uploads/agentes/dev/avatar.png`)).status).toBe(401);
    expect((await fetch(`${origem}/uploads/agentes/dev/avatar.png`, { headers: headers(42) })).status).toBe(403);
    const permitido = await fetch(`${origem}/uploads/agentes/dev/avatar.png`, { headers: headers(10) });
    expect(permitido.status).toBe(200);
    expect(new Uint8Array(await permitido.arrayBuffer())).toEqual(bytes);
  });

  it('negações 401/403 também recebem no-store/Vary/nosniff, sem ETag ou 304', async () => {
    const condicionais = { 'If-None-Match': '*', 'If-Modified-Since': 'Wed, 21 Oct 2099 07:28:00 GMT' };
    const requisicoes = [
      { caminho: '/uploads/fichas/avatar.png', headers: condicionais, status: 401 },
      { caminho: '/uploads/agentes/dev/avatar.png', headers: condicionais, status: 401 },
      { caminho: '/uploads/fichas/avatar.png', headers: { ...condicionais, ...headers(42) }, status: 403 },
    ];
    for (const requisicao of requisicoes) {
      const resposta = await fetch(`${origem}${requisicao.caminho}`, { headers: requisicao.headers });
      expect(resposta.status).toBe(requisicao.status);
      expect(resposta.headers.get('cache-control')).toBe('private, no-store');
      expect(resposta.headers.get('vary')).toContain('Authorization');
      expect(resposta.headers.get('x-content-type-options')).toBe('nosniff');
      expect(resposta.headers.get('etag')).toBeNull();
      expect(await resposta.json()).toMatchObject({ sucesso: false, dados: null });
    }
  });

  it('stream cru não cria ETag/304 e mantém cabeçalhos privados mesmo com condicionais', async () => {
    for (const sub of [7, 10]) {
      const resposta = await fetch(`${origem}/uploads/fichas/avatar.png`, { headers: {
        ...headers(sub), 'If-None-Match': '*', 'If-Modified-Since': 'Wed, 21 Oct 2099 07:28:00 GMT',
      } });
      expect(resposta.status).toBe(200);
      expect(resposta.headers.get('cache-control')).toBe('private, no-store');
      expect(resposta.headers.get('vary')).toContain('Authorization');
      expect(resposta.headers.get('x-content-type-options')).toBe('nosniff');
      expect(resposta.headers.get('etag')).toBeNull();
      expect(resposta.headers.get('content-type')).toContain('image/png');
      expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(bytes);
    }
  });

  it('recusa órfãos e traversal mas preserva avulso público ativo', async () => {
    expect((await fetch(`${origem}/uploads/agentes/dev/orfao.png`)).status).toBe(404);
    expect((await fetch(`${origem}/uploads/agentes/dev/%2e%2e%2favatar.png`)).status).toBe(404);
    const resposta = await fetch(`${origem}/uploads/agentes/avulso.png`);
    expect(resposta.status).toBe(200);
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(bytes);
  });

  it('documentos e patchnotes permanecem estáticos sem exigir JWT', async () => {
    for (const pasta of ['documentos', 'patchnotes']) {
      const resposta = await fetch(`${origem}/uploads/${pasta}/${nomeArquivo}`);
      expect(resposta.status).toBe(200);
      expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(bytes);
    }
  });

  it('OpenAPI documenta bytes binários e contexto opcional, sem envelope JSON', () => {
    const documento = criarDocumentoOpenApi(app);
    const operacao = documento.paths['/uploads/fichas/{nomeArquivo}']?.get;
    expect(operacao?.security).toEqual([{ jwt: [] }]);
    expect(operacao?.responses['200']).toMatchObject({ content: {
      'image/png': { schema: { type: 'string', format: 'binary' } },
    } });
    expect(operacao?.parameters).toContainEqual(expect.objectContaining({ name: 'espectador', required: false }));
  });
});
