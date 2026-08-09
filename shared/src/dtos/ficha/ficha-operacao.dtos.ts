import type { ArquetipoEnum, ClasseEnum, TipoFichaEnum } from '../../enums';
import type { AmplificadorAplicadoDto, CarrinhoItemDto } from '../../regras/compras';
import type { FichaAtributosDto, FichaHabilidadeDto, FichaJogadorDadosDto } from './ficha.dtos';

/**
 * DTOs de **operação** do módulo `ficha` — o CRUD da ficha de jogador (m3-03). Seguem a
 * fórmula `Entidade + Complemento? + Verbo + Dto` (CONVENTIONS / skill `dto-conventions`):
 * entrada no infinitivo, saída no particípio, `Interno` marca o que trafega apenas entre
 * service e repository (nunca chega ao frontend).
 *
 * ── Relacional × JSONB (SYSTEM.SPEC §10.4) ───────────────────────────────────
 * `campanhaId`/`usuarioId`/`nome` são colunas de `ficha` (identidade, posse). O
 * conteúdo de jogo viaja inteiro no campo `dados` (`FichaJogadorDadosDto`, m3-01);
 * as listagens leem só um recorte (`dados->>'classe'`, `dados->>'nivel'`) — daí o
 * `FichaResumoDto` enxuto.
 *
 * O dono padrão e a permissão nunca chegam de graça pelo corpo da requisição: sem
 * `usuarioId`, o dono é o usuário autenticado (`@ActiveUser().sub`); a matriz de
 * permissões (§14) é arbitrada pela service. A ficha criada aqui é sempre do tipo
 * `JOGADOR` (criatura/NPC é M4).
 */

/**
 * Entrada de criação de ficha de jogador — com `campanhaId`, a ficha entra na campanha
 * informada; **omitido/`null`** (m3-28), a ficha nasce **solta** no acervo do dono (sem
 * `validarMembro`, sem afordance de escolher outro dono — `usuarioId` só se aplica dentro de
 * uma campanha). `usuarioId` é o dono; **omitido, é o usuário autenticado** (a própria ficha).
 * Um `usuarioId` diferente do autenticado só é aceito se o autenticado for o **mestre** da
 * campanha (§14 — "criar ficha de jogador": dono só a própria, mestre sem restrição) — do
 * contrário a service recusa com `UnauthorizedAccessException`. O `dados` é o documento de
 * jogo completo (validado contra `shared/regras` na service antes de persistir).
 */
export interface FichaCriarDto {
  readonly campanhaId?: number;
  readonly usuarioId?: number;
  readonly nome: string;
  /**
   * Cor de identidade visual da ficha (m3-61) — hex de 6 dígitos (`#rrggbb`) ou `null`/ausente
   * (cai no `--accent` de quem visualiza). Coluna relacional, ao lado de `nome` — nunca dentro do
   * JSONB `dados`. **Não confundir com `--accent`**: aquele é a cor de tema por **usuário**
   * (`TemaService`); esta é a identidade visual da **ficha**, igual para todo mundo que a vê.
   */
  readonly cor?: string | null;
  readonly dados: FichaJogadorDadosDto;
}

/**
 * Saída de criação — a ficha criada (identidade/posse + documento de jogo). `campanhaId`
 * `null` quando a ficha nasceu solta no acervo (m3-28).
 */
export interface FichaCriadaDto {
  readonly id: number;
  readonly campanhaId: number | null;
  readonly usuarioId: number;
  readonly nome: string;
  /** Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}. */
  readonly cor: string | null;
  readonly dados: FichaJogadorDadosDto;
}

/**
 * Entrada da listagem de fichas de uma campanha — o `campanhaId` vem do `@Query`, injetado no
 * DTO pela controller. O recorte visível depende do papel do autor (§14): o mestre vê todas as
 * fichas da campanha; um membro vê as próprias e as concedidas (`usuario_ficha_acesso`). A saída
 * é sempre resumida (`FichaResumoDto`).
 */
