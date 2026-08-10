import type { FichaAtributosDto } from '../../dtos/ficha';
import { TipoDanoEnum } from '../../enums';

/**
 * Abreviação de 3 letras → chave do atributo na ficha. As fórmulas de rolagem (m3-15) referenciam
 * atributos por esta abreviação (ex.: `1d20+LUT`). Fonte: docs/core/sistema-v4.1.0.md — "Atributos"
 * (as abreviações usadas na notação de testes e dano). Conteúdo de jogo, sem tabela `tipo_*` (§10.3).
 */
export const ABREVIACOES_ATRIBUTO: Readonly<Record<string, keyof FichaAtributosDto>> = {
  DES: 'destreza',
  FOR: 'forca',
  LUT: 'luta',
  PON: 'pontaria',
  VIG: 'vigor',
  INT: 'intelecto',
  MED: 'medicina',
  SEN: 'sentidos',
  SOC: 'social',
  VON: 'vontade',
};

/**
 * Fontes escalares **extras** além dos 10 atributos (m3-22): a **Proficiência** (`PROF`) e o **Nível**
 * (`NIV`) do agente, usáveis nas fórmulas exatamente como um atributo (modificador, fonte de dados ou
 * escalada). Proficiência = Nível para não-Civis; Civil = 0 (`sistema-v4.1.0.md` — "Testes"). Conteúdo
 * de jogo, sem tabela `tipo_*` (§10.3).
 */
export const ABREVIACOES_FONTE_EXTRA: Readonly<Record<string, 'proficiencia' | 'nivel'>> = {
  PROF: 'proficiencia',
  PROFICIENCIA: 'proficiencia',
  NIV: 'nivel',
  NIVEL: 'nivel',
};

/** Teto defensivo de dados por termo (evita fórmulas absurdas como `9999d6`). */
export const QUANTIDADE_DADOS_MAXIMA = 100;

/** Teto defensivo de repetições `(<fórmula>)#N` (m3-46, evita fórmulas absurdas como `(1d6)#9999`). */
export const REPETICOES_MAXIMA = 20;

/** Remove acentos e caixa para casar tags de dano de forma tolerante (`fisico` = `Físico`). */
const normalizarTipoDano = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase();

/**
 * Sigla de 1 letra → `TipoDanoEnum`, pra tag `[Tipo]` de uma fórmula aceitar a forma curta
 * (`[F]` valendo o mesmo que `[Fisico]`/`[Físico]`) além do nome por extenso.
 */
const SIGLAS_TIPO_DANO: Readonly<Record<string, TipoDanoEnum>> = {
  F: TipoDanoEnum.FISICO,
  B: TipoDanoEnum.BALISTICO,
  E: TipoDanoEnum.EXPLOSAO,
  Q: TipoDanoEnum.QUIMICO,
  G: TipoDanoEnum.GERAL,
};

/** Nome normalizado (por extenso ou sigla) → `TipoDanoEnum` (m3-18). */
const MAPA_TIPO_DANO: Readonly<Record<string, TipoDanoEnum>> = {
  ...Object.fromEntries(Object.values(TipoDanoEnum).map((tipo) => [normalizarTipoDano(tipo), tipo])),
  ...SIGLAS_TIPO_DANO,
};

/** Resolve um nome de tipo de dano por extenso ou sigla de 1 letra (tolerante a caixa/acentos), ou `null` se desconhecido. */
export function resolverTipoDanoSimples(texto: string): TipoDanoEnum | null {
  return MAPA_TIPO_DANO[normalizarTipoDano(texto)] ?? null;
}

/** Chave do atributo → abreviação de 3 letras (ex.: `forca` → `FOR`), para rótulos de efeito (m3-20). */
export function abreviacaoAtributo(chave: keyof FichaAtributosDto): string {
  const par = Object.entries(ABREVIACOES_ATRIBUTO).find(([, valor]) => valor === chave);
  return par ? par[0] : chave.toUpperCase();
}
