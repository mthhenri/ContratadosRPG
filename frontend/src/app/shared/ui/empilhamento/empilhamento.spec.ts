import { resolverEmpilhamentoModificacao } from './empilhamento';

describe('resolverEmpilhamentoModificacao', () => {
  const pesada = { empilhamentosIniciais: 3, empilhamentoMaximo: 5 };

  it('usa iniciais e teto do catálogo', () => {
    expect(resolverEmpilhamentoModificacao({ empilhamentos: 4 }, pesada))
      .toEqual({ iniciais: 3, atuais: 4, maximo: 5 });
  });

  it('mod custom: 1 inicial e teto gravado na própria mod', () => {
    expect(resolverEmpilhamentoModificacao({ empilhamentos: 2, empilhamentoMaximo: 4 }))
      .toEqual({ iniciais: 1, atuais: 2, maximo: 4 });
  });

  it('mod custom sem teto gravado usa os empilhamentos atuais', () => {
    expect(resolverEmpilhamentoModificacao({ empilhamentos: 2 }))
      .toEqual({ iniciais: 1, atuais: 2, maximo: 2 });
  });

  it('acima do teto próprio estende as caixas até os empilhamentos atuais', () => {
    expect(resolverEmpilhamentoModificacao({ empilhamentos: 7 }, pesada).maximo).toBe(7);
  });
});
