import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RolagemVisibilidadeEnum, TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { firstValueFrom } from 'rxjs';

import { SessaoService } from '../../core/services/sessao.service';
import { RolagemService } from '../../modules/ficha/rolagem.service';
import { Icone } from '../icone/icone.component';
import { ResultadoRolagem } from '../resultado-rolagem/resultado-rolagem.component';
import { BotaoIcone } from '../ui/botao-icone/botao-icone.component';
import { Chip } from '../ui/chip/chip.component';
import { ConfirmacaoService } from '../ui/confirmacao/confirmacao.service';

/**
 * Cartão de uma rolagem do histórico/feed — rótulo, autor, "privada", horário, fórmula e o
 * resultado, com a réguinha lateral na `--cor-ficha`. Era um bloco copiado em quatro telas
 * (histórico lateral, painel do espectador e as duas abas de rolagens do detalhe da campanha);
 * agora é este componente só, e a lixeira do `ADMIN` (I-033) mora aqui, uma vez.
 *
 * Uso: `<li app-cartao-rolagem [rolagem]="item" [autor]="…" />`. `autor` é o texto de quem rolou
 * (varia por tela: só o nome, `nome · ficha`, etc.); `tempo` sobrescreve o horário quando a tela o
 * mostra relativo (espectador) — sem ele, sai `dd/MM HH:mm` de `createdDate`.
 */
@Component({
  selector: 'li[app-cartao-rolagem]',
  imports: [DatePipe, Icone, ResultadoRolagem, BotaoIcone, Chip],
  templateUrl: './cartao-rolagem.component.html',
  styleUrl: './cartao-rolagem.component.scss',
  host: { '[style.--cor-ficha]': 'rolagem().corFicha' },
})
export class CartaoRolagem {
  readonly rolagem = input.required<RolagemResumoDto>();
  readonly autor = input.required<string>();
  readonly tempo = input<string | null>(null);

  private readonly sessao = inject(SessaoService);
  private readonly rolagemService = inject(RolagemService);
  private readonly confirmacao = inject(ConfirmacaoService);

  protected readonly privada = computed(
    () => this.rolagem().visibilidade === RolagemVisibilidadeEnum.PRIVADA,
  );
  protected readonly ehAdmin = computed(() => this.sessao.usuario()?.tipo === TipoUsuarioEnum.ADMIN);

  /** Pede confirmação e exclui. Quem lista a rolagem a tira da lista por `rolagemExcluida$`. */
  protected async excluir(): Promise<void> {
    const { id, rotulo } = this.rolagem();
    await this.confirmacao.confirmar({
      titulo: 'Excluir rolagem',
      mensagem: `Excluir a rolagem ${rotulo}? Ela some do histórico de todos os jogadores.`,
      entidade: rotulo,
      rotuloConfirmar: 'Excluir',
      aoConfirmar: () => firstValueFrom(this.rolagemService.excluir(id)).then(() => undefined),
    });
  }
}
