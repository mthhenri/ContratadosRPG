import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import { SessaoService } from '../../../../core/services/sessao.service';

/**
 * Valida que `senha` e `confirmacaoSenha` coincidem, marcando o erro `senhasDivergentes` no
 * grupo. Espelho da confirmação de senha da tela — não trafega ao backend (o DTO só leva `senha`).
 */
function senhasCoincidem(grupo: AbstractControl): ValidationErrors | null {
  const senha = grupo.get('senha')?.value;
  const confirmacao = grupo.get('confirmacaoSenha')?.value;
  return senha === confirmacao ? null : { senhasDivergentes: true };
}

/**
 * Tela pública de registro. Reactive Forms coleta `nome`/`login`/`senha` (+ confirmação local),
 * cria a conta via `SessaoService.registrar` e encadeia um `logar` para já abrir a sessão do
 * usuário recém-criado, indo ao `/painel`. Erros do backend (ex.: login duplicado) aparecem via
 * `error-handler.interceptor`.
 */
@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.page.html',
  styleUrl: './registro.page.scss',
})
export class Registro {
  private readonly formBuilder = inject(FormBuilder);
  private readonly sessaoService = inject(SessaoService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group(
    {
      nome: ['', [Validators.required]],
      login: ['', [Validators.required]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmacaoSenha: ['', [Validators.required]],
    },
    { validators: senhasCoincidem },
  );

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    const { nome, login, senha } = this.formulario.getRawValue();
    this.sessaoService
      .registrar({ nome, login, senha })
      .pipe(
        switchMap(() => this.sessaoService.logar({ login, senha })),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/painel');
        },
      });
  }
}
