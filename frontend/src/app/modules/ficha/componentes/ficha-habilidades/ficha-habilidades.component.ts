import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  ArquetipoEnum,
  ClasseEnum,
  HabilidadeCategoriaEnum,
  ROTULOS_HABILIDADE_CATEGORIA,
} from '@contratados-rpg/shared/enums';
import type { FichaHabilidadeDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  aplicarReducaoCustoEnergia,
  catalogoHabilidades,
  classeBaseDeHabilidades,
  ehHabilidadeInicial,
  type HabilidadeCatalogoItemDto,
} from '@contratados-rpg/shared/regras/agente';
import type { AmplificadorAplicadoDto } from '@contratados-rpg/shared/regras/compras';

import { AutoFocus } from '../../../../shared/auto-focus/auto-focus.directive';
import { HoldRepeat } from '../../../../shared/hold-repeat/hold-repeat.directive';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { FichaHabilidadeSeletor } from '../ficha-habilidade-seletor/ficha-habilidade-seletor.component';
import { rotuloArquetipo, rotuloClasse } from '../../rotulos-ficha';

/** Uma habilidade da ficha com o índice original (preservado ao filtrar pela busca). */
interface HabilidadeIndexada {
  readonly habilidade: FichaHabilidadeDto;
  readonly indice: number;
}

/** Categoria + rótulo legível para o `<select>` e o chip (rótulos vêm do shared). */
interface OpcaoCategoria {
  readonly valor: HabilidadeCategoriaEnum;
  readonly rotulo: string;
}

const CATEGORIAS: readonly OpcaoCategoria[] = (
  Object.values(HabilidadeCategoriaEnum) as HabilidadeCategoriaEnum[]
).map((valor) => ({ valor, rotulo: ROTULOS_HABILIDADE_CATEGORIA[valor] }));

/** Os 4 grupos do resumo por categoria (m3-48) — mesmos buckets de `contagemPorCategoria`. */
type FiltroCategoriaResumo = 'arquetipo' | 'classe' | 'geral' | 'outraClasse';

/** Ordem canônica dos 4 tipos — usada pra checar "todos selecionados" e montar a mensagem de vazio. */
const TIPOS_FILTRO_RESUMO: readonly FiltroCategoriaResumo[] = [
  'arquetipo',
  'classe',
  'geral',
  'outraClasse',
];

/** Rótulos fixos do resumo — `arquetipo` vira "Subclasse" numa ficha Experimento (P-014, ver `rotuloResumoArquetipo`). */
const ROTULO_FILTRO_RESUMO: Readonly<Record<FiltroCategoriaResumo, string>> = {
  arquetipo: 'Arquétipo',
  classe: 'Classe',
  geral: 'Geral',
  outraClasse: 'Outra classe/arquétipo',
};

/** Junta rótulos em prosa: "A", "A ou B", "A, B ou C" — usado na mensagem de lista vazia. */
function juntarComOu(rotulos: readonly string[]): string {
  if (rotulos.length <= 1) {
    return rotulos[0] ?? '';
  }
  return `${rotulos.slice(0, -1).join(', ')} ou ${rotulos.at(-1)}`;
}

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
 *
 * **Amplificador `Conservador`** (`shared/regras/agente/amplificador`, doc — "⬡ Amplificadores":
 * "-1 de Energia em custos de habilidades, mínimo 1"): o custo exibido (`[N E]`) e o efetivamente
 * debitado ao Utilizar já saem com o desconto aplicado — habilidades sem custo (`[0 E]`) ficam
 * intactas, o piso de 1 só vale pra quem já custa Energia.
 */
