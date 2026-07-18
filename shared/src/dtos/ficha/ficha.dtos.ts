import type {
  ArquetipoEnum,
  ClasseEnum,
  HabilidadeCategoriaEnum,
  RolagemPresetTipoEnum,
  SeveridadeLesaoEnum,
} from '../../enums';
import type { AmplificadorAplicadoDto, CarrinhoItemDto } from '../../regras/compras';

/**
 * Contrato tipado do documento JSONB `ficha.dados` para a **ficha de jogador**
 * (m3-01). Forma final derivada de `docs/core/sistema-v4.1.0.md` — o documento
 * vence o código (proibição #27). É a fundação consumida pelo backend (validação
 * autoritativa via `shared/regras`, m3-03) e pelo frontend (cálculo/exibição ao
 * vivo). Camada `shared/` pura: nenhuma migration, service ou endpoint aqui.
 *
 * ── Modelo relacional × JSONB (SYSTEM.SPEC §10.4) ────────────────────────────
 * Identidade, posse e permissão são colunas de `ficha` (campanha, dono, tipo,
 * nome). Tudo abaixo é **conteúdo de jogo** e vive só no JSONB `dados`.
 *
 * ── Derivado: calculado ao vivo, salvo Vida/Energia máximas (revisto m3-10) ──
 * A maioria dos derivados **não entra** neste documento — limite de Energia
 * negativa, Defesa/Esquiva/Bloqueio, Deslocamento, Dano de Corpo/Furtivo,
 * Inventário máximo, Área de Percepção (`5 + Sentidos × 5`), DT de atributo,
 * Proficiência, Sanidade (não é barra), Patente (do Prestígio), Salário e Limite
 * de Modificações — são funções de classe/nível/atributos calculadas por
 * `shared/regras` no front (exibição) e no back. **Exceção (m3-10):** Vida máxima
 * e Energia máxima **são persistidas** (`estado.vidaMaxima`/`energiaMaxima`):
 * snapshot na criação, depois **editáveis** (o motor não as recalcula). Opcionais
 * — ausentes em fichas antigas, caem no derivado.
 *
 * ── Validação estrutural + liberdade de edição (SYSTEM.SPEC §11, revisto m3-10) ─
 * Este contrato é um `interface readonly` puro, como todos os DTOs do shared. A
 * validação **estrutural** (class-validator: `@IsEnum`/`@IsInt`) da forma do
 * documento é a camada 1. A camada 2 (`shared/regras`) **deixou de travar faixas
 * do estado salvo** (m3-10 — liberdade total do usuário): **não** há mais coerção
 * "HP ≤ máximo" nem "atributo dentro do limite de classe". A única regra de
 * domínio que permanece na ficha é a **Maestria** (atributo com 6+; única).
 *
 * ── Escopo ───────────────────────────────────────────────────────────────────
 * Casamento 1:1 com o documento em **classe / atributos / maestria / estado /
 * inventário** (+ arquétipo, nível, prestígio, habilidades, anotações). Ainda
 * **fora**: Identidade (Personalidade, Origem), Dinheiro e Peculiaridade de
 * Experimento — entram quando as tasks de ficha os exigirem. A **Maestria** entrou
 * no contrato em m3-10. Ver SCHEMA.md.
 */

/**
 * Os dez atributos de um agente (`docs/core/sistema-v4.1.0.md` — "Atributos").
 * O documento agrupa cinco como Físicos (Destreza, Força, Luta, Pontaria, Vigor)
 * e cinco como Mentais (Intelecto, Medicina, Sentidos, Social, Vontade), mas isso
 * é só um agrupamento de leitura — todos moram no mesmo bloco.
 *
 * "Sentidos" é um atributo (não um campo à parte): a Área de Percepção é derivada
 * dele (`5 + Sentidos × 5`) e não é guardada. Cada atributo inicia com 1 ponto
 * base; na criação distribuem-se 4 pontos (máx. 3 num único atributo, 2 nos
 * demais), teto por atributo que sobe para 6 após finalizar a ficha; a Maestria
 * (única na ficha) leva um atributo além disso. Lesões podem reduzir atributos.
 */
export interface FichaAtributosDto {
  readonly destreza: number;
  readonly forca: number;
  readonly luta: number;
  readonly pontaria: number;
  readonly vigor: number;
  readonly intelecto: number;
  readonly medicina: number;
  readonly sentidos: number;
  readonly social: number;
  readonly vontade: number;
}

