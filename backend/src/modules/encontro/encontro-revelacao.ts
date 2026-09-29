import type {
  EncontroCombatenteResumoDto,
  EncontroRecuperadoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import { TipoFichaEnum } from '@contratados-rpg/shared/enums';

/**
 * Recorte de **revelação** do Encontro (m7-06, ajustado em m7-16): o que um jogador pode ver do
 * estado que o mestre enxerga por inteiro.
 *
 * A regra dos **números** não é nova — é a mesma `usuario_ficha_acesso` que já governa a ficha
 * fora do combate (§14): quem não pode abrir a ficha da criatura também não pode ler a Vida dela
 * pela tela de Iniciativa. Entrar num encontro não revela nada.
 *
 * **O que sobra sempre.** Nome, iniciativa, Cadência e a posição na ordem — a identidade mínima
 * **sem a qual não existe ordem de turno**: o mestre anuncia essas quatro coisas em voz alta na
 * mesa, e sem elas o jogador não sabe de quem é a vez.
 *
 * **A identidade "de carteirinha" (m7-16).** Um agente (`JOGADOR`) cuja ficha não está `oculta`
 * (m3-65) não é segredo — a mesma "carteirinha" (avatar, dono, classe) já aparece pra
 * qualquer membro fora do encontro, em `CampanhaRepository.listarMembros`. Escondê-la aqui só
 * porque o dono não concedeu `usuario_ficha_acesso` (que é sobre abrir a ficha **inteira**, não
 * sobre saber quem está na mesa) tratava um colega de squad como um segredo do mestre. Ela some
 * só quando a própria ficha está oculta — e, desde fix-ficha-oculta-identidade-encontro, o
 * combatente inteiro some junto (ver abaixo). Os **números** (vida, defesas, condições,
 * Destreza) continuam atrás da concessão de sempre, oculta ou não.
 *
 * **Avulso conta como não revelado.** Ele não tem ficha, logo não há o que revelar — e não existe
 * mecanismo de concessão para ele. O padrão seguro é o segredo: um "Sujeito Contido" digitado pelo
 * mestre entra na ordem com nome e iniciativa, sem entregar a Vida que o mestre acabou de definir.
 *
 * **Agente oculto de terceiro some (fix-ficha-oculta-identidade-encontro).** O que sobra sempre
 * não vale para a ficha de `JOGADOR` marcada `oculta` que o observador não pode abrir (§14: a
 * ocultação some para todo terceiro, inclusive identidade e marcadores). O combatente sai de
 * `combatentes`, os slots dele saem de `ordemRodada` e os eventos dele saem do log — nada de
 * nome, id ou cartão genérico. Durante o turno dele, a vez aparece no **próximo** slot visível
 * da rodada (no último visível, se ele fecha a rodada): a ordem real do mestre não muda, e o
 * observador não recebe sinal de que existe alguém agindo fora da sua vista. Criatura/NPC não
 * revelada continua como antes — o mestre a anuncia na mesa.
 *
 * Módulo **puro**: recebe o estado já montado e os dois conjuntos de fichas (acesso aos números;
 * identidade "de carteirinha") e devolve outro estado. Quem descobre esses conjuntos é a
 * `EncontroService` — o primeiro consultando a service dona da regra (`FichaService.listarFichas`,
 * proibição #28); o segundo é dado bruto (`ficha.oculta`) já carregado com a própria linha do
 * combatente, não uma segunda consulta de permissão.
 */

/**
 * Zera os números e mantém a identidade da ordem de turno — mais a "carteirinha" do agente
 * (avatar, dono, classe) quando `identidadeVisivel`.
 */
function ocultarCombatente(
  combatente: EncontroCombatenteResumoDto,
  identidadeVisivel: boolean,
): EncontroCombatenteResumoDto {
  const carteirinhaVisivel = identidadeVisivel && combatente.tipoFicha === TipoFichaEnum.JOGADOR;
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
    resistencias: null,
    condicoes: [],
    morrendo: null,
    machucado: null,
    inconsciente: null,
    // A Destreza só serve ao desempate da ordenação (feita no servidor) e ao `Rolar tudo` do
    // mestre — o jogador não precisa dela, e ela é um dado de ficha como qualquer outro.
    destreza: 0,
    iniciativaBonus: 0,
    dadoExtraIniciativa: 0,
    // Mestre-only para editar; some junto dos demais números de quem não tem revelação (m7-19).
    iniciativaFormulaCustom: null,
    // A cor é identidade visual, não informação de jogo: sobrevive junto com o nome.
    corFicha: combatente.corFicha,
    // Avatar e "carteirinha": só sobrevivem pro agente de ficha não oculta (m7-16) — criatura/NPC
    // seguem sem nada disso (o agente oculto de terceiro nem chega aqui: sai do estado inteiro).
    imagemUrl: carteirinhaVisivel ? combatente.imagemUrl : null,
    imagemFoco: carteirinhaVisivel ? combatente.imagemFoco : null,
    donoNome: carteirinhaVisivel ? combatente.donoNome : null,
    classe: carteirinhaVisivel ? combatente.classe : null,
    arquetipo: carteirinhaVisivel ? combatente.arquetipo : null,
    revelado: false,
  };
}

