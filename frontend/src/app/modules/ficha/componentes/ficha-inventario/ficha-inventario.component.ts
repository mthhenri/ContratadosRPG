import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';
import type { FichaInventarioDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  AMPLIFICADORES,
  AmplificadorAplicadoDto,
  calcularCustoAmplificador,
  calcularResumoCompras,
  calcularStatItem,
  CarrinhoItemDto,
  CATALOGO_CATEGORIAS,
  CATALOGO_ITENS,
  contarComprasModificacao,
  ItemCatalogo,
  listarModificacoesDisponiveis,
  MODIFICACOES,
  ModificacaoDados,
  obterCategoriaEmprestada,
  obterCustoModificacao,
  obterLimiteModificacoes,
  obterPesoModificacao,
  PENALIDADE_VONTADE_POR_EMPILHAMENTO,
  StatItemDto,
  verificarConflitoModificacao,
} from '@contratados-rpg/shared/regras/compras';

import { Icone, IconeNome } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';

/**
 * Ícone de linha de cada categoria do catálogo (mesma escolha de `calculadora/rotulos.ts`).
 * **Formatação de UI** — os emojis de `CATALOGO_CATEGORIAS` (fonte do jogo) são proibidos pelo tema
 * "Terminal de Contenção" (proibição #29); aqui se traduz a categoria no glifo do componente `Icone`.
 * Definido localmente (não importado da calculadora) para manter o módulo `ficha` desacoplado.
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
};

/** Categorias com item comprável separadamente empilhável (várias unidades do mesmo item). */
const CATEGORIAS_EMPILHAVEIS: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.OPERACIONAL,
  ItemCategoriaEnum.MEDICINAL,
];

/** Cartão de item do catálogo (view-model do passo "adicionar"). */
interface CartaoItemVM {
  readonly item: ItemCatalogo;
  readonly categoria: ItemCategoriaEnum;
  readonly custoTexto: string;
  readonly pesoTexto: string;
  readonly stat: string | null;
  readonly bonus: string | null;
  readonly descricao: string | null;
}

/** Cartão de amplificador do catálogo. */
interface CartaoAmpVM {
  readonly nome: string;
  readonly efeito: string;
  readonly empilhamentosAtuais: number;
  readonly maximoEfetivo: number;
  readonly podeAdicionar: boolean;
  readonly custoTexto: string;
}

/** Uma modificação já aplicada, exibida acima do painel (chip com −/+). */
interface ModAtivaVM {
  readonly nome: string;
  readonly empilhamentos: number;
  readonly custoTexto: string;
  readonly podeAumentar: boolean;
}

/** Uma entrada do painel de modificações (mod disponível para o item). */
interface EntradaModVM {
  readonly nome: string;
  readonly descricao: string;
  readonly bloqueia: readonly string[];
  readonly pontos: readonly boolean[];
  readonly custoTexto: string;
  readonly motivo: string;
  readonly podeAdicionar: boolean;
  readonly bloqueada: boolean;
  readonly ativa: boolean;
}

/** Uma seção do painel de modificações (própria da categoria ou emprestada via "Faz Parte"/"Combativo"). */
interface SecaoModVM {
  readonly titulo: string | null;
  readonly entradas: readonly EntradaModVM[];
}

/** Item do inventário renderizado (view-model). O `indice` referencia a posição na lista real. */
interface ItemInventarioVM {
  readonly indice: number;
  readonly nome: string;
  readonly categoriaRotulo: string;
  readonly quantidade: number;
  readonly custoTotalTexto: string;
  readonly pesoTexto: string;
  readonly stat: string | null;
  readonly ehArmazenamento: boolean;
  readonly guardada: boolean;
  readonly modsUsados: number;
  readonly maxModificacoes: number;
  readonly temMods: boolean;
  readonly painelAberto: boolean;
  readonly modsAtivas: readonly ModAtivaVM[];
  readonly secoes: readonly SecaoModVM[];
}

/** Amplificador renderizado no inventário. */
interface AmpInventarioVM {
  readonly nome: string;
  readonly efeito: string;
  readonly empilhamentos: number;
  readonly maximoEfetivo: number;
  readonly custoTexto: string;
  readonly penalidade: number;
  readonly podeAumentar: boolean;
}

