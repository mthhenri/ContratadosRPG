import { Component, inject } from '@angular/core';

import { Icone, IconeNome } from '../../icone/icone.component';
import { Botao, BotaoVariante } from '../botao/botao.component';
import { BotaoIcone } from '../botao-icone/botao-icone.component';
import {
  NotificacaoEntrada,
  NotificacaoService,
  NotificacaoSeveridade,
} from './notificacao.service';

/**
 * Ícone por severidade (ui-20) — só os quatro que já existem no `app-icone`, sem glifo novo.
 * `check`/`alerta` casam de cara com sucesso/aviso; `olho` e `excluir` sobram para
 * informação/erro por eliminação (não há "i" nem "x" no catálogo).
 */
const ICONE_POR_SEVERIDADE: Record<NotificacaoSeveridade, IconeNome> = {
  sucesso: 'check',
  informacao: 'olho',
  aviso: 'alerta',
  erro: 'excluir',
};

/**
 * Variante de `app-botao` por severidade (ui-20), para a ação opcional sair na mesma cor da
 * régua/ícone/barra do toast — `positivo`/`info`/`aviso`/`perigo` já usam exatamente
 * `--positive`/`--energy`/`--warning`/`--erro` (`botao.component.scss`), os mesmos tokens do SCSS
 * deste componente.
 */
const VARIANTE_POR_SEVERIDADE: Record<NotificacaoSeveridade, BotaoVariante> = {
  sucesso: 'positivo',
  informacao: 'info',
  aviso: 'aviso',
  erro: 'perigo',
};

/**
 * Renderiza a fila de `NotificacaoService` (ui-02 · `P-034`) —
 * posição fixa `bottom-center`, mesmo padrão de apresentar-sem-decidir de `BandejaDados`. Um único
 * `<app-notificacoes>` vive no `layout` (fora de `rotaIsolada()`, como o toast antes).
 */
@Component({
  selector: 'app-notificacoes',
  imports: [Icone, Botao, BotaoIcone],
  templateUrl: './notificacao.component.html',
  styleUrl: './notificacao.component.scss',
})
export class Notificacoes {
  protected readonly servico = inject(NotificacaoService);

  protected icone(severidade: NotificacaoSeveridade): IconeNome {
    return ICONE_POR_SEVERIDADE[severidade];
  }

  protected variante(severidade: NotificacaoSeveridade): BotaoVariante {
    return VARIANTE_POR_SEVERIDADE[severidade];
  }

  /** Executa a ação da notificação (ui-20) antes de fechá-la — nunca o contrário. */
  protected executarAcao(entrada: NotificacaoEntrada): void {
    entrada.acao?.executar();
    this.servico.fechar(entrada.id);
  }
}
