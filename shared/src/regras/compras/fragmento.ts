import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  ModificacaoEfeitoTipoEnum,
} from '../../enums';
import {
  BONUS_CONSUMIDO,
  BONUS_POTENCIALIZADOR,
  CUSTO_ENERGIA_MAXIMA_MODULO,
  MULTIPLICADOR_MAIOR_DADO_MODULO,
  VALOR_AFINIDADE_MODULO,
} from './fragmento.dados';
import { resolverDadosItem } from './compras';
import { CarrinhoItemDto, ModificacaoAplicadaDto, ModificacaoEfeitoDto } from './compras.dtos';

/**
 * Custos de Energia, Afinidade e Preço de Sanidade dos Fragmentos (m3-35/m3-42) — funções puras
 * conferidas contra `docs/core/sistema-v4.1.0.md` — "⬡ Fragmentos" (ver `fragmento.dados.ts` para
 * o que fica de fora).
 */

/**
 * Custo em Energia Máxima de **adquirir** um fragmento — o dobro para Construtor (doc — "⬦
 * Construtor").
 */
export function custoAquisicaoFragmento(tipo: FragmentoTipoEnum, modulo: FragmentoModuloEnum): number {
  const base = CUSTO_ENERGIA_MAXIMA_MODULO[modulo];
  return tipo === FragmentoTipoEnum.CONSTRUTOR ? base * 2 : base;
}

/** Débito de Energia atual **e** Energia Máxima ao **acoplar** um Potencializador a um item/ser. */
export interface CustoAcoplarFragmentoDto {
  readonly energia: number;
  readonly energiaMaxima: number;
}

/**
 * Custo de **acoplar** um fragmento Potencializador (doc — "⬥ Acoplamento": "acoplar um fragmento
 * de módulo IV em um item custa 7 de Energia + 7 de Energia Máxima"). Só Potencializador acopla —
 * Construtor **é** a peça, não se prende a outra.
 */
export function custoAcoplarFragmento(modulo: FragmentoModuloEnum): CustoAcoplarFragmentoDto {
  const custo = CUSTO_ENERGIA_MAXIMA_MODULO[modulo];
  return { energia: custo, energiaMaxima: custo };
}

/** Custo de **remover** (desacoplar) um fragmento aplicado: Energia × 2 (doc — "⬥ Acoplamento"). */
export function custoRemoverFragmento(modulo: FragmentoModuloEnum): number {
  return CUSTO_ENERGIA_MAXIMA_MODULO[modulo] * 2;
}

/**
 * Maior tipo de dado (faces) do campo `dano` (string livre, ex.: `"2D8+3"`, `"1D6+1D8 [Físico]"`)
 * de um item de inventário — primitiva da 5ª opção do cardápio do Potencializador, "N× valor
 * máximo do maior tipo de dado" (doc — tabela "⬦ Potencializador"; `m3-63`). Resolve o `dano` tanto
 * de um item do catálogo quanto de um item custom (via `resolverDadosItem`, mesma fonte de
 * `calcularStatItem`). Casa toda ocorrência `D<n>` no texto e devolve a maior; `null` quando o item
 * não tem dado algum no campo (ausente ou notação sem nenhum `D<n>`, ex.: `"— (fumaça)"`).
 */
export function maiorDadoItem(item: CarrinhoItemDto): number | null {
  const dano = resolverDadosItem(item)?.dano;
  if (!dano) {
    return null;
  }
  const faces = [...dano.matchAll(/D(\d+)/gi)].map((correspondencia) => Number(correspondencia[1]));
  return faces.length > 0 ? Math.max(...faces) : null;
}

/** Uma opção selecionável do cardápio de bônus "em um item" do Potencializador. */
export interface OpcaoBonusFragmentoDto {
  readonly rotulo: string;
  readonly efeito: ModificacaoEfeitoDto;
}

/**
 * Cardápio de bônus "em um item" de um fragmento Potencializador de `modulo` — o jogador escolhe
 * UMA opção ao aplicar (doc — "⬦ Potencializador", tabela). Mapeado aos `ModificacaoEfeitoTipoEnum`
 * já existentes (`DANO_DADOS_BASE`/`BONUS_TESTE`/`DANO_FIXO`/`RESISTENCIA`) — zero motor novo em
 * `calcularStatItem`, que já soma esses tipos vindos de qualquer modificação custom.
 *
 * `maiorDado` (faces do maior dado do **alvo** já escolhido, `maiorDadoItem` — `m3-63`) liga a 5ª
 * opção da tabela, "N× valor máximo do maior tipo de dado" ao dano (mesmo `DANO_FIXO` da opção "de
 * dano (efeito)", só que o valor vem de `multiplicador × faces` em vez do `valorFixo` do módulo):
 * `null` (nenhum alvo escolhido ainda, ou alvo sem dado no campo `dano`) omite a opção — "não faz
 * sentido '1× o maior dado' de um item sem dado de dano" (spec).
 */
