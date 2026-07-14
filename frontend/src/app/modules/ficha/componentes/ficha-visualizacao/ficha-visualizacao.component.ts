import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto, FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  MAESTRIA_PONTOS_MINIMO,
  calcularAtributosEfetivos,
  calcularDefesa,
  calcularEnergia,
  calcularVida,
  maestriaAtingivel,
  somarLesoesAtributo,
} from '@contratados-rpg/shared/regras/agente';

import { HoldRepeat } from '../../../../shared/hold-repeat/hold-repeat.directive';
import { EstadoSanidade, FichaSanidade } from '../ficha-sanidade/ficha-sanidade.component';
import { GRUPOS_CLASSE, arquetiposDaClasse, ehClasseBase } from '../../opcoes-ficha';
import { rotuloArquetipo, rotuloClasse } from '../../rotulos-ficha';
import {
  ChaveInfoExtra,
  InfoExtra,
  montarInformacoesExtras,
  normalizarEntrada,
  rotuloPatente,
} from '../../status-derivado';

/** Chave de cada atributo (as dez chaves de `FichaAtributosDto`). */
type ChaveAtributo = keyof FichaAtributosDto;

/** Abreviação + nome + chave de um atributo exibido (o box mostra abrev. em cima, valor, nome embaixo). */
interface CampoAtributo {
  readonly chave: ChaveAtributo;
  readonly abrev: string;
  readonly nome: string;
}

/** Bloco de atributos exibido (agrupamento de leitura do documento: Físicos / Mentais). */
interface GrupoAtributos {
  readonly rotulo: string;
  readonly campos: readonly CampoAtributo[];
}

/** Lembrete da fórmula da DT — exibido como chip informativo no card de Atributos (como no protótipo). */
const FORMULA_DT = 'DT = 10 + NÍVEL + ATR×2';

/** Texto no lugar de uma stat que a classe não possui (ex.: Civil sem defesa) — espelha `status-derivado`. */
const INDISPONIVEL = 'N/A';

/** Aba da ficha (m3-11) — o scaffold navegável. `Visão Geral`/`Combate` têm conteúdo; as demais, resumo. */
export type AbaFicha =
  | 'visao-geral'
  | 'combate'
  | 'inventario'
  | 'habilidades'
  | 'sanidade'
  | 'rolagens';

/** Descritor de uma aba na barra (id semântico p/ deep-link + rótulo legível). */
interface DescritorAba {
  readonly id: AbaFicha;
  readonly rotulo: string;
}

/** Todas as abas, na ordem de exibição da barra (`docs/design/examples/ficha-de-jogador.html`). */
export const ABAS_FICHA: readonly DescritorAba[] = [
  { id: 'visao-geral', rotulo: 'Visão Geral' },
  { id: 'combate', rotulo: 'Combate' },
  { id: 'inventario', rotulo: 'Inventário' },
  { id: 'habilidades', rotulo: 'Habilidades' },
  { id: 'sanidade', rotulo: 'Sanidade & Lesões' },
  { id: 'rolagens', rotulo: 'Rolagens' },
];

/** `true` quando a string é uma aba conhecida — valida o `?aba=` da URL (deep-link). */
export function ehAbaFicha(valor: string | null | undefined): valor is AbaFicha {
  return ABAS_FICHA.some((aba) => aba.id === valor);
}

/**
 * Linha do painel Combate: um derivado defensivo/ofensivo. Quando `info` está presente a linha é
 * **editável** (reusa a máquina de `Informações Extras` — m3-10); `null` = read-only (Esquiva/Bloqueio,
 * que não têm edição no próprio lugar hoje).
 */
interface LinhaCombate {
  readonly rotulo: string;
  readonly display: string;
  readonly info: InfoExtra | null;
}

/** Campo de vitalidade atual (recebe passos − / + e digitação). */
export type CampoVitalidadeAtual = 'vidaAtual' | 'energiaAtual';

/** Campo de vitalidade editável na leitura — atual **e** máxima (a máxima é stored/editável, m3-10). */
export type CampoVitalidade = CampoVitalidadeAtual | 'vidaMaxima' | 'energiaMaxima';

