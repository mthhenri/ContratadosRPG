/**
 * Configuração de ambiente de desenvolvimento (padrão). `apiBase` vazio mantém as chamadas
 * HTTP relativas (`/health`), que o dev-server encaminha ao backend via `proxy.conf.json`.
 * O build de produção substitui este arquivo por `environment.production.ts`
 * (fileReplacements no `angular.json`), onde `apiBase` aponta para a URL do backend no Render.
 */
export const environment = {
  producao: false,
  apiBase: '',
};
