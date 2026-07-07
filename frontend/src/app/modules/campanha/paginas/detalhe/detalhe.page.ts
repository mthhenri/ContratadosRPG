import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/campanha';

import { SessaoService } from '../../../../core/services/sessao.service';
import { CampanhaService } from '../../campanha.service';

/**
 * Detalhe de uma campanha (`/painel/:id`): nome/descrição, membros com o papel e — só para o
 * mestre — o `codigoConvite` com o botão de regenerar. O papel do usuário atual é derivado da
 * lista de membros (não é regra de segurança, só apresentação: a autoridade é sempre o backend,
 * §14 — a regeneração por um jogador seria barrada com 403 e tratada pelo `error-handler`).
 * Estado em Signals; o `id` da campanha é lido do parâmetro de rota.
 */
@Component({
  selector: 'app-campanha-detalhe',
  imports: [RouterLink],
  templateUrl: './detalhe.page.html',
  styleUrl: './detalhe.page.scss',
})
export class CampanhaDetalhe {
  private readonly campanhaService = inject(CampanhaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly rotaAtiva = inject(ActivatedRoute);

  /** `id` da campanha, lido do parâmetro de rota (`/painel/:id`). */
  private readonly id = Number(this.rotaAtiva.snapshot.paramMap.get('id'));

  protected readonly campanha = signal<CampanhaRecuperadaDto | null>(null);
  protected readonly membros = signal<CampanhaMembroResumoDto[]>([]);
  protected readonly carregando = signal(true);
  protected readonly regenerando = signal(false);

  /** `true` quando o usuário autenticado é o `MESTRE` desta campanha (deriva dos membros). */
  protected readonly ehMestre = computed(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    return this.membros().some(
      (membro) =>
        membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    );
  });

  constructor() {
    forkJoin({
      campanha: this.campanhaService.recuperarCampanha(this.id),
      membros: this.campanhaService.listarMembros(this.id),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ campanha, membros }) => {
          this.campanha.set(campanha);
          this.membros.set(membros);
        },
      });
  }

  protected regenerarConvite(): void {
    if (this.regenerando()) {
      return;
    }
    this.regenerando.set(true);
    this.campanhaService
      .regenerarConvite(this.id)
      .pipe(finalize(() => this.regenerando.set(false)))
      .subscribe({
        next: (conviteRegenerado) => {
          this.campanha.update((campanhaAtual) =>
            campanhaAtual
              ? { ...campanhaAtual, codigoConvite: conviteRegenerado.codigoConvite }
              : campanhaAtual,
          );
        },
      });
  }
}
