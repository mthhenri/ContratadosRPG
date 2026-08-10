import { randomUUID } from 'node:crypto';

/**
 * Chave relativa de um avatar de ficha, comum às duas implementações de armazenamento
 * (`ficha/<uuid>.<extensão>`) — a única diferença entre elas é a raiz (disco local vs bucket
 * R2). Centralizado aqui para não duplicar a convenção de nomeação entre os dois provedores.
 */
export function construirChaveImagemFicha(extensao: string): string {
  return `ficha/${randomUUID()}.${extensao}`;
}
