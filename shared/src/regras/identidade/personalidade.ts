import { HabilidadeCategoriaEnum, PersonalidadeEstagioEnum, ROTULOS_PERSONALIDADE_ESTAGIO } from '../../enums';
import type { FichaHabilidadeDto, FichaIdentidadeDto, FichaPersonalidadeHabilidadeDto } from '../../dtos/ficha';

/**
 * Motor da Habilidade de Personalidade (`docs/core/sistema-v4.1.0.md` — "Identidade" e
 * "Fortificação de Traços"; m3-78): a Habilidade de Personalidade tem 3 estágios (Base, 1ª e 2ª
 * Fortificação, obtidas nos níveis 7/14), mas só o estágio **ativo** existe como item em
 * `dados.habilidades` a qualquer momento — os 3 rascunhos completos vivem em
 * `identidade.habilidade` (`FichaPersonalidadeHabilidadeDto`). Fonte única usada tanto pelo guia de
 * criação (`criar.page.ts`) quanto pela ficha (`ficha-visualizacao.component.ts`) para sincronizar
 * o item espelhado — nenhum dos dois duplica esta regra.
 */

/**
 * Materializa o estágio **ativo** da Habilidade de Personalidade como o item `categoria:
 * PERSONALIDADE` de `dados.habilidades`. `null` quando não há `identidade.habilidade`, quando a
 * palavra de Personalidade ainda não foi definida (o nome de todo estágio depende dela) ou quando o
 * estágio marcado como `ativa` ainda não tem descrição preenchida — a ferramenta não inventa um
 * valor que Mestre e Jogador ainda não combinaram. O nome de uma Fortificação nunca é livre: é
 * sempre a palavra de Personalidade seguida do rótulo do estágio (`docs/core/sistema-v4.1.0.md` —
 * exemplo "⬦ Determinado" mantido em toda Fortificação, só descrição/custo mudam).
 */
export function materializarHabilidadePersonalidade(
  identidade: Pick<FichaIdentidadeDto, 'personalidade' | 'habilidade'> | undefined,
): FichaHabilidadeDto | null {
  const habilidade = identidade?.habilidade;
  if (!habilidade) {
    return null;
  }

  const nomePersonalidade = identidade?.personalidade?.trim() ?? '';
  if (!nomePersonalidade) {
    return null;
  }

  if (habilidade.ativa === PersonalidadeEstagioEnum.BASE) {
    const base = habilidade.base;
    if (!base || !base.descricao.trim()) {
      return null;
    }
    return {
      nome: nomePersonalidade,
      categoria: HabilidadeCategoriaEnum.PERSONALIDADE,
      custoEnergia: base.custoEnergia,
      descricao: base.descricao,
    };
  }

  const fortificacao =
    habilidade.ativa === PersonalidadeEstagioEnum.FORTIFICACAO_1
      ? habilidade.fortificacao1
      : habilidade.fortificacao2;
  if (!fortificacao || !fortificacao.descricao.trim()) {
    return null;
  }
  return {
    nome: `${nomePersonalidade} — ${ROTULOS_PERSONALIDADE_ESTAGIO[habilidade.ativa]}`,
    categoria: HabilidadeCategoriaEnum.PERSONALIDADE,
    custoEnergia: fortificacao.custoEnergia,
    descricao: fortificacao.descricao,
  };
}

/**
 * Estágio mais alto desbloqueado por uma contagem de Fortificações acumuladas
 * (`calcularProgressaoAcumulada(...).fortificacoes`, `shared/regras/agente/progressao`) — usado
 * tanto pelo guia (nível de criação) quanto pela ficha (nível atual) para decidir qual estágio é
 * `ativa` por padrão.
 */
export function estagioMaisAltoDesbloqueado(fortificacoesDesbloqueadas: number): PersonalidadeEstagioEnum {
  if (fortificacoesDesbloqueadas >= 2) {
    return PersonalidadeEstagioEnum.FORTIFICACAO_2;
  }
  if (fortificacoesDesbloqueadas >= 1) {
    return PersonalidadeEstagioEnum.FORTIFICACAO_1;
  }
  return PersonalidadeEstagioEnum.BASE;
}

/**
 * Estágios disponíveis para seleção como `ativa` numa contagem de Fortificações desbloqueadas —
 * Base sempre disponível; as Fortificações só quando o nível (de criação ou atual) já as concedeu.
 * Usado pelo seletor de estágio ativo da aba Extras da ficha (m3-78).
 */
export function estagiosDisponiveis(
  fortificacoesDesbloqueadas: number,
): readonly PersonalidadeEstagioEnum[] {
  const estagios: PersonalidadeEstagioEnum[] = [PersonalidadeEstagioEnum.BASE];
  if (fortificacoesDesbloqueadas >= 1) {
    estagios.push(PersonalidadeEstagioEnum.FORTIFICACAO_1);
  }
  if (fortificacoesDesbloqueadas >= 2) {
    estagios.push(PersonalidadeEstagioEnum.FORTIFICACAO_2);
  }
  return estagios;
}

/** `FichaPersonalidadeHabilidadeDto` sem nenhum estágio preenchido — ponto de partida do rascunho da ficha. */
export function personalidadeHabilidadeVazia(ativa: PersonalidadeEstagioEnum): FichaPersonalidadeHabilidadeDto {
  return { ativa, base: null, fortificacao1: null, fortificacao2: null };
}
