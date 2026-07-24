import { describe, expect, it } from 'vitest';
import type { FichaDerivadosDto, FichaFormacaoDto } from '../../dtos/ficha';
import { FormacaoBonusEnum, TipoDanoEnum } from '../../enums';
import { FORMACOES } from './formacoes.dados';
import {
  ALVOS_APLICAVEIS,
  aplicarFormacaoAosDerivados,
  listarEfeitosPendentes,
  obterBonusRolagemAtributoFormacao,
  obterResistenciaFormacao,
  obterToleranciaSobrecargaFormacao,
  removerFormacaoDosDerivados,
} from './formacoes';

/**
 * `aplicarFormacaoAosDerivados` conferida contra `docs/core/sistema-v4.1.0.md` — "⬦ Formação": as 5
 * linhas com campo em `FichaDerivadosDto` aplicam o delta; as outras 16 são ignoradas sem quebrar.
 */
const BASE: FichaDerivadosDto = {
  defesa: 14,
  esquiva: 12,
  bloqueio: 16,
  deslocamento: 9,
  proficiencia: 2,
  danoCorpoACorpo: '1D3 [Físico]',
  danoFurtivo: '1D6+1',
  percepcao: 15,
  inventarioMaximo: 20,
  habilidadesPorTurno: 2,
};

function formacao(bonus: FormacaoBonusEnum, parametro: string | null = null): FichaFormacaoDto {
  return { bonus, parametro, texto: FORMACOES[bonus].rotulo };
}

describe('FORMACOES', () => {
  it('tem exatamente 21 entradas, distribuídas por grupo conforme o documento', () => {
    const entradas = Object.values(FORMACOES);
    expect(entradas).toHaveLength(21);
    const porGrupo = entradas.reduce<Record<string, number>>((contagem, entrada) => {
      contagem[entrada.grupo] = (contagem[entrada.grupo] ?? 0) + 1;
      return contagem;
    }, {});
    expect(porGrupo).toEqual({ Combate: 5, Movimento: 2, Perícia: 4, Equipamento: 7, Logística: 3 });
  });

  it('só as linhas que exigem escolha do jogador declaram parametro (6 no total)', () => {
    const comParametro = Object.values(FORMACOES).filter((entrada) => entrada.parametro !== null);
    expect(comParametro).toHaveLength(6);
  });

  it('confere o efeito de cada uma das 16 linhas pendentes contra o documento (cobertura contra typo)', () => {
    expect(FORMACOES[FormacaoBonusEnum.COMBATE_DADO_CATEGORIA_ARMA].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'DADO',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO].efeito).toEqual({
      alvo: 'RESISTENCIA',
      valor: 3,
    });
    expect(FORMACOES[FormacaoBonusEnum.MOVIMENTO_DADO_CORRIDA].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'DADO',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'DADO',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.PERICIA_BONUS_ATRIBUTO].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'BONUS',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO_CONDICAO].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'DADO',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.PERICIA_DADO_INICIATIVA].efeito).toEqual({ alvo: 'INICIATIVA', valor: 1 });
    expect(FORMACOES[FormacaoBonusEnum.EQUIPAMENTO_DADO_ITENS_MEDICINAIS].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'DADO',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.EQUIPAMENTO_BONUS_ITENS_MEDICINAIS].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'BONUS',
      valor: 2,
    });
    expect(FORMACOES[FormacaoBonusEnum.EQUIPAMENTO_DADO_EFEITO_ITENS_MEDICINAIS].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'DADO',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.EQUIPAMENTO_DADO_ITENS_OPERACIONAIS].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'DADO',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.EQUIPAMENTO_BONUS_ITENS_OPERACIONAIS].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'BONUS',
      valor: 2,
    });
    expect(FORMACOES[FormacaoBonusEnum.EQUIPAMENTO_DADO_EFEITO_ITENS_OPERACIONAIS].efeito).toEqual({
      alvo: 'ROLAGEM',
      modificador: 'DADO',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.EQUIPAMENTO_TURNO_EXTRA_STATUS].efeito).toEqual({
      alvo: 'DURACAO_EFEITO',
      valor: 1,
    });
    expect(FORMACOES[FormacaoBonusEnum.LOGISTICA_SOBRECARGA].efeito).toEqual({ alvo: 'SOBRECARGA', valor: 3 });
    expect(FORMACOES[FormacaoBonusEnum.LOGISTICA_DT_REPARO].efeito).toEqual({ alvo: 'DT_REPARO', valor: -2 });
  });
});

