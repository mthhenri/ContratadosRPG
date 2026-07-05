/**
 * Envelope padrão de toda resposta HTTP da API — sucesso e erro — montado pelo
 * `response-format.interceptor` (sucesso) e pelo `global-exception.filter` (erro) do
 * backend. Ver SYSTEM.SPEC §7.2 e §11.
 */
export interface StandardResponse<TData = unknown> {
  sucesso: boolean;
  dados: TData | null;
  mensagem: string;
  erros?: string[];
}