/** Ajuste rápido de Vida/Energia emitido pela leitura — já com o novo valor clampado a [0, máximo]. */
export interface AjusteVitalidade {
  readonly campo: CampoVitalidade;
  readonly valor: number;
}

/** Edição de um derivado (Informações Extras) — override persistido em `derivados[chave]` (m3-10). */
export interface AjusteDerivado {
  readonly chave: ChaveInfoExtra;
  readonly valor: number | string;
}

/** Edição em grupo dos atributos + Maestria (m3-10) — a página persiste `atributos` e `maestria`. */
export interface AjusteAtributos {
  readonly atributos: FichaAtributosDto;
  readonly maestria: keyof FichaAtributosDto | null;
}

/** Campo escalar do documento editável na identidade (Nível dispara o delta de progressão na página). */
export type CampoDadosEscalar = 'nivel' | 'prestigio';

/** Edição de um campo escalar do documento (Nível/Prestígio) — a página persiste. */
export interface AjusteCampoDados {
  readonly campo: CampoDadosEscalar;
  readonly valor: number;
}

/** Edição de Classe/Arquétipo — a página persiste (arquétipo já coerente com a classe). */
export interface AjusteClasse {
  readonly classe: ClasseEnum;
  readonly arquetipo: ArquetipoEnum | null;
}

