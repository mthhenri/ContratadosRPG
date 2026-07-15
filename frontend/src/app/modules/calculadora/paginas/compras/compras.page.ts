import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';

import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  TaxaVendaEnum,
} from '@contratados-rpg/shared/enums';
import {
  AMPLIFICADORES,
  calcularCustoAmplificador,
  calcularResumoCompras,
  calcularStatItem,
  calcularValorVendaCarrinho,
  calcularVendaFragmentos,
  CATALOGO_CATEGORIAS,
  CATALOGO_ITENS,
  contarComprasModificacao,
  ContadorFragmentoDto,
  ItemCatalogo,
  MODIFICACOES,
  ModificacaoDados,
  obterCategoriaEmprestada,
  obterCustoModificacao,
  obterLimiteModificacoes,
  obterValorFragmento,
  PENALIDADE_VONTADE_POR_EMPILHAMENTO,
  StatItemDto,
  verificarConflitoModificacao,
} from '@contratados-rpg/shared/regras/compras';

import { Icone } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { AjudaCalculadora } from '../../componentes/ajuda-calculadora/ajuda-calculadora.component';
import { StepInput } from '../../componentes/step-input/step-input.component';
import { ICONES_CATEGORIA, ROTULOS_PATENTE } from '../../rotulos';

/** Uma modificação aplicada a um item do carrinho (estado da página). */
interface ModificacaoCarrinho {
  readonly nome: string;
  readonly empilhamentos: number;
}

/**
 * Um item no carrinho (estado da página). Superset estrutural de `CarrinhoItemDto`
 * do motor (acrescenta o `uid` de controle da UI), então é aceito direto pelas
 * funções de `shared/regras/compras`.
 */
interface ItemCarrinho {
  readonly uid: number;
  readonly nome: string;
  readonly categoria: ItemCategoriaEnum;
  readonly custo: number;
  readonly peso: number;
  readonly quantidade: number;
  readonly guardada: boolean;
  readonly modificacoes: readonly ModificacaoCarrinho[];
}

/** Um amplificador acoplado ao agente (estado da página). */
interface AmplificadorCarrinho {
  readonly nome: string;
  readonly empilhamentos: number;
}

/** Cartão de item do catálogo (view-model do passo 2). */
interface CartaoItemVM {
  readonly item: ItemCatalogo;
  readonly categoria: ItemCategoriaEnum;
  readonly custoTexto: string;
  readonly pesoTexto: string;
  readonly stat: string | null;
  readonly bonus: string | null;
  readonly descricao: string | null;
}

