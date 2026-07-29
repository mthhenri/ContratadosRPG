import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';

import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { ResultadoRolagem } from '../../../../shared/resultado-rolagem/resultado-rolagem.component';
import { RolagemService } from '../../rolagem.service';

const ITENS_POR_PAGINA = 20;

/**
 * Aba **Histórico** da ficha (m3-27) — lista as rolagens persistidas (`RolagemService.
 * listarPorFicha`), mais recente primeiro, reusando a renderização do resultado
 * (`ResultadoRolagem`, extraído da bandeja de dados). Paginado via "Carregar mais"; sem
 * pagina/UI extra além disso — o histórico completo não precisa carregar tudo de uma vez.
 *
 * **Prepend local (`novaRolagem`)**: quando `FichaVisualizacao` persiste uma rolagem feita
 * enquanto esta aba já está aberta na 3ª coluna (Status), o novo item aparece na hora, sem
 * esperar reabrir a aba — cobre também rolagens `PRIVADA`/de ficha sem campanha, que nunca
 * chegam por WebSocket.
 */
@Component({
  selector: 'app-ficha-historico',
  imports: [ResultadoRolagem, OverflowFade, DatePipe],
  templateUrl: './ficha-historico.component.html',
  styleUrl: './ficha-historico.component.scss',
})
export class FichaHistorico {
  readonly fichaId = input.required<number>();
  /** Última rolagem persistida pela página, para prepend local — ver docstring da classe. */
  readonly novaRolagem = input<RolagemResumoDto | null>(null);

  private readonly rolagemService = inject(RolagemService);

  protected readonly RolagemVisibilidadeEnum = RolagemVisibilidadeEnum;

  protected readonly itens = signal<readonly RolagemResumoDto[]>([]);
  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  private readonly paginaAtual = signal(0);
  private readonly totalPaginas = signal(1);

  protected readonly temMais = signal(false);

  constructor() {
    // `fichaId` é `input.required` — ainda não resolvido no corpo síncrono do construtor (NG0950).
    // Um `effect()` roda só depois que os inputs entram, então o carregamento inicial precisa
    // deste indireto em vez de uma chamada direta aqui.
    effect(() => this.carregarPagina(1));

    // Prepend local (ver docstring): ignora o valor inicial (`null`) e uma repetição do mesmo id
    // (o `input` reemite o mesmo objeto se o pai re-renderizar por outro motivo).
    effect(() => {
      const rolagem = this.novaRolagem();
      if (rolagem && this.itens()[0]?.id !== rolagem.id) {
        this.itens.update((atuais) => [rolagem, ...atuais]);
      }
    });
  }

  /** Busca a próxima página e acrescenta ao final da lista (mais recente já veio primeiro). */
  protected carregarMais(): void {
    if (this.carregandoMais() || !this.temMais()) {
      return;
    }
    this.carregarPagina(this.paginaAtual() + 1);
  }

  private carregarPagina(pagina: number): void {
    const marcarCarregando = pagina === 1 ? this.carregando : this.carregandoMais;
    marcarCarregando.set(true);
    this.rolagemService.listarPorFicha(this.fichaId(), pagina, ITENS_POR_PAGINA).subscribe({
      next: (paginado) => {
        this.itens.update((atuais) => (pagina === 1 ? paginado.itens : [...atuais, ...paginado.itens]));
        this.paginaAtual.set(paginado.paginaAtual);
        this.totalPaginas.set(paginado.totalPaginas);
        this.temMais.set(paginado.paginaAtual < paginado.totalPaginas);
        marcarCarregando.set(false);
      },
      error: () => marcarCarregando.set(false),
    });
  }
}
