import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  ArquetipoEnum,
  ClasseEnum,
  HabilidadeCategoriaEnum,
  ROTULOS_HABILIDADE_CATEGORIA,
} from '@contratados-rpg/shared/enums';
import type { FichaHabilidadeDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  catalogoHabilidades,
  classeBaseDeHabilidades,
  type HabilidadeCatalogoItemDto,
} from '@contratados-rpg/shared/regras/agente';

import { HoldRepeat } from '../../../../shared/hold-repeat/hold-repeat.directive';
import { FichaHabilidadeSeletor } from '../ficha-habilidade-seletor/ficha-habilidade-seletor.component';
import { rotuloArquetipo, rotuloClasse } from '../../rotulos-ficha';

/** Categoria + rótulo legível para o `<select>` e o chip (rótulos vêm do shared). */
interface OpcaoCategoria {
  readonly valor: HabilidadeCategoriaEnum;
  readonly rotulo: string;
}

const CATEGORIAS: readonly OpcaoCategoria[] = (
  Object.values(HabilidadeCategoriaEnum) as HabilidadeCategoriaEnum[]
).map((valor) => ({ valor, rotulo: ROTULOS_HABILIDADE_CATEGORIA[valor] }));

/**
 * Editor **no próprio lugar** da aba Habilidades (m3-13): a lista `habilidades` do `dados`
 * (`FichaHabilidadeDto`). Adiciona/edita/remove com um formulário inline; um editor por vez.
 *
 * Duas formas de adicionar: **Do sistema** (abre o `FichaHabilidadeSeletor` sobre o catálogo de
 * `shared/regras`, que pré-preenche o editor com a habilidade escolhida — inclusive a `origem`) e
 * **Personalizada** (formulário em branco, texto livre; categorias só-criadas como Personalidade e
 * Especialidade só existem aqui). Cada habilidade tem um botão **Utilizar** que gasta o custo de
 * Energia (custo variável `[X E]` pergunta quanto). Nenhuma regra trava (liberdade total, m3-10; o
 * nome obrigatório é a única validação de forma). Estilos só com tokens do tema (proibição #29).
 */
@Component({
  selector: 'app-ficha-habilidades',
  imports: [NgTemplateOutlet, ReactiveFormsModule, HoldRepeat, FichaHabilidadeSeletor],
  templateUrl: './ficha-habilidades.component.html',
  styleUrl: './ficha-habilidades.component.scss',
})
export class FichaHabilidades {
  readonly habilidades = input.required<readonly FichaHabilidadeDto[]>();
  /** Dono/mestre edita e utiliza; para os demais é só leitura (a página liga por `podeGerenciar`). */
  readonly editavel = input(false);
  /** Classe da ficha — alimenta o catálogo e o rótulo "Classe - NOME". */
  readonly classe = input.required<ClasseEnum>();
  /** Arquétipo da ficha (ou `null`) — alimenta o catálogo e o rótulo "Arquétipo - NOME". */
  readonly arquetipo = input.required<ArquetipoEnum | null>();
  /** Energia atual — o Utilizar subtrai o custo daqui (pode negativar). */
  readonly energiaAtual = input.required<number>();

  /** Emite a lista inteira após qualquer mutação — a página persiste. */
  readonly habilidadesMudou = output<readonly FichaHabilidadeDto[]>();
  /** Emite o custo gasto ao Utilizar uma habilidade — a página aplica à Energia atual. */
  readonly habilidadeUtilizada = output<number>();

  protected readonly categorias = CATEGORIAS;
  /** Enum exposto ao template (cores do chip por categoria). */
  protected readonly Categoria = HabilidadeCategoriaEnum;

  /** Índice em edição: `null` = fechado, `-1` = adicionando um novo item, `≥0` = editando. */
  protected readonly indiceEmEdicao = signal<number | null>(null);
  /** Índice com a confirmação de remoção aberta (inline), ou `null`. */
  protected readonly indiceRemovendo = signal<number | null>(null);
  /** Índice com o mini-campo de custo variável do Utilizar aberto, ou `null`. */
  protected readonly indiceUtilizando = signal<number | null>(null);
  /** `true` quando o seletor "Do sistema" está aberto. */
  protected readonly seletorAberto = signal(false);

