import type { FichaAtributosDto, FichaCriaturaAtaqueDto, FichaCriaturaModificadoresDto } from '@contratados-rpg/shared/dtos/ficha';
import { calcularAtributoEfetivo } from '@contratados-rpg/shared/regras/criatura';
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
 * Rola um teste de Atributo da criatura: `<chave>d20kh1` (sem `+PROF` — criatura não tem
 * Proficiência), com a contagem de dados no pool ajustada para o **Atributo Efetivo**
 * (`calcularAtributoEfetivo`, `shared/regras/criatura`) só nesta rolagem — o mapa `atributos`
 * exibido na ficha nunca é mutado (mesmo padrão de `rolarTesteAtributo` em `FichaVisualizacao`).
 */
export function rolarTesteAtributoCriatura(
  dados: DadosParaTesteAtributo,
  chave: keyof FichaAtributosDto,
  rotulo: string,
): RolagemCriaturaExecutadaDto | null {
  const efetivo = calcularAtributoEfetivo({
    atributoFinal: dados.atributos[chave],
    modificador: dados.modificadores[chave],
    vd: dados.vd,
  });
  const atributosParaRolagem: FichaAtributosDto = { ...dados.atributos, [chave]: efetivo };
  const formula = `${chave}d20kh1`;
  const resultado = rolarFormula({ formula, atributos: atributosParaRolagem });
  return resultado ? { rotulo, formula, resultado } : null;
}

/**
 * Rola a fórmula de dano de um Ataque da criatura (`ataque.dano`, ex. `"4D12+10"`) — já é uma
 * fórmula pronta no documento (`m4-01`), sem ajuste de Atributo Efetivo (o dano da criatura é
 * declarado pelo Mestre, não escala automaticamente com o modificador do atributo de teste).
 */
export function rolarAtaqueCriatura(
  dados: Pick<DadosParaTesteAtributo, 'atributos'>,
  ataque: FichaCriaturaAtaqueDto,
): RolagemCriaturaExecutadaDto | null {
  const resultado = rolarFormula({ formula: ataque.dano, atributos: dados.atributos });
  return resultado ? { rotulo: ataque.nome, formula: ataque.dano, resultado } : null;
}
