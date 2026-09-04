import type { ArquetipoEnum, ClasseEnum, ItemCategoriaEnum, TipoCampanhaMembroPapelEnum } from '../../enums';
import type { EncontroRecuperadoDto } from '../encontro';
import type { FichaResumoDto } from '../ficha';
import type { RolagemResumoDto } from '../rolagem';
import type { PaginatedResult } from '../../interfaces';
import type { ModificacaoAplicadaDto } from "../../regras/compras";

/**
 * DTOs do módulo `campanha` — CRUD de campanha (m2-04). Seguem a fórmula
 * `Entidade + Complemento? + Verbo + Dto` (CONVENTIONS / skill `dto-conventions`):
 * entrada no infinitivo, saída no particípio, `Interno` marca o que trafega apenas entre
 * service e repository (nunca chega ao frontend). O `codigo_convite` é gerado na service e
 * viaja só nos DTOs internos e nas saídas — a entrada pública nunca o informa.
 *
 * `descricao` é opcional na entrada (a coluna é anulável) e volta como `string | null` nas
 * saídas quando a campanha não tem descrição.
 */

/** Entrada de criação de campanha — o criador vira `MESTRE` (SYSTEM.SPEC §14). */
export interface CampanhaCriarDto {
  readonly nome: string;
  readonly descricao?: string;
}

/**
 * Saída de criação — a campanha criada, já com os dois convites gerados (`codigoConvite` para
 * `JOGADOR`, `codigoConviteEspectador` para `ESPECTADOR` — m8-01).
 */
export interface CampanhaCriadaDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly codigoConvite: string;
  readonly codigoConviteEspectador: string;
}

/**
 * Entrada da listagem "minhas campanhas" — o `usuarioId` vem do JWT (`@ActiveUser().sub`),
 * injetado no DTO pela controller (nunca primitivo solto). A saída é sempre resumida
 * (`CampanhaResumoDto`).
 */
export interface CampanhaListarDto {
  readonly usuarioId: number;
}

/**
 * Item de listagem — a campanha de que o usuário é membro, com o `papel` dele nela
 * (`MESTRE`/`JOGADOR`), enriquecido para o painel de controle (m2-18): estatísticas agregadas
 * e o recorte de ficha crítica/própria respeitam a mesma regra de visibilidade §14 usada em
 * `FichaRepository.listarVisiveisParaUsuario` (mestre vê todas as fichas da campanha; jogador só
 * as próprias + as concedidas via `usuario_ficha_acesso`).
 */
export interface CampanhaResumoDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly papel: TipoCampanhaMembroPapelEnum;
  /** Quantidade de `campanha_membro` ativos na campanha. */
  readonly totalMembros: number;
  /** Quantidade de fichas visíveis ao usuário atual nesta campanha (§14). */
  readonly totalFichas: number;
  /** `true` quando alguma ficha visível está com Vida atual ≤ 0. */
  readonly temFichaCritica: boolean;
  /** Nome da primeira ficha crítica visível (ordenada por nome) — `null` se nenhuma. */
  readonly fichaCriticaNome: string | null;
  /**
   * Resumo da própria ficha do jogador nesta campanha (primeira, se houver mais de uma) — só
   * preenchido quando `papel === JOGADOR` e ele já tem ficha própria aqui. `null` para `MESTRE`
   * (não tem "sua ficha" na campanha) e para o jogador que ainda não criou nenhuma.
   */
  readonly minhaFichaResumo: { nome: string; vidaAtual: number; vidaMaxima: number | null } | null;
  /** Código de convite de jogador — só preenchido quando `papel === MESTRE`; `null` senão. */
  readonly codigoConvite: string | null;
  /**
   * Código de convite de espectador (m8-01) — mesmo recorte de `codigoConvite`: só preenchido
   * quando `papel === MESTRE`; `null` para `JOGADOR`/`ESPECTADOR`.
   */
  readonly codigoConviteEspectador: string | null;
  /** `GREATEST` entre `campanha.updated_date` e a última ficha visível alterada (ISO). */
  readonly alteradoEm: string;
}

/**
 * Entrada de recuperação individual — o `id` vem do `@Param`, injetado no DTO pela
 * controller (recuperação individual sempre `{ id }`, nunca primitivo).
 */
