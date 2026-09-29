import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ConfiguracaoArmazenamento } from '../../config/config.service';
import { construirChaveImagem, construirChaveTexto } from './armazenamento-chave.util';
import type {
  ArmazenamentoImagemExcluir,
  ArmazenamentoImagemSalva,
  ArmazenamentoImagemSalvar,
  ArmazenamentoProvedor,
  ArmazenamentoTextoLer,
  ArmazenamentoTextoSalvar,
} from './armazenamento-provedor.interface';

/** Recorte de `ConfiguracaoArmazenamento` com `provedor: 'r2'` — só os campos que este provedor usa. */
type ConfiguracaoArmazenamentoR2 = Extract<ConfiguracaoArmazenamento, { provedor: 'r2' }>;

/**
 * Armazenamento no Cloudflare R2 (produção, `ARMAZENAMENTO_PROVEDOR=r2`) — S3-compatible via
 * `@aws-sdk/client-s3`, apontando o `endpoint` para o domínio da conta (SDK oficial recomendado
 * pela Cloudflare). Grava sob a chave `<pasta>/<uuid>.<extensão>` (`agentes/` para os avatares,
 * `documentos/` para os documentos de campanha — `armazenamento-chave.util.ts`) e devolve a URL pública (domínio custom ou `*.r2.dev`) — durável, sobrevive
 * a redeploy.
 */
export class ArmazenamentoR2Provedor implements ArmazenamentoProvedor {
  private readonly clienteS3: S3Client;

  constructor(private readonly configuracao: ConfiguracaoArmazenamentoR2) {
    this.clienteS3 = new S3Client({
      region: 'auto',
      endpoint: `https://${configuracao.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: configuracao.r2AccessKeyId,
        secretAccessKey: configuracao.r2SecretAccessKey,
      },
    });
  }

  async salvarImagem(dto: ArmazenamentoImagemSalvar): Promise<ArmazenamentoImagemSalva> {
    const chave = construirChaveImagem(dto.pasta, dto.extensao);
    await this.clienteS3.send(
      new PutObjectCommand({
        Bucket: this.configuracao.r2Bucket,
        Key: chave,
        Body: dto.conteudo,
        ContentType: dto.mimetype,
      }),
    );
    return { caminho: `${this.configuracao.r2UrlPublica}/${chave}` };
  }

  async excluirImagem(dto: ArmazenamentoImagemExcluir): Promise<void> {
    const chave = dto.caminho.replace(`${this.configuracao.r2UrlPublica}/`, '');
    await this.clienteS3.send(new DeleteObjectCommand({ Bucket: this.configuracao.r2Bucket, Key: chave }));
  }

  /** Lê via `GetObject`; chave inexistente (`NoSuchKey`/404) vira `null` — qualquer outro erro sobe. */
  async lerTexto(dto: ArmazenamentoTextoLer): Promise<string | null> {
    const chave = construirChaveTexto(dto.pasta, dto.nomeArquivo);
    try {
      const resposta = await this.clienteS3.send(
        new GetObjectCommand({ Bucket: this.configuracao.r2Bucket, Key: chave }),
      );
      return (await resposta.Body?.transformToString('utf-8')) ?? null;
    } catch (erro) {
      const { name, $metadata } = erro as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (name === 'NoSuchKey' || $metadata?.httpStatusCode === 404) {
        return null;
      }
      throw erro;
    }
  }

  async salvarTexto(dto: ArmazenamentoTextoSalvar): Promise<void> {
    await this.clienteS3.send(
      new PutObjectCommand({
        Bucket: this.configuracao.r2Bucket,
        Key: construirChaveTexto(dto.pasta, dto.nomeArquivo),
        Body: dto.conteudo,
        ContentType: `${dto.mimetype}; charset=utf-8`,
      }),
    );
  }
}