/**
 * `true` quando o combatente é um agente (`JOGADOR`) de ficha oculta que o observador não pode
 * abrir — o dono e o mestre (ou o alvo dono, na prévia) têm a ficha em `fichaIdsVisiveis`.
 */
function agenteOcultoDeTerceiro(
  combatente: EncontroCombatenteResumoDto,
  fichaIdsVisiveis: ReadonlySet<number>,
  fichaIdsIdentidadeVisivel: ReadonlySet<number>,
): boolean {
  return (
    combatente.tipoFicha === TipoFichaEnum.JOGADOR &&
    combatente.fichaId !== null &&
    !fichaIdsVisiveis.has(combatente.fichaId) &&
    !fichaIdsIdentidadeVisivel.has(combatente.fichaId)
  );
}

/**
 * Posição do turno na ordem já sem os slots removidos: o próprio slot quando ele sobrevive; o
 * próximo visível quando é a vez de um removido; o último visível quando nenhum resta depois.
 */
function reposicionarTurno(
  ordemRodada: EncontroRecuperadoDto['ordemRodada'],
  turnoIndice: number,
  removidos: ReadonlySet<number>,
): number {
  const visiveisAntes = ordemRodada
    .slice(0, turnoIndice)
    .filter((slot) => !removidos.has(slot.combatenteId)).length;
  const totalVisiveis = ordemRodada.filter((slot) => !removidos.has(slot.combatenteId)).length;
  return Math.max(Math.min(visiveisAntes, totalVisiveis - 1), 0);
}

/**
 * Aplica o recorte de revelação a um estado completo. `fichaIdsVisiveis` é o conjunto de fichas
 * que o usuário pode **abrir** na campanha (números); `fichaIdsIdentidadeVisivel` é o conjunto
 * mais largo de agentes cuja ficha não está oculta (carteirinha, m7-16) — todo `fichaIdsVisiveis`
 * também está em `fichaIdsIdentidadeVisivel` (quem pode abrir a ficha inteira também vê a
 * carteirinha dela), mas não o contrário.
 *
 * O **log** acompanha: um evento preso a um combatente sem números ("SCP-1471-A sofreu 12 de
 * dano") entregaria pelo texto exatamente o número que o resumo escondeu, então ele é removido.
 * Eventos sem combatente (viradas de rodada, início e fim) continuam — são a cronologia da cena,
 * que o jogador viveu.
 *
 * O agente oculto de terceiro sai por inteiro, com `ordemRodada` e `turnoIndice` reposicionados
 * (ver o cabeçalho do módulo).
 */
export function ocultarNaoRevelados(
  estado: EncontroRecuperadoDto,
  fichaIdsVisiveis: ReadonlySet<number>,
  fichaIdsIdentidadeVisivel: ReadonlySet<number>,
): EncontroRecuperadoDto {
  const removidos = new Set(
    estado.combatentes
      .filter((combatente) =>
        agenteOcultoDeTerceiro(combatente, fichaIdsVisiveis, fichaIdsIdentidadeVisivel),
      )
      .map((combatente) => combatente.id),
  );
  const combatentes = estado.combatentes
    .filter((combatente) => !removidos.has(combatente.id))
    .map((combatente) =>
      combatente.fichaId !== null && fichaIdsVisiveis.has(combatente.fichaId)
        ? combatente
        : ocultarCombatente(
            combatente,
            combatente.fichaId !== null && fichaIdsIdentidadeVisivel.has(combatente.fichaId),
          ),
    );
  const ocultos = new Set(
    combatentes.filter((combatente) => !combatente.revelado).map((combatente) => combatente.id),
  );
  return {
    ...estado,
    combatentes,
    ordemRodada:
      removidos.size === 0
        ? estado.ordemRodada
        : estado.ordemRodada.filter((slot) => !removidos.has(slot.combatenteId)),
    turnoIndice:
      removidos.size === 0
        ? estado.turnoIndice
        : reposicionarTurno(estado.ordemRodada, estado.turnoIndice, removidos),
    eventos: estado.eventos.filter(
      (evento) =>
        evento.combatenteId === null ||
        (!ocultos.has(evento.combatenteId) && !removidos.has(evento.combatenteId)),
    ),
  };
}