/** Cartão de amplificador do catálogo (view-model do passo 2). */
interface CartaoAmpVM {
  readonly nome: string;
  readonly efeito: string;
  readonly empilhamentosAtuais: number;
  readonly maximoEfetivo: number;
  readonly podeAdicionar: boolean;
  readonly custoTexto: string;
  readonly maxEmpilhamentoProprio: number;
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

/** Item do carrinho renderizado (view-model do passo 3). */
interface ItemCarrinhoVM {
  readonly uid: number;
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

/** Amplificador renderizado no carrinho (view-model do passo 3). */
interface AmpCarrinhoVM {
  readonly nome: string;
  readonly efeito: string;
  readonly empilhamentos: number;
  readonly maximoEfetivo: number;
  readonly custoTexto: string;
  readonly penalidade: number;
  readonly podeAumentar: boolean;
}

/** Categorias com item/mod comprável separadamente stackável (várias unidades do mesmo item). */
const CATEGORIAS_EMPILHAVEIS: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.OPERACIONAL,
  ItemCategoriaEnum.MEDICINAL,
];

/** Recursos de configuração do agente (valores brutos do formulário). */
interface RecursosCarrinho {
  readonly dinheiro: number;
  readonly prestigio: number;
  readonly inventario: number;
  readonly vontade: number;
}

/** Estado completo do carrinho, serializado no localStorage e no código de exportação. */
interface EstadoCarrinhoPersistidoV1 {
  readonly versao: 1;
  readonly recursos: RecursosCarrinho;
  readonly carrinho: readonly ItemCarrinho[];
  readonly amplificadores: readonly AmplificadorCarrinho[];
}

/** Chave do localStorage (m1-11) — o carrinho sobrevive a reload/reabertura da página. */
const CHAVE_LOCALSTORAGE = 'contratados-rpg:calculadora-compras';

/**
 * Prefixo do código de exportação (m1-11). **Formato novo, incompatível com os códigos do
 * site antigo** (`contratados-calculadora`): o script original não foi migrado para este
 * repositório e seu formato de serialização não pôde ser conferido — a quebra é documentada
 * aqui e avisada na UI de importação (critério de aceite da spec permite documentar em vez
 * de garantir compatibilidade).
 */
const PREFIXO_CODIGO_EXPORTACAO = 'CRPG-COMPRAS-V1:';

/** Modo da aba: montar carrinho para comprar ou avaliar quanto renderia a venda (m1-20). */
type ModoCompras = 'comprar' | 'vender';

/** Grade de contadores de fragmentos por módulo × tipo (estado do bloco de venda de fragmentos). */
type GradeFragmentos = Record<FragmentoModuloEnum, Record<FragmentoTipoEnum, number>>;

/** Ordem de exibição dos módulos no bloco de fragmentos: do mais fraco (V) ao mais forte (I). */
const MODULOS_ORDEM: readonly FragmentoModuloEnum[] = [
  FragmentoModuloEnum.V,
  FragmentoModuloEnum.IV,
  FragmentoModuloEnum.III,
  FragmentoModuloEnum.II,
  FragmentoModuloEnum.I,
];

/** Opções do seletor de taxa de venda de itens (rótulo de UI). */
const OPCOES_TAXA: readonly { readonly taxa: TaxaVendaEnum; readonly rotulo: string }[] = [
  { taxa: TaxaVendaEnum.NORMAL, rotulo: 'Normal · 50%' },
  { taxa: TaxaVendaEnum.CHECKIN, rotulo: 'Check-in · 75%' },
  { taxa: TaxaVendaEnum.FORA_PATENTE, rotulo: 'Fora de patente · 25%' },
];

/** Grade de fragmentos zerada (todos os contadores em 0) — estado inicial e alvo do "Limpar". */
function fragmentosZerados(): GradeFragmentos {
  const grade = {} as GradeFragmentos;
  for (const modulo of MODULOS_ORDEM) {
    grade[modulo] = {
      [FragmentoTipoEnum.POTENCIALIZADOR]: 0,
      [FragmentoTipoEnum.CONSTRUTOR]: 0,
    };
  }
  return grade;
}

/**
 * Aba "Compras" da calculadora (m1-10) — a mais pesada: configuração do agente, resumo de
 * limites/gastos, catálogo com busca e o carrinho com itens, modificações e amplificadores.
 * **Nenhuma regra de jogo vive aqui**: limites de patente, custo/peso de modificação, conflitos,
 * stat computado de item, custo de amplificador e todos os totais vêm de `shared/regras/compras`
 * (fonte única — SYSTEM.SPEC §6.6, regras prontas desde a m1-05). A página só orquestra o estado
 * do carrinho em Signals e traduz os value-objects do motor para a UI. Paridade de saída com a aba
 * `compras` do site antigo (`renderCmpSummary`/`renderCmpCatalog`/`renderCmpCart`). **Persistência e
 * export/import (m1-11):** o carrinho é salvo em `localStorage` a cada mudança (`effect()` sobre
 * `carrinho`/`amplificadores`/`recursos`) e recarregado na construção da página; exportar gera um
 * código `CRPG-COMPRAS-V1:<base64>` copiável, importar reconstrói o mesmo estado a partir dele —
 * formato novo, **incompatível com os códigos do site antigo** (script original não migrado para
 * este repositório; quebra documentada e avisada na UI de importação).
 */
@Component({
  selector: 'app-compras-page',
  imports: [ReactiveFormsModule, StepInput, AjudaCalculadora, Icone, OverflowFade],
  templateUrl: './compras.page.html',
  styleUrl: './compras.page.scss',
})
export class ComprasPage {
  protected readonly categorias = CATALOGO_CATEGORIAS;
  protected readonly iconesCategoria = ICONES_CATEGORIA;

  protected readonly formulario = new FormGroup({
    dinheiro: new FormControl(1000, { nonNullable: true }),
    prestigio: new FormControl(0, { nonNullable: true }),
    inventario: new FormControl(5, { nonNullable: true }),
    vontade: new FormControl(1, { nonNullable: true }),
  });

  private readonly recursos = toSignal(
    this.formulario.valueChanges.pipe(map(() => this.formulario.getRawValue())),
    { initialValue: this.formulario.getRawValue() },
  );

  // === Estado do carrinho (Signals) ===
  // O carrinho de compra (persistido — m1-11) e o de venda (m1-20) são independentes;
  // o modo ativo roteia leituras/escritas para um ou outro sem misturar as listas.
  private readonly carrinho = signal<readonly ItemCarrinho[]>([]);
  private readonly amplificadores = signal<readonly AmplificadorCarrinho[]>([]);
  private readonly carrinhoVenda = signal<readonly ItemCarrinho[]>([]);
  private readonly amplificadoresVenda = signal<readonly AmplificadorCarrinho[]>([]);
  protected readonly categoriaAtiva = signal<ItemCategoriaEnum>(ItemCategoriaEnum.CORPO_A_CORPO);
  protected readonly busca = signal('');
  private readonly painelAbertos = signal<ReadonlySet<number>>(new Set());
  private uidContador = 0;

