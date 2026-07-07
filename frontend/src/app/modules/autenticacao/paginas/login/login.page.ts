import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Icone } from '../../../../shared/icone/icone.component';
import { SessaoService } from '../../../../core/services/sessao.service';

/**
 * Tela pública de login. Reactive Forms (sem `ngModel`) coleta `login`/`senha`, delega ao
 * `SessaoService.logar` e, ao autenticar, retoma o destino guardado em `retorno` (posto pelo
 * `autenticacaoGuard`/`error-handler`) ou cai no `/painel`. O toast de erro do backend vem do
 * `error-handler.interceptor`; aqui só destravamos o botão ao fim da chamada.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Icone],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly sessaoService = inject(SessaoService);
  private readonly router = inject(Router);
  private readonly rotaAtiva = inject(ActivatedRoute);

  protected readonly enviando = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    login: ['', [Validators.required]],
    senha: ['', [Validators.required]],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.sessaoService
      .logar(this.formulario.getRawValue())
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          const retorno = this.rotaAtiva.snapshot.queryParamMap.get('retorno') ?? '/painel';
          void this.router.navigateByUrl(retorno);
        },
      });
  }
}
