import { Component, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { HabilidadeTipoCriaturaEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaHabilidadeDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { rotuloHabilidadeTipoCriatura } from '../../rotulos-criatura';

const TIPOS: readonly HabilidadeTipoCriaturaEnum[] = Object.values(HabilidadeTipoCriaturaEnum) as HabilidadeTipoCriaturaEnum[];

/** Editor no próprio lugar da lista `habilidades` (Habilidades Especiais) da ficha de criatura (m4-04b). */
@Component({
  selector: 'app-criatura-habilidade-lista',
  imports: [ReactiveFormsModule, Botao, Icone, Tooltip, NgTemplateOutlet],
  templateUrl: './criatura-habilidade-lista.component.html',
  styleUrl: './criatura-habilidade-lista.component.scss',
})
export class CriaturaHabilidadeLista {
  readonly itens = input.required<readonly FichaCriaturaHabilidadeDto[]>();
  readonly editavel = input(false);

  readonly itensMudou = output<readonly FichaCriaturaHabilidadeDto[]>();

  protected readonly tipos = TIPOS;
  protected readonly rotuloTipo = rotuloHabilidadeTipoCriatura;

  protected readonly indiceEmEdicao = signal<number | null>(null);
  protected readonly indiceRemovendo = signal<number | null>(null);
  /** Editar/remover por item só aparece dentro deste modo — evita os ícones ficarem sempre
   * visíveis; o autor entra e sai dele de propósito (botão "Editar"/"Concluir" no cabeçalho). */
  protected readonly modoEdicao = signal(false);

  protected readonly itemForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipo: new FormControl(HabilidadeTipoCriaturaEnum.PASSIVA, { nonNullable: true }),
    descricao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    restricao: new FormControl('', { nonNullable: true }),
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
    this.itemForm.reset({ nome: '', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: '', restricao: '' });
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const item = this.itens()[indice];
    this.itemForm.reset({ nome: item.nome, tipo: item.tipo, descricao: item.descricao, restricao: item.restricao ?? '' });
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
    const item: FichaCriaturaHabilidadeDto = {
      nome: bruto.nome.trim(),
      tipo: bruto.tipo,
      descricao: bruto.descricao.trim(),
      ...(bruto.restricao.trim() ? { restricao: bruto.restricao.trim() } : {}),
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

  private substituir(
    lista: readonly FichaCriaturaHabilidadeDto[],
    indice: number,
    item: FichaCriaturaHabilidadeDto,
  ): FichaCriaturaHabilidadeDto[] {
    return indice < 0 ? [...lista, item] : lista.map((atual, i) => (i === indice ? item : atual));
  }

  private emitir(itens: readonly FichaCriaturaHabilidadeDto[]): void {
    this.itensMudou.emit(itens);
  }
}