/**
 * Uma sequela: instabilidade mental **temporária** (`sistema-v4.1.0.md` —
 * "Saúde" > Sanidade). Ganha ao falhar num teste de Vontade; removida ao voltar à
 * base ou num descanso longo e confortável. O limite (Vontade) e os efeitos
 * mecânicos são domínio de `shared/regras`; aqui guarda-se só a entrada nomeada.
 */
export interface FichaSequelaDto {
  readonly nome: string;
  readonly descricao?: string;
}

/**
 * Um trauma: versão **permanente** de uma sequela (`sistema-v4.1.0.md` — Sanidade).
 * Não é removível, apenas **tratável** (o tratamento reduz a penalidade, não some
 * com o trauma) — daí `tratado`. O limite de traumas não-tratados (Vontade + 1;
 * Experimentos Vontade − 1) é validado por `shared/regras`.
 */
export interface FichaTraumaDto {
  readonly nome: string;
  readonly descricao?: string;
  /** `true` se já recebeu tratamento (penalidade reduzida). O trauma permanece na ficha. */
  readonly tratado: boolean;
}

/**
 * Uma lesão física (`sistema-v4.1.0.md` — "Lesões"): remove pontos de um atributo
 * conforme a severidade. Guarda-se qual atributo foi afetado, quantos pontos
 * restam removidos (pode ser reduzido por tratamento/reabilitação) e se já se
 * tornou permanente (após entrar em "Morrendo" o suficiente enquanto lesionado).
 */
export interface FichaLesaoDto {
  /** Atributo afetado — uma das chaves de `FichaAtributosDto`. */
  readonly atributo: keyof FichaAtributosDto;
  /** Pontos de atributo removidos por esta lesão (LEVE 1 / GRAVE 3 / MORTAL 5 na origem; reduzível por tratamento). */
  readonly pontos: number;
  readonly severidade: SeveridadeLesaoEnum;
  /** `true` quando a lesão se tornou irreversível (afeta todo cálculo que usa o atributo). */
  readonly permanente: boolean;
  /** Descrição livre da lesão (o quê/como) — opcional, só exibição. */
  readonly descricao?: string;
}

/**
 * Uma habilidade da ficha (`sistema-v4.1.0.md` — "Habilidades"). Sem catálogo
 * tipado de habilidades no `shared/regras` (diferente de compras), a ficha guarda
 * a habilidade de forma desnormalizada: nome, custo de Energia, categoria de
 * origem e o texto do efeito.
 */
export interface FichaHabilidadeDto {
  readonly nome: string;
  readonly categoria: HabilidadeCategoriaEnum;
  /**
   * Custo em Energia (a notação `[N E]` do documento). `0` para habilidades
   * gratuitas (`[0 E]`); `null` para custo variável (`[X E]`).
   */
  readonly custoEnergia: number | null;
  readonly descricao: string;
  /**
   * Classe/arquétipo/subclasse **de origem** quando a habilidade veio do catálogo do
   * sistema (para o chip nomear a fonte — "Classe - Especialista" quando é de outra classe).
   * Indefinida em habilidades personalizadas e nas Gerais. Retrocompatível: fichas antigas
   * sem o campo exibem só o rótulo da categoria.
   */
  readonly origem?: ClasseEnum | ArquetipoEnum;
}

/**
 * Inventário do agente — **reusa o formato do carrinho da calculadora M1**
 * (entregável #2): itens (com suas modificações) + amplificadores acoplados, os
 * mesmos contratos tipados de `shared/regras/compras` (`CarrinhoItemDto` já
 * carrega as `modificacoes`). Nenhum tipo duplicado; `regras/` continua zero-dep.
 * O limite de inventário (`Força × 5`) e a validação de custo/peso/limites de
 * modificação por patente são domínio de `shared/regras`, não deste documento.
 */
export interface FichaInventarioDto {
  readonly itens: readonly CarrinhoItemDto[];
  readonly amplificadores: readonly AmplificadorAplicadoDto[];
}

/**
 * Estado mutável de saúde do agente durante o jogo (`sistema-v4.1.0.md` —
 * "Saúde"). Vida e Energia atuais são valores correntes (os máximos são
 * derivados). A Sanidade não é uma barra: materializa-se nas listas de sequelas
 * (temporárias) e traumas (permanentes). As lesões físicas removem atributos.
 */