/**
 * Editor **no próprio lugar** da aba Inventário (m3-14): o `inventario` do `dados` — itens (com
 * modificações) + amplificadores acoplados —, **reusando o formato do carrinho da calculadora M1**
 * (`FichaInventarioDto` = `CarrinhoItemDto[]` + `AmplificadorAplicadoDto[]`, os mesmos contratos de
 * `shared/regras/compras`, sem tipo duplicado — m3-01). Monta e edita o inventário reaproveitando o
 * catálogo, as modificações e os amplificadores das compras.
 *
 * **Nenhuma regra de jogo vive aqui** (proibições #26/#27): limite de modificações por patente, custo
 * e peso de modificação, conflitos, stat computado de item, custo de amplificador e todos os totais
 * vêm de `shared/regras/compras` (fonte única — SYSTEM.SPEC §6.6, motor pronto desde a m1-05). O
 * componente é **controlado**: cada mutação emite o `FichaInventarioDto` inteiro e a página persiste
 * otimista + em lote (padrão granular de m3-10/m3-12/m3-13). O **Inventário máximo** (`Força × 5`)
 * entra como referência (`inventarioMaximo`) para o peso usado; ultrapassar é **aviso**, não trava
 * (liberdade total). Estilos só com os tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-ficha-inventario',
  imports: [ReactiveFormsModule, Icone, OverflowFade],
  templateUrl: './ficha-inventario.component.html',
  styleUrl: './ficha-inventario.component.scss',
})
export class FichaInventario {
  /** Inventário atual (itens + amplificadores) — a fonte da verdade é a página (componente controlado). */
  readonly inventario = input.required<FichaInventarioDto>();
  /** Dono/mestre edita; para os demais é só leitura (a página liga por `podeGerenciar`). */
  readonly editavel = input(false);
  /** Prestígio da ficha — determina a patente e, por ela, os limites de modificação (via `shared/regras`). */
  readonly prestigio = input.required<number>();
  /** Inventário máximo (`Força × 5`, stored/derivado) — referência do peso usado; exceder é aviso, não trava. */
  readonly inventarioMaximo = input.required<number>();
  /** Vontade da ficha — determina o limite de empilhamentos de amplificador (Vontade × 3, via `shared/regras`). */
  readonly vontade = input.required<number>();

  /** Emite o inventário inteiro após qualquer mutação — a página persiste. */
  readonly inventarioMudou = output<FichaInventarioDto>();

  protected readonly categorias = CATALOGO_CATEGORIAS;
  protected readonly iconesCategoria = ICONES_CATEGORIA;

  /** Catálogo aberto (montar/adicionar itens) — recolhido por padrão para o inventário respirar. */
  protected readonly catalogoAberto = signal(false);
  protected readonly categoriaAtiva = signal<ItemCategoriaEnum>(ItemCategoriaEnum.CORPO_A_CORPO);

  /** Busca do catálogo (Reactive Forms — sem `ngModel`). */
  protected readonly busca = new FormControl('', { nonNullable: true });
  private readonly buscaTexto = toSignal(this.busca.valueChanges, { initialValue: '' });
  private readonly termoBusca = computed(() => this.buscaTexto().trim().toLowerCase());

  /** Índices dos itens com o painel de modificações ("Modificar") aberto. */
  private readonly painelAbertos = signal<ReadonlySet<number>>(new Set());

  /** Categorias disponíveis para um item custom (todas menos Amplificador, que não é item). */
  protected readonly categoriasItem = CATALOGO_CATEGORIAS.filter(
    (categoria) => categoria.categoria !== ItemCategoriaEnum.AMPLIFICADOR,
  );

  /** Chave do cartão recém-adicionado — acende o feedback "✓" no botão por ~900ms. */
  protected readonly adicionadoRecente = signal<string | null>(null);
  private temporizadorAdicionado: ReturnType<typeof setTimeout> | null = null;

  /** Índice do item com a confirmação inline de remoção (última unidade), ou `null`. */
  protected readonly indiceConfirmandoRemocao = signal<number | null>(null);
  /** Índice do item com o dialog "quantos remover" aberto (stack, quantidade > 1), ou `null`. */
  protected readonly indiceRemovendoStack = signal<number | null>(null);
  /** Quantas unidades remover no dialog de stack (Reactive Forms). */
  protected readonly quantidadeRemover = new FormControl(1, { nonNullable: true });
  /** `true` quando a confirmação de "Esvaziar" está aberta. */
  protected readonly confirmandoEsvaziar = signal(false);

  /** `true` quando o formulário de item custom está aberto. */
  protected readonly criandoItem = signal(false);
  protected readonly itemCustomForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoria: new FormControl(ItemCategoriaEnum.OPERACIONAL, { nonNullable: true }),
    custo: new FormControl(0, { nonNullable: true }),
    peso: new FormControl(1, { nonNullable: true }),
  });

  /** Índice do item cujo formulário de modificação custom está aberto, ou `null`. */
  protected readonly criandoModIndice = signal<number | null>(null);
  protected readonly modCustomForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    empilhamentos: new FormControl(1, { nonNullable: true }),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizadorAdicionado !== null) {
        clearTimeout(this.temporizadorAdicionado);
      }
    });
  }

  /** Recorte de limites/peso do motor (patente, peso usado, inventário efetivo, amplificadores). */
  protected readonly resumo = computed(() =>
    calcularResumoCompras({
      itens: this.inventario().itens,
      amplificadores: this.inventario().amplificadores,
      dinheiro: 0,
      prestigio: this.prestigio(),
      inventario: this.inventarioMaximo(),
      vontade: this.vontade(),
    }),
  );

  /** Peso usado / inventário efetivo (base + armazenamentos vestidos) — referência. */
  protected readonly inventarioTexto = computed(() => {
    const resumo = this.resumo();
    const base = `${this.formatarPeso(resumo.pesoUsado)} / ${this.formatarPeso(resumo.inventarioEfetivo)}`;
    return resumo.bonusInventario > 0
      ? `${base} (base ${this.formatarPeso(this.inventarioMaximo())} +${this.formatarPeso(resumo.bonusInventario)} vest.)`
      : base;
  });
  /** Excedeu o inventário efetivo — só **aviso** (não trava o salvamento). */
  protected readonly excedeInventario = computed(
    () => this.resumo().pesoUsado > this.resumo().inventarioEfetivo,
  );

  protected readonly limiteModsTexto = computed(() => {
    const limite = this.resumo().limiteModificacoes;
    return `máx. ${limite.maxModificacoes} mods (${limite.maxEmpilhamentos} stack/mod)`;
  });

  // === Catálogo ===
  /** Se a categoria de amplificadores deve ser exibida (aba ativa ou casada pela busca). */
  protected readonly mostrarAmplificadores = computed(() => {
    const termo = this.termoBusca();
    if (!termo) {
      return this.categoriaAtiva() === ItemCategoriaEnum.AMPLIFICADOR;
    }
    return AMPLIFICADORES.some((amplificador) => amplificador.nome.toLowerCase().includes(termo));
  });

  /** Itens regulares a exibir: os da categoria ativa, ou todos os que casam a busca (menos amplificadores). */
  protected readonly itensCatalogo = computed<readonly CartaoItemVM[]>(() => {
    const termo = this.termoBusca();
    const bruto: { item: ItemCatalogo; categoria: ItemCategoriaEnum }[] = [];
    if (termo) {
      for (const categoria of CATALOGO_CATEGORIAS) {
        if (categoria.categoria === ItemCategoriaEnum.AMPLIFICADOR) {
          continue;
        }
        for (const item of CATALOGO_ITENS[categoria.categoria]) {
          if (item.nome.toLowerCase().includes(termo)) {
            bruto.push({ item, categoria: categoria.categoria });
          }
        }
      }
    } else if (this.categoriaAtiva() !== ItemCategoriaEnum.AMPLIFICADOR) {
      const categoria = this.categoriaAtiva();
      for (const item of CATALOGO_ITENS[categoria]) {
        bruto.push({ item, categoria });
      }
    }
    return bruto.map(({ item, categoria }) => this.montarCartaoItem(item, categoria));
  });

  /** Cartões de amplificador do catálogo, filtrados pela busca quando houver. */
  protected readonly amplificadoresCatalogo = computed<readonly CartaoAmpVM[]>(() => {
    const termo = this.termoBusca();
    const resumo = this.resumo();
    const disponivel = resumo.limiteModificacoes.maxEmpilhamentos;
    const totalStacks = resumo.empilhamentosAmplificador;
    const limite = resumo.limiteAmplificadores;
    return AMPLIFICADORES.filter(
      (amplificador) => !termo || amplificador.nome.toLowerCase().includes(termo),
    ).map((amplificador) => {
      const atuais = this.empilhamentosDoAmplificador(amplificador.nome);
      const maximoEfetivo = Math.min(amplificador.empilhamentoMaximo, disponivel);
      return {
        nome: amplificador.nome,
        efeito: amplificador.efeito,
        empilhamentosAtuais: atuais,
        maximoEfetivo,
        podeAdicionar: totalStacks < limite && atuais < maximoEfetivo,
        custoTexto: atuais === 0 ? '$3.000' : '$1.000',
      };
    });
  });

  protected readonly catalogoVazio = computed(
    () => this.itensCatalogo().length === 0 && !this.mostrarAmplificadores(),
  );

  // === Inventário (lista) ===
  protected readonly inventarioVazio = computed(
    () => this.inventario().itens.length === 0 && this.inventario().amplificadores.length === 0,
  );

  protected readonly itensInventario = computed<readonly ItemInventarioVM[]>(() =>
    this.inventario().itens.map((item, indice) => this.montarItemInventario(item, indice)),
  );

  protected readonly amplificadoresInventario = computed<readonly AmpInventarioVM[]>(() => {
    const resumo = this.resumo();
    const maxEmpilhamentos = resumo.limiteModificacoes.maxEmpilhamentos;
    const totalStacks = resumo.empilhamentosAmplificador;
    const limite = resumo.limiteAmplificadores;
    return this.inventario().amplificadores.map((amplificador) => {
      const definicao = AMPLIFICADORES.find((atual) => atual.nome === amplificador.nome);
      const maximoEfetivo = Math.min(definicao?.empilhamentoMaximo ?? 5, maxEmpilhamentos);
      return {
        nome: amplificador.nome,
        efeito: definicao?.efeito ?? '',
        empilhamentos: amplificador.empilhamentos,
        maximoEfetivo,
        custoTexto: this.formatarDinheiro(
          calcularCustoAmplificador({ empilhamentos: amplificador.empilhamentos }),
        ),
        penalidade:
          Math.max(0, amplificador.empilhamentos - 1) * PENALIDADE_VONTADE_POR_EMPILHAMENTO,
        podeAumentar: totalStacks < limite && amplificador.empilhamentos < maximoEfetivo,
      };
    });
  });

  // === Ações do catálogo ===
  protected alternarCatalogo(): void {
    this.catalogoAberto.update((aberto) => !aberto);
  }

  protected definirCategoria(categoria: ItemCategoriaEnum): void {
    this.categoriaAtiva.set(categoria);
  }

  protected adicionarItem(vm: CartaoItemVM): void {
    this.inserirItem({
      nome: vm.item.nome,
      categoria: vm.categoria,
      custo: vm.item.custo,
      peso: vm.item.peso,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
    });
    this.sinalizarAdicao(this.chaveCartao(vm.categoria, vm.item.nome));
  }

  /** Abre/fecha o formulário de item custom. */
  protected alternarCriarItem(): void {
    if (this.criandoItem()) {
      this.criandoItem.set(false);
      return;
    }
    this.itemCustomForm.reset({
      nome: '',
      categoria: ItemCategoriaEnum.OPERACIONAL,
      custo: 0,
      peso: 1,
    });
    this.criandoItem.set(true);
  }

  protected cancelarCriarItem(): void {
    this.criandoItem.set(false);
  }

  /**
   * Confirma o item custom (nome obrigatório): adiciona um `CarrinhoItemDto` com a categoria/custo/peso
   * informados. Sem stat computável (não está no catálogo — `calcularStatItem` devolve `null`), mas
   * participa dos totais de peso/custo pelo motor normalmente.
   */
  protected confirmarCriarItem(): void {
    if (this.itemCustomForm.invalid) {
      return;
    }
    const bruto = this.itemCustomForm.getRawValue();
    this.inserirItem({
      nome: bruto.nome.trim(),
      categoria: bruto.categoria,
      custo: Math.max(0, bruto.custo),
      peso: Math.max(0, bruto.peso),
      quantidade: 1,
      guardada: false,
      modificacoes: [],
    });
    this.sinalizarAdicao(this.chaveCartao(bruto.categoria, bruto.nome.trim()));
    this.criandoItem.set(false);
  }

  /** Passo − / + num campo numérico do formulário de item custom (piso 0). */
  protected ajustarCampoItem(campo: 'custo' | 'peso', delta: number): void {
    const controle = this.itemCustomForm.controls[campo];
    controle.setValue(Math.max(0, controle.value + delta));
  }

  /** Adiciona um item, empilhando a quantidade quando a categoria é empilhável e o item já existe. */
  private inserirItem(novo: CarrinhoItemDto): void {
    const itens = this.inventario().itens;
    const empilhavel = CATEGORIAS_EMPILHAVEIS.includes(novo.categoria);
    const indiceExistente = empilhavel
      ? itens.findIndex((item) => item.categoria === novo.categoria && item.nome === novo.nome)
      : -1;
    if (indiceExistente >= 0) {
      this.emitirItens(
        itens.map((item, indice) =>
          indice === indiceExistente ? { ...item, quantidade: item.quantidade + 1 } : item,
        ),
      );
      return;
    }
    this.emitirItens([...itens, novo]);
  }

  /** Chave estável de um cartão do catálogo (mesma do `track` do template) — indexa o feedback "✓". */
  protected chaveCartao(categoria: ItemCategoriaEnum, nome: string): string {
    return `${categoria}/${nome}`;
  }

  /** Acende o feedback "✓ Adicionado" no botão do cartão por ~900ms (reinicia o timer a cada adição). */
  private sinalizarAdicao(chave: string): void {
    if (this.temporizadorAdicionado !== null) {
      clearTimeout(this.temporizadorAdicionado);
    }
    this.adicionadoRecente.set(chave);
    this.temporizadorAdicionado = setTimeout(() => {
      this.adicionadoRecente.set(null);
      this.temporizadorAdicionado = null;
    }, 900);
  }

  // === Ações da lista ===
  /**
   * Pedido de remoção: última unidade (quantidade 1) abre a **confirmação inline**; um **stack**
   * (quantidade > 1) abre o **dialog** perguntando quantas unidades remover.
   */
  protected removerItem(indice: number): void {
    const item = this.inventario().itens[indice];
    if (!item) {
      return;
    }
    if (item.quantidade > 1) {
      this.quantidadeRemover.setValue(1);
      this.indiceConfirmandoRemocao.set(null);
      this.indiceRemovendoStack.set(indice);
      return;
    }
    this.indiceRemovendoStack.set(null);
    this.indiceConfirmandoRemocao.set(indice);
  }

  /** Cancela a confirmação de remoção (inline ou dialog de stack). */
  protected cancelarRemocao(): void {
    this.indiceConfirmandoRemocao.set(null);
    this.indiceRemovendoStack.set(null);
  }

  /** Confirma a remoção da última unidade: retira o item da lista e emite. */
  protected confirmarRemocaoItem(indice: number): void {
    this.emitirItens(this.inventario().itens.filter((_, i) => i !== indice));
    this.indiceConfirmandoRemocao.set(null);
    this.fecharPainel(indice);
  }

  /**
   * Passo − / + na quantidade a remover no dialog de stack (limitado a 1..quantidade do item).
   */
  protected ajustarQuantidadeRemover(delta: number): void {
    const indice = this.indiceRemovendoStack();
    if (indice === null) {
      return;
    }
    const maximo = this.inventario().itens[indice]?.quantidade ?? 1;
    const valor = Math.min(maximo, Math.max(1, this.quantidadeRemover.value + delta));
    this.quantidadeRemover.setValue(valor);
  }

  /**
   * Confirma o dialog de stack: remove a quantidade escolhida (clampada a 1..quantidade). Removê-la
   * toda tira o item da lista; caso contrário decrementa a quantidade. Emite o resultado.
   */
  protected confirmarRemoverStack(): void {
    const indice = this.indiceRemovendoStack();
    if (indice === null) {
      return;
    }
    const itens = this.inventario().itens;
    const item = itens[indice];
    if (!item) {
      this.indiceRemovendoStack.set(null);
      return;
    }
    const quantidade = Math.min(item.quantidade, Math.max(1, this.quantidadeRemover.value));
    if (quantidade >= item.quantidade) {
      this.emitirItens(itens.filter((_, i) => i !== indice));
      this.fecharPainel(indice);
    } else {
      this.emitirItens(
        itens.map((atual, i) =>
          i === indice ? { ...atual, quantidade: atual.quantidade - quantidade } : atual,
        ),
      );
    }
    this.indiceRemovendoStack.set(null);
  }

  protected alternarGuardada(indice: number): void {
    this.emitirItens(
      this.inventario().itens.map((item, i) =>
        i === indice ? { ...item, guardada: !item.guardada } : item,
      ),
    );
  }

  protected alternarPainel(indice: number): void {
    const abertos = new Set(this.painelAbertos());
    if (abertos.has(indice)) {
      abertos.delete(indice);
    } else {
      abertos.add(indice);
    }
    this.painelAbertos.set(abertos);
  }

  protected adicionarModificacao(indice: number, modNome: string): void {
    const item = this.inventario().itens[indice];
    if (!item) {
      return;
    }
    const definicao = listarModificacoesDisponiveis(item).find((mod) => mod.nome === modNome);
    const atuais = this.empilhamentosDaMod(item, modNome);
    // Modificação custom (sem definição de catálogo): incrementa livre quando já aplicada.
    if (!definicao) {
      if (atuais > 0) {
        this.definirModificacao(indice, modNome, atuais + 1);
      }
      return;
    }
    const limite = obterLimiteModificacoes({ prestigio: this.prestigio() });
    const conflito = verificarConflitoModificacao({ item, modificacao: modNome });
    if (conflito.bloqueadaPor.length > 0) {
      return;
    }
    const novos = atuais === 0 ? definicao.empilhamentosIniciais : atuais + 1;
    const aAdicionar = atuais === 0 ? definicao.empilhamentosIniciais : 1;
    const usados = this.modsUsados(item);
    if (novos > limite.maxEmpilhamentos) {
      return;
    }
    if (usados + aAdicionar > limite.maxModificacoes) {
      return;
    }
    if (novos > definicao.empilhamentoMaximo) {
      return;
    }
    this.definirModificacao(indice, modNome, novos);
  }

  protected removerModificacao(indice: number, modNome: string): void {
    const item = this.inventario().itens[indice];
    if (!item) {
      return;
    }
    const atuais = this.empilhamentosDaMod(item, modNome);
    if (atuais === 0) {
      return;
    }
    const definicao = listarModificacoesDisponiveis(item).find((mod) => mod.nome === modNome);
    // Custom (sem definição): decrementa de 1 em 1 até sumir; de catálogo: piso nos iniciais.
    const minInicial = definicao ? definicao.empilhamentosIniciais : 1;
    const novos = atuais <= minInicial ? 0 : atuais - 1;
    this.definirModificacao(indice, modNome, novos);
  }

  /** Abre/fecha o formulário de modificação custom de um item. */
  protected alternarCriarMod(indice: number): void {
    if (this.criandoModIndice() === indice) {
      this.criandoModIndice.set(null);
      return;
    }
    this.modCustomForm.reset({ nome: '', empilhamentos: 1 });
    this.criandoModIndice.set(indice);
  }

  protected cancelarCriarMod(): void {
    this.criandoModIndice.set(null);
  }

  /**
   * Confirma a modificação custom (nome obrigatório): acrescenta `{ nome, empilhamentos }` ao item.
   * Sem definição de catálogo, o motor cobra o custo/peso padrão da categoria — o motor segue a fonte
   * única (proibição #26); aqui só se acopla a mod livre que o jogador descreveu.
   */
  protected confirmarCriarMod(indice: number): void {
    if (this.modCustomForm.invalid) {
      return;
    }
    const item = this.inventario().itens[indice];
    if (!item) {
      return;
    }
    const bruto = this.modCustomForm.getRawValue();
    const nome = bruto.nome.trim();
    const empilhamentos = Math.max(1, bruto.empilhamentos);
    const semMod = item.modificacoes.filter((modificacao) => modificacao.nome !== nome);
    this.emitirItens(
      this.inventario().itens.map((atual, i) =>
        i === indice ? { ...atual, modificacoes: [...semMod, { nome, empilhamentos }] } : atual,
      ),
    );
    this.criandoModIndice.set(null);
  }

  /** Passo − / + nos empilhamentos do formulário de modificação custom (piso 1). */
  protected ajustarEmpilhamentosMod(delta: number): void {
    const controle = this.modCustomForm.controls.empilhamentos;
    controle.setValue(Math.max(1, controle.value + delta));
  }

  protected adicionarAmplificador(nome: string): void {
    const definicao = AMPLIFICADORES.find((amplificador) => amplificador.nome === nome);
    if (!definicao) {
      return;
    }
    const resumo = this.resumo();
    const maximoEfetivo = Math.min(
      definicao.empilhamentoMaximo,
      resumo.limiteModificacoes.maxEmpilhamentos,
    );
    const totalStacks = resumo.empilhamentosAmplificador;
    const limite = resumo.limiteAmplificadores;
    const amplificadores = this.inventario().amplificadores;
    const existente = amplificadores.find((amplificador) => amplificador.nome === nome);
    if (existente) {
      if (existente.empilhamentos < maximoEfetivo && totalStacks < limite) {
        this.emitirAmplificadores(
          amplificadores.map((amplificador) =>
            amplificador.nome === nome
              ? { ...amplificador, empilhamentos: amplificador.empilhamentos + 1 }
              : amplificador,
          ),
        );
        this.sinalizarAdicao(`amp:${nome}`);
      }
      return;
    }
    if (totalStacks + 1 <= limite) {
      this.emitirAmplificadores([
        ...amplificadores,
        { nome, empilhamentos: definicao.empilhamentosIniciais },
      ]);
      this.sinalizarAdicao(`amp:${nome}`);
    }
  }

  protected removerAmplificador(nome: string): void {
    const amplificadores = this.inventario().amplificadores;
    const existente = amplificadores.find((amplificador) => amplificador.nome === nome);
    if (!existente) {
      return;
    }
    if (existente.empilhamentos <= 1) {
      this.emitirAmplificadores(
        amplificadores.filter((amplificador) => amplificador.nome !== nome),
      );
      return;
    }
    this.emitirAmplificadores(
      amplificadores.map((amplificador) =>
        amplificador.nome === nome
          ? { ...amplificador, empilhamentos: amplificador.empilhamentos - 1 }
          : amplificador,
      ),
    );
  }

  /** Pede confirmação antes de esvaziar (a ação em si fica no `confirmarEsvaziar`). */
  protected esvaziar(): void {
    this.confirmandoEsvaziar.set(true);
  }

  protected cancelarEsvaziar(): void {
    this.confirmandoEsvaziar.set(false);
  }

  /** Confirma o esvaziamento: limpa itens e amplificadores e emite o inventário vazio. */
  protected confirmarEsvaziar(): void {
    this.painelAbertos.set(new Set());
    this.confirmandoEsvaziar.set(false);
    this.inventarioMudou.emit({ itens: [], amplificadores: [] });
  }

  // === Construção de view-models ===
  private montarCartaoItem(item: ItemCatalogo, categoria: ItemCategoriaEnum): CartaoItemVM {
    return {
      item,
      categoria,
      custoTexto: this.formatarDinheiro(item.custo),
      pesoTexto: `${this.formatarPeso(item.peso)} slot${item.peso !== 1 ? 's' : ''}`,
      stat: this.formatarStatCatalogo(item),
      bonus: item.bonus ?? null,
      descricao: item.descricao ?? null,
    };
  }

  private montarItemInventario(item: CarrinhoItemDto, indice: number): ItemInventarioVM {
    const limite = obterLimiteModificacoes({ prestigio: this.prestigio() });
    const modsUsados = this.modsUsados(item);
    const ehArmazenamento = item.categoria === ItemCategoriaEnum.ARMAZENAMENTO;
    const contaPeso = !ehArmazenamento || item.guardada;

    const custoMods = item.modificacoes.reduce(
      (soma, modificacao) =>
        soma +
        contarComprasModificacao({
          item,
          modificacao: modificacao.nome,
          empilhamentos: modificacao.empilhamentos,
        }) *
          obterCustoModificacao({ item, modificacao: modificacao.nome }),
      0,
    );
    const custoTotal = (item.custo + custoMods) * item.quantidade;

    const pesoMods = item.modificacoes.reduce(
      (soma, modificacao) =>
        soma + modificacao.empilhamentos * obterPesoModificacao({ item, modificacao: modificacao.nome }),
      0,
    );
    const pesoBruto = (item.peso + pesoMods) * item.quantidade;
    const pesoTexto =
      ehArmazenamento && !item.guardada
        ? `${this.formatarPeso(pesoBruto)} slots se guardada`
        : `${this.formatarPeso(contaPeso ? pesoBruto : 0)} slots`;

    const definicoes = listarModificacoesDisponiveis(item);
    const modsAtivas: ModAtivaVM[] = item.modificacoes.map((modificacao) => {
      const definicao = definicoes.find((mod) => mod.nome === modificacao.nome);
      const custo =
        contarComprasModificacao({
          item,
          modificacao: modificacao.nome,
          empilhamentos: modificacao.empilhamentos,
        }) * obterCustoModificacao({ item, modificacao: modificacao.nome });
      return {
        nome: modificacao.nome,
        empilhamentos: modificacao.empilhamentos,
        custoTexto: this.formatarDinheiro(custo),
        // Custom (sem definição): o "+" incrementa livre; de catálogo: respeita os limites da patente.
        podeAumentar: definicao
          ? modificacao.empilhamentos < definicao.empilhamentoMaximo &&
            modificacao.empilhamentos < limite.maxEmpilhamentos &&
            modsUsados < limite.maxModificacoes
          : true,
      };
    });

    return {
      indice,
      nome: item.nome,
      categoriaRotulo: this.rotuloCategoria(item.categoria),
      quantidade: item.quantidade,
      custoTotalTexto: this.formatarDinheiro(custoTotal),
      pesoTexto,
      stat: this.formatarStat(calcularStatItem({ item })),
      ehArmazenamento,
      guardada: item.guardada,
      modsUsados,
      maxModificacoes: limite.maxModificacoes,
      temMods: definicoes.length > 0,
      painelAberto: this.painelAbertos().has(indice),
      modsAtivas,
      secoes: this.montarSecoes(item, modsUsados, limite),
    };
  }

  private montarSecoes(
    item: CarrinhoItemDto,
    modsUsados: number,
    limite: { maxEmpilhamentos: number; maxModificacoes: number },
  ): SecaoModVM[] {
    const secoes: SecaoModVM[] = [];
    const proprias = MODIFICACOES[item.categoria] ?? [];
    if (proprias.length > 0) {
      secoes.push({
        titulo: null,
        entradas: proprias.map((mod) => this.montarEntradaMod(item, mod, modsUsados, limite)),
      });
    }
    const categoriaEmprestada = obterCategoriaEmprestada(item);
    const emprestadas = categoriaEmprestada ? (MODIFICACOES[categoriaEmprestada] ?? []) : [];
    if (categoriaEmprestada && emprestadas.length > 0) {
      const via =
        item.categoria === ItemCategoriaEnum.PROTECOES &&
        item.modificacoes.some((modificacao) => modificacao.nome === 'Combativo')
          ? 'Via Combativo'
          : 'Via Faz Parte';
      secoes.push({
        titulo: `${via} — ${this.rotuloCategoria(categoriaEmprestada)}`,
        entradas: emprestadas.map((mod) => this.montarEntradaMod(item, mod, modsUsados, limite)),
      });
    }
    return secoes;
  }

  private montarEntradaMod(
    item: CarrinhoItemDto,
    definicao: ModificacaoDados,
    modsUsados: number,
    limite: { maxEmpilhamentos: number; maxModificacoes: number },
  ): EntradaModVM {
    const atuais = this.empilhamentosDaMod(item, definicao.nome);
    const conflito = verificarConflitoModificacao({ item, modificacao: definicao.nome });
    const bloqueadaPorAtiva = conflito.bloqueadaPor.length > 0;
    const bloqueiaAtiva = atuais > 0 ? false : conflito.bloqueia.length > 0;
    const aAdicionar = atuais === 0 ? definicao.empilhamentosIniciais : 1;
    const proximos = atuais === 0 ? definicao.empilhamentosIniciais : atuais + 1;
    const excedeStack = proximos > limite.maxEmpilhamentos;
    const excedeMods = modsUsados + aAdicionar > limite.maxModificacoes;
    const excedeMaximo = atuais >= definicao.empilhamentoMaximo;
    const podeAdicionar =
      !bloqueadaPorAtiva && !bloqueiaAtiva && !excedeMods && !excedeStack && !excedeMaximo;

    let motivo = '';
    if (bloqueadaPorAtiva) {
      motivo = 'Bloqueado';
    } else if (bloqueiaAtiva) {
      motivo = 'Bloqueia mod ativa';
    } else if (excedeStack) {
      motivo = `Limite patente (${limite.maxEmpilhamentos})`;
    } else if (excedeMods) {
      motivo = `Slots cheios (${limite.maxModificacoes})`;
    } else if (excedeMaximo) {
      motivo = 'Máx. empilhamento';
    }

    const custo = obterCustoModificacao({ item, modificacao: definicao.nome });

    return {
      nome: definicao.nome,
      descricao: definicao.descricao,
      bloqueia: definicao.bloqueia,
      pontos: Array.from({ length: definicao.empilhamentoMaximo }, (_, indice) => indice < atuais),
      custoTexto: `${this.formatarDinheiro(custo)}/stack`,
      motivo,
      podeAdicionar,
      bloqueada: bloqueadaPorAtiva,
      ativa: atuais > 0,
    };
  }

  // === Helpers de mutação ===
  private definirModificacao(indice: number, modNome: string, empilhamentos: number): void {
    this.emitirItens(
      this.inventario().itens.map((item, i) => {
        if (i !== indice) {
          return item;
        }
        const semMod = item.modificacoes.filter((modificacao) => modificacao.nome !== modNome);
        const modificacoes =
          empilhamentos <= 0 ? semMod : [...semMod, { nome: modNome, empilhamentos }];
        return { ...item, modificacoes };
      }),
    );
  }

  private fecharPainel(indice: number): void {
    if (!this.painelAbertos().has(indice)) {
      return;
    }
    const abertos = new Set(this.painelAbertos());
    abertos.delete(indice);
    this.painelAbertos.set(abertos);
  }

  private empilhamentosDaMod(item: CarrinhoItemDto, modNome: string): number {
    return item.modificacoes.find((modificacao) => modificacao.nome === modNome)?.empilhamentos ?? 0;
  }

  private empilhamentosDoAmplificador(nome: string): number {
    return (
      this.inventario().amplificadores.find((amplificador) => amplificador.nome === nome)
        ?.empilhamentos ?? 0
    );
  }

  private modsUsados(item: CarrinhoItemDto): number {
    return item.modificacoes.reduce((soma, modificacao) => soma + modificacao.empilhamentos, 0);
  }

  private rotuloCategoria(categoria: ItemCategoriaEnum): string {
    return CATALOGO_CATEGORIAS.find((atual) => atual.categoria === categoria)?.rotulo ?? '';
  }

  private emitirItens(itens: readonly CarrinhoItemDto[]): void {
    this.inventarioMudou.emit({ itens, amplificadores: this.inventario().amplificadores });
  }

  private emitirAmplificadores(amplificadores: readonly AmplificadorAplicadoDto[]): void {
    this.inventarioMudou.emit({ itens: this.inventario().itens, amplificadores });
  }

  // === Formatação de UI ===
  private formatarDinheiro(valor: number): string {
    return `$${valor.toLocaleString('pt-BR')}`;
  }

  private formatarPeso(valor: number): string {
    return valor % 1 === 0 ? String(valor) : valor.toFixed(1);
  }

  private formatarStatCatalogo(item: ItemCatalogo): string | null {
    if (item.dano) {
      return `Dano ${item.dano}${item.informacao ? ` · ${item.informacao}` : ''}`;
    }
    if (item.resistencia) {
      return `Resist. ${item.resistencia}`;
    }
    return null;
  }

  private formatarStat(stat: StatItemDto | null): string | null {
    if (!stat) {
      return null;
    }
    if (stat.dano) {
      return `Dano ${stat.dano}${stat.informacao ? ` · ${stat.informacao}` : ''}`;
    }
    if (stat.resistencia) {
      return `Resist. ${stat.resistencia}`;
    }
    if (stat.bonusArmazenamento !== undefined) {
      return `+${this.formatarPeso(stat.bonusArmazenamento)} inv.`;
    }
    return null;
  }
}