export interface CampanhaRecuperarDto {
  readonly id: number;
}

/**
 * Saída da recuperação individual — a campanha completa, incluindo os dois convites. Segue o
 * mesmo recorte de exposição que `codigoConvite` já tinha antes do m8-01 (não gateado por papel
 * nesta consulta — diferente de `CampanhaResumoDto`, que só mostra o convite ao mestre); mudar
 * esse recorte é fluxo de REST/permissão, fora do escopo desta task.
 */
export interface CampanhaRecuperadaDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly codigoConvite: string;
  readonly codigoConviteEspectador: string;
  /**
   * Estado "Na Base da Fundação" (`true`) ou "Em Missão" (`false`) — gate do inventário de
   * esquadrão (§ inventário). Só o Mestre altera (`alterarEstado`). Campanha existente nasce
   * `na_base = null` no banco, tratado como `true` na leitura (`COALESCE`).
   */
  readonly naBase: boolean;
}

/** Entrada pública da alteração de campanha (nome/descrição) — só o mestre pode alterar. */
export interface CampanhaAlterarDto {
  readonly nome: string;
  readonly descricao?: string;
}

/** Saída da alteração — a campanha alterada. */
export interface CampanhaAlteradaDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly codigoConvite: string;
}

/** Entrada da exclusão (soft delete) — só o mestre pode excluir. */
export interface CampanhaExcluirDto {
  readonly id: number;
}

/**
 * Entrada interna do `CampanhaRepository.criarCampanha` — os dois convites (`codigoConvite` de
 * `JOGADOR`, `codigoConviteEspectador` de `ESPECTADOR` — m8-01) já foram gerados na service.
 * `Interno` porque nunca trafega ao frontend (a entrada pública não informa nenhum dos códigos).
 */
export interface CampanhaInternoCriarDto {
  readonly nome: string;
  readonly descricao?: string;
  readonly codigoConvite: string;
  readonly codigoConviteEspectador: string;
}

/**
 * Entrada interna do `CampanhaRepository.alterarCampanha` — o `id` vem no DTO (nunca
 * `alterar(id, dados)`), montado pela controller com o `@Param`.
 */
export interface CampanhaInternoAlterarDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao?: string;
}

/**
 * Entrada interna de criação do vínculo `campanha_membro` — o `papel` é o `codigo`
 * (`MESTRE`/`JOGADOR`); o repositório traduz `codigo → id` da tabela
 * `tipo_campanha_membro_papel` no SQL (§10.2.12).
 */
export interface CampanhaMembroInternoCriarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly papel: TipoCampanhaMembroPapelEnum;
}

/**
 * Entrada interna da consulta de vínculo de um usuário numa campanha — base das checagens
 * de permissão da service (membro/mestre). Só service ↔ repository.
 */
export interface CampanhaMembroInternoRecuperarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Saída interna da consulta de vínculo — o `papel` do usuário na campanha (`codigo`
 * traduzido de `tipo_campanha_membro_papel` no SQL). `null` na service quando não há vínculo.
 */
export interface CampanhaMembroInternoRecuperadoDto {
  readonly papel: TipoCampanhaMembroPapelEnum;
}

/*
 * ── m2-05: entrada por convite, regeneração do código e listagem de membros ──────────────
 */

/**
 * Entrada de "entrar na campanha" — o usuário autenticado ingressa informando um `codigoConvite`.
 * O `usuarioId` do ingressante vem do JWT (`@ActiveUser().sub`), nunca do corpo. **m8-02**: o
 * mesmo campo aceita tanto o convite de `JOGADOR` quanto o de `ESPECTADOR` — o servidor resolve
 * qual dos dois bateu e decide o papel a partir disso (SYSTEM.SPEC §14); o cliente nunca escolhe
 * o papel por corpo, query ou rota.
 */
export interface CampanhaEntrarDto {
  readonly codigoConvite: string;
}

/**
 * Saída de "entrar na campanha" — a campanha em que o usuário ingressou e o `papel` obtido
 * (`JOGADOR` ou `ESPECTADOR`, conforme o código informado — m8-02). Recorte enxuto, sem o
 * `codigoConvite` (visível só na recuperação de membro).
 */
export interface CampanhaEntradaDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly papel: TipoCampanhaMembroPapelEnum;
}

