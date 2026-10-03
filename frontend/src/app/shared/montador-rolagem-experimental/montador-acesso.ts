import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

/**
 * **Gate único do montador de rolagem** (`montador-rolagem-experimento`, decisões 1 e 7): enquanto não houver um
 * montador final, o montador — qualquer versão — e o seletor de versão são exclusivos de `TESTER`/`ADMIN`. O
 * padrão é restrito: um consumidor novo não precisa lembrar de nada. Liberar para todos é trocar este corpo por
 * `return true` (spec de fechamento do autor).
 */
export function podeUsarMontador(tipo: TipoUsuarioEnum | null | undefined): boolean {
  return tipo === TipoUsuarioEnum.TESTER || tipo === TipoUsuarioEnum.ADMIN;
}