export interface FichaListarDto {
  readonly campanhaId: number;
}

/**
 * Item de listagem — recorte enxuto da ficha, com os campos de jogo lidos do JSONB
 * (`dados->>'classe'`, `dados->>'nivel'` — §10.4). `usuarioId` é o dono, para o front distinguir
 * "minha ficha" das demais.
 *
 * Vida/Energia + as três condições rastreadas (`morrendo`/`machucado`/`inconsciente` —
 * `sistema-v4.1.0.md`, "Condições") entraram para alimentar o mini-card de ficha embutido no
 * detalhe da campanha (m2-16) sem precisar do documento completo — continua um recorte, não o
 * `dados` inteiro (§14/§10.4: a listagem nunca expõe inventário/habilidades/sequelas de terceiros).
 * `vidaMaxima`/`energiaMaxima` seguem opcionais (retrocompat de `FichaEstadoDto`, m3-10 — fichas
 * sem snapshot); as três condições vêm sempre resolvidas (`false` quando ausentes no documento).
 * `arquetipo` acompanha `classe` para o mini-card mostrar "Classe - Arquétipo" — `null` quando a
 * classe é uma subclasse Experimento ou `CIVIL` (mesma regra de `FichaJogadorDadosDto.arquetipo`).
 *
 * `campanhaId`/`campanhaNome` (m3-28) alimentam o **chip de campanha** do acervo (`/fichas`,
 * `FichaAcervo`) — `null`/`null` para uma ficha solta ("Sem campanha"). O mesmo recorte também
 * atende a listagem campanha-scoped (`listarPorCampanha`/`listarVisiveisParaUsuario`), onde os
 * dois campos são redundantes (a campanha já é conhecida pela rota) mas inofensivos.
 */
export interface FichaResumoDto {
  readonly id: number;
  readonly campanhaId: number | null;
  readonly campanhaNome: string | null;
  readonly usuarioId: number;
  readonly nome: string;
  readonly classe: ClasseEnum;
  readonly arquetipo: ArquetipoEnum | null;
  readonly nivel: number;
  readonly vidaAtual: number;
  readonly vidaMaxima?: number;
  readonly energiaAtual: number;
  readonly energiaMaxima?: number;
  readonly morrendo: boolean;
  readonly machucado: boolean;
  readonly inconsciente: boolean;
  /** Prestígio — alimenta a Patente exibida no mini-card (`rotuloPatente`, calculada no cliente). */
  readonly prestigio?: number;
  /**
   * Defesa/Esquiva/Bloqueio — derivados persistidos (`FichaDerivadosDto`, m3-10), lidos direto do
   * JSONB sem fallback calculado (o resumo não tem atributos/habilidades para recalcular ao vivo).
   * `undefined` numa ficha sem `derivados` salvo (retrocompat) ou cuja classe não os possui (Civil).
   */
  readonly defesa?: number;
  readonly esquiva?: number;
  readonly bloqueio?: number;
  /**
   * Contra-Ataque — snapshot `derivados` **ou**, se `undefined` (a habilidade "Contra-Ataque" entrou
   * na ficha depois da criação, sem cascata de `ajustarHabilidades` — m3-13), o `FichaService`
   * recalcula ao vivo (`calcularDerivados`, `shared/regras/agente/derivados`) a partir de
   * `FichaResumoInternoDto.atributos`/`habilidades` — mesmo fallback "stored > calculado" da tela da
   * própria ficha (m3-10). `undefined` só quando nenhuma habilidade concede contra-ataque.
   */
  readonly contraAtaque?: number;
  /** Personalidade e nome da Origem (`FichaIdentidadeDto`, m3-23) — `null`/ausente sem Identidade definida. */
  readonly personalidade?: string | null;
  readonly origemNome?: string | null;
  /**
   * `true` quando o peso do inventário excede o Inventário Máximo (aviso, não trava —
   * `sistema-v4.1.0.md`). Calculado com exatidão pelo `FichaService` via `calcularResumoCompras`
   * (`shared/regras/compras`) — o mesmo motor que a aba Inventário usa —, não uma aproximação: o
   * `FichaResumoInternoDto` que a repository devolve carrega os campos brutos (itens/amplificadores/
   * dinheiro/vontade/inventário base) que a fórmula precisa, e o service os reduz a este único
   * booleano antes de expor o resumo público. `undefined` numa ficha sem `derivados.inventarioMaximo`
   * salvo (retrocompat) — sem o máximo não há o que comparar.
   */
  readonly sobrecarregado?: boolean;
}

