import type { FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import type { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { describe, expect, it } from 'vitest';
import type {
  DefinicaoCampanhaDev,
  DefinicaoFichaDev,
  DefinicaoUsuarioDev,
} from './cenario-dev';
import {
  executarSeedDevComPersistencia,
  type OperacoesSeedDev,
  type PersistenciaSeedDev,
} from './seed-dev';

interface EstadoEmMemoria {
  usuarios: Map<string, { id: number; nome: string; senha: string }>;
  campanhas: Map<string, { id: number; nome: string }>;
  membros: Map<string, TipoCampanhaMembroPapelEnum>;
  fichas: Map<string, { cor: string; dados: FichaJogadorDadosDto }>;
}

function copiarEstado(estado: EstadoEmMemoria): EstadoEmMemoria {
  return {
    usuarios: new Map(estado.usuarios),
    campanhas: new Map(estado.campanhas),
    membros: new Map(estado.membros),
    fichas: new Map(estado.fichas),
  };
}

class PersistenciaEmMemoria implements PersistenciaSeedDev, OperacoesSeedDev {
  readonly estado: EstadoEmMemoria = {
    usuarios: new Map([
      ['senhor.contratados', { id: 1, nome: 'Matheus', senha: 'hash-pessoal-original' }],
    ]),
    campanhas: new Map(),
    membros: new Map(),
    fichas: new Map(),
  };
  falharNaFicha: number | null = null;
  private proximoId = 2;
  private fichasProcessadas = 0;

  async executarEmTransacao<T>(operacao: (transacao: OperacoesSeedDev) => Promise<T>): Promise<T> {
    const anterior = copiarEstado(this.estado);
    try {
      return await operacao(this);
    } catch (erro) {
      this.estado.usuarios = anterior.usuarios;
      this.estado.campanhas = anterior.campanhas;
      this.estado.membros = anterior.membros;
      this.estado.fichas = anterior.fichas;
      throw erro;
    }
  }

  garantirUsuario(usuario: DefinicaoUsuarioDev, senhaHash: string | null): Promise<number> {
    const existente = this.estado.usuarios.get(usuario.login);
    if (existente) {
      this.estado.usuarios.set(usuario.login, {
        ...existente,
        nome: usuario.nome,
        senha: senhaHash ?? existente.senha,
      });
      return Promise.resolve(existente.id);
    }
    const id = this.proximoId++;
    this.estado.usuarios.set(usuario.login, { id, nome: usuario.nome, senha: senhaHash ?? '' });
    return Promise.resolve(id);
  }

  garantirCampanha(campanha: DefinicaoCampanhaDev): Promise<number> {
    const existente = this.estado.campanhas.get(campanha.codigoConvite);
    if (existente) return Promise.resolve(existente.id);
    const id = this.proximoId++;
    this.estado.campanhas.set(campanha.codigoConvite, { id, nome: campanha.nome });
    return Promise.resolve(id);
  }

  garantirMembro(
    campanhaId: number,
    usuarioId: number,
    papel: TipoCampanhaMembroPapelEnum,
  ): Promise<void> {
    this.estado.membros.set(`${campanhaId}:${usuarioId}`, papel);
    return Promise.resolve();
  }

  garantirFicha(
    campanhaId: number,
    usuarioId: number,
    ficha: DefinicaoFichaDev,
    dados: FichaJogadorDadosDto,
  ): Promise<void> {
    this.fichasProcessadas += 1;
    if (this.falharNaFicha === this.fichasProcessadas) throw new Error('falha simulada na ficha');
    this.estado.fichas.set(`${campanhaId}:${usuarioId}:${ficha.nome}`, { cor: ficha.cor, dados });
    return Promise.resolve();
  }
}

describe('executarSeedDevComPersistencia', () => {
  it('preserva a senha do autor e aplica o hash às três contas dev', async () => {
    const persistencia = new PersistenciaEmMemoria();

    await executarSeedDevComPersistencia(persistencia, 'hash-dev');

    expect(persistencia.estado.usuarios.get('senhor.contratados')?.senha).toBe(
      'hash-pessoal-original',
    );
    expect(
      ['codex.dev', 'jogador.stub.1', 'jogador.stub.2'].map(
        (login) => persistencia.estado.usuarios.get(login)?.senha,
      ),
    ).toEqual(['hash-dev', 'hash-dev', 'hash-dev']);
  });

  it('reconcilia o cenário duas vezes sem duplicar relações', async () => {
    const persistencia = new PersistenciaEmMemoria();

    await executarSeedDevComPersistencia(persistencia, 'hash-dev');
    const resumo = await executarSeedDevComPersistencia(persistencia, 'hash-dev');

    expect(resumo).toEqual({ usuarios: 4, campanhas: 2, membros: 8, fichas: 8 });
    expect(persistencia.estado.usuarios.size).toBe(4);
    expect(persistencia.estado.campanhas.size).toBe(2);
    expect(persistencia.estado.membros.size).toBe(8);
    expect(persistencia.estado.fichas.size).toBe(8);
  });

  it('reverte toda a transação quando uma ficha falha', async () => {
    const persistencia = new PersistenciaEmMemoria();
    persistencia.falharNaFicha = 3;

    await expect(executarSeedDevComPersistencia(persistencia, 'hash-dev')).rejects.toThrow(
      'falha simulada na ficha',
    );
    expect(persistencia.estado.usuarios.size).toBe(1);
    expect(persistencia.estado.campanhas.size).toBe(0);
    expect(persistencia.estado.membros.size).toBe(0);
    expect(persistencia.estado.fichas.size).toBe(0);
  });
});
