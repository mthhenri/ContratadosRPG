import type { ClasseEnum } from '../../enums';
import type { FichaAtributosDto, FichaDerivadosDto, FichaHabilidadeDto } from '../../dtos/ficha';
import { calcularDanoCorpo, calcularDanoFurtivo } from './dano';
import { calcularContraAtaque, calcularDefesa, calcularProficiencia } from './defesa';
import { calcularLimiteHabilidadesPorTurno } from './habilidades';
import { calcularInventario } from './inventario';
import { aplicarLimitesPorClasse, obterLimitesClasse } from './limites';
import { calcularDeslocamento } from './movimento';
import { calcularAreaPercepcao } from './percepcao';

/**
 * Monta o **snapshot de derivados** de uma ficha (m3-10 — "nada é exclusivamente calculado"): calcula
 * cada stat via as fórmulas de `agente` e devolve o bloco `FichaDerivadosDto` a ser **persistido na
 * criação** e depois editado livremente. Stats que a classe não possui (Civil: `defesa`,
 * `proficiencia`, `danoFurtivo`) saem como `undefined`. Só orquestra `shared/regras` — nenhuma
 * fórmula nova aqui (fonte única, proibições #26/#27). Import do DTO é **type-only** (zero-dep em
 * runtime; regras não passa a depender de dtos).
 *
 * `habilidades` (opcional, `[]` por padrão) só alimenta `calcularContraAtaque` — na prática quase
 * sempre vazio aqui, já que a habilidade "Contra-Ataque" normalmente só entra na ficha depois da
 * criação (via seletor de habilidades, m3-13), não durante o assistente.
 */
export function calcularDerivados(
  classe: ClasseEnum,
  nivel: number,
  atributos: FichaAtributosDto,
  habilidades: readonly FichaHabilidadeDto[] = [],
): FichaDerivadosDto {
  const normalizado = aplicarLimitesPorClasse({
    classe,
    nivel,
    vigor: atributos.vigor,
    destreza: atributos.destreza,
    forca: atributos.forca,
    vontade: atributos.vontade,
    sentidos: atributos.sentidos,
  });
  const entrada = { classe, ...normalizado };

  const limitesAtributo = obterLimitesClasse({ classe });
  const luta = Math.min(
    limitesAtributo.atributoMaximo,
    Math.max(limitesAtributo.atributoMinimo, atributos.luta),
  );

  const defesa = calcularDefesa(entrada);
  const proficiencia = calcularProficiencia(entrada);
  const danoFurtivo = calcularDanoFurtivo(entrada);
  const contraAtaque = calcularContraAtaque({ luta, vigor: normalizado.vigor, habilidades });

  return {
    defesa: defesa?.defesa,
    esquiva: defesa?.esquiva,
    bloqueio: defesa?.bloqueio,
    contraAtaque: contraAtaque ?? undefined,
    deslocamento: calcularDeslocamento(entrada),
    proficiencia: proficiencia ?? undefined,
    danoCorpoACorpo: calcularDanoCorpo(entrada),
    danoFurtivo: danoFurtivo ?? undefined,
    percepcao: calcularAreaPercepcao(entrada),
    inventarioMaximo: calcularInventario(entrada),
    habilidadesPorTurno: calcularLimiteHabilidadesPorTurno(entrada),
  };
}
