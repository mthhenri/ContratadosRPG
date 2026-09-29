// Versão automática (patchnotes-versao-sistema): roda no workflow `versao.yml` a cada push em `master`.
//   1. lê as notas em docs/patchnotes/*.md (versao + commit opcional do front matter);
//   2. confere que a versão do package.json da raiz tem nota;
//   3. publica as notas no armazenamento (R2) quando alguma nota ou a versão mudou;
//   4. cria e envia a tag vX.Y.Z de cada versão que ainda não tem tag — o commit é o `commit:` da
//      nota (versões retroativas) ou o commit do push (a versão vigente).
// Publicar vem antes de taguear: se o R2 falhar, nenhuma tag sai. Idempotente: sem mudança, não faz nada.
// Uso: `node scripts/ci/publicar-versao.mjs [--dry-run] [--forcar]`. Ambiente: GITHUB_SHA (obrigatório),
// GITHUB_EVENT_BEFORE (opcional, para detectar o que mudou), ARMAZENAMENTO_* (para publicar).
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const simular = process.argv.includes('--dry-run');
const forcar = process.argv.includes('--forcar');
const SHA_VAZIO = /^0+$/;

function git(...argumentos) {
  return execFileSync('git', argumentos, { cwd: raiz, encoding: 'utf8' }).trim();
}

function falhar(mensagem) {
  console.error(`::error::${mensagem}`);
  process.exit(1);
}

function lerNotas() {
  const pasta = join(raiz, 'docs', 'patchnotes');
  return readdirSync(pasta)
    .filter((nome) => nome.endsWith('.md'))
    .sort()
    .map((nome) => {
      const texto = readFileSync(join(pasta, nome), 'utf8').replace(/\r\n?/g, '\n');
      const frontMatter = texto.match(/^---\n([\s\S]*?)\n---/);
      const campos = Object.fromEntries(
        (frontMatter?.[1] ?? '')
          .split('\n')
          .map((linha) => linha.match(/^([a-z]+):\s*(.*)$/))
          .filter(Boolean)
          .map((partes) => [partes[1], partes[2].trim().replace(/^(["'])(.*)\1$/, '$2')]),
      );
      if (!/^\d+\.\d+\.\d+$/.test(campos.versao ?? '') || `${campos.versao}.md` !== nome) {
        falhar(`docs/patchnotes/${nome}: o front matter precisa ter "versao" igual ao nome do arquivo.`);
      }
      return { arquivo: `docs/patchnotes/${nome}`, versao: campos.versao, commit: campos.commit };
    });
}

const sha = process.env.GITHUB_SHA;
if (!sha) {
  falhar('GITHUB_SHA ausente.');
}
const versaoAtual = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).version;
const notas = lerNotas();
if (!notas.some((nota) => nota.versao === versaoAtual)) {
  falhar(`A versão ${versaoAtual} (package.json) não tem nota em docs/patchnotes/${versaoAtual}.md.`);
}

const antes = process.env.GITHUB_EVENT_BEFORE;
let mudouAlgo = true;
if (!forcar && antes && !SHA_VAZIO.test(antes)) {
  try {
    mudouAlgo = git('diff', '--name-only', antes, sha, '--', 'docs/patchnotes', 'package.json') !== '';
  } catch {
    mudouAlgo = true; // commit anterior fora do clone: melhor publicar de novo (é idempotente)
  }
}

// Tags do remoto entram na conta antes de decidir o que falta (um clone raso não as traz).
try {
  git('fetch', '--tags', '--quiet', 'origin');
} catch {
  console.log('Aviso: não foi possível buscar as tags do remoto; seguindo com as locais.');
}
const existeTag = (tag) => spawnSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], { cwd: raiz }).status === 0;
const tagsFaltando = [];
for (const nota of notas) {
  const tag = `v${nota.versao}`;
  const commit = nota.commit ?? (nota.versao === versaoAtual ? sha : null);
  if (!commit) {
    console.log(`Sem commit para ${tag} (nota sem "commit:" e não é a versão vigente): tag ignorada.`);
  } else if (!existeTag(tag)) {
    tagsFaltando.push({ tag, commit });
  }
}

const publicar = forcar || mudouAlgo || tagsFaltando.length > 0;
console.log(`Versão vigente: ${versaoAtual}. Notas: ${notas.map((nota) => nota.versao).join(', ')}.`);
console.log(`Publicar no armazenamento: ${publicar ? 'sim' : 'não (nada mudou)'}.`);
console.log(`Tags a criar: ${tagsFaltando.map(({ tag, commit }) => `${tag}@${commit.slice(0, 8)}`).join(', ') || 'nenhuma'}.`);
if (simular) {
  process.exit(0);
}

if (publicar) {
  const resultado = spawnSync(
    'npm',
    ['run', 'patchnotes:publicar', '--', ...notas.map((nota) => nota.arquivo)],
    { cwd: raiz, stdio: 'inherit', env: { ...process.env, INIT_CWD: raiz } },
  );
  if (resultado.status !== 0) {
    falhar('Falha ao publicar os patchnotes no armazenamento; nenhuma tag foi criada.');
  }
}

if (tagsFaltando.length > 0) {
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
  for (const { tag, commit } of tagsFaltando) {
    git('cat-file', '-e', `${commit}^{commit}`); // falha alto se o commit da nota não existe
    git('tag', '-a', tag, commit, '-m', tag);
  }
  git('push', 'origin', ...tagsFaltando.map(({ tag }) => `refs/tags/${tag}`));
  console.log(`Tags enviadas: ${tagsFaltando.map(({ tag }) => tag).join(', ')}.`);
}
