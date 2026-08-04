import type { FichaAtributosDto, FichaDerivadosDto } from '../../dtos/ficha';
import type { OpcaoBonusConsumoFragmentoDto } from '../compras';
import { somarDanoFixo } from './dano';

/**
 * Efeito permanente do agente ao **consumir** um fragmento Potencializador (doc — "⬦
 * Potencializador", coluna "Consumido"; m3-64). Ao contrário do bônus "em item" (Modificação de
 * item), este bônus é do **agente**: soma direto nos campos persistidos que a ficha já lê
 * (`modificadoresTeste`/`derivados`/`atributos`), sem motor novo em `calcularDefesa`/
 * `calcularDanoCorpo` (fonte única, proibições #26/#27) — mesmo padrão de `aplicarEfeitoUnico`
 * (`shared/regras/identidade/formacoes`, alvos `DERIVADO`/`DANO_CORPO`), generalizado aqui para o
 * Consumo de Fragmentos. Ao vivo em `agente/`, não `compras/`, porque toca `FichaAtributosDto`/
 * `FichaDerivadosDto` — `compras/fragmento.ts` já é importado por `agente/*` (nunca o inverso, evita
 * ciclo).
 */
export interface EfeitoConsumoFragmentoDto {
  readonly atributos: FichaAtributosDto;
  readonly derivados: FichaDerivadosDto;
  readonly modificadoresTeste: Partial<Record<keyof FichaAtributosDto, number>>;
}

/**
 * Aplica a `opcao` de bônus "Consumido" escolhida (`listarBonusConsumoFragmentoPotencializador`) ao
 * agente. `atributoEscolhido` só é usado (e exigido para ter efeito) em `tipo === 'TESTE'` —
 * ignorado nos demais. Módulo I soma também **+1 ponto** no atributo escolhido, além do teste
 * (`opcao.concedePontoAtributo` — doc: "única forma de ultrapassar o limite de 6 pontos em um
 * atributo"). `DEFESA`/`DANO_CORPO` só alteram o derivado correspondente se a classe já o possuir
 * (`defesa !== undefined`/`danoCorpoACorpo` truthy — Civil não tem Defesa; mesma guarda de
 * `aplicarEfeitoUnico`, "não fabricar uma stat que a classe não tem").
 */
export function aplicarBonusConsumoFragmento(
  agente: EfeitoConsumoFragmentoDto,
  opcao: OpcaoBonusConsumoFragmentoDto,
  atributoEscolhido: keyof FichaAtributosDto | null,
): EfeitoConsumoFragmentoDto {
  switch (opcao.tipo) {
    case 'DEFESA':
      return agente.derivados.defesa !== undefined
        ? { ...agente, derivados: { ...agente.derivados, defesa: agente.derivados.defesa + opcao.valor } }
        : agente;
    case 'DANO_CORPO':
      return agente.derivados.danoCorpoACorpo
        ? {
            ...agente,
            derivados: {
              ...agente.derivados,
              danoCorpoACorpo: somarDanoFixo(agente.derivados.danoCorpoACorpo, opcao.valor),
            },
          }
        : agente;
    case 'TESTE': {
      if (!atributoEscolhido) {
        return agente;
      }
      const modificadoresTeste = {
        ...agente.modificadoresTeste,
        [atributoEscolhido]: (agente.modificadoresTeste[atributoEscolhido] ?? 0) + opcao.valor,
      };
      const atributos = opcao.concedePontoAtributo
        ? { ...agente.atributos, [atributoEscolhido]: agente.atributos[atributoEscolhido] + 1 }
        : agente.atributos;
      return { ...agente, modificadoresTeste, atributos };
    }
  }
}
