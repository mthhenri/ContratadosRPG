import { FragmentoModuloEnum } from '../../enums';

/**
 * Dados tipados de Fragmentos (m3-35/m3-42/m3-63/m3-64/m3-65) — custo em Energia por módulo, os
 * cardápios de bônus do Potencializador "em um item" (5 opções, incluindo a de "N× valor máximo do
 * maior dado", `m3-63`) e "Consumido" (`m3-64`), a tabela de bônus fixos do Construtor (`m3-65`), a
 * Afinidade e o Preço de Sanidade do Consumo. Conferidos contra `docs/core/sistema-v4.1.0.md` —
 * "⬡ Fragmentos" (⬥ Módulos, ⬥ Acoplamento, ⬥ Função > Potencializador > Consumo de Fragmentos,
 * ⬦ Construtor, ⬥ Afinidade com Fragmentos). Em conflito, o documento vence (proibição #27).
 *
 * **Recorte (núcleo, decisão do autor):** o custo de Energia de adquirir/acoplar/remover, os dois
 * cardápios de bônus do Potencializador (em item e Consumido), a tabela de bônus fixos do
 * Construtor, a Afinidade e o Preço de Sanidade do Consumo. Anomalia Biológica, Colapso, Redução de
 * Módulo e Forja ficam de fora — specs futuras.
 */

/**
 * Custo em Energia Máxima de **adquirir** (portar) um fragmento Potencializador — drena enquanto
 * ele estiver no inventário, cessa ao removê-lo (doc — "⬥ Módulos"). Um fragmento **Construtor**
 * custa o **dobro** deste valor (doc — "⬦ Construtor": "seu valor... é dobrado").
 */
export const CUSTO_ENERGIA_MAXIMA_MODULO: Readonly<Record<FragmentoModuloEnum, number>> = {
  [FragmentoModuloEnum.V]: 3,
  [FragmentoModuloEnum.IV]: 7,
  [FragmentoModuloEnum.III]: 12,
  [FragmentoModuloEnum.II]: 16,
  [FragmentoModuloEnum.I]: 20,
};

/** Uma opção do cardápio de bônus "em um item" do Potencializador para um módulo. */
export interface OpcaoBonusPotencializadorDados {
  readonly dadosBase: number;
  readonly dadoTeste: number;
  readonly valorFixo: number;
}

/**
 * Bônus "em um item" do Fragmento Potencializador por módulo (doc — tabela "⬦ Potencializador"):
 * `dadosBase` = "+N dados (efeito) ao dano" (mapeado a `DANO_DADOS_BASE`); `dadoTeste` = "+N dado(s)
 * no teste"; `valorFixo` = "+N no valor (de teste, efeito ou resistência)" — o jogador escolhe UM
 * dos três destinos do valor fixo na hora de aplicar.
 */
export const BONUS_POTENCIALIZADOR: Readonly<Record<FragmentoModuloEnum, OpcaoBonusPotencializadorDados>> = {
  [FragmentoModuloEnum.V]: { dadosBase: 2, dadoTeste: 1, valorFixo: 2 },
  [FragmentoModuloEnum.IV]: { dadosBase: 3, dadoTeste: 1, valorFixo: 3 },
  [FragmentoModuloEnum.III]: { dadosBase: 4, dadoTeste: 2, valorFixo: 5 },
  [FragmentoModuloEnum.II]: { dadosBase: 5, dadoTeste: 2, valorFixo: 7 },
  [FragmentoModuloEnum.I]: { dadosBase: 7, dadoTeste: 3, valorFixo: 10 },
};

/**
 * Multiplicador `N` da 5ª opção do cardápio "em um item" — "N× valor máximo do maior tipo de dado"
 * ao dano (doc — tabela "⬦ Potencializador": V=1×, IV=2×, III=3×, II=4×, I=5×; `m3-63`). Depende do
 * **alvo** escolhido (o maior dado do item), então fica fora de `BONUS_POTENCIALIZADOR` — só o
 * multiplicador é fixo por módulo, o valor final (`multiplicador × faces`) é resolvido em
 * `listarBonusFragmentoPotencializador`.
 */
