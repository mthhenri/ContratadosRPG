import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/campanha';

import { Icone } from '../../../../shared/icone/icone.component';
import { SessaoService } from '../../../../core/services/sessao.service';
import { CampanhaContextoService } from '../../campanha-contexto.service';
import { CampanhaService } from '../../campanha.service';

/**
 * Detalhe de uma campanha (`/painel/:id`): nome/descrição, membros com o papel e — só para o
 * mestre — o `codigoConvite` com o botão de regenerar. O papel do usuário atual é derivado da
 * lista de membros (não é regra de segurança, só apresentação: a autoridade é sempre o backend,
 * §14 — a regeneração por um jogador seria barrada com 403 e tratada pelo `error-handler`).
 * Estado em Signals; o `id` da campanha é lido do parâmetro de rota. Preenche o
 * `CampanhaContextoService` (m2-09) para o seletor da topbar e o limpa ao desmontar.
 *
 * Só o mestre vê as ações de **editar** (nome/descrição, formulário inline via Reactive Forms)
 * e **excluir** (com confirmação inline) a campanha (m2-12). A UI apenas esconde o que o
 * jogador não pode fazer — a autoridade continua no backend (§14): uma tentativa direta seria
 * barrada com 403/404 e tratada pelo `error-handler.interceptor`.
 */
@Component({
  selector: 'app-campanha-detalhe',
  imports: [RouterLink, ReactiveFormsModule, Icone],
  templateUrl: './detalhe.page.html',
  styleUrl: './detalhe.page.scss',
})
export class CampanhaDetalhe {
  private readonly campanhaService = inject(CampanhaService);
  private readonly sessaoService = inject(SessaoService);
  private readonly campanhaContextoService = inject(CampanhaContextoService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  /** `id` da campanha, lido do parâmetro de rota (`/painel/:id`). */
  private readonly id = Number(this.rotaAtiva.snapshot.paramMap.get('id'));

  /** Exposto ao template só para escolher o ícone do `chip-papel` (coroa/protecoes). */
  protected readonly TipoCampanhaMembroPapelEnum = TipoCampanhaMembroPapelEnum;

  protected readonly campanha = signal<CampanhaRecuperadaDto | null>(null);
  protected readonly membros = signal<CampanhaMembroResumoDto[]>([]);
  protected readonly carregando = signal(true);
  protected readonly regenerando = signal(false);
  protected readonly copiado = signal(false);

  /** Edição inline de nome/descrição (só mestre) — alterna o card entre exibição e formulário. */
  protected readonly editando = signal(false);
  protected readonly salvando = signal(false);

  /** Exclusão com confirmação inline (só mestre) — evita o diálogo nativo, fora do tema. */
  protected readonly confirmandoExclusao = signal(false);
  protected readonly excluindo = signal(false);

  protected readonly formularioEdicao = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    descricao: [''],
  });

  /** `true` quando o usuário autenticado é o `MESTRE` desta campanha (deriva dos membros). */
  protected readonly ehMestre = computed(() => {
    const usuarioId = this.sessaoService.usuario()?.id;
    return this.membros().some(
      (membro) =>
        membro.usuarioId === usuarioId && membro.papel === TipoCampanhaMembroPapelEnum.MESTRE,
    );
  });

  constructor() {
    forkJoin({
      campanha: this.campanhaService.recuperarCampanha(this.id),
      membros: this.campanhaService.listarMembros(this.id),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ campanha, membros }) => {
          this.campanha.set(campanha);
          this.membros.set(membros);
          this.campanhaContextoService.definir({
            id: campanha.id,
            nome: campanha.nome,
            codigoConvite: campanha.codigoConvite,
          });
        },
      });
    inject(DestroyRef).onDestroy(() => this.campanhaContextoService.limpar());
  }

  protected regenerarConvite(): void {
    if (this.regenerando()) {
      return;
    }
    this.regenerando.set(true);
    this.campanhaService
      .regenerarConvite(this.id)
      .pipe(finalize(() => this.regenerando.set(false)))
      .subscribe({
        next: (conviteRegenerado) => {
          this.campanha.update((campanhaAtual) =>
            campanhaAtual
              ? { ...campanhaAtual, codigoConvite: conviteRegenerado.codigoConvite }
              : campanhaAtual,
          );
          const campanhaAtual = this.campanha();
          if (campanhaAtual) {
            this.campanhaContextoService.definir({
              id: campanhaAtual.id,
              nome: campanhaAtual.nome,
              codigoConvite: conviteRegenerado.codigoConvite,
            });
          }
        },
      });
  }

  /** Abre o formulário de edição preenchido com o nome/descrição atuais da campanha. */
  protected abrirEdicao(): void {
    const campanhaAtual = this.campanha();
    if (!campanhaAtual) {
      return;
    }
    this.confirmandoExclusao.set(false);
    this.formularioEdicao.reset({
      nome: campanhaAtual.nome,
      descricao: campanhaAtual.descricao ?? '',
    });
    this.editando.set(true);
  }

  /** Fecha o formulário de edição descartando as mudanças não salvas. */
  protected cancelarEdicao(): void {
    this.editando.set(false);
  }

  /** Persiste nome/descrição via `alterarCampanha` e reflete o resultado na tela e na topbar. */
  protected salvarEdicao(): void {
    if (this.formularioEdicao.invalid || this.salvando()) {
      this.formularioEdicao.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    const { nome, descricao } = this.formularioEdicao.getRawValue();
    this.campanhaService
      .alterarCampanha(this.id, { nome, descricao: descricao || undefined })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (campanhaAlterada) => {
          this.campanha.update((campanhaAtual) =>
            campanhaAtual
              ? { ...campanhaAtual, nome: campanhaAlterada.nome, descricao: campanhaAlterada.descricao }
              : campanhaAtual,
          );
          this.campanhaContextoService.definir({
            id: campanhaAlterada.id,
            nome: campanhaAlterada.nome,
            codigoConvite: campanhaAlterada.codigoConvite,
          });
          this.editando.set(false);
        },
      });
  }

  /** Pede confirmação antes de excluir — mostra a área de confirmação inline. */
  protected pedirExclusao(): void {
    this.editando.set(false);
    this.confirmandoExclusao.set(true);
  }

  /** Cancela a exclusão pendente. */
  protected cancelarExclusao(): void {
    this.confirmandoExclusao.set(false);
  }

  /** Exclui a campanha (soft delete) e navega de volta à lista (`/painel`). */
  protected confirmarExclusao(): void {
    if (this.excluindo()) {
      return;
    }
    this.excluindo.set(true);
    this.campanhaService
      .excluirCampanha(this.id)
      .pipe(finalize(() => this.excluindo.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/painel']);
        },
      });
  }

  /** Copia o código de convite para a área de transferência — puramente apresentação. */
  protected copiarConvite(): void {
    const codigoConvite = this.campanha()?.codigoConvite;
    if (!codigoConvite) {
      return;
    }
    void navigator.clipboard.writeText(codigoConvite).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 1500);
    });
  }
}
