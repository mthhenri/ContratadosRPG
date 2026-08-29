import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { rotuloRelativo } from '../../../../shared/rotulo-relativo.util';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Stat } from '../../../../shared/ui/stat/stat.component';
import { CampanhaService } from '../../campanha.service';
import { CampanhaCriar } from '../criar/criar.page';
import { CampanhaEntrar } from '../entrar/entrar.page';

/** Qual dialog de entrada está aberto no painel — `null` quando nenhum. */
type DialogoPainel = 'criar' | 'entrar' | null;

/** Estatísticas agregadas do topo (m2-18) — somadas no client a partir da lista já enriquecida pelo backend. */
interface EstatisticasCampanhas {
  readonly totalCampanhas: number;
  readonly vocesMestra: number;
  readonly fichasEmCampo: number;
  readonly alertas: number;
}

/**
 * Landing privada do usuário (rota `/campanhas`) — lista as campanhas de que ele é membro, cada
 * uma com o papel (`MESTRE`/`JOGADOR`), e dá acesso a criar uma campanha ou entrar por código.
 * Cada item liga ao detalhe (`/campanhas/:id`). Estado em Signals; os dados vêm do backend
 * (m2-04) via `CampanhaService`. Substitui a casca semente do painel da m2-06.
 *
 * **Redesenho m2-17 → m2-18:** de grade de cartões (m2-17) para **painel de controle**: linhas
 * densas com estatísticas agregadas no topo, alerta de ficha crítica por linha, resumo da
 * própria ficha (jogador) e convite copiável direto na linha (mestre) — sem abrir o detalhe. O
 * enriquecimento (`totalMembros`/`totalFichas`/`temFichaCritica`/`minhaFichaResumo`/
 * `codigoConvite`/`atualizadoEm`) já chega pronto do backend (`CampanhaRepository.listarPorUsuario`),
 * respeitando a mesma regra de visibilidade §14 — o front só soma/formata. Só apresentação
 * (proibições #16/#17).
 */
@Component({
  selector: 'app-campanha-lista',
  imports: [RouterLink, Icone, OverflowFade, CampanhaCriar, CampanhaEntrar, Tooltip, Stat],
  templateUrl: './lista.page.html',
  styleUrl: './lista.page.scss',
})
export class CampanhaLista {
  private readonly campanhaService = inject(CampanhaService);
  private readonly destroyRef = inject(DestroyRef);

  /** Exposto ao template só para escolher o ícone do `chip-papel` (coroa/protecoes). */
  protected readonly TipoCampanhaMembroPapelEnum = TipoCampanhaMembroPapelEnum;

  protected readonly campanhas = signal<CampanhaResumoDto[]>([]);
  protected readonly carregando = signal(true);
  /** `id` da campanha cujo convite acabou de ser copiado — botão vira "check" por ~1,5s. */
  protected readonly copiadoId = signal<number | null>(null);
  /** Dialog "Criar campanha"/"Entrar por código" aberto sobre o painel — `null` quando nenhum. */
  protected readonly dialogoAberto = signal<DialogoPainel>(null);

  /** Relógio ticando a cada 5s só pra recomputar `rotuloAtualizacao`, sem novo fetch (mesmo padrão do detalhe). */
  private readonly agora = signal(Date.now());

  /** Tira de 4 estatísticas do topo — somada no client a partir da lista já enriquecida. */
  protected readonly estatisticas = computed<EstatisticasCampanhas>(() => {
    const lista = this.campanhas();
    return {
      totalCampanhas: lista.length,
      vocesMestra: lista.filter((campanha) => campanha.papel === TipoCampanhaMembroPapelEnum.MESTRE)
        .length,
      fichasEmCampo: lista.reduce((soma, campanha) => soma + campanha.totalFichas, 0),
      alertas: lista.filter((campanha) => campanha.temFichaCritica).length,
    };
  });

  constructor() {
    this.campanhaService
      .listarCampanhas()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (campanhas) => this.campanhas.set(campanhas),
      });

    const relogio = setInterval(() => this.agora.set(Date.now()), 5000);
    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }

  /** Abre o dialog "Nova campanha". */
  protected abrirCriar(): void {
    this.dialogoAberto.set('criar');
  }

  /** Abre o dialog "Entrar por código". */
  protected abrirEntrar(): void {
    this.dialogoAberto.set('entrar');
  }

  /** Fecha o dialog aberto (fundo, "✕" ou envio bem-sucedido). */
  protected fecharDialogo(): void {
    this.dialogoAberto.set(null);
  }

  /** "Agora/há Xs/há X min/há X h" para `campanha.atualizadoEm` — recomputado pelo relógio de 5s. */
  protected rotuloAtualizacao(campanha: CampanhaResumoDto): string {
    return rotuloRelativo(new Date(campanha.atualizadoEm).getTime(), this.agora());
  }

  /**
   * Copia o convite direto da linha (só mestre — item 1 do spec: `codigoConvite` só vem
   * preenchido nesse papel). Impede a navegação do link da linha (`preventDefault`/
   * `stopPropagation`) — o clique no botão não deve abrir o detalhe.
   */
  protected copiarConvite(campanha: CampanhaResumoDto, evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
    if (!campanha.codigoConvite) {
      return;
    }
    void navigator.clipboard.writeText(campanha.codigoConvite).then(() => {
      this.copiadoId.set(campanha.id);
      setTimeout(() => {
        this.copiadoId.update((atual) => (atual === campanha.id ? null : atual));
      }, 1500);
    });
  }
}
