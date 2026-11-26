/**
 * Mensagem do servidor numa recusa de salvamento (`StandardResponse.mensagem`), ou um texto
 * genérico — alimenta o aviso "Não salvo" das fichas de Agente e de Criatura (P-140).
 */
export function lerMotivoRecusa(erro: unknown): string {
  const mensagem = (erro as { error?: { mensagem?: unknown } } | null)?.error?.mensagem;
  return typeof mensagem === 'string' && mensagem.trim() ? mensagem : 'O servidor recusou o salvamento.';
}