describe('aplicarFormacaoAosDerivados', () => {
  it('aplica +1m de Deslocamento (DERIVADO)', () => {
    const resultado = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO)]);
    expect(resultado.deslocamento).toBe(10);
  });

  it('aplica +1 na base de Inventário (DERIVADO)', () => {
    const resultado = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.LOGISTICA_INVENTARIO_MAXIMO)]);
    expect(resultado.inventarioMaximo).toBe(21);
  });

  it('aplica +1 de Esquiva ou Bloqueio conforme o parâmetro escolhido (DERIVADO_ESCOLHA)', () => {
    const comEsquiva = aplicarFormacaoAosDerivados(BASE, [
      formacao(FormacaoBonusEnum.COMBATE_ESQUIVA_OU_BLOQUEIO, 'Esquiva'),
    ]);
    expect(comEsquiva.esquiva).toBe(13);
    expect(comEsquiva.bloqueio).toBe(16);

    const comBloqueio = aplicarFormacaoAosDerivados(BASE, [
      formacao(FormacaoBonusEnum.COMBATE_ESQUIVA_OU_BLOQUEIO, 'Bloqueio'),
    ]);
    expect(comBloqueio.esquiva).toBe(12);
    expect(comBloqueio.bloqueio).toBe(17);
  });

  it('aplica +1 no dano de Corpo reusando somarDanoFixo (DANO_CORPO)', () => {
    const resultado = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.COMBATE_DANO_CORPO)]);
    expect(resultado.danoCorpoACorpo).toBe('1D3+1 [Físico]');
  });

  it('aplica +1 dado de dano Furtivo sem alterar o fixo — só dado, não "+1D6+1" (DANO_FURTIVO_DADO)', () => {
    const resultado = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.COMBATE_DANO_FURTIVO_DADO)]);
    expect(resultado.danoFurtivo).toBe('2D6+1');
  });

  it('não fabrica esquiva/bloqueio quando a stat está ausente (Civil — DERIVADO_ESCOLHA)', () => {
    const semDefesa: FichaDerivadosDto = { ...BASE, esquiva: undefined, bloqueio: undefined };
    const resultado = aplicarFormacaoAosDerivados(semDefesa, [
      formacao(FormacaoBonusEnum.COMBATE_ESQUIVA_OU_BLOQUEIO, 'Esquiva'),
    ]);
    expect(resultado.esquiva).toBeUndefined();
    expect(resultado.bloqueio).toBeUndefined();
  });

  it('ignora um código de bônus sem entrada em FORMACOES sem quebrar (ficha legada/enum removido)', () => {
    const invalido = { bonus: 'BONUS_INEXISTENTE', parametro: null, texto: '...' } as unknown as FichaFormacaoDto;
    expect(aplicarFormacaoAosDerivados(BASE, [invalido])).toEqual(BASE);
  });

  it('ignora as linhas pendentes sem quebrar (nem no bloco derivados)', () => {
    const pendentes = listarEfeitosPendentes(FORMACOES);
    const resultado = aplicarFormacaoAosDerivados(BASE, pendentes.map((definicao) => formacao(definicao.codigo)));
    expect(resultado).toEqual(BASE);
  });

  it('também ignora as linhas com consumidor fora do bloco derivados (RESISTENCIA/SOBRECARGA/ROLAGEM por atributo)', () => {
    const foraDerivados = [
      formacao(FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO, 'Físico'),
      formacao(FormacaoBonusEnum.LOGISTICA_SOBRECARGA),
      formacao(FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO, 'Vigor'),
      formacao(FormacaoBonusEnum.PERICIA_BONUS_ATRIBUTO, 'Vigor'),
    ];
    expect(aplicarFormacaoAosDerivados(BASE, foraDerivados)).toEqual(BASE);
  });

  it('ignora bonus:null (custom autorizado pelo Mestre) sem quebrar', () => {
    const custom: FichaFormacaoDto = { bonus: null, parametro: null, texto: '+1 dado em testes de Escalada' };
    expect(aplicarFormacaoAosDerivados(BASE, [custom])).toEqual(BASE);
  });

  it('delta único: aplicar a partir da mesma base não empilha entre Origens diferentes', () => {
    const comA = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO)]);
    const comB = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.LOGISTICA_INVENTARIO_MAXIMO)]);
    expect(comA.deslocamento).toBe(10);
    expect(comA.inventarioMaximo).toBe(20);
    expect(comB.deslocamento).toBe(9);
    expect(comB.inventarioMaximo).toBe(21);
  });
});

describe('removerFormacaoDosDerivados', () => {
  it('desfaz +1m de Deslocamento (DERIVADO)', () => {
    const aplicado = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO)]);
    expect(removerFormacaoDosDerivados(aplicado, [formacao(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO)])).toEqual(
      BASE,
    );
  });

  it('desfaz +1 de Esquiva ou Bloqueio (DERIVADO_ESCOLHA)', () => {
    const aplicado = aplicarFormacaoAosDerivados(BASE, [
      formacao(FormacaoBonusEnum.COMBATE_ESQUIVA_OU_BLOQUEIO, 'Esquiva'),
    ]);
    expect(
      removerFormacaoDosDerivados(aplicado, [formacao(FormacaoBonusEnum.COMBATE_ESQUIVA_OU_BLOQUEIO, 'Esquiva')]),
    ).toEqual(BASE);
  });

  it('desfaz +1 no dano de Corpo (DANO_CORPO)', () => {
    const aplicado = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.COMBATE_DANO_CORPO)]);
    expect(removerFormacaoDosDerivados(aplicado, [formacao(FormacaoBonusEnum.COMBATE_DANO_CORPO)])).toEqual(BASE);
  });

  it('desfaz +1 dado de dano Furtivo (DANO_FURTIVO_DADO)', () => {
    const aplicado = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.COMBATE_DANO_FURTIVO_DADO)]);
    expect(removerFormacaoDosDerivados(aplicado, [formacao(FormacaoBonusEnum.COMBATE_DANO_FURTIVO_DADO)])).toEqual(
      BASE,
    );
  });

  it('troca de Origem: remove a Formação antiga e aplica a nova a partir da mesma base', () => {
    const comAntiga = aplicarFormacaoAosDerivados(BASE, [formacao(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO)]);
    const semAntiga = removerFormacaoDosDerivados(comAntiga, [formacao(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO)]);
    const comNova = aplicarFormacaoAosDerivados(semAntiga, [
      formacao(FormacaoBonusEnum.LOGISTICA_INVENTARIO_MAXIMO),
    ]);
    expect(comNova.deslocamento).toBe(9);
    expect(comNova.inventarioMaximo).toBe(21);
  });

  it('ignora bonus:null e código inexistente sem quebrar (mesmo guard de aplicarFormacaoAosDerivados)', () => {
    const custom: FichaFormacaoDto = { bonus: null, parametro: null, texto: 'x' };
    expect(removerFormacaoDosDerivados(BASE, [custom])).toEqual(BASE);
  });
});

