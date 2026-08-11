import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  ModificacaoEfeitoTipoEnum,
} from '../../enums';
import {
  BONUS_CONSUMIDO,
  BONUS_FIXO_CONSTRUTOR,
  BONUS_POTENCIALIZADOR,
  BonusFixoMunicaoConstrutorDados,
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
 * Construtor"). `possuiAnomalia` (habilidade de Subclasse do Experimento Artificial, `P-013`;
 * `experimentoComAnomalia`) dobra o resultado por cima — as duas duplicações se acumulam, doc:
 * "Fragmentos custam o dobro de Energia em seu uso" não abre exceção para Construtor.
 */
export function custoAquisicaoFragmento(
  tipo: FragmentoTipoEnum,
  modulo: FragmentoModuloEnum,
  possuiAnomalia = false,
): number {
  const base = CUSTO_ENERGIA_MAXIMA_MODULO[modulo];
  const custo = tipo === FragmentoTipoEnum.CONSTRUTOR ? base * 2 : base;
  return possuiAnomalia ? custo * 2 : custo;
}

/** Débito de Energia atual **e** Energia Máxima ao **acoplar** um Potencializador a um item/ser. */
export interface CustoAcoplarFragmentoDto {
  readonly energia: number;
  readonly energiaMaxima: number;
}

/**
 * Custo de **acoplar** um fragmento Potencializador (doc — "⬥ Acoplamento": "acoplar um fragmento
 * de módulo IV em um item custa 7 de Energia + 7 de Energia Máxima"). Só Potencializador acopla —
 * Construtor **é** a peça, não se prende a outra. `possuiAnomalia` dobra os dois valores (`P-013`).
 */
export function custoAcoplarFragmento(
  modulo: FragmentoModuloEnum,
  possuiAnomalia = false,
): CustoAcoplarFragmentoDto {
  const custo = CUSTO_ENERGIA_MAXIMA_MODULO[modulo] * (possuiAnomalia ? 2 : 1);
  return { energia: custo, energiaMaxima: custo };
}

/**
 * Custo de **remover** (desacoplar) um fragmento aplicado: Energia × 2 (doc — "⬥ Acoplamento").
 * `possuiAnomalia` dobra o resultado por cima (`P-013`) — remover também é "uso" de Energia do
 * Fragmento.
 */
export function custoRemoverFragmento(modulo: FragmentoModuloEnum, possuiAnomalia = false): number {
  const custo = CUSTO_ENERGIA_MAXIMA_MODULO[modulo] * 2;
  return possuiAnomalia ? custo * 2 : custo;
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
 * já existentes (`EFEITO`/`BONUS_TESTE`/`DANO_FIXO`/`RESISTENCIA`) — zero motor novo em
 * `calcularStatItem`, que já soma os tipos de dano vindos de qualquer modificação custom (`EFEITO`
 * é descritivo, como `BONUS_TESTE`).
 *
 * **Efeito é diferente de dano** (`m3-68`, correção sobre `m3-63`): as opções "+N dados" e "+N no
 * valor → efeito" do doc reforçam o **efeito** do item (ex.: "Em Chamas" de uma granada, separado do
 * dano), nunca somam a `dano` — por isso usam `EFEITO`, não `DANO_DADOS_BASE`/`DANO_FIXO`. Só "N×
 * valor máximo do maior tipo de dado" é dano de verdade (`DANO_FIXO`).
 *
 * `maiorDado` (faces do maior dado do **alvo** já escolhido, `maiorDadoItem` — `m3-63`) liga a
 * opção "N× valor máximo do maior tipo de dado" ao dano: `null` (nenhum alvo escolhido ainda, ou
 * alvo sem dado no campo `dano`) omite a opção — "não faz sentido '1× o maior dado' de um item sem
 * dado de dano" (spec).
 *
 * `possuiAnomalia` (habilidade de Subclasse do Experimento Artificial, `P-013`;
 * `experimentoComAnomalia`) dobra o valor de **todas** as opções — doc: "têm todos os seus efeitos
 * dobrados". O multiplicador "N×" do dano fixo é dado do módulo (`MULTIPLICADOR_MAIOR_DADO_MODULO`),
 * então dobrar o valor final (`multiplicador * maiorDado`) já cobre essa opção.
 */