export interface FichaEstadoDto {
  /**
   * Vida corrente. **Pode exceder a máxima** (m3-10 — o mestre reflete eventos de campanha);
   * zerá-la dispara "Morrendo".
   */
  readonly vidaAtual: number;
  /**
   * Energia corrente. Pode **negativar** (o documento permite gastar além de 0) e **pode exceder a
   * máxima** (m3-10).
   */
  readonly energiaAtual: number;
  /**
   * Vida **máxima** — snapshot calculado por `shared/regras` **na criação** e depois **editável**
   * (m3-10): o motor não a recalcula automaticamente. **Opcional** por retrocompatibilidade — quando
   * ausente (fichas anteriores a m3-10), cai no derivado `calcularVida(classe, nível, vigor)`. Subir
   * de nível **soma** o delta de progressão a este valor stored (não recalcula do zero).
   */
  readonly vidaMaxima?: number;
  /** Energia **máxima** — mesmo modelo de `vidaMaxima` (snapshot na criação, depois editável; m3-10). */
  readonly energiaMaxima?: number;
  readonly sequelas: readonly FichaSequelaDto[];
  readonly traumas: readonly FichaTraumaDto[];
  readonly lesoes: readonly FichaLesaoDto[];
  /**
   * Condição **Morrendo** (`sistema-v4.1.0.md` — "Condições": teste de Vigor a cada turno, DT
   * crescente; falhar mata). Alternada **manualmente** pelo dono/mestre — não é recalculada
   * automaticamente a partir de `vidaAtual` (mesma filosofia de m3-10: o estado narrativo é
   * refletido por quem joga, não travado pelo motor). Opcional por retrocompatibilidade —
   * ausente equivale a `false`.
   */
  readonly morrendo?: boolean;
  /**
   * Condição **Machucado** (`sistema-v4.1.0.md` — "Condições": resultado de um golpe que
   * removeu metade da vida; só sai ao recuperar 100%). Alternada manualmente, mesmo modelo de
   * `morrendo`.
   */
  readonly machucado?: boolean;
  /**
   * Condição **Inconsciente** (`sistema-v4.1.0.md` — "Condições": impossibilitado de agir ou
   * reagir, também Vulnerável). Alternada manualmente, mesmo modelo de `morrendo`.
   */
  readonly inconsciente?: boolean;
}

/**
 * Bloco de **derivados persistidos** (m3-10 — "nada é exclusivamente calculado"). São calculados
 * **uma vez na criação** por `shared/regras` (`calcularDerivados`) e a partir daí **stored e
 * editáveis**; o motor não os recalcula sobre as edições. Todos **opcionais**: ausentes (fichas
 * anteriores a m3-10) caem no cálculo ao vivo como fallback. `undefined` numa stat que a classe não
 * possui (ex.: Civil sem `defesa`/`proficiencia`/`danoFurtivo`). Vida/Energia máximas moram em
 * `FichaEstadoDto` (mais perto de vida/energia atuais), não aqui.
 */
export interface FichaDerivadosDto {
  readonly defesa?: number;
  readonly esquiva?: number;
  readonly bloqueio?: number;
  readonly deslocamento?: number;
  readonly proficiencia?: number;
  /** Dano de Corpo a Corpo em notação de dados (ex.: `"1d6+3"`) — `calcularDanoCorpo`. */
  readonly danoCorpoACorpo?: string;
  /** Dano Furtivo em notação de dados; `undefined` na classe que não o possui. */
  readonly danoFurtivo?: string;
  readonly percepcao?: number;
  readonly inventarioMaximo?: number;
  readonly habilidadesPorTurno?: number;
}

/**
 * Um passo **seguinte** de um preset encadeado (m3-21): uma rolagem disparada após a primária
 * (ex.: o dano depois do teste da arma, ou o dano crítico).
 */
export interface FichaRolagemPassoDto {
  readonly nome: string;
  /** Fórmula do passo — expressão de dados completa (m3-29; ex.: `LUTd20kh1 + PROF`, `2d8 [Físico]`). */
  readonly formula: string;
  readonly descricao?: string;
  /**
   * Nomes das **habilidades** da ficha usadas **neste passo** (m3-22; efeitos aposentados em m3-31): ao
   * rolá-lo, debita a **Energia** de cada ocorrência. A lista é um **multiconjunto** — o mesmo nome pode
   * repetir para aplicar a habilidade mais de uma vez (energia soma por ocorrência). As habilidades
   * **não** alteram mais a fórmula: quem lê a descrição aplica o efeito na mão. Ausente = passo sem habilidade.
   */
  readonly habilidades?: readonly string[];
  /**
   * `true` marca o passo como **critável** (m3-30): a UI oferece um botão "Rolar crítico" além do
   * "Rolar", e o crítico **dobra** o dano (dados, fixos e atributos da fórmula), exceto valores de
   * Patente/Nível (`PROF`/`NIV`), conforme `sistema-v4.1.0` (1217/1303). Ausente = não.
   */
  readonly critico?: boolean;
}

