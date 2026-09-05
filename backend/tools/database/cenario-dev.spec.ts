import { describe, expect, it } from 'vitest';
import {
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import { validarFichaCriatura } from '@contratados-rpg/shared/regras/criatura';
import { CENARIO_DEV, montarDadosFichaDev } from './cenario-dev';

describe('CENARIO_DEV', () => {
  it('mantém as cinco contas canônicas e preserva a senha do autor', () => {
    expect(CENARIO_DEV.usuarios.map(({ login }) => login)).toEqual([
      'senhor.contratados',
      'codex.dev',
      'jogador.stub.1',
      'jogador.stub.2',
      'espectador.stub',
    ]);
    expect(CENARIO_DEV.usuarios.find(({ login }) => login === 'senhor.contratados')).toMatchObject({
      nome: 'Matheus',
      alterarSenha: false,
    });
    expect(CENARIO_DEV.usuarios.filter(({ alterarSenha }) => alterarSenha)).toHaveLength(4);
  });

  it('define as campanhas simétricas com dois mestres, seis jogadores e dois espectadores', () => {
    expect(CENARIO_DEV.campanhas.map(({ nome }) => nome)).toEqual([
      'Campanha do Matheus',
      'Campanha do Codex',
    ]);
    expect(
      CENARIO_DEV.membros.filter(({ papel }) => papel === TipoCampanhaMembroPapelEnum.MESTRE),
    ).toEqual([
      { campanha: 'campanha-matheus', usuario: 'matheus', papel: 'MESTRE' },
      { campanha: 'campanha-codex', usuario: 'codex', papel: 'MESTRE' },
    ]);
    expect(
      CENARIO_DEV.membros.filter(({ papel }) => papel === TipoCampanhaMembroPapelEnum.JOGADOR),
    ).toHaveLength(6);
    expect(
      CENARIO_DEV.membros.filter(({ papel }) => papel === TipoCampanhaMembroPapelEnum.ESPECTADOR),
    ).toEqual([
      { campanha: 'campanha-matheus', usuario: 'espectador', papel: 'ESPECTADOR' },
      { campanha: 'campanha-codex', usuario: 'espectador', papel: 'ESPECTADOR' },
    ]);
  });

  it('faz todo dono de ficha ser membro da campanha correspondente', () => {
    for (const ficha of CENARIO_DEV.fichas) {
      expect(CENARIO_DEV.membros).toContainEqual(
        expect.objectContaining({ campanha: ficha.campanha, usuario: ficha.usuario }),
      );
    }
  });

  it('dá a cada usuário exatamente uma ficha em cada campanha', () => {
    expect(
      CENARIO_DEV.fichas.map(({ campanha, usuario }) => `${campanha}:${usuario}`).sort(),
    ).toEqual([
      'campanha-codex:codex',
      'campanha-codex:matheus',
      'campanha-codex:stub1',
      'campanha-codex:stub2',
      'campanha-matheus:codex',
      'campanha-matheus:matheus',
      'campanha-matheus:stub1',
      'campanha-matheus:stub2',
    ]);
  });

  it('cria somente fichas de jogador com cores hex distintas', () => {
    expect(CENARIO_DEV.fichas).toHaveLength(8);
    expect(new Set(CENARIO_DEV.fichas.map(({ cor }) => cor)).size).toBe(8);

    for (const ficha of CENARIO_DEV.fichas) {
      expect(ficha.tipo).toBe(TipoFichaEnum.JOGADOR);
      expect(ficha.cor).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('não repete chaves de negócio do cenário', () => {
    expect(new Set(CENARIO_DEV.usuarios.map(({ chave }) => chave)).size).toBe(5);
    expect(new Set(CENARIO_DEV.usuarios.map(({ login }) => login)).size).toBe(5);
    expect(new Set(CENARIO_DEV.campanhas.map(({ chave }) => chave)).size).toBe(2);
    expect(new Set(CENARIO_DEV.campanhas.map(({ codigoConvite }) => codigoConvite)).size).toBe(2);
    expect(
      new Set(CENARIO_DEV.campanhas.map(({ codigoConviteEspectador }) => codigoConviteEspectador))
        .size,
    ).toBe(2);
    expect(new Set(CENARIO_DEV.fichas.map(({ nome }) => nome)).size).toBe(8);
  });
});

describe('criaturas de teste', () => {
  it('dá a cada campanha ao menos uma criatura, todas pertencentes ao mestre daquela campanha', () => {
    expect(CENARIO_DEV.criaturas.length).toBeGreaterThanOrEqual(2);

    const mestrePorCampanha = new Map(
      CENARIO_DEV.membros
        .filter(({ papel }) => papel === TipoCampanhaMembroPapelEnum.MESTRE)
        .map(({ campanha, usuario }) => [campanha, usuario]),
    );
    for (const criatura of CENARIO_DEV.criaturas) {
      expect(criatura.usuario).toBe(mestrePorCampanha.get(criatura.campanha));
      expect(criatura.tipo).toBe(TipoFichaEnum.CRIATURA);
    }

    const campanhasComCriatura = new Set(CENARIO_DEV.criaturas.map(({ campanha }) => campanha));
    expect(campanhasComCriatura).toEqual(new Set(CENARIO_DEV.campanhas.map(({ chave }) => chave)));
  });

  it('não repete nome de criatura dentro da mesma campanha', () => {
    const chaves = CENARIO_DEV.criaturas.map(({ campanha, nome }) => `${campanha}:${nome}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it.each(CENARIO_DEV.criaturas.map((criatura) => [criatura.nome, criatura] as const))(
    'ficha de criatura "%s" não viola nenhuma regra de shared/regras/criatura',
    (_nome, criatura) => {
      expect(validarFichaCriatura(criatura.dados)).toEqual({ violacoes: [] });
    },
  );
});

describe('montarDadosFichaDev', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'monta a ficha %i com o contrato atual e recursos cheios',
    (indice) => {
    const ficha = CENARIO_DEV.fichas[indice];
    const dados = montarDadosFichaDev(ficha);

    expect(dados).toMatchObject({
      classe: ficha.classe,
      arquetipo: ficha.arquetipo,
      nivel: ficha.nivel,
      prestigio: ficha.prestigio,
      atributos: ficha.atributos,
      maestria: null,
      inventario: { itens: [], amplificadores: [] },
      rolagens: [],
      combos: [],
      anotacoes: '',
      historia: '',
      dinheiro: ficha.dinheiro,
    });
    expect(dados.estado.vidaAtual).toBe(dados.estado.vidaMaxima);
    expect(dados.estado.energiaAtual).toBe(dados.estado.energiaMaxima);
    expect(dados.habilidades.length).toBeGreaterThan(0);
    },
  );
});
