import { Component, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaResistenciaDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';

const TIPOS: readonly TipoDanoEnum[] = Object.values(TipoDanoEnum) as TipoDanoEnum[];

/** Abreviação de exibição de cada tipo na grade compacta — mesmas três formas encurtadas do grid de
 * Resistências da ficha de jogador (`FichaVisualizacao.abreviacaoResistencia`), pra caber num box
 * de ~77px sem cortar. O nome inteiro (com subtipo) fica na dica do próprio rótulo. */
const ABREVIACAO: Record<TipoDanoEnum, string> = {
  [TipoDanoEnum.FISICO]: 'Físico',
  [TipoDanoEnum.BALISTICO]: 'Balíst.',
  [TipoDanoEnum.EXPLOSAO]: 'Explos.',
  [TipoDanoEnum.QUIMICO]: 'Químico',
  [TipoDanoEnum.GERAL]: 'Geral',
};

/**
 * Modificador BEM (`--<sufixo>`) por tipo de dano — mesma cor dedicada dos tokens `--dano-fisico`/
 * `--dano-balistico`/`--dano-explosao`/`--dano-quimico`/`--dano-geral` (`_tokens.scss`) já usada no
 * chip de resumo de `ResultadoRolagem` (`SUFIXO_TIPO_DANO`), reaproveitada aqui pra colorir
 * Resistências e Fraquezas por tipo (pedido do autor).
 */
const SUFIXO_TIPO_DANO: Record<TipoDanoEnum, string> = {
  [TipoDanoEnum.FISICO]: 'fisico',
  [TipoDanoEnum.BALISTICO]: 'balistico',
  [TipoDanoEnum.EXPLOSAO]: 'explosao',
  [TipoDanoEnum.QUIMICO]: 'quimico',
  [TipoDanoEnum.GERAL]: 'geral',
};

/**
 * Editor no próprio lugar de uma lista `{tipo, subtipo, valor}` (m4-04b) — reusado tanto para
 * Resistências quanto para Fraquezas da ficha de criatura (`FichaCriaturaResistenciaDto` é a
 * mesma forma nos dois campos). `titulo` só rotula a seção; a semântica (resistência vs.
 * fraqueza) é decidida por qual `ajustar*` do service o pai liga ao `(itensMudou)`.
 */
@Component({
  selector: 'app-criatura-resistencia-lista',
  imports: [ReactiveFormsModule, Botao, BotaoIcone, Icone, Tooltip, NgTemplateOutlet, EstadoVazio],
  templateUrl: './criatura-resistencia-lista.component.html',
  styleUrl: './criatura-resistencia-lista.component.scss',
})
export class CriaturaResistenciaLista {
  readonly itens = input.required<readonly FichaCriaturaResistenciaDto[]>();
  readonly titulo = input.required<string>();
  readonly editavel = input(false);
  /** Só decide a pele do estado de leitura (`resistencia` = grade compacta neutra, `fraqueza` =
   * lista com tom de aviso) — o formulário de edição é idêntico nos dois casos. */
  readonly variante = input<'resistencia' | 'fraqueza'>('resistencia');
  /** Texto curto à direita do título (ex.: o limite de pontos das Resistências) — mesmo lugar da
   * dica do cabeçalho de Ataques no mockup, depois da régua e antes dos botões. */
  readonly dica = input<string | null>(null);

  readonly itensMudou = output<readonly FichaCriaturaResistenciaDto[]>();

  protected readonly tipos = TIPOS;
  protected readonly abreviacao = ABREVIACAO;

  protected readonly indiceEmEdicao = signal<number | null>(null);
  /** Editar/remover por item só aparece dentro deste modo — evita os ícones ficarem sempre
   * visíveis; o autor entra e sai dele de propósito (botão no cabeçalho). */
  protected readonly modoEdicao = signal(false);

  private readonly confirmacaoService = inject(ConfirmacaoService);

  protected readonly itemForm = new FormGroup({
    tipo: new FormControl(TipoDanoEnum.FISICO, { nonNullable: true, validators: [Validators.required] }),
    subtipo: new FormControl('', { nonNullable: true }),
    valor: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
  });

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  /** Classe do box compacto de uma Resistência — cor por tipo de dano, com uma variação mais escura
   * do mesmo matiz quando o item tem subtipo (ex.: Físico Cortante fica um vermelho mais escuro que
   * Físico puro — pedido do autor). */
  protected classeGradeItem(item: FichaCriaturaResistenciaDto, emEdicao: boolean): string {
    const classes = [
      'resistencia-lista__grade-item',
      `resistencia-lista__grade-item--${SUFIXO_TIPO_DANO[item.tipo]}`,
    ];
    if (item.subtipo) {
      classes.push('resistencia-lista__grade-item--com-subtipo');
    }
    if (emEdicao) {
      classes.push('resistencia-lista__grade-item--editando');
    }
    return classes.join(' ');
  }

  /** Mesma cor por tipo (e variação por subtipo) da Resistência, na linha de Fraqueza. */
  protected classeItem(item: FichaCriaturaResistenciaDto, emEdicao: boolean): string {
    const classes = ['resistencia-lista__item', `resistencia-lista__item--${SUFIXO_TIPO_DANO[item.tipo]}`];
    if (item.subtipo) {
      classes.push('resistencia-lista__item--com-subtipo');
    }
    if (emEdicao) {
      classes.push('resistencia-lista__item--editando');
    }
    return classes.join(' ');
  }

  protected alternarModoEdicao(): void {
    this.modoEdicao.update((valor) => !valor);
    if (!this.modoEdicao()) {
      this.cancelar();
    }
  }

  protected adicionar(): void {
    this.itemForm.reset({ tipo: TipoDanoEnum.FISICO, subtipo: '', valor: 0 });
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const item = this.itens()[indice];
    this.itemForm.reset({ tipo: item.tipo, subtipo: item.subtipo ?? '', valor: item.valor });
    this.indiceEmEdicao.set(indice);
  }

  protected cancelar(): void {
    this.indiceEmEdicao.set(null);
  }

  protected confirmar(): void {
    const indice = this.indiceEmEdicao();
    if (indice === null || this.itemForm.invalid) {
      return;
    }
    const bruto = this.itemForm.getRawValue();
    const item: FichaCriaturaResistenciaDto = {
      tipo: bruto.tipo,
      subtipo: bruto.subtipo.trim() || null,
      valor: bruto.valor,
    };
    this.emitir(this.substituir(this.itens(), indice, item));
    this.cancelar();
  }

  protected async remover(indice: number): Promise<void> {
    const item = this.itens()[indice];
    const descricao = item.subtipo ? `${item.tipo} · ${item.subtipo}` : item.tipo;
    const confirmado = await this.confirmacaoService.confirmar({
      titulo: `Remover de ${this.titulo()}?`,
      mensagem: `Remover ${descricao}? Esta ação não pode ser desfeita.`,
      entidade: descricao,
      severidade: 'perigo',
      rotuloConfirmar: 'Remover',
    });
    if (!confirmado) {
      return;
    }
    this.emitir(this.itens().filter((_, i) => i !== indice));
    if (this.indiceEmEdicao() === indice) {
      this.cancelar();
    }
  }

  private substituir(
    lista: readonly FichaCriaturaResistenciaDto[],
    indice: number,
    item: FichaCriaturaResistenciaDto,
  ): FichaCriaturaResistenciaDto[] {
    return indice < 0 ? [...lista, item] : lista.map((atual, i) => (i === indice ? item : atual));
  }

  private emitir(itens: readonly FichaCriaturaResistenciaDto[]): void {
    this.itensMudou.emit(itens);
  }
}
