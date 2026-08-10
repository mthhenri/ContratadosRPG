import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ConfiguracaoArmazenamento } from '../../config/config.service';
import { construirChaveImagemFicha } from './armazenamento-chave.util';
import type {
  ArmazenamentoImagemExcluir,
  ArmazenamentoImagemSalva,
  ArmazenamentoImagemSalvar,
  ArmazenamentoProvedor,
} from './armazenamento-provedor.interface';

/** Recorte de `ConfiguracaoArmazenamento` com `provedor: 'r2'` — só os campos que este provedor usa. */
type ConfiguracaoArmazenamentoR2 = Extract<ConfiguracaoArmazenamento, { provedor: 'r2' }>;

/**
 * Armazenamento no Cloudflare R2 (produção, `ARMAZENAMENTO_PROVEDOR=r2`) — S3-compatible via
 * `@aws-sdk/client-s3`, apontando o `endpoint` para o domínio da conta (SDK oficial recomendado
 * pela Cloudflare). Grava sob a chave `agentes/<uuid>.<extensão>` — `agentes/` é a pasta que o
 * autor já criou dentro do bucket (separada de futuras pastas para outros tipos de imagem, ex.
 * avatar de usuário) — e devolve a URL pública (domínio custom ou `*.r2.dev`) — durável, sobrevive
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
    const chave = construirChaveImagemFicha(dto.extensao);
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
}
