import type {
  ArquetipoEnum,
  CadenciaEnum,
  ClasseEnum,
  CombatenteOrigemEnum,
  EncontroEventoTipoEnum,
  EncontroStatusEnum,
  TipoDanoEnum,
  TipoFichaEnum,
} from '../../enums';
import type { FichaImagemArquivoDto, FichaImagemFocoDto } from '../ficha';

/**
 * DTOs do módulo `encontro` (m7) — o Encontro de Combate: ordem de iniciativa com a Cadência das
 * criaturas intercalada, rodadas/turnos, vida e condições dos combatentes, espelhado em tempo real
 * para a campanha. Seguem a fórmula `Entidade + Complemento? + Verbo + Dto` (CONVENTIONS):
 * entrada no infinitivo, saída no particípio, `Interno` marca o que trafega só entre service e
 * repository.
 *
 * **Fonte única (decisão do milestone).** Vida e condições de um combatente **com ficha** são as da
 * própria ficha — o encontro **não** guarda uma segunda cópia. `EncontroCombatenteResumoDto` traz
 * esses valores **lidos** da ficha no momento da consulta; só o combatente `AVULSO` (sem ficha)
 * persiste `vidaMaxima`/`vidaAtual` próprios. "Encontro" é o nome do **domínio**; a tela se chama
 * "Iniciativa".
 */

// ── Value objects ────────────────────────────────────────────────────────────

/**
 * Um slot da sequência de turnos de uma rodada. `ocorrencia` distingue os turnos múltiplos de um
 * mesmo combatente com Cadência > Singular (1 = primeiro turno, 2 = segundo, …), já
 * **intercalados** pela regra do guia — o turno extra cai no próximo slot abaixo, nunca em
 * sequência (`docs/core/guia_de_mestre-v4.0.0.md` — "Intercalação na Iniciativa").
 */
export interface OrdemTurnoDto {
  readonly combatenteId: number;
  readonly ocorrencia: number;
}

/**
 * Marcador de condição sobre um combatente, com duração em rodadas (mockup: `Sangramento ·
 * 2 rodadas`). `rodadasRestantes: null` = permanente até remoção manual; `perdeTurno` marca a
 * condição que **consome** o próximo turno do combatente (ex.: `Inconsciente`, `Insolação` —
 * `sistema-v4.1.0.md`, "Condições").
 *
 * Distinto das três condições da ficha (`morrendo`/`machucado`/`inconsciente`, em
 * `FichaEstadoDto`), que são **flags alternadas manualmente** por quem joga — o motor nunca as
 * recalcula a partir de `vidaAtual` (m3-10). O encontro as **lê** da ficha; não as grava aqui.
 */
export interface CondicaoCombatenteDto {
  readonly nome: string;
  readonly rodadasRestantes: number | null;
  readonly perdeTurno: boolean;
}

/**
 * Uma entrada do log do encontro — a trilha legível exibida no painel "Log da rodada". `texto` já
 * chega pronto para leitura ("sofreu 11 de dano de V. Corvalho"); `rodada`/`turno` posicionam a
 * entrada (`R3`, `T3 · 2`). `combatenteId` é nulo para eventos da rodada inteira.
 */
export interface EncontroEventoDto {
  readonly id: number;
  readonly tipo: EncontroEventoTipoEnum;
  readonly rodada: number;
  readonly turno: number;
  readonly texto: string;
  readonly combatenteId: number | null;
  readonly createdDate: string;
}

// ── Combatente ───────────────────────────────────────────────────────────────

/**
 * Item da lista de combatentes do encontro. Um combatente é **ou** uma ficha (`origem: FICHA`,
 * `fichaId` preenchido) **ou** um avulso (`origem: AVULSO`, `fichaId: null`).
 *
 * Vida/Energia: para `FICHA`, `vidaAtual`/`vidaMaxima`/`energiaAtual`/`energiaMaxima` são **lidos
 * da ficha** (fonte única, nunca duplicados em `encontro_combatente`); para `AVULSO`, vêm das
 * colunas próprias e a Energia é nula. `iniciativa` é nula enquanto não for rolada/atribuída.
 *
 * Defesas: `esquiva`/`bloqueio`/`contraAtaque` só existem para agente e NPC. **Criatura não reage
 * a ataques** — `FichaCriaturaDadosDto` tem apenas `defesa`, então os três vêm nulos para
 * `tipoFicha: CRIATURA` (a regra vence o mockup, §16 #27).
 */