/**
 * Entrada da regeneração do convite (complemento `Convite` inteiro antes do verbo) — o `id`
 * vem do `@Param`, injetado no DTO pela controller. Só o mestre pode regenerar (§14).
 */
export interface CampanhaConviteRegenerarDto {
  readonly id: number;
}

/** Saída da regeneração — o novo `codigoConvite`, que invalida o anterior. */
export interface CampanhaConviteRegeneradoDto {
  readonly id: number;
  readonly codigoConvite: string;
}

/*
 * ── m8-01/m8-02: convite de espectador e troca de papel JOGADOR ↔ ESPECTADOR pelo mestre ─────
 * m8-01 só criou os contratos abaixo; m8-02 implementa o endpoint e a mudança de papel efetiva
 * (`CampanhaService.regenerarConviteEspectador`/`alterarPapelMembro`).
 */

/**
 * Entrada da regeneração do convite de espectador (complemento `ConviteEspectador` inteiro
 * antes do verbo, distinto de `CampanhaConviteRegenerarDto` que regenera o de `JOGADOR`) — o
 * `id` vem do `@Param`, injetado no DTO pela controller. Só o mestre pode regenerar (§14).
 */
export interface CampanhaConviteEspectadorRegenerarDto {
  readonly id: number;
}

/** Saída da regeneração — o novo `codigoConviteEspectador`, que invalida o anterior. */
export interface CampanhaConviteEspectadorRegeneradoDto {
  readonly id: number;
  readonly codigoConviteEspectador: string;
}

/**
 * Entrada interna da persistência do novo convite de espectador — o `id` vem no DTO (nunca
 * `alterar(id, dados)`); o `codigoConviteEspectador` já foi gerado na service. Só service ↔
 * repository — mesma forma de `CampanhaConviteInternoAlterarDto` (convite de `JOGADOR`).
 */
export interface CampanhaConviteEspectadorInternoAlterarDto {
  readonly id: number;
  readonly codigoConviteEspectador: string;
}

/**
 * Entrada da troca de papel de um membro entre `JOGADOR` e `ESPECTADOR` pelo mestre
 * (complemento `MembroPapel` antes do verbo) — o `id` é o da campanha (`@Param`) e `usuarioId`
 * o membro alvo (`@Param`), ambos injetados pela controller; `papel` vem do corpo, restrito à
 * união `JOGADOR | ESPECTADOR` no próprio tipo — o cliente nunca pode promover a `MESTRE` por
 * este contrato (isso é `CampanhaMestreTransferirDto`).
 */
export interface CampanhaMembroPapelAlterarDto {
  readonly id: number;
  readonly usuarioId: number;
  readonly papel: TipoCampanhaMembroPapelEnum.JOGADOR | TipoCampanhaMembroPapelEnum.ESPECTADOR;
}

/** Saída da troca de papel — confirmação do novo `papel` do membro na campanha. */
export interface CampanhaMembroPapelAlteradoDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly papel: TipoCampanhaMembroPapelEnum.JOGADOR | TipoCampanhaMembroPapelEnum.ESPECTADOR;
}

/**
 * Entrada interna da troca de papel — mesma forma pública de `CampanhaMembroPapelAlterarDto`,
 * mas com `campanhaId` no nome do campo (`Interno`, nunca `id` — a convenção de "id implícito da
 * entidade" é só para o DTO público que a controller monta a partir do `@Param`). Só service ↔
 * repository.
 */
export interface CampanhaMembroPapelInternoAlterarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly papel: TipoCampanhaMembroPapelEnum.JOGADOR | TipoCampanhaMembroPapelEnum.ESPECTADOR;
}

/** Saída interna da troca de papel — mesma forma de `CampanhaMembroPapelAlteradoDto`. */
export interface CampanhaMembroPapelInternoAlteradoDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
  readonly papel: TipoCampanhaMembroPapelEnum.JOGADOR | TipoCampanhaMembroPapelEnum.ESPECTADOR;
}

/**
 * Entrada da listagem de membros de uma campanha (complemento coleção `Membros` no plural) —
 * o `campanhaId` vem do `@Param`, injetado no DTO pela controller. Visível aos membros da
 * campanha (permissão no service). A saída é sempre resumida (`CampanhaMembroResumoDto`).
 */
