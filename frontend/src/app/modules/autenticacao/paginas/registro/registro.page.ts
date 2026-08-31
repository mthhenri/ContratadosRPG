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

import { Icone } from '../../../../shared/icone/icone.component';
import { Marca } from '../../../../shared/marca/marca.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
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
 * usuário recém-criado, indo ao `/campanhas`. Erros do backend (ex.: login duplicado) aparecem via
 * `error-handler.interceptor`.
 */
@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, Icone, Marca, Botao, BotaoIcone, Campo],
  templateUrl: './registro.page.html',
  styleUrl: './registro.page.scss',
})
export class Registro {
  private readonly formBuilder = inject(FormBuilder);
  private readonly sessaoService = inject(SessaoService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);

  /** Alterna esconder/revelar cada campo de senha (a senha e a confirmação, independentes). */
  protected readonly senhaVisivel = signal(false);
  protected readonly confirmacaoVisivel = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group(
    {
      nome: ['', [Validators.required]],
      login: ['', [Validators.required]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmacaoSenha: ['', [Validators.required]],
    },
    { validators: senhasCoincidem },
  );

  /**
   * Mensagem do campo Senha. O `app-campo` recebe o erro já filtrado porque o portão genérico
   * `touched && invalid` mostraria esta mensagem também para o campo vazio, que erra por
   * `required` — e a tela nunca mostrou mensagem nesse caso.
   */
  protected erroSenha(): string {
    const senha = this.formulario.controls.senha;
    return senha.touched && senha.hasError('minlength') ? 'Mínimo de 6 caracteres.' : '';
  }

  /** Mensagem da confirmação. O erro é do formulário (`senhasDivergentes`), não do controle. */
  protected erroConfirmacaoSenha(): string {
    const confirmacao = this.formulario.controls.confirmacaoSenha;
    return confirmacao.touched && this.formulario.hasError('senhasDivergentes')
      ? 'As senhas não coincidem.'
      : '';
  }

  protected alternarSenha(): void {
    this.senhaVisivel.update((visivel) => !visivel);
  }

  protected alternarConfirmacao(): void {
    this.confirmacaoVisivel.update((visivel) => !visivel);
  }

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
          void this.router.navigateByUrl('/campanhas');
        },
      });
  }
}