export function listarBonusFragmentoPotencializador(
  modulo: FragmentoModuloEnum,
  maiorDado: number | null = null,
): readonly OpcaoBonusFragmentoDto[] {
  const valores = BONUS_POTENCIALIZADOR[modulo];
  const opcoes: OpcaoBonusFragmentoDto[] = [
    {
      rotulo: `+${valores.dadosBase} dados no dado base (dano)`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: valores.dadosBase },
    },
  ];
  if (maiorDado !== null) {
    const multiplicador = MULTIPLICADOR_MAIOR_DADO_MODULO[modulo];
    opcoes.push({
      rotulo: `${multiplicador}× o maior dado do alvo (D${maiorDado}) — +${multiplicador * maiorDado} de dano`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: multiplicador * maiorDado },
    });
  }
  opcoes.push(
    {
      rotulo: `+${valores.dadoTeste} dado(s) no teste`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: valores.dadoTeste, variante: 'DADO' },
    },
    {
      rotulo: `+${valores.valorFixo} no teste`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: valores.valorFixo, variante: 'FIXO' },
    },
    {
      rotulo: `+${valores.valorFixo} de dano (efeito)`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: valores.valorFixo },
    },
    {
      rotulo: `+${valores.valorFixo} de resistência`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: valores.valorFixo },
    },
  );
  return opcoes;
}

/**
 * "Função" que um efeito de fragmento cumpre — dano, teste ou resistência (doc — "⬦
 * Potencializador": "um item/ser pode conter mais de um fragmento, mas para apenas uma única
 * função... uma arma não pode ter 2 fragmentos aumentando seu dano... mas pode ter 2 fragmentos,
 * uma para o dano e outro para o teste"). `DANO_DADOS_BASE` e `DANO_FIXO` contam como a mesma
 * função "dano" (dados a mais ou valor fixo a mais são as duas formas do cardápio de "aumentar o
 * dano"); `BONUS_TESTE` conta como "teste" independente da `variante` (dado ou fixo, mesma
 * função); `null` para efeitos fora do cardápio do Potencializador (não participam da checagem).
 */
function funcaoFragmento(efeito: ModificacaoEfeitoDto): 'DANO' | 'TESTE' | 'RESISTENCIA' | null {
  switch (efeito.tipo) {
    case ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE:
    case ModificacaoEfeitoTipoEnum.DANO_FIXO:
      return 'DANO';
    case ModificacaoEfeitoTipoEnum.BONUS_TESTE:
      return 'TESTE';
    case ModificacaoEfeitoTipoEnum.RESISTENCIA:
      return 'RESISTENCIA';
    default:
      return null;
  }
}

/**
 * `true` quando o `efeito` escolhido no cardápio colide em função com um fragmento **já aplicado**
 * no alvo (`origemFragmento` presente na modificação — doc: "uma única função" por item/ser,
 * `m3-63`). Só compara contra modificações de origem Fragmento; uma modificação comum (comprada do
 * catálogo ou custom sem `origemFragmento`) com o mesmo tipo de efeito nunca bloqueia — a regra é
 * só entre fragmentos.
 */
export function existeFragmentoNaMesmaFuncao(
  modificacoesAlvo: readonly ModificacaoAplicadaDto[],
  efeito: ModificacaoEfeitoDto,
): boolean {
  const funcao = funcaoFragmento(efeito);
  if (!funcao) {
    return false;
  }
  return modificacoesAlvo.some(
    (modificacao) =>
      !!modificacao.origemFragmento &&
      (modificacao.efeitos ?? []).some((efeitoExistente) => funcaoFragmento(efeitoExistente) === funcao),
  );
}

/** A qual stat do agente uma opção do cardápio "Consumido" se destina (m3-64). */
export type TipoBonusConsumoFragmento = 'TESTE' | 'DEFESA' | 'DANO_CORPO';

/** Uma opção selecionável do cardápio de bônus "Consumido" do Potencializador. */
export interface OpcaoBonusConsumoFragmentoDto {
  readonly rotulo: string;
  readonly tipo: TipoBonusConsumoFragmento;
  readonly valor: number;
  /**
   * Só `true` em `tipo === 'TESTE'` do Módulo I — doc: "única forma de ultrapassar limite de 6
   * pontos em um atributo é consumindo um Fragmento de Módulo I". Ausente (não só `false`) nos
   * demais módulos/tipos.
   */
  readonly concedePontoAtributo?: boolean;
}

/**
 * Cardápio de bônus **Consumido** de um fragmento Potencializador de `modulo` — o jogador escolhe
 * UMA opção ao consumir (doc — "⬦ Potencializador", tabela, coluna "Consumido"). Função pura irmã
 * de `listarBonusFragmentoPotencializador`; ao contrário dela, o bônus aqui não vira Modificação de
 * item — é aplicado direto ao agente (`shared/regras/agente/fragmento-consumo`).
 */
