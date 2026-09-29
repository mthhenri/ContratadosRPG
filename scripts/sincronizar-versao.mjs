// Sincroniza a versão do sistema a partir do `version` do package.json da raiz (fonte única — spec
// patchnotes-versao-sistema, pn-01): alinha os três workspaces, o package-lock.json e gera
// `shared/src/versao.ts` (`VERSAO_SISTEMA`), consumida por backend e frontend.
// Uso: `npm run versao:sincronizar`. Idempotente — sem mudança de versão, não altera nenhum arquivo.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACES = ['shared', 'backend', 'frontend'];
const PADRAO_SEMVER = /^\d+\.\d+\.\d+$/;

function lerJson(caminho) {
  return JSON.parse(readFileSync(caminho, 'utf8'));
}

function gravarJson(caminho, conteudo) {
  const texto = `${JSON.stringify(conteudo, null, 2)}\n`;
  if (readFileSync(caminho, 'utf8') !== texto) {
    writeFileSync(caminho, texto);
    console.log(`atualizado: ${caminho.replace(`${raiz}/`, '')}`);
  }
}

const caminhoRaiz = join(raiz, 'package.json');
const versao = lerJson(caminhoRaiz).version;
if (!PADRAO_SEMVER.test(versao)) {
  console.error(`Versão inválida na raiz: "${versao}" (esperado X.Y.Z).`);
  process.exit(1);
}

for (const workspace of WORKSPACES) {
  const caminho = join(raiz, workspace, 'package.json');
  const pacote = lerJson(caminho);
  pacote.version = versao;
  gravarJson(caminho, pacote);
}

const caminhoLock = join(raiz, 'package-lock.json');
const lock = lerJson(caminhoLock);
lock.version = versao;
for (const chave of ['', ...WORKSPACES]) {
  if (lock.packages?.[chave]) {
    lock.packages[chave].version = versao;
  }
}
gravarJson(caminhoLock, lock);

const caminhoVersao = join(raiz, 'shared', 'src', 'versao.ts');
const conteudoVersao = `/* Este arquivo é gerado por scripts/sincronizar-versao.mjs (\`npm run versao:sincronizar\`). */
/* Não edite manualmente: a fonte única é o \`version\` do package.json da raiz. */

/** Versão do sistema exibida na interface e devolvida por \`GET /health\`. */
export const VERSAO_SISTEMA = '${versao}';
`;
let atual = '';
try {
  atual = readFileSync(caminhoVersao, 'utf8');
} catch {
  // arquivo ainda não existe
}
if (atual !== conteudoVersao) {
  writeFileSync(caminhoVersao, conteudoVersao);
  console.log('atualizado: shared/src/versao.ts');
}
console.log(`versão do sistema: ${versao}`);
