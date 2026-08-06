import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Dialog } from 'primeng/dialog';

import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  ModificacaoEfeitoTipoEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaFragmentoConsumidoDto,
  FichaInventarioDto,
  FichaSequelaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ajusteInventarioAmplificadores,
  emAnomaliaBiologica,
  limiteMinimoEnergiaMaximaFragmentos,
} from '@contratados-rpg/shared/regras/agente';
import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';
import {
  AMPLIFICADORES,
  alterarContagemMunicao,
  AmplificadorAplicadoDto,
  aplicarReducaoAfinidade,
  bonusMunicaoConstrutor,
  calcularAfinidade,
  calcularCustoAmplificador,
  calcularResumoCompras,
  calcularStatItem,
  criarContagemMunicao,
  CarrinhoItemDto,
  CATALOGO_CATEGORIAS,
  CATALOGO_ITENS,
  contarComprasModificacao,
  custoAcoplarFragmento,
  custoAquisicaoFragmento,
  custoRemoverFragmento,
  custoSanidadeConsumirFragmento,
  descreverEfeitosModificacao,
  existeFragmentoNaMesmaFuncao,
  formaFixaConstrutor,
  ItemCatalogo,
  listarBonusConsumoFragmentoPotencializador,
  listarBonusFragmentoPotencializador,
  listarEfeitosFixosConstrutor,
  listarModificacoesCategoria,
  listarModificacoesDisponiveis,
  listarModulosFragmentosPortados,
  listarSubInventarios,
  maiorDadoItem,
  ModificacaoDados,
  ModificacaoEfeitoDto,
  obterCategoriaEmprestada,
  obterCustoModificacao,
  obterLimiteModificacoes,
  obterPesoModificacao,
  OpcaoBonusConsumoFragmentoDto,
  OpcaoBonusFragmentoDto,
  PENALIDADE_VONTADE_POR_EMPILHAMENTO,
  PrecoSanidadeConsumoDto,
  resolverDadosItem,
  SEQUELA_CONSUMO_FRAGMENTO,
  StatItemDto,
  valorAfinidadeFragmento,
  verificarConflitoModificacao,
} from '@contratados-rpg/shared/regras/compras';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { Icone, IconeNome } from '../../../../shared/icone/icone.component';
import { OverflowFade } from '../../../../shared/overflow-fade/overflow-fade.directive';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { EFEITO_TIPOS, EfeitoTipoMeta, metaEfeitoTipo } from '../../../../shared/inventario/efeito-modificacao.ui';
import type { RolagemRealizadaDto } from '../../rolagem-realizada';
import { rotuloItem } from '../../rotulos-ficha';

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
  [ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR]: 'fragmento-construtor',
  [ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR]: 'fragmento-potencializador',
};

/** Categorias com item comprável separadamente empilhável (várias unidades do mesmo item). */
const CATEGORIAS_EMPILHAVEIS: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.OPERACIONAL,
  ItemCategoriaEnum.MEDICINAL,
];

/**
 * Ordem de exibição da lista principal do inventário: armas (corpo a corpo/fogo/explosivos/
 * exóticos) → munições → proteções → armazenamento. Medicinal/Operacional (`CATEGORIAS_EMPILHAVEIS`)
 * saem dessa lista — vão pra grade dupla logo abaixo, ordenados por nome; Fragmentos
 * (`CATEGORIAS_FRAGMENTO`) ganham seção própria mais abaixo ainda (m3-44 — item 19, mesmo padrão
 * da lista de Amplificadores).
 */
const ORDEM_CATEGORIAS_LISTA: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.CORPO_A_CORPO,
  ItemCategoriaEnum.ARMAS_DE_FOGO,
  ItemCategoriaEnum.EXPLOSIVOS,
  ItemCategoriaEnum.EXOTICOS,
  ItemCategoriaEnum.MUNICOES,
  ItemCategoriaEnum.PROTECOES,
  ItemCategoriaEnum.ARMAZENAMENTO,
];

/**
 * Categorias que **não aceitam modificação** alguma (nem do catálogo, nem custom): consumíveis e o
 * Fragmento Potencializador — o doc só concede "receber modificações como a arma base" ao
 * Construtor (doc — "⬦ Construtor"); o Potencializador só melhora OUTRO item/ser (via "Aplicar
 * em..."/`fragmentoPotencializador`) ou é consumido, nunca recebe modificação nele mesmo.
 */
const CATEGORIAS_NAO_MODIFICAVEIS: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.OPERACIONAL,
  ItemCategoriaEnum.MEDICINAL,
  ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
];

/** Categorias que possuem **dano** (o form custom mostra Dano + Informação). */
const CATEGORIAS_COM_DANO: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.CORPO_A_CORPO,
  ItemCategoriaEnum.EXPLOSIVOS,
  ItemCategoriaEnum.ARMAS_DE_FOGO,
  ItemCategoriaEnum.EXOTICOS,
  ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
];

/** Categorias que possuem **resistência** (o form custom mostra Resistência). */
const CATEGORIAS_COM_RESISTENCIA: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.PROTECOES,
  ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
];

/** Categorias que declaram "encaixa em" (categoria emprestada): exótico e fragmento construtor. */
const CATEGORIAS_COM_EMPRESTIMO: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.EXOTICOS,
  ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
];

/** Categorias de Fragmento (o form custom mostra o Módulo). */
const CATEGORIAS_FRAGMENTO: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
  ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
];

/** Categorias oferecidas no seletor "encaixa em" (as que têm modificações de arma/proteção). */
const CATEGORIAS_EMPRESTAVEIS: readonly ItemCategoriaEnum[] = [
  ItemCategoriaEnum.CORPO_A_CORPO,
  ItemCategoriaEnum.EXPLOSIVOS,
  ItemCategoriaEnum.ARMAS_DE_FOGO,
  ItemCategoriaEnum.MUNICOES,
  ItemCategoriaEnum.PROTECOES,
];

/** Módulos de fragmento (I–V), na ordem do sistema (I é o mais forte). */
const MODULOS_FRAGMENTO: readonly FragmentoModuloEnum[] = [
  FragmentoModuloEnum.I,
  FragmentoModuloEnum.II,
  FragmentoModuloEnum.III,
  FragmentoModuloEnum.IV,
  FragmentoModuloEnum.V,
];

/** `FragmentoTipoEnum` correspondente à categoria de item — `null` fora das duas categorias de Fragmento. */
function tipoFragmentoDaCategoria(categoria: ItemCategoriaEnum): FragmentoTipoEnum | null {
  if (categoria === ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR) {
    return FragmentoTipoEnum.POTENCIALIZADOR;
  }
  if (categoria === ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR) {
    return FragmentoTipoEnum.CONSTRUTOR;
  }
  return null;
}

/**
 * Afinidade de Fragmentos (doc — "⬥ Afinidade com Fragmentos"; m3-42/m3-49) a considerar na
 * redução de custo de uma ação com fragmento — **retroativa**, por pedido do autor: usa sempre a
 * Afinidade **atual** (nunca a "de quando o fragmento foi comprado"), então o desconto de um
 * fragmento antigo sobe/desce junto com a Afinidade total de hoje. `itens` é o inventário **antes**
 * da ação (aquisição/remoção/acoplamento/desacoplamento/consumo mudam a lista depois); `moduloExtra`
 * só é necessário na **aquisição**, onde o fragmento ainda não existe em `itens` no momento do
 * débito — nas demais ações o fragmento em questão já está portado (solto ou acoplado) e por isso
 * já vem contado em `itens` sem precisar somar de novo.
 */
function afinidadeConsiderando(
  itens: readonly CarrinhoItemDto[],
  moduloExtra?: FragmentoModuloEnum,
): number {
  const modulos = listarModulosFragmentosPortados(itens);
  return calcularAfinidade(moduloExtra ? [...modulos, moduloExtra] : modulos);
}

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

/**
 * Cartão de um módulo (I–V) na grade de Fragmentos do catálogo — atalho pra montar o item custom.
 * Custo `*Reduzido` já aplica a Afinidade atual do agente (m3-66) — igual ao `*` bruto quando a
 * Afinidade não reduz nada (o template só mostra o bruto riscado quando os dois divergem).
 */
interface CartaoModuloFragmentoVM {
  readonly modulo: FragmentoModuloEnum;
  readonly afinidade: number;
  readonly custoPotencializador: number;
  readonly custoConstrutor: number;
  readonly custoPotencializadorReduzido: number;
  readonly custoConstrutorReduzido: number;
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
  /** `true` quando esta mod está além do limite da patente (permitida, mas marcada). */
  readonly excedente: boolean;
  /** Marcada para não contar no limite total de empilhamentos da arma. */
  readonly ignoraTotal: boolean;
  /** Marcada para poder passar do próprio teto de empilhamentos. */
  readonly ignoraProprio: boolean;
  /** Efeito da mod custom (texto livre), ou `null` para mods do catálogo. */
  readonly descricao: string | null;
  /** `true` quando esta mod veio de um Fragmento aplicado (m3-35) — mostra o badge/ícone de origem. */
  readonly deFragmento: boolean;
  /**
   * `true` só pro bônus fixo automático de um Fragmento Construtor (`m3-65`) — não é uma modificação
   * comprada, não tem stack pra ajustar: some junto do item, nunca sozinha. Esconde o stepper −/+ e
   * os toggles "não conta" (que já vêm forçados `true` na criação — soltá-los quebraria a garantia
   * "fora do limite de mods da patente" do doc).
   */
  readonly fixa: boolean;
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
  /** `true` quando adicionar/empilhar esta mod passaria do limite da patente (permitido, marcado). */
  readonly excedente: boolean;
}

/** Uma seção do painel de modificações (própria da categoria ou emprestada via "Faz Parte"/"Combativo"). */
interface SecaoModVM {
  readonly titulo: string | null;
  readonly entradas: readonly EntradaModVM[];
}

/** Novo valor de Energia atual/máxima após um custo de fragmento (m3-35) — a página persiste. */
export interface CustoEnergiaFragmento {
  readonly energiaAtual: number;
  readonly energiaMaxima: number;
}

/**
 * Bônus "Consumido" escolhido no painel "Consumir" de um fragmento Potencializador (m3-64) —
 * `atributoEscolhido` só é relevante (e exigido antes de confirmar) quando `opcao.tipo === 'TESTE'`.
 * A página aplica o efeito ao agente via `aplicarBonusConsumoFragmento`
 * (`shared/regras/agente/fragmento-consumo`) — este componente só sabe o que foi escolhido, não onde
 * o bônus aterrissa na ficha.
 */
export interface BonusConsumoFragmentoEscolhidoDto {
  readonly opcao: OpcaoBonusConsumoFragmentoDto;
  readonly atributoEscolhido: keyof FichaAtributosDto | null;
}

/** Rótulo por extenso de cada atributo — opções do `<select>` "Atributo" do painel "Consumir". */
const ROTULOS_ATRIBUTO: Readonly<Record<keyof FichaAtributosDto, string>> = {
  destreza: 'Destreza',
  forca: 'Força',
  luta: 'Luta',
  pontaria: 'Pontaria',
  vigor: 'Vigor',
  intelecto: 'Intelecto',
  medicina: 'Medicina',
  sentidos: 'Sentidos',
  social: 'Social',
  vontade: 'Vontade',
};

/**
 * Filtro de visualização da lista do Inventário — controle segmentado de 3 opções (revisão de UX
 * do filtro "ver só amplificadores"/"ver só fragmentos"). `'equipamentos'` é o padrão (mostra tudo).
 */
export type FiltroInventario = 'equipamentos' | 'amplificadores' | 'fragmentos';

/** Item do inventário renderizado (view-model). O `indice` referencia a posição na lista real. */
interface ItemInventarioVM {
  readonly indice: number;
  readonly nome: string;
  /** Apelido do jogador para esta instância (m3-33), ou `null` quando não tem. */
  readonly apelido: string | null;
  /** `apelido ?? nome` — o que o card exibe em destaque. */
  readonly nomeExibido: string;
  /** "Mod. <módulo>" pra fragmento sem apelido (o nome vira a categoria — "Fragmento X" — e o
   *  módulo some pro rodapé do card), ou `null` fora de Fragmento. */
  readonly fragmentoModuloTexto: string | null;
  /** `false` para categorias empilháveis (munição, medicinal, operacional) — pilha, não instância. */
  readonly podeApelidar: boolean;
  /** `true` para fragmento Potencializador — mostra a ação "Aplicar em..." (m3-35). */
  readonly fragmentoPotencializador: boolean;
  /** `true` para fragmento Construtor na forma Munição — mostra a ação "Recarregar" (m3-65). */
  readonly fragmentoConstrutorMunicao: boolean;
  /** `true` quando a Munição Construtor está recarregada nesta cena (m3-65). `false` fora dela. */
  readonly recarregada: boolean;
  /** Texto do bônus "Recarregar" (custo de Energia + dano concedido), ou `null` fora da Munição Construtor (m3-65). */
  readonly bonusMunicaoTexto: string | null;
  readonly contagemMunicao: CarrinhoItemDto['contagemMunicao'] | null;
  readonly municaoVazia: boolean;
  readonly categoria: ItemCategoriaEnum;
  readonly categoriaRotulo: string;
  readonly quantidade: number;
  readonly custoTotalTexto: string;
  readonly pesoTexto: string;
  readonly stat: string | null;
  /** Fórmula de dano tipada (`calcularStatItem`, m3-18) pronta para `rolarFormula` — `null` fora de `CATEGORIAS_COM_DANO` ou sem stat computável (m3-45). */
  readonly danoFormula: string | null;
  /** Descrição do item custom (texto livre), ou `null` para itens do catálogo. */
  readonly descricao: string | null;
  /** `false` para consumíveis (Operacional/Medicinal): sem "Modificar" (nem custom). */
  readonly modificavel: boolean;
  readonly ehArmazenamento: boolean;
  readonly guardada: boolean;
  /** `true` para categoria Proteções (m3-36) — mostra o toggle "Equipado" (só ela soma resistência). */
  readonly ehProtecao: boolean;
  readonly equipado: boolean;
  readonly modsUsados: number;
  readonly maxModificacoes: number;
  /** `true` quando o total de empilhamentos passou do limite da patente (contador vira aviso). */
  readonly excedeModsLimite: boolean;
  readonly temMods: boolean;
  readonly painelAberto: boolean;
  readonly modsAtivas: readonly ModAtivaVM[];
  readonly secoes: readonly SecaoModVM[];
  /** `id` do container (m3-44) onde este item vive, ou `null` = inventário principal. */
  readonly containerId: string | null;
}

