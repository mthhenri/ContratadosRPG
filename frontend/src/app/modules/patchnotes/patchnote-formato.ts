/**
 * Apresentação de um patchnote (pn-04): separa o Markdown da nota em introdução, grupos e blocos e
 * formata a data. Funções puras — a renderização segura de cada trecho fica com
 * `renderizarMarkdownSeguro`, na página.
 *
 * Estrutura aceita (tudo opcional além do texto):
 *
 * ```
 * Texto de abertura da versão.
 *
 * # PARA OS PLAYERS            ← grupo (um público ou um assunto); `# RESUMO` também é um grupo
 * ## 🎬 Cenas                  ← bloco de funcionalidade, com texto e listas
 * ## Novidades                 ← ou um dos três blocos "de balanço" (com cor própria)
 * ```
 *
 * Nota só com `##` (sem `#`) vira um grupo único sem título — o formato original continua valendo.
 */

/**
 * Tom visual do bloco. `novidades`/`melhorias`/`correcoes` são os blocos de balanço, decididos pelo
 * título; qualquer outro título é uma funcionalidade (`neutro`), exibida como título de seção.
 */
export type PatchnoteBlocoTom = 'novidades' | 'melhorias' | 'correcoes' | 'neutro';

export interface PatchnoteBloco {
  readonly titulo: string;
  readonly tom: PatchnoteBlocoTom;
  readonly markdown: string;
}

export interface PatchnoteGrupo {
  /** Título do `# …`; `null` no grupo implícito de uma nota escrita só com `##`. */
  readonly titulo: string | null;
  /** Texto entre o `# …` e o primeiro `##` do grupo (num `# RESUMO`, é o conteúdo todo). */
  readonly introducao: string;
  readonly blocos: readonly PatchnoteBloco[];
}

export interface PatchnoteEstruturado {
  /** Texto antes do primeiro título — o resumo de abertura da versão. Vazio quando não há. */
  readonly introducao: string;
  readonly grupos: readonly PatchnoteGrupo[];
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

interface GrupoEmConstrucao {
  titulo: string | null;
  introducao: string[];
  blocos: { titulo: string; linhas: string[] }[];
}

/**
 * Divide a nota nos títulos `# …` (grupos) e `## …` (blocos). Título dentro de bloco de código
 * cercado não abre nada, e os de nível mais fundo (`###`) continuam sendo texto do bloco.
 */
export function estruturarPatchnote(markdown: string): PatchnoteEstruturado {
  const abertura: string[] = [];
  const grupos: GrupoEmConstrucao[] = [];
  let dentroDeCodigo = false;

  for (const linha of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(linha)) {
      dentroDeCodigo = !dentroDeCodigo;
    }
    const grupo = dentroDeCodigo ? null : linha.match(/^#\s+(.+?)\s*#*\s*$/);
    const bloco = dentroDeCodigo ? null : linha.match(/^##\s+(.+?)\s*#*\s*$/);

    if (grupo) {
      grupos.push({ titulo: grupo[1], introducao: [], blocos: [] });
    } else if (bloco) {
      if (grupos.length === 0) {
        grupos.push({ titulo: null, introducao: [], blocos: [] });
      }
      grupos[grupos.length - 1].blocos.push({ titulo: bloco[1], linhas: [] });
    } else if (grupos.length === 0) {
      abertura.push(linha);
    } else {
      const atual = grupos[grupos.length - 1];
      if (atual.blocos.length > 0) {
        atual.blocos[atual.blocos.length - 1].linhas.push(linha);
      } else {
        atual.introducao.push(linha);
      }
    }
  }

  return {
    introducao: abertura.join('\n').trim(),
    grupos: grupos.map((grupo) => ({
      titulo: grupo.titulo,
      introducao: grupo.introducao.join('\n').trim(),
      blocos: grupo.blocos.map(({ titulo, linhas }) => ({
        titulo,
        tom: TONS_POR_TITULO[normalizarTitulo(titulo)] ?? 'neutro',
        markdown: linhas.join('\n').trim(),
      })),
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
