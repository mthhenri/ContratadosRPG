import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaResistenciaDto } from '@contratados-rpg/shared/dtos/ficha';
import { calcularCustoResistencia, somarCustoResistencias } from '@contratados-rpg/shared/regras/criatura';

import { Icone, type IconeNome } from '../../../../shared/icone/icone.component';
import { ICONE_TIPO_DANO } from '../../../../shared/icone/icones-dominio';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Segmentado } from '../../../../shared/ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../../../../shared/ui/segmentado/segmentado-item.component';
import { AutoFocus } from '../../../../shared/auto-focus/auto-focus.directive';

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
  imports: [
    ReactiveFormsModule,
    Botao,
    BotaoIcone,
    Icone,
    Tooltip,
    NgTemplateOutlet,
    EstadoVazio,
    Campo,
    Segmentado,
    SegmentadoItem,
    AutoFocus,
  ],
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
  /** Limite de Resistências (`calcularLimiteResistencias`, calculado pelo pai): com ele o cabeçalho
   * mostra o orçamento usado/limite e a caixa mostra o custo ao vivo. Só nas Resistências. */
  readonly limite = input<number | null>(null);
  /** Valor mínimo de cada Fraqueza (`calcularValorMinimoFraqueza`, calculado pelo pai). Só nas Fraquezas. */
  readonly minimo = input<number | null>(null);

  readonly itensMudou = output<readonly FichaCriaturaResistenciaDto[]>();

  protected readonly tipos = TIPOS;

  /** Item na caixa de criar/alterar (`-1` = novo). Sem modo de edição geral: clicar no selo abre
   * a caixa dele, com Remover dentro (`criatura-ficha-usabilidade`, pedido do autor). */
  protected readonly indiceEmEdicao = signal<number | null>(null);

  /** Pontos do Limite já usados pelas resistências da lista (Geral 2×, subtipo ½). */
  protected readonly custoUsado = computed(() => somarCustoResistencias(this.itens()));
  /** Quanto passa do Limite (0 quando dentro) — acima dele o servidor recusa salvar a ficha. */
  protected readonly excesso = computed(() => {
    const limite = this.limite();
    return limite === null ? 0 : Math.max(0, this.custoUsado() - limite);
  });
  /** Fraquezas abaixo do mínimo — o servidor também recusa salvar. */
  protected readonly quantidadeAbaixoDoMinimo = computed(
    () => this.itens().filter((item) => this.abaixoDoMinimo(item)).length,
  );

  private readonly confirmacaoService = inject(ConfirmacaoService);

  protected readonly itemForm = new FormGroup({
    tipo: new FormControl(TipoDanoEnum.FISICO, { nonNullable: true, validators: [Validators.required] }),
    subtipo: new FormControl('', { nonNullable: true }),
    valor: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
  });

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  /**
   * Classe do selo: chip fininho nas Resistências (`__grade-item`), linha nas Fraquezas (`__item`).
   * Cor por tipo de dano, com variação mais escura do mesmo matiz quando há subtipo (pedido do
   * autor); Fraqueza abaixo do mínimo ganha `--abaixo`.
   */
  protected classeSelo(item: FichaCriaturaResistenciaDto): string {
    const base = this.variante() === 'resistencia' ? 'resistencia-lista__grade-item' : 'resistencia-lista__item';
    const classes = [base, `${base}--${SUFIXO_TIPO_DANO[item.tipo]}`];
    if (item.subtipo) {
      classes.push(`${base}--com-subtipo`);
    }
    if (this.abaixoDoMinimo(item)) {
      classes.push(`${base}--abaixo`);
    }
    return classes.join(' ');
  }

  protected iconeTipo(item: FichaCriaturaResistenciaDto): IconeNome {
    return ICONE_TIPO_DANO[item.tipo];
  }

  protected abreviacaoTipo(item: FichaCriaturaResistenciaDto): string {
    return ABREVIACAO[item.tipo];
  }

  protected descricao(item: FichaCriaturaResistenciaDto): string {
    return item.subtipo ? `${item.tipo} · ${item.subtipo}` : item.tipo;
  }

  protected abaixoDoMinimo(item: FichaCriaturaResistenciaDto): boolean {
    const minimo = this.minimo();
    return minimo !== null && item.valor < minimo;
  }

  protected escolherTipo(tipo: TipoDanoEnum): void {
    this.itemForm.controls.tipo.setValue(tipo);
  }

  /** Custo da caixa no Limite e quanto sobraria com ela (Resistências); `null` sem Limite. */
  private orcamentoDaCaixa(): { custo: number; sobram: number; limite: number } | null {
    const limite = this.limite();
    if (limite === null) {
      return null;
    }
    const { tipo, subtipo, valor } = this.itemForm.getRawValue();
    const custo = calcularCustoResistencia({ valor: valor || 0, tipo, ehSubtipo: subtipo.trim() !== '' });
    const indice = this.indiceEmEdicao();
    const original = indice !== null && indice >= 0 ? this.itens()[indice] : null;
    const custoSemEste = this.custoUsado() - (original ? somarCustoResistencias([original]) : 0);
    return { custo, sobram: limite - custoSemEste - custo, limite };
  }

  /** Linha de ajuda da caixa, ao vivo: custo no Limite e quanto sobra (Resistências) ou o mínimo
   * exigido (Fraquezas). */
  protected textoAjuda(): string {
    const orcamento = this.orcamentoDaCaixa();
    if (orcamento) {
      const { tipo, subtipo } = this.itemForm.getRawValue();
      const regra = tipo === TipoDanoEnum.GERAL ? ' (Geral conta 2×)' : subtipo.trim() ? ' (subtipo conta ½)' : '';
      return orcamento.sobram < 0
        ? `Custa ${orcamento.custo} pts${regra} · passa ${-orcamento.sobram} do limite de ${orcamento.limite}`
        : `Custa ${orcamento.custo} pts${regra} · sobram ${orcamento.sobram} de ${orcamento.limite}`;
    }
    const minimo = this.minimo();
    return minimo === null ? '' : `Mínimo ${minimo} (5 ou metade da soma das Resistências)`;
  }

  /** A caixa deixaria a ficha fora da regra (passa do Limite ou abaixo do mínimo). */
  protected ajudaEmAlerta(): boolean {
    const orcamento = this.orcamentoDaCaixa();
    if (orcamento) {
      return orcamento.sobram < 0;
    }
    const minimo = this.minimo();
    return minimo !== null && (this.itemForm.controls.valor.value || 0) < minimo;
  }

  protected adicionar(): void {
    this.itemForm.reset({ tipo: TipoDanoEnum.FISICO, subtipo: '', valor: this.minimo() ?? 0 });
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
    const descricao = this.descricao(item);
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
