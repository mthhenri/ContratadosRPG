/**
 * Configuração de ambiente de produção. Consumida no build via `fileReplacements` do
 * `angular.json` (substitui `environment.ts`). `apiBase` aponta para a URL pública do backend
 * no Render — a Cloudflare Pages builda o Angular direto do Git, então o valor fica fixado
 * aqui (não é segredo). Trocar aqui se a URL do serviço no Render mudar.
 */
export const environment = {
  producao: true,
  apiBase: 'https://contratados-rpg-api.onrender.com',
};