/**
 * Recorte **interno** de `FichaResumoDto` (nunca chega ao frontend) que a repository devolve ao
 * service — carrega, além de tudo que o resumo público já tem, os campos brutos que
 * `FichaService` precisa pra chamar `calcularResumoCompras` (`shared/regras/compras`) e produzir o
 * `sobrecarregado` **exato** do resumo público (mesmo motor que a aba Inventário usa, não uma
 * aproximação em SQL). `itens`/`amplificadores` vêm do JSONB tal qual (`CarrinhoItemDto[]`/
 * `AmplificadorAplicadoDto[]`); `inventarioMaximo` é o snapshot **bruto** de `derivados` (sem o
 * ajuste de amplificador — `ajusteInventarioAmplificadores` — que o service aplica antes de chamar
 * `calcularResumoCompras`, mesmo passo que a aba Inventário já faz no cliente). `dinheiro`/`vontade`
 * só alimentam a fórmula (o resumo público não os expõe). O `sobrecarregado` herdado de
 * `FichaResumoDto` sai `undefined` neste recorte — quem o preenche é o service, na conversão final.
 *
 * `atributos`/`habilidades`: material bruto para o service recalcular `contraAtaque` **ao vivo**
 * (`calcularDerivados`, `shared/regras/agente`) quando o snapshot `contraAtaque` herdado de
 * `FichaResumoDto` vem `undefined` — mesmo fallback "stored > calculado" que a tela da própria
 * ficha já aplica (m3-10), necessário aqui porque o snapshot gravado na criação da ficha nunca
 * ganha a habilidade "Contra-Ataque" sozinho quando ela é adicionada depois (`ajustarHabilidades`
 * não recalcula `derivados`, m3-13).
 */
export interface FichaResumoInternoDto extends FichaResumoDto {
  readonly atributos: FichaAtributosDto;
  readonly habilidades: readonly FichaHabilidadeDto[];
  readonly itens: readonly CarrinhoItemDto[];
  readonly amplificadores: readonly AmplificadorAplicadoDto[];
  readonly dinheiro?: number;
  readonly vontade: number;
  readonly inventarioMaximo?: number;
}

/**
 * Entrada da listagem do **acervo** (m3-28) — todas as fichas do dono, com e sem campanha
 * (`FichaRepository.listarPorUsuario`). `usuarioId` é sempre o autenticado (`@ActiveUser().sub`),
 * montado pela controller — mesmo padrão de `CampanhaListarDto`. A saída é a `FichaResumoDto`
 * (com `campanhaId`/`campanhaNome` resolvidos) — sem DTO de item dedicado.
 */
export interface FichaAcervoListarDto {
  readonly usuarioId: number;
}

/**
 * Entrada de recuperação individual — o `id` vem do `@Param`, injetado no DTO pela controller
 * (recuperação individual sempre `{ id }`, nunca primitivo).
 */
export interface FichaRecuperarDto {
  readonly id: number;
}

/**
 * Saída da recuperação individual — a ficha completa (identidade/posse + documento de jogo).
 * `campanhaId` `null` para uma ficha solta no acervo (m3-28).
 */
export interface FichaRecuperadaDto {
  readonly id: number;
  readonly campanhaId: number | null;
  readonly usuarioId: number;
  readonly nome: string;
  /** Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}. */
  readonly cor: string | null;
  readonly dados: FichaJogadorDadosDto;
}