  // === Modo Venda (m1-20) ===
  // O modo (`comprar`/`vender`) vem da rota: Compras e Vendas são abas distintas do shell, cada uma
  // sua URL (`data: { modo }` → este input via `withComponentInputBinding`). Comprar é o padrão.
  readonly modo = input<ModoCompras>('comprar');
  protected readonly taxaVenda = signal<TaxaVendaEnum>(TaxaVendaEnum.NORMAL);
  private readonly fragmentos = signal<GradeFragmentos>(fragmentosZerados());
  protected readonly opcoesTaxa = OPCOES_TAXA;

  // === Exportar/importar por código (m1-11) ===
  protected readonly modalExportarAberto = signal(false);
  protected readonly modalImportarAberto = signal(false);
  protected readonly codigoExportado = signal('');
  protected readonly codigoImportarTexto = signal('');
  protected readonly erroImportar = signal<string | null>(null);
  protected readonly copiadoComSucesso = signal(false);

  // === Feedback de adição / confirmações / item e modificação custom ===
  /** Chave do cartão recém-adicionado — acende o feedback "✓" no botão por ~900ms. */
  protected readonly adicionadoRecente = signal<string | null>(null);
  private temporizadorAdicionado: ReturnType<typeof setTimeout> | null = null;

  /** UID do item com a confirmação inline de remoção (última unidade), ou `null`. */
  protected readonly uidConfirmandoRemocao = signal<number | null>(null);
  /** UID do item com o dialog "quantos remover" aberto (stack, quantidade > 1), ou `null`. */
  protected readonly uidRemovendoStack = signal<number | null>(null);
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
  /** Categorias disponíveis para um item custom (todas menos Amplificador, que não é item). */
  protected readonly categoriasItem = CATALOGO_CATEGORIAS.filter(
    (categoria) => categoria.categoria !== ItemCategoriaEnum.AMPLIFICADOR,
  );

