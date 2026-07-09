import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../ficha.service';
import { construirFichaPadrao } from '../../ficha-padrao';
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
  imports: [RouterLink, Icone],
  templateUrl: './lista.page.html',
  styleUrl: './lista.page.scss',
})
export class FichaLista {
  private readonly fichaService = inject(FichaService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** `id` da campanha, lido do parâmetro da rota-pai (`/painel/:campanhaId/ficha`). */
  protected readonly campanhaId = Number(lerParamRota(this.rotaAtiva, 'campanhaId'));

  protected readonly carregando = signal(true);
  /** `true` enquanto a criação da nova ficha está em voo (desabilita o botão). */
  protected readonly criando = signal(false);
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

  /**
   * "Nova ficha" (m3-10 — default-then-edit): cria uma ficha **padrão** e abre a tela dela para
   * **edição no próprio lugar** (sem formulário de criação). O backend valida a autoria/permissão
   * (§14) e faz o snapshot; um erro chega pelo `error-handler.interceptor`.
   */
  protected criarFicha(): void {
    if (this.criando()) {
      return;
    }
    this.criando.set(true);
    const padrao = construirFichaPadrao();
    this.fichaService
      .criarFicha({ campanhaId: this.campanhaId, nome: padrao.nome, dados: padrao.dados })
      .pipe(finalize(() => this.criando.set(false)))
      .subscribe({
        next: (fichaCriada) => {
          void this.router.navigate(['/painel', this.campanhaId, 'ficha', fichaCriada.id]);
        },
      });
  }
}
