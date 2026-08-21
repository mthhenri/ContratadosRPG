import { NgTemplateOutlet } from '@angular/common';
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
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  ArquetipoEnum,
  ClasseEnum,
  FormacaoBonusEnum,
  FormacaoParametroEnum,
  FragmentoModuloEnum,
  HabilidadeCategoriaEnum,
  TipoDanoEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaComboDto,
  FichaFragmentoConsumidoDto,
  FichaHabilidadeDto,
  FichaIdentidadeDto,
  FichaImagemFocoDto,
  FichaInventarioDto,
  FichaJogadorDadosDto,
  FichaOrigemDto,
  FichaRolagemDto,
  FichaSequelaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  MAESTRIA_PONTOS_MINIMO,
  ajusteEnergiaAmplificadores,
  ajusteVidaAmplificadores,
  aplicarBonusConsumoFragmento,
  calcularAjusteDadosEquipamento,
  calcularAtributosEfetivos,
  calcularAtributosParaDados,
  calcularEnergia,
  calcularInventario,
  calcularProficiencia,
  emAnomaliaBiologica,
  limiteMinimoEnergiaMaximaFragmentos,
  modificadoresTesteAmplificadores,
  montarResistencias,
  calcularVida,
  maestriaAtingivel,
  obterLimitesClasse,
  PENALIDADE_DEFESA_ANOMALIA_BIOLOGICA,
  PENALIDADE_TESTES_ANOMALIA_BIOLOGICA,
  reverterBonusConsumoFragmento,
  somarLesoesAtributo,
  tetoVidaAnomaliaBiologica,
  TRAUMA_LIMIAR_HUMANIDADE_DESCRICAO,
  TRAUMA_LIMIAR_HUMANIDADE_NOME,
  type EfeitoConsumoFragmentoDto,
} from '@contratados-rpg/shared/regras/agente';
import {
  calcularAfinidade,
  listarModulosFragmentosPortados,
  reducaoCustoPorAfinidade,
  valorAfinidadeFragmento,
  type OpcaoBonusConsumoFragmentoDto,
} from '@contratados-rpg/shared/regras/compras';
import { calcularDtAtributo } from '@contratados-rpg/shared/regras/dt';
import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';
import {
  experimentoComAnomalia,
  experimentoComPeculiaridade,
  FORMACOES,
  listarEfeitosPendentes,
  obterBonusRolagemAtributoFormacao,
  obterResistenciaFormacao,
  obterToleranciaSobrecargaFormacao,
  type FormacaoDefinicaoDto,
} from '@contratados-rpg/shared/regras/identidade';

import { Dialog } from 'primeng/dialog';

import { FocoImagem } from '../../../../shared/foco-imagem.directive';
import { HoldRepeat } from '../../../../shared/hold-repeat/hold-repeat.directive';
import { Icone, IconeNome } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { BandejaDados } from '../../../../shared/bandeja-dados/bandeja-dados.component';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaHabilidades } from '../ficha-habilidades/ficha-habilidades.component';
import {
  FichaInventario,
  type BonusConsumoFragmentoEscolhidoDto,
  type CustoEnergiaFragmento,
} from '../ficha-inventario/ficha-inventario.component';
import { FichaRolagensPainel } from '../ficha-rolagens-painel/ficha-rolagens-painel.component';
import { AjusteEnquadramentoImagem } from '../ajuste-enquadramento-imagem/ajuste-enquadramento-imagem.component';
import { FichaSanidade, type EstadoSanidade } from '../ficha-sanidade/ficha-sanidade.component';
import { GRUPOS_CLASSE, arquetiposDaClasse, ehClasseBase } from '../../opcoes-ficha';
import { GRUPOS_FORMACAO, rotuloParametroFormacao } from '../../opcoes-formacao';
import { CONDICOES_FICHA, type CondicoesFicha } from '../../condicoes-ficha';
import { clamparVitalidade, type CampoVitalidadeAtual } from '../../ajuste-vitalidade';
import { NOME_PRESET_INICIATIVA } from '../../executar-rolagem';
import { dadoExtraIniciativaDaFicha, rolarIniciativaDaFicha } from '../../rolar-iniciativa';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import type { RolagemRealizadaDto } from '../../rolagem-realizada';
import { perfilClasseRotulos } from '../../rotulos-ficha';
import {
  ChaveInfoExtra,
  faixaPrestigioPatente,
  InfoExtra,
  montarInformacoesExtras,
  normalizarEntrada,
  patenteDetalhada,
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

/**
 * Fragmentos portados de um mesmo módulo, agrupados (m3-66): antes cada unidade virava um chip
 * "Módulo X" repetido e idêntico, sem mostrar quantos fragmentos daquele módulo o agente carrega
 * nem quanto cada grupo contribui pra Afinidade total.
 */
interface GrupoFragmentoPortado {
  readonly modulo: FragmentoModuloEnum;
  readonly quantidade: number;
  readonly afinidade: number;
}

/** Lembrete da fórmula da DT — exibido como chip informativo no card de Atributos (como no protótipo). */
const FORMULA_DT = 'DT = 10 + NÍVEL + ATR×2';

/**
 * Valor exibido no `<input type="color">` do cabeçalho (m3-61) enquanto a ficha não tem `cor`
 * definida — o picker nativo não representa "sem cor". Mesmo hex do `--accent`/`--vida` de fábrica
 * (`_tokens.scss`) — só o ponto de partida do picker, não persiste sozinho (a ficha só ganha cor
 * quando o dono/mestre efetivamente escolhe uma).
 */
const COR_FICHA_PADRAO = '#d53030';

/** Avatar da ficha (m3-62) — mesmos limites validados no backend (`FichaService.alterarImagem`). */
const TIPOS_IMAGEM_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_IMAGEM_BYTES = 2 * 1024 * 1024;

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

/**
 * Aba da mini barra do card de **Status** (terceira coluna, redesenho de comparação visual).
 * `historia` (m3-50) é **condicional** — só dono/mestre veem o botão (`ajustavel()`); o template
 * também gate o painel pelo mesmo sinal, já que a `dados().historia` nem chega ao visualizador
 * (omitida no backend), mas um fragmento de URL manipulado à mão não deve renderizar a caixa vazia.
 * A antiga aba `historico` (m3-27) saiu daqui: virou a barra lateral `HistoricoRolagensSidebar`
 * (gatilho D20 no cabeçalho de `FichaVisualizar`, visível em qualquer aba) — mantê-la como aba
 * duplicava a mesma lista em dois lugares.
 */
export type AbaStatus =
  | 'informacoes'
  | 'inventario'
  | 'habilidades'
  | 'rolagens'
  | 'extras'
  | 'historia';

/** Recorte local da aba Extras — estado efêmero de apresentação, sem reflexo na URL ou na ficha. */
type AbaExtras = 'identidade' | 'fragmentos';

/** Todas as abas do card de Status, na ordem de exibição da barra. */
const ABAS_STATUS: readonly AbaStatus[] = [
  'informacoes',
  'inventario',
  'habilidades',
  'rolagens',
  'extras',
  'historia',
];

/** `true` quando a string é uma aba do Status conhecida — valida o `#` (fragmento) da URL (deep-link). */
export function ehAbaStatus(valor: string | null | undefined): valor is AbaStatus {
  return ABAS_STATUS.includes(valor as AbaStatus);
}

/**
 * Abas do card de Status no `modo="compacto"` (m2-21) — o trio reduzido do card de equipe. A m2-20
 * tinha **desligado** a barra no compacto e empilhado Inventário/Habilidades/Rolagens de uma vez;
 * a m2-21 religa o mesmo mecanismo com este recorte. `rolagens` sai porque o painel foi morar na
 * coluna lateral da página (`CampanhaDetalhe`, ao lado do histórico da sessão); `extras`/`historia`
 * continuam exclusivas da ficha completa.
 */
const ABAS_STATUS_COMPACTO: readonly AbaStatus[] = ['informacoes', 'inventario', 'habilidades'];

/**
 * Destino da barra de navegação **inferior** do mobile (m3-60). É `AbaStatus` mais `'agente'`,
 * porque no celular as colunas Identidade e Atributos do desktop deixam de ser blocos empilhados
 * acima do Status e viram um destino próprio. `'agente'` **não** entra em `AbaStatus` de propósito:
 * o `#` da URL continua sendo o canal das abas de Status e o desktop segue com as três colunas
 * visíveis ao mesmo tempo.
 */
export type DestinoMobile = 'agente' | AbaStatus;

/**
 * Percentual de preenchimento de uma barra de vitalidade, limitado a 0–100. A máxima pode ser 0
 * (ficha recém-criada, ou Energia zerada por classe) — nesse caso a barra fica vazia em vez de
 * dividir por zero.
 */
function percentualBarra(atual: number, maxima: number): number {
  if (maxima <= 0) return 0;
  return Math.max(0, Math.min(100, (atual / maxima) * 100));
}

/**
 * Destinos da barra inferior, na ordem de exibição. Os seis últimos espelham `ABAS_STATUS` — a
 * barra lê como as três colunas do desktop da esquerda para a direita (Identidade+Atributos,
 * depois as abas do card de Status).
 *
 * Os rótulos são curtos de propósito: com `flex: 1 1 0` os itens dividem a largura em partes
 * iguais (mesmo padrão da barra da calculadora, `calculadora-shell.component.scss`) e a 360px cada
 * item fica com ~48px — "Inventário" por extenso não caberia, e cortar rótulo foi exatamente o
 * defeito da m3-56. `rotuloCompleto` alimenta o `aria-label`, então o leitor de tela ouve o nome
 * inteiro mesmo com o rótulo visual abreviado.
 */
const DESTINOS_MOBILE: readonly {
  readonly destino: DestinoMobile;
  readonly rotulo: string;
  readonly rotuloCompleto: string;
  readonly icone: IconeNome;
}[] = [
  { destino: 'agente', rotulo: 'Agente', rotuloCompleto: 'Agente', icone: 'agente' },
  { destino: 'informacoes', rotulo: 'Status', rotuloCompleto: 'Informações', icone: 'visao-geral' },
  { destino: 'inventario', rotulo: 'Invent.', rotuloCompleto: 'Inventário', icone: 'inventario' },
  { destino: 'habilidades', rotulo: 'Habilid.', rotuloCompleto: 'Habilidades', icone: 'habilidades' },
  { destino: 'rolagens', rotulo: 'Rolagens', rotuloCompleto: 'Rolagens', icone: 'rolagens' },
  { destino: 'extras', rotulo: 'Extras', rotuloCompleto: 'Extras', icone: 'mais' },
  { destino: 'historia', rotulo: 'História', rotuloCompleto: 'História', icone: 'anotacoes' },
];

/**
 * Subconjunto de `DESTINOS_MOBILE` válido no `modo="compacto"` — cinco destinos (m2-21): os quatro
 * da m2-20 mais `informacoes`, que voltou a existir quando a barra de abas do compacto foi religada
 * (Atributos + Combate + Anotações migraram pra ela). Extras/História seguem de fora — só a ficha
 * completa os tem. `rolagens` continua na barra, mas é o **único destino que não é uma aba**: o
 * painel vive na coluna lateral da página, então tocá-lo só avisa `CampanhaDetalhe`, que rola até
 * lá (ver `selecionarDestinoMobile`).
 */
const COMPACTO_DESTINOS_MOBILE = new Set<DestinoMobile>([
  'agente',
  'informacoes',
  'inventario',
  'habilidades',
  'rolagens',
]);

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
 * Edição em grupo dos atributos + Maestria + modificadores de teste + ajuste manual de dados — a
 * página persiste os quatro em `atributos`, `maestria`, `modificadoresTeste` e `dadosTeste`
 * (redesenho de comparação visual: Maestria, modificador de teste e ajuste de dados só são
 * editáveis junto com o atributo, na mesma tela — não há canal separado).
 */
export interface AjusteAtributos {
  readonly atributos: FichaAtributosDto;
  readonly maestria: keyof FichaAtributosDto | null;
  readonly modificadoresTeste: Record<keyof FichaAtributosDto, number>;
  readonly dadosTeste: Record<keyof FichaAtributosDto, number>;
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
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    HoldRepeat,
    Icone,
    FichaSanidade,
    FichaInventario,
    FichaHabilidades,
    FichaRolagensPainel,
    BandejaDados,
    OverflowFade,
    Tooltip,
    Dialog,
    AjusteEnquadramentoImagem,
    FocoImagem,
  ],
  templateUrl: './ficha-visualizacao.component.html',
  styleUrl: './ficha-visualizacao.component.scss',
})
export class FichaVisualizacao {
  /** A janela flutuante do Encontro é o único scroll vertical no mobile. */
  readonly rolagemExterna = input(false);

