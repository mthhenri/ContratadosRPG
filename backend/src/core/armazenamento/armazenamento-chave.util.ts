import { randomUUID } from 'node:crypto';
import { ArmazenamentoPastaEnum } from './armazenamento-provedor.interface';

/**
 * Nome da pasta de cada `ArmazenamentoPastaEnum`, dentro de `backend/uploads/` (local) ou do
 * bucket R2. `agentes/` é a pasta que o autor criou no bucket para os avatares das fichas (m3-62);
 * `documentos/` guarda as imagens dos documentos de campanha (m9-02). Mudar um nome aqui não move
 * os arquivos já gravados — os caminhos persistidos continuam apontando para a pasta antiga.
 */
const NOME_PASTA: Readonly<Record<ArmazenamentoPastaEnum, string>> = {
  [ArmazenamentoPastaEnum.AGENTES]: 'agentes',
  [ArmazenamentoPastaEnum.DOCUMENTOS]: 'documentos',
};

/**
 * Chave relativa de uma imagem, comum às duas implementações de armazenamento
 * (`<pasta>/<uuid>.<extensão>`) — a única diferença entre elas é a raiz (disco local vs bucket
 * R2). Centralizado aqui para não duplicar a convenção de nomeação entre os dois provedores.
 */
export function construirChaveImagem(pasta: ArmazenamentoPastaEnum, extensao: string): string {
  return `${NOME_PASTA[pasta]}/${randomUUID()}.${extensao}`;
}