export interface EncontroCombatenteResumoDto {
  readonly id: number;
  readonly encontroId: number;
  readonly origem: CombatenteOrigemEnum;
  readonly fichaId: number | null;
  readonly tipoFicha: TipoFichaEnum | null;
  readonly nome: string;
  readonly iniciativa: number | null;
  readonly cadencia: CadenciaEnum;
  /** Quantidade efetiva; em Cadência Frenética pode ser qualquer inteiro a partir de 4. */
  readonly turnosPorRodada?: number;
  readonly ordem: number;
  readonly vidaAtual: number;
  readonly vidaMaxima: number;
  readonly energiaAtual: number | null;
  readonly energiaMaxima: number | null;
  readonly defesa: number | null;
  readonly esquiva: number | null;
  readonly bloqueio: number | null;
  readonly contraAtaque: number | null;
  readonly condicoes: readonly CondicaoCombatenteDto[];
  /**
   * As três condições da própria ficha (`FichaEstadoDto`), **lidas** e nunca gravadas pelo
   * encontro: são alternadas à mão por quem joga (m3-10), não deduzidas de `vidaAtual`. Nulas
   * para o combatente avulso, que não tem ficha.
   */
  readonly morrendo: boolean | null;
  readonly machucado: boolean | null;
  readonly inconsciente: boolean | null;
  /** Destreza efetiva — desempate da ordenação de iniciativa (`shared/regras/encontro`). */
  readonly destreza: number;
  /**
   * Bônus fixo de Iniciativa do combatente — hoje só a criatura o possui
   * (`FichaCriaturaDadosDto.iniciativaBonus`, ≈ 10% do VD); agente e avulso saem `0`. Serve ao
   * atalho **Rolar tudo** do mestre, que o soma à rolagem de Destreza. O bônus de Iniciativa do
   * agente **não** é um número fixo: são **dados extras** (amplificador `Atento` + Formação da
   * Origem) que só o documento completo da ficha resolve — por isso o jogador rola a própria
   * iniciativa pelo fluxo normal (decisão do milestone) e o `Rolar tudo` é fallback.
   */
  readonly iniciativaBonus: number;
  /**
   * Dado extra de Iniciativa: amplificador `Atento` (`ajusteDadoIniciativaAmplificadores`) +
   * Formação da Origem (`PERICIA_DADO_INICIATIVA`, `obterDadoExtraIniciativaFormacao`) — soma à
   * quantidade de D6 do atalho **Rolar tudo** do mestre, ao lado da Destreza; mesma soma que
   * `dadoExtraIniciativaDaFicha` já faz para o caminho do jogador. Só o agente pode ter
   * amplificador/Formação; criatura, NPC e avulso saem sempre `0`.
   */
  readonly dadoExtraIniciativa: number;
  /** Cor de identidade da ficha (m3-61); `null` cai no `--accent` de quem visualiza. */
  readonly corFicha: string | null;
  /**
   * Avatar e enquadramento da ficha. Para um agente (`tipoFicha: JOGADOR`) cuja ficha não está
   * `oculta` (m3-65), sobrevive mesmo sem `revelado` — mesmo recorte de identidade que
   * `CampanhaRepository.listarMembros` já usa fora do encontro (m7-16); `null` quando a ficha
   * está oculta ou é de uma criatura/NPC não revelado.
   */
  readonly imagemUrl: string | null;
  readonly imagemFoco: FichaImagemFocoDto | null;
  /**
   * Dono da ficha (`usuario.nome`) e classe/arquétipo — só presentes num agente (`JOGADOR`) e
   * sujeitos à mesma regra de `imagemUrl` acima: sobrevivem sem `revelado` quando a ficha não está
   * oculta. `null` para criatura/NPC/avulso ou agente oculto/não revelado (m7-16). Nível fica de
   * fora de propósito — a carteirinha identifica quem é o agente, não avalia sua força.
   */
  readonly donoNome: string | null;
  readonly classe: ClasseEnum | null;
  readonly arquetipo: ArquetipoEnum | null;
  /**
   * Resistência a dano por tipo (m7-17), mesmo total que a ficha mostra na aba Combate — soma de
   * base manual + equipamento + Formação para o agente (`montarResistencias`), soma das linhas de
   * `resistencias` para a criatura (`somarResistenciasCriaturaPorTipo`). Tipo ausente do mapa vale
   * `0`. `null` para NPC (contrato ainda não tipado, m4-05) e avulso, que não têm ficha nenhuma —
   * é um número como os outros, sujeito à mesma regra de `revelado` acima.
   */
  readonly resistencias: Partial<Record<TipoDanoEnum, number>> | null;
  /**
   * `false` quando quem consulta **não** tem direito de ver os **números** deste combatente fora
   * do encontro (m7-06): a criatura que o mestre ainda não revelou (`usuario_ficha_acesso`), a
   * ficha de outro jogador sem concessão e o avulso, que não tem ficha para revelar. Nesse caso o
   * backend **já zera** vida, energia, defesas, condições e Destreza antes de responder — o resumo
   * conserva a identidade mínima da ordem de turno (nome, iniciativa, Cadência) e, para um agente
   * de ficha não oculta, também a identidade "de carteirinha" acima (avatar, dono, classe, nível)
   * — só os números ficam atrás da concessão. O mestre recebe sempre `true`.
   */
  readonly revelado: boolean;
}

