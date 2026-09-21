import { Component, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CustoAcaoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaAtaqueDto } from '@contratados-rpg/shared/dtos/ficha';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { rotuloCustoAcao, rotuloCustoAcaoCurto } from '../../rotulos-criatura';

const CUSTOS_ACAO: readonly CustoAcaoEnum[] = Object.values(CustoAcaoEnum) as CustoAcaoEnum[];

/** Editor no próprio lugar da lista `ataques` da ficha de criatura (m4-04b), com botão de rolagem por linha. */
@Component({
  selector: 'app-criatura-ataque-lista',
  imports: [
    ReactiveFormsModule,
    Botao,
    BotaoIcone,
    EditorMarkdown,
    Icone,
    Tooltip,
    NgTemplateOutlet,
    EstadoVazio,
    OverflowFade,
  ],
  templateUrl: './criatura-ataque-lista.component.html',
  styleUrl: './criatura-ataque-lista.component.scss',
})
export class CriaturaAtaqueLista {
  readonly itens = input.required<readonly FichaCriaturaAtaqueDto[]>();
  readonly editavel = input(false);

  readonly itensMudou = output<readonly FichaCriaturaAtaqueDto[]>();
  /** Emite o ataque clicado — quem monta este componente (Task 9) executa a rolagem de verdade. */
  readonly rolarAtaque = output<FichaCriaturaAtaqueDto>();
  /** Botão "Teste" do card — rola `ataque.teste` (expressão livre, ajuste pós-mockup). */
  readonly testarAtaque = output<FichaCriaturaAtaqueDto>();
  /** Botão "Crítico" do card — rola `ataque.danoCritico` (expressão livre e independente de
   * `dano`, não o dobro automático) — sempre disponível, todo ataque de criatura ganha o botão. */
  readonly rolarAtaqueCritico = output<FichaCriaturaAtaqueDto>();

  protected readonly custosAcao = CUSTOS_ACAO;
  protected readonly rotuloCustoAcao = rotuloCustoAcao;
  protected readonly rotuloCustoAcaoCurto = rotuloCustoAcaoCurto;

  protected readonly indiceEmEdicao = signal<number | null>(null);
  /** Editar/remover por item só aparece dentro deste modo — evita os ícones ficarem sempre
   * visíveis; o autor entra e sai dele de propósito (botão "Editar"/"Concluir" no cabeçalho). */
  protected readonly modoEdicao = signal(false);

  private readonly confirmacaoService = inject(ConfirmacaoService);

  protected readonly itemForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    teste: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    custoAcao: new FormControl(CustoAcaoEnum.PADRAO, { nonNullable: true }),
    dano: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    danoCritico: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    area: new FormControl(false, { nonNullable: true }),
    efeito: new FormControl('', { nonNullable: true }),
  });

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  /** Classe do selo de custo de ação — Movimento (cinza+glow), Padrão (cor do tema+glow),
   * Completa (branco+glow) e Turno (branco+glow mais largo); Ação Livre fica sem glow. Mesma
   * escala usada no chip de tipo de Habilidade (pedido do autor, 2026-09-18). */
  protected classeMarcaCusto(custo: CustoAcaoEnum): string {
    return `ataque-lista__marca ataque-lista__marca--${custo.toLowerCase()}`;
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
    this.itemForm.reset({ nome: '', teste: '', custoAcao: CustoAcaoEnum.PADRAO, dano: '', danoCritico: '', area: false, efeito: '' });
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

  protected confirmar(): void {
    const indice = this.indiceEmEdicao();
    if (indice === null || this.itemForm.invalid) {
      return;
    }
    const bruto = this.itemForm.getRawValue();
    const item: FichaCriaturaAtaqueDto = {
      nome: bruto.nome.trim(),
      teste: bruto.teste.trim(),
      custoAcao: bruto.custoAcao,
      dano: bruto.dano.trim(),
      danoCritico: bruto.danoCritico.trim(),
      area: bruto.area,
      ...(bruto.efeito.trim() ? { efeito: bruto.efeito.trim() } : {}),
    };
    this.emitir(this.substituir(this.itens(), indice, item));
    this.cancelar();
  }

  protected async remover(indice: number): Promise<void> {
    const item = this.itens()[indice];
    const confirmado = await this.confirmacaoService.confirmar({
      titulo: 'Remover ataque?',
      mensagem: `Remover ${item.nome}? Esta ação não pode ser desfeita.`,
      entidade: item.nome,
      severidade: 'perigo',
      rotuloConfirmar: 'Remover ataque',
    });
    if (!confirmado) {
      return;
    }
    this.emitir(this.itens().filter((_, i) => i !== indice));
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

  protected criticar(item: FichaCriaturaAtaqueDto): void {
    this.rolarAtaqueCritico.emit(item);
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
