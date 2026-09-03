import { Component, computed, input } from '@angular/core';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { DadosRoladosDto, ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';
import { Icone, type IconeNome } from '../icone/icone.component';

/**
 * Faces com SVG de dado dedicado (`d4`..`d20` em `icone.component`) — as únicas que trocam o
 * quadradinho pela silhueta do dado. Fórmula caseira com face fora desse conjunto (ex.: `d3`,
 * `d100`) não tem arte própria e continua no quadradinho de sempre (fallback).
 */
const ICONE_POR_FACES: Readonly<Record<number, IconeNome>> = {
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20',
};

/**
 * Modificador BEM (`resultado-rolagem__grupo--<sufixo>`) por tipo de dano — cor dedicada por tipo
 * no chip de resumo (`--dano-fisico`/`--dano-balistico`/`--dano-explosao`/`--dano-quimico`/
 * `--dano-geral` em `_tokens.scss`), só ali; a rolagem inteira (total, pool de dados) continua na
 * cor de identidade da ficha (`--cor-ficha`), sem mudar.
 */
const SUFIXO_TIPO_DANO: Record<TipoDanoEnum, string> = {
  [TipoDanoEnum.FISICO]: 'fisico',
  [TipoDanoEnum.BALISTICO]: 'balistico',
  [TipoDanoEnum.EXPLOSAO]: 'explosao',
  [TipoDanoEnum.QUIMICO]: 'quimico',
  [TipoDanoEnum.GERAL]: 'geral',
};

/**
 * Renderização do **resultado** de uma rolagem (total, pool de dados, grupos de dano, modificadores)
 * — extraído da bandeja de dados (m3-22) em m3-27 para ser reusado também no histórico da ficha e
 * no feed da campanha, sem duplicar a lógica de detalhamento (proibição de duplicar apresentação
 * do motor). Só apresentação; a rolagem em si já veio pronta (`ResultadoRolagemDto`).
 */
@Component({
  selector: 'app-resultado-rolagem',
  imports: [Icone],
  templateUrl: './resultado-rolagem.component.html',
  styleUrl: './resultado-rolagem.component.scss',
})
export class ResultadoRolagem {
  readonly resultado = input.required<ResultadoRolagemDto>();
  /**
   * Cor de identidade visual da ficha autora (m3-61) — seta `--cor-ficha` inline no container
   * próprio, para o componente funcionar sozinho (bandeja) sem depender de um ancestral já ter
   * setado a variável. `null`/ausente: sem `--cor-ficha` no estilo, o SCSS cai no `--accent` de
   * quem visualiza (`var(--cor-ficha, var(--accent))`).
   */
  readonly corFicha = input<string | null | undefined>(null);

  /**
   * Variante de linha (ui-22): total 22px, pool/grupos/legenda numa única linha em vez de
   * empilhados — usada onde o histórico precisa caber mais rolagens na mesma altura (painel
   * lateral, feed da campanha). `false` (padrão) preserva a forma cheia de 44px da bandeja.
   */
  readonly compacto = input(false);

  /**
   * Resultados a exibir (m3-46): sem repetição `#N`, é só o próprio resultado; com `subResultados`
   * (2+ rolagens independentes de `(<fórmula>)#N`), são todas elas.
   */
  protected readonly resultadosExibidos = computed<readonly ResultadoRolagemDto[]>(
    () => this.resultado().subResultados ?? [this.resultado()],
  );

  /**
   * Se a rolagem deve ganhar o realce de **crítico** (m3-30): ou foi uma rolagem de crítico (dano
   * dobrado), ou algum termo bateu a margem de crítico (`cm`). Usado para o glow no total e no ◆.
   */
  protected ehCritico(resultado: ResultadoRolagemDto): boolean {
    return resultado.critico === true || resultado.dados.some((dado) => (dado.criticos ?? 0) > 0);
  }

  /** Classe do chip de um grupo de dano — combina o modificador base com o sufixo do tipo. */
  protected classeGrupo(tipoDano: TipoDanoEnum): string {
    return `resultado-rolagem__grupo resultado-rolagem__grupo--${SUFIXO_TIPO_DANO[tipoDano]}`;
  }

  /**
   * Classe base de um dadinho do pool (I-011) — ganha a cor do tipo de dano do termo, mesma paleta
   * do chip de resumo (`classeGrupo`), quando o termo tem um `tipoDano` único. Sem tag, ou num
   * termo Composto (`[A-B]`, onde `tipoDano` fica ausente — o dado não sabe pra qual metade do par
   * ele caiu), fica só na classe base neutra de sempre. `--escolhido`/`--descartado` (m3-29) se
   * aplicam à parte, via `[class.foo]` no template — Angular compõe as duas.
   */
  protected classeDado(dado: DadosRoladosDto): string {
    return dado.tipoDano
      ? `resultado-rolagem__dado resultado-rolagem__dado--${SUFIXO_TIPO_DANO[dado.tipoDano]}`
      : 'resultado-rolagem__dado';
  }

  /** Nome do ícone (`app-icone`) pra este `faces`, ou `null` no fallback sem arte própria. */
  protected iconeDado(faces: number): IconeNome | null {
    return ICONE_POR_FACES[faces] ?? null;
  }

  /**
   * Marca cada valor rolado de um termo como **mantido** ou **descartado** (m3-29), replicando a
   * separação por multiset do motor (preserva a ordem e trata duplicados). Sem keep (`mantidos`
   * ausente), todos contam como mantidos — a UI então não aplica realce.
   */
  protected dadosMarcados(dado: DadosRoladosDto): { readonly valor: number; readonly mantido: boolean }[] {
    if (!dado.mantidos) {
      return dado.valores.map((valor) => ({ valor, mantido: true }));
    }
    const restante = new Map<number, number>();
    for (const valor of dado.mantidos) {
      restante.set(valor, (restante.get(valor) ?? 0) + 1);
    }
    return dado.valores.map((valor) => {
      const disponivel = restante.get(valor) ?? 0;
      if (disponivel > 0) {
        restante.set(valor, disponivel - 1);
        return { valor, mantido: true };
      }
      return { valor, mantido: false };
    });
  }

  /**
   * Modificadores planos de uma rolagem (m3-22) — atributos/fontes aplicados (`+ FOR 6`) e a
   * constante — como texto. Os **dados rolados** aparecem à parte, em chips; aqui vai só o que
   * somou fora dos dados. Vazio quando não há modificadores.
   */
  protected modificadoresSoma(resultado: ResultadoRolagemDto): string {
    const partes: string[] = [];
    resultado.atributos.forEach((atributo) => {
      const sinal = atributo.valor < 0 ? '−' : '+';
      partes.push(`${sinal} ${atributo.rotulo} ${Math.abs(atributo.valor)}`);
    });
    if (resultado.constante !== 0) {
      partes.push(`${resultado.constante < 0 ? '−' : '+'} ${Math.abs(resultado.constante)}`);
    }
    return partes.join(' ');
  }
}
