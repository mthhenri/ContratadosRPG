import { Component, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CustoAcaoEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto, FichaCriaturaAtaqueDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { rotuloCustoAcao, rotuloCustoAcaoCurto } from '../../rotulos-criatura';

const ATRIBUTOS: readonly (keyof FichaAtributosDto)[] = [
  'destreza', 'forca', 'luta', 'pontaria', 'vigor', 'intelecto', 'medicina', 'sentidos', 'social', 'vontade',
];
const CUSTOS_ACAO: readonly CustoAcaoEnum[] = Object.values(CustoAcaoEnum) as CustoAcaoEnum[];
const TIPOS_DANO: readonly TipoDanoEnum[] = Object.values(TipoDanoEnum) as TipoDanoEnum[];

/** Editor no próprio lugar da lista `ataques` da ficha de criatura (m4-04b), com botão de rolagem por linha. */
@Component({
  selector: 'app-criatura-ataque-lista',
  imports: [ReactiveFormsModule, Icone, Tooltip, NgTemplateOutlet],
  templateUrl: './criatura-ataque-lista.component.html',
  styleUrl: './criatura-ataque-lista.component.scss',
})
export class CriaturaAtaqueLista {
  readonly itens = input.required<readonly FichaCriaturaAtaqueDto[]>();
  readonly editavel = input(false);

  readonly itensMudou = output<readonly FichaCriaturaAtaqueDto[]>();
  /** Emite o ataque clicado — quem monta este componente (Task 9) executa a rolagem de verdade. */
  readonly rolarAtaque = output<FichaCriaturaAtaqueDto>();
  /** Botão "Teste" do card — mesmo teste de Atributo Efetivo da coluna de Atributos
   * (`ataque.atributo` decide a chave), só exposto no contexto do ataque. */
  readonly testarAtaque = output<FichaCriaturaAtaqueDto>();

  protected readonly atributos = ATRIBUTOS;
  protected readonly custosAcao = CUSTOS_ACAO;
  protected readonly tiposDano = TIPOS_DANO;
  protected readonly rotuloCustoAcao = rotuloCustoAcao;
  protected readonly rotuloCustoAcaoCurto = rotuloCustoAcaoCurto;

  protected readonly indiceEmEdicao = signal<number | null>(null);
  protected readonly indiceRemovendo = signal<number | null>(null);
  /** Editar/remover por item só aparece dentro deste modo — evita os ícones ficarem sempre
   * visíveis; o autor entra e sai dele de propósito (botão "Editar"/"Concluir" no cabeçalho). */
  protected readonly modoEdicao = signal(false);

  protected readonly itemForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    atributo: new FormControl<keyof FichaAtributosDto>('luta', { nonNullable: true }),
    custoAcao: new FormControl(CustoAcaoEnum.PADRAO, { nonNullable: true }),
    dano: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipoDano: new FormControl(TipoDanoEnum.FISICO, { nonNullable: true }),
    area: new FormControl(false, { nonNullable: true }),
    efeito: new FormControl('', { nonNullable: true }),
  });

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  protected alternarModoEdicao(): void {
    this.modoEdicao.update((valor) => !valor);
    if (!this.modoEdicao()) {
      this.cancelar();
      this.cancelarRemocao();
    }
  }

  protected adicionar(): void {
    this.itemForm.reset({ nome: '', atributo: 'luta', custoAcao: CustoAcaoEnum.PADRAO, dano: '', tipoDano: TipoDanoEnum.FISICO, area: false, efeito: '' });
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const item = this.itens()[indice];
    this.itemForm.reset({ ...item, efeito: item.efeito ?? '' });
    this.indiceEmEdicao.set(indice);
  }

  protected cancelar(): void {
    this.indiceEmEdicao.set(null);
  }

  protected pedirRemocao(indice: number): void {
    this.indiceRemovendo.set(indice);
  }

  protected cancelarRemocao(): void {
    this.indiceRemovendo.set(null);
  }

  protected confirmar(): void {
    const indice = this.indiceEmEdicao();
    if (indice === null || this.itemForm.invalid) {
      return;
    }
    const bruto = this.itemForm.getRawValue();
    const item: FichaCriaturaAtaqueDto = {
      nome: bruto.nome.trim(),
      atributo: bruto.atributo,
      custoAcao: bruto.custoAcao,
      dano: bruto.dano.trim(),
      tipoDano: bruto.tipoDano,
      area: bruto.area,
      ...(bruto.efeito.trim() ? { efeito: bruto.efeito.trim() } : {}),
    };
    this.emitir(this.substituir(this.itens(), indice, item));
    this.cancelar();
  }

  protected remover(indice: number): void {
    this.emitir(this.itens().filter((_, i) => i !== indice));
    this.indiceRemovendo.set(null);
    if (this.indiceEmEdicao() === indice) {
      this.cancelar();
    }
  }

  protected rolar(item: FichaCriaturaAtaqueDto): void {
    this.rolarAtaque.emit(item);
  }

  protected testar(item: FichaCriaturaAtaqueDto): void {
    this.testarAtaque.emit(item);
  }

  private substituir(
    lista: readonly FichaCriaturaAtaqueDto[],
    indice: number,
    item: FichaCriaturaAtaqueDto,
  ): FichaCriaturaAtaqueDto[] {
    return indice < 0 ? [...lista, item] : lista.map((atual, i) => (i === indice ? item : atual));
  }

  private emitir(itens: readonly FichaCriaturaAtaqueDto[]): void {
    this.itensMudou.emit(itens);
  }
}