/**
 * Entrada da adição de um combatente — o `encontroId` vem da rota (`@Param`, injetado no DTO pela
 * controller). Para `FICHA`, basta `fichaId` (nome, vida, defesas e cadência são resolvidos da
 * ficha). Para `AVULSO`, o mestre informa `nomeAvulso`, `vidaMaximaAvulso` e a `cadencia`.
 */
export interface EncontroCombatenteAdicionarDto {
  readonly fichaId: number | null;
  readonly nomeAvulso: string | null;
  readonly vidaMaximaAvulso: number | null;
  readonly cadencia: CadenciaEnum | null;
  /** Obrigatório e ≥ 4 quando o avulso usa Cadência Frenética; ignorado nas cadências fixas. */
  readonly turnosPorRodada?: number | null;
  /** Obrigatória para avulso; nula/ignorada quando a origem é uma ficha. */
  readonly corAvulso?: string | null;
}

/** Entrada da troca da cor de identidade de um combatente avulso. */
export interface EncontroCombatenteIdentidadeAlterarDto {
  readonly id: number;
  readonly cor: string;
}

/** Entrada multipart da troca de imagem de um combatente avulso. */
export interface EncontroCombatenteImagemAlterarDto {
  readonly id: number;
  readonly arquivo: FichaImagemArquivoDto;
}

/** Entrada da remoção da imagem de um combatente avulso. */
export interface EncontroCombatenteImagemExcluirDto {
  readonly id: number;
}

/** Saída da adição — o combatente já resolvido, pronto para entrar na lista. */
export interface EncontroCombatenteAdicionadoDto {
  readonly combatente: EncontroCombatenteResumoDto;
}

/** Entrada da remoção de um combatente do encontro (soft delete). */
export interface EncontroCombatenteRemoverDto {
  readonly id: number;
}

/**
 * Entrada da atribuição de iniciativa a um combatente — vale tanto para o **resultado da rolagem
 * do jogador** quanto para o **override manual do mestre**. O valor final já vem somado (rolagem +
 * bônus): o cálculo é do motor de rolagem/ficha, não deste módulo.
 */
export interface EncontroCombatenteIniciativaAtribuirDto {
  readonly id: number;
  readonly iniciativa: number;
}

/** Saída da atribuição de iniciativa. */
export interface EncontroCombatenteIniciativaAtribuidaDto {
  readonly combatente: EncontroCombatenteResumoDto;
}

/** Entrada da aplicação de uma condição a um combatente. `rodadasRestantes: null` = permanente. */
export interface EncontroCombatenteCondicaoAtribuirDto {
  readonly id: number;
  readonly nome: string;
  readonly rodadasRestantes: number | null;
  readonly perdeTurno: boolean;
}

/** Entrada da remoção manual de uma condição (antes de expirar sozinha). */
export interface EncontroCombatenteCondicaoRemoverDto {
  readonly id: number;
  readonly nome: string;
}

// ── Encontro ─────────────────────────────────────────────────────────────────

/**
 * Entrada da criação do encontro — o `campanhaId` vem da rota. Nasce em `MONTAGEM`, sem
 * combatentes. Só o **mestre** da campanha cria, e a campanha aceita no máximo **um** encontro
 * não-encerrado por vez.
 */
export interface EncontroCriarDto {
  readonly nome: string;
}

