import { randomUUID } from 'node:crypto';

/**
 * Chave relativa de um avatar de ficha, comum às duas implementações de armazenamento
 * (`agentes/<uuid>.<extensão>`) — a única diferença entre elas é a raiz (disco local vs bucket
 * R2). `agentes/` é a pasta que o autor já criou dentro do bucket R2 para os avatares das fichas
 * (separada de futuras pastas para outros tipos de imagem, ex. avatar de usuário) — centralizado
 * aqui para não duplicar a convenção de nomeação entre os dois provedores.
 */
export function construirChaveImagemFicha(extensao: string): string {
  return `agentes/${randomUUID()}.${extensao}`;
}