describe('listarEfeitosPendentes', () => {
  it('devolve exatamente as 12 linhas ainda sem consumidor (m3-41 deu consumidor a 4 das 16)', () => {
    const pendentes = listarEfeitosPendentes(FORMACOES);
    expect(pendentes).toHaveLength(12);
    expect(pendentes.every((definicao) => !ALVOS_APLICAVEIS.has(definicao.efeito.alvo))).toBe(true);
    const codigosCobertos = [
      FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO,
      FormacaoBonusEnum.LOGISTICA_SOBRECARGA,
      FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO,
      FormacaoBonusEnum.PERICIA_BONUS_ATRIBUTO,
    ];
    expect(pendentes.some((definicao) => codigosCobertos.includes(definicao.codigo))).toBe(false);
  });
});

describe('obterResistenciaFormacao (m3-41)', () => {
  it('soma +3 no tipo de dano escolhido (parametro tolerante a acento/caixa)', () => {
    const resultado = obterResistenciaFormacao([
      formacao(FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO, 'balistico'),
    ]);
    expect(resultado).toEqual({ [TipoDanoEnum.BALISTICO]: 3 });
  });

  it('soma as duas linhas de Formação quando ambas miram o mesmo tipo', () => {
    const resultado = obterResistenciaFormacao([
      formacao(FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO, 'Físico'),
      formacao(FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO, 'Físico'),
    ]);
    expect(resultado).toEqual({ [TipoDanoEnum.FISICO]: 6 });
  });

  it('ignora tipo de dano não reconhecível e linhas de outro bônus sem quebrar', () => {
    expect(obterResistenciaFormacao([formacao(FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO, 'Fogo')])).toEqual({});
    expect(obterResistenciaFormacao([formacao(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO)])).toEqual({});
  });
});

describe('obterToleranciaSobrecargaFormacao (m3-41)', () => {
  it('soma +3 por linha de LOGISTICA_SOBRECARGA', () => {
    expect(obterToleranciaSobrecargaFormacao([formacao(FormacaoBonusEnum.LOGISTICA_SOBRECARGA)])).toBe(3);
  });

  it('devolve 0 sem a linha, sem quebrar com outros bônus', () => {
    expect(obterToleranciaSobrecargaFormacao([formacao(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO)])).toBe(0);
    expect(obterToleranciaSobrecargaFormacao([])).toBe(0);
  });
});

describe('obterBonusRolagemAtributoFormacao (m3-41)', () => {
  it('devolve +1 dado quando a linha é PERICIA_DADO_ATRIBUTO do atributo pedido', () => {
    const resultado = obterBonusRolagemAtributoFormacao(
      [formacao(FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO, 'Vigor')],
      'vigor',
    );
    expect(resultado).toEqual({ dados: 1, bonus: 0 });
  });

  it('devolve +1 no resultado quando a linha é PERICIA_BONUS_ATRIBUTO do atributo pedido (abreviação "VIG")', () => {
    const resultado = obterBonusRolagemAtributoFormacao(
      [formacao(FormacaoBonusEnum.PERICIA_BONUS_ATRIBUTO, 'VIG')],
      'vigor',
    );
    expect(resultado).toEqual({ dados: 0, bonus: 1 });
  });

  it('ignora a linha quando o atributo pedido é outro', () => {
    const resultado = obterBonusRolagemAtributoFormacao(
      [formacao(FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO, 'Vigor')],
      'destreza',
    );
    expect(resultado).toEqual({ dados: 0, bonus: 0 });
  });

  it('ignora a linha com condição (PERICIA_DADO_ATRIBUTO_CONDICAO) — não modela em que situação o teste ocorre', () => {
    const resultado = obterBonusRolagemAtributoFormacao(
      [formacao(FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO_CONDICAO, 'Destreza para Furtividade')],
      'destreza',
    );
    expect(resultado).toEqual({ dados: 0, bonus: 0 });
  });
});
