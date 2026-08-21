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
 * só quando a própria ficha está oculta — nesse caso ela recebe o mesmo tratamento de uma
 * criatura não revelada. Os **números** (vida, defesas, condições, Destreza) continuam atrás da
 * concessão de sempre, oculta ou não.
 *
 * **Avulso conta como não revelado.** Ele não tem ficha, logo não há o que revelar — e não existe
 * mecanismo de concessão para ele. O padrão seguro é o segredo: um "Sujeito Contido" digitado pelo
 * mestre entra na ordem com nome e iniciativa, sem entregar a Vida que o mestre acabou de definir.
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
    // Avatar e "carteirinha": só sobrevivem pro agente de ficha não oculta (m7-16) — criatura/NPC
    // e agente oculto seguem sem nada disso, só chega a quem já tinha permissão para abri-la.
    imagemUrl: carteirinhaVisivel ? combatente.imagemUrl : null,
    imagemFoco: carteirinhaVisivel ? combatente.imagemFoco : null,
    donoNome: carteirinhaVisivel ? combatente.donoNome : null,
    classe: carteirinhaVisivel ? combatente.classe : null,
    arquetipo: carteirinhaVisivel ? combatente.arquetipo : null,
    revelado: false,
  };
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
 */
export function ocultarNaoRevelados(
  estado: EncontroRecuperadoDto,
  fichaIdsVisiveis: ReadonlySet<number>,
  fichaIdsIdentidadeVisivel: ReadonlySet<number>,
): EncontroRecuperadoDto {
  const combatentes = estado.combatentes.map((combatente) =>
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
    eventos: estado.eventos.filter(
      (evento) => evento.combatenteId === null || !ocultos.has(evento.combatenteId),
    ),
  };
}
