import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { Icone } from '../../../../shared/icone/icone.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { UsuarioService } from '../../usuario.service';

/**
 * Tela de perfil do usuário autenticado (`/perfil`, m2-14), acessível pelo dropdown de perfil da
 * topbar. Reúne três operações self-service sobre o backend das m2-11/m2-03: **editar nome/login**
 * (`alterarPerfil` — reflete a nova identidade na sessão para a topbar acompanhar, via
 * `SessaoService.atualizarPerfil`), **trocar a senha** (`alterarSenha`, com o toggle "olhinho" de
 * revelar) e **excluir a própria conta** (`excluirConta`, com confirmação inline forte — sem
 * `confirm()` nativo, fora do tema —; ao concluir encerra a sessão e vai ao `/login`).
 *
 * Estado em Signals, Reactive Forms (sem `ngModel`). Erros do backend (ex.: login em uso, senha
 * atual incorreta) chegam ao usuário via `error-handler.interceptor` (toast). A autoridade é
 * sempre o backend (§14) — aqui é só a camada de apresentação.
 */
@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, Icone],
  templateUrl: './perfil.page.html',
  styleUrl: './perfil.page.scss',
})
export class Perfil {
  private readonly usuarioService = inject(UsuarioService);
  private readonly sessaoService = inject(SessaoService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly carregando = signal(true);
  protected readonly salvandoPerfil = signal(false);
  protected readonly perfilSalvo = signal(false);

  protected readonly salvandoSenha = signal(false);
  protected readonly senhaAlterada = signal(false);
  protected readonly senhaAtualVisivel = signal(false);
  protected readonly novaSenhaVisivel = signal(false);

  protected readonly confirmandoExclusao = signal(false);
  protected readonly excluindo = signal(false);

  protected readonly formularioPerfil = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    login: ['', [Validators.required]],
  });

  protected readonly formularioSenha = this.formBuilder.nonNullable.group({
    senhaAtual: ['', [Validators.required]],
    novaSenha: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    this.usuarioService
      .recuperarPerfil()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (perfil) => {
          this.formularioPerfil.reset({ nome: perfil.nome, login: perfil.login });
        },
      });
  }

  /** Persiste nome/login e reflete a nova identidade na sessão (topbar acompanha). */
  protected salvarPerfil(): void {
    if (this.formularioPerfil.invalid || this.salvandoPerfil()) {
      this.formularioPerfil.markAllAsTouched();
      return;
    }
    this.perfilSalvo.set(false);
    this.salvandoPerfil.set(true);
    const { nome, login } = this.formularioPerfil.getRawValue();
    this.usuarioService
      .alterarPerfil({ nome, login })
      .pipe(finalize(() => this.salvandoPerfil.set(false)))
      .subscribe({
        next: (perfilAlterado) => {
          this.sessaoService.atualizarPerfil({
            nome: perfilAlterado.nome,
            login: perfilAlterado.login,
          });
          this.formularioPerfil.reset({ nome: perfilAlterado.nome, login: perfilAlterado.login });
          this.perfilSalvo.set(true);
        },
      });
  }

  /** Troca a senha e limpa o formulário; a senha nunca fica retida na tela. */
  protected salvarSenha(): void {
    if (this.formularioSenha.invalid || this.salvandoSenha()) {
      this.formularioSenha.markAllAsTouched();
      return;
    }
    this.senhaAlterada.set(false);
    this.salvandoSenha.set(true);
    const { senhaAtual, novaSenha } = this.formularioSenha.getRawValue();
    this.usuarioService
      .alterarSenha({ senhaAtual, novaSenha })
      .pipe(finalize(() => this.salvandoSenha.set(false)))
      .subscribe({
        next: () => {
          this.formularioSenha.reset({ senhaAtual: '', novaSenha: '' });
          this.senhaAtualVisivel.set(false);
          this.novaSenhaVisivel.set(false);
          this.senhaAlterada.set(true);
        },
      });
  }

  protected alternarSenhaAtual(): void {
    this.senhaAtualVisivel.update((visivel) => !visivel);
  }

  protected alternarNovaSenha(): void {
    this.novaSenhaVisivel.update((visivel) => !visivel);
  }

  /** Pede confirmação antes de excluir a conta — mostra a área de confirmação inline. */
  protected pedirExclusao(): void {
    this.confirmandoExclusao.set(true);
  }

  /** Cancela a exclusão pendente. */
  protected cancelarExclusao(): void {
    this.confirmandoExclusao.set(false);
  }

  /** Exclui a conta (soft delete), encerra a sessão e leva ao `/login`. */
  protected confirmarExclusao(): void {
    if (this.excluindo()) {
      return;
    }
    this.excluindo.set(true);
    this.usuarioService
      .excluirConta()
      .pipe(finalize(() => this.excluindo.set(false)))
      .subscribe({
        next: () => {
          this.sessaoService.sair();
          void this.router.navigateByUrl('/login');
        },
      });
  }
}
