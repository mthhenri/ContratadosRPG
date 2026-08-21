import { TipoFichaEnum } from '@contratados-rpg/shared/enums';

/** Qual ficha a janela deve exibir — resolvido por quem dispara `FichaFlutuante.abrir()`. */
export interface FichaFlutuanteAlvo {
  readonly fichaId: number;
  /** Só `JOGADOR`/`CRIATURA` têm ficha hoje — NPC ainda não existe (m7). */
  readonly tipo: typeof TipoFichaEnum.JOGADOR | typeof TipoFichaEnum.CRIATURA;
  /** Dono da ficha — decide `ajustavel` (mestre sempre; jogador só a própria). */
  readonly usuarioIdDono: number;
}

export interface FichaFlutuanteViewport {
  readonly largura: number;
  readonly altura: number;
}

export interface FichaFlutuanteGeometria {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

export const GEOMETRIA_INICIAL_FICHA_FLUTUANTE: FichaFlutuanteGeometria = {
  x: 64,
  y: 52,
  largura: 520,
  altura: 620,
};

/** Mestre precisa de área ampla para consultar a ficha durante a condução do encontro. */
export const GEOMETRIA_INICIAL_FICHA_FLUTUANTE_MESTRE: FichaFlutuanteGeometria = {
  x: 64,
  y: 52,
  largura: 1100,
  altura: 600,
};

const LARGURA_MINIMA = 380;
const ALTURA_MINIMA = 420;

/**
 * Trava a janela dentro da viewport — mesma receita de
 * `frontend/src/app/shared/leitor-documentos/leitor-documentos.util.ts`, com o mínimo ajustado ao
 * conteúdo de uma ficha (mais estreito que os 640×480 do leitor de PDF).
 */
export function limitarGeometriaFichaFlutuante(
  geometria: FichaFlutuanteGeometria,
  viewport: FichaFlutuanteViewport,
): FichaFlutuanteGeometria {
  const larguraViewport = limitarMinimo(viewport.largura, 0);
  const alturaViewport = limitarMinimo(viewport.altura, 0);
  const largura =
    Math.min(LARGURA_MINIMA, larguraViewport) === larguraViewport
      ? larguraViewport
      : limitarIntervalo(geometria.largura, LARGURA_MINIMA, larguraViewport);
  const altura =
    Math.min(ALTURA_MINIMA, alturaViewport) === alturaViewport
      ? alturaViewport
      : limitarIntervalo(geometria.altura, ALTURA_MINIMA, alturaViewport);

  return {
    x: limitarIntervalo(geometria.x, 0, Math.max(0, larguraViewport - largura)),
    y: limitarIntervalo(geometria.y, 0, Math.max(0, alturaViewport - altura)),
    largura,
    altura,
  };
}

function limitarMinimo(valor: number, minimo: number): number {
  return Number.isFinite(valor) ? Math.max(minimo, valor) : minimo;
}

function limitarIntervalo(valor: number, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor)) return minimo;
  return Math.min(Math.max(valor, minimo), maximo);
}
