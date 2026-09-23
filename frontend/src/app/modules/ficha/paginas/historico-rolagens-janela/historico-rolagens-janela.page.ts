import { Component, DestroyRef, effect, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { filter, map } from "rxjs";

import type { RolagemResumoDto } from "@contratados-rpg/shared/dtos/rolagem";

import { TempoRealService } from "../../../../core/services/tempo-real.service";
import { HistoricoRolagensSidebar } from "../../../../shared/historico-rolagens-sidebar/historico-rolagens-sidebar.component";
import { JanelaExternaCabecalho } from "../../../../shared/ui/janela-externa-cabecalho/janela-externa-cabecalho.component";
import { FichaService } from "../../ficha.service";
import { RolagemService } from "../../rolagem.service";

const ITENS_POR_PAGINA = 20;

/** Histórico independente da ficha, com sua própria busca e conexão em tempo real. */
@Component({
  selector: "app-historico-rolagens-janela",
  imports: [HistoricoRolagensSidebar, JanelaExternaCabecalho],
  templateUrl: "./historico-rolagens-janela.page.html",
  styleUrl: "./historico-rolagens-janela.page.scss",
})
export class HistoricoRolagensJanela {
  private readonly rota = inject(ActivatedRoute);
  private readonly fichaService = inject(FichaService);
  private readonly rolagemService = inject(RolagemService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fichaId = Number(this.rota.snapshot.paramMap.get("fichaId"));
  protected readonly criatura = this.rota.snapshot.queryParamMap.get("tipo") === "criatura";
  protected readonly voltarPara = this.criatura
    ? `/fichas/criatura/${this.fichaId}`
    : `/fichas/${this.fichaId}`;
  protected readonly contexto = signal("Ficha");
  protected readonly acessoNegado = signal(false);
  protected readonly itens = signal<readonly RolagemResumoDto[]>([]);
  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  protected readonly temMais = signal(false);
  private readonly pagina = signal(0);

  constructor() {
    const ficha$ = this.criatura
      ? this.fichaService.recuperarFichaCriatura(this.fichaId).pipe(
          map((ficha) => ({ nome: ficha.nome, campanhaId: ficha.campanhaId })),
        )
      : this.fichaService.recuperarFicha(this.fichaId).pipe(
          map((ficha) => ({ nome: ficha.nome, campanhaId: ficha.campanhaId })),
        );
    ficha$.pipe(takeUntilDestroyed()).subscribe({
      next: (ficha) => {
        this.contexto.set(`Ficha de ${ficha.nome}`);
        this.tempoRealService.conectar();
        this.tempoRealService.entrarSalaFicha(this.fichaId);
        this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaFicha(this.fichaId));
        const campanhaId = ficha.campanhaId;
        if (campanhaId !== null) {
          this.tempoRealService.entrarSalaCampanha(campanhaId);
          this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(campanhaId));
        }
        this.carregarPagina(1);
      },
      error: () => {
        this.acessoNegado.set(true);
        this.carregando.set(false);
      },
    });

    this.tempoRealService.rolagemRegistrada$
      .pipe(filter((rolagem) => rolagem.fichaId === this.fichaId), takeUntilDestroyed())
      .subscribe({
        next: (rolagem) =>
          this.itens.update((atuais) =>
            atuais.some((item) => item.id === rolagem.id) ? atuais : [rolagem, ...atuais],
          ),
      });
    this.tempoRealService.rolagemExcluida$
      .pipe(filter((rolagem) => rolagem.fichaId === this.fichaId), takeUntilDestroyed())
      .subscribe({
        next: (rolagem) =>
          this.itens.update((atuais) => atuais.filter((item) => item.id !== rolagem.id)),
      });
    effect(() => {
      if (this.tempoRealService.reconexao() > 0 && !this.acessoNegado()) {
        this.carregarPagina(1);
      }
    });
  }

  private carregarPagina(pagina: number): void {
    const carregamento = pagina === 1 ? this.carregando : this.carregandoMais;
    carregamento.set(true);
    this.rolagemService.listarPorFicha(this.fichaId, pagina, ITENS_POR_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.itens.update((atuais) =>
            pagina === 1 ? resultado.itens : [...atuais, ...resultado.itens],
          );
          this.pagina.set(resultado.paginaAtual);
          this.temMais.set(resultado.paginaAtual < resultado.totalPaginas);
          carregamento.set(false);
        },
        error: () => {
          this.acessoNegado.set(true);
          carregamento.set(false);
        },
      });
  }

  protected carregarMais(): void {
    if (!this.carregandoMais() && this.temMais()) {
      this.carregarPagina(this.pagina() + 1);
    }
  }
}
