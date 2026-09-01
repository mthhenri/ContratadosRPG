import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function lerArquivos(diretorio, extensoes) {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) return lerArquivos(caminho, extensoes);
    return extensoes.some((extensao) => caminho.endsWith(extensao))
      ? [{ caminho, conteudo: readFileSync(caminho, 'utf8') }]
      : [];
  });
}

const estilosDeProducao = [
  ...lerArquivos(fileURLToPath(new URL('../src/app', import.meta.url)), ['.scss']),
  ...lerArquivos(fileURLToPath(new URL('../../docs/design/tema', import.meta.url)), ['.scss']),
];
const templatesDeProducao = lerArquivos(
  fileURLToPath(new URL('../src/app', import.meta.url)),
  ['.html'],
);
const raiosLiterais = /border-radius:\s*(?:2|3|4)px/g;

describe('UI-11 — tokens de acabamento', () => {
  it('não deixa raios literais de 2px, 3px ou 4px fora dos tokens', () => {
    const ocorrencias = estilosDeProducao.flatMap(({ caminho, conteudo }) =>
      [...conteudo.matchAll(raiosLiterais)].map((ocorrencia) => `${caminho}:${ocorrencia.index}`),
    );

    expect(ocorrencias).toEqual([]);
  });

  it('não deixa estilo inline nos templates de produção', () => {
    const ocorrencias = templatesDeProducao.flatMap(({ caminho, conteudo }) =>
      [...conteudo.matchAll(/\sstyle=/g)].map((ocorrencia) => `${caminho}:${ocorrencia.index}`),
    );

    expect(ocorrencias).toEqual([]);
  });
});
