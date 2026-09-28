import { DestroyRef, Injectable, type Signal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { DocumentoLeitorDto } from '@contratados-rpg/shared/dtos/documento';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../core/services/tempo-real.service';
import { CampanhaService } from '../campanha/campanha.service';
import type { DocumentoLeitorNomeado, DocumentoLeitoresPorDocumento } from './documento-leitores';

/** Nome provisório enquanto a lista de membros é recarregada (membro que entrou depois da carga). */
const NOME_PROVISORIO = 'Membro';

/**
 * Presença de leitura na Biblioteca do mestre (m9-10) — quem está com cada documento aberto agora.
 * Extraída da `BibliotecaMestre` (já extensa) e provida por ela (`providers`): vive e morre com a
 * página, e sair descarta o estado.
 *
 * O backend (m9-09) manda o **retrato completo** (`documento:leitores`, só para o mestre) a cada
 * mudança; aqui ele só é substituído, nunca reconciliado. Informar leitura (`null` — o que o mestre
 * lê não entra no retrato) é o que entrega o retrato atual: na abertura e a cada reconexão
 * (`reconexao$`, P-083), quando o backend perdeu o estado do socket antigo.
 *
 * Os nomes vêm da lista de membros que a casca já carregou para decidir o papel — sem GET novo. Um
 * `usuarioId` desconhecido (membro que entrou depois) recarrega a lista **uma vez** por id; enquanto
 * isso, aparece como "Membro".
 */
@Injectable()
export class BibliotecaLeitoresStore {
  private readonly tempoRealService = inject(TempoRealService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly retrato = signal<readonly DocumentoLeitorDto[]>([]);
  /** A lista da casca — um sinal dentro de outro, para `nomes` acompanhar a troca em `iniciar`. */
  private readonly membrosIniciais = signal<Signal<readonly CampanhaMembroResumoDto[]>>(signal([]));
  private readonly membrosRecarregados = signal<readonly CampanhaMembroResumoDto[] | null>(null);
  /** Ids que já pediram uma recarga — um id que continua desconhecido não recarrega de novo. */
  private readonly idsRecarregados = new Set<number>();
  private recarregandoMembros = false;
  private campanhaId: number | null = null;

  private readonly nomes = computed(() => {
    const membros = this.membrosRecarregados() ?? this.membrosIniciais()();
    return new Map(membros.map((membro) => [membro.usuarioId, membro.nome]));
  });

  readonly leitoresPorDocumento = computed<DocumentoLeitoresPorDocumento>(() => {
    const nomes = this.nomes();
    const porDocumento = new Map<number, DocumentoLeitorNomeado[]>();
    for (const leitor of this.retrato()) {
      // O backend já omite o mestre; a guarda só impede que ele se veja se isso um dia mudar.
      if (leitor.papel === TipoCampanhaMembroPapelEnum.MESTRE) {
        continue;
      }
      const leitores = porDocumento.get(leitor.documentoId) ?? [];
      leitores.push({
        usuarioId: leitor.usuarioId,
        nome: nomes.get(leitor.usuarioId) ?? NOME_PROVISORIO,
        espectador: leitor.papel === TipoCampanhaMembroPapelEnum.ESPECTADOR,
      });
      porDocumento.set(leitor.documentoId, leitores);
    }
    for (const leitores of porDocumento.values()) {
      leitores.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    return porDocumento;
  });

  /** `membros`: a lista que a casca já carregou (lida sob demanda, pode chegar depois). */
  iniciar(campanhaId: number, membros: Signal<readonly CampanhaMembroResumoDto[]>): void {
    this.campanhaId = campanhaId;
    this.membrosIniciais.set(membros);

    this.tempoRealService.documentoLeitores$
      .pipe(
        filter((retrato) => retrato.campanhaId === campanhaId),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((retrato) => {
        this.retrato.set(retrato.leitores);
        this.recarregarMembrosSeDesconhecido(retrato.leitores);
      });

    this.tempoRealService.informarLeitura(campanhaId, null);
    this.tempoRealService.reconexao$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tempoRealService.informarLeitura(campanhaId, null));
  }

  private recarregarMembrosSeDesconhecido(leitores: readonly DocumentoLeitorDto[]): void {
    if (this.recarregandoMembros || this.campanhaId === null) {
      return;
    }
    const nomes = this.nomes();
    const desconhecidos = leitores
      .map((leitor) => leitor.usuarioId)
      .filter((usuarioId) => !nomes.has(usuarioId) && !this.idsRecarregados.has(usuarioId));
    if (desconhecidos.length === 0) {
      return;
    }
    desconhecidos.forEach((usuarioId) => this.idsRecarregados.add(usuarioId));
    this.recarregandoMembros = true;
    this.campanhaService
      .listarMembros(this.campanhaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (membros) => {
          this.recarregandoMembros = false;
          this.membrosRecarregados.set(membros);
          // Um retrato que chegou durante a recarga pode ter trazido outro id novo.
          this.recarregarMembrosSeDesconhecido(this.retrato());
        },
        error: () => {
          this.recarregandoMembros = false;
        },
      });
  }
}
