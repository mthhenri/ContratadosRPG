import { EncontroStatusEnum } from '@contratados-rpg/shared/enums';

/**
 * Rótulos legíveis dos enums do Encontro (m7-05) — puro mapa de apresentação, sem regra de jogo
 * (mesmo papel de `rotulos-criatura.ts` para o guia de Ameaças). O nome de **domínio** é
 * "Encontro"; o rótulo de **tela** é "Iniciativa" — daí os textos abaixo falarem de combate, não
 * de encontro.
 */

const ROTULO_STATUS: Record<EncontroStatusEnum, string> = {
  [EncontroStatusEnum.MONTAGEM]: 'Montagem',
  [EncontroStatusEnum.ATIVO]: 'Em combate',
  [EncontroStatusEnum.ENCERRADO]: 'Encerrado',
};

export const rotuloStatusEncontro = (valor: EncontroStatusEnum): string => ROTULO_STATUS[valor];