/**
 * A **ficha** de jogador (m3-07/m3-10) — alvo de fidelidade `docs/design/examples/ficha-de-jogador.html`.
 * Edição no próprio lugar para dono/mestre (`ajustavel`), read-only para quem só tem acesso concedido.
 *
 * **Navegação por abas** (m3-11): **Visão Geral** (identidade + Vida/Energia + Atributos + Informações
 * Extras editáveis), **Combate** (derivados de combate reorganizados), **Sanidade** (marcas do estado,
 * read-only) e os placeholders **Inventário/Habilidades/Rolagens** com resumo até os editores chegarem
 * (m3-12…m3-15). A aba ativa é `?aba=` na URL (deep-link/refresh).
 *
 * **Nenhuma regra de jogo vive aqui**: toda stat derivada (Vida/Energia máximas, Defesa, Deslocamento,
 * Dano, Percepção, Inventário, Patente…) vem de `shared/regras` (fonte única — SYSTEM.SPEC §6.6,
 * proibições #26/#27). Estilos só com os tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-ficha-visualizacao',
  imports: [HoldRepeat, FichaSanidade],
  templateUrl: './ficha-visualizacao.component.html',
  styleUrl: './ficha-visualizacao.component.scss',
})
export class FichaVisualizacao {
  /** Identificador da ficha (compõe a classificação `FICHA-JGD-NNNN`). */
  readonly fichaId = input.required<number>();
  /** Nome/codinome do agente (exibido no card de identidade). */
  readonly nome = input.required<string>();
  /** Documento de jogo da ficha a exibir. */
  readonly dados = input.required<FichaJogadorDadosDto>();

  /**
   * Habilita os passos − / + de Vida e Energia direto na leitura — ajuste rápido do estado em jogo,
   * sem entrar em edição. A página só liga para dono/mestre; o backend revalida o `alterarFicha`.
   */
  readonly ajustavel = input(false);

  /** Novo valor de Vida/Energia atual após um passo − / + ou digitação (já clampado). A página persiste. */
  readonly ajusteVitalidade = output<AjusteVitalidade>();

  /** Novo valor de um derivado editado (Informações Extras) — a página persiste em `derivados`. */
  readonly ajusteDerivado = output<AjusteDerivado>();

  /** Atributos + Maestria editados em grupo — a página persiste. */
  readonly ajusteAtributos = output<AjusteAtributos>();

  /** Novo Codinome (relacional — fora do `dados`) — a página persiste `ficha.nome`. */
  readonly ajusteNome = output<string>();

  /** Novo Nível/Prestígio — a página persiste (Nível também aplica o delta de progressão às máximas). */
  readonly ajusteCampoDados = output<AjusteCampoDados>();

  /** Nova Classe/Arquétipo — a página persiste. */
  readonly ajusteClasse = output<AjusteClasse>();

  /** Listas de Sanidade (sequelas/traumas/lesões) editadas — a página persiste em `estado` (m3-12). */
  readonly ajusteSanidade = output<EstadoSanidade>();

  /**
   * Aba inicialmente ativa — semeia a barra a partir do `?aba=` da URL (deep-link/refresh, m3-11). A
   * página valida o parâmetro (`ehAbaFicha`) e o repassa; alterá-lo re-deriva a aba ativa.
   */
  readonly abaInicial = input<AbaFicha>('visao-geral');

  /** Barra de abas (m3-11), na ordem de exibição. */
  protected readonly abas = ABAS_FICHA;

  /**
   * Aba ativa. `linkedSignal` re-deriva do `abaInicial` (navegação por URL) mas permanece gravável —
   * um clique numa aba a sobrescreve localmente sem esperar a volta pela rota.
   */
  protected readonly abaAtiva = linkedSignal<AbaFicha>(() => this.abaInicial());

  /** Emite a aba escolhida — a página reflete no `?aba=` da URL (deep-link/refresh). */
  readonly abaMudou = output<AbaFicha>();

  /** Campo de vitalidade em digitação direta (clicou no valor), ou `null` fora de edição. */
  protected readonly editandoVitalidade = signal<CampoVitalidade | null>(null);
  private readonly entradaVitalidade = viewChild<ElementRef<HTMLInputElement>>('entradaVitalidade');

  /** Derivado em digitação direta (clicou no valor da coluna), ou `null` fora de edição. */
  protected readonly editandoDerivado = signal<ChaveInfoExtra | null>(null);
  private readonly entradaDerivado = viewChild<ElementRef<HTMLInputElement>>('entradaDerivado');

  /** Edição em grupo dos atributos (um lápis abre todos ao mesmo tempo — m3-10). */
  protected readonly editandoAtributos = signal(false);
  /** Rascunho dos atributos durante a edição (aplicado só ao confirmar; liberdade total, sem clamp). */
  protected readonly rascunhoAtributos = signal<FichaAtributosDto | null>(null);
  /** Rascunho da Maestria durante a edição. */
  protected readonly rascunhoMaestria = signal<keyof FichaAtributosDto | null>(null);
  /** Pontos mínimos para marcar Maestria (`sistema-v4.1.0.md`). */
  protected readonly limiteMaestria = MAESTRIA_PONTOS_MINIMO;

  /** Campo de identidade em digitação (Codinome/Nível/Prestígio), ou `null` fora de edição. */
  protected readonly editandoIdentidade = signal<'nome' | CampoDadosEscalar | null>(null);
  private readonly entradaIdentidade = viewChild<ElementRef<HTMLInputElement>>('entradaIdentidade');

  /** Editor de Classe/Arquétipo aberto (mini-editor com dois `<select>`). */
  protected readonly editandoClasse = signal(false);
  protected readonly rascunhoClasse = signal<ClasseEnum>(ClasseEnum.COMBATENTE);
  protected readonly rascunhoArquetipo = signal<ArquetipoEnum | null>(null);
  protected readonly gruposClasse = GRUPOS_CLASSE;
  /** `true` quando a classe do rascunho tem arquétipo (mostra o segundo `<select>`). */
  protected readonly ehClasseBaseRascunho = computed(() => ehClasseBase(this.rascunhoClasse()));
  /** Arquétipos válidos para a classe do rascunho. */
  protected readonly arquetiposRascunho = computed(() => arquetiposDaClasse(this.rascunhoClasse()));

  protected readonly formulaDt = FORMULA_DT;

  constructor() {
    // Ao abrir a digitação direta (Vida/Energia ou um derivado), foca e seleciona para trocar já.
    effect(() => {
      if (this.editandoVitalidade() !== null) {
        const elemento = this.entradaVitalidade()?.nativeElement;
        elemento?.focus();
        elemento?.select();
      }
    });
    effect(() => {
      if (this.editandoDerivado() !== null) {
        const elemento = this.entradaDerivado()?.nativeElement;
        elemento?.focus();
        elemento?.select();
      }
    });
    effect(() => {
      if (this.editandoIdentidade() !== null) {
        const elemento = this.entradaIdentidade()?.nativeElement;
        elemento?.focus();
        elemento?.select();
      }
    });
  }

  protected readonly gruposAtributos: readonly GrupoAtributos[] = [
    {
      rotulo: 'Físicos',
      campos: [
        { chave: 'destreza', abrev: 'DES', nome: 'Destreza' },
        { chave: 'forca', abrev: 'FOR', nome: 'Força' },
        { chave: 'luta', abrev: 'LUT', nome: 'Luta' },
        { chave: 'pontaria', abrev: 'PON', nome: 'Pontaria' },
        { chave: 'vigor', abrev: 'VIG', nome: 'Vigor' },
      ],
    },
    {
      rotulo: 'Mentais',
      campos: [
        { chave: 'intelecto', abrev: 'INT', nome: 'Intelecto' },
        { chave: 'medicina', abrev: 'MED', nome: 'Medicina' },
        { chave: 'sentidos', abrev: 'SEN', nome: 'Sentidos' },
        { chave: 'social', abrev: 'SOC', nome: 'Social' },
        { chave: 'vontade', abrev: 'VON', nome: 'Vontade' },
      ],
    },
  ];

  /** Classificação institucional exibida no topo (`FICHA-JGD-NNNN`). */
  protected readonly classificacao = computed(
    () => `FICHA-JGD-${String(this.fichaId()).padStart(4, '0')}`,
  );

  /**
   * Entrada normalizada aos limites da classe para as fórmulas — só os cinco atributos que
   * `shared/regras/agente` consome. Garante que valores fora dos bounds nunca escapem ao cálculo
   * (mesma disciplina do formulário e da calculadora).
   */
  private readonly entrada = computed(() => {
    const dados = this.dados();
    return normalizarEntrada(dados.classe, dados.nivel, dados.atributos);
  });

  protected readonly ehCivil = computed(() => this.dados().classe === ClasseEnum.CIVIL);

  protected readonly classeTexto = computed(() => rotuloClasse(this.dados().classe));
  /** Rótulo do arquétipo, ou `null` quando a ficha não tem (Experimento/Civil) — o chip é omitido. */
  protected readonly arquetipoTexto = computed(() => {
    const arquetipo = this.dados().arquetipo;
    return arquetipo === null ? null : rotuloArquetipo(arquetipo);
  });
  /** Patente derivada do Prestígio (`shared/regras/patente`) — não é persistida. */
  protected readonly patenteTexto = computed(() => rotuloPatente(this.dados().prestigio));
  protected readonly rotuloNivel = computed(() => (this.ehCivil() ? 'Treinamentos' : 'Nível'));

  protected readonly atributos = computed(() => this.dados().atributos);
  protected readonly estado = computed(() => this.dados().estado);

  /**
   * Atributos **efetivos** = base − pontos de lesão (`shared/regras`, `sistema-v4.1.0.md` — "⬡ Lesões").
   * O valor **base** (`atributos()`) nunca é mutado; por isso a **Maestria** (ligada ao base) sobrevive à
   * lesão — um atributo 6 com Maestria que toma −1 mostra 5 mas mantém a estrela. A leitura usa o efetivo;
   * a edição (rascunho) e a Maestria seguem no base.
   */
  protected readonly atributosEfetivos = computed(() =>
    calcularAtributosEfetivos(this.atributos(), this.estado().lesoes),
  );

  /** Penalidade de lesão por atributo (0 quando não lesionado) — badge "−N" na leitura. */
  protected readonly penalidadesLesao = computed<Record<ChaveAtributo, number>>(() => {
    const lesoes = this.estado().lesoes;
    const mapa = {} as Record<ChaveAtributo, number>;
    (Object.keys(this.atributos()) as ChaveAtributo[]).forEach((chave) => {
      mapa[chave] = somarLesoesAtributo(lesoes, chave);
    });
    return mapa;
  });
  protected readonly anotacoes = computed(() => this.dados().anotacoes.trim());

  // m3-10: máxima é stored (snapshot na criação, editável); cai no derivado só em fichas antigas.
  protected readonly vidaMaxima = computed(
    () => this.dados().estado.vidaMaxima ?? calcularVida(this.entrada()),
  );
  protected readonly energiaMaxima = computed(
    () => this.dados().estado.energiaMaxima ?? calcularEnergia(this.entrada()),
  );

  /**
   * Progressão de **Vida** da classe/subclasse (tooltip do rótulo): base (nível 0) + ganho por nível,
   * derivados de `shared/regras` para o Vigor atual. Referência da regra — a máxima é editável e pode
   * divergir disso (m3-10).
   */
  protected readonly progressaoVida = computed(() => {
    const { classe, atributos } = this.dados();
    const base = calcularVida({ classe, nivel: 0, vigor: atributos.vigor });
    const porNivel = calcularVida({ classe, nivel: 1, vigor: atributos.vigor }) - base;
    return `${this.classeTexto()} · Vida: ${base} base, +${porNivel}/nível (Vigor ${atributos.vigor})`;
  });

  /** Progressão de **Energia** da classe/subclasse (tooltip do rótulo) — base + ganho por nível. */
  protected readonly progressaoEnergia = computed(() => {
    const { classe, atributos } = this.dados();
    const base = calcularEnergia({ classe, nivel: 0, destreza: atributos.destreza });
    const porNivel = calcularEnergia({ classe, nivel: 1, destreza: atributos.destreza }) - base;
    return `${this.classeTexto()} · Energia: ${base} base, +${porNivel}/nível (Destreza ${atributos.destreza})`;
  });

  /**
   * Aplica um passo (−1 / +1) à Vida ou Energia atual, clampando a [0, máximo], e emite o novo
   * valor para a página persistir. Não muta nada aqui — a leitura é read-only; a fonte da verdade
   * (e a validação do teto) fica no documento e no backend.
   */
  protected ajustar(campo: CampoVitalidadeAtual, delta: number): void {
    const atual = this.estado()[campo];
    // m3-10: a atual PODE exceder a máxima. Vida tem piso 0; Energia pode negativar (sem piso).
    const bruto = atual + delta;
    const valor = campo === 'vidaAtual' ? Math.max(0, bruto) : bruto;
    if (valor !== atual) {
      this.ajusteVitalidade.emit({ campo, valor });
    }
  }

  /** Valor exibido de cada campo de vitalidade (a máxima resolve stored ?? derivado). */
  private valorVitalidade(campo: CampoVitalidade): number {
    switch (campo) {
      case 'vidaAtual':
        return this.estado().vidaAtual;
      case 'energiaAtual':
        return this.estado().energiaAtual;
      case 'vidaMaxima':
        return this.vidaMaxima();
      case 'energiaMaxima':
        return this.energiaMaxima();
    }
  }

  /** Abre a digitação direta do valor de Vida/Energia (clique no número). */
  protected editarVitalidade(campo: CampoVitalidade): void {
    this.editandoVitalidade.set(campo);
  }

  /** Cancela a digitação sem alterar (Escape). */
  protected cancelarVitalidade(): void {
    this.editandoVitalidade.set(null);
  }

  /**
   * Confirma o valor digitado (Enter/blur): clampa a [0, máximo] e emite se mudou. O guard evita o
   * commit duplo do `blur` que segue o `Enter` (o campo já saiu de edição) e ignora texto inválido.
   */
  protected confirmarVitalidade(campo: CampoVitalidade, texto: string): void {
    if (this.editandoVitalidade() !== campo) {
      return;
    }
    this.editandoVitalidade.set(null);
    const bruto = Number.parseInt(texto, 10);
    if (Number.isNaN(bruto)) {
      return;
    }
    // m3-10: só a Energia atual pode negativar; Vida atual e as máximas têm piso 0. Sem teto.
    const valor = campo === 'energiaAtual' ? bruto : Math.max(0, bruto);
    if (valor !== this.valorVitalidade(campo)) {
      this.ajusteVitalidade.emit({ campo, valor });
    }
  }

  /** Percentual de preenchimento de uma barra (atual÷máximo), limitado a 0–100. */
  protected percentual(atual: number, maximo: number): number {
    if (maximo <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (atual / maximo) * 100));
  }

  /** Status derivado (mesma seleção da edição — `status-derivado`); stored vence o calculado. */
  // Fonte única das linhas editáveis; as abas Visão Geral/Combate/Inventário consomem recortes daqui.
  protected readonly informacoesExtras = computed(() =>
    montarInformacoesExtras(this.entrada(), this.dados().derivados),
  );

  /**
   * Derivados **realocados** para abas temáticas (a pedido do autor) — saem de "Informações Extras":
   * `inventarioMaximo` vai para a aba Inventário e `habilidadesPorTurno` para a aba Combate.
   */
  private readonly CHAVES_REALOCADAS: ReadonlySet<ChaveInfoExtra> = new Set([
    'inventarioMaximo',
    'habilidadesPorTurno',
  ]);

  /** Linhas exibidas em "Informações Extras" (Visão Geral) — sem os derivados realocados às abas. */
  protected readonly informacoesGerais = computed(() =>
    this.informacoesExtras().filter((info) => !this.CHAVES_REALOCADAS.has(info.chave)),
  );

  /** Linha editável do Inventário máximo (exibida na aba Inventário junto do total atual de itens). */
  protected readonly inventarioMaximoLinha = computed<InfoExtra>(
    () => this.informacoesExtras().find((info) => info.chave === 'inventarioMaximo')!,
  );

  /** Abre a digitação direta de um derivado (clique no valor). */
  protected editarDerivado(chave: ChaveInfoExtra): void {
    this.editandoDerivado.set(chave);
  }

  /** Cancela a digitação de um derivado (Escape) sem alterar. */
  protected cancelarDerivado(): void {
    this.editandoDerivado.set(null);
  }

  /**
   * Confirma o derivado digitado (Enter/blur): emite o override para a página persistir. Número é
   * parseado (inválido → ignora); texto (dano) é aparado. O guard evita o commit duplo do blur após
   * o Enter. Sem trava de faixa (liberdade total — m3-10).
   */
  protected confirmarDerivado(info: InfoExtra, texto: string): void {
    if (this.editandoDerivado() !== info.chave) {
      return;
    }
    this.editandoDerivado.set(null);
    if (info.tipo === 'numero') {
      const bruto = Number.parseInt(texto, 10);
      if (!Number.isNaN(bruto) && bruto !== info.bruto) {
        this.ajusteDerivado.emit({ chave: info.chave, valor: bruto });
      }
      return;
    }
    const aparado = texto.trim();
    if (aparado && aparado !== info.bruto) {
      this.ajusteDerivado.emit({ chave: info.chave, valor: aparado });
    }
  }

  /** Maestria persistida (leitura) — o atributo que a carrega, ou `null`. */
  protected readonly maestriaAtual = computed(() => this.dados().maestria);

  /** Abre a digitação de um campo de identidade (Codinome/Nível/Prestígio). */
  protected editarIdentidade(campo: 'nome' | CampoDadosEscalar): void {
    this.editandoIdentidade.set(campo);
  }

  /** Cancela a digitação de identidade (Escape). */
  protected cancelarIdentidade(): void {
    this.editandoIdentidade.set(null);
  }

  /**
   * Confirma o campo de identidade digitado. Codinome (relacional) sai por `ajusteNome`; Nível/
   * Prestígio (documento) por `ajusteCampoDados`. Sem trava de faixa (liberdade total — m3-10); o
   * guard evita o commit duplo do blur após o Enter.
   */
  protected confirmarIdentidade(campo: 'nome' | CampoDadosEscalar, texto: string): void {
    if (this.editandoIdentidade() !== campo) {
      return;
    }
    this.editandoIdentidade.set(null);
    if (campo === 'nome') {
      const aparado = texto.trim();
      if (aparado && aparado !== this.nome()) {
        this.ajusteNome.emit(aparado);
      }
      return;
    }
    const bruto = Number.parseInt(texto, 10);
    if (!Number.isNaN(bruto) && bruto !== this.dados()[campo]) {
      this.ajusteCampoDados.emit({ campo, valor: bruto });
    }
  }

  /** Abre o mini-editor de Classe/Arquétipo (semeia o rascunho com o documento). */
  protected editarClasse(): void {
    this.rascunhoClasse.set(this.dados().classe);
    this.rascunhoArquetipo.set(this.dados().arquetipo);
    this.editandoClasse.set(true);
  }

  /** Cancela a edição de Classe/Arquétipo. */
  protected cancelarClasse(): void {
    this.editandoClasse.set(false);
  }

  /** Troca a classe do rascunho; limpa o arquétipo se ele não valer para a nova classe. */
  protected mudarClasseRascunho(evento: Event): void {
    const classe = (evento.target as HTMLSelectElement).value as ClasseEnum;
    this.rascunhoClasse.set(classe);
    if (!arquetiposDaClasse(classe).some((opcao) => opcao.valor === this.rascunhoArquetipo())) {
      this.rascunhoArquetipo.set(null);
    }
  }

  /** Troca o arquétipo do rascunho (`''` = nenhum). */
  protected mudarArquetipoRascunho(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.rascunhoArquetipo.set(valor === '' ? null : (valor as ArquetipoEnum));
  }

  /** Confirma Classe/Arquétipo — arquétipo só quando a classe é base. */
  protected confirmarClasse(): void {
    this.editandoClasse.set(false);
    const arquetipo = this.ehClasseBaseRascunho() ? this.rascunhoArquetipo() : null;
    this.ajusteClasse.emit({ classe: this.rascunhoClasse(), arquetipo });
  }

  /** Abre a edição em grupo dos atributos (um lápis → todas as caixinhas). */
  protected editarAtributos(): void {
    this.rascunhoAtributos.set({ ...this.atributos() });
    this.rascunhoMaestria.set(this.dados().maestria);
    this.editandoAtributos.set(true);
  }

  /** Cancela a edição dos atributos, descartando o rascunho. */
  protected cancelarAtributos(): void {
    this.editandoAtributos.set(false);
    this.rascunhoAtributos.set(null);
  }

  /** Passo − / + num atributo do rascunho (sem clamp — liberdade total, m3-10). */
  protected ajustarAtributoRascunho(chave: ChaveAtributo, delta: number): void {
    const atual = this.rascunhoAtributos();
    if (!atual) {
      return;
    }
    const valor = atual[chave] + delta;
    this.rascunhoAtributos.set({ ...atual, [chave]: valor });
    // Se o atributo com Maestria cair abaixo do mínimo, a Maestria deixa de valer.
    if (this.rascunhoMaestria() === chave && !maestriaAtingivel(valor)) {
      this.rascunhoMaestria.set(null);
    }
  }

  /** `true` se o atributo do rascunho pode receber Maestria (6+). */
  protected maestriaHabilitada(chave: ChaveAtributo): boolean {
    const atual = this.rascunhoAtributos();
    return atual ? maestriaAtingivel(atual[chave]) : false;
  }

  /** Marca/desmarca a Maestria num atributo (única na ficha; só com 6+). */
  protected alternarMaestria(chave: ChaveAtributo): void {
    if (!this.maestriaHabilitada(chave)) {
      return;
    }
    this.rascunhoMaestria.set(this.rascunhoMaestria() === chave ? null : chave);
  }

  /** Confirma a edição em grupo: emite atributos + Maestria para a página persistir. */
  protected confirmarAtributos(): void {
    const atributos = this.rascunhoAtributos();
    if (!atributos) {
      return;
    }
    this.editandoAtributos.set(false);
    this.rascunhoAtributos.set(null);
    this.ajusteAtributos.emit({ atributos, maestria: this.rascunhoMaestria() });
  }

  /**
   * Total de marcas de Sanidade (sequelas + traumas + lesões) — alimenta o contador da aba. As listas
   * moram no `estado` e são editadas pelo `FichaSanidade` embutido na aba Sanidade (m3-12).
   */
  protected readonly totalMarcas = computed(() => {
    const estado = this.estado();
    return estado.sequelas.length + estado.traumas.length + estado.lesoes.length;
  });

  /** Seleciona uma aba (clique/teclado) e notifica a página para atualizar o `?aba=` da URL. */
  protected selecionarAba(aba: AbaFicha): void {
    this.abaAtiva.set(aba);
    this.abaMudou.emit(aba);
  }

  /**
   * Navegação por teclado na barra de abas (WAI-ARIA `tablist`): ←/→ movem entre abas com wrap,
   * Home/End vão à primeira/última. Ativa a aba focada (padrão "seleção segue foco").
   */
  protected navegarAbas(evento: KeyboardEvent, indice: number): void {
    const total = this.abas.length;
    let destino = indice;
    switch (evento.key) {
      case 'ArrowRight':
        destino = (indice + 1) % total;
        break;
      case 'ArrowLeft':
        destino = (indice - 1 + total) % total;
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = total - 1;
        break;
      default:
        return;
    }
    evento.preventDefault();
    this.selecionarAba(this.abas[destino].id);
    this.focarAba(destino);
  }

  private readonly botoesAba = viewChild<ElementRef<HTMLElement>>('barraAbas');

  /** Move o foco para o botão da aba de índice `destino` (acompanha a navegação por setas). */
  private focarAba(destino: number): void {
    const botoes = this.botoesAba()?.nativeElement.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
    botoes?.[destino]?.focus();
  }

  /**
   * Linhas do painel **Combate** (m3-11) — organiza, não recalcula: Defesa/Deslocamento/Proficiência/
   * Dano C.a.C./Furtivo reusam as linhas **editáveis** de `Informações Extras` (m3-10, mesma persistência);
   * Esquiva/Bloqueio são read-only (sem edição no próprio lugar hoje), resolvendo stored (`derivados`)
   * antes do calculado (`shared/regras`).
   */
  protected readonly combateLinhas = computed<readonly LinhaCombate[]>(() => {
    const mapa = new Map(this.informacoesExtras().map((info) => [info.chave, info] as const));
    const defesaCalc = calcularDefesa(this.entrada());
    const derivados = this.dados().derivados;
    const editavel = (chave: ChaveInfoExtra): LinhaCombate => {
      const info = mapa.get(chave)!;
      return { rotulo: info.rotulo, display: info.display, info };
    };
    const somenteLeitura = (
      rotulo: string,
      stored: number | undefined,
      calculado: number | undefined,
    ): LinhaCombate => {
      const valor = typeof stored === 'number' ? stored : (calculado ?? null);
      return { rotulo, display: valor === null ? INDISPONIVEL : String(valor), info: null };
    };
    return [
      editavel('defesa'),
      somenteLeitura('Esquiva', derivados?.esquiva, defesaCalc?.esquiva),
      somenteLeitura('Bloqueio', derivados?.bloqueio, defesaCalc?.bloqueio),
      editavel('deslocamento'),
      editavel('proficiencia'),
      editavel('danoCorpoACorpo'),
      editavel('danoFurtivo'),
      editavel('habilidadesPorTurno'),
    ];
  });

  /** Resumo read-only das sub-coleções (contagem exibida nas abas ainda sem editor — m3-12…m3-15). */
  protected readonly totalHabilidades = computed(() => this.dados().habilidades.length);
  protected readonly totalItens = computed(() => this.dados().inventario.itens.length);
  protected readonly totalAmplificadores = computed(
    () => this.dados().inventario.amplificadores.length,
  );
  protected readonly totalRolagens = computed(() => this.dados().rolagens?.length ?? 0);
}
