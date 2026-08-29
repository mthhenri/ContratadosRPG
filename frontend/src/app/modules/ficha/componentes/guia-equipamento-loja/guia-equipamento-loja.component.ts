import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';
import { CATALOGO_CATEGORIAS, CATALOGO_ITENS, type CarrinhoItemDto, type ItemCatalogo } from '@contratados-rpg/shared/regras/compras';

import { Icone, type IconeNome } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { StepInput } from '../../../../shared/ui/stepper/step-input.component';

/** Categorias com item comprável separadamente empilhável (mesmo critério de `ComprasPage`, m1-10). */
const CATEGORIAS_EMPILHAVEIS: readonly ItemCategoriaEnum[] = [ItemCategoriaEnum.OPERACIONAL, ItemCategoriaEnum.MEDICINAL];

/**
 * Ícone de cada categoria do catálogo. **Formatação de UI** — os emojis de `CATALOGO_CATEGORIAS`
 * (fonte do jogo) são proibidos pelo tema "Terminal de Contenção" (proibição #29); aqui se traduz a
 * categoria no glifo do componente `Icone`. Definido localmente (não importado da calculadora) para
 * manter o módulo `ficha` desacoplado — mesmo padrão de `FichaInventario`/`InventarioEsquadrao`.
 */
const ICONES_CATEGORIA: Readonly<Record<ItemCategoriaEnum, IconeNome>> = {
  [ItemCategoriaEnum.CORPO_A_CORPO]: 'corpo-a-corpo',
  [ItemCategoriaEnum.EXPLOSIVOS]: 'explosivos',
  [ItemCategoriaEnum.ARMAS_DE_FOGO]: 'armas-de-fogo',
  [ItemCategoriaEnum.MUNICOES]: 'municoes',
  [ItemCategoriaEnum.PROTECOES]: 'protecoes',
  [ItemCategoriaEnum.EXOTICOS]: 'exoticos',
  [ItemCategoriaEnum.ARMAZENAMENTO]: 'armazenamento',
  [ItemCategoriaEnum.OPERACIONAL]: 'operacional',
  [ItemCategoriaEnum.MEDICINAL]: 'medicinal',
  [ItemCategoriaEnum.AMPLIFICADOR]: 'amplificador',
  [ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR]: 'fragmento-construtor',
  [ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR]: 'fragmento-potencializador',
  [ItemCategoriaEnum.SEM_CATEGORIA]: 'sem-categoria',
};

/** View-model de um cartão do catálogo — texto já formatado, sem lógica de jogo. */
interface CartaoItemVM {
  readonly item: ItemCatalogo;
  /** Categoria de origem — necessária pra `adicionar()` acertar o `CarrinhoItemDto` quando a busca
   *  cruza todas as categorias (não dá mais pra assumir `categoriaAtiva()`). */
  readonly categoria: ItemCategoriaEnum;
  readonly custoTexto: string;
  readonly pesoTexto: string;
  readonly stat: string | null;
  readonly bonus: string | null;
}

/**
 * Catálogo + carrinho do **Equipamento Inicial** (m3-59, passo // EQUIPAMENTO INICIAL do guia de
 * criação). Componente burro (input/output): recebe os itens já escolhidos, devolve a lista inteira
 * a cada mudança — o orçamento ($2500) e o peso (5), a trava dura e o "modo livre" são regra do
 * **passo** (`criar.page.ts`), não deste componente (mesma separação de `FichaHabilidadeSeletor` na
 * m3-58: o seletor não sabe quantas vagas existem, só lista e emite).
 *
 * Reusa o **motor** de compras (`CATALOGO_ITENS`/`CarrinhoItemDto`, `shared/regras/compras`) — nunca
 * uma segunda tabela de itens. A UI (catálogo com busca/categoria + carrinho com quantidade) é nova
 * porque nem a Loja pública (`ComprasPage`, m1-10) nem o editor de Inventário da ficha
 * (`FichaInventario`, m3-14) expõem um catálogo/carrinho **standalone** reutilizável — os dois são
 * componentes monolíticos com responsabilidades irrelevantes aqui (modificações, amplificadores,
 * fragmentos, edição de item existente): embutir qualquer um dos dois só para desabilitar 80% do que
 * oferecem contrariaria "avalie a extração antes de acrescentar responsabilidade" (AGENTS.md). Sem
 * modificações, amplificadores ou fragmentos aqui — fora de escopo do kit inicial (doc: "não se pode
 * modificar itens usando o dinheiro do kit inicial").
 */
@Component({
  selector: 'app-guia-equipamento-loja',
  imports: [ReactiveFormsModule, OverflowFade, Icone, StepInput],
  templateUrl: './guia-equipamento-loja.component.html',
  styleUrl: './guia-equipamento-loja.component.scss',
})
export class GuiaEquipamentoLoja {
  /** Itens já escolhidos para o kit — controlado pelo passo, este componente nunca guarda estado próprio. */
  readonly itens = input.required<readonly CarrinhoItemDto[]>();
  /** Emite a lista inteira a cada adição/remoção/ajuste de quantidade. */
  readonly itensMudaram = output<readonly CarrinhoItemDto[]>();

