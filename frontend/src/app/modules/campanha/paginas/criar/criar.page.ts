import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { CampanhaService } from '../../campanha.service';

/**
 * Dialog de criação de campanha, aberto a partir do painel (`CampanhaLista`). Reactive Forms
 * (sem `ngModel`) coleta `nome` e `descricao` (opcional); ao criar, o usuário vira `MESTRE` e
 * recebe o `codigoConvite` — a navegação segue direto ao detalhe (`/campanhas/:id`), onde o mestre
 * vê o código (o que já fecha o dialog, ao sair de `/campanhas`). Erros do backend chegam via
 * `error-handler.interceptor`; aqui só destravamos o botão ao fim.
 */
@Component({
  selector: 'app-campanha-criar',
  imports: [ReactiveFormsModule],
  templateUrl: './criar.page.html',
  styleUrl: './criar.page.scss',
})
export class CampanhaCriar {
  private readonly formBuilder = inject(FormBuilder);
  private readonly campanhaService = inject(CampanhaService);
  private readonly router = inject(Router);

  /** Fecha o dialog sem criar. */
  readonly fechar = output<void>();

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
          void this.router.navigate(['/campanhas', campanhaCriada.id]);
        },
      });
  }

  /** Fecha sem criar (fundo ou "✕"). */
  protected fecharDialog(): void {
    this.fechar.emit();
  }
}
