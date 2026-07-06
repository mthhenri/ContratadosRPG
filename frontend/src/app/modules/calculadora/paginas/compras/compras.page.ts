import { Component, computed, effect, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';

import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';
import {
  AMPLIFICADORES,
  calcularResumoCompras,
  calcularStatItem,
  CATALOGO_CATEGORIAS,
  CATALOGO_ITENS,
  contarComprasModificacao,
  ItemCatalogo,
  MODIFICACOES,
  ModificacaoDados,
  obterCategoriaEmprestada,
  obterCustoModificacao,
  obterLimiteModificacoes,
  StatItemDto,
  verificarConflitoModificacao,
} from '@contratados-rpg/shared/regras/compras';

import { Icone } from '../../../../shared/icone/icone.component';
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
  imports: [ReactiveFormsModule, StepInput, AjudaCalculadora, Icone],
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
  private readonly carrinho = signal<readonly ItemCarrinho[]>([]);
  private readonly amplificadores = signal<readonly AmplificadorCarrinho[]>([]);
  protected readonly categoriaAtiva = signal<ItemCategoriaEnum>(ItemCategoriaEnum.CORPO_A_CORPO);
  protected readonly busca = signal('');
  private readonly painelAbertos = signal<ReadonlySet<number>>(new Set());
  private uidContador = 0;

  // === Exportar/importar por código (m1-11) ===
  protected readonly modalExportarAberto = signal(false);
  protected readonly modalImportarAberto = signal(false);
  protected readonly codigoExportado = signal('');
  protected readonly codigoImportarTexto = signal('');
  protected readonly erroImportar = signal<string | null>(null);
  protected readonly copiadoComSucesso = signal(false);

  constructor() {
    const estadoPersistido = this.carregarEstado();
    if (estadoPersistido) {
      this.aplicarEstado(estadoPersistido);
    }
    effect(() => this.salvarEstado());
  }

  private readonly termoBusca = computed(() => this.busca().trim().toLowerCase());

  /** Recorte completo da aba (patente, limites, gasto, peso, amplificadores, penalidade) — do motor. */
  protected readonly resumo = computed(() => {
    const recursos = this.recursos();
    return calcularResumoCompras({
      itens: this.carrinho(),
      amplificadores: this.amplificadores(),
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
    () => this.carrinho().length === 0 && this.amplificadores().length === 0,
  );

  protected readonly itensCarrinho = computed<readonly ItemCarrinhoVM[]>(() =>
    this.carrinho().map((item) => this.montarItemCarrinho(item)),
  );

  protected readonly amplificadoresCarrinho = computed<readonly AmpCarrinhoVM[]>(() => {
    const resumo = this.resumo();
    const maxEmpilhamentos = resumo.limiteModificacoes.maxEmpilhamentos;
    const totalStacks = resumo.empilhamentosAmplificador;
    const limite = resumo.limiteAmplificadores;
    return this.amplificadores().map((amplificador) => {
      const definicao = AMPLIFICADORES.find((atual) => atual.nome === amplificador.nome);
      const maximoEfetivo = Math.min(definicao?.empilhamentoMaximo ?? 5, maxEmpilhamentos);
      return {
        nome: amplificador.nome,
        efeito: definicao?.efeito ?? '',
        empilhamentos: amplificador.empilhamentos,
        maximoEfetivo,
        custoTexto: this.formatarDinheiro(3000 + Math.max(0, amplificador.empilhamentos - 1) * 1000),
        penalidade: Math.max(0, amplificador.empilhamentos - 1) * 2,
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
    const empilhavel = CATEGORIAS_EMPILHAVEIS.includes(vm.categoria);
    const existente = empilhavel
      ? this.carrinho().find(
          (item) => item.categoria === vm.categoria && item.nome === vm.item.nome,
        )
      : undefined;
    if (existente) {
      this.carrinho.set(
        this.carrinho().map((item) =>
          item.uid === existente.uid ? { ...item, quantidade: item.quantidade + 1 } : item,
        ),
      );
      return;
    }
    this.carrinho.set([
      ...this.carrinho(),
      {
        uid: this.uidContador++,
        nome: vm.item.nome,
        categoria: vm.categoria,
        custo: vm.item.custo,
        peso: vm.item.peso,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
      },
    ]);
  }

  // === Ações do carrinho ===
  protected removerItem(uid: number): void {
    const item = this.carrinho().find((atual) => atual.uid === uid);
    if (!item) {
      return;
    }
    if (item.quantidade > 1) {
      this.carrinho.set(
        this.carrinho().map((atual) =>
          atual.uid === uid ? { ...atual, quantidade: atual.quantidade - 1 } : atual,
        ),
      );
      return;
    }
    this.carrinho.set(this.carrinho().filter((atual) => atual.uid !== uid));
    this.fecharPainel(uid);
  }

  protected alternarGuardada(uid: number): void {
    this.carrinho.set(
      this.carrinho().map((item) =>
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
    const item = this.carrinho().find((atual) => atual.uid === uid);
    if (!item) {
      return;
    }
    const definicao = this.definicoesModificacao(item).find((mod) => mod.nome === modNome);
    if (!definicao) {
      return;
    }
    const limite = obterLimiteModificacoes({ prestigio: this.recursos().prestigio });
    const conflito = verificarConflitoModificacao({ item, modificacao: modNome });
    if (conflito.bloqueadaPor.length > 0) {
      return;
    }
    const atuais = this.empilhamentosDaMod(item, modNome);
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
    const item = this.carrinho().find((atual) => atual.uid === uid);
    if (!item) {
      return;
    }
    const definicao = this.definicoesModificacao(item).find((mod) => mod.nome === modNome);
    const atuais = this.empilhamentosDaMod(item, modNome);
    if (!definicao || atuais === 0) {
      return;
    }
    const novos = atuais <= definicao.empilhamentosIniciais ? 0 : atuais - 1;
    this.definirModificacao(uid, modNome, novos);
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
    const existente = this.amplificadores().find((amplificador) => amplificador.nome === nome);
    if (existente) {
      if (existente.empilhamentos < maximoEfetivo && totalStacks < limite) {
        this.amplificadores.set(
          this.amplificadores().map((amplificador) =>
            amplificador.nome === nome
              ? { ...amplificador, empilhamentos: amplificador.empilhamentos + 1 }
              : amplificador,
          ),
        );
      }
      return;
    }
    if (totalStacks + 1 <= limite) {
      this.amplificadores.set([
        ...this.amplificadores(),
        { nome, empilhamentos: definicao.empilhamentosIniciais },
      ]);
    }
  }

  protected removerAmplificador(nome: string): void {
    const existente = this.amplificadores().find((amplificador) => amplificador.nome === nome);
    if (!existente) {
      return;
    }
    if (existente.empilhamentos <= 1) {
      this.amplificadores.set(
        this.amplificadores().filter((amplificador) => amplificador.nome !== nome),
      );
      return;
    }
    this.amplificadores.set(
      this.amplificadores().map((amplificador) =>
        amplificador.nome === nome
          ? { ...amplificador, empilhamentos: amplificador.empilhamentos - 1 }
          : amplificador,
      ),
    );
  }

  protected esvaziarCarrinho(): void {
    this.carrinho.set([]);
    this.amplificadores.set([]);
    this.painelAbertos.set(new Set());
  }

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
        podeAumentar:
          !!definicao &&
          modificacao.empilhamentos < definicao.empilhamentoMaximo &&
          modificacao.empilhamentos < limite.maxEmpilhamentos &&
          modsUsados < limite.maxModificacoes,
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
  private definirModificacao(uid: number, modNome: string, empilhamentos: number): void {
    this.carrinho.set(
      this.carrinho().map((item) => {
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
    return this.amplificadores().find((amplificador) => amplificador.nome === nome)?.empilhamentos ?? 0;
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
