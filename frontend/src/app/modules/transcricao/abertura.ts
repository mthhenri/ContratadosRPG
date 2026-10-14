/** URI opaca sem credencial ou caminho; valida também respostas inesperadas. */
export function criarUriAbertura(id: string): string {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) throw new Error('Intenção inválida.');
  return `contratados-transcriber://abrir/${id}`;
}
export function estadoAbertura(confirmada: boolean, expirada: boolean): string {
  return confirmada ? 'Sessão aberta no aplicativo.' : expirada ? 'Não recebemos confirmação do aplicativo.' : 'Aguardando confirmação do aplicativo…';
}
