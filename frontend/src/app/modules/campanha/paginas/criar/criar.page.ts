import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CampanhaService } from '../../campanha.service';

/**
 * Tela privada de criação de campanha. Reactive Forms (sem `ngModel`) coleta `nome` e
 * `descricao` (opcional); ao criar, o usuário vira `MESTRE` e recebe o `codigoConvite` — a
 * navegação segue direto ao detalhe (`/painel/:id`), onde o mestre vê o código. Erros do
 * backend chegam via `error-handler.interceptor`; aqui só destravamos o botão ao fim.
 */
@Component({
  selector: 'app-campanha-criar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './criar.page.html',
  styleUrl: './criar.page.scss',
})
export class CampanhaCriar {
  private readonly formBuilder = inject(FormBuilder);
  private readonly campanhaService = inject(CampanhaService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    descricao: [''],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    const { nome, descricao } = this.formulario.getRawValue();
    this.campanhaService
      .criarCampanha({ nome, descricao: descricao || undefined })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (campanhaCriada) => {
          void this.router.navigate(['/painel', campanhaCriada.id]);
        },
      });
  }
}