export function listarBonusFragmentoPotencializador(
  modulo: FragmentoModuloEnum,
  maiorDado: number | null = null,
  possuiAnomalia = false,
): readonly OpcaoBonusFragmentoDto[] {
  const dobro = possuiAnomalia ? 2 : 1;
  const valores = BONUS_POTENCIALIZADOR[modulo];
  const dadosBase = valores.dadosBase * dobro;
  const dadoTeste = valores.dadoTeste * dobro;
  const valorFixo = valores.valorFixo * dobro;
  const opcoes: OpcaoBonusFragmentoDto[] = [
    {
      rotulo: `+${dadosBase} dados de efeito`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.EFEITO, valor: dadosBase, variante: 'DADO' },
    },
  ];
  if (maiorDado !== null) {
    const danoFixo = MULTIPLICADOR_MAIOR_DADO_MODULO[modulo] * maiorDado * dobro;
    opcoes.push({
      rotulo: `${MULTIPLICADOR_MAIOR_DADO_MODULO[modulo]}× o maior dado do alvo (D${maiorDado}) — +${danoFixo} de dano`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: danoFixo },
    });
  }
  opcoes.push(
    {
      rotulo: `+${dadoTeste} dado(s) no teste`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: dadoTeste, variante: 'DADO' },
    },
    {
      rotulo: `+${valorFixo} no teste`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: valorFixo, variante: 'FIXO' },
    },
    {
      rotulo: `+${valorFixo} no efeito`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.EFEITO, valor: valorFixo, variante: 'FIXO' },
    },
    {
      rotulo: `+${valorFixo} de resistência`,
      efeito: { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: valorFixo },
    },
  );
  return opcoes;
}

/**
 * "Função" que um efeito de fragmento cumpre — dano, teste, efeito ou resistência (doc — "⬦
 * Potencializador": "um item/ser pode conter mais de um fragmento, mas para apenas uma única
 * função... uma arma não pode ter 2 fragmentos aumentando seu dano... mas pode ter 2 fragmentos,
 * uma para o dano e outro para o teste"). `DANO_FIXO` (só a opção "N× maior dado", dano de
 * verdade) é a função "dano"; `BONUS_TESTE` conta como "teste" independente da `variante` (dado ou
 * fixo); `EFEITO` conta como sua própria função "efeito" (`m3-68` — corrige furo em que dois
 * fragmentos ambos mirando "efeito" no mesmo alvo não eram bloqueados, porque caíam em `null`);
 * `null` para efeitos fora do cardápio do Potencializador (não participam da checagem).
 */
