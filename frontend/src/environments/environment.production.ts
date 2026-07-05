/**
 * Configuração de ambiente de produção. O valor de `apiBase` é injetado pelo workflow de CD
 * (`.github/workflows/cd.yml`) a partir da variável `RENDER_API_URL` antes do `ng build`,
 * apontando para a URL pública do backend no Render (ex.: `https://contratados-rpg-api.onrender.com`).
 * O placeholder abaixo (vazio) mantém as chamadas relativas caso o build rode sem a injeção.
 */
export const environment = {
  producao: true,
  apiBase: '',
};
