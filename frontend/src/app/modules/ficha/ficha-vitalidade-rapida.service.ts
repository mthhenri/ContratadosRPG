import { Injectable, inject } from '@angular/core';
import { EMPTY, Subject, catchError, finalize } from 'rxjs';

import type { FichaAlteradaDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaService } from './ficha.service';
import type { CampoVitalidadeAtual } from './ajuste-vitalidade';

/** Atraso do lote antes de persistir — mesmo valor do debounce de `FichaVisualizar`. */
const ATRASO_PERSISTENCIA_MS = 500;

/**
 * Ajuste rápido de Vida/Energia **fora** da tela da ficha (m2-16g) — usado pelos mini-cards do
 * detalhe da campanha, onde só o recorte `FichaResumoDto` está carregado. Cada rajada envia
 * somente os valores pendentes para a operação dedicada de vitalidade: não busca nem regrava a
 * ficha completa. Quem chama é responsável pelo otimismo na tela (o valor exibido); este serviço
 * só garante que ele acaba persistido, com um passo de rede por vez por ficha.
 */
@Injectable({ providedIn: 'root' })
export class FichaVitalidadeRapidaService {
  private readonly fichaService = inject(FichaService);

  /** Último valor pedido de cada campo, por ficha — o que ainda não foi persistido. */
  private readonly pendencias = new Map<number, Partial<Record<CampoVitalidadeAtual, number>>>();
  /** Temporizador do lote em curso, por ficha (reiniciado a cada novo pedido). */
  private readonly temporizadores = new Map<number, ReturnType<typeof setTimeout>>();
  /** Impede que dois PATCHes absolutos da mesma ficha se sobreponham e cheguem fora de ordem. */
  private readonly persistenciasEmAndamento = new Set<number>();

  /** Emite a ficha alterada após cada persistência bem-sucedida. */
  readonly persistido$ = new Subject<FichaAlteradaDto>();
  /** Emite o `fichaId` de uma persistência que falhou (403/400/rede) — quem chama pode reconciliar. */
  readonly falhou$ = new Subject<number>();

  /** Acumula o novo valor de `campo` para `fichaId` e (re)agenda a persistência em lote. */
  ajustar(fichaId: number, campo: CampoVitalidadeAtual, valor: number): void {
    this.pendencias.set(fichaId, { ...this.pendencias.get(fichaId), [campo]: valor });

    clearTimeout(this.temporizadores.get(fichaId));
    this.temporizadores.set(
      fichaId,
      setTimeout(() => this.persistir(fichaId), ATRASO_PERSISTENCIA_MS),
    );
  }

  private persistir(fichaId: number): void {
    const pendente = this.pendencias.get(fichaId);
    this.temporizadores.delete(fichaId);
    if (!pendente || this.persistenciasEmAndamento.has(fichaId)) {
      return;
    }
    this.pendencias.delete(fichaId);
    this.persistenciasEmAndamento.add(fichaId);

    this.fichaService
      .alterarVitalidade(fichaId, pendente)
      .pipe(
        catchError(() => {
          this.falhou$.next(fichaId);
          return EMPTY;
        }),
        finalize(() => {
          this.persistenciasEmAndamento.delete(fichaId);
          if (this.pendencias.has(fichaId)) {
            this.persistir(fichaId);
          }
        }),
      )
      .subscribe({ next: (alterada) => this.persistido$.next(alterada) });
  }
}
