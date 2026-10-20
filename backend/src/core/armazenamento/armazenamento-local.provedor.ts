import type { Dirent } from 'node:fs';
import { mkdir, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
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

const PREFIXO_PUBLICO = '/uploads';

/**
 * Armazenamento em disco local (dev, `ARMAZENAMENTO_PROVEDOR=local`) — sem credencial real
 * necessária para rodar. A raiz padrão é `backend/uploads`, substituível por configuração.
 * Só documentos/patchnotes são estáticos; fichas e legado agentes passam pela API de avatar.
 */
export class ArmazenamentoLocalProvedor implements ArmazenamentoProvedor {
  private readonly diretorioUploads: string;

  constructor(diretorioUploads = resolve(__dirname, '..', '..', '..', 'uploads')) {
    this.diretorioUploads = resolve(diretorioUploads);
  }

  async lerImagem(dto: ArmazenamentoImagemLer): Promise<ArmazenamentoImagemLida | null> {
    const chave = recuperarChaveImagem(dto.caminho);
    try {
      const raizReal = await realpath(this.diretorioUploads);
      const arquivoReal = await realpath(join(this.diretorioUploads, chave));
      if (!arquivoReal.startsWith(`${raizReal}${sep}`)) throw new Error('Caminho de imagem inválido');
      const conteudo = await readFile(arquivoReal);
      return { conteudo: Uint8Array.from(conteudo), mimetype: obterMimetypeImagem(chave) };
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw erro;
    }
  }

  async salvarImagem(dto: ArmazenamentoImagemSalvar): Promise<ArmazenamentoImagemSalva> {
    const chave = construirChaveImagem(dto.pasta, dto.extensao);
    const caminhoAbsoluto = join(this.diretorioUploads, chave);
    await mkdir(dirname(caminhoAbsoluto), { recursive: true });
    await writeFile(caminhoAbsoluto, dto.conteudo);
    return { caminho: `${PREFIXO_PUBLICO}/${chave}` };
  }

  async excluirImagem(dto: ArmazenamentoImagemExcluir): Promise<void> {
    const chave = recuperarChaveImagem(dto.caminho);
    await rm(join(this.diretorioUploads, chave), { force: true });
  }

  async listarImagens(dto: ArmazenamentoImagensListar): Promise<ArmazenamentoImagemListada[]> {
    const nomePasta = obterNomePasta(dto.pasta);
    const imagens: ArmazenamentoImagemListada[] = [];
    const visitar = async (pasta: string): Promise<void> => {
      let entradas: Dirent[];
      try {
        entradas = await readdir(join(this.diretorioUploads, pasta), { withFileTypes: true });
      } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw erro;
      }
      for (const entrada of entradas) {
        if (entrada.isSymbolicLink()) continue;
        if (entrada.isDirectory() && nomePasta === 'agentes' && /^[A-Za-z0-9_-]+$/.test(entrada.name)) {
          await visitar(`${pasta}/${entrada.name}`);
        } else if (entrada.isFile()) {
          const caminho = `${PREFIXO_PUBLICO}/${pasta}/${entrada.name}`;
          try { recuperarChaveImagem(caminho); } catch { continue; }
          imagens.push({ caminho, modificadoEm: (await stat(join(this.diretorioUploads, pasta, entrada.name))).mtime });
        }
      }
    };
    await visitar(nomePasta);
    return imagens;
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
