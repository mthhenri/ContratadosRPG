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
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Segmentado } from '../../../../shared/ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../../../../shared/ui/segmentado/segmentado-item.component';
import { AutoFocus } from '../../../../shared/auto-focus/auto-focus.directive';
import { rotuloHabilidadeTipoCriatura } from '../../rotulos-criatura';


/** Uma habilidade da ficha com o índice original (preservado ao ordenar por nome). */
interface HabilidadeIndexada {
  readonly item: FichaCriaturaHabilidadeDto;
  readonly indice: number;
}

/** Habilidades de um tipo, já em ordem alfabética — um grupo da lista. */
interface GrupoHabilidades {
  readonly tipo: HabilidadeTipoCriaturaEnum;
  readonly titulo: string;
  readonly itens: readonly HabilidadeIndexada[];
}

/**
 * Ordem dos grupos na mesa (`criatura-ataques-habilidades-leitura`): o que a criatura **faz** no turno,
 * depois a que ela **reage**, por fim o que vale **sempre**.
 */
const GRUPOS: readonly { readonly tipo: HabilidadeTipoCriaturaEnum; readonly titulo: string }[] = [
  { tipo: HabilidadeTipoCriaturaEnum.ATIVA, titulo: 'Ativas' },
  { tipo: HabilidadeTipoCriaturaEnum.GATILHO, titulo: 'Gatilhos' },
  { tipo: HabilidadeTipoCriaturaEnum.PASSIVA, titulo: 'Passivas' },
];

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
    Campo,
    Segmentado,
    SegmentadoItem,
    AutoFocus,
  ],
  templateUrl: './criatura-habilidade-lista.component.html',
  styleUrl: './criatura-habilidade-lista.component.scss',
})
export class CriaturaHabilidadeLista {
  readonly itens = input.required<readonly FichaCriaturaHabilidadeDto[]>();
  readonly editavel = input(false);

  readonly itensMudou = output<readonly FichaCriaturaHabilidadeDto[]>();

  /** Tipos na ordem dos grupos — também a ordem do seletor de tipo da caixa. */
  protected readonly tipos = GRUPOS.map((grupo) => grupo.tipo);
  protected readonly rotuloTipo = rotuloHabilidadeTipoCriatura;

  /**
   * Item na caixa de criar/alterar: `-1` é item novo, `null` nenhum. Alterar e excluir ficam em cada
   * cartão, sem modo de edição geral (`criatura-ataques-habilidades-edicao`, pedido do autor).
   */
  protected readonly indiceEmEdicao = signal<number | null>(null);
  /** Já tentou confirmar a caixa inválida — só então o aviso do que falta aparece. */
  protected readonly tentouConfirmar = signal(false);

  /** Grupos compactados (só nomes). Não é lembrado: a ficha sempre abre expandida (decisão do autor). */
  protected readonly gruposCompactos = signal<ReadonlySet<HabilidadeTipoCriaturaEnum>>(new Set());
  /** Itens abertos por inteiro dentro de um grupo compactado (índice original). */
  protected readonly itensAbertos = signal<ReadonlySet<number>>(new Set());

  private readonly confirmacaoService = inject(ConfirmacaoService);

  protected readonly itemForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipo: new FormControl(HabilidadeTipoCriaturaEnum.PASSIVA, { nonNullable: true }),
    descricao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    restricao: new FormControl('', { nonNullable: true }),
  });

  /** Itens ordenados por nome, com o índice original preservado (edição/remoção operam sobre ele). */
  protected readonly itensOrdenados = computed<HabilidadeIndexada[]>(() =>
    this.itens()
      .map((item, indice) => ({ item, indice }))
      .sort((a, b) => a.item.nome.localeCompare(b.item.nome, 'pt-BR', { sensitivity: 'base' })),
  );

  /** Grupos por tipo na ordem de `GRUPOS`, sem os vazios; alfabética dentro de cada um. */
  protected readonly grupos = computed<GrupoHabilidades[]>(() =>
    GRUPOS.map(({ tipo, titulo }) => ({
      tipo,
      titulo,
      itens: this.itensOrdenados().filter((entrada) => entrada.item.tipo === tipo),
    })).filter((grupo) => grupo.itens.length > 0),
  );

  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  /** Classe do chip de tipo — Passiva (branco+glow), Gatilho (cinza+glow) e Ativa (cor do
   * tema+glow), mesma escala usada no selo de custo de ação de `criatura-ataque-lista` (pedido
   * do autor, 2026-09-18). */
  protected classeChipTipo(tipo: HabilidadeTipoCriaturaEnum): string {
    return `habilidade-lista__chip habilidade-lista__chip--${tipo.toLowerCase()}`;
  }

  protected compacto(tipo: HabilidadeTipoCriaturaEnum): boolean {
    return this.gruposCompactos().has(tipo);
  }

  protected aberto(indice: number): boolean {
    return this.itensAbertos().has(indice);
  }

  /** Compacta/expande um grupo; ao mudar, os itens abertos daquele grupo voltam a fechar. */
  protected alternarGrupo(tipo: HabilidadeTipoCriaturaEnum): void {
    this.gruposCompactos.update((atual) => alternarNoConjunto(atual, tipo));
    const doGrupo = new Set(this.itens().flatMap((item, indice) => (item.tipo === tipo ? [indice] : [])));
    this.itensAbertos.update((atual) => new Set([...atual].filter((indice) => !doGrupo.has(indice))));
  }

  /** Abre/fecha um item dentro de grupo compactado. */
  protected alternarItem(indice: number): void {
    this.itensAbertos.update((atual) => alternarNoConjunto(atual, indice));
  }

  protected escolherTipo(tipo: HabilidadeTipoCriaturaEnum): void {
    this.itemForm.controls.tipo.setValue(tipo);
  }

  /** O que falta para confirmar, em texto — vazio quando a caixa está válida. */
  protected faltando(): string {
    const campos = [
      this.itemForm.controls.nome.invalid ? 'nome' : null,
      this.itemForm.controls.descricao.invalid ? 'descrição' : null,
    ].filter((campo) => campo !== null);
    return campos.length ? `Informe ${campos.join(' e ')}.` : '';
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
    this.itemForm.reset({ nome: '', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: '', restricao: '' });
    this.tentouConfirmar.set(false);
    this.indiceEmEdicao.set(-1);
  }

  protected editar(indice: number): void {
    const item = this.itens()[indice];
    this.itemForm.reset({ nome: item.nome, tipo: item.tipo, descricao: item.descricao, restricao: item.restricao ?? '' });
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
    // Índices mudam ao excluir/criar: os itens abertos de grupo compactado fecham.
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