/**
 * Um destino do seletor "Mover para" (m3-44): um container próprio (Pochete/Bolso de Corpo)
 * vestido no inventário, com vagas livres calculadas pelo motor (`listarSubInventarios`).
 */
interface ContainerDestinoVM {
  readonly containerId: string;
  readonly rotulo: string;
}

/** Um sub-inventário próprio (Pochete/Bolso de Corpo, m3-44) renderizado como lista distinta. */
interface SubInventarioVM {
  readonly containerId: string;
  readonly nomeContainer: string;
  readonly capacidade: number;
  readonly pesoTexto: string;
  /** `true` quando o peso dos itens dentro passa da capacidade do container — aviso, não trava. */
  readonly excede: boolean;
  /** Rótulo das categorias aceitas (Pochete), ou `null` quando o container aceita qualquer uma (Bolso de Corpo). */
  readonly categoriasRotulo: string | null;
  readonly itens: readonly ItemInventarioVM[];
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
  imports: [ReactiveFormsModule, Icone, OverflowFade, Tooltip, Dialog, NgTemplateOutlet],
  templateUrl: './ficha-inventario.component.html',
  styleUrl: './ficha-inventario.component.scss',
})
export class FichaInventario {
  /** Inventário atual (itens + amplificadores) — a fonte da verdade é a página (componente controlado). */
  readonly inventario = input.required<FichaInventarioDto>();
  /** Dono/mestre edita; para os demais é só leitura (a página liga por `podeGerenciar`). */
  readonly editavel = input(false);
  /**
   * `true` quando o autor pode **rolar dados** (m3-51) — gate do botão de rolar dano da arma
   * (`rolarDanoItem`), distinto de `editavel` (rolar não é uma ação de edição do inventário).
   */
  readonly podeRolar = input(false);
  /**
   * `'inline'` (padrão, aba Inventário completa): catálogo, item/mod custom e aplicar Fragmento abrem
   * dentro da própria lista, como sempre foi. `'dialog'`: a lista de itens fica compacta e essas quatro
   * superfícies (catálogo+amplificadores, item custom, painel "Modificar" e "Aplicar em...") abrem cada
   * uma num `p-dialog` — pro card de Status (redesenho de comparação visual), cuja coluna não tem espaço
   * pra tudo isso inline sem quebrar. Mesmo estado/lógica dos dois modos; só a moldura muda (mesmo padrão
   * de `FichaSanidade.apresentacao`).
   */
  readonly apresentacao = input<'inline' | 'dialog'>('inline');
  /**
   * `true` no card compacto (m2-20 — `app-ficha-visualizacao[modo="compacto"]`): a toolbar
   * (Adicionar itens/Item custom/filtro) fica resumida (só ícone, sem Esvaziar/Custos) e a lista
   * ganha um teto mais baixo — ver SCSS. Independente de `apresentacao`: esta aqui é sempre
   * `'dialog'` na visualização (padrão/embutido/compacto usam o mesmo `p-dialog` pro catálogo),
   * então não dá pra reaproveitá-la pra diferenciar só o card compacto dos outros dois modos.
   */
  readonly compacto = input(false);
  /** Prestígio da ficha — determina a patente e, por ela, os limites de modificação (via `shared/regras`). */
  readonly prestigio = input.required<number>();
  /** Inventário máximo (`Força × 5`, stored/derivado) — referência do peso usado; exceder é aviso, não trava. */
  readonly inventarioMaximo = input.required<number>();
  /**
   * Tolerância extra de Sobrecarga vinda da Formação da Origem (m3-41: `LOGISTICA_SOBRECARGA`,
   * "+3 de tolerância de Sobrecarga") — desloca só o **limiar** de "Sobrecarregado"
   * (`pesoUsado > inventarioEfetivo + tolerância`), sem mudar o Inventário efetivo exibido (esse é
   * o alvo `DERIVADO`/`LOGISTICA_INVENTARIO_MAXIMO`, já embutido em `inventarioMaximo`). Padrão 0.
   */
  readonly toleranciaSobrecarga = input(0);
  /** Vontade da ficha — determina o limite de empilhamentos de amplificador (Vontade × 3, via `shared/regras`). */
  readonly vontade = input.required<number>();
  /** Dinheiro atual da ficha (m3-34) — referência pro "dinheiro restante" do resumo; não trava. */
  readonly dinheiro = input.required<number>();
  /** Energia atual/máxima da ficha — só para o custo de Fragmentos (m3-35; adquirir/acoplar/remover). */
  readonly energiaAtual = input.required<number>();
  readonly energiaMaxima = input.required<number>();
  /** Atributos efetivos da ficha — fórmula de dano do item pode somar atributo (ex.: `+FOR`; m3-45). */
  readonly atributos = input.required<FichaAtributosDto>();
  /** Proficiência atual — entra no ambiente da rolagem, mesmo quando a fórmula do item não a usa (m3-45). */
  readonly proficiencia = input<number | null>(null);
  /** Nível atual — idem `proficiencia` (m3-45). */
  readonly nivel = input(0);

  /** Emite o inventário inteiro após qualquer mutação — a página persiste. */
  readonly inventarioMudou = output<FichaInventarioDto>();
  /** Emite o novo par Energia atual/máxima após um custo de Fragmento — a página persiste. */
  readonly ajusteEnergiaFragmento = output<CustoEnergiaFragmento>();
  /** Emite o novo Inventário máximo editado na linha "Inventário" — a página persiste como derivado. */
  readonly ajusteInventarioMaximo = output<number>();
  /**
   * Emite as sequelas "Rejeição Biológica" do Preço de Sanidade ao **consumir** um fragmento
   * (m3-42) — a página as acrescenta a `estado.sequelas`. Não emite quando o jogador evitou a
   * sequela com o teste de Vontade.
   */
  readonly sequelasFragmentoConsumido = output<readonly FichaSequelaDto[]>();
  /**
   * Emite o bônus "Consumido" escolhido ao confirmar o consumo de um fragmento (m3-64) — a página
   * aplica ao agente (teste/Defesa/dano do Corpo, via `aplicarBonusConsumoFragmento`).
   */
  readonly bonusConsumoFragmento = output<BonusConsumoFragmentoEscolhidoDto>();
  /**
   * Registro incondicional do consumo (m3-64) — emitido **sempre**, mesmo quando o jogador evita a
   * sequela "Rejeição Biológica" com o teste de Vontade (a sequela é opcional; este rastro não).
   * A página acrescenta à aba Extras, acima da Afinidade.
   */
  readonly fragmentoConsumido = output<FichaFragmentoConsumidoDto>();
  /** Rolagem de dano de um item (m3-45) — quem persiste o histórico é `FichaVisualizacao` (m3-27). */
  readonly rolagemFeita = output<RolagemRealizadaDto>();

  /** Abas do catálogo comprável — sem os Fragmentos (achados, montados como item custom). */
  protected readonly categorias = CATALOGO_CATEGORIAS.filter(
    (categoria) => !CATEGORIAS_FRAGMENTO.includes(categoria.categoria),
  );
  protected readonly iconesCategoria = ICONES_CATEGORIA;

  /** Catálogo aberto (montar/adicionar itens) — recolhido por padrão para o inventário respirar. */
  protected readonly catalogoAberto = signal(false);
  protected readonly categoriaAtiva = signal<ItemCategoriaEnum>(ItemCategoriaEnum.CORPO_A_CORPO);
  /**
   * `true` quando a aba "Fragmentos" do catálogo está ativa — pseudo-categoria (não é uma entrada
   * de `categoriaAtiva`/`CATALOGO_ITENS`, que ficam vazios pra Fragmento — doc: são achados, não
   * comprados) que mostra a grade de módulos I–V em vez de itens/amplificadores.
   */
  protected readonly catalogoFragmentosAtivo = signal(false);
  protected readonly fragmentoTipoConstrutor = FragmentoTipoEnum.CONSTRUTOR;
  protected readonly fragmentoTipoPotencializador = FragmentoTipoEnum.POTENCIALIZADOR;

  /** Busca do catálogo (Reactive Forms — sem `ngModel`). */
  protected readonly busca = new FormControl('', { nonNullable: true });
  private readonly buscaTexto = toSignal(this.busca.valueChanges, { initialValue: '' });
  private readonly termoBusca = computed(() => this.buscaTexto().trim().toLowerCase());

  /** Busca dos itens já no inventário (lista abaixo) — independente da busca do catálogo acima. */
  protected readonly buscaItens = new FormControl('', { nonNullable: true });
  private readonly buscaItensTexto = toSignal(this.buscaItens.valueChanges, { initialValue: '' });
  private readonly termoBuscaItens = computed(() => this.buscaItensTexto().trim().toLowerCase());
  /** `true` quando a linha de ações virou a barra de busca (botão de lupa ao lado de "Custos"). */
  protected readonly buscandoItens = signal(false);
  /**
   * Filtro de visualização do Inventário — Equipamentos (tudo, padrão) | só Amplificadores | só
   * Fragmentos. Revisão de UX: era dois botões-toggle independentes (cada um trocava o próprio
   * rótulo entre a categoria e "Equipamentos") — ficava estranho tanto no texto (rótulo mutante,
   * ambíguo sobre o estado atual) quanto no layout (dois botões soltos quebravam linha sozinhos,
   * sem se conectar visualmente). Virou um único controle segmentado de 3 opções (sempre uma
   * ativa), mesmo padrão visual da barra de abas do Status (`ficha-visualizacao` —
   * `.ficha-status__abas`).
   */
  protected readonly filtroInventario = signal<FiltroInventario>('equipamentos');
  /** `true` quando o filtro mostra só os amplificadores — mantido para o resto do componente/template. */
  protected readonly mostrandoSoAmplificadores = computed(() => this.filtroInventario() === 'amplificadores');
  /** `true` quando o filtro mostra só os fragmentos — mantido para o resto do componente/template. */
  protected readonly mostrandoSoFragmentos = computed(() => this.filtroInventario() === 'fragmentos');

  /** Índices dos itens com o painel de modificações ("Modificar") aberto. */
  private readonly painelAbertos = signal<ReadonlySet<number>>(new Set());

  /** Índice do item com a edição de apelido aberta (m3-33), ou `null`. */
  protected readonly editandoApelidoIndice = signal<number | null>(null);
  /** Único número de munição em edição direta no card. */
  protected readonly contagemMunicaoEditando = signal<{ readonly indice: number; readonly campo: 'atual' | 'maxima' } | null>(null);
  /** Feedback breve depois de consumir uma cena/disparo, igual à confirmação de cópia. */
  protected readonly contagemMunicaoConsumidaIndice = signal<number | null>(null);
  private temporizadorContagemMunicao: ReturnType<typeof setTimeout> | null = null;
  private readonly entradaContagemMunicao = viewChild<ElementRef<HTMLInputElement>>('entradaContagemMunicao');

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

  /** Exibe o custo dos itens/mods/amplificadores já no inventário — oculto por padrão (não afeta o catálogo). */
  protected readonly mostrarCustos = signal(false);

