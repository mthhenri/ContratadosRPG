import { ajustarDado } from './dado';
import { DADOS_DESCANSO, QUALIDADE_MOD, REFEICAO_MOD } from './descanso.dados';
import {
  DadosExtrasDto,
  DadosExtrasInterpretarDto,
  DescansoCalcularDto,
  DescansoCalculoDto,
  RecuperacaoFaixaDto,
  ResultadoDescansoCalcularDto,
  ResultadoDescansoDto,
  RolagemDadosDto,
} from './descanso.dtos';

/** Notação `NdM` (quantidade × faces) de dados extras digitados. */
const NOTACAO_DADOS = /^(\d+)d(\d+)$/;

/** Teto de dados extras roláveis de uma vez (paridade com o site antigo). */
const MAXIMO_DADOS_EXTRAS = 20;

/**
 * Faixa de recuperação de uma track (Energia ou Vida): resolve o dado na escada
 * e monta `ATRIBUTO dados de descanso + (Nível × 2)`, devolvendo mínimo, média e
 * máximo. Com interrupção, mínimo e máximo saem com `⌊valor ÷ 2⌋` (paridade com
 * o site antigo); a média é dividida por 2.
 */
function calcularFaixa(
  quantidade: number,
  dadoBase: number,
  modificadorDado: number,
  bonusNivel: number,
  interrompido: boolean,
): RecuperacaoFaixaDto {
  const dadoFinal = ajustarDado({ dadoBase, modificador: modificadorDado });
  const minimoBruto = quantidade * 1 + bonusNivel;
  const mediaBruta = quantidade * ((dadoFinal + 1) / 2) + bonusNivel;
  const maximoBruto = quantidade * dadoFinal + bonusNivel;
  return {
    dadoFinal,
    quantidadeDados: quantidade,
    bonusNivel,
    minimo: interrompido ? Math.floor(minimoBruto / 2) : minimoBruto,
    media: interrompido ? mediaBruta / 2 : mediaBruta,
    maximo: interrompido ? Math.floor(maximoBruto / 2) : maximoBruto,
    interrompido,
  };
}

/**
 * Recorte determinístico da aba descanso: a faixa de recuperação de Energia
 * (Destreza dados) e Vida (Vigor dados), dado o tipo, a qualidade do ambiente, a
 * refeição e o Nível. A fórmula é `ATRIBUTO dados de descanso + (Nível × 2)`,
 * com o dado deslocado na escada pela qualidade (Insalubre −1, Confortável +1) e
 * pela refeição (+1). Descanso Curto não recupera Vida (`vida` = `null`).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Descanso". Espelha `calcDescanso` do
 * site antigo; os dados extras (aleatórios) não entram nesta faixa, só na
 * rolagem (`calcularResultadoDescanso`).
 */
export function calcularDescanso(dto: DescansoCalcularDto): DescansoCalculoDto {
  const tipoDados = DADOS_DESCANSO[dto.tipo];
  const modificadorDado = QUALIDADE_MOD[dto.qualidade] + (dto.refeicao ? REFEICAO_MOD : 0);
  const bonusNivel = dto.nivel * 2;

  const energia = calcularFaixa(dto.destreza, tipoDados.dadoEnergia, modificadorDado, bonusNivel, dto.interrompido);
  const vida =
    tipoDados.recuperaVida && tipoDados.dadoVida !== null
      ? calcularFaixa(dto.vigor, tipoDados.dadoVida, modificadorDado, bonusNivel, dto.interrompido)
      : null;

  return { modificadorDado, energia, vida };
}

/**
 * Interpreta o texto livre de dados extras de recuperação (item, habilidade…)
 * em uma especificação tipada — função pura, sem rolar. Aceita notação `NdM`
 * (M ≥ 2; N limitado a 20) ou um bônus fixo inteiro positivo. Texto vazio,
 * `"0"`, `NdM` com menos de 2 faces ou entrada inválida devolvem `null`.
 * Espelha o `parseExtraDice` do site antigo, sem a parte de rolagem.
 */
export function interpretarDadosExtras(dto: DadosExtrasInterpretarDto): DadosExtrasDto | null {
  const texto = dto.texto.trim().toLowerCase();
  if (!texto || texto === '0') {
    return null;
  }

  const notacao = NOTACAO_DADOS.exec(texto);
  if (notacao) {
    const quantidade = Math.min(Number(notacao[1]), MAXIMO_DADOS_EXTRAS);
    const faces = Number(notacao[2]);
    if (faces < 2) {
      return null;
    }
    return { quantidade, faces, bonusFixo: 0 };
  }

  const valorFixo = parseInt(texto, 10);
  if (!isNaN(valorFixo) && valorFixo > 0) {
    return { quantidade: 0, faces: 0, bonusFixo: valorFixo };
  }

  return null;
}

/**
 * Rola `quantidade` dados de `faces` faces e devolve os valores. **Utilidade de
 * rolagem explícita** — a única brecha à proibição de `Math.random` no motor de
 * regras (SYSTEM.SPEC §6.6). `quantidade` 0 devolve `[]`.
 */
export function rolarDados(dto: RolagemDadosDto): number[] {
  const valores: number[] = [];
  for (let indice = 0; indice < dto.quantidade; indice++) {
    valores.push(Math.floor(Math.random() * dto.faces) + 1);
  }
  return valores;
}

/**
 * Resultado final de uma track de recuperação a partir de valores **já
 * rolados** — função pura, sem aleatoriedade. Soma os dados de recuperação, os
 * dados extras (ou o bônus fixo) e o bônus de Nível; com interrupção, divide o
 * total por 2 (arredonda para baixo). Espelha o núcleo de `buildResult` do site
 * antigo, isolado da rolagem para ser determinístico e testável.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Descanso" (interrupção = metade do valor
 * recuperado, arredondando para baixo).
 */
export function calcularResultadoDescanso(dto: ResultadoDescansoCalcularDto): ResultadoDescansoDto {
  const somar = (acumulado: number, valor: number): number => acumulado + valor;
  const somaBase = dto.rolagens.reduce(somar, 0);
  const somaExtras = dto.dadosExtras.reduce(somar, 0);
  const soma = somaBase + somaExtras + dto.bonusNivel;
  return {
    total: dto.interrompido ? Math.floor(soma / 2) : soma,
    soma,
    interrompido: dto.interrompido,
  };
}