  /** Origem (classe/arquétipo/subclasse) do item em edição — preservada do catálogo/edição. */
  private readonly origemRascunho = signal<ClasseEnum | ArquetipoEnum | undefined>(undefined);

  protected readonly habilidadeForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoria: new FormControl(HabilidadeCategoriaEnum.GERAL, { nonNullable: true }),
    custoEnergia: new FormControl(0, { nonNullable: true }),
    /** Marca o custo como variável (`[X E]`) — persiste `custoEnergia: null`. */
    variavel: new FormControl(false, { nonNullable: true }),
    descricao: new FormControl('', { nonNullable: true }),
  });

  /** Custo digitado ao Utilizar uma habilidade de custo variável. */
  protected readonly custoVariavel = new FormControl(0, { nonNullable: true });

  /** Grupos de filtro do catálogo para a ficha (`shared/regras`). */
  protected readonly grupos = computed(() =>
    catalogoHabilidades(this.classe(), this.arquetipo()),
  );

  /** Nomes já na ficha — o seletor marca esses itens como "Na ficha". */
  protected readonly nomesNaFicha = computed(
    () => new Set(this.habilidades().map((habilidade) => habilidade.nome)),
  );

  /** `true` quando o editor aberto é deste índice (`-1` = adicionar). */
  protected editando(indice: number): boolean {
    return this.indiceEmEdicao() === indice;
  }

  /** Abre o seletor do sistema (adicionar do catálogo). */
  protected abrirSeletor(): void {
    this.seletorAberto.set(true);
  }

  protected fecharSeletor(): void {
    this.seletorAberto.set(false);
  }

  /** Escolha do catálogo: pré-preenche o editor inline (com a origem) para revisão antes de salvar. */
  protected aoEscolherDoCatalogo(item: HabilidadeCatalogoItemDto): void {
    this.origemRascunho.set(item.origem);
    this.habilidadeForm.reset({
      nome: item.nome,
      categoria: item.categoria,
      custoEnergia: item.custoEnergia ?? 0,
      variavel: item.custoEnergia === null,
      descricao: item.descricao,
    });
    this.seletorAberto.set(false);
    this.indiceEmEdicao.set(-1);
  }

  /** Abre o formulário de **adição personalizada** (texto livre, sem origem). */
  protected adicionar(): void {
    this.abrirEditor(-1);
  }

  /** Abre o formulário de **edição**, semeando o item existente. */
  protected editar(indice: number): void {
    this.abrirEditor(indice);
  }

  /** Pede confirmação antes de remover — abre a área de confirmação inline. */
  protected pedirRemocao(indice: number): void {
    this.indiceRemovendo.set(indice);
  }

  /** Fecha a confirmação de remoção sem remover. */
  protected cancelarRemocao(): void {
    this.indiceRemovendo.set(null);
  }

  private abrirEditor(indice: number): void {
    const item = indice >= 0 ? this.habilidades()[indice] : null;
    const variavel = item ? item.custoEnergia === null : false;
    this.origemRascunho.set(item?.origem);
    this.habilidadeForm.reset({
      nome: item?.nome ?? '',
      categoria: item?.categoria ?? HabilidadeCategoriaEnum.GERAL,
      custoEnergia: variavel ? 0 : item?.custoEnergia ?? 0,
      variavel,
      descricao: item?.descricao ?? '',
    });
    this.indiceEmEdicao.set(indice);
  }

  /** Fecha o editor sem alterar. */
  protected cancelar(): void {
    this.indiceEmEdicao.set(null);
  }

  /** Passo − / + no custo de Energia em edição (piso 0, sem teto — liberdade total). */
  protected ajustarCusto(delta: number): void {
    const atual = this.habilidadeForm.controls.custoEnergia.value;
    this.habilidadeForm.controls.custoEnergia.setValue(Math.max(0, atual + delta));
  }

  /** Confirma o editor aberto: adiciona (índice −1) ou substitui, e emite a lista. */
  protected confirmar(): void {
    const indice = this.indiceEmEdicao();
    if (indice === null || this.habilidadeForm.invalid) {
      return;
    }
    const bruto = this.habilidadeForm.getRawValue();
    const origem = this.origemRascunho();
    const item: FichaHabilidadeDto = {
      nome: bruto.nome.trim(),
      categoria: bruto.categoria,
      custoEnergia: bruto.variavel ? null : bruto.custoEnergia,
      descricao: bruto.descricao.trim(),
      ...(origem === undefined ? {} : { origem }),
    };
    this.emitir(this.substituir(this.habilidades(), indice, item));
    this.cancelar();
  }

  /** Confirma a remoção: remove a habilidade e emite a lista. Fecha editor/confirmação abertos. */
  protected remover(indice: number): void {
    this.emitir(this.habilidades().filter((_, i) => i !== indice));
    this.indiceRemovendo.set(null);
    if (this.indiceEmEdicao() === indice) {
      this.cancelar();
    }
  }

  /**
   * Utiliza a habilidade, gastando Energia. Custo fixo emite direto; custo variável (`[X E]`) abre
   * um mini-campo perguntando quanto gastar.
   */
  protected utilizar(indice: number, habilidade: FichaHabilidadeDto): void {
    if (habilidade.custoEnergia === null) {
      this.custoVariavel.setValue(0);
      this.indiceUtilizando.set(indice);
      return;
    }
    this.habilidadeUtilizada.emit(habilidade.custoEnergia);
  }

  /** Confirma o gasto de custo variável e fecha o mini-campo. */
  protected confirmarUtilizarVariavel(): void {
    this.habilidadeUtilizada.emit(this.custoVariavel.value);
    this.indiceUtilizando.set(null);
  }

  /** Fecha o mini-campo de custo variável sem gastar. */
  protected cancelarUtilizar(): void {
    this.indiceUtilizando.set(null);
  }

  /** Passo − / + no custo variável em digitação (piso 0). */
  protected ajustarCustoVariavel(delta: number): void {
    this.custoVariavel.setValue(Math.max(0, this.custoVariavel.value + delta));
  }

  /** Custo em notação do documento: `[N E]` / `[0 E]`, ou `[X E]` para custo variável (`null`). */
  protected rotuloCusto(custoEnergia: number | null): string {
    return `[${custoEnergia === null ? 'X' : custoEnergia} E]`;
  }

  /**
   * Rótulo do chip da categoria — nomeia a origem quando a habilidade veio de **outra**
   * classe/arquétipo ("Classe - Especialista"); da própria, só a categoria ("Classe").
   */
  protected rotuloChip(habilidade: FichaHabilidadeDto): string {
    const base = ROTULOS_HABILIDADE_CATEGORIA[habilidade.categoria];
    const origem = habilidade.origem;
    if (origem === undefined) {
      return base;
    }
    if (
      habilidade.categoria === HabilidadeCategoriaEnum.CLASSE &&
      origem !== classeBaseDeHabilidades(this.classe())
    ) {
      return `${base} - ${rotuloClasse(origem as ClasseEnum)}`;
    }
    if (
      habilidade.categoria === HabilidadeCategoriaEnum.ARQUETIPO &&
      origem !== this.arquetipo()
    ) {
      return `${base} - ${rotuloArquetipo(origem as ArquetipoEnum)}`;
    }
    return base;
  }

  /** Substitui o item no índice, ou anexa quando `indice < 0` (adição). */
  private substituir(
    lista: readonly FichaHabilidadeDto[],
    indice: number,
    item: FichaHabilidadeDto,
  ): FichaHabilidadeDto[] {
    if (indice < 0) {
      return [...lista, item];
    }
    return lista.map((atual, i) => (i === indice ? item : atual));
  }

  private emitir(habilidades: readonly FichaHabilidadeDto[]): void {
    this.habilidadesMudou.emit(habilidades);
  }
}