  /** UID do item cujo formulário de modificação custom está aberto, ou `null`. */
  protected readonly criandoModUid = signal<number | null>(null);
  protected readonly modCustomForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    empilhamentos: new FormControl(1, { nonNullable: true }),
  });

  constructor() {
    const estadoPersistido = this.carregarEstado();
    if (estadoPersistido) {
      this.aplicarEstado(estadoPersistido);
    }
    effect(() => this.salvarEstado());
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizadorAdicionado !== null) {
        clearTimeout(this.temporizadorAdicionado);
      }
    });
  }

  private readonly termoBusca = computed(() => this.busca().trim().toLowerCase());

  /** Recorte completo da aba (patente, limites, gasto, peso, amplificadores, penalidade) — do motor. */
  protected readonly resumo = computed(() => {
    const recursos = this.recursos();
    return calcularResumoCompras({
      itens: this.lerCarrinho(),
      amplificadores: this.lerAmplificadores(),
      dinheiro: recursos.dinheiro,
      prestigio: recursos.prestigio,
      inventario: recursos.inventario,
      vontade: recursos.vontade,
    });
  });

  protected readonly patenteTexto = computed(() => ROTULOS_PATENTE[this.resumo().patente]);
  protected readonly gastoTexto = computed(() => this.formatarDinheiro(this.resumo().gasto));
  protected readonly dinheiroRestanteTexto = computed(() =>
    this.formatarDinheiro(this.resumo().dinheiroRestante),
  );
  protected readonly semDinheiro = computed(() => this.resumo().dinheiroRestante < 0);

  protected readonly inventarioTexto = computed(() => {
    const resumo = this.resumo();
    const base = `${this.formatarPeso(resumo.pesoUsado)} / ${this.formatarPeso(resumo.inventarioEfetivo)}`;
    return resumo.bonusInventario > 0
      ? `${base} (base ${this.formatarPeso(this.recursos().inventario)} +${this.formatarPeso(resumo.bonusInventario)} vest.)`
      : base;
  });
  protected readonly excedeInventario = computed(
    () => this.resumo().pesoUsado > this.resumo().inventarioEfetivo,
  );

  protected readonly amplificadoresTexto = computed(
    () => `${this.resumo().empilhamentosAmplificador} / ${this.resumo().limiteAmplificadores}`,
  );
  protected readonly excedeAmplificadores = computed(
    () => this.resumo().empilhamentosAmplificador > this.resumo().limiteAmplificadores,
  );

  protected readonly limiteModsTexto = computed(() => {
    const limite = this.resumo().limiteModificacoes;
    return `máx. ${limite.maxModificacoes} mods (${limite.maxEmpilhamentos} stack/mod)`;
  });
  protected readonly penalidadeVontadeTexto = computed(() => {
    const penalidade = this.resumo().penalidadeVontade;
    return penalidade > 0 ? `−${penalidade} Vontade` : '—';
  });

  // === Catálogo (passo 2) ===
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
        maxEmpilhamentoProprio: amplificador.empilhamentoMaximo,
      };
    });
  });

  protected readonly catalogoVazio = computed(
    () => this.itensCatalogo().length === 0 && !this.mostrarAmplificadores(),
  );

  // === Carrinho (passo 3) ===
  protected readonly carrinhoVazio = computed(
    () => this.lerCarrinho().length === 0 && this.lerAmplificadores().length === 0,
  );

  protected readonly itensCarrinho = computed<readonly ItemCarrinhoVM[]>(() =>
    this.lerCarrinho().map((item) => this.montarItemCarrinho(item)),
  );

  protected readonly amplificadoresCarrinho = computed<readonly AmpCarrinhoVM[]>(() => {
    const resumo = this.resumo();
    const maxEmpilhamentos = resumo.limiteModificacoes.maxEmpilhamentos;
    const totalStacks = resumo.empilhamentosAmplificador;
    const limite = resumo.limiteAmplificadores;
    return this.lerAmplificadores().map((amplificador) => {
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
  protected definirCategoria(categoria: ItemCategoriaEnum): void {
    this.categoriaAtiva.set(categoria);
  }

  protected aoBuscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected adicionarItem(vm: CartaoItemVM): void {
    this.inserirItemCarrinho({
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
   * Confirma o item custom (nome obrigatório): adiciona um `ItemCarrinho` com categoria/custo/peso
   * informados. Sem stat computável (não está no catálogo — `calcularStatItem` devolve `null`), mas
   * participa dos totais de peso/custo pelo motor normalmente.
   */
  protected confirmarCriarItem(): void {
    if (this.itemCustomForm.invalid) {
      return;
    }
    const bruto = this.itemCustomForm.getRawValue();
    this.inserirItemCarrinho({
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

  /** Adiciona um item ao carrinho ativo, empilhando quando a categoria é empilhável e o item já existe. */
  private inserirItemCarrinho(dados: Omit<ItemCarrinho, 'uid'>): void {
    const empilhavel = CATEGORIAS_EMPILHAVEIS.includes(dados.categoria);
    const existente = empilhavel
      ? this.lerCarrinho().find(
          (item) => item.categoria === dados.categoria && item.nome === dados.nome,
        )
      : undefined;
    if (existente) {
      this.definirCarrinho(
        this.lerCarrinho().map((item) =>
          item.uid === existente.uid ? { ...item, quantidade: item.quantidade + 1 } : item,
        ),
      );
      return;
    }
    this.definirCarrinho([...this.lerCarrinho(), { uid: this.uidContador++, ...dados }]);
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

  // === Ações do carrinho ===
  /**
   * Pedido de remoção: última unidade (quantidade 1) abre a **confirmação inline**; um **stack**
   * (quantidade > 1) abre o **dialog** perguntando quantas unidades remover.
   */
  protected removerItem(uid: number): void {
    const item = this.lerCarrinho().find((atual) => atual.uid === uid);
    if (!item) {
      return;
    }
    if (item.quantidade > 1) {
      this.quantidadeRemover.setValue(1);
      this.uidConfirmandoRemocao.set(null);
      this.uidRemovendoStack.set(uid);
      return;
    }
    this.uidRemovendoStack.set(null);
    this.uidConfirmandoRemocao.set(uid);
  }

  /** Cancela a confirmação de remoção (inline ou dialog de stack). */
  protected cancelarRemocao(): void {
    this.uidConfirmandoRemocao.set(null);
    this.uidRemovendoStack.set(null);
  }

  /** Confirma a remoção da última unidade: retira o item do carrinho. */
  protected confirmarRemocaoItem(uid: number): void {
    this.definirCarrinho(this.lerCarrinho().filter((atual) => atual.uid !== uid));
    this.uidConfirmandoRemocao.set(null);
    this.fecharPainel(uid);
  }

  /** Quantidade do item cujo dialog de stack está aberto (para o rótulo/limite do template). */
  protected readonly quantidadeMaximaRemover = computed(() => {
    const uid = this.uidRemovendoStack();
    return uid === null ? 0 : (this.lerCarrinho().find((item) => item.uid === uid)?.quantidade ?? 0);
  });

  /** Nome do item cujo dialog de stack está aberto (para o título do dialog). */
  protected readonly nomeRemovendoStack = computed(() => {
    const uid = this.uidRemovendoStack();
    return uid === null ? '' : (this.lerCarrinho().find((item) => item.uid === uid)?.nome ?? '');
  });

  /**
   * Confirma o dialog de stack: remove a quantidade escolhida (clampada a 1..quantidade). Removê-la
   * toda tira o item do carrinho; caso contrário decrementa a quantidade.
   */
  protected confirmarRemoverStack(): void {
    const uid = this.uidRemovendoStack();
    if (uid === null) {
      return;
    }
    const item = this.lerCarrinho().find((atual) => atual.uid === uid);
    if (!item) {
      this.uidRemovendoStack.set(null);
      return;
    }
    const quantidade = Math.min(item.quantidade, Math.max(1, this.quantidadeRemover.value));
    if (quantidade >= item.quantidade) {
      this.definirCarrinho(this.lerCarrinho().filter((atual) => atual.uid !== uid));
      this.fecharPainel(uid);
    } else {
      this.definirCarrinho(
        this.lerCarrinho().map((atual) =>
          atual.uid === uid ? { ...atual, quantidade: atual.quantidade - quantidade } : atual,
        ),
      );
    }
    this.uidRemovendoStack.set(null);
  }

  protected alternarGuardada(uid: number): void {
    this.definirCarrinho(
      this.lerCarrinho().map((item) =>
        item.uid === uid ? { ...item, guardada: !item.guardada } : item,
      ),
    );
  }

  protected alternarPainel(uid: number): void {
    const abertos = new Set(this.painelAbertos());
    if (abertos.has(uid)) {
      abertos.delete(uid);
    } else {
      abertos.add(uid);
    }
    this.painelAbertos.set(abertos);
  }

  protected adicionarModificacao(uid: number, modNome: string): void {
    const item = this.lerCarrinho().find((atual) => atual.uid === uid);
    if (!item) {
      return;
    }
    const definicao = this.definicoesModificacao(item).find((mod) => mod.nome === modNome);
    const atuais = this.empilhamentosDaMod(item, modNome);
    // Modificação custom (sem definição de catálogo): incrementa livre quando já aplicada.
    if (!definicao) {
      if (atuais > 0) {
        this.definirModificacao(uid, modNome, atuais + 1);
      }
      return;
    }
    const limite = obterLimiteModificacoes({ prestigio: this.recursos().prestigio });
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
    this.definirModificacao(uid, modNome, novos);
  }

  protected removerModificacao(uid: number, modNome: string): void {
    const item = this.lerCarrinho().find((atual) => atual.uid === uid);
    if (!item) {
      return;
    }
    const atuais = this.empilhamentosDaMod(item, modNome);
    if (atuais === 0) {
      return;
    }
    const definicao = this.definicoesModificacao(item).find((mod) => mod.nome === modNome);
    // Custom (sem definição): decrementa de 1 em 1 até sumir; de catálogo: piso nos iniciais.
    const minInicial = definicao ? definicao.empilhamentosIniciais : 1;
    const novos = atuais <= minInicial ? 0 : atuais - 1;
    this.definirModificacao(uid, modNome, novos);
  }

  /** Abre/fecha o formulário de modificação custom de um item do carrinho. */
  protected alternarCriarMod(uid: number): void {
    if (this.criandoModUid() === uid) {
      this.criandoModUid.set(null);
      return;
    }
    this.modCustomForm.reset({ nome: '', empilhamentos: 1 });
    this.criandoModUid.set(uid);
  }

  protected cancelarCriarMod(): void {
    this.criandoModUid.set(null);
  }

  /**
   * Confirma a modificação custom (nome obrigatório): acrescenta `{ nome, empilhamentos }` ao item.
   * Sem definição de catálogo, o motor cobra o custo/peso padrão da categoria (fonte única — proibição
   * #26); aqui só se acopla a mod livre que o usuário descreveu.
   */
  protected confirmarCriarMod(uid: number): void {
    if (this.modCustomForm.invalid) {
      return;
    }
    const item = this.lerCarrinho().find((atual) => atual.uid === uid);
    if (!item) {
      return;
    }
    const bruto = this.modCustomForm.getRawValue();
    const nome = bruto.nome.trim();
    const empilhamentos = Math.max(1, bruto.empilhamentos);
    const semMod = item.modificacoes.filter((modificacao) => modificacao.nome !== nome);
    this.definirCarrinho(
      this.lerCarrinho().map((atual) =>
        atual.uid === uid ? { ...atual, modificacoes: [...semMod, { nome, empilhamentos }] } : atual,
      ),
    );
    this.criandoModUid.set(null);
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
    const existente = this.lerAmplificadores().find((amplificador) => amplificador.nome === nome);
    if (existente) {
      if (existente.empilhamentos < maximoEfetivo && totalStacks < limite) {
        this.definirAmplificadores(
          this.lerAmplificadores().map((amplificador) =>
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
      this.definirAmplificadores([
        ...this.lerAmplificadores(),
        { nome, empilhamentos: definicao.empilhamentosIniciais },
      ]);
      this.sinalizarAdicao(`amp:${nome}`);
    }
  }

  protected removerAmplificador(nome: string): void {
    const existente = this.lerAmplificadores().find((amplificador) => amplificador.nome === nome);
    if (!existente) {
      return;
    }
    if (existente.empilhamentos <= 1) {
      this.definirAmplificadores(
        this.lerAmplificadores().filter((amplificador) => amplificador.nome !== nome),
      );
      return;
    }
    this.definirAmplificadores(
      this.lerAmplificadores().map((amplificador) =>
        amplificador.nome === nome
          ? { ...amplificador, empilhamentos: amplificador.empilhamentos - 1 }
          : amplificador,
      ),
    );
  }

  /** Pede confirmação antes de esvaziar o carrinho (a ação em si fica no `confirmarEsvaziar`). */
  protected esvaziarCarrinho(): void {
    this.confirmandoEsvaziar.set(true);
  }

  protected cancelarEsvaziar(): void {
    this.confirmandoEsvaziar.set(false);
  }

  /** Confirma o esvaziamento: limpa itens e amplificadores do carrinho ativo. */
  protected confirmarEsvaziar(): void {
    this.definirCarrinho([]);
    this.definirAmplificadores([]);
    this.painelAbertos.set(new Set());
    this.confirmandoEsvaziar.set(false);
  }

  /**
   * Volta a aba ao estado padrão: recursos ao preset de fábrica (`reset()` — Dinheiro 1000,
   * Prestígio 0, Inventário 5, Vontade 1), carrinho/amplificadores/painéis vazios, busca limpa e
   * catálogo na primeira categoria. **Zera também o estado de Venda (m1-20)** — carrinho de
   * venda/taxa/contadores de fragmentos ao padrão (o modo em si vem da rota, não se reseta aqui).
   * O `effect` de persistência regrava o estado (só do carrinho de compra) no `localStorage`
   * (m1-11), então recarregar a página segue no padrão — **descarta um carrinho salvo**, que é
   * justamente o que "Limpar" faz aqui.
   */
  protected limpar(): void {
    this.formulario.reset();
    this.carrinho.set([]);
    this.amplificadores.set([]);
    this.carrinhoVenda.set([]);
    this.amplificadoresVenda.set([]);
    this.painelAbertos.set(new Set());
    this.busca.set('');
    this.categoriaAtiva.set(ItemCategoriaEnum.CORPO_A_CORPO);
    this.uidContador = 0;
    this.taxaVenda.set(TaxaVendaEnum.NORMAL);
    this.fragmentos.set(fragmentosZerados());
    this.confirmandoEsvaziar.set(false);
    this.criandoItem.set(false);
    this.criandoModUid.set(null);
    this.uidConfirmandoRemocao.set(null);
    this.uidRemovendoStack.set(null);
  }

  // === Modo Venda (m1-20) — ações e cálculos ===
  protected definirTaxa(taxa: TaxaVendaEnum): void {
    this.taxaVenda.set(taxa);
  }

  protected incrementarFragmento(modulo: FragmentoModuloEnum, tipo: FragmentoTipoEnum): void {
    this.ajustarFragmento(modulo, tipo, 1);
  }

  protected decrementarFragmento(modulo: FragmentoModuloEnum, tipo: FragmentoTipoEnum): void {
    this.ajustarFragmento(modulo, tipo, -1);
  }

  private ajustarFragmento(modulo: FragmentoModuloEnum, tipo: FragmentoTipoEnum, delta: number): void {
    this.fragmentos.update((grade) => ({
      ...grade,
      [modulo]: { ...grade[modulo], [tipo]: Math.max(0, grade[modulo][tipo] + delta) },
    }));
  }

  /** Contadores de fragmentos achatados (módulo × tipo) — entrada do motor de venda de fragmentos. */
  private readonly contadoresFragmentos = computed<readonly ContadorFragmentoDto[]>(() => {
    const grade = this.fragmentos();
    return MODULOS_ORDEM.flatMap((modulo) => [
      { modulo, tipo: FragmentoTipoEnum.POTENCIALIZADOR, quantidade: grade[modulo][FragmentoTipoEnum.POTENCIALIZADOR] },
      { modulo, tipo: FragmentoTipoEnum.CONSTRUTOR, quantidade: grade[modulo][FragmentoTipoEnum.CONSTRUTOR] },
    ]);
  });

  /** Valor de venda dos itens do carrinho de venda na taxa escolhida (do motor). */
  protected readonly valorVendaItens = computed(() =>
    calcularValorVendaCarrinho({
      itens: this.lerCarrinho(),
      amplificadores: this.lerAmplificadores(),
      taxa: this.taxaVenda(),
    }),
  );

  /** Valor total da venda de fragmentos (do motor). */
  protected readonly totalFragmentos = computed(() =>
    calcularVendaFragmentos({ contadores: this.contadoresFragmentos() }),
  );

  /** Total de venda = itens (na taxa) + fragmentos. */
  protected readonly totalVenda = computed(() => this.valorVendaItens() + this.totalFragmentos());

  protected readonly valorVendaItensTexto = computed(() => this.formatarDinheiro(this.valorVendaItens()));
  protected readonly totalFragmentosTexto = computed(() => this.formatarDinheiro(this.totalFragmentos()));
  protected readonly totalVendaTexto = computed(() => this.formatarDinheiro(this.totalVenda()));

  /** Linhas do bloco de fragmentos (uma por módulo V→I), com contadores, valores unitários e subtotal. */
  protected readonly linhasFragmentos = computed(() => {
    const grade = this.fragmentos();
    return MODULOS_ORDEM.map((modulo) => {
      const qtdePotencializador = grade[modulo][FragmentoTipoEnum.POTENCIALIZADOR];
      const qtdeConstrutor = grade[modulo][FragmentoTipoEnum.CONSTRUTOR];
      const valorPotencializador = obterValorFragmento({ modulo, tipo: FragmentoTipoEnum.POTENCIALIZADOR });
      const valorConstrutor = obterValorFragmento({ modulo, tipo: FragmentoTipoEnum.CONSTRUTOR });
      const subtotal = qtdePotencializador * valorPotencializador + qtdeConstrutor * valorConstrutor;
      return {
        modulo,
        rotulo: `Módulo ${modulo}`,
        qtdePotencializador,
        qtdeConstrutor,
        valorPotencializadorTexto: this.formatarDinheiro(valorPotencializador),
        valorConstrutorTexto: this.formatarDinheiro(valorConstrutor),
        subtotalTexto: this.formatarDinheiro(subtotal),
      };
    });
  });

  /** Expostos ao template para iterar as colunas de tipo de fragmento. */
  protected readonly tipoPotencializador = FragmentoTipoEnum.POTENCIALIZADOR;
  protected readonly tipoConstrutor = FragmentoTipoEnum.CONSTRUTOR;

  // === Exportar/importar por código e persistência (m1-11) ===
  protected abrirModalExportarCodigo(): void {
    this.codigoExportado.set(this.exportarCarrinho());
    this.copiadoComSucesso.set(false);
    this.modalExportarAberto.set(true);
  }

  protected fecharModalExportar(): void {
    this.modalExportarAberto.set(false);
  }

  protected async copiarCodigoCarrinho(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.codigoExportado());
      this.copiadoComSucesso.set(true);
    } catch {
      this.copiadoComSucesso.set(false);
    }
  }

  protected abrirModalImportar(): void {
    this.codigoImportarTexto.set('');
    this.erroImportar.set(null);
    this.modalImportarAberto.set(true);
  }

  protected fecharModalImportar(): void {
    this.modalImportarAberto.set(false);
  }

  protected aoDigitarCodigoImportar(evento: Event): void {
    this.codigoImportarTexto.set((evento.target as HTMLTextAreaElement).value);
  }

  protected confirmarImportarCarrinho(): void {
    const importado = this.importarCarrinho(this.codigoImportarTexto());
    if (!importado) {
      this.erroImportar.set(
        'Código inválido ou incompatível. Confira se copiou o código completo.',
      );
      return;
    }
    this.modalImportarAberto.set(false);
  }

  /** Serializa o estado atual num código copiável (`CRPG-COMPRAS-V1:<base64>`). */
  private exportarCarrinho(): string {
    const estado: EstadoCarrinhoPersistidoV1 = {
      versao: 1,
      recursos: this.formulario.getRawValue(),
      carrinho: this.carrinho(),
      amplificadores: this.amplificadores(),
    };
    return PREFIXO_CODIGO_EXPORTACAO + btoa(encodeURIComponent(JSON.stringify(estado)));
  }

  /** Reconstrói o carrinho a partir de um código exportado. `false` se inválido/incompatível. */
  private importarCarrinho(codigo: string): boolean {
    const texto = codigo.trim();
    if (!texto.startsWith(PREFIXO_CODIGO_EXPORTACAO)) {
      return false;
    }
    const estado = this.decodificarEstado(texto.slice(PREFIXO_CODIGO_EXPORTACAO.length));
    if (!estado) {
      return false;
    }
    this.aplicarEstado(estado);
    return true;
  }

  private decodificarEstado(base64: string): EstadoCarrinhoPersistidoV1 | null {
    try {
      const estado = JSON.parse(decodeURIComponent(atob(base64))) as EstadoCarrinhoPersistidoV1;
      return this.validarEstado(estado) ? estado : null;
    } catch {
      return null;
    }
  }

  private validarEstado(estado: unknown): estado is EstadoCarrinhoPersistidoV1 {
    if (typeof estado !== 'object' || estado === null) {
      return false;
    }
    const candidato = estado as Partial<EstadoCarrinhoPersistidoV1>;
    return (
      candidato.versao === 1 &&
      typeof candidato.recursos?.dinheiro === 'number' &&
      typeof candidato.recursos?.prestigio === 'number' &&
      typeof candidato.recursos?.inventario === 'number' &&
      typeof candidato.recursos?.vontade === 'number' &&
      Array.isArray(candidato.carrinho) &&
      Array.isArray(candidato.amplificadores)
    );
  }

  private aplicarEstado(estado: EstadoCarrinhoPersistidoV1): void {
    this.formulario.patchValue(estado.recursos);
    this.carrinho.set(estado.carrinho);
    this.amplificadores.set(estado.amplificadores);
    this.painelAbertos.set(new Set());
    this.uidContador = estado.carrinho.reduce((maximo, item) => Math.max(maximo, item.uid + 1), 0);
  }

  private carregarEstado(): EstadoCarrinhoPersistidoV1 | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (!bruto) {
      return null;
    }
    try {
      const estado = JSON.parse(bruto) as EstadoCarrinhoPersistidoV1;
      return this.validarEstado(estado) ? estado : null;
    } catch {
      return null;
    }
  }

  private salvarEstado(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const estado: EstadoCarrinhoPersistidoV1 = {
      versao: 1,
      recursos: this.recursos(),
      carrinho: this.carrinho(),
      amplificadores: this.amplificadores(),
    };
    localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(estado));
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

  private montarItemCarrinho(item: ItemCarrinho): ItemCarrinhoVM {
    const limite = obterLimiteModificacoes({ prestigio: this.recursos().prestigio });
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
        soma + modificacao.empilhamentos * this.pesoModificacao(item, modificacao.nome),
      0,
    );
    const pesoBruto = (item.peso + pesoMods) * item.quantidade;
    const pesoTexto =
      ehArmazenamento && !item.guardada
        ? `${this.formatarPeso(pesoBruto)} slots se guardada`
        : `${this.formatarPeso(contaPeso ? pesoBruto : 0)} slots`;

    const definicoes = this.definicoesModificacao(item);
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
      uid: item.uid,
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
      painelAberto: this.painelAbertos().has(item.uid),
      modsAtivas,
      secoes: this.montarSecoes(item, modsUsados, limite),
    };
  }

  private montarSecoes(
    item: ItemCarrinho,
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
    item: ItemCarrinho,
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

  // === Helpers de estado ===
  /** O carrinho ativo (itens) conforme o modo — compra ou venda. */
  private lerCarrinho(): readonly ItemCarrinho[] {
    return this.modo() === 'vender' ? this.carrinhoVenda() : this.carrinho();
  }

  private definirCarrinho(valor: readonly ItemCarrinho[]): void {
    (this.modo() === 'vender' ? this.carrinhoVenda : this.carrinho).set(valor);
  }

  /** Os amplificadores do carrinho ativo conforme o modo — compra ou venda. */
  private lerAmplificadores(): readonly AmplificadorCarrinho[] {
    return this.modo() === 'vender' ? this.amplificadoresVenda() : this.amplificadores();
  }

  private definirAmplificadores(valor: readonly AmplificadorCarrinho[]): void {
    (this.modo() === 'vender' ? this.amplificadoresVenda : this.amplificadores).set(valor);
  }

  private definirModificacao(uid: number, modNome: string, empilhamentos: number): void {
    this.definirCarrinho(
      this.lerCarrinho().map((item) => {
        if (item.uid !== uid) {
          return item;
        }
        const semMod = item.modificacoes.filter((modificacao) => modificacao.nome !== modNome);
        const modificacoes =
          empilhamentos <= 0 ? semMod : [...semMod, { nome: modNome, empilhamentos }];
        return { ...item, modificacoes };
      }),
    );
  }

  private fecharPainel(uid: number): void {
    if (!this.painelAbertos().has(uid)) {
      return;
    }
    const abertos = new Set(this.painelAbertos());
    abertos.delete(uid);
    this.painelAbertos.set(abertos);
  }

  private definicoesModificacao(item: ItemCarrinho): readonly ModificacaoDados[] {
    const proprias = MODIFICACOES[item.categoria] ?? [];
    const categoriaEmprestada = obterCategoriaEmprestada(item);
    if (!categoriaEmprestada) {
      return proprias;
    }
    return [...proprias, ...(MODIFICACOES[categoriaEmprestada] ?? [])];
  }

  private empilhamentosDaMod(item: ItemCarrinho, modNome: string): number {
    return item.modificacoes.find((modificacao) => modificacao.nome === modNome)?.empilhamentos ?? 0;
  }

  private empilhamentosDoAmplificador(nome: string): number {
    return this.lerAmplificadores().find((amplificador) => amplificador.nome === nome)?.empilhamentos ?? 0;
  }

  private modsUsados(item: ItemCarrinho): number {
    return item.modificacoes.reduce((soma, modificacao) => soma + modificacao.empilhamentos, 0);
  }

  private pesoModificacao(item: ItemCarrinho, modNome: string): number {
    const definicao = this.definicoesModificacao(item).find((mod) => mod.nome === modNome);
    return definicao && definicao.peso !== undefined ? definicao.peso : 0.2;
  }

  private rotuloCategoria(categoria: ItemCategoriaEnum): string {
    return CATALOGO_CATEGORIAS.find((atual) => atual.categoria === categoria)?.rotulo ?? '';
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
