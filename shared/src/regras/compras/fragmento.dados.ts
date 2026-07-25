import { FragmentoModuloEnum } from '../../enums';

/**
 * Dados tipados de Fragmentos (m3-35/m3-42) — custo em Energia por módulo, o cardápio de bônus do
 * Potencializador "em um item", a Afinidade e o Preço de Sanidade do Consumo. Conferidos contra
 * `docs/core/sistema-v4.1.0.md` — "⬡ Fragmentos" (⬥ Módulos, ⬥ Acoplamento, ⬥ Função >
 * Potencializador > Consumo de Fragmentos, ⬥ Afinidade com Fragmentos). Em conflito, o documento
 * vence (proibição #27).
 *
 * **Recorte desta task (núcleo, decisão do autor):** só o custo de Energia de
 * adquirir/acoplar/remover, o bônus "em um item" do Potencializador (a opção "N× valor máximo do
 * maior tipo de dado" fica de fora — depende de resolver o maior dado do item-alvo, uma primitiva
 * que ainda não existe em `shared/regras`), a Afinidade e o Preço de Sanidade do Consumo. Anomalia
 * Biológica, Colapso, Redução de Módulo, Forja, os bônus "Consumido" da tabela do Potencializador
 * (concessão de +1 em testes/Defesa/dano do Corpo — sem catálogo/UI nesta task) e a tabela de
 * bônus fixos do Construtor (arma/proteção por módulo) ficam de fora — specs futuras.
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