export const MULTIPLICADOR_MAIOR_DADO_MODULO: Readonly<Record<FragmentoModuloEnum, number>> = {
  [FragmentoModuloEnum.V]: 1,
  [FragmentoModuloEnum.IV]: 2,
  [FragmentoModuloEnum.III]: 3,
  [FragmentoModuloEnum.II]: 4,
  [FragmentoModuloEnum.I]: 5,
};

/**
 * Valor de Afinidade que um único fragmento de `modulo` contribui (doc — "⬥ Afinidade com
 * Fragmentos": "Afinidade = 6 - Módulo"). Substituindo o numeral romano pelo seu valor (I=1 ...
 * V=5): conferido contra o exemplo do documento — 2 fragmentos de módulo V + 1 de módulo IV soma
 * (6-5) + (6-5) + (6-4) = 1 + 1 + 2 = 4 de afinidade. O mesmo valor reaparece no multiplicador da
 * sequela do Preço de Sanidade (doc — "Consumo de Fragmentos": "multiplicada por Módulo - 6", que,
 * resolvido pelo mesmo numeral, dá o exemplo do documento — módulo III, 3× mais forte).
 */
export const VALOR_AFINIDADE_MODULO: Readonly<Record<FragmentoModuloEnum, number>> = {
  [FragmentoModuloEnum.V]: 1,
  [FragmentoModuloEnum.IV]: 2,
  [FragmentoModuloEnum.III]: 3,
  [FragmentoModuloEnum.II]: 4,
  [FragmentoModuloEnum.I]: 5,
};

/**
 * Nome da sequela aplicada ao **consumir** um fragmento (doc — "⬦ Consumo de Fragmentos":
 * "a adição da sequela 'Rejeição Biológica'").
 */
export const SEQUELA_CONSUMO_FRAGMENTO = 'Rejeição Biológica';

/** Uma opção do cardápio de bônus "Consumido" do Potencializador para um módulo (m3-64). */
export interface OpcaoBonusConsumidoDados {
  /** "+N em todos os testes do atributo à escolha" — Módulo I soma também +1 ponto no atributo. */
  readonly teste: number;
  readonly defesa: number;
  readonly danoCorpo: number;
}

/**
 * Bônus "Consumido" do Fragmento Potencializador por módulo (doc — tabela "⬦ Potencializador",
 * coluna "Consumido"). Ao contrário do bônus "em item", este é do **agente**, permanente — o
 * fragmento é destruído ao ser consumido, não há como desfazer.
 */
export const BONUS_CONSUMIDO: Readonly<Record<FragmentoModuloEnum, OpcaoBonusConsumidoDados>> = {
  [FragmentoModuloEnum.V]: { teste: 1, defesa: 1, danoCorpo: 2 },
  [FragmentoModuloEnum.IV]: { teste: 2, defesa: 2, danoCorpo: 4 },
  [FragmentoModuloEnum.III]: { teste: 3, defesa: 3, danoCorpo: 6 },
  [FragmentoModuloEnum.II]: { teste: 5, defesa: 4, danoCorpo: 8 },
  [FragmentoModuloEnum.I]: { teste: 5, defesa: 5, danoCorpo: 10 },
};

// === Bônus fixo do Construtor (m3-65) ===

/**
 * Bônus fixo de **Arma** de um Fragmento Construtor por módulo (doc — tabela "⬦ Construtor",
 * linha "Arma"). `danoDados`/`danoFaces` é o dado extra de dano com face própria por módulo (ex.:
 * "+1D8", `m3-65` V) — um pool de dado **separado** do dado base da arma (o jogador continua
 * declarando a base, `dano`/`informacao`, como em qualquer item custom; "concede bônus adicionais",
 * doc — "⬦ Construtor"), por isso mapeado a `DANO_DADOS`, não `DANO_DADOS_BASE`. `dadoTeste` (só
 * Módulo II/I, "+1 dado"/"+2 dados") é o único termo que soma ao dado **base** — mapeado a
 * `DANO_DADOS_BASE`. `teste` é o bônus fixo de teste (ex.: "+1 de teste"), mapeado a `BONUS_TESTE`
 * variante `FIXO`.
 */
