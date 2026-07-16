/**
 * Onde o efeito de uma habilidade se aplica num preset encadeado (m3-20): no passo de **teste** ou
 * no passo de **dano**. Ausente → inferido do tipo (dano → `DANO`; bônus de teste → `TESTE`).
 */
export enum RolagemEfeitoAlvoEnum {
  TESTE = 'TESTE',
  DANO = 'DANO',
}
