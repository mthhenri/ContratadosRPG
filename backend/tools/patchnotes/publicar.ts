import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PatchnoteResumoDto } from '@contratados-rpg/shared/dtos/patchnote';
import { ConfigService } from '../../src/config/config.service';
import {
  ArmazenamentoPastaEnum,
  criarArmazenamentoProvedor,
  type ArmazenamentoProvedor,
} from '../../src/core/armazenamento';
import {
  interpretarIndicePatchnotes,
  interpretarPatchnote,
  normalizarTextoPatchnote,
  ordenarPatchnotes,
} from '../../src/modules/patchnote/patchnote-formato.util';

/**
 * Publicação de patchnotes (pn-05): grava `patchnotes/<versao>.md` no armazenamento (R2 em
 * `ARMAZENAMENTO_PROVEDOR=r2`, disco local em `local`) e atualiza o `patchnotes/indice.json`, lendo
 * o índice que já está lá — o R2 é a única fonte de verdade, a pasta `docs/patchnotes/` é só o
 * rascunho local. Uso: `npm run patchnotes:publicar -- [--dry-run] <arquivo.md>...`.
 */

export interface ArquivoPatchnote {
  readonly nome: string;
  readonly texto: string;
}

export interface ResumoPublicacao {
  readonly publicadas: readonly string[];
  readonly substituidas: readonly string[];
  readonly indice: readonly PatchnoteResumoDto[];
}

const NOME_INDICE = 'indice.json';

/**
 * Valida todos os arquivos antes de gravar qualquer coisa; grava as notas primeiro e o índice por
 * último, para que uma falha no meio nunca deixe no índice uma versão sem arquivo. Com `simular`,
 * valida e calcula o resultado sem escrever.
 */
export async function publicarPatchnotes(dto: {
  readonly armazenamento: ArmazenamentoProvedor;
  readonly arquivos: readonly ArquivoPatchnote[];
  readonly simular?: boolean;
}): Promise<ResumoPublicacao> {
  if (dto.arquivos.length === 0) {
    throw new Error('Nenhum arquivo de patchnote informado.');
  }

  const notas = dto.arquivos.map((arquivo) => {
    const leitura = interpretarPatchnote(arquivo.texto);
    if ('erros' in leitura) {
      throw new Error(`${arquivo.nome}:\n - ${leitura.erros.join('\n - ')}`);
    }
    return { arquivo, patchnote: leitura.patchnote };
  });

  const versoes = notas.map((nota) => nota.patchnote.versao);
  const repetida = versoes.find((versao, posicao) => versoes.indexOf(versao) !== posicao);
  if (repetida) {
    throw new Error(`A versão ${repetida} aparece em mais de um arquivo.`);
  }

  const indiceAtual = interpretarIndicePatchnotes(
    await dto.armazenamento.lerTexto({
      pasta: ArmazenamentoPastaEnum.PATCHNOTES,
      nomeArquivo: NOME_INDICE,
    }),
  );
  const substituidas = versoes.filter((versao) => indiceAtual.some((item) => item.versao === versao));
  const indice = ordenarPatchnotes([
    ...indiceAtual.filter((item) => !versoes.includes(item.versao)),
    ...notas.map(({ patchnote }) => ({
      versao: patchnote.versao,
      data: patchnote.data,
      titulo: patchnote.titulo,
    })),
  ]);

  if (!dto.simular) {
    for (const { arquivo, patchnote } of notas) {
      await dto.armazenamento.salvarTexto({
        pasta: ArmazenamentoPastaEnum.PATCHNOTES,
        nomeArquivo: `${patchnote.versao}.md`,
        conteudo: normalizarTextoPatchnote(arquivo.texto),
        mimetype: 'text/markdown',
      });
    }
    await dto.armazenamento.salvarTexto({
      pasta: ArmazenamentoPastaEnum.PATCHNOTES,
      nomeArquivo: NOME_INDICE,
      conteudo: `${JSON.stringify(indice, null, 2)}\n`,
      mimetype: 'application/json',
    });
  }

  return { publicadas: versoes, substituidas, indice };
}

export async function main(argumentos: readonly string[]): Promise<void> {
  const simular = argumentos.includes('--dry-run');
  const caminhos = argumentos.filter((argumento) => !argumento.startsWith('--'));
  // `npm run --workspace` roda dentro de `backend/`; os caminhos valem a partir de onde o autor digitou.
  const base = process.env.INIT_CWD ?? process.cwd();
  const arquivos = caminhos.map((caminho) => ({
    nome: caminho,
    texto: readFileSync(resolve(base, caminho), 'utf8'),
  }));

  const configuracao = new ConfigService().obterConfiguracaoArmazenamento();
  const destino = configuracao.provedor === 'r2' ? `R2 (bucket ${configuracao.r2Bucket})` : 'disco local (backend/uploads)';
  console.log(`${simular ? '[simulação] ' : ''}Destino: ${destino}`);

  const resumo = await publicarPatchnotes({
    armazenamento: criarArmazenamentoProvedor(configuracao),
    arquivos,
    simular,
  });
  console.log(`${simular ? 'Publicaria' : 'Publicadas'}: ${resumo.publicadas.map((v) => `v${v}`).join(', ')}`);
  if (resumo.substituidas.length > 0) {
    console.log(`Substituiu versões que já existiam: ${resumo.substituidas.map((v) => `v${v}`).join(', ')}`);
  }
  console.log(`Índice ${simular ? 'ficaria' : 'agora'}: ${resumo.indice.map((item) => `v${item.versao}`).join(', ')}`);
}

if (typeof require !== 'undefined' && require.main === module) {
  void main(process.argv.slice(2)).catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
}
