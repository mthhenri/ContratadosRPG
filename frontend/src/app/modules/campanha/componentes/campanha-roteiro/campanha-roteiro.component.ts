import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CenaDocumentoResumoDto, CenaResumoDto } from '@contratados-rpg/shared/dtos/cena';
import { CenaStatusEnum, CenaTipoEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { iconeTipoCena } from '../../../../shared/icone/icones-dominio';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { rotuloTipoCena } from '../../../cena/rotulos-cena';

/**
 * Faixa "Roteiro da sessão" da campanha do mestre (ui-45) — responde de relance "onde a sessão
 * está": quantas cenas já foram, qual está aberta (ou qual vem a seguir) e as próximas na ordem do
 * hub. Cartões na receita de `.cena-cartao` do hub de cenas (análogo aprovado). Só apresenta:
 * navegar é `routerLink`; abrir a próxima planejada sai como evento para a página, que usa o mesmo
 * `CenaService.abrirCena` do hub.
 */
@Component({
  selector: 'app-campanha-roteiro',
  imports: [RouterLink, Botao, Chip, Esqueleto, Icone, Tooltip],
  templateUrl: './campanha-roteiro.component.html',
  styleUrl: './campanha-roteiro.component.scss',
})
export class CampanhaRoteiro {
  readonly campanhaId = input.required<number>();
  /** `null` enquanto a lista não chegou — a faixa mostra a silhueta. */
  readonly cenas = input.required<readonly CenaResumoDto[] | null>();
  /** Documentos da Investigação ativa (vazio para outros tipos). */
  readonly documentosAtiva = input<readonly CenaDocumentoResumoDto[]>([]);
  /** Uma abertura de cena em voo — trava o botão. */
  readonly emOperacao = input(false);

  readonly abrirCena = output<CenaResumoDto>();

  protected readonly iconeTipoCena = iconeTipoCena;
  protected readonly rotuloTipoCena = rotuloTipoCena;

  protected readonly encerradas = computed(
    () => (this.cenas() ?? []).filter((cena) => cena.status === CenaStatusEnum.ENCERRADA).length,
  );
  protected readonly ativa = computed(
    () => (this.cenas() ?? []).find((cena) => cena.status === CenaStatusEnum.ATIVA) ?? null,
  );
  private readonly planejadas = computed(() =>
    (this.cenas() ?? []).filter((cena) => cena.status === CenaStatusEnum.PLANEJADA),
  );
  /** Sem cena aberta, a primeira planejada vira o destaque ("Próxima"). */
  protected readonly proxima = computed(() =>
    this.ativa() ? null : (this.planejadas()[0] ?? null),
  );
  /** As planejadas que sobram depois do destaque. */
  protected readonly seguintes = computed(() =>
    this.ativa() ? this.planejadas() : this.planejadas().slice(1),
  );

  protected readonly ativaEhInvestigacao = computed(
    () => this.ativa()?.tipo === CenaTipoEnum.INVESTIGACAO,
  );
  protected readonly documentoEmFoco = computed(
    () => this.documentosAtiva().find((documento) => documento.emFoco) ?? null,
  );
}
