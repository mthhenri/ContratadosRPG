import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { TipoCampanhaMembroPapelEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { CONDICOES_FICHA, type DescritorCondicao } from '../ficha/condicoes-ficha';
import { rotuloClasseCompleto } from '../ficha/rotulos-ficha';
import { rotuloPatente } from '../ficha/status-derivado';

/**
 * Agrupamento "Membros"/"Equipe" da visão de campanha — extraído de `CampanhaDetalhe` (m2-19/
 * m3-65) para ser reusado tal e qual pela Prévia de jogador (m8-04, `CampanhaPreviaJogador`):
 * as duas telas recebem a mesma forma de dado (`FichaResumoDto[]` + `CampanhaMembroResumoDto[]`),
 * só a **origem** dos dois muda — a visão de mestre busca a própria (`listarFichas`/
 * `listarMembros`), a prévia busca os do alvo (`recuperarPreviaJogador`). Puramente presentacional
 * (view-model), nenhuma regra de domínio/permissão aqui — quem decide o recorte é sempre o
 * backend (§14); estas funções só reformatam o que ele já devolveu.
 */

/** Uma das 3 condições no mini-card — sempre as 3, com `ativa` dizendo se está marcada (item 3). */
export interface ItemFichaCondicao extends DescritorCondicao {
  readonly ativa: boolean;
}

/**
 * Ficha já enriquecida para o mini-card inline (m2-16 + m2-16b): id/nome/classe legível/nível +
 * Vida/Energia e as três condições (sempre as 3, com `ativa`), direto do recorte `FichaResumoDto`
 * (sem o documento completo — §14/§10.4, mesma listagem que já alimentava nome/classe/nível).
 * `classeTexto` já vem combinado via `rotuloClasseCompleto` ("Classe - Arquétipo" para as três
 * classes base, "Classe-base - Experimento Bestial/Artificial/Híbrido" para a subclasse — ela
 * ainda é daquela classe-base); só `CIVIL` (sem classe-base nem arquétipo) mostra a classe sozinha.
 */
export interface ItemFicha {
  readonly id: number;
  /** Dono da ficha — só precisou virar campo próprio no m2-19 (Esquadrão achatado, sem o loop por membro que antes dava esse dado de graça). */
  readonly usuarioId: number;
  /** URL do avatar da ficha (m3-62) — `null` sem imagem definida (cai no placeholder decorativo). */
  readonly imagemUrl: string | null;
  /** Cor de identidade visual (m3-61) — colore a borda/fundo listrado do avatar, ver SCSS. */
  readonly cor: string | null;
  readonly nome: string;
  readonly classeTexto: string;
  readonly nivel: number;
  readonly vidaAtual: number;
  readonly vidaMaxima?: number;
  readonly energiaAtual: number;
  readonly energiaMaxima?: number;
  readonly condicoes: readonly ItemFichaCondicao[];
  /**
   * Vida ≤ 0 (o próprio limiar documentado pra entrar em "Morrendo" — sistema-v4.1.0.md) —
   * destaque visual no cartão mesmo que ninguém tenha marcado a condição ainda (item 4: sinaliza
   * antes do dono/mestre lembrar de marcar o checkbox).
   */
  readonly critico: boolean;
  /** Patente legível, derivada do Prestígio no cliente (`rotuloPatente` — mesma fórmula da ficha completa). */
  readonly patenteTexto: string;
  /** Defesa/Esquiva/Bloqueio — `undefined` numa ficha sem `derivados` salvo ou de classe Civil (não os possui). */
  readonly defesa?: number;
  readonly esquiva?: number;
  readonly bloqueio?: number;
  /** Contra-Ataque — `undefined` numa ficha sem nenhuma habilidade que o conceda. */
  readonly contraAtaque?: number;
  /**
   * Personalidade + nome da Origem (m3-23) já combinados para exibição ("Frio · Guarda-Costas") —
   * `null` quando nenhum dos dois está definido (ficha sem Identidade ainda), pra esconder a linha
   * inteira em vez de deixar um traço solto.
   */
  readonly identidadeTexto: string | null;
  /** Peso do inventário acima do Inventário Máximo (aviso do backend — ver nota em `FichaResumoDto`). */
  readonly sobrecarregado: boolean;
}

/** Ficha da Equipe (m3-65) com acesso completo — mesmos campos de {@link ItemFicha}, clicável. */
export type EquipeFichaExibicao =
  | ({ readonly tipo: 'completa' } & ItemFicha)
  | {
      readonly tipo: 'teaser';
      readonly id: number;
      readonly nome: string;
      readonly imagemUrl: string | null;
      readonly cor: string | null;
      readonly classeTexto: string;
    };

/** Membros ordenados para a coluna "Membros" — mestre primeiro, depois jogadores/espectadores em ordem alfabética pelo nome. */
export function ordenarMembros(
  membros: readonly CampanhaMembroResumoDto[],
): readonly CampanhaMembroResumoDto[] {
  return [...membros].sort((a, b) => {
    if (a.papel !== b.papel) {
      return a.papel === TipoCampanhaMembroPapelEnum.MESTRE ? -1 : 1;
    }
    return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
  });
}

/**
 * Fichas visíveis agrupadas por dono (`usuarioId`), enriquecidas com o rótulo de classe e as
 * três condições — sempre as 3, com `ativa` (item 3: mostra também as inativas, esmaecidas, em
 * vez de sumir quando nada está marcado). O backend já resolve `morrendo`/`machucado`/
 * `inconsciente` para `false` quando ausentes (`FichaResumoDto`). Criaturas nunca entram aqui
 * (forma própria, `ItemCriatura` em `detalhe.page.ts` — só a visão de mestre as usa).
 */
export function agruparFichasPorMembro(
  fichas: readonly FichaResumoDto[],
): ReadonlyMap<number, readonly ItemFicha[]> {
  const mapa = new Map<number, ItemFicha[]>();
  for (const ficha of fichas) {
    if (ficha.tipo === TipoFichaEnum.CRIATURA) {
      continue;
    }
    const item: ItemFicha = {
      id: ficha.id,
      usuarioId: ficha.usuarioId,
      imagemUrl: ficha.imagemUrl,
      cor: ficha.cor ?? null,
      nome: ficha.nome,
      classeTexto: rotuloClasseCompleto(ficha.classe, ficha.arquetipo),
      nivel: ficha.nivel,
      vidaAtual: ficha.vidaAtual,
      vidaMaxima: ficha.vidaMaxima,
      energiaAtual: ficha.energiaAtual,
      energiaMaxima: ficha.energiaMaxima,
      condicoes: CONDICOES_FICHA.map((condicao) => ({ ...condicao, ativa: ficha[condicao.chave] })),
      critico: ficha.vidaAtual <= 0,
      patenteTexto: rotuloPatente(ficha.prestigio ?? 0),
      defesa: ficha.defesa ?? undefined,
      esquiva: ficha.esquiva ?? undefined,
      bloqueio: ficha.bloqueio ?? undefined,
      contraAtaque: ficha.contraAtaque ?? undefined,
      identidadeTexto: [ficha.personalidade, ficha.origemNome].filter(Boolean).join(' · ') || null,
      sobrecarregado: ficha.sobrecarregado ?? false,
    };
    const listaDoDono = mapa.get(ficha.usuarioId);
    if (listaDoDono) {
      listaDoDono.push(item);
    } else {
      mapa.set(ficha.usuarioId, [item]);
    }
  }
  return mapa;
}

/**
 * Uma ficha exibida na Equipe (m3-65): `completa` reusa `ItemFicha` (clicável, com vida/energia
 * — mesmo dado de `fichasPorMembro`); `teaser` é só a carteirinha (nome/classe/foto, sem clique).
 * O mestre (ou o alvo da prévia, quando ele mesmo é dono da campanha — nunca acontece) nunca
 * mostra ficha nenhuma aqui — a Equipe é sobre os colegas de time, o card do mestre vira o chip
 * "Mestre".
 */
export function montarEquipeExibicao(
  membrosOrdenados: readonly CampanhaMembroResumoDto[],
  fichasPorMembro: ReadonlyMap<number, readonly ItemFicha[]>,
): readonly { readonly membro: CampanhaMembroResumoDto; readonly fichas: readonly EquipeFichaExibicao[] }[] {
  return membrosOrdenados.map((membro) => ({
    membro,
    fichas:
      membro.papel === TipoCampanhaMembroPapelEnum.MESTRE
        ? []
        : membro.fichas.map((ficha): EquipeFichaExibicao => {
            const completa = ficha.acessoCompleto
              ? fichasPorMembro.get(membro.usuarioId)?.find((item) => item.id === ficha.id)
              : undefined;
            if (completa) {
              return { tipo: 'completa', ...completa };
            }
            return {
              tipo: 'teaser',
              id: ficha.id,
              nome: ficha.nome,
              imagemUrl: ficha.imagemUrl,
              cor: ficha.cor,
              classeTexto: rotuloClasseCompleto(ficha.classe, ficha.arquetipo),
            };
          }),
  }));
}
