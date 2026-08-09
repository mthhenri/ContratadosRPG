import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';
import { CATALOGO_CATEGORIAS, CATALOGO_ITENS, type CarrinhoItemDto, type ItemCatalogo } from '@contratados-rpg/shared/regras/compras';

import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';

/** Categorias com item comprável separadamente empilhável (mesmo critério de `ComprasPage`, m1-10). */
const CATEGORIAS_EMPILHAVEIS: readonly ItemCategoriaEnum[] = [ItemCategoriaEnum.OPERACIONAL, ItemCategoriaEnum.MEDICINAL];

/** View-model de um cartão do catálogo — texto já formatado, sem lógica de jogo. */
interface CartaoItemVM {
  readonly item: ItemCatalogo;
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
  imports: [ReactiveFormsModule, OverflowFade],
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
  protected readonly categoriaAtiva = signal<ItemCategoriaEnum>(ItemCategoriaEnum.CORPO_A_CORPO);
  protected readonly busca = new FormControl('', { nonNullable: true });
  private readonly buscaTexto = signal('');

  constructor() {
    this.busca.valueChanges.subscribe((valor) => this.buscaTexto.set(valor));
  }

  protected readonly cartoesCatalogo = computed<readonly CartaoItemVM[]>(() => {
    const termo = this.buscaTexto().trim().toLowerCase();
    const lista = CATALOGO_ITENS[this.categoriaAtiva()] ?? [];
    return lista
      .filter((item) => !termo || item.nome.toLowerCase().includes(termo))
      .map((item) => ({
        item,
        custoTexto: this.formatarDinheiro(item.custo),
        pesoTexto: `${this.formatarPeso(item.peso)} slot${item.peso !== 1 ? 's' : ''}`,
        stat: this.formatarStat(item),
        bonus: item.bonus ?? null,
      }));
  });

  protected selecionarCategoria(categoria: ItemCategoriaEnum): void {
    this.categoriaAtiva.set(categoria);
    this.busca.setValue('');
  }

  protected rotuloCategoria(categoria: ItemCategoriaEnum): string {
    return CATALOGO_CATEGORIAS.find((c) => c.categoria === categoria)?.rotulo ?? '';
  }

  /** Adiciona 1 unidade — empilha em categoria empilhável se o mesmo item já está no carrinho. */
  protected adicionar(item: ItemCatalogo): void {
    const categoria = this.categoriaAtiva();
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
