/** Um pedaço do trecho da busca — `destaque` quando estava entre os marcadores do PostgreSQL. */
export interface SegmentoTrecho {
  readonly texto: string;
  readonly destaque: boolean;
}

const ABRE_DESTAQUE = '⟦';
const FECHA_DESTAQUE = '⟧';

/**
 * Parte o `trecho` da busca (m9-03: `ts_headline` com `StartSel=⟦, StopSel=⟧`) em segmentos de
 * texto puro, marcando os que estavam entre `⟦ ⟧`. A tela desenha cada segmento como texto
 * (`{{ }}`), o destacado dentro de `<mark>` — **nunca `innerHTML`**: o trecho vem do conteúdo de
 * um documento e poderia trazer HTML.
 *
 * Marcadores desbalanceados (trecho cortado no meio de um destaque) não quebram nada: um `⟦` sem
 * fecho destaca até o fim, e um `⟧` solto é descartado. Segmentos vazios não saem.
 */
export function segmentarTrecho(trecho: string): readonly SegmentoTrecho[] {
  const segmentos: SegmentoTrecho[] = [];
  let destaque = false;
  let atual = '';
  const fechar = (): void => {
    if (atual) {
      segmentos.push({ texto: atual, destaque });
    }
    atual = '';
  };
  for (const caractere of trecho) {
    if (caractere === ABRE_DESTAQUE && !destaque) {
      fechar();
      destaque = true;
    } else if (caractere === FECHA_DESTAQUE) {
      if (destaque) {
        fechar();
        destaque = false;
      }
    } else if (caractere !== ABRE_DESTAQUE) {
      atual += caractere;
    }
  }
  fechar();
  return segmentos;
}
