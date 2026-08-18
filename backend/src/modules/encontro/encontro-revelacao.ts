import type {
  EncontroCombatenteResumoDto,
  EncontroRecuperadoDto,
} from '@contratados-rpg/shared/dtos/encontro';

/**
 * Recorte de **revelação** do Encontro (m7-06): o que um jogador pode ver do estado que o mestre
 * enxerga por inteiro.
 *
 * A regra não é nova — é a mesma `usuario_ficha_acesso` que já governa a ficha fora do combate
 * (§14). Aqui ela só é **aplicada** ao resumo do combatente: quem não pode abrir a ficha da criatura
 * também não pode ler a Vida dela pela tela de Iniciativa. Entrar num encontro não revela nada.
 *
 * **O que sobra.** Nome, iniciativa, Cadência e a posição na ordem — a identidade mínima **sem a
 * qual não existe ordem de turno**: o mestre anuncia essas quatro coisas em voz alta na mesa, e sem
 * elas o jogador não sabe de quem é a vez. O que some são os **números**: vida, energia, defesas,
 * condições e Destreza.
 *
 * **Avulso conta como não revelado.** Ele não tem ficha, logo não há o que revelar — e não existe
 * mecanismo de concessão para ele. O padrão seguro é o segredo: um "Sujeito Contido" digitado pelo
 * mestre entra na ordem com nome e iniciativa, sem entregar a Vida que o mestre acabou de definir.
 *
 * Módulo **puro**: recebe o estado já montado e o conjunto de fichas visíveis, e devolve outro
 * estado. Quem descobre esse conjunto é a `EncontroService`, consultando a service dona da regra
 * (`FichaService.listarFichas`) — nunca reimplementando a consulta de acesso (proibição #28).
 */

/** Zera tudo que é número/estado e mantém só a identidade da ordem de turno. */
function ocultarCombatente(combatente: EncontroCombatenteResumoDto): EncontroCombatenteResumoDto {
  return {
    id: combatente.id,
    encontroId: combatente.encontroId,
    origem: combatente.origem,
    fichaId: combatente.fichaId,
    tipoFicha: combatente.tipoFicha,
    nome: combatente.nome,
    iniciativa: combatente.iniciativa,
    cadencia: combatente.cadencia,
    ordem: combatente.ordem,
    vidaAtual: 0,
    vidaMaxima: 0,
    energiaAtual: null,
    energiaMaxima: null,
    defesa: null,
    esquiva: null,
    bloqueio: null,
    contraAtaque: null,
    condicoes: [],
    morrendo: null,
    machucado: null,
    inconsciente: null,
    // A Destreza só serve ao desempate da ordenação (feita no servidor) e ao `Rolar tudo` do
    // mestre — o jogador não precisa dela, e ela é um dado de ficha como qualquer outro.
    destreza: 0,
    iniciativaBonus: 0,
    // A cor é identidade visual, não informação de jogo: sobrevive junto com o nome.
    corFicha: combatente.corFicha,
    revelado: false,
  };
}

/**
 * Aplica o recorte de revelação a um estado completo. `fichaIdsVisiveis` é o conjunto de fichas
 * que o usuário pode abrir na campanha; combatente fora dele (ou sem ficha) sai oculto.
 *
 * O **log** acompanha: um evento preso a um combatente oculto ("SCP-1471-A sofreu 12 de dano")
 * entregaria pelo texto exatamente o número que o resumo escondeu, então ele é removido. Eventos
 * sem combatente (viradas de rodada, início e fim) continuam — são a cronologia da cena, que o
 * jogador viveu.
 */
export function ocultarNaoRevelados(
  estado: EncontroRecuperadoDto,
  fichaIdsVisiveis: ReadonlySet<number>,
): EncontroRecuperadoDto {
  const combatentes = estado.combatentes.map((combatente) =>
    combatente.fichaId !== null && fichaIdsVisiveis.has(combatente.fichaId)
      ? combatente
      : ocultarCombatente(combatente),
  );
  const ocultos = new Set(
    combatentes.filter((combatente) => !combatente.revelado).map((combatente) => combatente.id),
  );
  return {
    ...estado,
    combatentes,
    eventos: estado.eventos.filter(
      (evento) => evento.combatenteId === null || !ocultos.has(evento.combatenteId),
    ),
  };
}
