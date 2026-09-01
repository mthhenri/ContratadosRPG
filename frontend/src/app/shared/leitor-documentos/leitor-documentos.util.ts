import { type LeitorTamanho, type LeitorViewport } from './leitor-documentos.model';

export const LARGURA_MINIMA_LEITOR = 640;
export const ALTURA_MINIMA_LEITOR = 480;

export function limitarTamanho(tamanho: LeitorTamanho, viewport: LeitorViewport): LeitorTamanho {
  const larguraViewport = limitarMinimo(viewport.largura, 0);
  const alturaViewport = limitarMinimo(viewport.altura, 0);
  const largura =
    Math.min(LARGURA_MINIMA_LEITOR, larguraViewport) === larguraViewport
      ? larguraViewport
      : limitarIntervalo(tamanho.largura, LARGURA_MINIMA_LEITOR, larguraViewport);
  const altura =
    Math.min(ALTURA_MINIMA_LEITOR, alturaViewport) === alturaViewport
      ? alturaViewport
      : limitarIntervalo(tamanho.altura, ALTURA_MINIMA_LEITOR, alturaViewport);

  return { largura, altura };
}

function limitarMinimo(valor: number, minimo: number): number {
  return Number.isFinite(valor) ? Math.max(minimo, valor) : minimo;
}

function limitarIntervalo(valor: number, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor)) return minimo;
  return Math.min(Math.max(valor, minimo), maximo);
}