  /** Só as categorias com item de verdade no catálogo (exclui Amplificador/Fragmentos, vazios aqui). */
  protected readonly categorias = computed(() => CATALOGO_CATEGORIAS.filter((c) => (CATALOGO_ITENS[c.categoria]?.length ?? 0) > 0));
  protected readonly iconesCategoria = ICONES_CATEGORIA;
  protected readonly categoriaAtiva = signal<ItemCategoriaEnum>(ItemCategoriaEnum.CORPO_A_CORPO);
  protected readonly busca = new FormControl('', { nonNullable: true });
  private readonly buscaTexto = signal('');

  constructor() {
    this.busca.valueChanges.subscribe((valor) => this.buscaTexto.set(valor));
  }

  /** Com busca ativa, cruza **todas** as categorias (não só a aba selecionada) — mesmo padrão de
   *  `FichaInventario`: a busca de item não depende de nenhuma categoria estar escolhida. */
  protected readonly cartoesCatalogo = computed<readonly CartaoItemVM[]>(() => {
    const termo = this.buscaTexto().trim().toLowerCase();
    const bruto: { readonly item: ItemCatalogo; readonly categoria: ItemCategoriaEnum }[] = [];
    if (termo) {
      for (const categoria of this.categorias()) {
        for (const item of CATALOGO_ITENS[categoria.categoria] ?? []) {
          if (item.nome.toLowerCase().includes(termo)) {
            bruto.push({ item, categoria: categoria.categoria });
          }
        }
      }
    } else {
      const categoria = this.categoriaAtiva();
      for (const item of CATALOGO_ITENS[categoria] ?? []) {
        bruto.push({ item, categoria });
      }
    }
    return bruto.map(({ item, categoria }) => ({
      item,
      categoria,
      custoTexto: this.formatarDinheiro(item.custo),
      pesoTexto: `${this.formatarPeso(item.peso)} slot${item.peso !== 1 ? 's' : ''}`,
      stat: this.formatarStat(item),
      bonus: item.bonus ?? null,
    }));
  });

  protected selecionarCategoria(categoria: ItemCategoriaEnum): void {
    this.categoriaAtiva.set(categoria);
  }

  protected rotuloCategoria(categoria: ItemCategoriaEnum): string {
    return CATALOGO_CATEGORIAS.find((c) => c.categoria === categoria)?.rotulo ?? '';
  }

  /** Adiciona 1 unidade — empilha em categoria empilhável se o mesmo item já está no carrinho.
   *  `categoria` vem do cartão (não de `categoriaAtiva()`): com busca ativa, o resultado pode ser de
   *  qualquer categoria do catálogo. */
  protected adicionar(item: ItemCatalogo, categoria: ItemCategoriaEnum): void {
    const atual = this.itens();
    const indiceExistente = CATEGORIAS_EMPILHAVEIS.includes(categoria)
      ? atual.findIndex((existente) => existente.categoria === categoria && existente.nome === item.nome)
      : -1;
    if (indiceExistente >= 0) {
      this.itensMudaram.emit(atual.map((existente, indice) => indice === indiceExistente ? { ...existente, quantidade: existente.quantidade + 1 } : existente));
      return;
    }
    const novo: CarrinhoItemDto = { nome: item.nome, categoria, custo: item.custo, peso: item.peso, quantidade: 1, guardada: false, modificacoes: [] };
    this.itensMudaram.emit([...atual, novo]);
  }

  protected aumentar(indice: number): void {
    this.itensMudaram.emit(this.itens().map((item, atual) => atual === indice ? { ...item, quantidade: item.quantidade + 1 } : item));
  }

  /** Reduz 1 unidade; some do carrinho ao chegar em zero. */
  protected diminuir(indice: number): void {
    const item = this.itens()[indice];
    if (!item) return;
    if (item.quantidade > 1) {
      this.itensMudaram.emit(this.itens().map((atual, i) => i === indice ? { ...atual, quantidade: atual.quantidade - 1 } : atual));
      return;
    }
    this.remover(indice);
  }

  protected definirQuantidade(indice: number, quantidade: number): void {
    if (quantidade <= 0) {
      this.remover(indice);
      return;
    }
    this.itensMudaram.emit(
      this.itens().map((item, atual) => atual === indice ? { ...item, quantidade } : item),
    );
  }

  protected remover(indice: number): void {
    this.itensMudaram.emit(this.itens().filter((_, i) => i !== indice));
  }

  protected formatarDinheiro(valor: number): string {
    return `$${valor.toLocaleString('pt-BR')}`;
  }

  protected formatarPeso(valor: number): string {
    return valor % 1 === 0 ? String(valor) : valor.toFixed(1);
  }

  private formatarStat(item: ItemCatalogo): string | null {
    if (item.dano) return `Dano ${item.dano}${item.informacao ? ` · ${item.informacao}` : ''}`;
    if (item.resistencia) return `Resist. ${item.resistencia}`;
    return null;
  }
}