/** Saída da criação — o encontro recém-criado, ainda vazio. */
export interface EncontroCriadoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly status: EncontroStatusEnum;
}

/** Entrada da recuperação individual do encontro (recuperação individual sempre `{ id }`). */
export interface EncontroRecuperarDto {
  readonly id: number;
}

/**
 * Estado completo do encontro — o que a tela "Iniciativa" precisa para desenhar tudo: cabeçalho
 * (`rodadaAtual`, `turnoIndice`), lista de combatentes, a `ordemRodada` já intercalada por
 * `shared/regras/encontro` e o log. `turnoIndice` aponta para uma posição de `ordemRodada`.
 */
export interface EncontroRecuperadoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly status: EncontroStatusEnum;
  readonly rodadaAtual: number;
  readonly turnoIndice: number;
  readonly combatentes: readonly EncontroCombatenteResumoDto[];
  readonly ordemRodada: readonly OrdemTurnoDto[];
  readonly eventos: readonly EncontroEventoDto[];
}

/**
 * Payload de broadcast (`encontro:alterado`) — o estado completo após uma mutação já persistida.
 * Emitido pela service **depois** de salvar, na sala `campanha:<id>` (§9, broadcast-only): nenhuma
 * escrita entra pelo gateway.
 */
export interface EncontroAlteradoDto {
  readonly encontro: EncontroRecuperadoDto;
}

/** Item de listagem dos encontros de uma campanha (corrente + histórico). */
export interface EncontroResumoDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly status: EncontroStatusEnum;
  readonly rodadaAtual: number;
  readonly quantidadeCombatentes: number;
  readonly createdDate: string;
}

/**
 * Entrada do início do combate (`MONTAGEM` → `ATIVO`) — exige todos os combatentes com iniciativa
 * definida. Calcula a ordem da rodada 1 e posiciona o turno no primeiro slot.
 */
export interface EncontroIniciarDto {
  readonly id: number;
}

/** Entrada do encerramento (`ATIVO` → `ENCERRADO`) — depois disso o encontro é imutável. */
export interface EncontroEncerrarDto {
  readonly id: number;
}

/**
 * Entrada do avanço de turno. Ao passar do último slot da rodada, a rodada **incrementa**, as
 * condições expiram e a ordem é recalculada a partir do estado atual.
 */
export interface EncontroTurnoAvancarDto {
  readonly id: number;
}

/**
 * Entrada do retorno ao turno anterior — simétrico ao avanço; nunca antes do 1º turno da rodada 1.
 */
export interface EncontroTurnoVoltarDto {
  readonly id: number;
}

/**
 * Entrada do pedido de iniciativa do mestre — dispara o broadcast
 * (`encontro:iniciativa-pedido`) chamando os jogadores a rolar a própria iniciativa pelo fluxo de
 * rolagem já existente.
 */
export interface EncontroIniciativaPedidoDto {
  readonly id: number;
}

/**
 * Entrada do ajuste de Vida de um combatente (m7-04) — os steppers `−`/`+` do cartão. `delta` é
 * relativo (negativo = dano, positivo = cura), porque é assim que a mesa opera: "levou 11".
 *
 * Para combatente **com ficha** o ajuste é aplicado na própria ficha pelo módulo dono
 * (`FichaService`); só o avulso muda no encontro. `origemTexto` é o complemento opcional que o log
 * exibe ("de V. Corvalho").
 */
export interface EncontroCombatenteVidaAjustarDto {
  readonly id: number;
  readonly delta: number;
  readonly origemTexto: string | null;
}

/**
 * Entrada do ajuste de Energia de um combatente (m7-04). Só faz sentido para quem tem Energia —
 * agente e NPC; criatura e avulso não têm, e o ajuste é recusado.
 */
export interface EncontroCombatenteEnergiaAjustarDto {
  readonly id: number;
  readonly delta: number;
  readonly origemTexto: string | null;
}

/**
 * Entrada do atalho **Rolar tudo** do mestre — preenche de uma vez a iniciativa de todos os
 * combatentes que ainda não têm uma. O mapa é `combatenteId → iniciativa já somada`; quem já tem
 * iniciativa (o jogador que rolou a sua) é ignorado pelo backend, nunca sobrescrito.
 */
export interface EncontroIniciativaRolarDto {
  readonly encontroId: number;
  readonly iniciativaPorCombatente: Readonly<Record<number, number>>;
}