export interface CampanhaMembrosListarDto {
  readonly campanhaId: number;
}

/**
 * Ficha de um membro, no recorte mínimo pra Equipe (m3-65): quando `acessoCompleto` é `false`,
 * é só a "carteirinha" — nome/classe/foto, sem vida/energia/etc. (esses continuam vindo, pra quem
 * tem acesso completo, de `GET /ficha?campanhaId=`, que não muda). Fichas marcadas `oculta` por um
 * jogador que não seja o dono/mestre requisitante nem entram nesta lista — não tem carteirinha.
 */
export interface CampanhaMembroFichaResumoDto {
  readonly id: number;
  readonly nome: string;
  readonly classe: ClasseEnum;
  readonly arquetipo: ArquetipoEnum | null;
  readonly imagemUrl: string | null;
  /** Cor de identidade visual (m3-61) — tinge o avatar da carteirinha, igual ao Esquadrão do mestre. */
  readonly cor: string | null;
  /** `true` quando o requisitante enxerga a ficha completa (dono, mestre, ou concessão ativa). */
  readonly acessoCompleto: boolean;
}

/**
 * Item de listagem de membros — o usuário membro da campanha com o `papel` dele nela
 * (`MESTRE`/`JOGADOR`, `codigo` traduzido de `tipo_campanha_membro_papel` no SQL) e as fichas
 * dele visíveis ao requisitante (m3-65 — sempre todos os membros, ficha ou não).
 */
export interface CampanhaMembroResumoDto {
  readonly usuarioId: number;
  readonly nome: string;
  readonly papel: TipoCampanhaMembroPapelEnum;
  readonly fichas: readonly CampanhaMembroFichaResumoDto[];
}

/**
 * Entrada interna da listagem de membros (m3-65) — o `usuarioAtivoId`/`usuarioAtivoEhMestre` vêm
 * da service (que já resolveu o papel do requisitante pra validar a permissão) e decidem, por
 * ficha, `acessoCompleto` e se uma ficha oculta de terceiro entra na lista. Só service ↔ repository.
 */
export interface CampanhaMembrosInternoListarDto {
  readonly campanhaId: number;
  readonly usuarioAtivoId: number;
  readonly usuarioAtivoEhMestre: boolean;
}

/**
 * Entrada interna da consulta de campanha por código de convite — base do `entrarCampanha`.
 * **m8-02**: o mesmo `codigoConvite` é comparado contra os dois códigos ativos da campanha
 * (`codigo_convite` de `JOGADOR`, `codigo_convite_espectador` de `ESPECTADOR`) — o repositório
 * resolve qual bateu e devolve o papel correspondente (`CampanhaConviteInternoRecuperadoDto`).
 * Só service ↔ repository (o `codigoConvite` chega no `CampanhaEntrarDto` público).
 */
export interface CampanhaConviteRecuperarDto {
  readonly codigoConvite: string;
}

/**
 * Saída interna da consulta por qualquer um dos dois convites (m8-02) — a campanha e o `papel`
 * resolvido a partir de qual código bateu (`JOGADOR` para `codigo_convite`, `ESPECTADOR` para
 * `codigo_convite_espectador`). Os dois índices únicos parciais ativos garantem que um código só
 * resolve para uma campanha, então o papel nunca é ambíguo. Só service ↔ repository.
 */
export interface CampanhaConviteInternoRecuperadoDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly papel: TipoCampanhaMembroPapelEnum.JOGADOR | TipoCampanhaMembroPapelEnum.ESPECTADOR;
}

/**
 * Entrada interna da persistência do novo convite — o `id` vem no DTO (nunca
 * `alterar(id, dados)`); o `codigoConvite` já foi gerado na service. Só service ↔ repository.
 */
export interface CampanhaConviteInternoAlterarDto {
  readonly id: number;
  readonly codigoConvite: string;
}

/*
 * ── m2-10: gestão de membros pelo mestre — remoção de jogador e transferência de mestre ──
 */

/**
 * Entrada da remoção de um membro pelo mestre (complemento `Membro` antes do verbo) — o `id`
 * é o da campanha (`@Param(':id')`) e o `usuarioId` é o membro a remover
 * (`@Param(':usuarioId')`), ambos injetados no DTO pela controller. Só o mestre remove (§14);
 * o mestre não pode remover a si mesmo.
 */
