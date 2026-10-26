import { montarFormula, tokenizarFormula } from '@contratados-rpg/shared/regras/rolagem';
import { alterarValorPeca } from './montador-apresentacao';

describe('Edição do valor de uma peça', () => {
  it.each(['FOR*2 [F]', 'FOR/2 [B]', '3'])('mantém %s representável ao digitar decimal', (formula) => {
    const peca = tokenizarFormula(formula)!.pecas[0];
    const alterada = alterarValorPeca(peca, 1.5);
    const texto = montarFormula({ pecas: [alterada] });
    expect(tokenizarFormula(texto)).not.toBeNull();
    expect(texto).not.toContain('1.5');
  });
});
