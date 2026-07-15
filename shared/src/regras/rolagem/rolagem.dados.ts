import type { FichaAtributosDto } from '../../dtos/ficha';

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

/** Teto defensivo de dados por termo (evita fórmulas absurdas como `9999d6`). */
export const QUANTIDADE_DADOS_MAXIMA = 100;
