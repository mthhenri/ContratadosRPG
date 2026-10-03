import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { podeUsarMontador } from './montador-acesso';

/** Gate único do montador (montador-exp-02, decisões 1 e 7): restrito a TESTER/ADMIN por padrão. */
describe('podeUsarMontador', () => {
  it('TESTER e ADMIN veem o montador', () => {
    expect(podeUsarMontador(TipoUsuarioEnum.TESTER)).toBe(true);
    expect(podeUsarMontador(TipoUsuarioEnum.ADMIN)).toBe(true);
  });

  it('jogador comum (NORMAL) e sessão ausente não veem', () => {
    expect(podeUsarMontador(TipoUsuarioEnum.NORMAL)).toBe(false);
    expect(podeUsarMontador(null)).toBe(false);
    expect(podeUsarMontador(undefined)).toBe(false);
  });
});
