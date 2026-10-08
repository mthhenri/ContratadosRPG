import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "../../enums";
import type {
    FichaNpcHabilidadeDto, NpcCategoriaConsultarDto, NpcHabilidadeReferenciaDto,
} from "../../dtos/ficha";

const { PASSIVA, ATIVA } = HabilidadeTipoNpcEnum;

function passiva(
    nomeNeutro: string, nomeNarrativo: string, descricao: string, restricao?: string,
): FichaNpcHabilidadeDto {
    return { nomeNeutro, nomeNarrativo, tipo: PASSIVA, descricao, ...(restricao ? { restricao } : {}) };
}

function ativa(
    nomeNeutro: string, nomeNarrativo: string, custoEnergia: number, descricao: string,
    restricao?: string,
): FichaNpcHabilidadeDto {
    return {
        nomeNeutro, nomeNarrativo, tipo: ATIVA, custoEnergia, descricao,
        ...(restricao ? { restricao } : {}),
    };
}

/**
 * Guia de mestre — "Guia de Criação de NPCs" > Habilidades > Biblioteca de Referência.
 * Transcrição literal: o nome narrativo é o exemplo do guia ("Ex.: …") e a restrição entre
 * parênteses ao lado do tipo vira `restricao`. Modelos para uso ou adaptação — não limitam a
 * Categoria de quem os adota; o volume continua validado por `validarVolumeHabilidades`.
 */
