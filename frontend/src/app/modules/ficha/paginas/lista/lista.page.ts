import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, merge } from 'rxjs';

import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { IndicadorTempoReal } from '../../../../shared/tempo-real/indicador-tempo-real.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../ficha.service';
import { construirFichaInicial, type OpcoesFichaInicial } from '../../ficha-padrao';
import { FichaCriarDialog } from '../../componentes/ficha-criar-dialog/ficha-criar-dialog.component';
import { lerParamRota } from '../../ler-param-rota';
import { rotuloClasse } from '../../rotulos-ficha';

/** Item de ficha já enriquecido para exibição (dono resolvido + rótulo de classe). */
interface ItemFicha {
  readonly id: number;
  readonly nome: string;
  readonly classeTexto: string;
  readonly nivel: number;
  readonly dono: string;
  readonly ehMinha: boolean;
}

/**
 * Lista de fichas de uma campanha (`/painel/:campanhaId/ficha`, m3-07). O recorte visível (dono vê
 * a própria, mestre vê todas, outro membro só as concedidas) é filtrado pelo **backend** (§14) — o
 * front **apenas apresenta** e não duplica regra. Cada ficha liga à visualização read-only
 * (`:id`); dono/mestre editam por lá. Um chip indica o dono ("Você" ou o nome do membro).
 *
 * Estado em Signals; carrega as fichas e os membros da campanha (para resolver o nome do dono) via
 * `forkJoin`. O `campanhaId` vem do parâmetro da rota-pai (lido por `lerParamRota`).
 */
@Component({
  selector: 'app-ficha-lista',
  imports: [RouterLink, Icone, IndicadorTempoReal, FichaCriarDialog],
  templateUrl: './lista.page.html',
  styleUrl: './lista.page.scss',
})
export class FichaLista {
  private readonly fichaService = inject(FichaService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** `id` da campanha, lido do parâmetro da rota-pai (`/painel/:campanhaId/ficha`). */
  protected readonly campanhaId = Number(lerParamRota(this.rotaAtiva, 'campanhaId'));

  protected readonly carregando = signal(true);
  /** `true` enquanto a criação da nova ficha está em voo (desabilita o botão). */
  protected readonly criando = signal(false);
  /** Assistente de criação (m3-16) aberto — coleta os dados de registro antes de criar. */
  protected readonly dialogCriar = signal(false);
  private readonly fichas = signal<FichaResumoDto[]>([]);
  private readonly membros = signal<CampanhaMembroResumoDto[]>([]);

  /** Fichas enriquecidas com o nome do dono e o rótulo de classe, prontas para a lista. */
  protected readonly itens = computed<readonly ItemFicha[]>(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    const nomePorUsuario = new Map(
      this.membros().map((membro) => [membro.usuarioId, membro.nome] as const),
    );
    return this.fichas().map((ficha) => ({
      id: ficha.id,
      nome: ficha.nome,
      classeTexto: rotuloClasse(ficha.classe),
      nivel: ficha.nivel,
      ehMinha: ficha.usuarioId === usuarioId,
      dono:
        ficha.usuarioId === usuarioId
          ? 'Você'
          : (nomePorUsuario.get(ficha.usuarioId) ?? 'Outro agente'),
    }));
  });

  constructor() {
    this.carregar(true);

    // Tempo real (m3-08): entra na sala `campanha:<id>` para ver a campanha atualizar ao vivo. Uma
    // ficha criada (`ficha:criada`) ou um membro que entra (`membro:entrou`) refazem o fetch via
    // REST — o recorte visível (§14) e o nome do dono continuam **arbitrados pelo backend**, sem o
    // front duplicar a regra a partir do payload do broadcast (o resumo chega a todos os membros da
    // sala, mas a listagem REST filtra por §14). Ao sair da tela, esquece a sala.
    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => this.tempoRealService.sairSalaCampanha(this.campanhaId));

    merge(this.tempoRealService.fichaCriada$, this.tempoRealService.membroEntrou$)
      .pipe(takeUntilDestroyed())
      .subscribe({ next: () => this.carregar(false) });

    // Ressincronização ao reconectar (§9 — o Render dorme e derruba a conexão): refaz o fetch.
    effect(() => {
      if (this.tempoRealService.reconexao() > 0) {
        this.carregar(false);
      }
    });
  }

  /**
   * (Re)carrega as fichas visíveis e os membros da campanha. `mostrarEsqueleto` liga o esqueleto só
   * no primeiro carregamento; as ressincronizações ao vivo atualizam sem piscar a tela.
   */
  private carregar(mostrarEsqueleto: boolean): void {
    if (mostrarEsqueleto) {
      this.carregando.set(true);
    }
    forkJoin({
      fichas: this.fichaService.listarFichas(this.campanhaId),
      membros: this.campanhaService.listarMembros(this.campanhaId),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ fichas, membros }) => {
          this.fichas.set(fichas);
          this.membros.set(membros);
        },
      });
  }

  /** Abre o assistente de criação (m3-16). */
  protected abrirCriar(): void {
    this.dialogCriar.set(true);
  }

  /** Fecha o assistente de criação (Cancelar/✕) — inócuo enquanto uma criação está em voo. */
  protected fecharCriar(): void {
    if (!this.criando()) {
      this.dialogCriar.set(false);
    }
  }

  /**
   * "Nova ficha" (m3-16): o assistente coleta os dados de registro (classe/arquétipo, nível,
   * prestígio, atributos base, Maestria) e aqui montamos a ficha via `construirFichaInicial`
   * (`shared/regras` — snapshot + bônus de arquétipo) e criamos, abrindo a tela dela em seguida. O
   * backend valida a autoria/permissão (§14) e revalida forma/Maestria; um erro chega pelo
   * `error-handler.interceptor`.
   */
  protected criarFicha(opcoes: OpcoesFichaInicial): void {
    if (this.criando()) {
      return;
    }
    this.criando.set(true);
    const ficha = construirFichaInicial(opcoes);
    this.fichaService
      .criarFicha({ campanhaId: this.campanhaId, nome: ficha.nome, dados: ficha.dados })
      .pipe(finalize(() => this.criando.set(false)))
      .subscribe({
        next: (fichaCriada) => {
          this.dialogCriar.set(false);
          void this.router.navigate(['/painel', this.campanhaId, 'ficha', fichaCriada.id]);
        },
      });
  }
}