export interface CampanhaMembroRemoverDto {
  readonly id: number;
  readonly usuarioId: number;
}

/** Saída da remoção — confirmação do membro removido da campanha. */
export interface CampanhaMembroRemovidoDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada da transferência do papel de mestre (complemento `Mestre` antes do verbo) — o `id`
 * é o da campanha (`@Param`) e o `novoMestreUsuarioId` (corpo) é o jogador a ser promovido a
 * `MESTRE`. O mestre atual é o usuário autenticado; a transferência é **atômica** (promove o
 * alvo e rebaixa o atual a `JOGADOR`, mantendo exatamente um mestre — §14).
 */
export interface CampanhaMestreTransferirDto {
  readonly id: number;
  readonly novoMestreUsuarioId: number;
}

/** Saída da transferência — confirmação de quem deixou e quem assumiu o papel de mestre. */
export interface CampanhaMestreTransferidoDto {
  readonly campanhaId: number;
  readonly mestreAnteriorUsuarioId: number;
  readonly novoMestreUsuarioId: number;
}

/*
 * ── m3-05: payload do evento WebSocket `membro:entrou` (gateway broadcast-only, §9) ──────
 */

/**
 * Payload do evento de tempo real `membro:entrou`, emitido na sala `campanha:<id>` pela
 * `CampanhaService.entrarCampanha` após a mutação (SYSTEM.SPEC §9 — broadcast-only). Avisa os
 * membros já conectados de que um novo `usuarioId` ingressou na campanha. É a notificação para a
 * sala (recorte `campanhaId` + `usuarioId`); o verbo vai no particípio (CONVENTIONS — saída), na
 * mesma forma de `CampanhaEntradaDto` (a resposta REST devolvida ao próprio ingressante), da qual
 * este DTO é distinto (o complemento `Membro` marca a notificação da sala).
 */
export interface CampanhaMembroEntradaDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada interna da remoção do vínculo `campanha_membro` (soft delete pela chave composta
 * campanha+usuário). Só service ↔ repository.
 */
export interface CampanhaMembroInternoRemoverDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada interna da transferência de mestre — troca atômica dos papéis dos dois membros num
 * único `UPDATE`: `mestreAtualUsuarioId` vira `JOGADOR` e `novoMestreUsuarioId` vira `MESTRE`.
 * Só service ↔ repository.
 */
export interface CampanhaMestreInternoTransferirDto {
  readonly campanhaId: number;
  readonly mestreAtualUsuarioId: number;
  readonly novoMestreUsuarioId: number;
}

/*
 * ── Inventário de esquadrão: estado Na Base / Em Missão ──────────────────────────────────
 */

/**
 * Entrada da alteração de estado — o `id` vem do `@Param`, injetado no DTO pela controller. Só
 * o Mestre altera (gate `validarMestre`, único árbitro — proibição #28).
 */
export interface CampanhaEstadoAlterarDto {
  readonly id: number;
  readonly naBase: boolean;
}

/** Saída da alteração de estado — também o payload do evento de tempo real `campanha:estado-alterado`. */
export interface CampanhaEstadoAlteradaDto {
  readonly id: number;
  readonly naBase: boolean;
}

/*
 * ── Inventário de esquadrão: itens ────────────────────────────────────────────────────────
 */

/**
 * Item do inventário de esquadrão — só os campos **descritivos** do catálogo de compras
 * (`ItemCatalogo`, `shared/regras/compras`), sem `equipado`/`containerId`: este inventário só
 * guarda, não equipa nada. Modificações são preservadas para que um item transferido conserve
 * seus efeitos ao retornar à ficha. `id` é um uuid gerado no `POST` — identificador estável para
 * remover/ajustar/transferir o item.
 */
export interface CampanhaInventarioItemDto {
  readonly id: string;
  readonly nome: string;
  readonly categoria: ItemCategoriaEnum;
  readonly custo: number;
  readonly peso: number;
  readonly quantidade: number;
  readonly descricao?: string;
  readonly dano?: string;
  readonly informacao?: string;
  readonly resistencia?: string;
  readonly bonus?: string;
  /** Opcional para compatibilidade com itens persistidos antes do suporte a modificações. */
  readonly modificacoes?: readonly ModificacaoAplicadaDto[];
}

