import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Icone } from '../../../../shared/icone/icone.component';
import { lerParamRota } from '../../ler-param-rota';
import { FichaFormulario, FichaFormularioValor } from '../../componentes/ficha-formulario/ficha-formulario.component';
import { FichaService } from '../../ficha.service';

/**
 * Tela de **edição** de ficha de jogador (`/painel/:campanhaId/ficha/:id/editar`, m3-06). Carrega
 * a ficha via `FichaService.recuperarFicha`, entrega o documento ao `FichaFormulario` (que deriva
 * os status ao vivo via `shared/regras`) e persiste as alterações via `alterarFicha`.
 *
 * Estado em Signals; a autoridade (permissões §14 e validação via `shared/regras`) é do backend —
 * erros (ex.: sem permissão 403, dados incoerentes 400) chegam via `error-handler.interceptor`.
 */
@Component({
  selector: 'app-ficha-editar',
  imports: [RouterLink, Icone, FichaFormulario],
  templateUrl: './editar.page.html',
  styleUrl: './editar.page.scss',
})
export class FichaEditar {
  private readonly fichaService = inject(FichaService);
  private readonly rotaAtiva = inject(ActivatedRoute);

  /** `id` da campanha e da ficha, lidos dos parâmetros de rota. */
  protected readonly campanhaId = Number(lerParamRota(this.rotaAtiva, 'campanhaId'));
  private readonly fichaId = Number(lerParamRota(this.rotaAtiva, 'id'));

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  /** Confirmação efêmera pós-salvamento — some ~2 s depois. */
  protected readonly salvo = signal(false);
  /** Valor carregado, entregue ao formulário como `valorInicial`. */
  protected readonly ficha = signal<FichaFormularioValor | null>(null);

  constructor() {
    this.fichaService
      .recuperarFicha(this.fichaId)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (fichaRecuperada) =>
          this.ficha.set({ nome: fichaRecuperada.nome, dados: fichaRecuperada.dados }),
      });
  }

  /** Persiste as alterações e mostra a confirmação; a ficha em tela reflete o salvo. */
  protected salvar(valor: FichaFormularioValor): void {
    if (this.salvando()) {
      return;
    }
    this.salvo.set(false);
    this.salvando.set(true);
    this.fichaService
      .alterarFicha(this.fichaId, { nome: valor.nome, dados: valor.dados })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (fichaAlterada) => {
          this.ficha.set({ nome: fichaAlterada.nome, dados: fichaAlterada.dados });
          this.salvo.set(true);
          setTimeout(() => this.salvo.set(false), 2000);
        },
      });
  }
}