  /** Identificador da ficha (compõe a classificação `FICHA-JGD-NNNN`). */
  readonly fichaId = input.required<number>();
  /** Nome/codinome do agente (exibido no card de identidade). */
  readonly nome = input.required<string>();
  /** Documento de jogo da ficha a exibir. */
  readonly dados = input.required<FichaJogadorDadosDto>();

  /**
   * Cor de identidade visual da ficha (m3-61) — coluna relacional, ao lado de `nome`, **não**
   * confundir com o `--accent` de tema (por usuário, `TemaService`). `null`/ausente: sem cor
   * definida, cai no accent de quem visualiza. Alimenta o swatch do cabeçalho e é repassada a toda
   * rolagem desta ficha (bandeja de dados, histórico, feed da campanha).
   */
  readonly cor = input<string | null>(null);

  /**
   * URL do avatar da ficha (m3-62) — coluna relacional, ao lado de `nome`/`cor`. `null`/ausente:
   * sem avatar definido, cai no placeholder decorativo (a borda continua colorida por {@link cor}).
   */
  readonly imagemUrl = input<string | null>(null);

  /** Enquadramento do avatar (crop-pan, ajuste pós-mockup) — ver {@link FichaImagemFocoDto}. Aplicado
   * na `<img>` do avatar via a diretiva `FocoImagem` (ver template). */
  readonly foco = input<FichaImagemFocoDto | null>(null);

  /** Ficha oculta (m3-65) — `true` esconde a ficha (nem carteirinha) de quem não é dono/mestre. */
  readonly oculta = input<boolean>(false);

  /**
   * Habilita os passos − / + de Vida e Energia direto na leitura — ajuste rápido do estado em jogo,
   * sem entrar em edição. A página só liga para dono/mestre; o backend revalida o `alterarFicha`.
   */
  readonly ajustavel = input(false);

  /**
   * `true` quando o autor pode **rolar dados** desta ficha (m3-51, item 24) — teste de atributo, dano
   * (C.a.C./Furtivo/arma) e presets/rolagem avulsa da aba Rolagens. **Distinto** de `ajustavel`
   * (edição): hoje as duas coincidem (só dono/mestre — "visualizador não rola"), mas o conceito é
   * granular de propósito, para uma futura concessão de rolagem sem edição não exigir reabrir este
   * contrato. Sem endpoint de rolagem no backend ainda (`m3-27`, fora de escopo aqui) — o gate é hoje
   * só de apresentação; a página liga com o mesmo `podeGerenciar()` de `ajustavel`.
   */
  readonly podeRolar = input(false);

  /**
   * `true` quando o autor é o **mestre** da campanha (distinto de `ajustavel`, que também vale pro
   * dono) — só a Identidade (Personalidade/Origem) precisa distinguir os dois papéis: a trava de
   * imutabilidade (m3-24) libera o mestre e prende o dono depois da primeira definição.
   */
  readonly ehMestre = input(false);

  /**
   * `'padrao'` (default) segue o breakpoint real de *viewport* (`$bp-tablet`/`$bp-mobile`, ver
   * SCSS) — o comportamento de sempre em `FichaVisualizar`. `'compacto'` (m2-20, "card de
   * equipe") é o modo usado por `CampanhaDetalhe` pra qualquer ficha exibida na coluna principal
   * da visão do jogador (própria ou de colega): reduz as 3 colunas do layout `'padrao'` (Identidade
   * 420 + Atributos 260 + Status mín. 420 ≈ 1130px, mais do que a coluna principal tem) pra 2 —
   * a coluna 1 (`&__coluna-agente`, 500px) fica só com Identidade/Vitalidade/Reações/Resistências e
   * a 2 é o card de Status. Esconde Prestígio e reduz a barra de abas ao trio **Informações ·
   * Inventário · Habilidades** (m2-21, {@link ABAS_STATUS_COMPACTO}): Atributos e o glance de
   * Combate migram pra aba Informações, Rolagens vai pra coluna lateral da página, e Extras/
   * História seguem só na ficha completa (via "Abrir ficha completa").
   */
  readonly modo = input<'padrao' | 'compacto'>('padrao');
  /** Autoriza oferecer a transferência de itens desta ficha para a base da campanha. */
  readonly podeMandarParaBase = input(false);

  /**
   * Reabre a aba **Rolagens** dentro do trio do `'compacto'` — só pra quem hospeda a ficha embutida
   * **sem** uma coluna lateral própria de rolagens (a tela de Iniciativa, que a mostra flutuando ou
   * na lateral de 70% do jogador, ao lado do combate). `CampanhaDetalhe` deixa `false` (padrão): lá
   * o painel de rolagens já mora na `HistoricoRolagensSidebar`, e duplicá-lo seria ruído.
   */
  readonly mostrarRolagensCompacto = input(false);

  /**
   * Gate da edição "completa" (identidade/classe/reações/contra-ataque/resistências/atributos em
   * grupo/derivados de Combate/história) — no modo `'compacto'` (m2-20, restrição pós-entrega)
   * essas ficam **só leitura** mesmo pro dono/mestre: o card de equipe edita Dinheiro, Vida/
   * Energia, Condições (Morrendo/Machucado/Inconsciente), Inventário (add/remover item) e as
   * **Anotações** (m2-21, quando a aba Informações passou a existir no compacto) — todas no
   * `ajustavel()` puro. O resto exige "Abrir ficha completa" (`modo="padrao"`).
   */
  protected readonly ajustavelAmplo = computed(() => this.ajustavel() && this.modo() !== 'compacto');

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

  /** Nova cor de identidade visual (m3-61, relacional — fora do `dados`) — a página persiste `ficha.cor`. */
  readonly ajusteCor = output<string | null>();

  /** Novo valor de "ficha oculta" (m3-65, relacional — fora do `dados`) — a página persiste `ficha.oculta`. */
  readonly ajusteOculta = output<boolean>();

  /** Dialog pendente de confirmação; clicar no controle nunca altera a ficha diretamente. */
  protected readonly confirmandoVisibilidade = signal(false);

  solicitarAlteracaoVisibilidade(): void {
    this.confirmandoVisibilidade.set(true);
  }

  protected cancelarAlteracaoVisibilidade(): void {
    this.confirmandoVisibilidade.set(false);
  }

  protected confirmarAlteracaoVisibilidade(): void {
    this.ajusteOculta.emit(!this.oculta());
    this.confirmandoVisibilidade.set(false);
  }

  /**
   * Novo avatar escolhido pelo `<input type="file">` do cabeçalho (m3-62, relacional — fora do
   * `dados`) — a página envia via `FormData` (`FichaService.alterarImagem`) e atualiza
   * `imagemUrl` **imediatamente**, sem passar pelo `agendarPersistencia` debounced (o upload em
   * si já é a persistência).
   */
  readonly ajusteImagem = output<File>();

  /** Remove o avatar da ficha (m3-62) — mesmo modelo imediato de {@link ajusteImagem}. */
  readonly removerImagem = output<void>();

  /** Novo enquadramento do avatar — a página persiste `ficha.imagemFoco`. */
  readonly focoMudou = output<FichaImagemFocoDto | null>();

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

  /** Emite quando o mestre confirma a limpeza de Origem ao adicionar Peculiaridade (`mudarHabilidades`). */
  readonly origemLimpa = output<void>();

  /** Inventário (itens + amplificadores) editado — a página persiste em `dados.inventario` (m3-14). */
  readonly ajusteInventario = output<FichaInventarioDto>();
  /** Solicitação de transferência encaminhada à página, responsável pela chamada REST e recarga. */
  readonly mandarParaBase = output<{ readonly indice: number; readonly quantidade?: number }>();