export function listarBonusConsumoFragmentoPotencializador(
  modulo: FragmentoModuloEnum,
): readonly OpcaoBonusConsumoFragmentoDto[] {
  const valores = BONUS_CONSUMIDO[modulo];
  const concedePontoAtributo = modulo === FragmentoModuloEnum.I;
  return [
    {
      rotulo: `+${valores.teste} em todos os testes do atributo à escolha${
        concedePontoAtributo ? ' e +1 ponto no atributo' : ''
      }`,
      tipo: 'TESTE',
      valor: valores.teste,
      ...(concedePontoAtributo ? { concedePontoAtributo: true as const } : {}),
    },
    { rotulo: `+${valores.defesa} em Defesa`, tipo: 'DEFESA', valor: valores.defesa },
    { rotulo: `+${valores.danoCorpo} de dano do Corpo`, tipo: 'DANO_CORPO', valor: valores.danoCorpo },
  ];
}

// === Afinidade (m3-42) ===

/** Afinidade que um único fragmento de `modulo` contribui (doc — "⬥ Afinidade com Fragmentos"). */
export function valorAfinidadeFragmento(modulo: FragmentoModuloEnum): number {
  return VALOR_AFINIDADE_MODULO[modulo];
}

/** Afinidade total de um agente: soma da Afinidade de cada fragmento portado (mesma seção do doc). */
export function calcularAfinidade(modulosPortados: readonly FragmentoModuloEnum[]): number {
  return modulosPortados.reduce((total, modulo) => total + valorAfinidadeFragmento(modulo), 0);
}

/**
 * Módulos de todos os fragmentos **portados** pelo agente (doc — "⬥ Afinidade com Fragmentos": "para
 * cada fragmento portado"): os ainda **soltos** no inventário (Construtor **é** o próprio item;
 * Potencializador solto até ser acoplado, `m3-35`) **e** os já **acoplados** a outro item como
 * Modificação (`origemFragmento`, `m3-42` — acoplar remove o item avulso e o dobra numa mod do
 * alvo, então só conta aqui, não duas vezes). Um fragmento solto em stack (`quantidade` > 1) conta
 * uma vez por unidade; um acoplado conta uma vez por modificação (nunca empilha — cada acoplamento
 * gera sua própria entrada em `modificacoes`). Entrada de `calcularAfinidade`.
 */
export function listarModulosFragmentosPortados(
  itens: readonly CarrinhoItemDto[],
): FragmentoModuloEnum[] {
  const soltos = itens
    .filter(
      (item) =>
        (item.categoria === ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR ||
          item.categoria === ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR) &&
        item.modulo,
    )
    .flatMap((item) => Array<FragmentoModuloEnum>(item.quantidade).fill(item.modulo!));
  const acoplados = itens.flatMap((item) =>
    item.modificacoes
      .filter((modificacao) => modificacao.origemFragmento)
      .map((modificacao) => modificacao.origemFragmento!.modulo),
  );
  return [...soltos, ...acoplados];
}

/**
 * Redução de Energia no custo de fragmentos por excesso de Afinidade acima de 10 (doc: "acima de
 * 10... redução... igual a -1 de Energia para cada 2 pontos excedidos do limite de afinidade").
 */
export function reducaoCustoPorAfinidade(afinidade: number): number {
  return Math.floor(Math.max(0, afinidade - 10) / 2);
}

/**
 * Aplica a redução de Afinidade a um custo de Energia de fragmento, sem nunca zerá-lo (doc: "Não é
 * possível anular o custo de um fragmento... deve ter o custo de, no mínimo, 1 de Energia Máxima").
 */
export function aplicarReducaoAfinidade(custo: number, afinidade: number): number {
  return Math.max(1, custo - reducaoCustoPorAfinidade(afinidade));
}

// === Preço de Sanidade do Consumo (m3-42) ===

/** Preço de Sanidade (mental + físico) de **consumir** um fragmento (doc — "⬦ Consumo de Fragmentos"). */
export interface PrecoSanidadeConsumoDto {
  /** Quantas vezes a sequela "Rejeição Biológica" é aplicada (doc: "multiplicada por Módulo - 6"). */
  readonly multiplicadorSequela: number;
  /** DT de Vontade para evitar a sequela (doc: "DT 7 + (Módulo - 6) × 5"). */
  readonly dtEvitarVontade: number;
  /**
   * Energia Máxima adicional perdida — preço físico, cobrado independente do teste de Vontade
   * (doc: "removendo ainda mais de sua Energia Máxima, sendo igual ao custo do módulo multiplicado
   * por 3").
   */
  readonly energiaMaximaExtra: number;
}

/**
 * Preço de Sanidade de **consumir** um fragmento de `modulo` (doc — "⬦ Consumo de Fragmentos").
 * Exemplo do documento: módulo IV remove 21 de Energia Máxima extra (custo 7 × 3).
 */
export function custoSanidadeConsumirFragmento(modulo: FragmentoModuloEnum): PrecoSanidadeConsumoDto {
  const multiplicadorSequela = valorAfinidadeFragmento(modulo);
  return {
    multiplicadorSequela,
    dtEvitarVontade: 7 + multiplicadorSequela * 5,
    energiaMaximaExtra: CUSTO_ENERGIA_MAXIMA_MODULO[modulo] * 3,
  };
}