@Component({
  selector: 'app-ficha-habilidades',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    AutoFocus,
    HoldRepeat,
    OverflowFade,
    Tooltip,
    FichaHabilidadeSeletor,
  ],
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
  /** Amplificadores portados — hoje só `Conservador` mexe aqui (desconto no custo de Energia). */
  readonly amplificadores = input<readonly AmplificadorAplicadoDto[]>([]);
  /** `true` no card compacto (m2-20) — `&__lista` ganha um teto mais baixo (ver SCSS). */
  readonly compacto = input(false);
  /**
   * Cor de identidade visual da ficha (m3-61) — alimenta `--cor-ficha` (ver SCSS), que a categoria
   * Personalidade usa em vez do `--accent` fixo de tema por usuário. `null`/ausente: sem cor
   * definida, o token cai no `--accent` de quem visualiza (mesmo fallback do avatar da ficha).
   */
  readonly cor = input<string | null>(null);

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

  /**
   * Tipos do resumo ativos como filtro (m3-48) — **cumulativo**: vazio = sem filtro (todos os
   * tipos aparecem); cada clique soma um tipo à seleção. Se a seleção chegar a cobrir os 4 tipos,
   * volta a vazio (equivalente a "todos" — não faz sentido manter os 4 acesos). Estado de UI
   * volátil, não persiste após sair da ficha (fora de escopo qualquer campo novo em `dados`).
   */
  protected readonly filtroCategoria = signal<ReadonlySet<FiltroCategoriaResumo>>(new Set());

  /** Gasto recém-confirmado (índice + valor) — acende o feedback no botão Utilizar por ~1s. */
  protected readonly gastoRecente = signal<{ indice: number; valor: number } | null>(null);
  private temporizadorGasto: ReturnType<typeof setTimeout> | null = null;

  /** Cadência do hold (segurar) e intervalo mínimo entre cliques repetidos (spam), em ms. */
  private static readonly HOLD_MS = 100;
  private static readonly SPAM_MIN_MS = 50;

  /** Repetição enquanto segura o Utilizar (hold); e o instante do último gasto (trava anti-spam). */
  private holdIntervalo: ReturnType<typeof setInterval> | null = null;
  private ultimoGastoMs = Number.NEGATIVE_INFINITY;
  /** Listener global de soltura enquanto o hold roda (no lugar do pointer capture). */
  private soltarNoDocumento: (() => void) | null = null;

  constructor() {
    this.busca.valueChanges.subscribe((valor) => this.buscaTexto.set(valor));
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizadorGasto !== null) {
        clearTimeout(this.temporizadorGasto);
      }
      this.pararHold();
    });
  }

  /** Só oferece a busca quando a lista já é grande o bastante para valer a pena procurar. */
  protected readonly mostrarBusca = computed(() => this.habilidades().length > 4);

  /** Rótulo do bucket "Arquétipo" do resumo — "Subclasse" numa ficha Experimento (P-014). Civil
   * (`classeBaseDeHabilidades` devolve `null`) não conta como subclasse aqui. */
  protected readonly rotuloResumoArquetipo = computed(() => {
    const base = classeBaseDeHabilidades(this.classe());
    return base !== null && base !== this.classe() ? 'Subclasse' : 'Arquétipo';
  });

  /**
   * Contagem por categoria (resumo acima da busca) — Arquétipo/Classe/Geral/Outra classe. Uma
   * habilidade de Classe/Arquétipo vinda de **outra** origem (`ehDeOutraOrigem` — mesmo critério
   * do sufixo do chip, ex. "Classe - Especialista") conta em "outra classe", não na própria.
   */
  protected readonly contagemPorCategoria = computed(() => {
    let arquetipo = 0;
    let classe = 0;
    let geral = 0;
    let outraClasse = 0;
    for (const habilidade of this.habilidades()) {
      const bucket = this.bucketResumo(habilidade);
      if (bucket === 'arquetipo') {
        arquetipo++;
      } else if (bucket === 'classe') {
        classe++;
      } else if (bucket === 'geral') {
        geral++;
      } else if (bucket === 'outraClasse') {
        outraClasse++;
      }
    }
    return { arquetipo, classe, geral, outraClasse };
  });

  /**
   * Bucket do resumo por categoria (m3-48) a que a habilidade pertence, ou `null` quando não cai em
   * nenhum dos 4 grupos exibidos (ex.: Personalidade/Especialidade/Civil) — mesmo critério usado por
   * `contagemPorCategoria` e pelo filtro de `habilidadesFiltradas`. Subclasse (P-014) soma no mesmo
   * bucket de Arquétipo — é o mesmo conceito, só renomeado na exibição (`rotuloResumoArquetipo`);
   * subclasses nunca cruzam (doc), então não existe um caso "de outra subclasse" a separar aqui.
   */
  private bucketResumo(habilidade: FichaHabilidadeDto): FiltroCategoriaResumo | null {
    if (
      habilidade.categoria === HabilidadeCategoriaEnum.OUTRA_CLASSE ||
      this.ehDeOutraOrigem(habilidade)
    ) {
      return 'outraClasse';
    }
    if (
      habilidade.categoria === HabilidadeCategoriaEnum.ARQUETIPO ||
      habilidade.categoria === HabilidadeCategoriaEnum.SUBCLASSE
    ) {
      return 'arquetipo';
    }
    if (habilidade.categoria === HabilidadeCategoriaEnum.CLASSE) {
      return 'classe';
    }
    if (habilidade.categoria === HabilidadeCategoriaEnum.GERAL) {
      return 'geral';
    }
    return null;
  }

  /**
   * Soma/tira um tipo da seleção cumulativa. Clicar de novo no mesmo tipo o tira; somar os 4
   * tipos limpa tudo (equivale a "todos" — ver o comentário de `filtroCategoria`).
   */
  protected alternarFiltro(tipo: FiltroCategoriaResumo): void {
    const proximo = new Set(this.filtroCategoria());
    if (proximo.has(tipo)) {
      proximo.delete(tipo);
    } else {
      proximo.add(tipo);
    }
    this.filtroCategoria.set(proximo.size === TIPOS_FILTRO_RESUMO.length ? new Set() : proximo);
  }

  /** Limpa toda a seleção de tipos — volta a mostrar todas as habilidades. */
  protected limparFiltroCategoria(): void {
    this.filtroCategoria.set(new Set());
  }

  /**
   * Clique direito num contador **tira** aquele tipo da seleção (sem alternar/somar — é sempre
   * remoção, mesmo clicando várias vezes). No-op se o tipo já não estiver selecionado. Suprime o
   * menu de contexto nativo do browser.
   */
  protected removerFiltroPorContexto(tipo: FiltroCategoriaResumo, evento: MouseEvent): void {
    evento.preventDefault();
    if (!this.filtroCategoria().has(tipo)) {
      return;
    }
    const proximo = new Set(this.filtroCategoria());
    proximo.delete(tipo);
    this.filtroCategoria.set(proximo);
  }

  /**
   * Habilidades a exibir, com o índice **original** preservado (o editor/remover/utilizar operam
   * sobre a lista real). Filtra pelo tipo ativo do resumo (m3-48) e por nome/descrição quando há
   * busca — os dois filtros compõem.
   */
  protected readonly habilidadesFiltradas = computed<HabilidadeIndexada[]>(() => {
    const indexadas = this.habilidades().map((habilidade, indice) => ({ habilidade, indice }));
    const filtro = this.filtroCategoria();
    const porCategoria =
      filtro.size === 0
        ? indexadas
        : indexadas.filter(({ habilidade }) => {
            const bucket = this.bucketResumo(habilidade);
            return bucket !== null && filtro.has(bucket);
          });
    const termo = this.buscaTexto().trim().toLowerCase();
    if (!termo) {
      return porCategoria;
    }
    return porCategoria.filter(
      ({ habilidade }) =>
        habilidade.nome.toLowerCase().includes(termo) ||
        habilidade.descricao.toLowerCase().includes(termo),
    );
  });

  /** Mensagem da lista vazia (m3-48) — combina os tipos ativos (em prosa, "A ou B") com a busca. */
  protected readonly mensagemListaVazia = computed<string>(() => {
    const termo = this.buscaTexto().trim();
    const filtro = this.filtroCategoria();
    const rotulos = TIPOS_FILTRO_RESUMO.filter((tipo) => filtro.has(tipo)).map((tipo) =>
      tipo === 'arquetipo' ? this.rotuloResumoArquetipo() : ROTULO_FILTRO_RESUMO[tipo],
    );
    const rotuloFiltro = rotulos.length ? juntarComOu(rotulos) : null;
    if (termo && rotuloFiltro) {
      return `Nenhuma habilidade de ${rotuloFiltro} encontrada para “${termo}”.`;
    }
    if (termo) {
      return `Nenhuma habilidade encontrada para “${termo}”.`;
    }
    if (rotuloFiltro) {
      return `Nenhuma habilidade de ${rotuloFiltro}.`;
    }
    return '';
  });

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

  /** Busca sobre as habilidades já adicionadas (por nome/descrição) — para achá-las rápido. */
  protected readonly busca = new FormControl('', { nonNullable: true });
  private readonly buscaTexto = signal('');

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

  /**
   * Adiciona uma habilidade do catálogo **direto na ficha** (com a origem), sem abrir o editor nem
   * fechar o seletor — o usuário segue montando a lista. Editar depois é pelo ✎ da própria lista.
   */
  protected aoAdicionarDoCatalogo(item: HabilidadeCatalogoItemDto): void {
    const nova: FichaHabilidadeDto = {
      nome: item.nome,
      categoria: item.categoria,
      custoEnergia: item.custoEnergia,
      descricao: item.descricao,
      ...(item.origem === undefined ? {} : { origem: item.origem }),
    };
    this.emitir([...this.habilidades(), nova]);
  }

  /** Remove da ficha (por nome) uma habilidade adicionada pelo seletor — o "✕" do "Na ficha". */
  protected aoRemoverDoCatalogo(nome: string): void {
    this.emitir(this.habilidades().filter((habilidade) => habilidade.nome !== nome));
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
   * Desconto de `Conservador` (`shared/regras/agente/amplificador`) sobre um custo **fixo** de
   * habilidade — o custo variável (`[X E]`) não passa por aqui: o jogador já digita o valor exato
   * que quer gastar naquela circunstância, não o custo de catálogo que o amplificador desconta.
   */
  private custoComDesconto(custoEnergia: number): number {
    return aplicarReducaoCustoEnergia(this.amplificadores(), custoEnergia);
  }

  /** Custo exibido no chip `[N E]` da lista — já com o desconto de `Conservador` aplicado. */
  protected custoExibido(custoEnergia: number | null): number | null {
    return custoEnergia === null ? null : this.custoComDesconto(custoEnergia);
  }

  /**
   * Utiliza a habilidade, gastando Energia. Custo fixo emite direto (já descontado); custo
   * variável (`[X E]`) abre um mini-campo perguntando quanto gastar.
   */
  protected utilizar(indice: number, habilidade: FichaHabilidadeDto): void {
    if (habilidade.custoEnergia === 0) {
      return; // sem custo de Energia: nada a gastar (o botão fica desabilitado)
    }
    if (habilidade.custoEnergia === null) {
      this.custoVariavel.setValue(0);
      this.indiceUtilizando.set(indice);
      return;
    }
    const custo = this.custoComDesconto(habilidade.custoEnergia);
    this.habilidadeUtilizada.emit(custo);
    this.sinalizarGasto(indice, custo);
  }

  /**
   * Pressiona o Utilizar (`pointerdown`). Custo variável abre o mini-campo (um toque). Custo fixo
   * **gasta uma vez na hora** (limitado a 1 a cada `SPAM_MIN_MS` para cliques repetidos) e, enquanto
   * **segurar**, repete o gasto a cada `HOLD_MS`. O `setInterval` roda independentemente da posição
   * do mouse, então segurar continua mesmo com o cursor fora do botão; a parada vem de soltar em
   * qualquer lugar (`pointerup` no `window`).
   *
   * **Sem `setPointerCapture` de propósito**: no app real ela conflitava com o re-render do Angular a
   * cada gasto (o `lostpointercapture` disparado pelo re-render parava o hold no 1º gasto, e recapturar
   * a cada clique rápido "engasgava" o botão).
   */
  protected aoPressionarUtilizar(
    indice: number,
    habilidade: FichaHabilidadeDto,
    evento: PointerEvent,
  ): void {
    if (evento.button !== 0) {
      return;
    }
    if (habilidade.custoEnergia === null) {
      this.utilizar(indice, habilidade);
      return;
    }
    if (habilidade.custoEnergia === 0) {
      return; // 0 E: sem gasto, sem hold (o botão está desabilitado, mas o pointerdown ainda chega)
    }
    const custo = this.custoComDesconto(habilidade.custoEnergia);
    this.gastarComLimite(indice, custo);
    this.pararHold();
    this.holdIntervalo = setInterval(() => this.gastar(indice, custo), FichaHabilidades.HOLD_MS);
    this.soltarNoDocumento = () => this.pararHold();
    window.addEventListener('pointerup', this.soltarNoDocumento);
    window.addEventListener('pointercancel', this.soltarNoDocumento);
  }

  /** Gasto de clique com trava anti-spam: no máximo 1 a cada `SPAM_MIN_MS`. */
  private gastarComLimite(indice: number, custo: number): void {
    if (performance.now() - this.ultimoGastoMs < FichaHabilidades.SPAM_MIN_MS) {
      return;
    }
    this.gastar(indice, custo);
  }

  /**
   * Ativação por **teclado** (Enter/Espaço geram um `click` com `detail === 0`) — um uso. Cliques de
   * mouse (`detail > 0`) já foram tratados no `pointerdown`, então são ignorados aqui (sem duplicar).
   */
  protected aoClicarUtilizar(indice: number, habilidade: FichaHabilidadeDto, evento: MouseEvent): void {
    if (evento.detail !== 0) {
      return;
    }
    this.utilizar(indice, habilidade);
  }

  /** Efetua o gasto (debita a Energia via `habilidadeUtilizada`) e acende o feedback. */
  private gastar(indice: number, custo: number): void {
    this.ultimoGastoMs = performance.now();
    this.habilidadeUtilizada.emit(custo);
    this.sinalizarGasto(indice, custo);
  }

  private pararHold(): void {
    if (this.holdIntervalo !== null) {
      clearInterval(this.holdIntervalo);
      this.holdIntervalo = null;
    }
    if (this.soltarNoDocumento !== null) {
      window.removeEventListener('pointerup', this.soltarNoDocumento);
      window.removeEventListener('pointercancel', this.soltarNoDocumento);
      this.soltarNoDocumento = null;
    }
  }

  /** Confirma o gasto de custo variável e fecha o mini-campo. */
  protected confirmarUtilizarVariavel(): void {
    const indice = this.indiceUtilizando();
    const valor = this.custoVariavel.value;
    this.habilidadeUtilizada.emit(valor);
    this.indiceUtilizando.set(null);
    if (indice !== null) {
      this.sinalizarGasto(indice, valor);
    }
  }

  /**
   * Acende o feedback visual de gasto no botão Utilizar (pulso + "−N E" flutuante) por ~1s.
   * O `habilidadeUtilizada` já debitou a Energia; isto é só o retorno na tela. Reinicia o timer a
   * cada gasto.
   */
  private sinalizarGasto(indice: number, valor: number): void {
    if (this.temporizadorGasto !== null) {
      clearTimeout(this.temporizadorGasto);
    }
    this.gastoRecente.set({ indice, valor });
    this.temporizadorGasto = setTimeout(() => {
      this.gastoRecente.set(null);
      this.temporizadorGasto = null;
    }, 1100);
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
   * Rótulo do chip da categoria — realça a **Habilidade Inicial** ("Arquétipo - Inicial", a que vem
   * de graça do arquétipo/subclasse) e nomeia a origem quando a habilidade veio de **outra**
   * classe/arquétipo ("Classe - Especialista"); da própria, só a categoria ("Classe").
   */
  protected rotuloChip(habilidade: FichaHabilidadeDto): string {
    const base = ROTULOS_HABILIDADE_CATEGORIA[habilidade.categoria];
    if (habilidade.origem === undefined) {
      return base;
    }
    if (this.ehInicial(habilidade)) {
      return `${base} - Inicial`;
    }
    if (habilidade.categoria === HabilidadeCategoriaEnum.CLASSE && this.ehDeOutraOrigem(habilidade)) {
      return `${base} - ${rotuloClasse(habilidade.origem as ClasseEnum)}`;
    }
    if (habilidade.categoria === HabilidadeCategoriaEnum.ARQUETIPO && this.ehDeOutraOrigem(habilidade)) {
      return `${base} - ${rotuloArquetipo(habilidade.origem as ArquetipoEnum)}`;
    }
    return base;
  }

  /**
   * `true` quando uma habilidade de Classe/Arquétipo veio de **outra** classe/arquétipo que não
   * o da própria ficha (ex.: "Classe - Especialista" numa ficha de Combatente) — usado tanto no
   * sufixo do chip quanto no resumo por categoria (`contagemPorCategoria`). A Habilidade Inicial
   * nunca conta como "de outra origem" mesmo quando `origem` não bate com a classe/arquétipo
   * atual (ex.: depois de trocar de arquétipo) — o chip já trata isso como caso à parte.
   */
  private ehDeOutraOrigem(habilidade: FichaHabilidadeDto): boolean {
    if (habilidade.origem === undefined || this.ehInicial(habilidade)) {
      return false;
    }
    if (habilidade.categoria === HabilidadeCategoriaEnum.CLASSE) {
      return habilidade.origem !== classeBaseDeHabilidades(this.classe());
    }
    if (habilidade.categoria === HabilidadeCategoriaEnum.ARQUETIPO) {
      return habilidade.origem !== this.arquetipo();
    }
    return false;
  }

  /** `true` se a habilidade é a Inicial do arquétipo/subclasse (`shared/regras`) — ganha realce. */
  protected ehInicial(habilidade: FichaHabilidadeDto): boolean {
    return ehHabilidadeInicial(habilidade.origem, habilidade.nome);
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