function funcaoFragmento(efeito: ModificacaoEfeitoDto): 'DANO' | 'TESTE' | 'EFEITO' | 'RESISTENCIA' | null {
  switch (efeito.tipo) {
    case ModificacaoEfeitoTipoEnum.DANO_FIXO:
      return 'DANO';
    case ModificacaoEfeitoTipoEnum.BONUS_TESTE:
      return 'TESTE';
    case ModificacaoEfeitoTipoEnum.EFEITO:
      return 'EFEITO';
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
  /**
   * Quantos pontos `concedePontoAtributo` soma — presente só junto de `concedePontoAtributo: true`.
   * 1 normalmente, 2 com Anomalia (`possuiAnomalia`): a habilidade não abre exceção nenhuma no doc
   * ("têm todos os seus efeitos dobrados"), então o ponto de atributo dobra como qualquer outro
   * valor do cardápio.
   */
  readonly pontosAtributo?: number;
}

/**
 * Cardápio de bônus **Consumido** de um fragmento Potencializador de `modulo` — o jogador escolhe
 * UMA opção ao consumir (doc — "⬦ Potencializador", tabela, coluna "Consumido"). Função pura irmã
 * de `listarBonusFragmentoPotencializador`; ao contrário dela, o bônus aqui não vira Modificação de
 * item — é aplicado direto ao agente (`shared/regras/agente/fragmento-consumo`).
 *
 * `possuiAnomalia` (`P-013`) dobra os três valores, mesma regra de
 * `listarBonusFragmentoPotencializador` — incluindo `pontosAtributo` (Módulo I, "+1 ponto no
 * atributo"): o doc não abre exceção nenhuma ("têm todos os seus efeitos dobrados"), então 2 pontos
 * com Anomalia.
 */
export function listarBonusConsumoFragmentoPotencializador(
  modulo: FragmentoModuloEnum,
  possuiAnomalia = false,
): readonly OpcaoBonusConsumoFragmentoDto[] {
  const dobro = possuiAnomalia ? 2 : 1;
  const valores = BONUS_CONSUMIDO[modulo];
  const teste = valores.teste * dobro;
  const defesa = valores.defesa * dobro;
  const danoCorpo = valores.danoCorpo * dobro;
  const concedePontoAtributo = modulo === FragmentoModuloEnum.I;
  const pontosAtributo = concedePontoAtributo ? dobro : undefined;
  return [
    {
      rotulo: `+${teste} em todos os testes do atributo à escolha${
        concedePontoAtributo ? ` e +${pontosAtributo} ponto${pontosAtributo === 1 ? '' : 's'} no atributo` : ''
      }`,
      tipo: 'TESTE',
      valor: teste,
      ...(concedePontoAtributo ? { concedePontoAtributo: true as const, pontosAtributo } : {}),
    },
    { rotulo: `+${defesa} em Defesa`, tipo: 'DEFESA', valor: defesa },
    { rotulo: `+${danoCorpo} de dano do Corpo`, tipo: 'DANO_CORPO', valor: danoCorpo },
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

// === Bônus fixo do Construtor (m3-65) ===

/** Forma "de dano" do bônus fixo do Construtor — Arma ou Proteção; Munição não modifica um item. */
export type FormaFixaConstrutor = 'ARMA' | 'PROTECAO';

/**
 * A forma do bônus fixo do Construtor (Arma/Proteção) a partir da `categoriaEmprestada` declarada
 * no item (doc — "⬦ Construtor": "só pode tomar a forma de Armas Corpo a Corpo, Armas de Fogo, Armas
 * Exóticas, Munições ou Proteções"). `null` para Munição (ação "Recarregar", `bonusMunicaoConstrutor`
 * — não gera modificação) e para qualquer categoria fora da lista do doc.
 */
export function formaFixaConstrutor(
  categoriaEmprestada: ItemCategoriaEnum | undefined,
): FormaFixaConstrutor | null {
  switch (categoriaEmprestada) {
    case ItemCategoriaEnum.CORPO_A_CORPO:
    case ItemCategoriaEnum.ARMAS_DE_FOGO:
    case ItemCategoriaEnum.EXOTICOS:
      return 'ARMA';
    case ItemCategoriaEnum.PROTECOES:
      return 'PROTECAO';
    default:
      return null;
  }
}

/**
 * Efeitos mecânicos do bônus fixo automático de um Fragmento Construtor de `modulo`, para a `forma`
 * (Arma/Proteção) que ele tomou (doc — tabela "⬦ Construtor" ~1950; `m3-65`) — ver
 * `BonusFixoArmaConstrutorDados`/`BonusFixoProtecaoConstrutorDados` para o porquê de cada mapeamento
 * de tipo. Empurrado como uma `ModificacaoAplicadaDto` (com `origemFragmento`) pela página, mesmo
 * padrão do bônus "em item" do Potencializador (`listarBonusFragmentoPotencializador`).
 *
 * `possuiAnomalia` (`P-013`) dobra todo valor de efeito — "Fragmentos... têm todos os seus efeitos
 * dobrados" não abre exceção para o Construtor, que também é um Fragmento. `danoFaces` (o tipo de
 * dado, ex. D12) fica de fora: é a face do dado, não a magnitude do efeito — mesmo raciocínio de
 * `MULTIPLICADOR_MAIOR_DADO_MODULO` em `listarBonusFragmentoPotencializador`, que dobra o valor
 * final e nunca as faces do dado alvo.
 */
export function listarEfeitosFixosConstrutor(
  modulo: FragmentoModuloEnum,
  forma: FormaFixaConstrutor,
  possuiAnomalia = false,
): readonly ModificacaoEfeitoDto[] {
  const dobro = possuiAnomalia ? 2 : 1;
  const valores = BONUS_FIXO_CONSTRUTOR[modulo];
  if (forma === 'ARMA') {
    const efeitos: ModificacaoEfeitoDto[] = [
      {
        tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS,
        valor: valores.arma.danoDados * dobro,
        faces: valores.arma.danoFaces,
      },
      { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: valores.arma.teste * dobro, variante: 'FIXO' },
    ];
    if (valores.arma.dadoTeste) {
      efeitos.push({ tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS_BASE, valor: valores.arma.dadoTeste * dobro });
    }
    return efeitos;
  }
  const efeitos: ModificacaoEfeitoDto[] = [
    { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: valores.protecao.resistencia * dobro },
  ];
  if (valores.protecao.esquivaBloqueio) {
    const esquivaBloqueio = valores.protecao.esquivaBloqueio * dobro;
    efeitos.push(
      { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: esquivaBloqueio, variante: 'Esquiva' },
      { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: esquivaBloqueio, variante: 'Bloqueio' },
    );
  }
  if (valores.protecao.defesa) {
    efeitos.push({ tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: valores.protecao.defesa * dobro, variante: 'Defesa' });
  }
  return efeitos;
}

/**
 * Bônus fixo de Munição de um Fragmento Construtor de `modulo` (doc — "⬦ Construtor": "Recarregar"
 * custa Energia e concede dano por 1 cena, `m3-65`) — a página usa isto na ação "Recarregar".
 * `possuiAnomalia` (`P-013`) dobra os dois valores: `custoRecarregar` é o custo de "usar" o
 * Fragmento (doc: "Fragmentos custam o dobro de Energia em seu uso"), `dano` é o efeito que ele
 * concede — mesma dobra dos dois lados já aplicada em `custoAquisicaoFragmento`.
 */
export function bonusMunicaoConstrutor(
  modulo: FragmentoModuloEnum,
  possuiAnomalia = false,
): BonusFixoMunicaoConstrutorDados {
  const dobro = possuiAnomalia ? 2 : 1;
  const valores = BONUS_FIXO_CONSTRUTOR[modulo].municao;
  return { custoRecarregar: valores.custoRecarregar * dobro, dano: valores.dano * dobro };
}
