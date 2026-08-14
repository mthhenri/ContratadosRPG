import { describe, expect, it } from 'vitest';
import { CustoAcaoEnum } from '../../enums';
import { obterDanoReferenciaPorVd, obterDanoReferenciaTurnoPorVd } from './ataques';

describe('obterDanoReferenciaPorVd', () => {
  it('"A Estátua" (VD 30): Movimento e Padrão batem com "Pancada" e "Esmagamento" do exemplo', () => {
    expect(obterDanoReferenciaPorVd({ vd: 30, custoAcao: CustoAcaoEnum.MOVIMENTO })).toBe('3D12+4');
    expect(obterDanoReferenciaPorVd({ vd: 30, custoAcao: CustoAcaoEnum.PADRAO })).toBe('4D12+10');
    expect(obterDanoReferenciaPorVd({ vd: 30, custoAcao: CustoAcaoEnum.COMPLETA })).toBe('6D12+16');
  });

  it('faixa até 20', () => {
    expect(obterDanoReferenciaPorVd({ vd: 20, custoAcao: CustoAcaoEnum.MOVIMENTO })).toBe('2D10');
  });

  it('faixa 100+', () => {
    expect(obterDanoReferenciaPorVd({ vd: 150, custoAcao: CustoAcaoEnum.COMPLETA })).toBe('10D20+90');
  });
});

describe('obterDanoReferenciaTurnoPorVd', () => {
  it('coluna Turno, VD 30', () => {
    expect(obterDanoReferenciaTurnoPorVd({ vd: 30 })).toBe('4D20+34');
  });
});