export interface BonusFixoArmaConstrutorDados {
  readonly danoDados: number;
  readonly danoFaces: number;
  /** Só Módulo II/I — doc: "+1 dado"/"+2 dados" somados ao dado base da arma. */
  readonly dadoTeste?: number;
  readonly teste: number;
}

/**
 * Bônus fixo de **Munição** de um Fragmento Construtor por módulo (doc — tabela "⬦ Construtor",
 * linha "Munição": "Dura 1 cena. 'Recarregar' custa N de Energia. Concede +N de dano."). Não é uma
 * `ModificacaoEfeitoDto` — Munição não modifica um item, é a ação própria "Recarregar" (`m3-65`,
 * item 3 da spec).
 */
export interface BonusFixoMunicaoConstrutorDados {
  readonly custoRecarregar: number;
  readonly dano: number;
}

/**
 * Bônus fixo de **Proteção** de um Fragmento Construtor por módulo (doc — tabela "⬦ Construtor",
 * linha "Proteção"). `esquivaBloqueio` (mesmo valor nas duas variantes, doc: "+N em Esquiva e
 * Bloqueio") só a partir do Módulo IV; `defesa` só a partir do Módulo II. Mapeados a `RESISTENCIA` e
 * `DEFESA` (variantes `Esquiva`/`Bloqueio`/`Defesa`).
 */
export interface BonusFixoProtecaoConstrutorDados {
  readonly resistencia: number;
  /** Só a partir do Módulo IV — doc: "+1"/"+2"/"+3"/"+5 em Esquiva e Bloqueio". */
  readonly esquivaBloqueio?: number;
  /** Só a partir do Módulo II — doc: "+1"/"+2 em Defesa". */
  readonly defesa?: number;
}

/** As 3 formas (Arma/Munição/Proteção) do bônus fixo de um Fragmento Construtor de um módulo. */
export interface BonusFixoConstrutorDados {
  readonly arma: BonusFixoArmaConstrutorDados;
  readonly municao: BonusFixoMunicaoConstrutorDados;
  readonly protecao: BonusFixoProtecaoConstrutorDados;
}

/**
 * Bônus fixo do Fragmento Construtor por módulo e forma (doc — "⬦ Construtor", tabela ~1950):
 * "concede bônus adicionais de dano e testes de acordo com seu módulo... ao invés de aprimorar a
 * arma, ele é a arma em si" — o fragmento **é** o item (Arma Corpo a Corpo/Fogo/Exótica, Munição ou
 * Proteção), então o bônus da tabela é automático, sem o jogador digitar os stats certos (`m3-65`).
 */
export const BONUS_FIXO_CONSTRUTOR: Readonly<Record<FragmentoModuloEnum, BonusFixoConstrutorDados>> = {
  [FragmentoModuloEnum.V]: {
    arma: { danoDados: 1, danoFaces: 8, teste: 1 },
    municao: { custoRecarregar: 3, dano: 5 },
    protecao: { resistencia: 2 },
  },
  [FragmentoModuloEnum.IV]: {
    arma: { danoDados: 1, danoFaces: 10, teste: 3 },
    municao: { custoRecarregar: 7, dano: 7 },
    protecao: { resistencia: 3, esquivaBloqueio: 1 },
  },
  [FragmentoModuloEnum.III]: {
    arma: { danoDados: 2, danoFaces: 10, teste: 5 },
    municao: { custoRecarregar: 12, dano: 12 },
    protecao: { resistencia: 5, esquivaBloqueio: 2 },
  },
  [FragmentoModuloEnum.II]: {
    arma: { danoDados: 2, danoFaces: 12, dadoTeste: 1, teste: 7 },
    municao: { custoRecarregar: 16, dano: 20 },
    protecao: { resistencia: 7, esquivaBloqueio: 3, defesa: 1 },
  },
  [FragmentoModuloEnum.I]: {
    arma: { danoDados: 4, danoFaces: 12, dadoTeste: 2, teste: 10 },
    municao: { custoRecarregar: 20, dano: 32 },
    protecao: { resistencia: 10, esquivaBloqueio: 5, defesa: 2 },
  },
};
