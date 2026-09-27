import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { CampanhaService } from '../../../campanha/campanha.service';
import type { TelaComRascunhoDocumento } from '../../rascunho-documento.guard';
import { BibliotecaJogador } from '../biblioteca-jogador/biblioteca-jogador.page';
import { BibliotecaMestre } from '../biblioteca-mestre/biblioteca-mestre.page';

/**
 * Casca da biblioteca de documentos (m9-04) — `/campanhas/:campanhaId/documentos`. Resolve **quem**
 * olha (membros + sessão, como o `HubCenas`) e bifurca: o mestre monta a `BibliotecaMestre`, o
 * jogador a `BibliotecaJogador` (m9-05). O espectador não passa por aqui — não pode listar membros
 * (403) e tem a rota própria, `campanhas/:id/espectador/documentos`; o erro o leva de volta à
 * campanha, como qualquer outro papel sem biblioteca nesta rota. O recorte de verdade é do backend:
 * a listagem de quem não é mestre só traz os revelados.
 *
 * Enquanto o papel não é conhecido, só a silhueta da página — sem ela o mestre veria um vão.
 */
@Component({
  selector: 'app-biblioteca-documentos',
  imports: [Esqueleto, BibliotecaMestre, BibliotecaJogador],
  templateUrl: './biblioteca-documentos.page.html',
  styleUrl: './biblioteca-documentos.page.scss',
})
export class BibliotecaDocumentos implements TelaComRascunhoDocumento {
  private readonly campanhaService = inject(CampanhaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly roteador = inject(Router);
  private readonly rotaAtiva = inject(ActivatedRoute);

  protected readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('campanhaId'));

  private readonly membros = signal<readonly CampanhaMembroResumoDto[] | null>(null);
  private readonly mestre = viewChild(BibliotecaMestre);

  /** O papel de quem olha, pela própria linha na lista de membros. */
  private readonly papel = computed(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    return (this.membros() ?? []).find((membro) => membro.usuarioId === usuarioId)?.papel ?? null;
  });
  protected readonly ehMestre = computed(() => this.papel() === TipoCampanhaMembroPapelEnum.MESTRE);
  protected readonly ehJogador = computed(
    () => this.papel() === TipoCampanhaMembroPapelEnum.JOGADOR,
  );

  protected readonly carregando = computed(() => this.membros() === null);

  constructor() {
    // `ESPECTADOR` não pode listar membros (403): o erro também leva de volta à campanha.
    this.campanhaService.listarMembros(this.campanhaId).subscribe({
      next: (membros) => {
        this.membros.set(membros);
        if (!this.ehMestre() && !this.ehJogador()) {
          this.voltarACampanha();
        }
      },
      error: () => this.voltarACampanha(),
    });
  }

  podeSair(): boolean | Promise<boolean> {
    return this.mestre()?.podeSair() ?? true;
  }

  private voltarACampanha(): void {
    void this.roteador.navigate(['/campanhas', this.campanhaId], { replaceUrl: true });
  }
}