  /** `true` quando o formulário de item custom está aberto. */
  protected readonly criandoItem = signal(false);
  protected readonly itemCustomForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoria: new FormControl(ItemCategoriaEnum.OPERACIONAL, { nonNullable: true }),
    custo: new FormControl(0, { nonNullable: true }),
    peso: new FormControl(1, { nonNullable: true }),
    descricao: new FormControl('', { nonNullable: true }),
    // Stats reais (aparecem conforme a categoria) — fazem o item custom "funcionar de verdade".
    dano: new FormControl('', { nonNullable: true }),
    informacao: new FormControl('', { nonNullable: true }),
    resistencia: new FormControl('', { nonNullable: true }),
    bonus: new FormControl('', { nonNullable: true }),
    /** `''` = nenhuma; senão o valor do enum `ItemCategoriaEnum` (exótico/fragmento "encaixa em"). */
    categoriaEmprestada: new FormControl('', { nonNullable: true }),
    /** `''` = nenhum; senão `I`–`V` (só fragmentos). */
    modulo: new FormControl('', { nonNullable: true }),
    /**
     * `''` = "Outra" (texto livre, como sempre foi); senão o `nome` de um item de
     * `CATALOGO_ITENS[categoriaEmprestada]` escolhido como Base do Fragmento Construtor
     * (`m3-69` — doc: "ele é a arma em si"). Só relevante quando `mostraBaseConstrutor()`;
     * não entra no `CarrinhoItemDto` (é só estado de UI — `escolherBaseConstrutor` já grava o
     * resultado em dano/informação/resistência/peso).
     */
    baseConstrutor: new FormControl('', { nonNullable: true }),
  });

  /** Categoria atual do form de item custom — também alimenta o gatilho do dropdown de categoria (com ícone). */
  protected readonly categoriaCustom = toSignal(this.itemCustomForm.controls.categoria.valueChanges, {
    initialValue: this.itemCustomForm.controls.categoria.value,
  });
  /**
   * `true` com o dropdown de Categoria do item custom aberto — popover próprio (mesmo motivo do
   * "Mover para": o popup nativo de `<select>` não é temável), mas com ícone por opção, o que um
   * `<select>` nativo não suporta em nenhum browser.
   */
  protected readonly categoriaItemSelectAberta = signal(false);
  protected readonly mostraDano = computed(() => CATEGORIAS_COM_DANO.includes(this.categoriaCustom()));
  protected readonly mostraResistencia = computed(() =>
    CATEGORIAS_COM_RESISTENCIA.includes(this.categoriaCustom()),
  );
  protected readonly mostraBonus = computed(
    () => this.categoriaCustom() === ItemCategoriaEnum.ARMAZENAMENTO,
  );
  protected readonly mostraEmprestimo = computed(() =>
    CATEGORIAS_COM_EMPRESTIMO.includes(this.categoriaCustom()),
  );
  protected readonly mostraModulo = computed(() =>
    CATEGORIAS_FRAGMENTO.includes(this.categoriaCustom()),
  );
  protected readonly categoriasEmprestaveis = CATEGORIAS_EMPRESTAVEIS;
  protected readonly modulosFragmento = MODULOS_FRAGMENTO;

  /** Módulo escolhido no form de item custom, ao vivo (alimenta o aviso de Limite mínimo de Energia). */
  private readonly moduloCustom = toSignal(this.itemCustomForm.controls.modulo.valueChanges, {
    initialValue: this.itemCustomForm.controls.modulo.value,
  });

  /** "Encaixa em" do form de item custom, ao vivo (alimenta o seletor "Base" do Construtor, `m3-69`). */
  private readonly categoriaEmprestadaCustom = toSignal(
    this.itemCustomForm.controls.categoriaEmprestada.valueChanges,
    { initialValue: this.itemCustomForm.controls.categoriaEmprestada.value },
  );

  /**
   * `'ARMA' | 'PROTECAO' | null` — mesma resolução de `comBonusFixoConstrutorSeNecessario`, usada
   * aqui só pra decidir se o seletor "Base" aparece (`m3-69`): um Fragmento Construtor com
   * "Encaixa em" reconhecido pelo doc tem uma base real de catálogo a herdar.
   */
  protected readonly formaBaseConstrutor = computed(() => {
    if (this.categoriaCustom() !== ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR) {
      return null;
    }
    const categoriaEmprestada = this.categoriaEmprestadaCustom();
    return formaFixaConstrutor(categoriaEmprestada ? (categoriaEmprestada as ItemCategoriaEnum) : undefined);
  });
  protected readonly mostraBaseConstrutor = computed(() => this.formaBaseConstrutor() !== null);

  /**
   * Itens de `CATALOGO_ITENS[categoriaEmprestada]` oferecidos no seletor "Base" (`m3-69` — doc:
   * "ele é a arma em si"). Vazio fora de `mostraBaseConstrutor()`.
   */
  protected readonly opcoesBaseConstrutor = computed<readonly ItemCatalogo[]>(() => {
    if (!this.mostraBaseConstrutor()) {
      return [];
    }
    const categoria = this.categoriaEmprestadaCustom() as ItemCategoriaEnum;
    return CATALOGO_ITENS[categoria];
  });

  /** Limite mínimo de Energia Máxima pro Vigor/Destreza do agente (doc — "⬦ Limite mínimo de Energia"; m3-67). */
  protected readonly limiteMinimoEnergia = computed(() =>
    limiteMinimoEnergiaMaximaFragmentos(this.atributos()),
  );

  /**
   * Aviso do painel de aquisição (m3-67): projeta a Energia Máxima **após** adquirir o Fragmento do
   * form custom (categoria + módulo já escolhidos) e devolve `{ projecao }` quando ela ficaria
   * abaixo do Limite mínimo de Energia — `null` fora do fluxo de fragmento, sem módulo escolhido
   * ainda, ou quando a aquisição não levaria à Anomalia Biológica. **Não trava** a ação (doc: "só
   * avisa antes"); mesma conta de `debitarAquisicaoFragmento` (proibição #26), só sem debitar de
   * verdade. Envelope `{ projecao }` (não `number` cru) de propósito — o template usa `@if (...; as
   * x)`, que trata `0` como falso; uma projeção de Energia Máxima exatamente 0 é um caso real (e
   * abaixo do limite) que um `number | null` esconderia silenciosamente.
   */
  protected readonly avisoLimiteEnergiaAquisicao = computed<{ readonly projecao: number } | null>(() => {
    if (!this.mostraModulo()) {
      return null;
    }
    const modulo = this.moduloCustom() as FragmentoModuloEnum | '';
    if (!modulo) {
      return null;
    }
    const tipo = tipoFragmentoDaCategoria(this.categoriaCustom());
    if (!tipo) {
      return null;
    }
    const itens = this.inventario().itens;
    const afinidade = afinidadeConsiderando(itens, modulo);
    const custo = aplicarReducaoAfinidade(custoAquisicaoFragmento(tipo, modulo), afinidade);
    const projecao = this.energiaMaxima() - custo;
    return emAnomaliaBiologica(projecao, this.limiteMinimoEnergia()) ? { projecao } : null;
  });

  /**
   * Índice do item com o menu "Mover para" (m3-44) aberto, ou `null`. Popover próprio (não
   * `<select>` nativo — o popup nativo não é temável, destoa do tema dark-first) na mesma linha
   * de raciocínio dos demais painéis inline (`aplicandoFragmentoIndice` etc.): fica aberto até uma
   * opção ser escolhida, sem fechar em clique fora (mesmo padrão do resto do componente).
   */
  protected readonly moverAbertoIndice = signal<number | null>(null);

  /** Índice do fragmento Potencializador cujo painel "Aplicar em..." está aberto (m3-35), ou `null`. */
  protected readonly aplicandoFragmentoIndice = signal<number | null>(null);
  /** Índice (na lista de itens) do alvo escolhido no painel de aplicar fragmento, ou `null`. */
  protected readonly alvoFragmento = signal<number | null>(null);
  /** Índice da opção de bônus escolhida (em `opcoesBonusFragmento()`), ou `null`. */
  protected readonly opcaoBonusFragmento = signal<number | null>(null);

  /** Índice do fragmento Potencializador cujo painel "Consumir" está aberto (m3-42), ou `null`. */
  protected readonly consumindoFragmentoIndice = signal<number | null>(null);
  /** Declaração do jogador de que evitou a sequela com o teste de Vontade (m3-42) — não trava, é honra. */
  protected readonly evitouSequelaConsumo = signal(false);
  /** Preço de Sanidade do fragmento em `consumindoFragmentoIndice`, ou `null` se o painel está fechado. */
  protected readonly precoSanidadeConsumo = computed<PrecoSanidadeConsumoDto | null>(() => {
    const indice = this.consumindoFragmentoIndice();
    const item = indice === null ? null : this.inventario().itens[indice];
    return item?.modulo ? custoSanidadeConsumirFragmento(item.modulo) : null;
  });

  /**
   * Prévia do custo líquido de **consumir** o fragmento com o painel "Consumir" aberto (m3-66):
   * `restituicaoAquisicao` (Energia Máxima da aquisição, devolvida, já reduzida pela Afinidade
   * atual) e `deltaEnergiaMaxima` (líquido — restituição menos o Preço de Sanidade físico,
   * `precoSanidadeConsumo().energiaMaximaExtra`, que não é reduzido por Afinidade). Mesma conta de
   * `custoAquisicaoReduzidoConsumo`, usada por `confirmarConsumirFragmento` (proibição #26).
   */
  protected readonly custoPreviaConsumirFragmento = computed<{
    readonly restituicaoAquisicao: number;
    readonly deltaEnergiaMaxima: number;
  } | null>(() => {
    const indice = this.consumindoFragmentoIndice();
    if (indice === null) {
      return null;
    }
    const itensAntes = this.inventario().itens;
    const item = itensAntes[indice];
    const tipo = item ? tipoFragmentoDaCategoria(item.categoria) : null;
    const preco = this.precoSanidadeConsumo();
    if (!item?.modulo || !tipo || !preco) {
      return null;
    }
    const restituicaoAquisicao = this.custoAquisicaoReduzidoConsumo(tipo, item.modulo, itensAntes);
    return { restituicaoAquisicao, deltaEnergiaMaxima: restituicaoAquisicao - preco.energiaMaximaExtra };
  });

  /**
   * Custo de aquisição do fragmento (Energia Máxima), já reduzido pela Afinidade atual — a parte
   * restituída ao consumir (m3-42/m3-49). Extraído pra `confirmarConsumirFragmento` e a prévia do
   * painel (`custoPreviaConsumirFragmento`, m3-66) usarem a mesma conta (proibição #26).
   */
  private custoAquisicaoReduzidoConsumo(
    tipo: FragmentoTipoEnum,
    modulo: FragmentoModuloEnum,
    itensAntes: readonly CarrinhoItemDto[],
  ): number {
    return aplicarReducaoAfinidade(custoAquisicaoFragmento(tipo, modulo), afinidadeConsiderando(itensAntes));
  }
  /** Índice da opção de bônus "Consumido" escolhida (em `opcoesConsumoFragmento()`), ou `null` (m3-64). */
  protected readonly opcaoConsumoFragmento = signal<number | null>(null);
  /** Atributo escolhido pro bônus "Consumido" quando `tipo === 'TESTE'`, ou `null` (m3-64). */
  protected readonly atributoConsumoFragmento = signal<keyof FichaAtributosDto | null>(null);
  /** Rótulos de atributo pro `<select>` "Atributo" do painel "Consumir" (m3-64). */
  protected readonly rotulosAtributo = ROTULOS_ATRIBUTO;
  /** As 10 chaves de atributo, na ordem do `<select>` "Atributo" (m3-64). */
  protected readonly atributosSelecionaveis = Object.keys(ROTULOS_ATRIBUTO) as readonly (keyof FichaAtributosDto)[];

  /** Cardápio de bônus "Consumido" do fragmento com o painel "Consumir" aberto (m3-64), vazio se nenhum. */
  protected readonly opcoesConsumoFragmento = computed<readonly OpcaoBonusConsumoFragmentoDto[]>(() => {
    const indice = this.consumindoFragmentoIndice();
    const item = indice === null ? null : this.inventario().itens[indice];
    return item?.modulo ? listarBonusConsumoFragmentoPotencializador(item.modulo) : [];
  });

  /** Opção de bônus "Consumido" escolhida no painel "Consumir", ou `null` se nenhuma (m3-64). */
  protected readonly opcaoConsumoFragmentoEscolhida = computed<OpcaoBonusConsumoFragmentoDto | null>(() => {
    const indice = this.opcaoConsumoFragmento();
    return indice === null ? null : (this.opcoesConsumoFragmento()[indice] ?? null);
  });

  /** Índice do item cujo formulário de modificação custom está aberto, ou `null`. */
  protected readonly criandoModIndice = signal<number | null>(null);
  /** Uma linha de efeito da mod custom: um `tipo` + os campos que o tipo usa (ver `EFEITO_TIPOS`). */
  protected readonly modCustomForm = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    /** Teto de empilhamentos que a mod poderá ter (ela entra em 1× e sobe até aqui). */
    empilhamentoMaximo: new FormControl(1, { nonNullable: true }),
    /** Não conta no limite total de empilhamentos da arma. */
    ignoraLimiteTotal: new FormControl(false, { nonNullable: true }),
    /** Pode passar do próprio teto de empilhamentos. */
    ignoraLimiteProprio: new FormControl(false, { nonNullable: true }),
    descricao: new FormControl('', { nonNullable: true }),
    /** Lista de efeitos **mecânicos** (por empilhamento) — faz a mod custom "funcionar de verdade". */
    efeitos: new FormArray<ReturnType<FichaInventario['criarEfeitoGrupo']>>([]),
  });
  protected readonly efeitoTipos = EFEITO_TIPOS;

  private readonly bandeja = inject(BandejaDadosService);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizadorAdicionado !== null) {
        clearTimeout(this.temporizadorAdicionado);
      }
      if (this.temporizadorContagemMunicao !== null) {
        clearTimeout(this.temporizadorContagemMunicao);
      }
    });
    effect(() => {
      if (this.contagemMunicaoEditando() !== null) {
        const entrada = this.entradaContagemMunicao()?.nativeElement;
        entrada?.focus();
        entrada?.select();
      }
    });
  }

  /**
   * Inventário máximo com o ajuste do amplificador "Inventário" (+5 fixo; "Veloz" penaliza -2/stack
   * além do 1º) somado **por cima** do stored/calculado (m3-43) — nunca persistido de volta, mesma
   * filosofia "manual + equipamento" de `status-derivado`/`resistencia.ts`.
   */
  protected readonly inventarioMaximoEfetivo = computed(
    () => this.inventarioMaximo() + ajusteInventarioAmplificadores(this.inventario().amplificadores),
  );

  /** Recorte de limites/peso do motor (patente, peso usado, inventário efetivo, amplificadores). */
  protected readonly resumo = computed(() =>
    calcularResumoCompras({
      itens: this.inventario().itens,
      amplificadores: this.inventario().amplificadores,
      dinheiro: this.dinheiro(),
      prestigio: this.prestigio(),
      inventario: this.inventarioMaximoEfetivo(),
      vontade: this.vontade(),
    }),
  );

  /** Peso usado / inventário efetivo (base + armazenamentos vestidos) — referência. */
  protected readonly inventarioTexto = computed(() => {
    const resumo = this.resumo();
    const base = `${this.formatarPeso(resumo.pesoUsado)} / ${this.formatarPeso(resumo.inventarioEfetivo)}`;
    return resumo.bonusInventario > 0
      ? `${base} (base ${this.formatarPeso(this.inventarioMaximoEfetivo())} +${this.formatarPeso(resumo.bonusInventario)} vest.)`
      : base;
  });
  /** Só o peso usado formatado — mantém o "X /" visível enquanto o máximo está em edição. */
  protected readonly pesoUsadoTexto = computed(() => this.formatarPeso(this.resumo().pesoUsado));
  /**
   * Excedeu o inventário efetivo **+ tolerância de Sobrecarga da Formação** (m3-41) — só **aviso**
   * (não trava o salvamento).
   */
  protected readonly excedeInventario = computed(
    () => this.resumo().pesoUsado > this.resumo().inventarioEfetivo + this.toleranciaSobrecarga(),
  );
  /** Preenchimento da barra da linha "Inventário" (peso usado ÷ efetivo) — mesma barra de Vida/Energia. */
  protected readonly percentualCarga = computed(() => {
    const resumo = this.resumo();
    if (resumo.inventarioEfetivo <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (resumo.pesoUsado / resumo.inventarioEfetivo) * 100));
  });

  /** `true` enquanto o Inventário máximo está em digitação direta na linha "Inventário". */
  protected readonly editandoInventarioMaximo = signal(false);

  /** Abre a digitação direta do Inventário máximo (clique no valor da linha "Inventário"). */
  protected editarInventarioMaximo(): void {
    this.editandoInventarioMaximo.set(true);
  }

  /** Cancela a digitação do Inventário máximo (Escape) sem alterar. */
  protected cancelarInventarioMaximo(): void {
    this.editandoInventarioMaximo.set(false);
  }

  /**
   * Confirma o Inventário máximo digitado (Enter/blur): emite pra página persistir como derivado.
   * O guard evita o commit duplo do `blur` que segue o `Enter`. Sem trava de faixa (liberdade total).
   */
  protected confirmarInventarioMaximo(texto: string): void {
    if (!this.editandoInventarioMaximo()) {
      return;
    }
    this.editandoInventarioMaximo.set(false);
    const bruto = Number.parseInt(texto, 10);
    if (!Number.isNaN(bruto) && bruto !== this.inventarioMaximo()) {
      this.ajusteInventarioMaximo.emit(bruto);
    }
  }

  // === Catálogo ===
  /** Se a categoria de amplificadores deve ser exibida (aba ativa ou casada pela busca). */
  protected readonly mostrarAmplificadores = computed(() => {
    if (this.catalogoFragmentosAtivo()) {
      return false;
    }
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
    } else if (!this.catalogoFragmentosAtivo() && this.categoriaAtiva() !== ItemCategoriaEnum.AMPLIFICADOR) {
      const categoria = this.categoriaAtiva();
      for (const item of CATALOGO_ITENS[categoria]) {
        bruto.push({ item, categoria });
      }
    }
    return bruto.map(({ item, categoria }) => this.montarCartaoItem(item, categoria));
  });

  /**
   * Grade de módulos de Fragmento — Fragmentos não têm catálogo comprável (achados, m3-49), então
   * cada cartão é só o atalho pra escolher módulo + tipo e abrir o item custom pré-preenchido.
   * Custo mostrado é o de **adquirir** (Energia Máxima) — Construtor é sempre o dobro do
   * Potencializador. Ordem **V → I** (do módulo mais fraco/comum pro mais forte/raro — o jogador
   * tende a achar os fracos primeiro; a ordem crescente de força faz mais sentido de leitura que a
   * ordem "I é o mais forte" usada no `<select>` do item custom).
   *
   * Custo `*Reduzido` (m3-66) usa a mesma `afinidadeConsiderando`/`aplicarReducaoAfinidade` de
   * `debitarAquisicaoFragmento` (proibição #26 — uma só conta), com o próprio módulo do cartão como
   * `moduloExtra` — o catálogo antes só mostrava o custo cheio, mesmo quando a Afinidade atual do
   * agente já reduziria o que ele vai pagar.
   */
  protected readonly cartaoModulosFragmento = computed<readonly CartaoModuloFragmentoVM[]>(() => {
    const itens = this.inventario().itens;
    return MODULOS_FRAGMENTO.map((modulo) => {
      const afinidade = afinidadeConsiderando(itens, modulo);
      const custoPotencializador = custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, modulo);
      const custoConstrutor = custoAquisicaoFragmento(FragmentoTipoEnum.CONSTRUTOR, modulo);
      return {
        modulo,
        afinidade: valorAfinidadeFragmento(modulo),
        custoPotencializador,
        custoConstrutor,
        custoPotencializadorReduzido: aplicarReducaoAfinidade(custoPotencializador, afinidade),
        custoConstrutorReduzido: aplicarReducaoAfinidade(custoConstrutor, afinidade),
      };
    }).reverse();
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
      // Amplificador ainda não portado entra de uma vez com `empilhamentosIniciais` (2 pra
      // Conservador/Veloz, doc — "■■") — o botão só pode ficar habilitado se o total couber por
      // inteiro no limite (Vontade × 3), não só +1 (m3-43-bis: bug que deixava passar do limite).
      const incremento = atuais === 0 ? amplificador.empilhamentosIniciais : 1;
      return {
        nome: amplificador.nome,
        efeito: amplificador.efeito,
        empilhamentosAtuais: atuais,
        maximoEfetivo,
        podeAdicionar: totalStacks + incremento <= limite && atuais < maximoEfetivo,
        custoTexto: atuais === 0 ? '$3.000' : '$1.000',
      };
    });
  });

  protected readonly catalogoVazio = computed(
    () =>
      !this.catalogoFragmentosAtivo() && this.itensCatalogo().length === 0 && !this.mostrarAmplificadores(),
  );

  // === Inventário (lista) ===
  protected readonly inventarioVazio = computed(
    () => this.inventario().itens.length === 0 && this.inventario().amplificadores.length === 0,
  );

  protected readonly itensInventario = computed<readonly ItemInventarioVM[]>(() =>
    this.inventario().itens.map((item, indice) => this.montarItemInventario(item, indice)),
  );

  /** Itens da lista após a busca (nome exibido, nome real e categoria) — a busca em si não reordena nem remove do inventário real. */
  protected readonly itensInventarioFiltrados = computed<readonly ItemInventarioVM[]>(() => {
    const termo = this.termoBuscaItens();
    if (!termo) {
      return this.itensInventario();
    }
    return this.itensInventario().filter(
      (item) =>
        item.nomeExibido.toLowerCase().includes(termo) ||
        item.nome.toLowerCase().includes(termo) ||
        item.categoriaRotulo.toLowerCase().includes(termo),
    );
  });

  /** `true` quando a busca de itens não achou nada (mas o inventário tem itens). */
  protected readonly buscaItensSemResultado = computed(
    () => this.termoBuscaItens().length > 0 && this.itensInventarioFiltrados().length === 0,
  );

  /**
   * Lista principal (tudo menos Medicinal/Operacional e Fragmentos): armas (corpo a corpo/fogo/
   * explosivos/exóticos) → munições → proteções → armazenamento (`ORDEM_CATEGORIAS_LISTA`). A ordem
   * dentro da mesma categoria é a do inventário real (`sort` é estável). Itens **dentro** de um
   * container próprio (`containerId`, m3-44 — Pochete/Bolso de Corpo) saem daqui: aparecem só na
   * seção de sub-inventário do próprio container (`subInventarios`), nunca duplicados.
   */
  protected readonly itensListaPrincipal = computed<readonly ItemInventarioVM[]>(() => {
    const ordem = new Map(ORDEM_CATEGORIAS_LISTA.map((categoria, indiceOrdem) => [categoria, indiceOrdem]));
    return this.itensInventarioFiltrados()
      .filter(
        (item) =>
          !CATEGORIAS_EMPILHAVEIS.includes(item.categoria) &&
          !CATEGORIAS_FRAGMENTO.includes(item.categoria) &&
          this.noInventarioPrincipal(item),
      )
      .slice()
      .sort((a, b) => (ordem.get(a.categoria) ?? ORDEM_CATEGORIAS_LISTA.length) - (ordem.get(b.categoria) ?? ORDEM_CATEGORIAS_LISTA.length));
  });

  /** Medicinal + Operacional misturados numa grade de 2 colunas, ordenados por nome exibido. */
  protected readonly itensListaMedicinalOperacional = computed<readonly ItemInventarioVM[]>(() =>
    this.itensInventarioFiltrados()
      .filter((item) => CATEGORIAS_EMPILHAVEIS.includes(item.categoria) && this.noInventarioPrincipal(item))
      .slice()
      .sort((a, b) => a.nomeExibido.localeCompare(b.nomeExibido, 'pt-BR')),
  );

  /**
   * Fragmentos (Construtor + Potencializador) em seção própria (m3-44 — item 19), no mesmo padrão
   * da lista de Amplificadores: Construtor antes de Potencializador, estável dentro da categoria.
   */
  protected readonly itensListaFragmentos = computed<readonly ItemInventarioVM[]>(() => {
    const ordem = new Map(CATEGORIAS_FRAGMENTO.map((categoria, indiceOrdem) => [categoria, indiceOrdem]));
    return this.itensInventarioFiltrados()
      .filter((item) => CATEGORIAS_FRAGMENTO.includes(item.categoria) && this.noInventarioPrincipal(item))
      .slice()
      .sort((a, b) => (ordem.get(a.categoria) ?? 0) - (ordem.get(b.categoria) ?? 0));
  });

  /**
   * Sub-inventários próprios abertos (m3-44 — Pochete/Bolso de Corpo vestidos): cada container vira
   * uma lista distinta com sua própria capacidade (`shared/regras/compras#listarSubInventarios`,
   * fonte única do cálculo — proibições #26/#27). Não passa pela busca de itens (listas pequenas,
   * sempre visíveis por inteiro).
   */
  protected readonly subInventarios = computed<readonly SubInventarioVM[]>(() => {
    const todosItens = this.itensInventario();
    return listarSubInventarios(this.inventario().itens).map((sub) => ({
      containerId: sub.containerId,
      nomeContainer: sub.nomeContainer,
      capacidade: sub.capacidade,
      pesoTexto: `${this.formatarPeso(sub.pesoUsado)} / ${this.formatarPeso(sub.capacidade)}`,
      excede: sub.pesoUsado > sub.capacidade,
      categoriasRotulo: sub.categoriasPermitidas?.map((categoria) => this.rotuloCategoria(categoria)).join(', ') ?? null,
      itens: todosItens.filter((item) => item.containerId === sub.containerId),
    }));
  });

  /** Destinos do menu "Mover para" (m3-44): um container próprio vestido por sub-inventário aberto. */
  protected readonly containersDisponiveis = computed<readonly ContainerDestinoVM[]>(() =>
    this.subInventarios().map((sub) => ({ containerId: sub.containerId, rotulo: sub.nomeContainer })),
  );

  /** Rótulo do container atual de um item pro gatilho do menu "Mover para" — "Inventário principal" quando `null` ou o container não existe mais. */
  protected rotuloContainerAtual(containerId: string | null): string {
    if (containerId === null) {
      return 'Inventário principal';
    }
    return this.containersDisponiveis().find((destino) => destino.containerId === containerId)?.rotulo ?? 'Inventário principal';
  }

  /**
   * `id`s de containers com sub-inventário **ativo** agora (vestidos, com `id`). Um item cujo
   * `containerId` não bate com nenhum destes "cai de volta" pro inventário principal sozinho — se o
   * container foi guardado/removido, o item some da seção dele mas não fica invisível em lugar nenhum.
   */
  private readonly containerIdsAtivos = computed(() => new Set(this.subInventarios().map((sub) => sub.containerId)));

  /** `true` quando o item deve aparecer nas listas do inventário **principal** (fora de um sub-inventário ativo). */
  private noInventarioPrincipal(item: ItemInventarioVM): boolean {
    return item.containerId === null || !this.containerIdsAtivos().has(item.containerId);
  }

  /**
   * Alvos válidos pro "Aplicar em..." de um fragmento Potencializador — qualquer item ou ser,
   * exceto outro fragmento (Construtor ou Potencializador): um fragmento não acopla em outro
   * fragmento. O único item excluído além dos fragmentos é o próprio fragmento sendo aplicado
   * (não faz sentido acoplar um fragmento nele mesmo, mas isso já cai na regra geral acima).
   */
  protected readonly alvosFragmentoDisponiveis = computed<readonly { indice: number; rotulo: string }[]>(
    () => {
      const fragmentoIndice = this.aplicandoFragmentoIndice();
      return this.inventario()
        .itens.map((item, indice) => ({ item, indice }))
        .filter(
          ({ item, indice }) =>
            item.categoria !== ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR &&
            item.categoria !== ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR &&
            indice !== fragmentoIndice,
        )
        .map(({ item, indice }) => ({ indice, rotulo: rotuloItem(item) }));
    },
  );

  /**
   * Cardápio de bônus do fragmento com o painel "Aplicar em..." aberto (m3-35), vazio se nenhum. A
   * 5ª opção ("N× maior dado", `m3-63`) só entra depois que o alvo é escolhido e só quando ele tem
   * dado no campo `dano` (`maiorDadoItem`) — por isso recalcula a cada troca de `alvoFragmento`.
   */
  protected readonly opcoesBonusFragmento = computed<readonly OpcaoBonusFragmentoDto[]>(() => {
    const indice = this.aplicandoFragmentoIndice();
    if (indice === null) {
      return [];
    }
    const fragmento = this.inventario().itens[indice];
    if (!fragmento?.modulo) {
      return [];
    }
    const alvoIndice = this.alvoFragmento();
    const alvo = alvoIndice === null ? null : this.inventario().itens[alvoIndice];
    const maiorDado = alvo ? maiorDadoItem(alvo) : null;
    return listarBonusFragmentoPotencializador(fragmento.modulo, maiorDado);
  });

  /**
   * `true` quando o bônus escolhido cumpre a mesma função (dano/teste/resistência) de um fragmento
   * já aplicado no alvo — bloqueia a confirmação (doc: "uma única função" por item/ser, `m3-63`).
   */
  protected readonly conflitoFuncaoFragmento = computed<boolean>(() => {
    const alvoIndice = this.alvoFragmento();
    const opcaoIndice = this.opcaoBonusFragmento();
    if (alvoIndice === null || opcaoIndice === null) {
      return false;
    }
    const alvo = this.inventario().itens[alvoIndice];
    const opcao = this.opcoesBonusFragmento()[opcaoIndice];
    if (!alvo || !opcao) {
      return false;
    }
    return existeFragmentoNaMesmaFuncao(alvo.modificacoes, opcao.efeito);
  });

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

  /** Fecha o catálogo — usado pelo `onHide` do dialog (modo `dialog`), não o mesmo `alternarCatalogo`. */
  protected fecharCatalogo(): void {
    this.catalogoAberto.set(false);
  }

  protected definirCategoria(categoria: ItemCategoriaEnum): void {
    this.categoriaAtiva.set(categoria);
    this.catalogoFragmentosAtivo.set(false);
  }

  /** Abre a grade de módulos de Fragmento no catálogo — pseudo-categoria, ver `catalogoFragmentosAtivo`. */
  protected selecionarCategoriaFragmentos(): void {
    this.catalogoFragmentosAtivo.set(true);
  }

  /**
   * Escolhe o módulo + tipo (Construtor/Potencializador — cada cartão da grade de Fragmentos tem um
   * botão de cada) direto: fecha o catálogo e abre o formulário de item custom já pré-preenchido com
   * a categoria e o módulo — o resto (nome, custo, peso, dano/resistência) o jogador preenche como
   * qualquer achado.
   */
  protected escolherTipoFragmento(modulo: FragmentoModuloEnum, tipo: FragmentoTipoEnum): void {
    const categoria =
      tipo === FragmentoTipoEnum.CONSTRUTOR
        ? ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR
        : ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR;
    this.resetarItemCustomForm({
      nome: '',
      categoria,
      custo: 0,
      peso: 1,
      descricao: '',
      dano: '',
      informacao: '',
      resistencia: '',
      bonus: '',
      categoriaEmprestada: '',
      modulo,
    });
    this.catalogoAberto.set(false);
    this.catalogoFragmentosAtivo.set(false);
    this.criandoItem.set(true);
    this.categoriaItemSelectAberta.set(false);
  }

  protected adicionarItem(vm: CartaoItemVM): void {
    const item: CarrinhoItemDto = {
      nome: vm.item.nome,
      categoria: vm.categoria,
      custo: vm.item.custo,
      peso: vm.item.peso,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
    };
    this.inserirItem({ ...item, contagemMunicao: criarContagemMunicao(item) ?? undefined });
    this.sinalizarAdicao(this.chaveCartao(vm.categoria, vm.item.nome));
  }

  /** Abre/fecha o formulário de item custom. */
  protected alternarCriarItem(): void {
    this.categoriaItemSelectAberta.set(false);
    if (this.criandoItem()) {
      this.criandoItem.set(false);
      return;
    }
    this.resetarItemCustomForm({
      nome: '',
      categoria: ItemCategoriaEnum.OPERACIONAL,
      custo: 0,
      peso: 1,
      descricao: '',
      dano: '',
      informacao: '',
      resistencia: '',
      bonus: '',
      categoriaEmprestada: '',
      modulo: '',
    });
    this.criandoItem.set(true);
  }

  /**
   * Reseta o form de item custom pro `valores` dado — reabilita dano/informação/resistência antes
   * (uma Base do Construtor pode tê-los travado, `m3-69`; `FormControl.reset()` sozinho não desfaz
   * `disable()`) e zera a Base escolhida, sempre voltando a "Outra" (texto livre).
   */
  private resetarItemCustomForm(valores: Omit<ReturnType<FichaInventario['itemCustomForm']['getRawValue']>, 'baseConstrutor'>): void {
    const controles = this.itemCustomForm.controls;
    controles.dano.enable();
    controles.informacao.enable();
    controles.resistencia.enable();
    this.itemCustomForm.reset({ ...valores, baseConstrutor: '' });
  }

  protected cancelarCriarItem(): void {
    this.criandoItem.set(false);
    this.categoriaItemSelectAberta.set(false);
  }

  /** Abre/fecha o dropdown de Categoria do item custom (popover próprio, ver `categoriaItemSelectAberta`). */
  protected alternarCategoriaItemSelect(): void {
    this.categoriaItemSelectAberta.update((aberto) => !aberto);
  }

  /** Escolhe uma categoria no dropdown do item custom e fecha o popover. */
  protected escolherCategoriaItem(categoria: ItemCategoriaEnum): void {
    this.itemCustomForm.controls.categoria.setValue(categoria);
    this.categoriaItemSelectAberta.set(false);
  }

  /**
   * Confirma o item custom (nome obrigatório): adiciona um `CarrinhoItemDto` com a categoria/custo/peso
   * informados. Sem stat computável (não está no catálogo — `calcularStatItem` devolve `null`), mas
   * participa dos totais de peso/custo pelo motor normalmente. Um Fragmento (Potencializador ou
   * Construtor) com módulo debita a Energia Máxima de adquiri-lo (m3-35) — Construtor custa o dobro.
   */
  protected confirmarCriarItem(): void {
    if (this.itemCustomForm.invalid) {
      return;
    }
    const item = this.comBonusFixoConstrutorSeNecessario(this.montarItemCustom());
    const itensAntes = this.inventario().itens;
    this.inserirItem(item);
    this.sinalizarAdicao(this.chaveCartao(item.categoria, item.nome));
    this.criandoItem.set(false);
    this.categoriaItemSelectAberta.set(false);
    this.debitarAquisicaoFragmento(item, itensAntes);
  }

  /**
   * Bônus fixo automático de um Fragmento Construtor recém-criado (m3-65 — doc: "concede bônus
   * adicionais de dano e testes de acordo com seu módulo"): Arma (Corpo a Corpo/Fogo/Exótica) e
   * Proteção já nascem com a modificação da tabela (`listarEfeitosFixosConstrutor`) aplicada, com
   * `origemFragmento` (mesmo padrão do Potencializador — badge de origem no card) e fora do limite
   * de mods da patente (não é uma modificação comprada). Munição não modifica um item (ação própria
   * "Recarregar", ver `recarregarMunicaoConstrutor`); item sem `categoriaEmprestada` reconhecida
   * pelo doc devolve o item como veio.
   */
  private comBonusFixoConstrutorSeNecessario(item: CarrinhoItemDto): CarrinhoItemDto {
    if (item.categoria !== ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR || !item.modulo) {
      return item;
    }
    const forma = formaFixaConstrutor(item.categoriaEmprestada);
    if (!forma) {
      return item;
    }
    const modificacao: CarrinhoItemDto['modificacoes'][number] = {
      nome: `Fragmento Construtor — Módulo ${item.modulo}`,
      empilhamentos: 1,
      efeitos: listarEfeitosFixosConstrutor(item.modulo, forma),
      ignoraLimiteTotal: true,
      ignoraLimiteProprio: true,
      origemFragmento: { tipo: FragmentoTipoEnum.CONSTRUTOR, modulo: item.modulo },
    };
    return { ...item, modificacoes: [...item.modificacoes, modificacao] };
  }

  /**
   * Debita a Energia Máxima de adquirir um Fragmento (m3-35) — nenhum custo fora das duas
   * categorias. Reduzido pela Afinidade acima de 10 (m3-42/m3-49, `aplicarReducaoAfinidade`) — a
   * Afinidade "considera" o próprio fragmento sendo adquirido (retroativa, ver `afinidadeConsiderando`),
   * já que ele entra no inventário logo em seguida. `itensAntes` é o inventário **antes** de
   * `inserirItem` o incluir (evita contar o fragmento duas vezes).
   */
  private debitarAquisicaoFragmento(item: CarrinhoItemDto, itensAntes: readonly CarrinhoItemDto[]): void {
    const tipo = tipoFragmentoDaCategoria(item.categoria);
    if (!tipo || !item.modulo) {
      return;
    }
    const afinidade = afinidadeConsiderando(itensAntes, item.modulo);
    const custo = aplicarReducaoAfinidade(custoAquisicaoFragmento(tipo, item.modulo), afinidade);
    this.ajusteEnergiaFragmento.emit({
      energiaAtual: this.energiaAtual(),
      energiaMaxima: this.energiaMaxima() - custo,
    });
  }

  /**
   * Monta o `CarrinhoItemDto` do form custom, incluindo só os **stats reais** pertinentes à categoria
   * (dano/informação de armas, resistência de proteções, bônus de armazenamento, categoria emprestada
   * de exótico/fragmento e módulo de fragmento). Assim o item inventado calcula dano/resistência/bônus
   * de verdade (`calcularStatItem` lê estes campos — proibição #26 mantida: o cálculo é do motor).
   */
  private montarItemCustom(): CarrinhoItemDto {
    const bruto = this.itemCustomForm.getRawValue();
    const categoria = bruto.categoria;
    const dano = bruto.dano.trim();
    const informacao = bruto.informacao.trim();
    const resistencia = bruto.resistencia.trim();
    const bonus = bruto.bonus.trim();
    const descricao = bruto.descricao.trim();
    return {
      nome: bruto.nome.trim(),
      categoria,
      custo: Math.max(0, bruto.custo),
      peso: Math.max(0, bruto.peso),
      quantidade: 1,
      guardada: false,
      modificacoes: [],
      ...(descricao ? { descricao } : {}),
      ...(dano && CATEGORIAS_COM_DANO.includes(categoria) ? { dano } : {}),
      ...(informacao && CATEGORIAS_COM_DANO.includes(categoria) ? { informacao } : {}),
      ...(resistencia && CATEGORIAS_COM_RESISTENCIA.includes(categoria) ? { resistencia } : {}),
      ...(bonus && categoria === ItemCategoriaEnum.ARMAZENAMENTO ? { bonus } : {}),
      ...(bruto.categoriaEmprestada && CATEGORIAS_COM_EMPRESTIMO.includes(categoria)
        ? { categoriaEmprestada: bruto.categoriaEmprestada as ItemCategoriaEnum }
        : {}),
      ...(bruto.modulo && CATEGORIAS_FRAGMENTO.includes(categoria)
        ? { modulo: bruto.modulo as FragmentoModuloEnum }
        : {}),
    };
  }

  /**
   * Resumo de dano/resistência de um item do catálogo, pra opção do seletor "Base" (`m3-69`) —
   * mesma formatação do cartão do catálogo (`formatarStatCatalogo`), sem repetir "Dano "/"Resist. ".
   */
  protected resumoBase(item: ItemCatalogo): string {
    return item.dano ?? item.resistencia ?? '';
  }

  /**
   * Reage ao `(change)` do seletor "Base" do Fragmento Construtor (`m3-69` — doc: "ele é a arma em
   * si"): escolher um item do catálogo preenche e **trava** (read-only) dano/informação/resistência
   * com os valores daquele item, e pré-preenche o peso (o Construtor "é" aquele item, ocupa o mesmo
   * espaço) — custo segue livre (fragmentos são achados, não comprados, `m3-49`). Voltar pra "Outra"
   * (`nome === ''`) destrava os campos e limpa o texto, do mesmo jeito que o form sempre funcionou
   * antes desta task. Ligado a `(change)` (não a uma subscription de `valueChanges`) de propósito:
   * só deve reagir a uma escolha de verdade no `<select>`, nunca a um `reset`/`setValue` em lote do
   * form (que também passa por `baseConstrutor` e não pode disparar este efeito colateral).
   */
  protected escolherBaseConstrutor(nome: string): void {
    const controles = this.itemCustomForm.controls;
    const item = nome ? this.opcoesBaseConstrutor().find((candidato) => candidato.nome === nome) : undefined;
    if (item) {
      controles.dano.setValue(item.dano ?? '');
      controles.informacao.setValue(item.informacao ?? '');
      controles.resistencia.setValue(item.resistencia ?? '');
      controles.peso.setValue(item.peso);
      controles.dano.disable();
      controles.informacao.disable();
      controles.resistencia.disable();
      return;
    }
    controles.dano.enable();
    controles.informacao.enable();
    controles.resistencia.enable();
    controles.dano.setValue('');
    controles.informacao.setValue('');
    controles.resistencia.setValue('');
  }

  /** Passo − / + num campo numérico do formulário de item custom (piso 0). */
  protected ajustarCampoItem(campo: 'custo' | 'peso', delta: number): void {
    const controle = this.itemCustomForm.controls[campo];
    controle.setValue(Math.max(0, controle.value + delta));
  }

  /**
   * Adiciona um item, empilhando a quantidade quando a categoria é empilhável e o item já existe
   * **com o mesmo apelido** (m3-33) — um item apelidado não absorve silenciosamente um item sem
   * apelido (ou de apelido diferente) de mesma categoria/nome.
   */
  private inserirItem(novo: CarrinhoItemDto): void {
    const item = this.comIdDeContainerSeNecessario(novo);
    const itens = this.inventario().itens;
    const empilhavel = CATEGORIAS_EMPILHAVEIS.includes(item.categoria);
    const indiceExistente = empilhavel
      ? itens.findIndex(
          (atual) =>
            atual.categoria === item.categoria &&
            atual.nome === item.nome &&
            (atual.apelido ?? null) === (item.apelido ?? null),
        )
      : -1;
    if (indiceExistente >= 0) {
      this.emitirItens(
        itens.map((atual, indice) =>
          indice === indiceExistente ? { ...atual, quantidade: atual.quantidade + 1 } : atual,
        ),
      );
      return;
    }
    this.emitirItens([...itens, item]);
  }

  /**
   * Atribui um `id` estável (m3-44) a um item recém-criado que abre sub-inventário próprio
   * (Pochete/Bolso de Corpo, `ItemCatalogo.inventarioProprio`) — os itens colocados dentro dele
   * vão referenciar esse `id` via `containerId`. Os demais armazenamentos (Mochilas comuns) e
   * todas as outras categorias não precisam de `id`.
   */
  private comIdDeContainerSeNecessario(item: CarrinhoItemDto): CarrinhoItemDto {
    if (item.id || item.categoria !== ItemCategoriaEnum.ARMAZENAMENTO) {
      return item;
    }
    return resolverDadosItem(item)?.inventarioProprio ? { ...item, id: crypto.randomUUID() } : item;
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

  /**
   * Confirma a remoção da última unidade: retira o item da lista e emite. Um Fragmento (nunca
   * empilhável — sempre cai aqui, não no dialog de stack) devolve a Energia Máxima da aquisição ao
   * sair do inventário (m3-35 — doc: "esse gasto cessa ao remover o fragmento de seu inventário").
   */
  protected confirmarRemocaoItem(indice: number): void {
    const itensAntes = this.inventario().itens;
    const item = itensAntes[indice];
    this.emitirItens(itensAntes.filter((_, i) => i !== indice));
    this.indiceConfirmandoRemocao.set(null);
    this.fecharPainel(indice);
    if (item) {
      this.restaurarAquisicaoFragmento(item, itensAntes);
    }
  }

  /**
   * Restaura a Energia Máxima drenada por um Fragmento removido do inventário (m3-35). Mesma
   * redução por Afinidade da aquisição (m3-42/m3-49) — `itensAntes` ainda inclui o próprio
   * fragmento sendo removido, então a Afinidade "atual" já o conta (retroativa, sem precisar somar
   * de novo como na aquisição).
   */
  private restaurarAquisicaoFragmento(item: CarrinhoItemDto, itensAntes: readonly CarrinhoItemDto[]): void {
    const tipo = tipoFragmentoDaCategoria(item.categoria);
    if (!tipo || !item.modulo) {
      return;
    }
    const afinidade = afinidadeConsiderando(itensAntes);
    const custo = aplicarReducaoAfinidade(custoAquisicaoFragmento(tipo, item.modulo), afinidade);
    this.ajusteEnergiaFragmento.emit({
      energiaAtual: this.energiaAtual(),
      energiaMaxima: this.energiaMaxima() + custo,
    });
  }

  // === Aplicar fragmento Potencializador (m3-35) ===
  /** Abre o painel "Aplicar em..." de um fragmento Potencializador, zerando o rascunho de escolha. */
  protected abrirAplicarFragmento(indice: number): void {
    this.aplicandoFragmentoIndice.set(indice);
    this.alvoFragmento.set(null);
    this.opcaoBonusFragmento.set(null);
  }

  /** Fecha o painel "Aplicar em..." sem alterar nada. */
  protected cancelarAplicarFragmento(): void {
    this.aplicandoFragmentoIndice.set(null);
  }

  /**
   * Escolhe o item-alvo do `<select>` do painel "Aplicar em...". Zera o bônus escolhido — a lista
   * de opções muda de tamanho conforme o alvo (5ª opção "N× maior dado", `m3-63`), então o índice
   * antigo pode não corresponder mais à mesma opção.
   */
  protected escolherAlvoFragmento(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.alvoFragmento.set(valor === '' ? null : Number(valor));
    this.opcaoBonusFragmento.set(null);
  }

  /** Escolhe a opção de bônus do `<select>` do painel "Aplicar em...". */
  protected escolherOpcaoBonusFragmento(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.opcaoBonusFragmento.set(valor === '' ? null : Number(valor));
  }

  /**
   * Confirma a aplicação: empurra o bônus escolhido como `ModificacaoAplicadaDto` no item-alvo
   * (`ignoraLimiteTotal`/`ignoraLimiteProprio` — não conta no limite de mods da patente, doc: o
   * fragmento não é uma modificação comprada), remove o fragmento do inventário avulso (consumido) e
   * debita o custo de **acoplar** (Energia atual + Energia Máxima do módulo — m3-35). A Energia
   * Máxima da **aquisição** (drenada quando o fragmento entrou solto no inventário) é restituída
   * antes de aplicar o custo do acoplamento — sem isso, os dois custos se somavam e o total drenado
   * ficava o dobro do exemplo do documento ("acoplar um fragmento de módulo IV... custa... 7 de
   * Energia Máxima", não 14).
   */
  protected confirmarAplicarFragmento(fragmentoIndice: number): void {
    const alvoIndice = this.alvoFragmento();
    const opcaoIndice = this.opcaoBonusFragmento();
    if (alvoIndice === null || opcaoIndice === null || this.conflitoFuncaoFragmento()) {
      return;
    }
    const itens = this.inventario().itens;
    const fragmento = itens[fragmentoIndice];
    const alvo = itens[alvoIndice];
    const opcao = this.opcoesBonusFragmento()[opcaoIndice];
    if (!fragmento?.modulo || !alvo || !opcao) {
      return;
    }

    const modificacao = {
      nome: `Fragmento Potencializador — Módulo ${fragmento.modulo}`,
      empilhamentos: 1,
      efeitos: [opcao.efeito],
      ignoraLimiteTotal: true,
      ignoraLimiteProprio: true,
      origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: fragmento.modulo },
    };
    const novosItens = itens
      .map((item, i) => (i === alvoIndice ? { ...item, modificacoes: [...item.modificacoes, modificacao] } : item))
      .filter((_, i) => i !== fragmentoIndice);
    this.emitirItens(novosItens);

    // Afinidade (m3-42/m3-49): o fragmento já está portado em `itens` (ainda solto, antes do
    // acoplamento) — mesma Afinidade reduz os dois lados (aquisição restituída e acoplamento
    // debitado), preservando o líquido zero do Potencializador (docstring acima).
    const custo = this.custoLiquidoAplicarFragmento(fragmento.modulo, itens);
    this.ajusteEnergiaFragmento.emit({
      energiaAtual: this.energiaAtual() - custo.energia,
      energiaMaxima: this.energiaMaxima() + custo.energiaMaxima,
    });

    this.aplicandoFragmentoIndice.set(null);
  }

  /**
   * Custo líquido de **acoplar** um fragmento Potencializador de `modulo`, já reduzido pela
   * Afinidade atual (m3-42/m3-49) — `energia` é o débito de Energia atual; `energiaMaxima` é o
   * delta líquido em Energia Máxima (restituição da aquisição menos o custo do acoplamento; ambos
   * usam o mesmo custo base do módulo, então costuma fechar em 0). Extraído de
   * `confirmarAplicarFragmento` pra a prévia de custo do painel (m3-66) usar exatamente a mesma
   * conta, sem duplicar (proibição #26).
   */
  private custoLiquidoAplicarFragmento(
    modulo: FragmentoModuloEnum,
    itens: readonly CarrinhoItemDto[],
  ): { readonly energia: number; readonly energiaMaxima: number } {
    const afinidade = afinidadeConsiderando(itens);
    const custoAquisicao = aplicarReducaoAfinidade(
      custoAquisicaoFragmento(FragmentoTipoEnum.POTENCIALIZADOR, modulo),
      afinidade,
    );
    const custoBruto = custoAcoplarFragmento(modulo);
    const energia = aplicarReducaoAfinidade(custoBruto.energia, afinidade);
    const energiaMaximaAcoplamento = aplicarReducaoAfinidade(custoBruto.energiaMaxima, afinidade);
    return { energia, energiaMaxima: custoAquisicao - energiaMaximaAcoplamento };
  }

  /**
   * Prévia do custo de acoplar o fragmento com o painel "Aplicar em..." aberto (m3-66) — mesma
   * conta de `custoLiquidoAplicarFragmento` usada por `confirmarAplicarFragmento`, antecipada pra
   * exibição antes do jogador confirmar. `null` com o painel fechado.
   */
  protected readonly custoPreviaAplicarFragmento = computed<{
    readonly energia: number;
    readonly energiaMaxima: number;
  } | null>(() => {
    const indice = this.aplicandoFragmentoIndice();
    if (indice === null) {
      return null;
    }
    const fragmento = this.inventario().itens[indice];
    if (!fragmento?.modulo) {
      return null;
    }
    return this.custoLiquidoAplicarFragmento(fragmento.modulo, this.inventario().itens);
  });

  // === Consumir fragmento Potencializador (m3-42/m3-64) ===
  /** Abre o painel "Consumir" de um fragmento Potencializador, zerando a declaração de Vontade e a escolha de bônus. */
  protected abrirConsumirFragmento(indice: number): void {
    this.consumindoFragmentoIndice.set(indice);
    this.evitouSequelaConsumo.set(false);
    this.opcaoConsumoFragmento.set(null);
    this.atributoConsumoFragmento.set(null);
  }

  /** Fecha o painel "Consumir" sem alterar nada. */
  protected cancelarConsumirFragmento(): void {
    this.consumindoFragmentoIndice.set(null);
  }

  /** Alterna a declaração "evitei a sequela com o teste de Vontade" do painel "Consumir". */
  protected alternarEvitouSequelaConsumo(): void {
    this.evitouSequelaConsumo.update((valor) => !valor);
  }

  /** Escolhe a opção de bônus "Consumido" do `<select>` do painel "Consumir" (m3-64). */
  protected escolherOpcaoConsumoFragmento(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.opcaoConsumoFragmento.set(valor === '' ? null : Number(valor));
    this.atributoConsumoFragmento.set(null);
  }

  /** Escolhe o atributo-alvo do `<select>` "Atributo" do painel "Consumir", quando `tipo === 'TESTE'` (m3-64). */
  protected escolherAtributoConsumoFragmento(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.atributoConsumoFragmento.set(valor === '' ? null : (valor as keyof FichaAtributosDto));
  }

  /**
   * Confirma o **consumo**: exige um bônus "Consumido" escolhido (e um atributo-alvo quando o bônus
   * é de teste, m3-64), remove o fragmento do inventário avulso, restitui o dreno de Energia Máxima
   * da aquisição (doc — "⬥ Módulos": "esse gasto cessa ao remover o fragmento de seu inventário") e
   * debita o Preço de Sanidade — preço físico (Energia Máxima extra, sempre) e mental (sequela
   * "Rejeição Biológica" × multiplicador, só se o jogador não evitou com Vontade). A sequela, quando
   * emitida, carrega o módulo/tipo do fragmento e o bônus escolhido na `descricao` (m3-64). O
   * histórico dedicado (`dados.fragmentosConsumidos`, `fragmentoConsumido`) é incondicional e reversível.
   */
  protected confirmarConsumirFragmento(fragmentoIndice: number): void {
    const itensAntes = this.inventario().itens;
    const item = itensAntes[fragmentoIndice];
    const tipo = item ? tipoFragmentoDaCategoria(item.categoria) : null;
    const preco = this.precoSanidadeConsumo();
    const opcao = this.opcaoConsumoFragmentoEscolhida();
    const atributoEscolhido = this.atributoConsumoFragmento();
    if (!item?.modulo || !tipo || !preco || !opcao || (opcao.tipo === 'TESTE' && !atributoEscolhido)) {
      return;
    }

    this.emitirItens(itensAntes.filter((_, i) => i !== fragmentoIndice));

    // Afinidade (m3-42/m3-49) só reduz a restituição da aquisição — o Preço de Sanidade
    // (`energiaMaximaExtra`) é o preço físico de consumir o fragmento, não um "custo de fragmento".
    const custoAquisicao = this.custoAquisicaoReduzidoConsumo(tipo, item.modulo, itensAntes);
    this.ajusteEnergiaFragmento.emit({
      energiaAtual: this.energiaAtual(),
      energiaMaxima: this.energiaMaxima() + custoAquisicao - preco.energiaMaximaExtra,
    });

    this.bonusConsumoFragmento.emit({ opcao, atributoEscolhido: opcao.tipo === 'TESTE' ? atributoEscolhido : null });

    // Rastro incondicional (m3-64) — ao contrário da sequela abaixo, este registro entra sempre,
    // mesmo quando o jogador evita "Rejeição Biológica" com o teste de Vontade. É o único lugar que
    // garante o rastro do consumo em todo caso. Carrega também o suficiente para reverter o consumo
    // (m3-64, correção — "remover um fragmento consumido"): a opção estruturada, o delta de Energia
    // Máxima que este consumo aplicou e o próprio item, para devolvê-lo ao inventário.
    const bonusEscolhido = this.textoBonusConsumoFragmento(opcao, atributoEscolhido);
    this.fragmentoConsumido.emit({
      modulo: item.modulo,
      bonusEscolhido,
      opcao,
      atributoEscolhido: opcao.tipo === 'TESTE' ? atributoEscolhido : null,
      deltaEnergiaMaxima: custoAquisicao - preco.energiaMaximaExtra,
      item,
    });

    if (!this.evitouSequelaConsumo()) {
      const descricao = `Fragmento Potencializador Módulo ${item.modulo} consumido — ${bonusEscolhido}`;
      this.sequelasFragmentoConsumido.emit(
        Array.from({ length: preco.multiplicadorSequela }, () => ({
          nome: SEQUELA_CONSUMO_FRAGMENTO,
          descricao,
        })),
      );
    }

    this.consumindoFragmentoIndice.set(null);
  }

  /**
   * Texto do bônus "Consumido" escolhido (m3-64), ex.: `"+3 em Defesa"` ou, pro tipo teste, `"+5 em
   * todos os testes de Intelecto e +1 ponto no atributo"` (Módulo I). Alimenta tanto o registro
   * incondicional (`fragmentoConsumido`) quanto a `descricao` da sequela — só formatação de UI, não
   * é regra de jogo (`shared` cobre a tabela e o cardápio).
   */
  private textoBonusConsumoFragmento(
    opcao: OpcaoBonusConsumoFragmentoDto,
    atributoEscolhido: keyof FichaAtributosDto | null,
  ): string {
    return opcao.tipo === 'TESTE' && atributoEscolhido
      ? `+${opcao.valor} em todos os testes de ${this.rotulosAtributo[atributoEscolhido]}${
          opcao.concedePontoAtributo ? ' e +1 ponto no atributo' : ''
        }`
      : opcao.rotulo;
  }

  // === Recarregar Munição de Fragmento Construtor (m3-65) ===
  /**
   * "Recarregar" (doc — "⬦ Construtor", linha Munição: "Dura 1 cena. 'Recarregar' custa N de
   * Energia. Concede +N de dano.") — debita a Energia **atual** do módulo (custo de uma ação em
   * combate/cena, mesmo tipo de débito do custo de acoplar um Potencializador) e marca o item como
   * `recarregada`. Sem efeito se o item já está recarregada (evita debitar de novo sem antes
   * encerrar a cena — ver `resetarMunicaoConstrutor`).
   */
  protected recarregarMunicaoConstrutor(indice: number): void {
    const item = this.inventario().itens[indice];
    if (!item?.modulo || item.recarregada) {
      return;
    }
    this.emitirItens(
      this.inventario().itens.map((atual, i) => (i === indice ? { ...atual, recarregada: true } : atual)),
    );
    this.ajusteEnergiaFragmento.emit({
      energiaAtual: this.energiaAtual() - bonusMunicaoConstrutor(item.modulo).custoRecarregar,
      energiaMaxima: this.energiaMaxima(),
    });
  }

  /**
   * Encerra a cena pra esta munição (reset manual — doc: "Dura 1 cena"; sem sistema de cena
   * automatizado no app, `m3-65`): volta `recarregada` a `false`, sem reembolsar a Energia (já foi o
   * custo da cena que passou).
   */
  protected resetarMunicaoConstrutor(indice: number): void {
    this.emitirItens(
      this.inventario().itens.map((atual, i) => (i === indice ? { ...atual, recarregada: false } : atual)),
    );
  }

  /** Consome uma cena/disparo persistido, sem permitir saldo negativo. */
  protected consumirMunicao(indice: number): void {
    this.emitirItens(this.inventario().itens.map((item, i) =>
      i === indice && (item.contagemMunicao ?? criarContagemMunicao(item))
        ? { ...item, contagemMunicao: alterarContagemMunicao(item.contagemMunicao ?? criarContagemMunicao(item)!, -1) }
        : item,
    ));
    if (this.temporizadorContagemMunicao !== null) clearTimeout(this.temporizadorContagemMunicao);
    this.contagemMunicaoConsumidaIndice.set(indice);
    this.temporizadorContagemMunicao = setTimeout(() => {
      this.contagemMunicaoConsumidaIndice.update((atual) => atual === indice ? null : atual);
      this.temporizadorContagemMunicao = null;
    }, 900);
  }

  protected editarContagemMunicao(indice: number, campo: 'atual' | 'maxima'): void {
    this.contagemMunicaoEditando.set({ indice, campo });
  }

  protected confirmarContagemMunicao(indice: number, campo: 'atual' | 'maxima', valor: string): void {
    this.alterarContagemMunicao(indice, campo, Number(valor));
    this.contagemMunicaoEditando.set(null);
  }

  protected cancelarEdicaoContagemMunicao(): void {
    this.contagemMunicaoEditando.set(null);
  }

  /** Edição manual de Atual/Máxima: preserva o invariante do contrato. */
  protected alterarContagemMunicao(indice: number, campo: 'atual' | 'maxima', valor: number): void {
    this.emitirItens(this.inventario().itens.map((item, i) => {
      const contagem = item.contagemMunicao ?? criarContagemMunicao(item);
      if (i !== indice || !contagem) return item;
      const numero = Math.max(0, Math.trunc(valor));
      const maxima = campo === 'maxima' ? numero : contagem.maxima;
      const atual = campo === 'atual' ? Math.min(numero, maxima) : Math.min(contagem.atual, maxima);
      return { ...item, contagemMunicao: { ...contagem, atual, maxima } };
    }));
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

  /** Alterna "Equipado" numa Proteção (m3-36) — só as equipadas somam na resistência do Combate. */
  protected alternarEquipado(indice: number): void {
    this.emitirItens(
      this.inventario().itens.map((item, i) =>
        i === indice ? { ...item, equipado: !item.equipado } : item,
      ),
    );
  }

  /**
   * Rola o dano de uma arma direto do card (m3-45) — a fórmula sai de `item.danoFormula`
   * (`calcularStatItem`, m3-18: já traz mods/fragmentos aplicados) e roda no mesmo motor
   * (`rolarFormula`, `shared/regras/rolagem`) e bandeja (`BandejaDadosService`) usados pela Visão
   * Geral (`FichaVisualizacao.rolarDano`). Não é gated por `editavel()` — rolar não é uma ação de
   * edição da ficha (mesmo padrão de `rolarTesteAtributo`/`rolarDano` lá) — mas é gated por
   * `podeRolar()` (m3-51: visualizador não rola dados). Emite `rolagemFeita` (m3-27) — sem
   * `fichaId` aqui, quem persiste o histórico é `FichaVisualizacao`.
   */
  protected rolarDanoItem(item: ItemInventarioVM): void {
    if (!this.podeRolar() || !item.danoFormula) {
      return;
    }
    const resultado = rolarFormula({
      formula: item.danoFormula,
      atributos: this.atributos(),
      proficiencia: this.proficiencia(),
      nivel: this.nivel(),
    });
    if (resultado) {
      this.bandeja.mostrar({ rotulo: item.nomeExibido, formula: item.danoFormula, resultado });
      this.rolagemFeita.emit({ rotulo: item.nomeExibido, formula: item.danoFormula, resultado });
    }
  }

  /**
   * Move um item para dentro de um container próprio (`containerId`, m3-44 — Pochete/Bolso de
   * Corpo) ou de volta ao inventário principal (`null`). Sem trava de categoria/capacidade — a
   * seção do container e a linha "Inventário" marcam excedente como **aviso**, mesma filosofia
   * "liberdade total" do resto do motor.
   */
  protected moverItemParaContainer(indice: number, containerId: string | null): void {
    this.emitirItens(
      this.inventario().itens.map((item, i) =>
        i === indice ? { ...item, containerId: containerId ?? undefined } : item,
      ),
    );
  }

  /** Abre/fecha o menu "Mover para" (m3-44) de um item — só um por vez, como o painel "Modificar". */
  protected alternarMover(indice: number): void {
    this.moverAbertoIndice.update((atual) => (atual === indice ? null : indice));
  }

  /** Escolhe um destino no menu "Mover para" (m3-44): move o item e fecha o menu. */
  protected escolherContainer(indice: number, containerId: string | null): void {
    this.moverItemParaContainer(indice, containerId);
    this.moverAbertoIndice.set(null);
  }

  /** Abre a edição inline do apelido (m3-33) — só para categorias não-empilháveis. */
  protected editarApelido(indice: number): void {
    this.editandoApelidoIndice.set(indice);
  }

  /** Cancela a edição de apelido sem alterar. */
  protected cancelarApelido(): void {
    this.editandoApelidoIndice.set(null);
  }

  /** Confirma o apelido digitado (vazio remove o apelido, voltando ao nome mecânico). */
  protected confirmarApelido(indice: number, texto: string): void {
    if (this.editandoApelidoIndice() !== indice) {
      return;
    }
    this.editandoApelidoIndice.set(null);
    const apelido = texto.trim();
    this.emitirItens(
      this.inventario().itens.map((item, i) =>
        i === indice ? { ...item, apelido: apelido || undefined } : item,
      ),
    );
  }

  /**
   * Abre/fecha o painel "Modificar" de um item. No modo `inline` vários itens podem ficar abertos ao
   * mesmo tempo (cada um expande na própria lista); no modo `dialog` só um por vez faz sentido (um
   * `p-dialog` só mostra um item), então abrir um novo fecha o anterior.
   */
  protected alternarPainel(indice: number): void {
    const abertos = new Set(this.painelAbertos());
    if (abertos.has(indice)) {
      abertos.delete(indice);
    } else {
      if (this.apresentacao() === 'dialog') {
        abertos.clear();
      }
      abertos.add(indice);
    }
    this.painelAbertos.set(abertos);
  }

  /** Fecha o painel "Modificar" aberto (usado pelo `onHide` do dialog, modo `dialog`) e cancela a mod custom em edição. */
  protected fecharPainelDialog(): void {
    this.painelAbertos.set(new Set());
    this.criandoModIndice.set(null);
  }

  protected adicionarModificacao(indice: number, modNome: string): void {
    const item = this.inventario().itens[indice];
    if (!item) {
      return;
    }
    const definicao = listarModificacoesDisponiveis(item).find((mod) => mod.nome === modNome);
    const atuais = this.empilhamentosDaMod(item, modNome);
    const aplicada = item.modificacoes.find((mod) => mod.nome === modNome);
    // `ignoraLimiteProprio` libera o teto próprio da mod (catálogo ou custom).
    const ignoraProprio = aplicada?.ignoraLimiteProprio ?? false;
    // Modificação custom (sem definição de catálogo): sobe até o teto próprio da mod (salvo se liberado).
    if (!definicao) {
      const teto = aplicada?.empilhamentoMaximo ?? atuais;
      if (atuais > 0 && (ignoraProprio || atuais < teto)) {
        this.definirModificacao(indice, modNome, atuais + 1);
      }
      return;
    }
    // Conflito e teto próprio da mod são travas DURAS; os limites da PATENTE são brandos —
    // exceder é permitido e apenas marcado como "excedente" (não bloqueia).
    const conflito = verificarConflitoModificacao({ item, modificacao: modNome });
    if (conflito.bloqueadaPor.length > 0) {
      return;
    }
    const novos = atuais === 0 ? definicao.empilhamentosIniciais : atuais + 1;
    if (!ignoraProprio && novos > definicao.empilhamentoMaximo) {
      return;
    }
    this.definirModificacao(indice, modNome, novos);
  }

  /**
   * Remove um empilhamento de uma modificação (ou o último, sumindo com ela). Uma mod de **origem
   * fragmento Potencializador** (m3-35/m3-42) some sempre inteira (1× só) e vira
   * `desacoplarFragmento` — um caso à parte porque o fragmento **volta como item avulso** ao
   * inventário, não é destruído. O bônus fixo automático de um fragmento Construtor (m3-65) também
   * carrega `origemFragmento`, mas não "desacopla" — o fragmento **é** o item (não há outro alvo pra
   * devolver um Construtor avulso); some pelo caminho comum, como qualquer mod.
   */
  protected removerModificacao(indice: number, modNome: string): void {
    const item = this.inventario().itens[indice];
    if (!item) {
      return;
    }
    const atuais = this.empilhamentosDaMod(item, modNome);
    if (atuais === 0) {
      return;
    }
    const aplicada = item.modificacoes.find((mod) => mod.nome === modNome);
    const definicao = listarModificacoesDisponiveis(item).find((mod) => mod.nome === modNome);
    // Custom (sem definição): decrementa de 1 em 1 até sumir; de catálogo: piso nos iniciais.
    const minInicial = definicao ? definicao.empilhamentosIniciais : 1;
    const novos = atuais <= minInicial ? 0 : atuais - 1;
    if (novos === 0 && aplicada?.origemFragmento?.tipo === FragmentoTipoEnum.POTENCIALIZADOR) {
      this.desacoplarFragmento(indice, modNome, aplicada.nome, aplicada.origemFragmento.tipo, aplicada.origemFragmento.modulo);
      return;
    }
    this.definirModificacao(indice, modNome, novos);
  }

  /**
   * Desacopla uma mod de fragmento (m3-42): a mod some do item-alvo e o fragmento **volta como
   * item avulso** ao inventário — ele continua "no inventário" (doc — "⬥ Módulos": o gasto "cessa
   * ao remover o fragmento de seu inventário", não ao desacoplá-lo), então a Energia Máxima segue
   * drenando o mesmo valor de antes: restitui o custo do acoplamento e reaplica a aquisição — como
   * os dois valem o mesmo pra Potencializador, o líquido é 0. Só debita a Energia atual × 2 do
   * custo de remoção (doc: "removê-lo do item custa 14 de Energia" pro módulo IV). O fragmento só
   * para de contar energia quando o jogador de fato o remove do inventário (avulso) ou o consome.
   */
  private desacoplarFragmento(
    indiceAlvo: number,
    modNome: string,
    nomeFragmento: string,
    tipo: FragmentoTipoEnum,
    modulo: FragmentoModuloEnum,
  ): void {
    const categoria =
      tipo === FragmentoTipoEnum.CONSTRUTOR
        ? ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR
        : ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR;
    const fragmentoAvulso: CarrinhoItemDto = {
      nome: nomeFragmento,
      categoria,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
      modulo,
    };
    const itensAntes = this.inventario().itens;
    const itens = itensAntes.map((item, i) =>
      i === indiceAlvo
        ? { ...item, modificacoes: item.modificacoes.filter((mod) => mod.nome !== modNome) }
        : item,
    );
    this.emitirItens([...itens, fragmentoAvulso]);

    // Afinidade (m3-42/m3-49): o fragmento já está portado (acoplado) em `itensAntes` — mesma
    // Afinidade reduz os três termos, preservando o líquido zero de acoplamento↔desacoplamento.
    const afinidade = afinidadeConsiderando(itensAntes);
    const custoRemocao = aplicarReducaoAfinidade(custoRemoverFragmento(modulo), afinidade);
    const custoAquisicao = aplicarReducaoAfinidade(custoAquisicaoFragmento(tipo, modulo), afinidade);
    const energiaMaximaAcoplamento = aplicarReducaoAfinidade(
      custoAcoplarFragmento(modulo).energiaMaxima,
      afinidade,
    );
    this.ajusteEnergiaFragmento.emit({
      energiaAtual: this.energiaAtual() - custoRemocao,
      energiaMaxima: this.energiaMaxima() + energiaMaximaAcoplamento - custoAquisicao,
    });
  }

  /** Abre/fecha o formulário de modificação custom de um item. */
  protected alternarCriarMod(indice: number): void {
    if (this.criandoModIndice() === indice) {
      this.criandoModIndice.set(null);
      return;
    }
    this.modCustomForm.reset({
      nome: '',
      empilhamentoMaximo: 1,
      ignoraLimiteTotal: false,
      ignoraLimiteProprio: false,
      descricao: '',
    });
    this.efeitosMod.clear();
    this.criandoModIndice.set(indice);
  }

  /** A `FormArray` de efeitos da mod custom (tipada). */
  protected get efeitosMod(): FormArray<ReturnType<FichaInventario['criarEfeitoGrupo']>> {
    return this.modCustomForm.controls.efeitos;
  }

  /** Metadados de UI (rótulos/campos) do tipo de efeito atualmente escolhido numa linha. */
  protected metaEfeito(tipo: ModificacaoEfeitoTipoEnum): EfeitoTipoMeta {
    return metaEfeitoTipo(tipo);
  }

  /** Cria a `FormGroup` de uma linha de efeito, já com o tipo (e a variante padrão dele) definidos. */
  private criarEfeitoGrupo(tipo: ModificacaoEfeitoTipoEnum) {
    const meta = metaEfeitoTipo(tipo);
    return new FormGroup({
      tipo: new FormControl(tipo, { nonNullable: true }),
      valor: new FormControl(0, { nonNullable: true }),
      faces: new FormControl(6, { nonNullable: true }),
      tipoDano: new FormControl('', { nonNullable: true }),
      variante: new FormControl(meta.variantes?.[0]?.valor ?? '', { nonNullable: true }),
      condicao: new FormControl('', { nonNullable: true }),
      atributoDt: new FormControl('', { nonNullable: true }),
      duracaoTurnos: new FormControl(0, { nonNullable: true }),
    });
  }

  /** Adiciona uma linha de efeito (padrão: Dano fixo). */
  protected adicionarEfeitoMod(): void {
    this.efeitosMod.push(this.criarEfeitoGrupo(ModificacaoEfeitoTipoEnum.DANO_FIXO));
  }

  /** Remove a linha de efeito do índice. */
  protected removerEfeitoMod(indice: number): void {
    this.efeitosMod.removeAt(indice);
  }

  /** Ao trocar o tipo de uma linha, ajusta a variante para a primeira opção válida do novo tipo. */
  protected aoTrocarTipoEfeito(indice: number): void {
    const grupo = this.efeitosMod.at(indice);
    const meta = metaEfeitoTipo(grupo.controls.tipo.value);
    grupo.controls.variante.setValue(meta.variantes?.[0]?.valor ?? '');
  }

  /** Passo − / + num campo numérico (`valor`/`faces`/`duracaoTurnos`) de uma linha de efeito. */
  protected ajustarCampoEfeito(
    indice: number,
    campo: 'valor' | 'faces' | 'duracaoTurnos',
    delta: number,
    permiteNegativo = false,
  ): void {
    const controle = this.efeitosMod.at(indice).controls[campo];
    const piso = permiteNegativo ? -99 : 0;
    controle.setValue(Math.max(piso, controle.value + delta));
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
    // O campo do form é o TETO da mod; ela entra sempre em 1× e sobe até esse teto.
    const empilhamentoMaximo = Math.max(1, bruto.empilhamentoMaximo);
    const descricao = bruto.descricao.trim();
    const efeitos = this.montarEfeitosMod();
    const modificacao = {
      nome,
      empilhamentos: 1,
      empilhamentoMaximo,
      ...(descricao ? { descricao } : {}),
      ...(efeitos.length > 0 ? { efeitos } : {}),
      ...(bruto.ignoraLimiteTotal ? { ignoraLimiteTotal: true } : {}),
      ...(bruto.ignoraLimiteProprio ? { ignoraLimiteProprio: true } : {}),
    };
    const semMod = item.modificacoes.filter((atual) => atual.nome !== nome);
    this.emitirItens(
      this.inventario().itens.map((atual, i) =>
        i === indice ? { ...atual, modificacoes: [...semMod, modificacao] } : atual,
      ),
    );
    this.criandoModIndice.set(null);
  }

  /** Passo − / + no teto de empilhamentos do formulário de modificação custom (piso 1). */
  protected ajustarLimiteMod(delta: number): void {
    const controle = this.modCustomForm.controls.empilhamentoMaximo;
    controle.setValue(Math.max(1, controle.value + delta));
  }

  /**
   * Monta os efeitos **mecânicos** da mod custom a partir das linhas do form: cada linha vira um
   * `ModificacaoEfeitoDto` com só os campos do seu tipo. Linhas "vazias" (sem magnitude/condição) são
   * descartadas, para a mod não carregar efeito nulo. Ver `montarEfeitoLinha`.
   */
  private montarEfeitosMod(): ModificacaoEfeitoDto[] {
    return this.efeitosMod.controls
      .map((grupo) => this.montarEfeitoLinha(grupo.getRawValue()))
      .filter((efeito): efeito is ModificacaoEfeitoDto => efeito !== null);
  }

  /** Converte uma linha do form no `ModificacaoEfeitoDto` do seu tipo, ou `null` se não for significativa. */
  private montarEfeitoLinha(bruto: {
    tipo: ModificacaoEfeitoTipoEnum;
    valor: number;
    faces: number;
    tipoDano: string;
    variante: string;
    condicao: string;
    atributoDt: string;
    duracaoTurnos: number;
  }): ModificacaoEfeitoDto | null {
    const tipo = bruto.tipo;
    const tipoDano = bruto.tipoDano.trim();
    const T = ModificacaoEfeitoTipoEnum;
    switch (tipo) {
      case T.DANO_FIXO:
      case T.DANO_DADOS_BASE:
      case T.ELEVAR_DADO:
      case T.ALCANCE:
      case T.RAIO:
      case T.DURACAO:
      case T.INVENTARIO:
        return bruto.valor > 0 ? { tipo, valor: bruto.valor } : null;
      case T.PERFURACAO:
        return bruto.valor > 0 ? { tipo, valor: bruto.valor, ...(tipoDano ? { tipoDano } : {}) } : null;
      case T.DANO_DADOS:
        return bruto.valor > 0 && bruto.faces > 0
          ? { tipo, valor: bruto.valor, faces: bruto.faces, tipoDano: tipoDano || 'Físico' }
          : null;
      case T.RESISTENCIA:
        return bruto.valor !== 0 ? { tipo, valor: bruto.valor, ...(tipoDano ? { tipoDano } : {}) } : null;
      case T.BONUS_TESTE:
      case T.DEFESA:
        return bruto.valor > 0 ? { tipo, valor: bruto.valor, variante: bruto.variante } : null;
      case T.CONDICAO: {
        const condicao = bruto.condicao.trim();
        const atributoDt = bruto.atributoDt.trim();
        return condicao
          ? {
              tipo,
              condicao,
              ...(atributoDt ? { atributoDt } : {}),
              ...(bruto.duracaoTurnos > 0 ? { duracaoTurnos: bruto.duracaoTurnos } : {}),
            }
          : null;
      }
      default:
        return null;
    }
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
    // A aquisição entra de uma vez com `empilhamentosIniciais` (2 pra Conservador/Veloz) — checar
    // contra o total real, não +1 fixo, senão o limite (Vontade × 3) pode passar direto.
    if (totalStacks + definicao.empilhamentosIniciais <= limite) {
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

  protected alternarMostrarCustos(): void {
    this.mostrarCustos.update((mostrar) => !mostrar);
  }

  /** Seleciona o filtro de visualização do Inventário (controle segmentado — sempre um ativo). */
  protected selecionarFiltroInventario(filtro: FiltroInventario): void {
    this.filtroInventario.set(filtro);
  }

  /** Abre a barra de busca de itens — substitui a linha de ações inteira (botão de lupa). */
  protected abrirBuscaItens(): void {
    this.buscandoItens.set(true);
  }

  /** Fecha a barra de busca de itens (botão "X") e limpa o termo digitado. */
  protected fecharBuscaItens(): void {
    this.buscandoItens.set(false);
    this.buscaItens.setValue('');
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
    // Armazenamento vestido (não guardado) não ocupa slots → "0 slots"; guardado/demais usam o peso real.
    const pesoTexto = `${this.formatarPeso(contaPeso ? pesoBruto : 0)} slots`;

    const statComputado = calcularStatItem({ item });
    const definicoes = listarModificacoesDisponiveis(item);
    // Acumula os empilhamentos na ordem para marcar como "excedente" o que passa do limite da patente.
    let acumuladoStacks = 0;
    const modsAtivas: ModAtivaVM[] = item.modificacoes.map((modificacao) => {
      const definicao = definicoes.find((mod) => mod.nome === modificacao.nome);
      const custo =
        contarComprasModificacao({
          item,
          modificacao: modificacao.nome,
          empilhamentos: modificacao.empilhamentos,
        }) * obterCustoModificacao({ item, modificacao: modificacao.nome });
      // Teto próprio da mod (catálogo: da definição; custom: o limite gravado nela) — trava dura,
      // a menos que a mod esteja marcada `ignoraLimiteProprio`.
      const tetoProprio = definicao
        ? definicao.empilhamentoMaximo
        : modificacao.empilhamentoMaximo ?? modificacao.empilhamentos;
      const ignoraTotal = modificacao.ignoraLimiteTotal ?? false;
      const ignoraProprio = modificacao.ignoraLimiteProprio ?? false;
      // Só as mods que contam entram no acumulado do total da arma.
      if (!ignoraTotal) {
        acumuladoStacks += modificacao.empilhamentos;
      }
      const excedeTotal = !ignoraTotal && acumuladoStacks > limite.maxModificacoes;
      const excedeStack = !ignoraProprio && modificacao.empilhamentos > limite.maxEmpilhamentos;
      return {
        nome: modificacao.nome,
        empilhamentos: modificacao.empilhamentos,
        custoTexto: this.formatarDinheiro(custo),
        // Sobe até o teto PRÓPRIO (ou livre, se `ignoraProprio`); a patente não trava (excedente é permitido).
        podeAumentar: ignoraProprio || modificacao.empilhamentos < tetoProprio,
        excedente: excedeTotal || excedeStack,
        ignoraTotal,
        ignoraProprio,
        // Chip da mod custom: os efeitos mecânicos gerados + a nota livre (o que houver).
        descricao:
          [descreverEfeitosModificacao(modificacao.efeitos), modificacao.descricao?.trim()]
            .filter((parte): parte is string => !!parte)
            .join(' — ') || null,
        deFragmento: !!modificacao.origemFragmento,
        fixa: modificacao.origemFragmento?.tipo === FragmentoTipoEnum.CONSTRUTOR,
      };
    });

    const construtorMunicao =
      item.categoria === ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR &&
      item.categoriaEmprestada === ItemCategoriaEnum.MUNICOES;
    const bonusMunicao = construtorMunicao && item.modulo ? bonusMunicaoConstrutor(item.modulo) : null;
    const contagemMunicao = item.contagemMunicao ?? criarContagemMunicao(item);
    const ehFragmento =
      item.categoria === ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR ||
      item.categoria === ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR;
    const apelido = item.apelido?.trim() || null;

    return {
      indice,
      nome: item.nome,
      apelido,
      // Sem apelido, o card destaca a categoria ("Fragmento Potencializador") em vez do nome
      // mecânico completo — o módulo vai pro `fragmentoModuloTexto`, exibido logo abaixo.
      nomeExibido: apelido || (ehFragmento ? this.rotuloCategoria(item.categoria) : item.nome),
      fragmentoModuloTexto: ehFragmento && item.modulo ? `Mod. ${item.modulo}` : null,
      podeApelidar: !CATEGORIAS_EMPILHAVEIS.includes(item.categoria),
      fragmentoPotencializador: item.categoria === ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
      contagemMunicao,
      municaoVazia: contagemMunicao?.atual === 0,
      fragmentoConstrutorMunicao: construtorMunicao,
      recarregada: item.recarregada === true,
      bonusMunicaoTexto: bonusMunicao
        ? `Recarregar: ${bonusMunicao.custoRecarregar} Energia → +${bonusMunicao.dano} de dano (1 cena)`
        : null,
      categoria: item.categoria,
      categoriaRotulo: this.rotuloCategoria(item.categoria),
      quantidade: item.quantidade,
      custoTotalTexto: this.formatarDinheiro(custoTotal),
      pesoTexto,
      stat: this.formatarStat(statComputado),
      danoFormula: statComputado?.dano ?? null,
      descricao: item.descricao ?? null,
      modificavel: !CATEGORIAS_NAO_MODIFICAVEIS.includes(item.categoria),
      ehArmazenamento,
      guardada: item.guardada,
      ehProtecao: item.categoria === ItemCategoriaEnum.PROTECOES,
      equipado: item.equipado === true,
      modsUsados,
      maxModificacoes: limite.maxModificacoes,
      excedeModsLimite: modsUsados > limite.maxModificacoes,
      temMods: definicoes.length > 0,
      painelAberto: this.painelAbertos().has(indice),
      modsAtivas,
      secoes: this.montarSecoes(item, modsUsados, limite),
      containerId: item.containerId ?? null,
    };
  }

  private montarSecoes(
    item: CarrinhoItemDto,
    modsUsados: number,
    limite: { maxEmpilhamentos: number; maxModificacoes: number },
  ): SecaoModVM[] {
    const secoes: SecaoModVM[] = [];
    // `listarModificacoesCategoria` recorta as mods "Apenas para escudos" quando o item não é escudo.
    const proprias = listarModificacoesCategoria(item, item.categoria);
    if (proprias.length > 0) {
      secoes.push({
        titulo: null,
        entradas: proprias.map((mod) => this.montarEntradaMod(item, mod, modsUsados, limite)),
      });
    }
    const categoriaEmprestada = obterCategoriaEmprestada(item);
    const emprestadas = categoriaEmprestada ? listarModificacoesCategoria(item, categoriaEmprestada) : [];
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
    // Limites da PATENTE são brandos: adicionar além deles é permitido (só marca "excedente").
    const excedeStack = proximos > limite.maxEmpilhamentos;
    const excedeMods = modsUsados + aAdicionar > limite.maxModificacoes;
    // Teto próprio da mod e conflitos são travas DURAS (bloqueiam de fato).
    const excedeMaximo = atuais >= definicao.empilhamentoMaximo;
    const podeAdicionar = !bloqueadaPorAtiva && !bloqueiaAtiva && !excedeMaximo;
    const excedente = podeAdicionar && (excedeStack || excedeMods);

    let motivo = '';
    if (bloqueadaPorAtiva) {
      motivo = 'Bloqueado';
    } else if (bloqueiaAtiva) {
      motivo = 'Bloqueia mod ativa';
    } else if (excedeMaximo) {
      motivo = 'Máx. empilhamento';
    } else if (excedente) {
      motivo = 'Excede patente';
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
      excedente,
    };
  }

  // === Helpers de mutação ===
  private definirModificacao(indice: number, modNome: string, empilhamentos: number): void {
    this.emitirItens(
      this.inventario().itens.map((item, i) => {
        if (i !== indice) {
          return item;
        }
        const existente = item.modificacoes.find((modificacao) => modificacao.nome === modNome);
        let modificacoes: CarrinhoItemDto['modificacoes'];
        if (empilhamentos <= 0) {
          modificacoes = item.modificacoes.filter((modificacao) => modificacao.nome !== modNome);
        } else if (existente) {
          // Preserva descrição/efeitos/teto da mod ao só mudar os empilhamentos (na ordem original).
          modificacoes = item.modificacoes.map((modificacao) =>
            modificacao.nome === modNome ? { ...modificacao, empilhamentos } : modificacao,
          );
        } else {
          modificacoes = [...item.modificacoes, { nome: modNome, empilhamentos }];
        }
        const contagem = item.contagemMunicao ?? criarContagemMunicao(item);
        const tinhaMunicaoExtra = modNome === 'Munição Extra' && (existente?.empilhamentos ?? 0) > 0;
        const temMunicaoExtra = modNome === 'Munição Extra' && empilhamentos > 0;
        if (!contagem || contagem.unidade !== 'CENA' || tinhaMunicaoExtra === temMunicaoExtra) {
          return { ...item, modificacoes };
        }
        const delta = temMunicaoExtra ? 1 : -1;
        const maxima = Math.max(0, contagem.maxima + delta);
        return { ...item, modificacoes, contagemMunicao: { ...contagem, maxima, atual: Math.min(maxima, Math.max(0, contagem.atual + delta)) } };
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

  /** Total de empilhamentos que contam no limite da arma — mods marcadas `ignoraLimiteTotal` ficam de fora. */
  private modsUsados(item: CarrinhoItemDto): number {
    return item.modificacoes.reduce(
      (soma, modificacao) => soma + (modificacao.ignoraLimiteTotal ? 0 : modificacao.empilhamentos),
      0,
    );
  }

  /** Alterna uma flag booleana (`ignoraLimiteTotal`/`ignoraLimiteProprio`) de uma mod, preservando o resto. */
  private alternarFlagMod(
    indice: number,
    modNome: string,
    flag: 'ignoraLimiteTotal' | 'ignoraLimiteProprio',
  ): void {
    this.emitirItens(
      this.inventario().itens.map((item, i) => {
        if (i !== indice) {
          return item;
        }
        return {
          ...item,
          modificacoes: item.modificacoes.map((modificacao) =>
            modificacao.nome === modNome ? { ...modificacao, [flag]: !modificacao[flag] } : modificacao,
          ),
        };
      }),
    );
  }

  protected alternarIgnoraTotal(indice: number, modNome: string): void {
    this.alternarFlagMod(indice, modNome, 'ignoraLimiteTotal');
  }

  protected alternarIgnoraProprio(indice: number, modNome: string): void {
    this.alternarFlagMod(indice, modNome, 'ignoraLimiteProprio');
  }

  protected rotuloCategoria(categoria: ItemCategoriaEnum): string {
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