/** Saída da listagem/mutação do inventário de esquadrão — a lista inteira e atual de itens. */
export interface CampanhaInventarioDto {
  readonly itens: readonly CampanhaInventarioItemDto[];
}

/** Entrada da listagem — o `campanhaId` vem do `@Param`, injetado no DTO pela controller. */
export interface CampanhaInventarioRecuperarDto {
  readonly campanhaId: number;
}

/**
 * Entrada de adicionar item — o `campanhaId` vem do `@Param`; os demais campos vêm do corpo.
 * Qualquer membro pode adicionar (respeitando o gate Na Base/Em Missão do jogador).
 */
export interface CampanhaInventarioItemAdicionarDto {
  readonly campanhaId: number;
  readonly nome: string;
  readonly categoria: ItemCategoriaEnum;
  readonly custo: number;
  readonly peso: number;
  readonly quantidade: number;
  readonly descricao?: string;
  readonly dano?: string;
  readonly informacao?: string;
  readonly resistencia?: string;
  readonly bonus?: string;
  readonly modificacoes?: readonly ModificacaoAplicadaDto[];
}

/**
 * Entrada de alterar informações descritivas de um item existente — `campanhaId`/`itemId` vêm do
 * `@Param`, os demais campos do corpo. Mesmo recorte do editor análogo na ficha
 * (`FichaInventario.confirmarEdicaoItem`): só nome/custo/peso/descrição mudam; categoria, dano,
 * informação, resistência, bônus, quantidade e modificações permanecem intocados.
 */
export interface CampanhaInventarioItemAlterarDto {
  readonly campanhaId: number;
  readonly itemId: string;
  readonly nome: string;
  readonly custo: number;
  readonly peso: number;
  readonly descricao?: string;
}

/** Entrada de remover item inteiro — `campanhaId`/`itemId` vêm do `@Param`. */
export interface CampanhaInventarioItemRemoverDto {
  readonly campanhaId: number;
  readonly itemId: string;
}

/**
 * Entrada de ajustar quantidade por delta (stepper +/-1, mesmo padrão de Vida/Energia da ficha)
 * — `campanhaId`/`itemId` vêm do `@Param`, `delta` do corpo. Quantidade que chega a `<= 0` remove
 * o item.
 */
export interface CampanhaInventarioItemQuantidadeAjustarDto {
  readonly campanhaId: number;
  readonly itemId: string;
  readonly delta: number;
}

/**
 * Entrada interna de `CampanhaRepository.alterarInventario` — substitui a lista inteira de itens
 * (mesmo padrão de "ler tudo, mutar em TS, regravar tudo" de `FichaRepository.alterarFicha`). Só
 * service ↔ repository (`ficha` também chama este método do repositório diretamente na Task 3).
 */
export interface CampanhaInventarioInternoAlterarDto {
  readonly campanhaId: number;
  readonly itens: readonly CampanhaInventarioItemDto[];
}

/** Payload do evento de tempo real `campanha:inventario-alterado` — o cliente refaz o GET. */
export interface CampanhaInventarioAlteradoDto {
  readonly campanhaId: number;
}

/*
 * ── m8-02: projeções de leitura para ESPECTADOR (painel) e prévia de jogador pelo mestre ─────
 * Decisões de produto #5/#6 de `m8-espectadores-campanha.spec.md`: nenhuma das duas expõe
 * código de convite, contagem de membros ou qualquer dado que o recorte-alvo não veria.
 */

/**
 * Identidade segura de campanha (m8-02) — recorte sem código de convite nem membros, usado pelas
 * duas projeções de leitura abaixo. `naBase` viaja porque é estado de jogo, não de gestão (o
 * mesmo campo já é público em `CampanhaRecuperadaDto`).
 */
export interface CampanhaIdentidadeSeguraDto {
  readonly id: number;
  readonly nome: string;
  readonly descricao: string | null;
  readonly naBase: boolean;
}

/**
 * Entrada da projeção do painel de espectador (complemento `PainelEspectador` antes do verbo) —
 * o `campanhaId` vem do `@Param`; `pagina`/`itensPorPagina` da `@Query` (mesmo padrão paginado de
 * `RolagemInternoListarDto`).
 */
