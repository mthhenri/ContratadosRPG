import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';

import {
  ArquetipoEnum,
  ClasseEnum,
  EspecialidadeEfeitoEnum,
  FormacaoBonusEnum,
  FormacaoParametroEnum,
  TipoDanoEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaComboDto,
  FichaHabilidadeDto,
  FichaIdentidadeDto,
  FichaInventarioDto,
  FichaJogadorDadosDto,
  FichaOrigemDto,
  FichaRolagemDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  MAESTRIA_PONTOS_MINIMO,
  calcularAtributosEfetivos,
  calcularEnergia,
  calcularInventario,
  calcularProficiencia,
  montarResistencias,
  calcularVida,
  maestriaAtingivel,
  obterLimitesClasse,
  somarLesoesAtributo,
} from '@contratados-rpg/shared/regras/agente';
import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';
import {
  FORMACOES,
  listarEfeitosPendentes,
  type FormacaoDefinicaoDto,
} from '@contratados-rpg/shared/regras/identidade';

import { Dialog } from 'primeng/dialog';

import { HoldRepeat } from '../../../../shared/hold-repeat/hold-repeat.directive';
import { Icone, IconeNome } from '../../../../shared/icone/icone.component';
import { BandejaDados } from '../../../../shared/bandeja-dados/bandeja-dados.component';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import type { CustoEnergiaFragmento } from '../ficha-inventario/ficha-inventario.component';
import type { EstadoSanidade } from '../ficha-sanidade/ficha-sanidade.component';
import { GRUPOS_CLASSE, arquetiposDaClasse, ehClasseBase } from '../../opcoes-ficha';
import { GRUPOS_FORMACAO, rotuloParametroFormacao } from '../../opcoes-formacao';
import { CONDICOES_FICHA, type CondicoesFicha } from '../../condicoes-ficha';
import { clamparVitalidade, type CampoVitalidadeAtual } from '../../ajuste-vitalidade';
import { rotuloArquetipo, rotuloClasse, rotuloEfeitoEspecialidade } from '../../rotulos-ficha';
import {
  ChaveInfoExtra,
  InfoExtra,
  montarInformacoesExtras,
  normalizarEntrada,
  rotuloPatente,
  salarioPatente,
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

/**
 * Aba da ficha (m3-11). **Combate** (m3-37) absorveu **Rolagens** — hoje hospeda os stats de
 * combate, Resistências (m3-36), o editor de Rolagens e os Combos, todos na mesma aba; o `id`
 * continua `'combate'` (não `'rolagens'`) de propósito, pra um futuro `historico` (`m3-27`,
 * backlog) poder entrar sem colidir com este merge.
 */
export type AbaFicha = 'visao-geral' | 'combate' | 'inventario' | 'habilidades' | 'sanidade' | 'anotacoes';

/** Descritor de uma aba na barra (id semântico p/ deep-link + rótulo legível + ícone de linha). */
interface DescritorAba {
  readonly id: AbaFicha;
  readonly rotulo: string;
  readonly icone: IconeNome;
}

/** Todas as abas, na ordem de exibição da barra (`docs/design/examples/ficha-de-jogador.html`). */
export const ABAS_FICHA: readonly DescritorAba[] = [
  { id: 'visao-geral', rotulo: 'Visão Geral', icone: 'visao-geral' },
  { id: 'combate', rotulo: 'Combate', icone: 'combate' },
  { id: 'inventario', rotulo: 'Inventário', icone: 'inventario' },
  { id: 'habilidades', rotulo: 'Habilidades', icone: 'habilidades' },
  { id: 'sanidade', rotulo: 'Sanidade & Lesões', icone: 'sanidade' },
  { id: 'anotacoes', rotulo: 'Anotações', icone: 'anotacoes' },
];

/** `true` quando a string é uma aba conhecida — valida o `?aba=` da URL (deep-link). */
export function ehAbaFicha(valor: string | null | undefined): valor is AbaFicha {
  return ABAS_FICHA.some((aba) => aba.id === valor);
}

/** Derivados do painel **Combate**, na ordem de exibição — todos editáveis no próprio lugar (m3-10). */
const CHAVES_COMBATE: readonly ChaveInfoExtra[] = [
  'defesa',
  'esquiva',
  'bloqueio',
  'deslocamento',
  'proficiencia',
  'danoCorpoACorpo',
  'danoFurtivo',
  'habilidadesPorTurno',
];

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

/** Edição da base manual de uma resistência (ajuste pós-m3-36) — a página persiste em `derivados.resistencias`. */
export interface AjusteResistencia {
  readonly tipo: TipoDanoEnum;
  readonly valor: number;
}

/**
 * Edição em grupo dos atributos + Maestria + modificadores de teste — a página persiste os três em
 * `atributos`, `maestria` e `modificadoresTeste` (redesenho de comparação visual: o modificador de
 * teste só é editável junto com o resto, na mesma tela de edição — não há um canal separado).
 */
export interface AjusteAtributos {
  readonly atributos: FichaAtributosDto;
  readonly maestria: keyof FichaAtributosDto | null;
  readonly modificadoresTeste: Record<keyof FichaAtributosDto, number>;
}

/**
 * Campo escalar do documento editável na identidade (Nível dispara o delta de progressão na
 * página) — **`dinheiro`** (m3-34) reusa o mesmo canal de persistência (`ajusteCampoDados`), mas
 * é editado no seu próprio lugar (Informações Extras), não na identidade.
 */
export type CampoDadosEscalar = 'nivel' | 'prestigio' | 'dinheiro';

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
 * **Redesenho de comparação visual** (branch `claude/redesign-ficha-screen-*`): a tela foi reduzida a
 * dois cards lado a lado — identidade (+ vitalidade + condições + glance de Defesa/Resistências) e uma
 * versão compacta de Atributos (Proficiência + resumo de Maestria + os 10 atributos em no máximo 2
 * colunas, cada um com um stepper de modificador de teste **não persistido**, ex.: Amplificadores) —
 * pra comparar com a versão em produção (master). A navegação por abas (m3-11) e as seções de
 * Informações Extras, Identidade detalhada, Inventário, Habilidades, Sanidade e Anotações saíram do
 * template nesta rodada; os `@Output`/computeds que as alimentavam continuam intactos.
 *
 * **Nenhuma regra de jogo vive aqui**: toda stat derivada (Vida/Energia máximas, Defesa, Deslocamento,
 * Dano, Percepção, Inventário, Patente…) vem de `shared/regras` (fonte única — SYSTEM.SPEC §6.6,
 * proibições #26/#27). Estilos só com os tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-ficha-visualizacao',
  imports: [HoldRepeat, Icone, BandejaDados, Dialog],
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

  /**
   * `true` quando o autor é o **mestre** da campanha (distinto de `ajustavel`, que também vale pro
   * dono) — só a Identidade (Personalidade/Origem) precisa distinguir os dois papéis: a trava de
   * imutabilidade (m3-24) libera o mestre e prende o dono depois da primeira definição.
   */
  readonly ehMestre = input(false);

  /** Novo valor de Vida/Energia atual após um passo − / + ou digitação (já clampado). A página persiste. */
  readonly ajusteVitalidade = output<AjusteVitalidade>();

  /** Novo valor de um derivado editado (Informações Extras) — a página persiste em `derivados`. */
  readonly ajusteDerivado = output<AjusteDerivado>();

  /** Base manual de uma resistência editada (ajuste pós-m3-36) — a página persiste em `derivados.resistencias`. */
  readonly ajusteResistencia = output<AjusteResistencia>();

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

  /** As três condições (Morrendo/Machucado/Inconsciente) alternadas — a página persiste em `estado`. */
  readonly ajusteCondicoes = output<CondicoesFicha>();

  /** Lista de habilidades editada — a página persiste em `dados.habilidades` (m3-13). */
  readonly ajusteHabilidades = output<readonly FichaHabilidadeDto[]>();

  /** Inventário (itens + amplificadores) editado — a página persiste em `dados.inventario` (m3-14). */
  readonly ajusteInventario = output<FichaInventarioDto>();

  /** Presets de rolagem editados — a página persiste em `dados.rolagens` (m3-15). */
  readonly ajusteRolagens = output<readonly FichaRolagemDto[]>();

  /** Combos editados (m3-37) — a página persiste em `dados.combos`. */
  readonly ajusteCombos = output<readonly FichaComboDto[]>();

  /** Anotações livres editadas (m3-32) — a página persiste em `dados.anotacoes`. */
  readonly ajusteAnotacoes = output<string>();

  /** Nova Personalidade (m3-25) — a página persiste em `dados.identidade.personalidade`. */
  readonly ajustePersonalidade = output<string>();

  /**
   * Nova Origem, definida ou trocada (m3-25) — a página persiste em `dados.identidade.origem` e
   * aplica o delta de Formação aos derivados (`aplicarFormacaoAosDerivados`/`removerFormacaoDosDerivados`,
   * m3-23), removendo o da Origem anterior antes de somar o da nova.
   */
  readonly ajusteOrigem = output<FichaOrigemDto>();

  /**
   * Utilizar uma habilidade gasta o custo da Energia atual (pode **negativar** — regra do documento).
   * Reusa o caminho de `ajusteVitalidade` (persistência de m3-10) em vez de um novo canal.
   */
  protected aoUtilizarHabilidade(custo: number): void {
    this.ajusteVitalidade.emit({
      campo: 'energiaAtual',
      valor: this.estado().energiaAtual - custo,
    });
  }

  /**
   * Custo de Energia de um Fragmento (m3-35 — adquirir/acoplar/remover): o `FichaInventario` já
   * calcula os novos valores absolutos; aqui só se reusa o mesmo canal `ajusteVitalidade` (m3-10)
   * pros dois campos, em vez de abrir uma persistência paralela.
   */
  protected aoAjustarEnergiaFragmento(custo: CustoEnergiaFragmento): void {
    this.ajusteVitalidade.emit({ campo: 'energiaAtual', valor: custo.energiaAtual });
    this.ajusteVitalidade.emit({ campo: 'energiaMaxima', valor: custo.energiaMaxima });
  }

  /** Alterna uma condição (Morrendo/Machucado/Inconsciente) e emite o conjunto atualizado. */
  protected alternarCondicao(chave: keyof CondicoesFicha): void {
    if (!this.ajustavel()) {
      return;
    }
    const condicoes = this.condicoes();
    this.ajusteCondicoes.emit({ ...condicoes, [chave]: !condicoes[chave] });
  }

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

  /** Campo de identidade em digitação (Codinome/Nível/Prestígio/Personalidade), ou `null` fora de edição. */
  protected readonly editandoIdentidade = signal<'nome' | 'personalidade' | CampoDadosEscalar | null>(null);
  private readonly entradaIdentidade = viewChild<ElementRef<HTMLInputElement>>('entradaIdentidade');
  private readonly entradaAnotacoes = viewChild<ElementRef<HTMLTextAreaElement>>('entradaAnotacoes');
  /** `true` enquanto o Dinheiro (m3-34, Informações Extras) está em edição. */
  protected readonly editandoDinheiro = signal(false);
  private readonly entradaDinheiro = viewChild<ElementRef<HTMLInputElement>>('entradaDinheiro');

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
    effect(() => {
      if (this.editandoAnotacoes()) {
        this.entradaAnotacoes()?.nativeElement.focus();
      }
    });
    effect(() => {
      if (this.editandoDinheiro()) {
        const elemento = this.entradaDinheiro()?.nativeElement;
        elemento?.focus();
        elemento?.select();
      }
    });
    effect(() => {
      if (this.editandoResistencia() !== null) {
        const elemento = this.entradaResistencia()?.nativeElement;
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
  /** Dinheiro atual (m3-34) — ausente em fichas anteriores cai em 0 (retrocompat). */
  protected readonly dinheiro = computed(() => this.dados().dinheiro ?? 0);
  /** Salário da patente atual (m3-34) — derivado do Prestígio, nunca persistido. */
  protected readonly salario = computed(() => salarioPatente(this.dados().prestigio));
  protected readonly rotuloNivel = computed(() => (this.ehCivil() ? 'Treinamentos' : 'Nível'));
  /** Bounds de Nível pra classe atual (0–20 Agente / 0–5 Civil) — hint nativo do input + clamp no confirmar. */
  protected readonly limitesNivel = computed(() => obterLimitesClasse({ classe: this.dados().classe }));

  protected readonly atributos = computed(() => this.dados().atributos);
  protected readonly estado = computed(() => this.dados().estado);

  /** Descritores das 3 condições, para o `@for` da barra de toggles. */
  protected readonly condicoesFicha = CONDICOES_FICHA;

  /** As três condições resolvidas (ausente no documento → `false`) — alimenta a barra de toggles. */
  protected readonly condicoes = computed<CondicoesFicha>(() => ({
    morrendo: this.estado().morrendo ?? false,
    machucado: this.estado().machucado ?? false,
    inconsciente: this.estado().inconsciente ?? false,
  }));

  /**
   * Atributos **efetivos** = base − pontos de lesão (`shared/regras`, `sistema-v4.1.0.md` — "⬡ Lesões").
   * O valor **base** (`atributos()`) nunca é mutado; por isso a **Maestria** (ligada ao base) sobrevive à
   * lesão — um atributo 6 com Maestria que toma −1 mostra 5 mas mantém a estrela. A leitura usa o efetivo;
   * a edição (rascunho) e a Maestria seguem no base.
   */
  protected readonly atributosEfetivos = computed(() =>
    calcularAtributosEfetivos(this.atributos(), this.estado().lesoes),
  );

  /** Proficiência derivada (nível; `null` para Civil) — somada no teste de atributo (m3-22). */
  protected readonly proficiencia = computed(() =>
    calcularProficiencia({ classe: this.dados().classe, nivel: this.dados().nivel }),
  );

  /** Linha de Proficiência já formatada ("+N" ou "—" pro Civil) — mesma fonte de `Informações Extras`. */
  protected readonly proficienciaLinha = computed<InfoExtra>(
    () => this.informacoesExtras().find((info) => info.chave === 'proficiencia')!,
  );

  /** Bandeja de dados global — onde o teste rolado aqui aparece. */
  private readonly bandeja = inject(BandejaDadosService);

  /**
   * Modificador temporário de teste por atributo (ex.: Amplificador aplicado) — persistido em
   * `dados.modificadoresTeste` (redesenho de comparação visual), mas só **editável** dentro da
   * mesma tela de edição dos atributos (`editandoAtributos()`); fora dela é só leitura.
   */
  protected readonly modificadoresTeste = computed(() => this.dados().modificadoresTeste ?? {});

  /** Modificador de teste de um atributo, já resolvido a 0 quando ausente do documento. */
  protected modificadorTeste(chave: ChaveAtributo): number {
    return this.modificadoresTeste()[chave] ?? 0;
  }

  /** Rascunho dos modificadores de teste durante a edição — completo (as 10 chaves, 0 onde ausente). */
  protected readonly rascunhoModificadoresTeste = signal<Record<ChaveAtributo, number> | null>(null);

  /** Record completo (as 10 chaves) dos modificadores persistidos, preenchendo 0 onde ausente. */
  private modificadoresTesteCompletos(): Record<ChaveAtributo, number> {
    const persistidos = this.modificadoresTeste();
    const completo = {} as Record<ChaveAtributo, number>;
    (Object.keys(this.atributos()) as ChaveAtributo[]).forEach((chave) => {
      completo[chave] = persistidos[chave] ?? 0;
    });
    return completo;
  }

  /** Passo −/+ no modificador de teste do rascunho (sem clamp — mesma liberdade dos demais steppers). */
  protected ajustarModificadorTesteRascunho(chave: ChaveAtributo, delta: number): void {
    const atual = this.rascunhoModificadoresTeste();
    if (!atual) {
      return;
    }
    this.rascunhoModificadoresTeste.set({ ...atual, [chave]: atual[chave] + delta });
  }

  /** Sufixo `" + N"`/`" − N"` do modificador de teste na fórmula — vazio quando zerado. */
  private sufixoModificador(modificador: number): string {
    if (modificador === 0) {
      return '';
    }
    return modificador > 0 ? ` + ${modificador}` : ` - ${Math.abs(modificador)}`;
  }

  /**
   * Rola o teste de um atributo direto da Visão Geral (m3-22; gramática v3 m3-29; margem de crítico
   * natural em m3-31): a fórmula explícita `(Atributo efetivo)d20kh1cm1 + PROF` — pool de D20, pega o
   * maior, **conta a margem de crítico natural** (`cm1` = crita no 20; regra 1216) e soma a Proficiência.
   * Usa os atributos **efetivos** (pós-lesão) — a lesão reduz quantos D20 entram no pool, e atributo
   * 0/negativo vira desvantagem intrínseca do motor (rola 2+|attr| dados e mantém o menor; regra 270).
   * O modificador de teste (coluna de Atributos) some no final, como uma constante da fórmula.
   */
  protected rolarTesteAtributo(campo: CampoAtributo): void {
    const atributo = this.atributosEfetivos()[campo.chave];
    const sufixo = this.sufixoModificador(this.modificadorTeste(campo.chave));
    // A fórmula que vai ao **motor** mantém `kh1` — é o gatilho da desvantagem intrínseca (atributo ≤ 0).
    const formula = `${campo.chave}d20kh1cm1 + PROF${sufixo}`;
    const resultado = rolarFormula({
      formula,
      atributos: this.atributosEfetivos(),
      proficiencia: this.proficiencia(),
      nivel: this.dados().nivel,
    });
    if (resultado) {
      // Legenda **honesta** (m3-31): em **desvantagem** (atributo ≤ 0) o motor rola `(2+|attr|)d20` e
      // mantém o **menor** — então a fórmula exibida troca `kh1`→`kl1` e mostra a contagem real, em vez de
      // exibir `kh1` (mantém o maior) numa rolagem que na verdade manteve o menor.
      const formulaExibida = atributo <= 0 ? `${2 - atributo}d20kl1cm1 + PROF${sufixo}` : formula;
      this.bandeja.mostrar({ rotulo: campo.nome, formula: formulaExibida, resultado });
    }
  }

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

  /** `true` enquanto a aba Anotações (m3-32) está em edição (textarea aberta). */
  protected readonly editandoAnotacoes = signal(false);

  /** Abre a edição das Anotações (aba própria — distinta do peek read-only da Visão Geral). */
  protected editarAnotacoes(): void {
    this.editandoAnotacoes.set(true);
  }

  /** Cancela a edição das Anotações sem alterar. */
  protected cancelarAnotacoes(): void {
    this.editandoAnotacoes.set(false);
  }

  /** Confirma o texto digitado (blur/Ctrl+Enter): emite se mudou. Sem trim — espaço é do usuário. */
  protected confirmarAnotacoes(texto: string): void {
    if (!this.editandoAnotacoes()) {
      return;
    }
    this.editandoAnotacoes.set(false);
    if (texto !== this.dados().anotacoes) {
      this.ajusteAnotacoes.emit(texto);
    }
  }

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
    const valor = clamparVitalidade(campo, atual, delta);
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
   * `inventarioMaximo` vai para a aba Inventário; `habilidadesPorTurno`, `esquiva` e `bloqueio` para a
   * aba Combate (Esquiva/Bloqueio nunca estiveram na Visão Geral — moram só no painel de Combate).
   */
  private readonly CHAVES_REALOCADAS: ReadonlySet<ChaveInfoExtra> = new Set([
    'inventarioMaximo',
    'habilidadesPorTurno',
    'esquiva',
    'bloqueio',
    'contraAtaque',
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

  /**
   * Nome por extenso do atributo com Maestria — alimenta o resumo "Maestria: Nome" da coluna de
   * Atributos (redundante com a estrela ★ no próprio box, mas pedido assim mesmo). `null` sem Maestria.
   */
  protected readonly maestriaNomeAtual = computed(() => {
    const chave = this.maestriaAtual();
    if (!chave) {
      return null;
    }
    for (const grupo of this.gruposAtributos) {
      const campo = grupo.campos.find((candidato) => candidato.chave === chave);
      if (campo) {
        return campo.nome;
      }
    }
    return null;
  });

  /** Identidade (m3-23) — ausente em fichas anteriores cai em "nada definido" (retrocompat). */
  protected readonly identidade = computed<FichaIdentidadeDto>(
    () => this.dados().identidade ?? { personalidade: null, origem: null },
  );
  protected readonly personalidadeDefinida = computed(() => this.identidade().personalidade !== null);
  protected readonly origemAtual = computed(() => this.identidade().origem);
  protected readonly origemDefinida = computed(() => this.origemAtual() !== null);

  /**
   * Trava de imutabilidade (m3-24, refletida — o backend é o árbitro): livre pro **mestre** sempre;
   * pro **dono**, só até a primeira definição. Campo a campo — Personalidade e Origem travam
   * independente uma da outra.
   */
  protected readonly personalidadeEditavel = computed(
    () => this.ajustavel() && (this.ehMestre() || !this.personalidadeDefinida()),
  );
  protected readonly origemEditavel = computed(
    () => this.ajustavel() && (this.ehMestre() || !this.origemDefinida()),
  );

  protected readonly gruposFormacao = GRUPOS_FORMACAO;
  protected readonly rotuloParametroFormacao = rotuloParametroFormacao;
  protected readonly rotuloEfeitoEspecialidade = rotuloEfeitoEspecialidade;
  protected readonly efeitosEspecialidade = Object.values(EspecialidadeEfeitoEnum);
  protected readonly parametroEsquivaOuBloqueio = FormacaoParametroEnum.ESQUIVA_OU_BLOQUEIO;
  /** As 16 linhas de Formação sem campo onde aterrissar ainda (m3-23) — "selo" de registro (m3-25). */
  protected readonly efeitosFormacaoPendentes = listarEfeitosPendentes(FORMACOES);

  /** Editor de Origem aberto (mini-editor: 3 textos + Especialidade + 2 linhas de Formação). */
  protected readonly editandoOrigem = signal(false);
  protected readonly rascunhoOrigem = signal<FichaOrigemDto | null>(null);

  /** Origem vazia — ponto de partida do rascunho quando ainda não há Origem definida. */
  private origemVazia(): FichaOrigemDto {
    return {
      nome: '',
      descricao: '',
      saberDeCampo: '',
      formacao: [
        { bonus: null, parametro: null, texto: '' },
        { bonus: null, parametro: null, texto: '' },
      ],
      especialidade: { gatilho: '', efeito: EspecialidadeEfeitoEnum.DADO_EXTRA },
    };
  }

  /** Abre o editor de Origem, semeando o rascunho com a Origem atual (cópia — Cancelar não muta nada) ou vazia. */
  protected editarOrigem(): void {
    const atual = this.origemAtual();
    this.rascunhoOrigem.set(
      atual
        ? { ...atual, formacao: atual.formacao.map((linha) => ({ ...linha })), especialidade: { ...atual.especialidade } }
        : this.origemVazia(),
    );
    this.editandoOrigem.set(true);
  }

  /** Cancela a edição de Origem, descartando o rascunho. */
  protected cancelarOrigem(): void {
    this.editandoOrigem.set(false);
    this.rascunhoOrigem.set(null);
  }

  /** Confirma a Origem — emite o rascunho inteiro para a página persistir e aplicar o delta de Formação. */
  protected confirmarOrigem(): void {
    const rascunho = this.rascunhoOrigem();
    if (!rascunho) {
      return;
    }
    this.editandoOrigem.set(false);
    this.rascunhoOrigem.set(null);
    this.ajusteOrigem.emit(rascunho);
  }

  /** Edita um dos três textos livres da Origem no rascunho (Nome/Descrição/Saber de Campo). */
  protected mudarTextoOrigemRascunho(campo: 'nome' | 'descricao' | 'saberDeCampo', valor: string): void {
    const atual = this.rascunhoOrigem();
    if (!atual) {
      return;
    }
    this.rascunhoOrigem.set({ ...atual, [campo]: valor });
  }

  /** Edita o gatilho (texto livre) da Especialidade no rascunho. */
  protected mudarGatilhoEspecialidadeRascunho(valor: string): void {
    const atual = this.rascunhoOrigem();
    if (!atual) {
      return;
    }
    this.rascunhoOrigem.set({ ...atual, especialidade: { ...atual.especialidade, gatilho: valor } });
  }

  /** Troca o efeito da Especialidade no rascunho. */
  protected mudarEfeitoEspecialidadeRascunho(valor: string): void {
    const atual = this.rascunhoOrigem();
    if (!atual) {
      return;
    }
    this.rascunhoOrigem.set({
      ...atual,
      especialidade: { ...atual.especialidade, efeito: valor as EspecialidadeEfeitoEnum },
    });
  }

  /**
   * Troca o bônus de uma das duas linhas de Formação do rascunho — `''` é "Outro (autorizado pelo
   * Mestre)" (`bonus: null`, escape do documento). Preenche `texto` com o rótulo do catálogo (o
   * usuário pode reescrever depois) e zera `parametro` — a linha nova pode não exigir o mesmo tipo.
   */
  protected mudarBonusFormacaoRascunho(indice: number, valorSelecionado: string): void {
    const atual = this.rascunhoOrigem();
    if (!atual) {
      return;
    }
    const bonus = valorSelecionado === '' ? null : (valorSelecionado as FormacaoBonusEnum);
    const formacao = atual.formacao.map((linha, i) =>
      i === indice ? { bonus, parametro: null, texto: bonus ? FORMACOES[bonus].rotulo : '' } : linha,
    );
    this.rascunhoOrigem.set({ ...atual, formacao });
  }

  /** Edita o parâmetro de uma linha de Formação do rascunho (`''` grava `null`). */
  protected mudarParametroFormacaoRascunho(indice: number, valor: string): void {
    const atual = this.rascunhoOrigem();
    if (!atual) {
      return;
    }
    const formacao = atual.formacao.map((linha, i) => (i === indice ? { ...linha, parametro: valor || null } : linha));
    this.rascunhoOrigem.set({ ...atual, formacao });
  }

  /** Edita o texto de exibição de uma linha de Formação do rascunho. */
  protected mudarTextoFormacaoRascunho(indice: number, valor: string): void {
    const atual = this.rascunhoOrigem();
    if (!atual) {
      return;
    }
    const formacao = atual.formacao.map((linha, i) => (i === indice ? { ...linha, texto: valor } : linha));
    this.rascunhoOrigem.set({ ...atual, formacao });
  }

  /** Definição de `FORMACOES` da linha `indice` do rascunho — `null` no bônus custom (`bonus: null`). */
  protected definicaoFormacaoRascunho(indice: number): FormacaoDefinicaoDto | null {
    const bonus = this.rascunhoOrigem()?.formacao[indice]?.bonus;
    return bonus ? FORMACOES[bonus] : null;
  }

  /** `true` quando o bônus de Formação escolhido é uma das 16 linhas ainda sem efeito automático (m3-23/m3-25). */
  protected efeitoAindaPendente(bonus: FormacaoBonusEnum | null): boolean {
    return bonus !== null && this.efeitosFormacaoPendentes.some((definicao) => definicao.codigo === bonus);
  }

  /** Abre a digitação de um campo de identidade (Codinome/Nível/Prestígio/Personalidade). */
  protected editarIdentidade(campo: 'nome' | 'personalidade' | CampoDadosEscalar): void {
    this.editandoIdentidade.set(campo);
  }

  /** Cancela a digitação de identidade (Escape). */
  protected cancelarIdentidade(): void {
    this.editandoIdentidade.set(null);
  }

  /**
   * Confirma o campo de identidade digitado. Codinome (relacional) sai por `ajusteNome`; Nível/
   * Prestígio (documento) por `ajusteCampoDados`; Personalidade (m3-25) por `ajustePersonalidade`.
   * Prestígio segue sem trava de faixa (liberdade total — m3-10; a Personalidade tem sua própria
   * trava de imutabilidade, arbitrada pelo backend — m3-24, o front só esconde o lápis). **Nível**
   * é clampado aos bounds da classe (0–20 Agente / 0–5 Civil, `shared/regras/agente/limites` —
   * mesma fonte que já normaliza os cálculos, "Progressão"/"Jogando como um Civil" no documento).
   * O guard evita o commit duplo do blur após o Enter.
   */
  protected confirmarIdentidade(campo: 'nome' | 'personalidade' | CampoDadosEscalar, texto: string): void {
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
    if (campo === 'personalidade') {
      const aparada = texto.trim();
      if (aparada && aparada !== (this.identidade().personalidade ?? '')) {
        this.ajustePersonalidade.emit(aparada);
      }
      return;
    }
    const bruto = Number.parseInt(texto, 10);
    if (Number.isNaN(bruto)) {
      return;
    }
    let valor = bruto;
    if (campo === 'nivel') {
      const limites = obterLimitesClasse({ classe: this.dados().classe });
      valor = Math.min(limites.nivelMaximo, Math.max(limites.nivelMinimo, bruto));
    }
    if (valor !== this.dados()[campo]) {
      this.ajusteCampoDados.emit({ campo, valor });
    }
  }

  /** Abre a digitação direta do Dinheiro (Informações Extras, m3-34). */
  protected editarDinheiro(): void {
    this.editandoDinheiro.set(true);
  }

  /** Cancela a digitação do Dinheiro (Escape) sem alterar. */
  protected cancelarDinheiro(): void {
    this.editandoDinheiro.set(false);
  }

  /**
   * Confirma o Dinheiro digitado (Enter/blur): emite pelo mesmo canal de `ajusteCampoDados` dos
   * campos escalares — a página persiste sem cascata (dinheiro não deriva nenhuma outra stat). Sem
   * trava de faixa (liberdade total — m3-10/m3-34); o guard evita o commit duplo do blur após Enter.
   */
  protected confirmarDinheiro(texto: string): void {
    if (!this.editandoDinheiro()) {
      return;
    }
    this.editandoDinheiro.set(false);
    const bruto = Number.parseInt(texto, 10);
    if (!Number.isNaN(bruto) && bruto !== this.dinheiro()) {
      this.ajusteCampoDados.emit({ campo: 'dinheiro', valor: bruto });
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
    this.rascunhoModificadoresTeste.set(this.modificadoresTesteCompletos());
    this.editandoAtributos.set(true);
  }

  /** Cancela a edição dos atributos, descartando o rascunho. */
  protected cancelarAtributos(): void {
    this.editandoAtributos.set(false);
    this.rascunhoAtributos.set(null);
    this.rascunhoModificadoresTeste.set(null);
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

  /** Confirma a edição em grupo: emite atributos + Maestria + modificadores de teste para a página persistir. */
  protected confirmarAtributos(): void {
    const atributos = this.rascunhoAtributos();
    const modificadoresTeste = this.rascunhoModificadoresTeste();
    if (!atributos || !modificadoresTeste) {
      return;
    }
    this.editandoAtributos.set(false);
    this.rascunhoAtributos.set(null);
    this.rascunhoModificadoresTeste.set(null);
    this.ajusteAtributos.emit({ atributos, maestria: this.rascunhoMaestria(), modificadoresTeste });
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
   * Linhas do painel **Combate** (m3-11) — organiza, não recalcula: todas reusam as linhas **editáveis**
   * de `Informações Extras` (m3-10, mesma persistência via `ajusteDerivado`), resolvendo o stored
   * (`derivados`) antes do calculado (`shared/regras`). **Esquiva/Bloqueio entraram na edição no próprio
   * lugar** (antes read-only) — já eram campos stored de `derivados` e já acompanhavam a progressão por
   * delta (Destreza → Esquiva, Vigor → Bloqueio); só faltava a UI.
   */
  protected readonly combateLinhas = computed<readonly InfoExtra[]>(() => {
    const mapa = new Map(this.informacoesExtras().map((info) => [info.chave, info] as const));
    return CHAVES_COMBATE.map((chave) => mapa.get(chave)!);
  });

  /**
   * Resistências a dano da aba Combate (m3-36; editável + amplificadores em ajuste posterior) —
   * **sempre as cinco linhas** de `TipoDanoEnum`. Cada uma soma uma base **manual editável**
   * (`derivados.resistencias`, stored/editável — mesmo modelo de m3-10) com o que vem do
   * **equipamento** (itens equipados + Fragmento aplicado + amplificadores `Resistente`/`Defesa`),
   * via `shared/regras/agente/montarResistencias` — zero motor duplicado aqui.
   */
  protected readonly resistencias = computed(() =>
    montarResistencias({
      itens: this.dados().inventario.itens,
      amplificadores: this.dados().inventario.amplificadores,
      manual: this.dados().derivados?.resistencias,
    }),
  );

  /**
   * Defesa/Esquiva/Bloqueio em miniatura no card de identidade (redesenho de comparação visual) —
   * só leitura (a edição continua na aba Combate); reaproveita `combateLinhas()`, que já traz esses
   * três primeiro, na ordem de `CHAVES_COMBATE` — nenhum cálculo novo.
   */
  protected readonly defesaRapida = computed<readonly InfoExtra[]>(() => this.combateLinhas().slice(0, 3));

  /**
   * `true` quando o jogador tem a habilidade "Contra-Ataque" no catálogo (Lutador/Vanguarda e
   * variantes — `shared/regras/agente/habilidades-catalogo`) — só então a caixa de Contra-ataque
   * na Reações vira editável; sem a habilidade, o motor não tem stat pra oferecer e ela segue o
   * placeholder tracejado.
   */
  protected readonly temHabilidadeContraAtaque = computed(() =>
    this.dados().habilidades.some((habilidade) => habilidade.nome === 'Contra-Ataque'),
  );

  /** Linha de Contra-ataque — puro override manual (`derivados.contraAtaque`); sem cálculo. */
  protected readonly contraAtaqueLinha = computed<InfoExtra>(
    () => this.informacoesExtras().find((info) => info.chave === 'contraAtaque')!,
  );

  /** Abreviação de exibição de cada `TipoDanoEnum` no grid compacto de Resistências (glance). */
  protected readonly abreviacaoResistencia: Record<TipoDanoEnum, string> = {
    [TipoDanoEnum.FISICO]: 'Físico',
    [TipoDanoEnum.BALISTICO]: 'Balíst.',
    [TipoDanoEnum.EXPLOSAO]: 'Explos.',
    [TipoDanoEnum.QUIMICO]: 'Químico',
    [TipoDanoEnum.GERAL]: 'Geral',
  };

  /** Tipo de dano em digitação direta na linha de Resistências, ou `null` fora de edição. */
  protected readonly editandoResistencia = signal<TipoDanoEnum | null>(null);
  private readonly entradaResistencia = viewChild<ElementRef<HTMLInputElement>>('entradaResistencia');

  /** Abre a digitação direta da base manual de uma Resistência (clique na linha). */
  protected editarResistencia(tipo: TipoDanoEnum): void {
    this.editandoResistencia.set(tipo);
  }

  /** Cancela a digitação da Resistência (Escape) sem alterar. */
  protected cancelarResistencia(): void {
    this.editandoResistencia.set(null);
  }

  /**
   * Confirma a base manual de Resistência digitada (Enter/blur): emite se mudou. Sem trava de
   * faixa (liberdade total — m3-10); o guard evita o commit duplo do blur após o Enter.
   */
  protected confirmarResistencia(tipo: TipoDanoEnum, texto: string): void {
    if (this.editandoResistencia() !== tipo) {
      return;
    }
    this.editandoResistencia.set(null);
    const bruto = Number.parseInt(texto, 10);
    const manualAtual = this.resistencias().find((linha) => linha.tipo === tipo)?.manual ?? 0;
    if (!Number.isNaN(bruto) && bruto !== manualAtual) {
      this.ajusteResistencia.emit({ tipo, valor: bruto });
    }
  }

  /** Resumo read-only das sub-coleções (contagem exibida nas abas ainda sem editor — m3-15). */
  protected readonly totalHabilidades = computed(() => this.dados().habilidades.length);
  protected readonly totalItens = computed(() => this.dados().inventario.itens.length);
  protected readonly totalRolagens = computed(() => this.dados().rolagens?.length ?? 0);

  /** Combos (m3-37) — ausente em fichas anteriores cai em lista vazia. */
  protected readonly combos = computed(() => this.dados().combos ?? []);

  /**
   * Inventário máximo resolvido (`Força × 5`) para o editor de Inventário (m3-14): o stored
   * (`derivados.inventarioMaximo`, editável em m3-10) vence; ausente cai no cálculo ao vivo
   * (`shared/regras` — fonte única). Referência do peso usado; exceder é aviso, não trava.
   */
  protected readonly inventarioMaximoValor = computed(
    () => this.dados().derivados?.inventarioMaximo ?? calcularInventario(this.entrada()),
  );
}