/**
 * Entrada pública da alteração completa da ficha — `nome` + documento de jogo `dados`. Só o dono
 * ou o mestre podem alterar (§14); a permissão e a validação via `shared/regras` são arbitradas
 * na service. O `id` vem no DTO interno (nunca `alterar(id, dados)`).
 */
export interface FichaAlterarDto {
  readonly nome: string;
  /** Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}. Sem trava de imutabilidade. */
  readonly cor?: string | null;
  readonly dados: FichaJogadorDadosDto;
}

/** Saída da alteração — a ficha alterada. `campanhaId` `null` para uma ficha solta (m3-28). */
export interface FichaAlteradaDto {
  readonly id: number;
  readonly campanhaId: number | null;
  readonly usuarioId: number;
  readonly nome: string;
  /** Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}. */
  readonly cor: string | null;
  readonly dados: FichaJogadorDadosDto;
}

/** Entrada da exclusão (soft delete) — o `id` vem do `@Param`. Só o dono ou o mestre podem. */
export interface FichaExcluirDto {
  readonly id: number;
}

/**
 * ── Atribuição de campanha (m3-28) ───────────────────────────────────────────
 * Move uma ficha entre o acervo solto e uma campanha (cardinalidade 1:N — no máximo **uma**
 * campanha por vez; reatribuir **move**, nunca soma). Só o **dono** atribui/desatribui a
 * própria ficha (`validarPermissaoEdicao`); atribuir a uma campanha exige que o dono seja
 * **membro** dela (`validarMembroAlvo`, mesma checagem da concessão de acesso — m3-04).
 * `campanhaId: null` **desatribui** — a ficha volta ao acervo.
 */

/** Entrada da atribuição — o `id` da ficha vem do `@Param`, injetado no DTO pela controller. */
export interface FichaCampanhaAtribuirDto {
  readonly campanhaId: number | null;
}

/** Saída da atribuição — a ficha e sua campanha atual (ou `null`, se desatribuída). */
export interface FichaCampanhaAtribuidaDto {
  readonly id: number;
  readonly campanhaId: number | null;
}

/**
 * Entrada interna do `FichaRepository.atribuirCampanha` — o `id` vem do `@Param`, montado pela
 * controller. Só service ↔ repository (mesmo papel de `FichaInternoAlterarDto`).
 */
export interface FichaCampanhaInternoAtribuirDto {
  readonly id: number;
  readonly campanhaId: number | null;
}

/**
 * Entrada da duplicação (m3-52, item 26) — o `id` da ficha **original** vem do `@Param`, injetado
 * no DTO pela controller. Só o dono ou o mestre da ficha original podem duplicar (§14, mesma regra
 * de `validarPermissaoEdicao`); o clone pertence sempre a quem duplicou, nunca ao dono original. A
 * saída reaproveita `FichaCriadaDto` — a duplicação **é** uma criação (`duplicarFicha` reusa
 * `criarFicha` por inteiro), sem um DTO de saída dedicado para o mesmo formato.
 */
export interface FichaDuplicarDto {
  readonly id: number;
}

/**
 * Entrada interna do `FichaRepository.criarFicha` — inclui o `usuarioId` do dono (resolvido do
 * JWT na service) e o `tipo` (`codigo` de `tipo_ficha`; o repositório traduz `codigo → id` no
 * SQL — §10.2.12). `campanhaId` `null` insere a ficha solta no acervo (m3-28). Só service ↔
 * repository.
 */
export interface FichaInternoCriarDto {
  readonly campanhaId: number | null;
  readonly usuarioId: number;
  readonly tipo: TipoFichaEnum;
  readonly nome: string;
  /** Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}. */
  readonly cor: string | null;
  readonly dados: FichaJogadorDadosDto;
}

