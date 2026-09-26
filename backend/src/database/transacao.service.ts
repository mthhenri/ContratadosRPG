import { AsyncLocalStorage } from 'node:async_hooks';
import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import { KNEX_CONNECTION } from './database.provider';

/**
 * Transação corrente da cadeia assíncrona em execução — lida pelo `BaseRepository` para que todo
 * repositório chamado dentro de {@link TransacaoService.executar} use a mesma transação sem
 * receber o `trx` por parâmetro (o SQL continua no repositório dono da tabela).
 */
export const contextoTransacao = new AsyncLocalStorage<Knex.Transaction>();

/**
 * Unidade de trabalho em runtime (m7-22). A service envolve numa chamada as escritas que precisam
 * ser atômicas — trocar a cena ativa, criar a cena com o seu encontro — e qualquer repositório
 * chamado dentro do callback participa da mesma transação. Falha em qualquer passo desfaz tudo.
 *
 * Chamada aninhada reaproveita a transação já aberta. Emissão de tempo real fica **fora** do
 * callback (§9: emitir só depois de persistir — e persistido só é o que já foi confirmado).
 */
@Injectable()
export class TransacaoService {
  constructor(@Inject(KNEX_CONNECTION) private readonly conexao: Knex) {}

  async executar<TResultado>(operacao: () => Promise<TResultado>): Promise<TResultado> {
    if (contextoTransacao.getStore()) {
      return operacao();
    }
    return this.conexao.transaction((transacao) => contextoTransacao.run(transacao, operacao));
  }
}
