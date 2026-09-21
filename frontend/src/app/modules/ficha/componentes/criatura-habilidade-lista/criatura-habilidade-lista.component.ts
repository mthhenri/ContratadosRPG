import { Component, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { HabilidadeTipoCriaturaEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaHabilidadeDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { HabilidadeDescricao } from '../habilidade-descricao/habilidade-descricao.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { rotuloHabilidadeTipoCriatura } from '../../rotulos-criatura';

const TIPOS: readonly HabilidadeTipoCriaturaEnum[] = Object.values(HabilidadeTipoCriaturaEnum) as HabilidadeTipoCriaturaEnum[];

/** Editor no próprio lugar da lista `habilidades` (Habilidades Especiais) da ficha de criatura (m4-04b). */
@Component({
  selector: 'app-criatura-habilidade-lista',
  imports: [
    ReactiveFormsModule,
    Botao,
    BotaoIcone,
    EditorMarkdown,
    HabilidadeDescricao,
    Icone,
    Tooltip,
    NgTemplateOutlet,
    EstadoVazio,
    OverflowFade,
  ],
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
  /** Editar/remover por item só aparece dentro deste modo — evita os ícones ficarem sempre
   * visíveis; o autor entra e sai dele de propósito (botão "Editar"/"Concluir" no cabeçalho). */
  protected readonly modoEdicao = signal(false);

  private readonly confirmacaoService = inject(ConfirmacaoService);

  protected readonly itemForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipo: new FormControl(HabilidadeTipoCriaturaEnum.PASSIVA, { nonNullable: true }),
    descricao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    restricao: new FormControl('', { nonNullable: true }),
  });

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  /** Classe do chip de tipo — Passiva (branco+glow), Gatilho (cinza+glow) e Ativa (cor do
   * tema+glow), mesma escala usada no selo de custo de ação de `criatura-ataque-lista` (pedido
   * do autor, 2026-09-18). */
  protected classeChipTipo(tipo: HabilidadeTipoCriaturaEnum): string {
    return `habilidade-lista__chip habilidade-lista__chip--${tipo.toLowerCase()}`;
  }

  protected alternarModoEdicao(): void {
    this.modoEdicao.update((valor) => !valor);
    if (!this.modoEdicao()) {
      this.cancelar();
    }
  }

  /** Formulário de item novo (`indiceEmEdicao === -1`), montado no fim da lista rolável. */
  private readonly formNovo = viewChild<ElementRef<HTMLElement>>('formNovo');

  constructor() {
    // A lista rola por dentro quando a coluna Status está travada na altura da vizinha
    // (`CriaturaVisualizacao`): o formulário de item novo nasce no fim dela e pode ficar abaixo da
    // dobra — traz ele à vista assim que existir. `nearest` só rola se precisar.
    effect(() => {
      const alvo = this.formNovo()?.nativeElement;
      if (alvo && typeof alvo.scrollIntoView === 'function') {
        alvo.scrollIntoView({ block: 'nearest' });
      }
    });
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

  protected async remover(indice: number): Promise<void> {
    const item = this.itens()[indice];
    const confirmado = await this.confirmacaoService.confirmar({
      titulo: 'Remover habilidade?',
      mensagem: `Remover ${item.nome}? Esta ação não pode ser desfeita.`,
      entidade: item.nome,
      severidade: 'perigo',
      rotuloConfirmar: 'Remover habilidade',
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