  /** Presets de rolagem editados — a página persiste em `dados.rolagens` (m3-15). */
  readonly ajusteRolagens = output<readonly FichaRolagemDto[]>();

  /** Combos editados (m3-37) — a página persiste em `dados.combos`. */
  readonly ajusteCombos = output<readonly FichaComboDto[]>();

  /**
   * Histórico de Fragmentos consumidos (m3-64) — a página persiste em `dados.fragmentosConsumidos`.
   * Emitido por `aoRegistrarFragmentoConsumido`, que prepende o novo registro à lista existente.
   */
  readonly ajusteFragmentosConsumidos = output<readonly FichaFragmentoConsumidoDto[]>();

  /** Anotações livres editadas (m3-32) — a página persiste em `dados.anotacoes`. */
  readonly ajusteAnotacoes = output<string>();

  /**
   * História livre editada (m3-50) — a página persiste em `dados.historia`. Só emitido quando
   * `ajustavel()` está ativo (dono/mestre); um visualizador nem vê o botão/painel da aba.
   */
  readonly ajusteHistoria = output<string>();

  /** Nova Personalidade (m3-25) — a página persiste em `dados.identidade.personalidade`. */
  readonly ajustePersonalidade = output<string>();

  /**
   * Novo Contrato (m3-40) — a página persiste em `dados.contrato`. Só emitido quando
   * `contratoEditavel()` está ativo (mestre); o backend é o árbitro final (`alterarFicha`).
   */
  readonly ajusteContrato = output<string>();

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

  /**
   * Preço de Sanidade de **consumir** um Fragmento (m3-42): acrescenta as sequelas "Rejeição
   * Biológica" recebidas às já existentes, reusando o mesmo canal `ajusteSanidade` (m3-12) da aba
   * Sanidade em vez de abrir uma persistência paralela.
   */
  protected aoConsumirFragmentoSanidade(sequelasAdicionadas: readonly FichaSequelaDto[]): void {
    if (sequelasAdicionadas.length === 0) {
      return;
    }
    const estado = this.estado();
    this.ajusteSanidade.emit({
      sequelas: [...estado.sequelas, ...sequelasAdicionadas],
      traumas: estado.traumas,
      lesoes: estado.lesoes,
    });
  }

  /**
   * Bônus "Consumido" de um Fragmento Potencializador (m3-64): aplica ao **agente**, permanente —
   * `aplicarBonusConsumoFragmento` (fonte única) resolve onde cada tipo aterrissa
   * (`modificadoresTeste`/`atributos` para TESTE, `derivados` para DEFESA/DANO_CORPO). Reusa os
   * mesmos canais de persistência de edição manual (`ajusteAtributos`/`ajusteDerivado`, m3-10) em
   * vez de abrir um novo — `ajusteAtributos` também re-deriva vida/energia quando o atributo muda
   * (Módulo I), mesmo caminho de uma edição manual de atributo.
   */
  protected aoConsumirFragmentoBonus(efeito: BonusConsumoFragmentoEscolhidoDto): void {
    const dados = this.dados();
    const resultado = aplicarBonusConsumoFragmento(
      {
        atributos: dados.atributos,
        derivados: dados.derivados ?? {},
        modificadoresTeste: dados.modificadoresTeste ?? {},
      },
      efeito.opcao,
      efeito.atributoEscolhido,
    );
    this.emitirEfeitoBonusFragmento(efeito.opcao, resultado);
  }

  /**
   * Traduz o `resultado` (de `aplicarBonusConsumoFragmento`/`reverterBonusConsumoFragmento`) nos
   * canais de persistência de edição manual já existentes (`ajusteAtributos`/`ajusteDerivado`,
   * m3-10) — compartilhado entre aplicar (`aoConsumirFragmentoBonus`) e reverter
   * (`removerFragmentoConsumido`, m3-64 correção), já que os dois só diferem no sinal do delta.
   */
  private emitirEfeitoBonusFragmento(
    opcao: OpcaoBonusConsumoFragmentoDto,
    resultado: EfeitoConsumoFragmentoDto,
  ): void {
    const dados = this.dados();
    if (opcao.tipo === 'TESTE') {
      const modificadoresTeste = {} as Record<keyof FichaAtributosDto, number>;
      const dadosTeste = {} as Record<keyof FichaAtributosDto, number>;
      (Object.keys(dados.atributos) as (keyof FichaAtributosDto)[]).forEach((chave) => {
        modificadoresTeste[chave] = resultado.modificadoresTeste[chave] ?? 0;
        dadosTeste[chave] = dados.dadosTeste?.[chave] ?? 0;
      });
      this.ajusteAtributos.emit({ atributos: resultado.atributos, maestria: dados.maestria, modificadoresTeste, dadosTeste });
      return;
    }

    const chave = opcao.tipo === 'DEFESA' ? 'defesa' : 'danoCorpoACorpo';
    const valor = resultado.derivados[chave];
    if (valor !== undefined) {
      this.ajusteDerivado.emit({ chave, valor });
    }
  }

  /** Histórico de Fragmentos consumidos (m3-64), mais recente primeiro — aba Extras, acima da Afinidade. */
  protected readonly fragmentosConsumidos = computed<readonly FichaFragmentoConsumidoDto[]>(
    () => this.dados().fragmentosConsumidos ?? [],
  );

  /**
   * Registra o consumo de um fragmento na aba Extras (m3-64) — **incondicional**, ao contrário da
   * sequela "Rejeição Biológica" (evitável com o teste de Vontade, `aoConsumirFragmentoSanidade`):
   * este rastro nunca some.
   */
  protected aoRegistrarFragmentoConsumido(registro: FichaFragmentoConsumidoDto): void {
    this.ajusteFragmentosConsumidos.emit([registro, ...this.fragmentosConsumidos()]);
  }

  /** Índice do registro de `fragmentosConsumidos` com a confirmação "Remover?" aberta, ou `null`. */
  protected readonly removendoFragmentoConsumidoIndice = signal<number | null>(null);

  /** Abre a confirmação inline de remoção de um registro (mesmo padrão de combos/sequelas/traumas/lesões). */
  protected pedirRemocaoFragmentoConsumido(indice: number): void {
    this.removendoFragmentoConsumidoIndice.set(indice);
  }

  /** Fecha a confirmação inline sem remover nada. */
  protected cancelarRemocaoFragmentoConsumido(): void {
    this.removendoFragmentoConsumidoIndice.set(null);
  }

