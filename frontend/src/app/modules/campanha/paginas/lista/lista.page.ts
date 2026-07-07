import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaService } from '../../campanha.service';

/**
 * Landing privada do usuário (rota `/painel`) — lista as campanhas de que ele é membro, cada
 * uma com o papel (`MESTRE`/`JOGADOR`), e dá acesso a criar uma campanha ou entrar por código.
 * Cada item liga ao detalhe (`/painel/:id`). Estado em Signals; os dados vêm do backend
 * (m2-04) via `CampanhaService`. Substitui a casca semente do painel da m2-06.
 */
@Component({
  selector: 'app-campanha-lista',
  imports: [RouterLink],
  templateUrl: './lista.page.html',
  styleUrl: './lista.page.scss',
})
export class CampanhaLista {
  private readonly campanhaService = inject(CampanhaService);

  protected readonly campanhas = signal<CampanhaResumoDto[]>([]);
  protected readonly carregando = signal(true);

  constructor() {
    this.campanhaService
      .listarCampanhas()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (campanhas) => this.campanhas.set(campanhas),
      });
  }
}
