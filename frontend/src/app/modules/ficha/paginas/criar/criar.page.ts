import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Icone } from '../../../../shared/icone/icone.component';
import { lerParamRota } from '../../ler-param-rota';
import { FichaFormulario, FichaFormularioValor } from '../../componentes/ficha-formulario/ficha-formulario.component';
import { FichaService } from '../../ficha.service';

/**
 * Tela de **criação** de ficha de jogador (`/painel/:campanhaId/ficha/nova`, m3-06). Reusa o
 * `FichaFormulario` (controles e cálculos da calculadora de agente) e persiste via
 * `FichaService.criarFicha` na campanha lida do parâmetro de rota. Ao criar, navega para a
 * **edição** da ficha recém-criada, de modo que ela recarrega íntegra (critério de aceite).
 *
 * Estado em Signals; a autoridade (permissões §14 e validação via `shared/regras`) é do backend —
 * erros (ex.: não-membro 403, dados incoerentes 400) chegam via `error-handler.interceptor`.
 */
@Component({
  selector: 'app-ficha-criar',
  imports: [RouterLink, Icone, FichaFormulario],
  templateUrl: './criar.page.html',
  styleUrl: './criar.page.scss',
})
export class FichaCriar {
  private readonly fichaService = inject(FichaService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** `id` da campanha, lido do parâmetro de rota (`/painel/:campanhaId/ficha/nova`). */
  protected readonly campanhaId = Number(lerParamRota(this.rotaAtiva, 'campanhaId'));

  protected readonly salvando = signal(false);

  /** Persiste a nova ficha e vai para a edição dela (recarrega íntegra do backend). */
  protected criar(valor: FichaFormularioValor): void {
    if (this.salvando()) {
      return;
    }
    this.salvando.set(true);
    this.fichaService
      .criarFicha({ campanhaId: this.campanhaId, nome: valor.nome, dados: valor.dados })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (fichaCriada) => {
          void this.router.navigate([
            '/painel',
            this.campanhaId,
            'ficha',
            fichaCriada.id,
            'editar',
          ]);
        },
      });
  }
}