/**
 * Preset de rolagem de dados salvo na ficha (m3-15; estendido em m3-21). Atalho nomeado para uma
 * fórmula (ex.: `1d20+LUT`); o motor de avaliação vive em `shared/regras/rolagem` (m3-15 —
 * `regras/dados` já é a pasta de dados/tabelas de jogo, por isso o motor mora em `regras/rolagem`).
 *
 * A fórmula é uma expressão de dados completa (m3-29) — não há mais "modo"; um teste é `LUTd20kh1 + PROF`.
 * Presets legados (`modo:'TESTE'`) migram na carga via `normalizarPresetLegado` (`shared/regras/rolagem`).
 */
export interface FichaRolagemDto {
  readonly nome: string;
  readonly formula: string;
  readonly descricao?: string;
  /** `SIMPLES` (uma rolagem) ou `ENCADEADO` (primária + `seguintes`). Ausente = `SIMPLES`. */
  readonly tipo?: RolagemPresetTipoEnum;
  /** Passos disparados após a primária, na ordem (m3-21). */
  readonly seguintes?: readonly FichaRolagemPassoDto[];
  /**
   * Nomes das **habilidades** da ficha usadas no **passo primário** (m3-21; por-passo em m3-22): ao
   * rolá-lo, debita a Energia de cada ocorrência (multiconjunto — repetir o nome aplica a habilidade
   * mais de uma vez). **Não** altera a fórmula (efeitos aposentados em m3-31). Cada passo seguinte tem o
   * seu próprio `habilidades` (`FichaRolagemPassoDto`).
   */
  readonly habilidades?: readonly string[];
  /** `true` marca o **passo primário** como critável (m3-30) — ver `FichaRolagemPassoDto.critico`. Ausente = não. */
  readonly critico?: boolean;
}

/**
 * Documento completo `ficha.dados` de uma ficha de jogador — a forma final do
 * JSONB (m3-01, estendido em m3-10). Consumível por backend e frontend sem redefinição.
 */
export interface FichaJogadorDadosDto {
  /**
   * Classe do agente. `ClasseEnum` já codifica o eixo inteiro: as três classes
   * base (`COMBATENTE`/`ESPECIALISTA`/`SUPORTE`), as três subclasses Experimento
   * (`EXPERIMENTO_BESTIAL`/`_ARTIFICIAL`/`_HIBRIDO`) e o registro `CIVIL`. Por
   * isso **não há campo `subclasse` à parte** — reusa o enum existente (proibição
   * #21). Um Civil não tem classe base jogável, mas o valor `CIVIL` o representa.
   */
  readonly classe: ClasseEnum;
  /**
   * Arquétipo escolhido — presente **só** quando `classe` é uma das três classes
   * base. `null` quando o agente tomou uma subclasse (Experimento) ou é `CIVIL`,
   * pois nesses casos não há arquétipo (a subclasse ocupa o lugar do arquétipo).
   */
  readonly arquetipo: ArquetipoEnum | null;
  /** Nível do agente. Faixa 0–20 inteiro (o documento veda ultrapassar 20; todos iniciam em 0). */
  readonly nivel: number;
  /**
   * Prestígio do agente — determina a Patente (derivada, não guardada). Inteiro;
   * **pode ser negativo** (Experimentos iniciam com −1 no nível 0). Sem teto fixo.
   */
  readonly prestigio: number;
  readonly atributos: FichaAtributosDto;
  /**
   * Atributo que carrega a **Maestria** (o ápice único da ficha), ou `null` (m3-10). Segue
   * `sistema-v4.1.0.md` ("⬥ Maestrias"): **única na ficha** (por isso um só campo, não um por
   * atributo) e só marcável em atributo com **6+ pontos** (`shared/regras/agente`
   * `maestriaAtingivel`). A ficha guarda apenas **qual** atributo tem a Maestria; o bônus permanente
   * (distinto por atributo, tabela do documento) é exibição derivada, não persistido.
   */
  readonly maestria: keyof FichaAtributosDto | null;
  readonly estado: FichaEstadoDto;
  /**
   * Derivados persistidos (m3-10). **Opcional** por retrocompatibilidade — ausente em fichas
   * anteriores; uma ficha salva por m3-10 grava o snapshot. Ver `FichaDerivadosDto`.
   */
  readonly derivados?: FichaDerivadosDto;
  readonly habilidades: readonly FichaHabilidadeDto[];
  readonly inventario: FichaInventarioDto;
  /** Presets de rolagem de dados salvos na ficha (m3-15). Opcional; ausente = sem presets. */
  readonly rolagens?: readonly FichaRolagemDto[];
  /** Anotações livres do jogador/mestre sobre a ficha. */
  readonly anotacoes: string;
}