  /**
   * Remove um registro de `fragmentosConsumidos` (m3-64, correção — "eu posso remover um fragmento
   * consumido também, isso tem que ser possível") e desfaz **tudo** que o consumo aplicou: o bônus no
   * agente (`reverterBonusConsumoFragmento`, sinal oposto de `aplicarBonusConsumoFragmento`), o
   * delta de Energia Máxima (restituição da aquisição − Preço de Sanidade físico) e devolve o item ao
   * inventário avulso. A(s) sequela(s) "Rejeição Biológica" eventualmente geradas **não** são
   * tocadas — ficam sob o mesmo controle manual de qualquer outra sequela (painel de Sanidade).
   */
  protected confirmarRemocaoFragmentoConsumido(indice: number): void {
    const registro = this.fragmentosConsumidos()[indice];
    this.removendoFragmentoConsumidoIndice.set(null);
    if (!registro) {
      return;
    }

    const dados = this.dados();
    const resultado = reverterBonusConsumoFragmento(
      {
        atributos: dados.atributos,
        derivados: dados.derivados ?? {},
        modificadoresTeste: dados.modificadoresTeste ?? {},
      },
      registro.opcao,
      registro.atributoEscolhido,
    );
    this.emitirEfeitoBonusFragmento(registro.opcao, resultado);

    this.ajusteVitalidade.emit({
      campo: 'energiaMaxima',
      valor: this.energiaMaxima() - registro.deltaEnergiaMaxima,
    });

    this.ajusteInventario.emit({ ...dados.inventario, itens: [...dados.inventario.itens, registro.item] });

    this.ajusteFragmentosConsumidos.emit(this.fragmentosConsumidos().filter((_, i) => i !== indice));
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

  /**
   * Aba inicialmente ativa da mini barra do card de **Status** — semeia a barra a partir do `#`
   * (fragmento) da URL (deep-link/refresh), mesmo padrão de `abaInicial`/`abas` acima, mas com o
   * próprio canal (fragmento, não `?aba=`) para não colidir com a navegação por abas de página
   * inteira (m3-11, hoje fora do template). A página valida o fragmento (`ehAbaStatus`) e o repassa.
   */
  readonly abaStatusInicial = input<AbaStatus>('informacoes');

  /**
   * Aba ativa da mini barra de abas do card de **Status** (terceira coluna, redesenho de
   * comparação visual) — distinta de `abaAtiva`/`abas` acima. `linkedSignal` re-deriva do
   * `abaStatusInicial` (navegação por URL) mas permanece gravável — um clique numa aba a
   * sobrescreve localmente sem esperar a volta pela rota.
   */
  protected readonly abaStatusAtiva = linkedSignal<AbaStatus>(() => this.abaStatusInicial());

  /** Subaba de Extras; preservada enquanto esta instância da visualização permanecer montada. */
  protected readonly abaExtrasAtiva = signal<AbaExtras>('identidade');

  /**
   * Emite a aba escolhida, ou `'agente'` (m3-60 — destino próprio da barra inferior, fora de
   * `AbaStatus`) — a página reflete no `#` (fragmento) da URL (deep-link/refresh), assim um F5 na
   * aba Agente volta pra ela em vez de cair na aba de Status que estivesse marcada antes.
   */
  readonly abaStatusMudou = output<DestinoMobile>();

  /**
   * Aba efetivamente **renderizada** no card. Igual a `abaStatusAtiva` no `modo="padrao"`; no
   * `'compacto'` (m2-21) o card só tem o trio de {@link ABAS_STATUS_COMPACTO} (mais `rolagens`
   * quando `mostrarRolagensCompacto`), então uma aba fora do que está visível no momento —
   * `extras`/`historia` (só na ficha completa), ou `rolagens` sem o input — chegando por um `#` de
   * URL antigo ou manipulado à mão — cai em Informações em vez de deixar o card vazio.
   */
  protected readonly abaStatusEfetiva = computed<AbaStatus>(() => {
    const aba = this.abaStatusAtiva();
    if (this.modo() !== 'compacto') {
      return aba;
    }
    return this.abasStatusVisiveis().includes(aba) ? aba : 'informacoes';
  });

  /**
   * Abas exibidas na barra do card — o trio reduzido no compacto (m2-21), as seis no padrão.
   * `mostrarRolagensCompacto` reabre a quarta (Rolagens) só no compacto — ver o comentário do input.
   */
  protected readonly abasStatusVisiveis = computed<readonly AbaStatus[]>(() => {
    if (this.modo() !== 'compacto') {
      return ABAS_STATUS;
    }
    return this.mostrarRolagensCompacto()
      ? [...ABAS_STATUS_COMPACTO, 'rolagens']
      : ABAS_STATUS_COMPACTO;
  });

  /** `true` quando a aba `aba` deve aparecer na barra deste modo (atalho de template). */
  protected mostraAbaStatus(aba: AbaStatus): boolean {
    return this.abasStatusVisiveis().includes(aba);
  }

  /** Troca a aba ativa da mini barra do card de Status. */
  protected selecionarAbaStatus(aba: AbaStatus): void {
    this.abaStatusAtiva.set(aba);
    this.destinoMobile.set(aba);
    this.abaStatusMudou.emit(aba);
  }

  /** Troca somente o recorte apresentado dentro de Extras. */
  protected selecionarAbaExtras(aba: AbaExtras): void {
    this.abaExtrasAtiva.set(aba);
  }

  /**
   * Destino inicial da navegação **mobile** (m3-60). Distinto de `abaStatusInicial` porque no
   * mobile as colunas Identidade e Atributos deixam de ficar empilhadas acima do card de Status e
   * viram um destino próprio (`'agente'`) da barra inferior — as três colunas do desktop, lidas da
   * esquerda para a direita, viram os destinos da barra. A página passa o fragmento da URL quando
   * ele existe (deep-link) e `'agente'` quando não existe, de modo que abrir a ficha no celular
   * cai no agente, não numa aba de Status arbitrária.
   */
  readonly destinoMobileInicial = input<DestinoMobile>('agente');

  /**
   * Destino ativo da barra de navegação inferior (mobile). No desktop é inerte: as três colunas
   * ficam visíveis ao mesmo tempo e quem manda é `abaStatusAtiva` (ver SCSS — o recorte por
   * destino só existe dentro de `bp.mobile`).
   */
  protected readonly destinoMobile = linkedSignal<DestinoMobile>(() => this.destinoMobileInicial());

  /**
   * Destinos da barra inferior, na ordem de exibição (mobile). No `modo="compacto"` (m2-20) o
   * card de equipe não tem abas de Informações/Extras/História (ver `&--compacto` no SCSS e os
   * `@if (modo() !== 'compacto')` no card de Status abaixo) — sem filtrar aqui, esses três
   * destinos ainda apareciam na barra e, ao tocar neles, escondiam Identidade+Atributos+Combate
   * (o único conteúdo "Agente" do compacto) sem nada de correspondente pra mostrar no lugar
   * (Informações nem renderiza; Extras/História renderizavam por baixo do Inventário/Habilidades/
   * Rolagens sempre visíveis, fora da aba que o rótulo dizia estar mostrando).
   */
  protected readonly destinosMobile = computed(() =>
    this.modo() === 'compacto'
      ? DESTINOS_MOBILE.filter((item) => COMPACTO_DESTINOS_MOBILE.has(item.destino))
      : DESTINOS_MOBILE,
  );

  /** `true` quando o destino mobile ativo é o agente (Identidade + Atributos). */
  protected readonly mostrandoAgente = computed(() => this.destinoMobile() === 'agente');

  /**
   * Seleciona um destino da barra inferior. `'agente'` mostra Identidade + Atributos; qualquer
   * outro delega para `selecionarAbaStatus` (que também reflete no `#` da URL).
   */
  protected selecionarDestinoMobile(destino: DestinoMobile): void {
    if (destino === 'agente') {
      this.destinoMobile.set('agente');
      this.abaStatusMudou.emit('agente');
      this.rolarParaTopoDoConteudo();
      return;
    }
    // No compacto comum, "Rolagens" mora na coluna lateral da página. A Iniciativa, porém, liga
    // `mostrarRolagensCompacto`: ali o painel é uma quarta aba real e a navegação mobile precisa
    // selecioná-la, em vez de avisar um hospedeiro externo que não existe.
    if (destino === 'rolagens' && this.modo() === 'compacto' && !this.mostrarRolagensCompacto()) {
      this.destinoMobile.set('rolagens');
      this.abaStatusMudou.emit('rolagens');
      return;
    }
    this.selecionarAbaStatus(destino);
    this.rolarParaTopoDoConteudo();
  }

  /**
   * Traz o conteúdo do destino recém-escolhido para o topo da tela (m3-60). Sem isso, trocar de
   * aba no celular não mostrava a aba: medido ao vivo, o `scrollTop` não mudava e o painel nascia
   * a y=705 de um viewport de 844 — cada troca custava mais uma rolagem. Só no mobile: no desktop
   * as três colunas estão visíveis ao mesmo tempo e mover a página seria gratuito.
   */
  private rolarParaTopoDoConteudo(): void {
    if (typeof window === 'undefined' || !this.emMobile()) return;
    const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduzMovimento ? 'auto' : 'smooth' });
  }

  /**
   * "Estou no mobile?" — lido do CSS (`display` da barra inferior), não de um breakpoint
   * duplicado em TS, para `_breakpoints.scss` continuar a única fonte do valor. **Não** dá pra
   * usar `offsetParent` aqui: por especificação do CSSOM, `offsetParent` retorna `null` para
   * qualquer elemento `position: fixed` — não é um detalhe de implementação, é o comportamento
   * definido, e a barra inferior é `fixed`. A checagem anterior sempre lia "desktop" mesmo no
   * mobile e `rolarParaTopoDoConteudo()` nunca chegava a rodar; passou pelos testes de componente
   * porque o jsdom não faz layout de verdade (não há geometria real para `offsetParent` refletir)
   * — só apareceu ao vivo, medindo `scrollY` num navegador de verdade antes/depois da troca.
   */
  private emMobile(): boolean {
    const nav = this.navMobile()?.nativeElement;
    return !!nav && getComputedStyle(nav).display !== 'none';
  }

  /** Barra de navegação inferior (mobile) — usada só para detectar o modo mobile a partir do CSS. */
  private readonly navMobile = viewChild<ElementRef<HTMLElement>>('navMobile');

  /**
   * Leva ao bloco de Vida/Energia (m3-60): o HUD é leitura, o ajuste continua nos steppers de
   * 44px do card de Identidade, que já têm `appHoldRepeat`. Um toque no HUD abre o destino
   * `'agente'` e rola até eles, em vez de duplicar os controles em dois lugares.
   */
  protected irParaVitais(): void {
    this.destinoMobile.set('agente');
    this.abaStatusMudou.emit('agente');
    if (typeof window === 'undefined' || !this.emMobile()) return;
    const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      const alvo = this.blocoVitalidade()?.nativeElement;
      alvo?.scrollIntoView({ block: 'center', behavior: reduzMovimento ? 'auto' : 'smooth' });
    });
  }

  private readonly blocoVitalidade = viewChild<ElementRef<HTMLElement>>('blocoVitalidade');

  /** Preenchimento da barra de Vida do HUD, em % da máxima efetiva (0–100). */
  protected readonly percentualVida = computed(() =>
    percentualBarra(this.estado().vidaAtual, this.vidaMaximaEfetiva()),
  );

  /** Preenchimento da barra de Energia do HUD, em % da máxima efetiva (0–100). */
  protected readonly percentualEnergia = computed(() =>
    percentualBarra(this.estado().energiaAtual, this.energiaMaximaEfetiva()),
  );

  /** Só as condições ligadas — o HUD mostra selo apenas do que está ativo (nada quando não há). */
  protected readonly condicoesAtivas = computed(() =>
    CONDICOES_FICHA.filter((condicao) => this.condicoes()[condicao.chave]),
  );

  /**
   * Container da mini barra de abas do Status (m3-56.1) — a barra rola horizontalmente (mobile
   * **e** desktop, ver SCSS) quando os 6 rótulos não cabem; usado pelo `effect` abaixo pra trazer
   * a aba ativa pra dentro da área visível.
   */
  private readonly abasStatusContainer = viewChild<ElementRef<HTMLElement>>('abasStatusContainer');

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

  /** Campo de identidade em digitação (Agente/Nível/Prestígio/Personalidade/Contrato), ou `null` fora de edição. */
  protected readonly editandoIdentidade = signal<'nome' | 'personalidade' | 'contrato' | CampoDadosEscalar | null>(
    null,
  );
  private readonly entradaIdentidade = viewChild<ElementRef<HTMLInputElement>>('entradaIdentidade');
  private readonly entradaAnotacoes = viewChild<ElementRef<HTMLTextAreaElement>>('entradaAnotacoes');
  private readonly entradaHistoria = viewChild<ElementRef<HTMLTextAreaElement>>('entradaHistoria');
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

  /**
   * Cor do color picker do cabeçalho (m3-61) — `<input type="color">` embrulhado em Reactive Forms
   * (mesmo padrão de `configuracoes-tema.component`). Nativamente o picker não representa "sem
   * cor": sem `cor()` definida, mostra {@link COR_FICHA_PADRAO} até o dono/mestre escolher uma —
   * o documento continua `null` enquanto o formulário não emitir (a ficha só ganha cor quando
   * alguém realmente escolhe uma no picker).
   */
  protected readonly corFichaForm = new FormControl<string>(COR_FICHA_PADRAO, { nonNullable: true });

  /** Mensagem de validação do avatar (m3-62) — feedback imediato no client; o backend revalida. */
  protected readonly erroImagem = signal<string | null>(null);

  /**
   * Valida o avatar escolhido **no client** (tipo/tamanho) antes de enviar — feedback imediato,
   * sem esperar o round-trip; a validação autoritativa continua no backend
   * (`FichaService.alterarImagem`). Mesmos limites de `FichaService` (backend): jpeg/png/webp, 2MB.
   * Não emite ainda: abre o seletor de enquadramento (`arquivoPendente`) — o upload só acontece
   * quando o enquadramento é confirmado (`confirmarEnquadramento`).
   */
  protected aoSelecionarImagem(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    (evento.target as HTMLInputElement).value = '';
    if (!arquivo) {
      return;
    }
    if (!TIPOS_IMAGEM_ACEITOS.includes(arquivo.type)) {
      this.erroImagem.set('Formato inválido: use JPEG, PNG ou WEBP');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_BYTES) {
      this.erroImagem.set('Imagem maior que o limite permitido (2MB)');
      return;
    }
    this.erroImagem.set(null);
    this.arquivoPendente.set(arquivo);
    this.enquadramentoOrigem.set(arquivo);
  }

  /**
   * Enquadramento do avatar (pan/zoom) — o painel abre automaticamente ao trocar de imagem
   * ({@link aoSelecionarImagem}) e também sob demanda, pelo selo dedicado, pra reajustar a imagem
   * já salva sem reenviar o arquivo.
   */
  protected readonly arquivoPendente = signal<File | null>(null);
  protected readonly enquadramentoOrigem = signal<File | string | null>(null);

  protected abrirEnquadramentoExistente(): void {
    const urlAtual = this.imagemUrl();
    if (urlAtual) {
      this.enquadramentoOrigem.set(urlAtual);
    }
  }

  protected confirmarEnquadramento(foco: FichaImagemFocoDto): void {
    const arquivo = this.arquivoPendente();
    if (arquivo) {
      this.ajusteImagem.emit(arquivo);
    }
    this.focoMudou.emit(foco);
    this.fecharEnquadramento();
  }

  protected fecharEnquadramento(): void {
    this.enquadramentoOrigem.set(null);
    this.arquivoPendente.set(null);
  }

  constructor() {
    // Sincroniza o picker com a cor persistida (troca de ficha exibida, ex.: `CampanhaDetalhe`).
    effect(() => {
      const corAtual = this.cor() ?? COR_FICHA_PADRAO;
      if (this.corFichaForm.value !== corAtual) {
        this.corFichaForm.setValue(corAtual, { emitEvent: false });
      }
    });
    this.corFichaForm.valueChanges.subscribe((cor) => this.ajusteCor.emit(cor));

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
      if (this.editandoHistoria()) {
        this.entradaHistoria()?.nativeElement.focus();
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
    // m3-56.1: a mini barra de abas do Status rola horizontalmente (6 rótulos nem sempre cabem —
    // achado ao vivo tanto no mobile quanto no desktop, onde a coluna Status pode ser mais estreita
    // que os 6 rótulos completos). Sem isso, trocar para uma aba fora da área visível deixava o
    // rótulo cortado na borda do card sem nenhuma pista de que dava pra rolar até ele.
    //
    // `scrollIntoView({ inline: 'nearest' })` (1ª versão) media a posição do botão **no mesmo
    // tick** em que a classe `--ativa` muda — mas é justamente essa classe que expande o botão
    // (ícone-só → ícone+rótulo, ver SCSS), então o layout ainda não tinha assentado a largura
    // nova na hora da leitura (confirmado ao vivo: o botão calculava 349px de borda direita
    // contra 336px do container, mas só rolava 11px de um máximo de 30px necessários — sobravam
    // ~14px cortados). `requestAnimationFrame` adia a leitura pro frame seguinte, já com o
    // layout recalculado; o scroll manual (em vez de deixar o `scrollIntoView` decidir "nearest")
    // também garante a borda oposta certa nos dois sentidos (botão parcialmente fora à esquerda
    // ou à direita).
    effect(() => {
      const aba = this.abaStatusEfetiva();
      const container = this.abasStatusContainer()?.nativeElement;
      if (!container) {
        return;
      }
      requestAnimationFrame(() => {
        const botao = container.querySelector<HTMLElement>(`[data-aba-status="${aba}"]`);
        if (!botao) {
          return;
        }
        const areaContainer = container.getBoundingClientRect();
        const areaBotao = botao.getBoundingClientRect();
        let scrollAlvo = container.scrollLeft;
        if (areaBotao.left < areaContainer.left) {
          scrollAlvo -= areaContainer.left - areaBotao.left;
        } else if (areaBotao.right > areaContainer.right) {
          scrollAlvo += areaBotao.right - areaContainer.right;
        } else {
          return; // já totalmente visível — nada a rolar.
        }
        const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        container.scrollTo({ left: scrollAlvo, behavior: reduzMovimento ? 'auto' : 'smooth' });
      });
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

  protected readonly perfilClasse = computed(() => perfilClasseRotulos(this.dados().classe, this.dados().arquetipo));
  protected readonly classeTexto = computed(() => this.perfilClasse().classeBase);
  protected readonly subclasseTexto = computed(() => this.perfilClasse().subclasse);
  /** Patente derivada do Prestígio (`shared/regras/patente`) — não é persistida. */
  protected readonly patenteTexto = computed(() => rotuloPatente(this.dados().prestigio));
  /** Dinheiro atual (m3-34) — ausente em fichas anteriores cai em 0 (retrocompat). */
  protected readonly dinheiro = computed(() => this.dados().dinheiro ?? 0);
  /** Salário da patente atual (m3-34) — derivado do Prestígio, nunca persistido. */
  protected readonly salario = computed(() => salarioPatente(this.dados().prestigio));
  /** Linha completa da tabela de patentes (faixa, limites) derivada do Prestígio — seção Patente (Extras). */
  protected readonly patenteInfo = computed(() => patenteDetalhada(this.dados().prestigio));
  /** Faixa de Prestígio da patente atual, formatada ("0–2", "66–∞"). */
  protected readonly patenteFaixaPrestigio = computed(() => faixaPrestigioPatente(this.patenteInfo()));
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

  /**
   * Ajuste de dados vindo de **itens equipados** (`shared/regras/agente/defesa` — hoje só Armadura
   * Pesada: "−1 dado em Destreza") — soma por cima do ajuste manual (`dadosTeste`) só na leitura,
   * nunca escreve nele (mesmo motivo de `modificadoresTesteAmplificador`).
   */
  protected readonly ajusteDadosEquipamento = computed(() =>
    calcularAjusteDadosEquipamento(this.dados().inventario.itens),
  );

  /**
   * Atributos **para dados** = efetivo (lesão) + ajuste manual de `dadosTeste` + ajuste de
   * equipamento (`ajusteDadosEquipamento`) — usado **só** como contagem de dados de rolagem
   * (`rolarTesteAtributo`, presets em `FichaRolagensPainel`). Energia/Deslocamento/Vida/Maestria e o
   * valor exibido na ficha continuam em `atributosEfetivos`/`atributos`, intocados por este ajuste.
   */
  protected readonly atributosParaDados = computed(() => {
    const manual = this.dados().dadosTeste ?? {};
    const equipamento = this.ajusteDadosEquipamento();
    const combinado: Partial<Record<ChaveAtributo, number>> = { ...manual };
    (Object.keys(equipamento) as ChaveAtributo[]).forEach((chave) => {
      combinado[chave] = (combinado[chave] ?? 0) + (equipamento[chave] ?? 0);
    });
    return calcularAtributosParaDados(this.atributos(), this.estado().lesoes, combinado);
  });

  /**
   * DT (Dificuldade de Teste) do atributo `chave` quando **este agente** é o causador do teste —
   * `shared/regras/dt` (mesma fórmula da página de DT da calculadora, m1-08): `10 + Nível +
   * Atributo×2`. Usa o atributo **efetivo** (já com a penalidade de lesão descontada) — de propósito
   * **não** inclui o ajuste manual de dados (`dadosTeste`): DT é um alvo derivado, não uma fonte de
   * dados de rolagem, então diverge de `rolarTesteAtributo` (que usa `atributosParaDados`) por design.
   */
  protected dtAtributo(chave: ChaveAtributo): number {
    return calcularDtAtributo({ nivel: this.dados().nivel, atributo: this.atributosEfetivos()[chave] });
  }

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
   * Visibilidade das próximas rolagens + persistência do histórico (m3-27) — extraídos deste
   * componente na m2-21 (item 5) porque o toggle "Rolagem oculta" passou a morar **fora** do card
   * no `modo="compacto"` (coluna lateral de `CampanhaDetalhe`) enquanto o teste de atributo e o
   * dano continuam sendo rolados daqui de dentro: os dois precisam da mesma flag e do mesmo
   * caminho de registro. A página é quem provê a instância (`providers: []`) e quem escuta
   * `registrada$` pro prepend local no histórico/feed.
   */
  protected readonly registro = inject(FichaRolagemRegistroService);

  /**
   * Persiste uma rolagem executada nesta ficha (m3-27) — delega ao
   * {@link FichaRolagemRegistroService} da página. Chamado tanto pelas rolagens diretas daqui
   * (`rolarTesteAtributo`/`rolarDano`) quanto pelo `(rolagemFeita)` do `FichaInventario`, que não
   * conhece o `fichaId`.
   */
  protected registrarRolagem(entrada: RolagemRealizadaDto): void {
    this.registro.registrar(entrada);
  }

  /**
   * Modificador temporário de teste por atributo (ex.: Amplificador aplicado) — persistido em
   * `dados.modificadoresTeste` (redesenho de comparação visual), mas só **editável** dentro da
   * mesma tela de edição dos atributos (`editandoAtributos()`); fora dela é só leitura.
   */
  protected readonly modificadoresTeste = computed(() => this.dados().modificadoresTeste ?? {});

  /**
   * Ajuste manual de dados por atributo (ex.: sequela/condição reduzindo dados sem mexer no
   * atributo — hoje só editável manualmente aqui) — persistido em `dados.dadosTeste`.
   */
  protected readonly dadosTeste = computed(() => this.dados().dadosTeste ?? {});

  /** Ajuste manual de dados de um atributo, resolvido a 0 quando ausente. */
  protected dadosTesteDe(chave: ChaveAtributo): number {
    return this.dadosTeste()[chave] ?? 0;
  }

  /**
   * Modificadores de teste vindos dos amplificadores portados (`shared/regras/agente/amplificador`)
   * — somam por cima do manual (`modificadoresTeste`) só na leitura, nunca substituem nem são
   * commitados de volta ao editar (mesmo motivo de `informacoesExtras`/`vidaMaximaEfetiva`).
   */
  protected readonly modificadoresTesteAmplificador = computed(() =>
    modificadoresTesteAmplificadores(this.dados().inventario.amplificadores),
  );

  /**
   * Modificador de teste de um atributo (manual + amplificador + bônus **plano** de Formação da
   * Origem, m3-41: `PERICIA_BONUS_ATRIBUTO`), já resolvido a 0 quando ausente. O dado **extra** de
   * `PERICIA_DADO_ATRIBUTO` não entra aqui — soma no pool da rolagem (`rolarTesteAtributo`), não no
   * modificador plano.
   */
  protected modificadorTeste(chave: ChaveAtributo): number {
    return (
      (this.modificadoresTeste()[chave] ?? 0) +
      (this.modificadoresTesteAmplificador()[chave] ?? 0) +
      this.bonusRolagemAtributoFormacao(chave).bonus
    );
  }

  /** Bônus de Formação da Origem (dado extra no pool + bônus plano no resultado) no teste do atributo `chave`. */
  private bonusRolagemAtributoFormacao(chave: ChaveAtributo) {
    return obterBonusRolagemAtributoFormacao(this.formacaoOrigem(), chave);
  }

  /** Rascunho dos modificadores de teste durante a edição — completo (as 10 chaves, 0 onde ausente). */
  protected readonly rascunhoModificadoresTeste = signal<Record<ChaveAtributo, number> | null>(null);

  /** Rascunho do ajuste manual de dados durante a edição — completo (as 10 chaves, 0 onde ausente). */
  protected readonly rascunhoDadosTeste = signal<Record<ChaveAtributo, number> | null>(null);

  /** Record completo (as 10 chaves) dos modificadores persistidos, preenchendo 0 onde ausente. */
  private modificadoresTesteCompletos(): Record<ChaveAtributo, number> {
    const persistidos = this.modificadoresTeste();
    const completo = {} as Record<ChaveAtributo, number>;
    (Object.keys(this.atributos()) as ChaveAtributo[]).forEach((chave) => {
      completo[chave] = persistidos[chave] ?? 0;
    });
    return completo;
  }

  /** Record completo (as 10 chaves) do ajuste manual de dados persistido, preenchendo 0 onde ausente. */
  private dadosTesteCompletos(): Record<ChaveAtributo, number> {
    const persistidos = this.dadosTeste();
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

  /** Passo −/+ no ajuste manual de dados do rascunho (sem clamp — mesma liberdade dos demais). */
  protected ajustarDadosTesteRascunho(chave: ChaveAtributo, delta: number): void {
    const atual = this.rascunhoDadosTeste();
    if (!atual) {
      return;
    }
    this.rascunhoDadosTeste.set({ ...atual, [chave]: atual[chave] + delta });
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
   * natural em m3-31; dado extra de Formação em m3-41; ajuste manual de dados via
   * `atributosParaDados`): a fórmula explícita `(Atributo para dados)d20kh1cm1 + PROF` — pool de
   * D20, pega o maior, **conta a margem de crítico natural** (`cm1` = crita no 20; regra 1216) e soma
   * a Proficiência. A contagem do pool vem de `atributosParaDados` (atributo **efetivo**, pós-lesão,
   * **+ o ajuste manual de `dadosTeste`**), **+ dado de Formação da Origem** quando a linha
   * `PERICIA_DADO_ATRIBUTO` mira este atributo — lesão reduz, `dadosTeste` e Formação aumentam (ou
   * `dadosTeste` também pode reduzir, é livre) quantos D20 entram no pool; contagem final 0/negativa
   * vira desvantagem intrínseca do motor (rola 2+|attr| dados e mantém o menor; regra 270). O
   * modificador de teste (coluna de Atributos, já com o bônus **plano** de Formação embutido em
   * `modificadorTeste`) some no final, como uma constante da fórmula.
   */
  protected rolarTesteAtributo(campo: CampoAtributo): void {
    if (!this.podeRolar()) {
      return;
    }
    const dadosFormacao = this.bonusRolagemAtributoFormacao(campo.chave).dados;
    const atributosParaDados = this.atributosParaDados();
    const atributo = atributosParaDados[campo.chave] + dadosFormacao;
    const sufixo = this.sufixoModificador(this.modificadorTeste(campo.chave));
    // A fórmula que vai ao **motor** mantém `kh1` — é o gatilho da desvantagem intrínseca (atributo ≤ 0).
    const formula = `${campo.chave}d20kh1cm1 + PROF${sufixo}`;
    // O motor lê a contagem do pool direto do mapa de atributos — o dado de Formação e o ajuste
    // manual entram ajustando só a chave deste teste, sem alterar o atributo exibido em nenhum
    // outro lugar da ficha.
    const atributosParaRolagem =
      dadosFormacao !== 0 ? { ...atributosParaDados, [campo.chave]: atributo } : atributosParaDados;
    const resultado = rolarFormula({
      formula,
      atributos: atributosParaRolagem,
      proficiencia: this.proficiencia(),
      nivel: this.dados().nivel,
    });
    if (resultado) {
      // Legenda **honesta** (m3-31): em **desvantagem** (atributo ≤ 0) o motor rola `(2+|attr|)d20` e
      // mantém o **menor** — então a fórmula exibida troca `kh1`→`kl1` e mostra a contagem real, em vez de
      // exibir `kh1` (mantém o maior) numa rolagem que na verdade manteve o menor.
      const formulaExibida = atributo <= 0 ? `${2 - atributo}d20kl1cm1 + PROF${sufixo}` : formula;
      this.bandeja.mostrar({ rotulo: campo.nome, formula: formulaExibida, resultado, corFicha: this.cor() });
      this.registrarRolagem({ rotulo: campo.nome, formula: formulaExibida, resultado });
    }
  }

  /**
   * Rola Dano C. a C. ou Dano Furtivo direto do glance de Status (mesmo dadinho da Visão Geral) —
   * a fórmula é a própria expressão de `informacoesExtras()` (ex.: `2D6 [Físico]`, `2D6+2`), sem
   * atributo/PROF envolvido (o motor já entende dado + tag de tipo sem eles).
   */
  protected rolarDano(linha: InfoExtra): void {
    if (!this.podeRolar() || typeof linha.bruto !== 'string' || !linha.bruto) {
      return;
    }
    const resultado = rolarFormula({
      formula: linha.bruto,
      atributos: this.atributosEfetivos(),
      proficiencia: this.proficiencia(),
      nivel: this.dados().nivel,
    });
    if (resultado) {
      this.bandeja.mostrar({ rotulo: linha.rotulo, formula: linha.bruto, resultado, corFicha: this.cor() });
      this.registrarRolagem({ rotulo: linha.rotulo, formula: linha.bruto, resultado });
    }
  }

  /**
   * Preset "Iniciativa" seedado no backend em toda ficha nova (`PRESET_INICIATIVA_PADRAO`, m3-47) —
   * `null` só em fichas antigas cujo preset foi apagado manualmente antes deste redesenho (o box de
   * Iniciativa de Informações some nesse caso; `editavel()` pode recriá-lo na aba Rolagens de novo,
   * o botão "+" de lá continua livre pra qualquer nome).
   */
  protected readonly presetIniciativa = computed(
    () => this.dados().rolagens?.find((preset) => preset.nome === NOME_PRESET_INICIATIVA) ?? null,
  );

  /**
   * Dado extra de Iniciativa: amplificador `Atento` + Formação da Origem `PERICIA_DADO_INICIATIVA`
   * — mesma soma de `FichaRolagensPainel.dadoExtraIniciativa` (fonte única, `shared/regras`).
   */
  protected readonly dadoExtraIniciativa = computed(() => dadoExtraIniciativaDaFicha(this.dados()));

  /** Total de d6 rolados em Iniciativa (Destreza para dados + o dado extra acima) — só leitura no glance. */
  protected readonly dadosIniciativa = computed(() => this.atributosParaDados().destreza + this.dadoExtraIniciativa());

  /**
   * Rola Iniciativa direto do glance de Informações (redesenho — saiu da aba Rolagens, que agora
   * some com ela na ficha completa). A composição (atributos para dados + Proficiência + dado
   * extra de amplificador/Formação) mora em `rolarIniciativaDaFicha` desde a m7-06, porque a tela
   * "Iniciativa" rola exatamente a mesma coisa a partir do mesmo documento.
   */
  protected rolarIniciativa(): void {
    if (!this.podeRolar() || !this.presetIniciativa()) {
      return;
    }
    const executado = rolarIniciativaDaFicha(this.dados());
    if (!executado) {
      return;
    }
    this.bandeja.mostrar({
      rotulo: executado.rotulo,
      formula: executado.formula,
      resultado: executado.resultado,
      corFicha: this.cor(),
    });
    this.registrarRolagem({ rotulo: executado.rotulo, formula: executado.formula, resultado: executado.resultado });
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
  /**
   * `anotacoes` (m3-51) é opcional — ausente para um visualizador (omitida no backend, mesmo
   * mecanismo de `historia`/m3-50) e em fichas sem texto definido; `??` cobre os dois casos antes do
   * `.trim()`.
   */
  protected readonly anotacoes = computed(() => (this.dados().anotacoes ?? '').trim());

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
    if (texto !== (this.dados().anotacoes ?? '')) {
      this.ajusteAnotacoes.emit(texto);
    }
  }

  /**
   * `historia` (m3-50) é opcional — ausente para um visualizador (omitida no backend) e em fichas
   * sem texto definido; `??` cobre os dois casos antes do `.trim()`.
   */
  protected readonly historia = computed(() => (this.dados().historia ?? '').trim());

  /** `true` enquanto a aba própria História (m3-50) está em edição (textarea aberta). */
  protected readonly editandoHistoria = signal(false);

  /** Abre a edição da História — só chega aqui quando `ajustavel()` (o botão/painel são gated). */
  protected editarHistoria(): void {
    this.editandoHistoria.set(true);
  }

  /** Cancela a edição da História sem alterar. */
  protected cancelarHistoria(): void {
    this.editandoHistoria.set(false);
  }

  /** Confirma o texto digitado (blur/Ctrl+Enter): emite se mudou. Sem trim — espaço é do usuário. */
  protected confirmarHistoria(texto: string): void {
    if (!this.editandoHistoria()) {
      return;
    }
    this.editandoHistoria.set(false);
    if (texto !== (this.dados().historia ?? '')) {
      this.ajusteHistoria.emit(texto);
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
   * Vida/Energia máximas **efetivas** = base (`vidaMaxima`/`energiaMaxima`, stored/editável) + o
   * ajuste ao vivo dos amplificadores `Vida`/`Energia` (`shared/regras/agente/amplificador`), que
   * escala com o Nível. Só para **leitura** (badge fechado + barra) — a edição continua na base, mesma
   * razão de `informacoesExtras` (evitar commitar o delta de volta como override manual).
   */
  protected readonly vidaMaximaEfetiva = computed(
    () => this.vidaMaxima() + ajusteVidaAmplificadores(this.dados().inventario.amplificadores, this.dados().nivel),
  );
  protected readonly energiaMaximaEfetiva = computed(
    () =>
      this.energiaMaxima() +
      ajusteEnergiaAmplificadores(this.dados().inventario.amplificadores, this.dados().nivel),
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
    montarInformacoesExtras(
      this.entrada(),
      this.dados().habilidades,
      this.dados().derivados,
      this.dados().inventario.amplificadores,
      this.dados().inventario.itens,
    ),
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

  /** Derivados do card **Status** (redesenho de comparação visual, "por enquanto só essa" aba). */
  private readonly CHAVES_STATUS_RAPIDO: readonly ChaveInfoExtra[] = [
    'deslocamento',
    'habilidadesPorTurno',
    'percepcao',
    'danoFurtivo',
    'danoCorpoACorpo',
  ];

  /**
   * Glance de Deslocamento/Hab. por Turno/Percepção/Dano Furtivo/Dano C. a C. no card de Status —
   * mesmas linhas editáveis de `Informações Extras` (m3-10), só reorganizadas; nenhum cálculo novo.
   * Dano C. a C. por último de propósito (grade `--seis` no HTML/SCSS: 5 colunas `max-content` +
   * 1 `1fr` no fim) — é o box mais longo da fileira (ex. "2D6 [Físico]"), então fica melhor com o
   * espaço que sobra depois dos curtos, em vez de repartir tudo em partes iguais. O 6º box da
   * fileira é o de Iniciativa (`presetIniciativa`/`dadosIniciativa` acima), montado à parte logo
   * depois do `@for` no HTML porque não é um derivado de `FichaDerivadosDto` — é um preset de
   * rolagem.
   */
  protected readonly statusRapido = computed<readonly InfoExtra[]>(() => {
    const mapa = new Map(this.informacoesExtras().map((info) => [info.chave, info] as const));
    return this.CHAVES_STATUS_RAPIDO.map((chave) => mapa.get(chave)!);
  });

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

  /**
   * Repassa o Inventário máximo editado na linha "Inventário" do `app-ficha-inventario` (edição no
   * próprio lugar, dentro do componente) pro mesmo pipeline de persistência dos demais derivados.
   */
  protected ajustarInventarioMaximo(valor: number): void {
    this.ajusteDerivado.emit({ chave: 'inventarioMaximo', valor });
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
    () => this.ajustavelAmplo() && (this.ehMestre() || !this.personalidadeDefinida()),
  );
  /**
   * `true` quando a classe é uma subclasse de Experimento com a habilidade "Peculiaridade" tomada
   * (m3-41 — `sistema-v4.1.0.md` "⬡ Subclasse": ela "substitui os bônus originais de Origem"). Nesse
   * caso a Origem trava para **todo mundo**, inclusive o mestre — não é a trava de posse/edição
   * (`origemEditavel`), é a Origem deixar de existir para aquele agente (o backend é o árbitro final,
   * `validarFormaIdentidade`).
   */
  protected readonly origemBloqueadaPorPeculiaridade = computed(() =>
    experimentoComPeculiaridade(this.dados().classe, this.dados().habilidades),
  );
  /**
   * `true` quando o agente (Experimento Artificial) tem a habilidade "Anomalia" (`P-013`) — repassado
   * a `app-ficha-inventario`, que dobra por ela o custo em Energia de Fragmentos e os valores de
   * efeito dos cardápios do Potencializador.
   */
  protected readonly possuiAnomalia = computed(() =>
    experimentoComAnomalia(this.dados().classe, this.dados().habilidades),
  );
  protected readonly origemEditavel = computed(
    () =>
      this.ajustavelAmplo() &&
      !this.origemBloqueadaPorPeculiaridade() &&
      (this.ehMestre() || !this.origemDefinida()),
  );

  /**
   * Lista de habilidades pendente de confirmação — só fica não-`null` quando o **mestre** acabou de
   * adicionar "Peculiaridade" a um Experimento que já tem Origem definida (`origemBloqueadaPorPeculiaridade`
   * ainda `false` antes desta mudança). `null` = nenhuma oferta em aberto.
   */
  protected readonly habilidadesPendentesPeculiaridade = signal<readonly FichaHabilidadeDto[] | null>(null);

  /**
   * Intercepta toda mudança de habilidades vinda de `FichaHabilidades` (`habilidadesMudou`). Só quando
   * a mudança **introduz** a Peculiaridade (não estava lá antes) numa ficha de Experimento que **já tem**
   * Origem definida e quem edita é o **mestre**, a mudança fica pendente de confirmação — a Origem seria
   * apagada no mesmo salvamento (`confirmarLimparOrigemEHabilidade`). Em qualquer outro caso, passa direto.
   */
  protected mudarHabilidades(novasHabilidades: readonly FichaHabilidadeDto[]): void {
    const tinhaPeculiaridade = this.origemBloqueadaPorPeculiaridade();
    const teraPeculiaridade = experimentoComPeculiaridade(this.dados().classe, novasHabilidades);
    if (!tinhaPeculiaridade && teraPeculiaridade && this.ehMestre() && this.origemAtual() !== null) {
      this.habilidadesPendentesPeculiaridade.set(novasHabilidades);
      return;
    }
    this.ajusteHabilidades.emit(novasHabilidades);
  }

  /** Confirma a oferta — emite a mudança de habilidades e a limpeza de Origem no mesmo gesto (mesmo salvamento, debounced juntos em `FichaEdicaoService`). */
  protected confirmarLimparOrigemEHabilidade(): void {
    const pendente = this.habilidadesPendentesPeculiaridade();
    this.habilidadesPendentesPeculiaridade.set(null);
    if (!pendente) {
      return;
    }
    this.ajusteHabilidades.emit(pendente);
    this.origemLimpa.emit();
  }

  /** Cancela a oferta — descarta a mudança de habilidade pendente, nada é emitido. */
  protected cancelarLimparOrigem(): void {
    this.habilidadesPendentesPeculiaridade.set(null);
  }

  /**
   * Contrato (m3-40) — texto livre no cabeçalho da Identidade, editável **só pelo mestre**
   * (diferente de Personalidade/Origem, não há liberação para o dono nem antes da 1ª definição).
   * O backend é o árbitro final (`validarContratoSomenteMestre`, `alterarFicha`).
   */
  protected readonly contratoEditavel = computed(() => this.ajustavelAmplo() && this.ehMestre());
  /** Texto de exibição do Contrato — "CONTRATO — 0000" quando ainda não definido (placeholder). */
  protected readonly contratoTexto = computed(() => `CONTRATO — ${this.dados().contrato || '0000'}`);

  protected readonly gruposFormacao = GRUPOS_FORMACAO;
  protected readonly rotuloParametroFormacao = rotuloParametroFormacao;
  protected readonly parametroEsquivaOuBloqueio = FormacaoParametroEnum.ESQUIVA_OU_BLOQUEIO;
  /** As 16 linhas de Formação sem campo onde aterrissar ainda (m3-23) — "selo" de registro (m3-25). */
  protected readonly efeitosFormacaoPendentes = listarEfeitosPendentes(FORMACOES);

  /** Editor de Origem aberto (mini-editor: 3 textos + Especialidade + 2 linhas de Formação). */
  protected readonly editandoOrigem = signal(false);
  protected readonly rascunhoOrigem = signal<FichaOrigemDto | null>(null);

  /**
   * `true` quando o rascunho de Origem tem todos os campos obrigatórios preenchidos (espelha
   * `FichaService.validarFormaOrigem` no backend — o backend continua o árbitro final, isto só
   * evita a viagem de rede com um rascunho que ele vai rejeitar): os três textos livres
   * (Nome/Descrição/Saber de Campo), o gatilho e o efeito da Especialidade, o texto de cada linha
   * de Formação e o parâmetro quando a definição escolhida o exige.
   */
  protected readonly origemRascunhoValida = computed(() => {
    const rascunho = this.rascunhoOrigem();
    if (!rascunho) {
      return false;
    }
    if (!rascunho.nome.trim() || !rascunho.descricao.trim() || !rascunho.saberDeCampo.trim()) {
      return false;
    }
    if (!rascunho.especialidade.gatilho.trim() || !rascunho.especialidade.efeito.trim()) {
      return false;
    }
    return rascunho.formacao.every((linha) => {
      if (!linha.texto.trim()) {
        return false;
      }
      const definicao = linha.bonus ? FORMACOES[linha.bonus] : null;
      return !definicao || definicao.parametro === null || !!linha.parametro?.trim();
    });
  });

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
      especialidade: { gatilho: '', efeito: '' },
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
    if (!rascunho || !this.origemRascunhoValida()) {
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
    this.rascunhoOrigem.set({ ...atual, especialidade: { ...atual.especialidade, efeito: valor } });
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

  /** Abre a digitação de um campo de identidade (Agente/Nível/Prestígio/Personalidade/Contrato). */
  protected editarIdentidade(campo: 'nome' | 'personalidade' | 'contrato' | CampoDadosEscalar): void {
    this.editandoIdentidade.set(campo);
  }

  /** Cancela a digitação de identidade (Escape). */
  protected cancelarIdentidade(): void {
    this.editandoIdentidade.set(null);
  }

  /**
   * Confirma o campo de identidade digitado. Agente/Codinome (relacional) sai por `ajusteNome`;
   * Nível/Prestígio (documento) por `ajusteCampoDados`; Personalidade (m3-25) por
   * `ajustePersonalidade`; Contrato (m3-40) por `ajusteContrato`. **Nível** é clampado aos bounds
   * da classe (0–20 Agente / 0–5 Civil, `shared/regras/agente/limites` — mesma fonte que já
   * normaliza os cálculos, "Progressão"/"Jogando como um Civil" no documento); Prestígio segue sem
   * trava de faixa (liberdade total — m3-10). Personalidade/Contrato têm sua própria trava de
   * imutabilidade, arbitrada pelo backend (m3-24/m3-40) — o front só esconde o lápis. O guard evita
   * o commit duplo do blur após o Enter.
   */
  protected confirmarIdentidade(campo: 'nome' | 'personalidade' | 'contrato' | CampoDadosEscalar, texto: string): void {
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
    if (campo === 'contrato') {
      const aparado = texto.trim();
      if (aparado && aparado !== (this.dados().contrato ?? '')) {
        this.ajusteContrato.emit(aparado);
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
    this.rascunhoDadosTeste.set(this.dadosTesteCompletos());
    this.editandoAtributos.set(true);
  }

  /** Cancela a edição dos atributos, descartando o rascunho. */
  protected cancelarAtributos(): void {
    this.editandoAtributos.set(false);
    this.rascunhoAtributos.set(null);
    this.rascunhoModificadoresTeste.set(null);
    this.rascunhoDadosTeste.set(null);
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
    const dadosTeste = this.rascunhoDadosTeste();
    if (!atributos || !modificadoresTeste || !dadosTeste) {
      return;
    }
    this.editandoAtributos.set(false);
    this.rascunhoAtributos.set(null);
    this.rascunhoModificadoresTeste.set(null);
    this.rascunhoDadosTeste.set(null);
    this.ajusteAtributos.emit({ atributos, maestria: this.rascunhoMaestria(), modificadoresTeste, dadosTeste });
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

  /** Linhas de Formação da Origem atual — `[]` sem Origem definida. Base dos consumidores de m3-41. */
  private readonly formacaoOrigem = computed(() => this.origemAtual()?.formacao ?? []);

  /**
   * Resistências a dano da aba Combate (m3-36; editável + amplificadores em ajuste posterior;
   * bônus de Formação em m3-41) — **sempre as cinco linhas** de `TipoDanoEnum`. Cada uma soma uma
   * base **manual editável** (`derivados.resistencias`, stored/editável — mesmo modelo de m3-10)
   * com o que vem do **equipamento** (itens equipados + Fragmento aplicado + amplificadores
   * `Resistente`/`Defesa`) e o bônus de **Formação da Origem** (`COMBATE_RESISTENCIA_TIPO_DANO`),
   * via `shared/regras/agente/montarResistencias` — zero motor duplicado aqui.
   */
  protected readonly resistencias = computed(() =>
    montarResistencias({
      itens: this.dados().inventario.itens,
      amplificadores: this.dados().inventario.amplificadores,
      manual: this.dados().derivados?.resistencias,
      formacao: obterResistenciaFormacao(this.formacaoOrigem()),
    }),
  );

  /**
   * Tolerância extra de Sobrecarga vinda da Formação da Origem (m3-41: `LOGISTICA_SOBRECARGA`) —
   * repassada ao `app-ficha-inventario` para deslocar o limiar de "Sobrecarregado".
   */
  protected readonly toleranciaSobrecargaFormacao = computed(() =>
    obterToleranciaSobrecargaFormacao(this.formacaoOrigem()),
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

  /**
   * Linha de Contra-ataque — Defesa Final calculada por `calcularContraAtaque` (Defesa Base +
   * bônus de Luta/Vigor conforme a variante da habilidade, mesmo padrão de Esquiva/Bloqueio);
   * editável no próprio lugar como override manual (m3-10), igual Defesa/Esquiva/Bloqueio.
   */
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
    () =>
      this.dados().derivados?.inventarioMaximo ??
      calcularInventario({ ...this.entrada(), habilidades: this.dados().habilidades }),
  );

  // === Extras (m3-49): Origem/Personalidade/afinidade de fragmentos, aba "Extras" do Status ===

  /** Habilidade de Personalidade (m3-25) — a que carrega `categoria: PERSONALIDADE`, se existir. */
  protected readonly habilidadePersonalidade = computed(
    () =>
      this.dados().habilidades.find(
        (habilidade) => habilidade.categoria === HabilidadeCategoriaEnum.PERSONALIDADE,
      ) ?? null,
  );

  /**
   * Módulos de todos os fragmentos portados pelo agente — `shared/regras/compras/fragmento`
   * (`listarModulosFragmentosPortados`, m3-42/m3-49): mesma função consumida por `FichaInventario`
   * pra aplicar a redução de custo por Afinidade (proibição #26 — uma fonte só pra "o que conta
   * como portado"). Inclui também os módulos já **consumidos** (`P-015`) — continuam contando pra
   * Afinidade mesmo depois de saírem do inventário.
   */
  protected readonly modulosFragmentosPortados = computed<readonly FragmentoModuloEnum[]>(() =>
    listarModulosFragmentosPortados(
      this.dados().inventario.itens,
      this.fragmentosConsumidos().map((registro) => registro.modulo),
    ),
  );

  /**
   * Módulos portados agrupados (m3-66) — quantidade e Afinidade individual de cada grupo, pra o
   * chip mostrar "2× Módulo V" em vez de duas entradas idênticas "Módulo V". Ordem de primeira
   * ocorrência em `modulosFragmentosPortados()` (soltos antes de acoplados, na ordem do inventário).
   */
  protected readonly gruposFragmentosPortados = computed<readonly GrupoFragmentoPortado[]>(() => {
    const ordem: FragmentoModuloEnum[] = [];
    const contagem = new Map<FragmentoModuloEnum, number>();
    for (const modulo of this.modulosFragmentosPortados()) {
      if (!contagem.has(modulo)) {
        ordem.push(modulo);
      }
      contagem.set(modulo, (contagem.get(modulo) ?? 0) + 1);
    }
    return ordem.map((modulo) => {
      const quantidade = contagem.get(modulo)!;
      return { modulo, quantidade, afinidade: valorAfinidadeFragmento(modulo) * quantidade };
    });
  });

  /** Afinidade total de Fragmentos do agente (`shared/regras/compras/fragmento`, m3-42 — função pura). */
  protected readonly afinidadeFragmentos = computed(() =>
    calcularAfinidade(this.modulosFragmentosPortados()),
  );

  /** Redução de custo de Energia de fragmento por excesso de Afinidade acima de 10 (m3-42) — legenda. */
  protected readonly reducaoAfinidade = computed(() =>
    reducaoCustoPorAfinidade(this.afinidadeFragmentos()),
  );

  // === Limite mínimo de Energia / Anomalia Biológica (m3-67) ===

  /** Limite mínimo de Energia Máxima pro Vigor/Destreza do agente (doc — "⬦ Limite mínimo de Energia"). */
  protected readonly limiteMinimoEnergia = computed(() =>
    limiteMinimoEnergiaMaximaFragmentos(this.dados().atributos),
  );

  /**
   * Estado derivado "Anomalia Biológica" (doc, m3-67): `true` quando a Energia Máxima **atual**
   * (`energiaMaxima()` — já reduzida pelos fragmentos portados) está abaixo do limite mínimo. 100%
   * derivado, sem campo persistido de "decisão do jogador" — mesma filosofia de `m3-10`.
   */
  protected readonly anomaliaBiologica = computed(() =>
    emAnomaliaBiologica(this.energiaMaxima(), this.limiteMinimoEnergia()),
  );

  /** Penalidades fixas do doc — texto informativo, nunca aplicado ao motor de rolagem/`calcularDefesa`. */
  protected readonly penalidadeTestesAnomalia = PENALIDADE_TESTES_ANOMALIA_BIOLOGICA;
  protected readonly penalidadeDefesaAnomalia = PENALIDADE_DEFESA_ANOMALIA_BIOLOGICA;

  /** Teto de Vida atual em Anomalia Biológica — "trava em X de Y" (doc: 10% da Vida Máxima). */
  protected readonly tetoVidaAnomalia = computed(() => tetoVidaAnomaliaBiologica(this.vidaMaxima()));

  /** `true` com a confirmação inline do atalho de registro do trauma "Limiar da Humanidade" aberta. */
  protected readonly confirmandoTraumaLimiar = signal(false);

  protected readonly nomeTraumaLimiar = TRAUMA_LIMIAR_HUMANIDADE_NOME;
  protected readonly descricaoTraumaLimiar = TRAUMA_LIMIAR_HUMANIDADE_DESCRICAO;

  /**
   * Abre a confirmação inline do atalho (mesmo padrão de `pedirRemocaoFragmentoConsumido`) — nunca
   * registra o trauma sozinho: o doc condiciona "Limiar da Humanidade" a "passar uma cena" em
   * Anomalia Biológica, julgamento do Mestre, então o atalho só pré-preenche pro jogador/mestre
   * confirmar.
   */
  protected abrirAtalhoTraumaLimiar(): void {
    this.confirmandoTraumaLimiar.set(true);
  }

  /** Fecha a confirmação sem registrar nada. */
  protected cancelarAtalhoTraumaLimiar(): void {
    this.confirmandoTraumaLimiar.set(false);
  }

  /**
   * Confirma o atalho: registra o trauma "Limiar da Humanidade" pré-preenchido (nome + descrição do
   * doc, `tratado: false`) no topo de `estado.traumas`, reusando o mesmo canal `ajusteSanidade`
   * (m3-12) que a aba Sanidade usa pra qualquer edição — mesmo trio persistido, sem caminho paralelo.
   */
  protected confirmarAtalhoTraumaLimiar(): void {
    this.confirmandoTraumaLimiar.set(false);
    const estado = this.estado();
    this.ajusteSanidade.emit({
      sequelas: estado.sequelas,
      traumas: [
        { nome: this.nomeTraumaLimiar, descricao: this.descricaoTraumaLimiar, tratado: false },
        ...estado.traumas,
      ],
      lesoes: estado.lesoes,
    });
  }
}
