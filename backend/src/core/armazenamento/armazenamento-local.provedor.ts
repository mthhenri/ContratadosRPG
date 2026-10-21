import type { Dirent } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { construirChaveImagem, construirChaveTexto, obterNomePasta } from './armazenamento-chave.util';
import type {
  ArmazenamentoImagemExcluir,
  ArmazenamentoImagemListada,
  ArmazenamentoImagensListar,
  ArmazenamentoImagemSalva,
  ArmazenamentoImagemSalvar,
  ArmazenamentoProvedor,
  ArmazenamentoTextoLer,
  ArmazenamentoTextoSalvar,
} from './armazenamento-provedor.interface';

const PREFIXO_PUBLICO = '/uploads';

/**
 * Armazenamento em disco local (dev, `ARMAZENAMENTO_PROVEDOR=local`) — sem credencial real
 * necessária para rodar. Grava em `backend/uploads/<pasta>/<uuid>.<extensão>`, servido estático
 * pelo Express (`app.useStaticAssets`, `main.ts`) sob o prefixo `/uploads`.
 */
export class ArmazenamentoLocalProvedor implements ArmazenamentoProvedor {
  private readonly diretorioUploads = resolve(__dirname, '..', '..', '..', 'uploads');

  async salvarImagem(dto: ArmazenamentoImagemSalvar): Promise<ArmazenamentoImagemSalva> {
    const chave = construirChaveImagem(dto.pasta, dto.extensao);
    const caminhoAbsoluto = join(this.diretorioUploads, chave);
    await mkdir(dirname(caminhoAbsoluto), { recursive: true });
    await writeFile(caminhoAbsoluto, dto.conteudo);
    return { caminho: `${PREFIXO_PUBLICO}/${chave}` };
  }

  async excluirImagem(dto: ArmazenamentoImagemExcluir): Promise<void> {
    const chave = dto.caminho.replace(`${PREFIXO_PUBLICO}/`, '');
    await rm(join(this.diretorioUploads, chave), { force: true });
  }

  async listarImagens(dto: ArmazenamentoImagensListar): Promise<ArmazenamentoImagemListada[]> {
    const nomePasta = obterNomePasta(dto.pasta);
    let entradas: Dirent[];
    try {
      entradas = await readdir(join(this.diretorioUploads, nomePasta), { withFileTypes: true });
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw erro;
    }
    // Só arquivos: subpastas (ex.: `agentes/dev/`, dos avatares do seed) não são imagens gravadas.
    return Promise.all(
      entradas
        .filter((entrada) => entrada.isFile())
        .map(async (entrada) => ({
          caminho: `${PREFIXO_PUBLICO}/${nomePasta}/${entrada.name}`,
          modificadoEm: (await stat(join(this.diretorioUploads, nomePasta, entrada.name))).mtime,
        })),
    );
  }

  async lerTexto(dto: ArmazenamentoTextoLer): Promise<string | null> {
    const chave = construirChaveTexto(dto.pasta, dto.nomeArquivo);
    try {
      return await readFile(join(this.diretorioUploads, chave), 'utf8');
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw erro;
    }
  }

  async salvarTexto(dto: ArmazenamentoTextoSalvar): Promise<void> {
    const caminhoAbsoluto = join(
      this.diretorioUploads,
      construirChaveTexto(dto.pasta, dto.nomeArquivo),
    );
    await mkdir(dirname(caminhoAbsoluto), { recursive: true });
    await writeFile(caminhoAbsoluto, dto.conteudo, 'utf8');
  }
}