/**
 * Entrada interna do `FichaRepository.alterarFicha` — o `id` vem no DTO (nunca `alterar(id,
 * dados)`), montado pela controller com o `@Param`. Só service ↔ repository.
 */
export interface FichaInternoAlterarDto {
  readonly id: number;
  readonly nome: string;
  /** Cor de identidade visual (m3-61) — ver {@link FichaCriarDto.cor}. Ausente equivale a `null`. */
  readonly cor?: string | null;
  readonly dados: FichaJogadorDadosDto;
}

/**
 * Entrada interna da listagem das fichas **visíveis** a um membro comum numa campanha (as do
 * próprio dono ou concedidas por `usuario_ficha_acesso`). Só service ↔ repository — o mestre usa
 * a listagem completa (`FichaListarDto`).
 */
export interface FichaVisiveisInternoListarDto {
  readonly campanhaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada interna da consulta de concessão de visualização (`usuario_ficha_acesso`) de um usuário
 * sobre uma ficha — base da checagem de permissão de visualização de um membro comum (§14). Só
 * service ↔ repository.
 */
export interface FichaAcessoInternoRecuperarDto {
  readonly fichaId: number;
  readonly usuarioId: number;
}

/**
 * Saída interna da consulta de concessão — o `id` da linha de `usuario_ficha_acesso` quando
 * existe (a service só verifica a presença). `null` na service quando não há concessão.
 */
export interface FichaAcessoInternoRecuperadoDto {
  readonly id: number;
}

/**
 * ── Concessão de visualização (m3-04) ────────────────────────────────────────
 * DTOs de operação de `usuario_ficha_acesso` — a concessão/revogação de **acesso de
 * visualização** de uma ficha a outro membro da campanha, fechando a matriz §14 ("outro
 * membro vê só com linha em `usuario_ficha_acesso`"). Só o dono ou o mestre concedem/revogam
 * (arbitrado na service — proibição #28). Edição por terceiros **nunca** existe — só leitura.
 * Complemento `Acesso` (uma palavra) inteiro antes do verbo (CONVENTIONS / proibição de
 * complemento partido): `FichaAcessoConcederDto`, nunca `FichaConcederAcessoDto`.
 */

/**
 * Entrada da concessão de acesso de visualização — o `fichaId` vem do `@Param`, injetado no DTO
 * pela controller; o `usuarioId` (membro alvo da concessão) vem do corpo. Só o dono ou o mestre
 * concedem (§14); a permissão é arbitrada na service.
 */
export interface FichaAcessoConcederDto {
  readonly fichaId: number;
  readonly usuarioId: number;
}

/** Saída da concessão — a linha de `usuario_ficha_acesso` criada (ou a já existente, idempotente). */
export interface FichaAcessoConcedidoDto {
  readonly id: number;
  readonly fichaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada da revogação de acesso — `fichaId` e `usuarioId` vêm do `@Param`, injetados no DTO pela
 * controller. Revogação é soft delete (proibição #14); só o dono ou o mestre revogam (§14).
 */
export interface FichaAcessoRevogarDto {
  readonly fichaId: number;
  readonly usuarioId: number;
}

/** Saída da revogação — confirmação do par (ficha, usuário) cuja concessão foi revogada. */
export interface FichaAcessoRevogadoDto {
  readonly fichaId: number;
  readonly usuarioId: number;
}

/**
 * Entrada da listagem das concessões ativas de uma ficha — o `fichaId` vem do `@Param`, injetado
 * no DTO pela controller. Só o dono ou o mestre listam (§14). A saída é sempre resumida
 * (`FichaAcessoResumoDto`).
 */
export interface FichaAcessosListarDto {
  readonly fichaId: number;
}

/**
 * Item de listagem das concessões — o membro que recebeu acesso de visualização (`usuarioId` +
 * `nome`, lido de `usuario`). Recorte enxuto, para a UI de gestão de acessos (m3-07).
 */
export interface FichaAcessoResumoDto {
  readonly usuarioId: number;
  readonly nome: string;
}
