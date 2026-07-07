import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CampanhaService } from '../../campanha.service';

/**
 * Tela privada de entrada em campanha por código. Reactive Forms coleta o `codigoConvite`;
 * ao entrar, o usuário vira `JOGADOR` e a navegação segue ao detalhe (`/painel/:id`). Código
 * inexistente (404) ou já-membro (400) chegam como toast pelo `error-handler.interceptor` — a
 * autoridade é o backend (§14); aqui só destravamos o botão ao fim da chamada.
 */
@Component({
  selector: 'app-campanha-entrar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './entrar.page.html',
  styleUrl: './entrar.page.scss',
})
export class CampanhaEntrar {
  private readonly formBuilder = inject(FormBuilder);
  private readonly campanhaService = inject(CampanhaService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    codigoConvite: ['', [Validators.required]],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.campanhaService
      .entrarCampanha(this.formulario.getRawValue())
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (campanhaEntrada) => {
          void this.router.navigate(['/painel', campanhaEntrada.id]);
        },
      });
  }
}
