import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ConfiguracaoArmazenamento } from '../../config/config.service';
import { construirChaveImagem, construirChaveTexto, obterNomePasta, obterMimetypeImagem, recuperarChaveImagem } from './armazenamento-chave.util';
import type {
  ArmazenamentoImagemExcluir,
  ArmazenamentoImagemLer,
  ArmazenamentoImagemLida,
  ArmazenamentoImagemListada,
  ArmazenamentoImagensListar,
  ArmazenamentoImagemSalva,
  ArmazenamentoImagemSalvar,
  ArmazenamentoProvedor,
  ArmazenamentoTextoLer,
  ArmazenamentoTextoSalvar,
} from './armazenamento-provedor.interface';
import { ArmazenamentoPastaEnum } from './armazenamento-provedor.interface';

/** Recorte de `ConfiguracaoArmazenamento` com `provedor: 'r2'` — só os campos que este provedor usa. */
type ConfiguracaoArmazenamentoR2 = Extract<ConfiguracaoArmazenamento, { provedor: 'r2' }>;

/**
 * Armazenamento no Cloudflare R2 (produção, `ARMAZENAMENTO_PROVEDOR=r2`) — S3-compatible via
 * `@aws-sdk/client-s3`, apontando o `endpoint` para o domínio da conta. FICHAS usa bucket privado
 * separado e retorna caminho relativo da API; avulso/documentos/patchnotes preservam bucket e
 * URLs públicas existentes. Nenhuma URL assinada substitui a autorização de cada leitura.
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
        Bucket: dto.pasta === ArmazenamentoPastaEnum.FICHAS ? this.configuracao.r2BucketFichas : this.configuracao.r2Bucket,
        Key: chave,
        Body: dto.conteudo,
        ContentType: dto.mimetype,
      }),
    );
    return { caminho: dto.pasta === ArmazenamentoPastaEnum.FICHAS
      ? `/uploads/${chave}` : `${this.configuracao.r2UrlPublica}/${chave}` };
  }

  async lerImagem(dto: ArmazenamentoImagemLer): Promise<ArmazenamentoImagemLida | null> {
    const chave = recuperarChaveImagem(dto.caminho, this.configuracao.r2UrlPublica);
    try {
      const resposta = await this.clienteS3.send(new GetObjectCommand({
        Bucket: chave.startsWith('fichas/') ? this.configuracao.r2BucketFichas : this.configuracao.r2Bucket,
        Key: chave,
      }));
      const conteudo = await resposta.Body?.transformToByteArray();
      return conteudo ? { conteudo, mimetype: obterMimetypeImagem(chave) } : null;
    } catch (erro) {
      const { name, $metadata } = erro as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (name === 'NoSuchKey' || $metadata?.httpStatusCode === 404) return null;
      throw erro;
    }
  }

  async excluirImagem(dto: ArmazenamentoImagemExcluir): Promise<void> {
    const chave = recuperarChaveImagem(dto.caminho, this.configuracao.r2UrlPublica);
    await this.clienteS3.send(new DeleteObjectCommand({
      Bucket: chave.startsWith('fichas/') ? this.configuracao.r2BucketFichas : this.configuracao.r2Bucket,
      Key: chave,
    }));
  }

  /** Varre `<pasta>/` com `ListObjectsV2`, seguindo a paginação (até 1000 chaves por página). */
  async listarImagens(dto: ArmazenamentoImagensListar): Promise<ArmazenamentoImagemListada[]> {
    const imagens: ArmazenamentoImagemListada[] = [];
    let token: string | undefined;
    do {
      const resposta = await this.clienteS3.send(
        new ListObjectsV2Command({
          Bucket: dto.pasta === ArmazenamentoPastaEnum.FICHAS ? this.configuracao.r2BucketFichas : this.configuracao.r2Bucket,
          Prefix: `${obterNomePasta(dto.pasta)}/`,
          ContinuationToken: token,
        }),
      );
      for (const objeto of resposta.Contents ?? []) {
        if (objeto.Key && objeto.LastModified) {
          imagens.push({
            caminho: dto.pasta === ArmazenamentoPastaEnum.FICHAS ? `/uploads/${objeto.Key}` : `${this.configuracao.r2UrlPublica}/${objeto.Key}`,
            modificadoEm: objeto.LastModified,
          });
        }
      }
      token = resposta.IsTruncated ? resposta.NextContinuationToken : undefined;
    } while (token);
    return imagens;
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