const BIBLIOTECA: Readonly<Record<CategoriaNpcEnum, readonly FichaNpcHabilidadeDto[]>> = {
    [CategoriaNpcEnum.CIVIL]: [],
    [CategoriaNpcEnum.OPERATIVO]: [
        passiva("Treinamento de Campo", "Segunda Natureza",
            "Este NPC ignora penalidades de -1 dado decorrentes de movimento. Pode atacar após se "
            + "deslocar sem redução no teste."),
        passiva("Alerta Constante", "Olhos nas Costas",
            "Quando alvo de um ataque Furtivo, este NPC realiza um teste de Sentidos DT 14. Em caso "
            + "de sucesso, o atacante perde a vantagem Furtiva para esse ataque."),
        ativa("Disparo de Supressão", "Cabeça Abaixada", 4,
            "O NPC dispara em direção ao alvo sem necessariamente acertá-lo. O alvo realiza um "
            + "teste de Vontade contra a DT Pontaria do NPC. Em caso de falha, sua próxima ação "
            + "deve ser mover-se para cobertura em vez de atacar."),
        ativa("Reposicionamento Tático", "Sombra em Movimento", 3,
            "O NPC se move até DES metros sem provocar reações. Pode realizar um ataque padrão ao "
            + "fim deste deslocamento com -1 dado."),
    ],
    [CategoriaNpcEnum.VETERANO]: [
        passiva("Resistência Forjada", "Linha Dura",
            "No início de cada combate, este NPC ganha pontos de vida temporários iguais a VIG × 3."),
        passiva("Adaptação em Campo", "Lição Aprendida",
            "Quando um NPC aliado dentro de 10 metros é derrotado, este NPC ganha +1 dado em todos "
            + "os testes por 2 turnos."),
        ativa("Ponto de Pressão", "Onde Dói Mais", 6,
            "O NPC realiza um ataque que ignora Nível ÷ 2 pontos de qualquer resistência do alvo. "
            + "Se o alvo já possui uma condição ativa, causa +1D8 de dano adicional."),
        ativa("Coordenação", "Voz de Mando", 7,
            "Até 2 NPCs aliados dentro de 10 metros realizam imediatamente um reposicionamento de "
            + "até DES metros cada ou um ataque padrão. Isso não consome as ações desses NPCs.",
            "Uma vez por rodada."),
    ],
    [CategoriaNpcEnum.ELITE]: [
        passiva("Condicionamento Extremo", "Corpo de Elite",
            "Este NPC possui resistência igual a Nível ÷ 3 (mínimo 2) a um tipo de dano definido "
            + "na criação."),
        passiva("Presença de Comando", "O Nome Que Paralisa",
            "Quando este NPC entra em combate ou derrota um oponente, todos os inimigos com Nível "
            + "de Cooperação 2 ou menos realizam um teste de Vontade contra a DT Social do NPC. Em "
            + "caso de falha, perdem a primeira reação desta rodada."),
        passiva("Reflexos Superiores", "Sétimo Sentido",
            "Quando este NPC normalmente não poderia reagir a um ataque (surpresa, Furtivo sem "
            + "chance de Sentidos), ainda pode tentar uma reação de Defesa com -2.",
            "Uma vez por rodada."),
        ativa("Protocolo Ofensivo", "Modo de Eliminação", 10,
            "O NPC realiza um único ataque com +2 dados e adiciona Nível ao total de dano. Em caso "
            + "de crítico, o alvo fica Atordoado por 1 turno."),
        ativa("Zona de Controle", "Território Marcado", 12,
            "O NPC designa uma área de até 6 metros de raio visível a ele. Por 2 turnos, todos os "
            + "inimigos dentro ou que entrem nessa área sofrem -1 dado em testes de ataque."),
        ativa("Pressão Interrogatória", "Sem Saída", 8,
            "O alvo realiza um teste de Vontade contra a DT Social do NPC. Em caso de falha, seu "
            + "Nível de Cooperação cai em 3 ou ele revela involuntariamente uma informação definida "
            + "pelo Mestre. Pode ser usada em combate ou fora dele.",
            "Uma vez por cena."),
    ],
    [CategoriaNpcEnum.LENDARIO]: [
        passiva("Ápice Humano", "Além do Alcançável",
            "Quando penalidades reduziriam o pool de dados deste NPC a 0, ele ainda rola com o "
            + "mínimo de 2 dados."),
        passiva("Lenda Viva", "Mito com Pulso",
            "Na primeira vez que este NPC cair abaixo de 50% de Vida, recupera imediatamente "
            + "Recarga × 3 de Energia e ganha +2 em todos os testes por 2 turnos.",
            "Uma vez por combate."),
        passiva("Percepção Absoluta", "Nada Escapa",
            "Imune a bônus de ataques Furtivos. Não pode ser flanqueado. Inimigos não conseguem "
            + "surpreender este NPC por meios convencionais."),
        passiva("Resistência de Lenda", "O Que Não Derruba",
            "Quando este NPC entra em Morrendo, todos os NPCs aliados dentro de 10 metros realizam "
            + "imediatamente uma ação livre de ataque ou movimento. Este NPC ganha vida temporária "
            + "igual a VIG × 2 antes dos cálculos de Morrendo."),
        ativa("Golpe Irreversível", "Fim de Conversa", 18,
            "O NPC realiza um único ataque usando seu pool completo de dados + Proficiência. Este "
            + "ataque não pode ser Esquivado, apenas Bloqueado. Em caso de acerto, causa Nível de "
            + "dano adicional e aplica uma condição definida na criação por 2 turnos."),
        ativa("Comando Total", "A Palavra Que Move Exércitos", 15,
            "Todos os NPCs aliados na cena realizam imediatamente uma ação completa gratuita. Por "
            + "1 turno, todos os aliados ganham +1 dado em testes de ataque.",
            "Uma vez por combate."),
        ativa("Foco de Predador", "Alvo Marcado", 14,
            "O Lendário designa um alvo como objetivo primário pelo resto da cena. Todos os ataques "
            + "contra esse alvo ganham +2 dados e Nível de dano adicional. O foco só pode ser "
            + "redirecionado se o alvo for derrotado ou escapar da cena."),
        ativa("Presença Devastadora", "O Peso de um Legado", 20,
            "Todos os inimigos com Nível de Cooperação 4 ou menos realizam um teste de Vontade "
            + "contra a DT Social do NPC. Em caso de falha, perdem seu próximo turno. Em caso de "
            + "falha crítica (falhar por 5 ou mais), o Nível de Cooperação cai para 1 pelo resto "
            + "da cena.",
            "Uma vez por combate."),
    ],
};

/**
 * Modelos da Biblioteca de Referência. Sem `categoria`, devolve todas na ordem do guia
 * (Operativo → Lendário); cada entrada é cópia, para o consumidor não alterar a tabela.
 */
export function listarBibliotecaHabilidadesNpc(
    dto?: NpcCategoriaConsultarDto,
): readonly NpcHabilidadeReferenciaDto[] {
    const categorias = dto ? [dto.categoria] : Object.values(CategoriaNpcEnum);
    return categorias.flatMap((categoria) => BIBLIOTECA[categoria]
        .map((habilidade) => ({ categoria, habilidade: { ...habilidade } })));
}
