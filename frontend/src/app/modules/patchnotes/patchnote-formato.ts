/**
 * Apresentação de um patchnote (pn-04): separa o Markdown da nota em introdução + blocos de
 * `## Título` e formata a data. Funções puras — a renderização segura de cada trecho fica com
 * `renderizarMarkdownSeguro`, na página.
 */

/** Tom visual do bloco, decidido pelo título (`Novidades`, `Melhorias`, `Correções`). */
export type PatchnoteBlocoTom = 'novidades' | 'melhorias' | 'correcoes' | 'neutro';

export interface PatchnoteBloco {
  readonly titulo: string;
  readonly tom: PatchnoteBlocoTom;
  readonly markdown: string;
}

export interface PatchnoteEstruturado {
  /** Texto antes do primeiro `##` — o resumo da versão. Vazio quando a nota começa por um bloco. */
  readonly introducao: string;
  readonly blocos: readonly PatchnoteBloco[];
}

const TONS_POR_TITULO: Readonly<Record<string, PatchnoteBlocoTom>> = {
  novidades: 'novidades',
  melhorias: 'melhorias',
  correcoes: 'correcoes',
};

function normalizarTitulo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

/**
 * Divide a nota nos títulos `## …`. Um `##` dentro de bloco de código cercado não abre bloco, e os
 * títulos de outro nível (`#`, `###`) continuam sendo texto do bloco em que estão.
 */
export function estruturarPatchnote(markdown: string): PatchnoteEstruturado {
  const introducao: string[] = [];
  const blocos: { titulo: string; linhas: string[] }[] = [];
  let dentroDeCodigo = false;

  for (const linha of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(linha)) {
      dentroDeCodigo = !dentroDeCodigo;
    }
    const titulo = dentroDeCodigo ? null : linha.match(/^##\s+(.+?)\s*#*\s*$/);
    if (titulo) {
      blocos.push({ titulo: titulo[1], linhas: [] });
    } else if (blocos.length > 0) {
      blocos[blocos.length - 1].linhas.push(linha);
    } else {
      introducao.push(linha);
    }
  }

  return {
    introducao: introducao.join('\n').trim(),
    blocos: blocos.map(({ titulo, linhas }) => ({
      titulo,
      tom: TONS_POR_TITULO[normalizarTitulo(titulo)] ?? 'neutro',
      markdown: linhas.join('\n').trim(),
    })),
  };
}

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function partesDaData(data: string): { ano: string; mes: number; dia: number } | null {
  const partes = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes || Number(partes[2]) < 1 || Number(partes[2]) > 12) {
    return null;
  }
  return { ano: partes[1], mes: Number(partes[2]) - 1, dia: Number(partes[3]) };
}

/** `2026-09-29` → `29 de setembro de 2026`; texto fora do formato volta como veio. */
export function formatarDataPatchnote(data: string): string {
  const partes = partesDaData(data);
  return partes ? `${partes.dia} de ${MESES[partes.mes]} de ${partes.ano}` : data;
}

/** `2026-09-29` → `29 set 2026`, para a lista de versões. */
export function formatarDataPatchnoteCurta(data: string): string {
  const partes = partesDaData(data);
  return partes ? `${String(partes.dia).padStart(2, '0')} ${MESES[partes.mes].slice(0, 3)} ${partes.ano}` : data;
}
