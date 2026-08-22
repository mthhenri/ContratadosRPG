import { Injectable, signal } from '@angular/core';

import type { ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';

/** Quantas rolagens recentes a bandeja mantém lado a lado (ex.: teste → dano → crítico de um preset). */
const LIMITE_ENTRADAS = 5;

/** Quanto uma rolagem fica na bandeja antes de começar a sumir sozinha. */
const DURACAO_MS = 7000;

/**
 * Duração da transição de saída — fade **e** colapso de largura/margem acontecem juntos (casa com
 * o SCSS, m3-55). Antes eram duas fases (fade parado, só depois some) e o "×" nem passava por elas
 * (removia na hora); a troca de fase no meio do trajeto é o que lia como um "bounce" — uma
 * transição só, de ponta a ponta, evita o salto.
 */
const DURACAO_SAIDA_MS = 280;

/** Uma rolagem exibida na bandeja (m3-22): o rótulo do que foi rolado + o resultado do motor. */
export interface EntradaBandeja {
  readonly id: number;
  readonly rotulo: string;
  /** Fórmula executada (texto), exibida como legenda mono (m3-30). Ausente quando quem rola não a informa. */
  readonly formula?: string;
  readonly resultado: ResultadoRolagemDto;
  /** Visibilidade efetiva no instante da execução/registro. */
  readonly visibilidade: RolagemVisibilidadeEnum;
  /** Cor de identidade visual da ficha autora (m3-61) — repassada ao `ResultadoRolagem` aninhado. */
  readonly corFicha?: string | null;
  /** `true` durante a transição de saída (fade + colapso) — a entrada só sai do array ao fim dela. */
  readonly saindo: boolean;
  /**
   * `true` numa prévia efêmera (hover no d20 de um pill já registrado, item 3 do detalhe da
   * campanha): sem timer de auto-sumir nem a barra de tempo que o anuncia — quem mostrou decide
   * quando fecha (`fechar`, no `mouseleave`), então a barra ficaria só marcando um prazo que nunca
   * dispara sozinho.
   */
  readonly semAutoSumir?: boolean;
}

/**
 * Estado da **bandeja de dados** flutuante (m3-22): um único ponto onde as rolagens (teste de
 * atributo na Visão Geral, passos de preset) aparecem. O componente `BandejaDados` renderiza; quem
 * rola (já com o motor `shared/regras/rolagem`) só chama `mostrar`. Preparado para ganhar "dados
 * físicos" (animação 3D) depois — a bandeja é o container natural.
 */
@Injectable({ providedIn: 'root' })
export class BandejaDadosService {
  private contador = 0;
  private readonly _entradas = signal<readonly EntradaBandeja[]>([]);
  /** Handles dos timers de auto-sumir por id (limpos/reiniciados no hover). */
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Quanto tempo (ms) cada rolagem fica antes de sumir — casa com a duração da barra no SCSS. */
  readonly duracaoMs = DURACAO_MS;

  /** Rolagens recentes, da mais nova para a mais antiga (teto {@link LIMITE_ENTRADAS}). */
  readonly entradas = this._entradas.asReadonly();

  /**
   * Mostra uma rolagem à direita da bandeja (as anteriores deslizam para a esquerda) e agenda o
   * auto-sumir. Repetição `(<fórmula>)#N` (m3-46): quando `resultado.subResultados` tem 2+ rolagens
   * independentes, elas continuam **uma única carta** (o componente `BandejaDados` itera
   * `subResultados` dentro da mesma carta) — o chamador não precisa saber disso. Devolve o `id` da
   * entrada — quem mostra uma prévia efêmera (ex.: hover no d20 de um pill de rolagem já registrada,
   * item 3 do detalhe da campanha) usa esse `id` pra fechar cedo com {@link fechar}, sem esperar os
   * {@link duracaoMs} do auto-sumir. `semAutoSumir` (mesmo cenário do hover no d20): não agenda
   * timer nenhum — quem mostrou é quem fecha, via {@link fechar} no `mouseleave`.
   */
  mostrar(entrada: {
    readonly rotulo: string;
    readonly formula?: string;
    readonly resultado: ResultadoRolagemDto;
    readonly visibilidade: RolagemVisibilidadeEnum;
    readonly corFicha?: string | null;
    readonly semAutoSumir?: boolean;
  }): number {
    this.contador += 1;
    const id = this.contador;
    const nova: EntradaBandeja = { id, saindo: false, ...entrada };
    this._entradas.update((atuais) => [nova, ...atuais].slice(0, LIMITE_ENTRADAS));
    if (!entrada.semAutoSumir) {
      this.agendar(id);
    }
    return id;
  }

  /** Pausa o auto-sumir (mouse sobre a carta) — a barra de tempo congela cheia via `:hover` no SCSS. */
  pausar(id: number): void {
    this.cancelarTimer(id);
  }

  /**
   * Ao sair o mouse, reinicia o auto-sumir **do tempo cheio** (se a carta ainda existe, não está
   * saindo e não é uma prévia `semAutoSumir` — essa nunca teve timer pra reiniciar).
   */
  retomar(id: number): void {
    if (
      this._entradas().some(
        (entrada) => entrada.id === id && !entrada.saindo && !entrada.semAutoSumir,
      )
    ) {
      this.agendar(id);
    }
  }

  /**
   * Inicia a saída suave de uma entrada (o × da carta ou o fim do auto-sumir) — marca `saindo`
   * (dispara a transição no SCSS) e só tira do array ao fim dela. Idempotente: chamar de novo numa
   * entrada que já está saindo não reinicia a transição.
   */
  fechar(id: number): void {
    this.cancelarTimer(id);
    const jaSaindo = this._entradas().some((entrada) => entrada.id === id && entrada.saindo);
    if (jaSaindo) {
      return;
    }
    this._entradas.update((atuais) =>
      atuais.map((entrada) => (entrada.id === id ? { ...entrada, saindo: true } : entrada)),
    );
    setTimeout(() => this.remover(id), DURACAO_SAIDA_MS);
  }

  /** Esvazia a bandeja (sem transição — some tudo de uma vez, ação distinta de fechar um item). */
  limpar(): void {
    this.timers.forEach((handle) => clearTimeout(handle));
    this.timers.clear();
    this._entradas.set([]);
  }

  /** (Re)agenda o auto-sumir da entrada a partir de agora (tempo cheio). */
  private agendar(id: number): void {
    this.cancelarTimer(id);
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        this.fechar(id);
      }, DURACAO_MS),
    );
  }

  private cancelarTimer(id: number): void {
    const handle = this.timers.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.timers.delete(id);
    }
  }

  /** Remove de fato a entrada do array — chamado só depois que a transição de saída já terminou. */
  private remover(id: number): void {
    this._entradas.update((atuais) => atuais.filter((entrada) => entrada.id !== id));
  }
}
