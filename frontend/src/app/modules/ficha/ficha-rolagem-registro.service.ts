import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, finalize } from 'rxjs';

import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { RolagemService } from './rolagem.service';
import type { RolagemRealizadaDto } from './rolagem-realizada';

/**
 * Visibilidade das próximas rolagens (`oculta`) + o registro em si (`registrar`) da ficha aberta na
 * página — extraídos de `FichaVisualizacao` na m2-21 (item 5).
 *
 * **Por que virou serviço:** no `modo="compacto"` (visão do jogador de `/painel/:id`) o painel de
 * Rolagens saiu do card e foi morar na **coluna lateral** da página (`CampanhaDetalhe`), enquanto o
 * teste de atributo e o dano continuam sendo rolados de **dentro** do card. Os dois lugares
 * precisam ler a mesma flag e postar pelo mesmo caminho — com o toggle preso ao componente, marcar
 * "Rolagem oculta" na lateral não afetaria a rolagem disparada no card (o defeito silencioso que
 * esta extração evita).
 *
 * **Não** é `providedIn: 'root'` — mesmo padrão de `FichaEdicaoService` (m2-20): cada página que
 * hospeda uma ficha o declara em `providers: []` e ganha a própria instância, presa a uma única
 * ficha (`inicializar`, chamado uma vez no `constructor`). `fichaId` é uma função porque
 * `CampanhaDetalhe` troca a ficha exibida (`fichaExibidaId`) sem recriar o componente.
 */
@Injectable()
export class FichaRolagemRegistroService {
  private readonly rolagemService = inject(RolagemService);

  private readonly registradaSubject = new Subject<RolagemResumoDto>();

  /**
   * Toda rolagem efetivamente persistida (m3-27) — a página faz o **prepend local** no histórico/
   * feed sem esperar o broadcast (que nunca chega para rolagens `PRIVADA`, §9). Substitui o antigo
   * output `rolagemRegistrada` de `FichaVisualizacao`: agora quem rola pela lateral e quem rola
   * pelo card chegam aqui pelo mesmo canal.
   */
  readonly registrada$: Observable<RolagemResumoDto> = this.registradaSubject.asObservable();

  private readonly enviandoSubject = new Subject<void>();
  private readonly finalizadaSubject = new Subject<void>();

  /**
   * Emitido no instante em que uma rolagem local começa a ser persistida (**antes** do REST
   * resolver, m3-77) — quem hospeda a página ainda não tem o `id` real da rolagem pra deduplicar
   * o eco do broadcast (`TempoRealService.rolagemRegistrada$`), então usa isto como sinal
   * "uma rolagem minha está em voo" enquanto {@link finalizada$} não chega. Sem isso, o eco podia
   * chegar pela sala **antes** da resposta HTTP e abrir a bandeja de novo (a mesma rolagem já
   * apareceu pelo caminho síncrono, pré-persistência).
   */
  readonly enviando$: Observable<void> = this.enviandoSubject.asObservable();

  /** Emitido quando o REST da rolagem em voo termina — sucesso ou erro (m3-77, par de `enviando$`). */
  readonly finalizada$: Observable<void> = this.finalizadaSubject.asObservable();

  /**
   * Visibilidade das próximas rolagens (m3-27): `true` = `PRIVADA` (só o autor e o mestre veem — o
   * mesmo toggle serve ao mestre pra rolar "só para si", já que aí autor = mestre). Default `false`
   * (`PUBLICA`) — estado local, não persistido (reflete a decisão do momento em que se rola, não um
   * ajuste da ficha). `inicializar` pode sobrescrever esse default (ver `ocultaPadrao`).
   */
  private readonly ocultaSignal = signal(false);
  readonly oculta = this.ocultaSignal.asReadonly();

  private obterFichaId: (() => number | null) | null = null;

  /**
   * Liga o serviço à ficha aberta na página — chamado uma vez, no `constructor`. `ocultaPadrao`
   * fixa o valor inicial da visibilidade (default `false`/pública, o mesmo de sempre); a ficha de
   * criatura passa `true` — as rolagens da Ameaça nascem `PRIVADA` (o mestre revela só quando
   * decide, ex.: "susto" de rolar publicamente), diferente da ficha de jogador.
   */
  inicializar(fichaId: () => number | null, ocultaPadrao = false): void {
    if (!this.obterFichaId) {
      this.ocultaSignal.set(ocultaPadrao);
    }
    this.obterFichaId ??= fichaId;
  }

  /** Alterna a visibilidade das próximas rolagens desta sessão de leitura. */
  alternarOculta(): void {
    this.ocultaSignal.update((oculta) => !oculta);
  }

  /**
   * Persiste uma rolagem executada na ficha aberta (m3-27) — fire-and-forget, otimista (o resultado
   * já está na bandeja antes desta chamada terminar). Um erro (403/rede) só perde o registro: a
   * rolagem já apareceu na bandeja e não trava a leitura; o toast global já avisa.
   */
  registrar(entrada: RolagemRealizadaDto): void {
    const fichaId = this.obterFichaId?.() ?? null;
    if (fichaId === null) {
      return;
    }
    this.enviandoSubject.next();
    this.rolagemService
      .registrar(fichaId, {
        rotulo: entrada.rotulo,
        visibilidade: this.ocultaSignal()
          ? RolagemVisibilidadeEnum.PRIVADA
          : RolagemVisibilidadeEnum.PUBLICA,
        resultado: entrada.resultado,
      })
      .pipe(finalize(() => this.finalizadaSubject.next()))
      .subscribe({
        next: (rolagemRegistrada) => this.registradaSubject.next(rolagemRegistrada),
        error: () => undefined,
      });
  }
}
