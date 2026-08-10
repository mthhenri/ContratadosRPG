import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { construirChaveImagemFicha } from './armazenamento-chave.util';
import type {
  ArmazenamentoImagemExcluir,
  ArmazenamentoImagemSalva,
  ArmazenamentoImagemSalvar,
  ArmazenamentoProvedor,
} from './armazenamento-provedor.interface';

const PREFIXO_PUBLICO = '/uploads';

/**
 * Armazenamento em disco local (dev, `ARMAZENAMENTO_PROVEDOR=local`) — sem credencial real
 * necessária para rodar. Grava em `backend/uploads/agentes/<uuid>.<extensão>`, servido estático
 * pelo Express (`app.useStaticAssets`, `main.ts`) sob o prefixo `/uploads`.
 */
export class ArmazenamentoLocalProvedor implements ArmazenamentoProvedor {
  private readonly diretorioUploads = resolve(__dirname, '..', '..', '..', 'uploads');

  async salvarImagem(dto: ArmazenamentoImagemSalvar): Promise<ArmazenamentoImagemSalva> {
    const chave = construirChaveImagemFicha(dto.extensao);
    const caminhoAbsoluto = join(this.diretorioUploads, chave);
    await mkdir(dirname(caminhoAbsoluto), { recursive: true });
    await writeFile(caminhoAbsoluto, dto.conteudo);
    return { caminho: `${PREFIXO_PUBLICO}/${chave}` };
  }

  async excluirImagem(dto: ArmazenamentoImagemExcluir): Promise<void> {
    const chave = dto.caminho.replace(`${PREFIXO_PUBLICO}/`, '');
    await rm(join(this.diretorioUploads, chave), { force: true });
  }
}
