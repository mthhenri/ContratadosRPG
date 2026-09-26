import { describe, expect, it, vi } from 'vitest';
import type { Knex } from 'knex';
import { BaseRepository } from '../core/base/base.repository';
import { TransacaoService } from './transacao.service';

/** Repositório mínimo só para exercitar a escolha de executor do `BaseRepository`. */
class RepositorioDeTeste extends BaseRepository {
  constructor(conexao: Knex) {
    super(conexao, 'tabela_de_teste');
  }

  consultar(): Promise<unknown[]> {
    return this.executarConsulta('SELECT 1');
  }
}

function criarExecutor(nome: string) {
  return { nome, raw: vi.fn().mockResolvedValue({ rows: [nome] }) };
}

describe('TransacaoService', () => {
  function montar() {
    const transacao = criarExecutor('transacao');
    const conexao = {
      ...criarExecutor('conexao'),
      transaction: vi.fn(async (operacao: (trx: unknown) => Promise<unknown>) => operacao(transacao)),
    };
    const repositorio = new RepositorioDeTeste(conexao as unknown as Knex);
    const servico = new TransacaoService(conexao as unknown as Knex);
    return { conexao, transacao, repositorio, servico };
  }

  it('repositório chamado dentro de executar usa a transação; fora dela, a conexão', async () => {
    const { conexao, transacao, repositorio, servico } = montar();

    const dentro = await servico.executar(() => repositorio.consultar());
    const fora = await repositorio.consultar();

    expect(dentro).toEqual(['transacao']);
    expect(fora).toEqual(['conexao']);
    expect(transacao.raw).toHaveBeenCalledTimes(1);
    expect(conexao.raw).toHaveBeenCalledTimes(1);
  });

  it('a transação acompanha a cadeia assíncrona inteira, inclusive depois de um await', async () => {
    const { transacao, repositorio, servico } = montar();

    await servico.executar(async () => {
      await repositorio.consultar();
      await new Promise((resolver) => setTimeout(resolver, 0));
      await repositorio.consultar();
    });

    expect(transacao.raw).toHaveBeenCalledTimes(2);
  });

  it('chamada aninhada reaproveita a transação aberta em vez de abrir outra', async () => {
    const { conexao, transacao, repositorio, servico } = montar();

    await servico.executar(() => servico.executar(() => repositorio.consultar()));

    expect(conexao.transaction).toHaveBeenCalledTimes(1);
    expect(transacao.raw).toHaveBeenCalledTimes(1);
  });

  it('erro dentro do callback propaga (o Knex desfaz a transação)', async () => {
    const { servico } = montar();

    await expect(servico.executar(() => Promise.reject(new Error('falhou')))).rejects.toThrow('falhou');
  });
});
