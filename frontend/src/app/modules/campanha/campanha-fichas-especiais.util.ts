import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { obterReferenciaCategoria } from '@contratados-rpg/shared/regras/npc';

import { nomePorte, rotuloComportamento, rotuloNivelAmeaca } from '../ficha/rotulos-criatura';
import type { CriaturaEsquadraoCardDados } from './componentes/criatura-esquadrao-card/criatura-esquadrao-card.component';
import type { EspectadorFichaCardDados } from './componentes/espectador-ficha-card/espectador-ficha-card.component';

/**
 * Projeções de `FichaResumoDto` para os cartões das abas Criaturas e NPCs da campanha do mestre
 * (m4-15). Só apresentação: nenhum valor é calculado ou inventado — o que o resumo não traz fica
 * ausente (o cartão omite) ou com o mesmo placeholder que o acervo já usa.
 */

/** Placeholder do registro ausente — o mesmo de `montarItemCriatura` (acervo). */
const REGISTRO_AUSENTE = 'SCP - ?????';
const TEXTO_AUSENTE = '—';

export function montarCriaturaEsquadrao(ficha: FichaResumoDto): CriaturaEsquadraoCardDados {
  return {
    id: ficha.id,
    usuarioId: ficha.usuarioId,
    imagemUrl: ficha.imagemUrl,
    cor: ficha.cor ?? null,
    nome: ficha.nome,
    registroTexto: ficha.registro?.trim() || REGISTRO_AUSENTE,
    porteTexto: ficha.porte ? nomePorte(ficha.porte) : TEXTO_AUSENTE,
    comportamentoTexto: ficha.comportamento ? rotuloComportamento(ficha.comportamento) : TEXTO_AUSENTE,
    naTexto: ficha.na ? rotuloNivelAmeaca(ficha.na) : TEXTO_AUSENTE,
    vidaAtual: ficha.vidaAtual,
    vidaMaxima: ficha.vidaMaxima,
    defesa: ficha.defesa,
    critico: ficha.vidaAtual <= 0,
  };
}

/** O NPC Civil não tem Energia (`calcularEnergia` → 0) — o cartão não exibe a barra. Defesa/Esquiva/Bloqueio todo NPC tem. */
export function npcTemEnergia(ficha: FichaResumoDto): boolean {
  return ficha.categoria !== 'CIVIL';
}

/**
 * NPC no cartão do Esquadrão (`EspectadorFichaCard`): linha superior = categoria (o NPC pertence ao
 * mestre, não a um jogador), linha de classe = nível. Contra-Ataque não existe no resumo do NPC.
 */
export function montarNpcEsquadrao(ficha: FichaResumoDto): EspectadorFichaCardDados {
  return {
    id: ficha.id,
    usuarioId: ficha.usuarioId,
    imagemUrl: ficha.imagemUrl,
    cor: ficha.cor ?? null,
    nome: ficha.nome,
    donoNome: ficha.categoria ? obterReferenciaCategoria({ categoria: ficha.categoria }).rotulo : 'NPC',
    classeTexto: `Nível ${ficha.nivel}`,
    vidaAtual: ficha.vidaAtual,
    vidaMaxima: ficha.vidaMaxima,
    energiaAtual: ficha.energiaAtual,
    energiaMaxima: ficha.energiaMaxima,
    critico: ficha.vidaAtual <= 0,
    defesa: ficha.defesa,
    esquiva: ficha.esquiva,
    bloqueio: ficha.bloqueio,
  };
}