export interface CampanhaPainelEspectadorRecuperarDto {
  readonly campanhaId: number;
  readonly pagina: number;
  readonly itensPorPagina: number;
}

/**
 * Saída da projeção do painel de espectador (decisão de produto #5) — identidade segura + feed
 * paginado de rolagens exclusivamente `PUBLICA`. Legível por `ESPECTADOR` e por `MESTRE` em modo
 * de prévia (o payload é idêntico nos dois casos — privilégio de mestre nunca vaza aqui).
 */
export interface CampanhaPainelEspectadorDto {
  readonly campanha: CampanhaIdentidadeSeguraDto;
  readonly rolagens: PaginatedResult<RolagemResumoDto>;
  /**
   * Encontro não-encerrado da campanha, redigido para quem não vê nenhuma ficha (m8-05) — `null`
   * sem combate em andamento. Gatilha "Ver Iniciativa" no Painel do espectador; o mesmo payload
   * para `ESPECTADOR` real e `MESTRE` em prévia (`EncontroService.recuperarEncontroAtivoParaEspectador`).
   */
  readonly encontroAtivo: EncontroRecuperadoDto | null;
}

/**
 * Entrada da prévia de jogador (complemento `PreviaJogador` antes do verbo) — `campanhaId` e
 * `usuarioAlvoId` vêm do `@Param`. Só o mestre da campanha pode requisitar; o alvo precisa ser
 * `JOGADOR` ativo (a service valida, nunca o cliente). Sem paginação: o feed reusa o mesmo teto
 * de 50 linhas do feed normal de campanha (`RolagemCampanhaListarDto`) — a mesma janela que o
 * alvo veria na própria sessão.
 */
export interface CampanhaPreviaJogadorRecuperarDto {
  readonly campanhaId: number;
  readonly usuarioAlvoId: number;
}

/**
 * Saída da prévia de jogador (decisão de produto #6) — fichas visíveis, feed e capacidade de
 * acessar o inventário de esquadrão calculados com a identidade do **alvo** (`usuarioAlvoId`),
 * nunca do mestre que requisita. Somente leitura: não existe DTO de mutação para esta projeção.
 *
 * `membros` (m8-04) é a mesma forma de `CampanhaMembroResumoDto` que a visão normal de jogador
 * consome para montar a coluna "Equipe" — mas com `acessoCompleto`/visibilidade de ficha oculta
 * calculados como o **alvo** veria (reusa `CampanhaRepository.listarMembros` passando a
 * identidade do alvo, nunca a do mestre que requisita — mesmo racional de `fichas`). O grid
 * "Esquadrão"/coluna "Membros" (visão de mestre) não faz parte desta projeção — só o que a visão
 * de **jogador** usa.
 */
export interface CampanhaPreviaJogadorDto {
  readonly campanha: CampanhaIdentidadeSeguraDto;
  readonly fichas: readonly FichaResumoDto[];
  readonly membros: readonly CampanhaMembroResumoDto[];
  readonly rolagens: readonly RolagemResumoDto[];
  readonly podeAcessarInventarioEsquadrao: boolean;
  /**
   * Encontro não-encerrado da campanha, redigido com a identidade do **alvo** (m8-05) — `null` sem
   * combate em andamento. Gatilha "Ver Iniciativa" na prévia; nunca o recorte do mestre que
   * requisita (`EncontroService.recuperarEncontroAtivoParaAlvo`).
   */
  readonly encontroAtivo: EncontroRecuperadoDto | null;
}

/**
 * Entrada da ficha completa dentro da prévia de jogador (m8-04, complemento `PreviaJogadorFicha`
 * antes do verbo) — `campanhaId`/`usuarioAlvoId`/`fichaId` vêm todos do `@Param`. `campanhaId` é
 * checado contra a campanha real da ficha (defesa em profundidade — a autorização de fato é toda
 * de `FichaService.recuperarFichaParaAlvo`, que nunca recebe `campanhaId`: deriva a campanha da
 * própria ficha).
 */
export interface CampanhaPreviaJogadorFichaRecuperarDto {
  readonly campanhaId: number;
  readonly usuarioAlvoId: number;
  readonly fichaId: number;
}
