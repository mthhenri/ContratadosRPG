import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { CampanhaService } from '../../campanha.service';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';

/**
 * Dialog de entrada em campanha por código, aberto a partir do painel (`CampanhaLista`). Reactive
 * Forms coleta o `codigoConvite` — um único campo, sem seletor de papel (m8-03: o mesmo código
 * público serve tanto para o convite de jogador quanto para o de espectador; o servidor resolve
 * qual bateu e devolve o papel em `CampanhaEntradaDto.papel`, nunca o cliente). A notificação
 * confirma qual papel foi obtido antes de navegar — o usuário nunca escolheu, então precisa saber
 * o que aconteceu — e a navegação bifurca: `JOGADOR` vai ao detalhe de sempre (`/campanhas/:id`),
 * `ESPECTADOR` vai direto ao Painel do espectador (`/campanhas/:id/espectador`), que é o único
 * destino que aquele papel consegue abrir. Código inexistente (404) ou já-membro (400) chegam como
 * toast pelo `error-handler.interceptor` — a autoridade é o backend (§14); aqui só destravamos o
 * botão ao fim da chamada.
 */
@Component({
  selector: 'app-campanha-entrar',
  imports: [ReactiveFormsModule, Botao, Modal],
  templateUrl: './entrar.page.html',
  styleUrl: './entrar.page.scss',
})
export class CampanhaEntrar {
  private readonly formBuilder = inject(FormBuilder);
  private readonly campanhaService = inject(CampanhaService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly router = inject(Router);

  /** Fecha o dialog sem entrar. */
  readonly fechar = output<void>();

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
          const comoEspectador = campanhaEntrada.papel === TipoCampanhaMembroPapelEnum.ESPECTADOR;
          this.notificacaoService.notificar({
            severidade: 'sucesso',
            resumo: comoEspectador ? 'Você entrou como Espectador' : 'Você entrou como Jogador',
            detalhe: campanhaEntrada.nome,
          });
          void this.router.navigate(
            comoEspectador
              ? ['/campanhas', campanhaEntrada.id, 'espectador']
              : ['/campanhas', campanhaEntrada.id],
          );
        },
      });
  }

  /** Fecha sem entrar (fundo ou "✕"). */
  protected fecharDialog(): void {
    this.fechar.emit();
  }
}
