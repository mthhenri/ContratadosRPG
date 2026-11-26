import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
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
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Segmentado } from '../../../../shared/ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../../../../shared/ui/segmentado/segmentado-item.component';
import { AutoFocus } from '../../../../shared/auto-focus/auto-focus.directive';
import { rotuloCustoAcao, rotuloCustoAcaoCurto } from '../../rotulos-criatura';

const CUSTOS_ACAO: readonly CustoAcaoEnum[] = Object.values(CustoAcaoEnum) as CustoAcaoEnum[];

/** Um ataque da ficha com o índice original (preservado ao ordenar por nome). */
interface AtaqueIndexado {
  readonly item: FichaCriaturaAtaqueDto;
  readonly indice: number;
}

/** Ataques de um custo de ação, já por nome — um grupo da lista. */
interface GrupoAtaques {
  readonly custo: CustoAcaoEnum;
  readonly titulo: string;
  readonly itens: readonly AtaqueIndexado[];
}

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
    Campo,
    Segmentado,
    SegmentadoItem,
    AutoFocus,
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

  /**
   * Item na caixa de criar/alterar: `-1` é item novo, `null` nenhum. Alterar e excluir ficam em cada
   * cartão, sem modo de edição geral (`criatura-ataques-habilidades-edicao`, pedido do autor).
   */
  protected readonly indiceEmEdicao = signal<number | null>(null);
  /** Já tentou confirmar a caixa inválida — só então o aviso do que falta aparece. */
  protected readonly tentouConfirmar = signal(false);

  /** Grupos compactados (só nome + dadinhos). Não é lembrado: a ficha sempre abre expandida. */
  protected readonly gruposCompactos = signal<ReadonlySet<CustoAcaoEnum>>(new Set());
  /** Ataques abertos por inteiro dentro de um grupo compactado (índice original). */
  protected readonly itensAbertos = signal<ReadonlySet<number>>(new Set());

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

  /**
   * Itens do mais barato ao mais caro (Livre → Movimento → Padrão → Completa → Turno, a ordem de
   * `CustoAcaoEnum`) e por nome dentro do mesmo custo — o mestre acha "o que cabe nesta ação" sem
   * ler a lista inteira (`criatura-ataques-habilidades-leitura`). O índice original é preservado
   * (edição/remoção operam sobre ele).
   */
  protected readonly itensOrdenados = computed<AtaqueIndexado[]>(() =>
    this.itens()
      .map((item, indice) => ({ item, indice }))
      .sort(
        (a, b) =>
          CUSTOS_ACAO.indexOf(a.item.custoAcao) - CUSTOS_ACAO.indexOf(b.item.custoAcao) ||
          a.item.nome.localeCompare(b.item.nome, 'pt-BR', { sensitivity: 'base' }),
      ),
  );

  /** Grupos por custo na ordem de `CustoAcaoEnum` (Livre → Turno), sem os vazios. */
  protected readonly grupos = computed<GrupoAtaques[]>(() =>
    CUSTOS_ACAO.map((custo) => ({
      custo,
      titulo: rotuloCustoAcao(custo),
      itens: this.itensOrdenados().filter((entrada) => entrada.item.custoAcao === custo),
    })).filter((grupo) => grupo.itens.length > 0),
  );

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  /** Classe do selo de custo de ação — Movimento (cinza+glow), Padrão (cor do tema+glow),
   * Completa (branco+glow) e Turno (branco+glow mais largo); Ação Livre fica sem glow. Mesma
   * escala usada no chip de tipo de Habilidade (pedido do autor, 2026-09-18). */
  protected classeMarcaCusto(custo: CustoAcaoEnum): string {
    return `ataque-lista__marca ataque-lista__marca--${custo.toLowerCase()}`;
  }

  protected compacto(custo: CustoAcaoEnum): boolean {
    return this.gruposCompactos().has(custo);
  }

  protected aberto(indice: number): boolean {
    return this.itensAbertos().has(indice);
  }

  /** Compacta/expande um grupo; ao mudar, os ataques abertos daquele grupo voltam a fechar. */
  protected alternarGrupo(custo: CustoAcaoEnum): void {
    this.gruposCompactos.update((atual) => alternarNoConjunto(atual, custo));
    const doGrupo = new Set(this.itens().flatMap((item, indice) => (item.custoAcao === custo ? [indice] : [])));
    this.itensAbertos.update((atual) => new Set([...atual].filter((indice) => !doGrupo.has(indice))));
  }

  /** Abre/fecha um ataque dentro de grupo compactado. */
  protected alternarItem(indice: number): void {
    this.itensAbertos.update((atual) => alternarNoConjunto(atual, indice));
  }

  protected escolherCusto(custo: CustoAcaoEnum): void {
    this.itemForm.controls.custoAcao.setValue(custo);
  }

  protected escolherArea(area: boolean): void {
    this.itemForm.controls.area.setValue(area);
  }

  /** O que falta para confirmar, em texto — vazio quando a caixa está válida. */
  protected faltando(): string {
    const controles = this.itemForm.controls;
    const campos = [
      controles.nome.invalid ? 'nome' : null,
      controles.teste.invalid ? 'teste' : null,
      controles.dano.invalid ? 'dano' : null,
      controles.danoCritico.invalid ? 'dano crítico' : null,
    ].filter((campo) => campo !== null);
    if (!campos.length) {
      return '';
    }
    const ultimo = campos.pop();
    return `Informe ${campos.length ? `${campos.join(', ')} e ${ultimo}` : ultimo}.`;
  }

  /** Esc cancela e Ctrl/Cmd+Enter confirma, de qualquer campo da caixa. */
  protected aoTeclar(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      this.cancelar();
    } else if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      this.confirmar();
    }
  }

  /** Formulário de item novo (`indiceEmEdicao === -1`), montado como 1º item da lista rolável. */
  private readonly formNovo = viewChild<ElementRef<HTMLElement>>('formNovo');

  constructor() {
    // A lista rola por dentro quando a coluna Status está travada na altura da vizinha
    // (`CriaturaVisualizacao`): o formulário de item novo nasce no topo dela, mas a rolagem pode
    // estar deslocada pra baixo (lista longa) — traz ele à vista assim que existir. `nearest` só
    // rola se precisar.
    effect(() => {
      const alvo = this.formNovo()?.nativeElement;
      if (alvo && typeof alvo.scrollIntoView === 'function') {
        alvo.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  protected adicionar(): void {
    this.itemForm.reset({ nome: '', teste: '', custoAcao: CustoAcaoEnum.PADRAO, dano: '', danoCritico: '', area: false, efeito: '' });
    this.tentouConfirmar.set(false);
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const item = this.itens()[indice];
    this.itemForm.reset({ ...item, efeito: item.efeito ?? '' });
    this.tentouConfirmar.set(false);
    this.indiceEmEdicao.set(indice);
  }

  protected cancelar(): void {
    this.indiceEmEdicao.set(null);
  }

  protected confirmar(): void {
    const indice = this.indiceEmEdicao();
    if (indice === null) {
      return;
    }
    if (this.itemForm.invalid) {
      this.tentouConfirmar.set(true);
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
    // Índices mudam ao excluir/criar: os ataques abertos de grupo compactado fecham.
    this.itensAbertos.set(new Set());
    this.itensMudou.emit(itens);
  }
}

/** Cópia do conjunto com `valor` incluído ou retirado. */
function alternarNoConjunto<T>(conjunto: ReadonlySet<T>, valor: T): ReadonlySet<T> {
  const copia = new Set(conjunto);
  if (!copia.delete(valor)) {
    copia.add(valor);
  }
  return copia;
}
