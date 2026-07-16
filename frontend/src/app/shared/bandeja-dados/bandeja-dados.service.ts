import { Injectable, signal } from '@angular/core';

import type { RolagemModoEnum } from '@contratados-rpg/shared/enums';
import type { ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

/** Quantas rolagens recentes a bandeja mantém lado a lado (ex.: teste → dano → crítico de um preset). */
const LIMITE_ENTRADAS = 5;

/** Quanto uma rolagem fica na bandeja antes de começar a sumir sozinha. */
const DURACAO_MS = 7000;

/** Duração do fade de saída (casa com a transição de opacidade no SCSS). */
const FADE_MS = 400;

/** Uma rolagem exibida na bandeja (m3-22): o rótulo do que foi rolado + o resultado do motor. */
export interface EntradaBandeja {
  readonly id: number;
  readonly rotulo: string;
  readonly resultado: ResultadoRolagemDto;
  readonly modo?: RolagemModoEnum;
  /** `true` na janela de fade antes de a entrada ser removida (auto-sumir). */
  readonly saindo: boolean;
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

  /** Mostra uma rolagem à direita da bandeja (as anteriores deslizam para a esquerda) e agenda o auto-sumir. */
  mostrar(entrada: { readonly rotulo: string; readonly resultado: ResultadoRolagemDto; readonly modo?: RolagemModoEnum }): void {
    this.contador += 1;
    const id = this.contador;
    const nova: EntradaBandeja = { id, saindo: false, ...entrada };
    this._entradas.update((atuais) => [nova, ...atuais].slice(0, LIMITE_ENTRADAS));
    this.agendar(id);
  }

  /** Pausa o auto-sumir (mouse sobre a carta) — a barra de tempo congela cheia via `:hover` no SCSS. */
  pausar(id: number): void {
    this.cancelarTimer(id);
  }

  /** Ao sair o mouse, reinicia o auto-sumir **do tempo cheio** (se a carta ainda existe e não está saindo). */
  retomar(id: number): void {
    if (this._entradas().some((entrada) => entrada.id === id && !entrada.saindo)) {
      this.agendar(id);
    }
  }

  /** Remove uma entrada específica (o × da carta ou o fim do auto-sumir). */
  fechar(id: number): void {
    this.cancelarTimer(id);
    this._entradas.update((atuais) => atuais.filter((entrada) => entrada.id !== id));
  }

  /** Esvazia a bandeja. */
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
        this.iniciarSaida(id);
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

  /** Marca a entrada como saindo (dispara o fade) e a remove após a transição. */
  private iniciarSaida(id: number): void {
    this._entradas.update((atuais) =>
      atuais.map((entrada) => (entrada.id === id ? { ...entrada, saindo: true } : entrada)),
    );
    setTimeout(() => this.fechar(id), FADE_MS);
  }
}
