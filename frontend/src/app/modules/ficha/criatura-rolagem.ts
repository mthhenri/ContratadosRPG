import type { FichaAtributosDto, FichaCriaturaAtaqueDto, FichaCriaturaModificadoresDto } from '@contratados-rpg/shared/dtos/ficha';
import { calcularValorModificador } from '@contratados-rpg/shared/regras/criatura';
import { rolarFormula, type ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

/** Resultado pronto pra `BandejaDadosService.mostrar`/`FichaRolagemRegistroService.registrar` (mesmo formato de `PassoExecutadoDto`/`RolagemRealizadaDto`). */
export interface RolagemCriaturaExecutadaDto {
  readonly rotulo: string;
  readonly formula: string;
  readonly resultado: ResultadoRolagemDto;
}

/** Sub-recorte de `FichaCriaturaDadosDto` que os testes de atributo precisam — evita acoplar este módulo ao DTO inteiro. */
export interface DadosParaTesteAtributo {
  readonly atributos: FichaAtributosDto;
  readonly modificadores: FichaCriaturaModificadoresDto;
  readonly vd: number;
}

/**
 * Rola um teste de Atributo da criatura: `<chave>d20kh1±<modificador>` (sem `+PROF` — criatura
 * não tem Proficiência). O Modificador **nunca** entra na contagem de dados do pool — ele é um
 * bônus plano somado ao resultado do teste, igual a "+N no resultado" (distinto de "+1 dado",
 * as duas categorias de bônus do sistema, `sistema-v4.1.0.md` — "Regras Gerais"). A contagem de
 * dados usa só o Atributo Final (`dados.atributos[chave]`, nunca mutado nem substituído).
 */
export function rolarTesteAtributoCriatura(
  dados: DadosParaTesteAtributo,
  chave: keyof FichaAtributosDto,
  rotulo: string,
): RolagemCriaturaExecutadaDto | null {
  const valorModificador = calcularValorModificador({ tipo: dados.modificadores[chave], vd: dados.vd });
  const sinal = valorModificador < 0 ? '-' : '+';
  const formula = `${chave}d20kh1${sinal}${Math.abs(valorModificador)}`;
  const resultado = rolarFormula({ formula, atributos: dados.atributos });
  return resultado ? { rotulo, formula, resultado } : null;
}

/**
 * Rola a fórmula de dano de um Ataque da criatura (`ataque.dano`/`ataque.danoCritico`, ex.
 * `"4D12+10"`) — já é uma fórmula pronta no documento (`m4-01`), sem ajuste de Atributo Efetivo
 * (o dano da criatura é declarado pelo Mestre, não escala automaticamente com o modificador do
 * atributo de teste). `critico` (ajuste pós-mockup) troca pra `ataque.danoCritico` — uma
 * fórmula independente, não o dobro automático de `dano`: o Mestre escreve o efeito exato do
 * crítico, que pode não ser "o dobro" (ex.: muda o tipo de dano).
 */
export function rolarAtaqueCriatura(
  dados: Pick<DadosParaTesteAtributo, 'atributos'>,
  ataque: FichaCriaturaAtaqueDto,
  critico = false,
): RolagemCriaturaExecutadaDto | null {
  const formula = critico ? ataque.danoCritico : ataque.dano;
  const resultado = rolarFormula({ formula, atributos: dados.atributos });
  return resultado ? { rotulo: critico ? `${ataque.nome} (Crítico)` : ataque.nome, formula, resultado } : null;
}

/**
 * Rola a fórmula de teste de um Ataque (`ataque.teste`) — expressão livre (ajuste pós-mockup),
 * não mais atrelada a um único `atributo` + modificador (`rolarTesteAtributoCriatura` acima): um
 * ataque pode exigir mais dados/testes do que o convencional de um atributo isolado.
 */
export function rolarTesteAtaqueCriatura(
  dados: Pick<DadosParaTesteAtributo, 'atributos'>,
  ataque: FichaCriaturaAtaqueDto,
): RolagemCriaturaExecutadaDto | null {
  const resultado = rolarFormula({ formula: ataque.teste, atributos: dados.atributos });
  return resultado ? { rotulo: `Teste — ${ataque.nome}`, formula: ataque.teste, resultado } : null;
}
