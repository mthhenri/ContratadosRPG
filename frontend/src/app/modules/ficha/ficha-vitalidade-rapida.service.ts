import { Injectable, inject } from '@angular/core';
import { EMPTY, Subject, catchError, switchMap } from 'rxjs';

import type { FichaAlteradaDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaService } from './ficha.service';
import type { CampoVitalidadeAtual } from './ajuste-vitalidade';

/** Atraso do lote antes de persistir — mesmo valor do debounce de `FichaVisualizar`. */
const ATRASO_PERSISTENCIA_MS = 500;

/**
 * Ajuste rápido de Vida/Energia **fora** da tela da ficha (m2-16g) — usado pelos mini-cards do
 * detalhe da campanha, onde só o recorte `FichaResumoDto` está carregado (sem o documento
 * completo). Mesmo princípio otimista+em lote de `FichaVisualizar` (`agendarPersistencia`), mas
 * sem manter uma sessão de edição aberta: cada rajada de cliques busca o documento completo só na
 * hora de persistir — não antes, não em cache —, aplica os campos pendentes por cima do que
 * estiver lá (pode ter mudado por outra via desde o último fetch) e faz um único `alterarFicha`
 * por rajada. Quem chama é responsável pelo otimismo na tela (o valor exibido); este serviço só
 * garante que ele acaba persistido, com um passo de rede por vez por ficha.
 */
@Injectable({ providedIn: 'root' })
export class FichaVitalidadeRapidaService {
  private readonly fichaService = inject(FichaService);

  /** Último valor pedido de cada campo, por ficha — o que ainda não foi persistido. */
  private readonly pendencias = new Map<number, Partial<Record<CampoVitalidadeAtual, number>>>();
  /** Temporizador do lote em curso, por ficha (reiniciado a cada novo pedido). */
  private readonly temporizadores = new Map<number, ReturnType<typeof setTimeout>>();

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
    this.pendencias.delete(fichaId);
    if (!pendente) {
      return;
    }

    this.fichaService
      .recuperarFicha(fichaId)
      .pipe(
        switchMap((ficha) =>
          this.fichaService.alterarFicha(fichaId, {
            nome: ficha.nome,
            dados: { ...ficha.dados, estado: { ...ficha.dados.estado, ...pendente } },
          }),
        ),
        catchError(() => {
          this.falhou$.next(fichaId);
          return EMPTY;
        }),
      )
      .subscribe({ next: (alterada) => this.persistido$.next(alterada) });
  }
}
