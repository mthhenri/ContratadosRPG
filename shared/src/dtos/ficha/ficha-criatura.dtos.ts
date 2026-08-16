import type {
  CadenciaEnum,
  ComportamentoCriaturaEnum,
  CustoAcaoEnum,
  HabilidadeTipoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  RegeneracaoIntensidadeEnum,
  RegeneracaoModoEnum,
  TenacidadeEnum,
  TipoDanoEnum,
} from '../../enums';
import type { FichaAtributosDto } from './ficha.dtos';

/**
 * Contrato tipado do documento JSONB `ficha.dados` para a **ficha de criatura** (Ameaça,
 * `m4-01`). Forma final derivada de `docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação
 * de Ameaças" — o documento vence o código (proibição #27). Design fechado em `SCHEMA.md`
 * ("FichaCriaturaDadosDto") antes desta task; aqui só se codifica.
 *
 * ── Dois contratos, não um (decisão de abertura do M4) ───────────────────────
 * Criatura e NPC **não compartilham forma** — a mecânica dos dois capítulos do guia
 * divergiu o suficiente para não valer a pena uma variação de um único DTO. Ver
 * `FichaNpcDadosDto` (`m4-05`) para o contrato de NPC.
 *
 * ── Sem Maestria ──────────────────────────────────────────────────────────────
 * Maestria é mecânica exclusiva de jogador (decisão de abertura do M4) — não existe campo
 * equivalente aqui.
 *
 * ── Snapshot na criação + editável depois (mesma filosofia de m3-10) ─────────
 * `vidaMaxima`/`vidaAtual` e `defesa` são calculados uma vez na criação
 * (`shared/regras/criatura`, `m4-02`) e persistidos; o motor **não os recalcula** sobre
 * edições posteriores — o Mestre pode ajustá-los livremente depois. A atual pode exceder a
 * máxima, mesma liberdade de edição da ficha de jogador.
 *
 * ── Validação estrutural (SYSTEM.SPEC §11) ───────────────────────────────────
 * `interface readonly` pura, como todos os DTOs do shared — sem class-validator (o backend
 * não liga `ValidationPipe`, decisão vigente do projeto). A validação de coerência de
 * domínio (soma de resistências ≤ limite, modificadores na distribuição fixa 2/3/3/2, ao
 * menos 1 fraqueza, ao menos 1 modo de deslocamento) é responsabilidade de
 * `shared/regras/criatura` (`m4-02`), chamada pelo service (`m4-03`) antes de persistir.
 */
export interface FichaCriaturaDadosDto {
  readonly identidade: FichaCriaturaIdentidadeDto;
  /** Nível de Ameaça — impacto real da criatura livre por 24h, não dificuldade de combate. */
  readonly na: NivelAmeacaEnum;
  /** Valor de Desafio — meta de design definida como alvo antes de qualquer outro cálculo. */
  readonly vd: number;
  /**
   * Valor **final** de cada atributo (Base do VD + Pontos de Ajuste + Realocação) — reusa
   * `FichaAtributosDto` (mesmos 10 campos do jogador), sem redefinir (proibição #21).
   */
  readonly atributos: FichaAtributosDto;
  /**
   * Um modificador por atributo, distribuição fixa 2 Forte / 3 Médio / 3 Fraco / 2 Frágil
   * (validada por `shared/regras/criatura`, não pelo tipo). Afeta só os testes de atributo
   * (Atributo Efetivo) — nunca o valor salvo em `atributos`.
   */
  readonly modificadores: FichaCriaturaModificadoresDto;
  readonly tenacidade: TenacidadeEnum;
  /** Snapshot: VD × multiplicador de Tenacidade (`m4-02`) — editável depois. */
  readonly vidaMaxima: number;
  /** Pode exceder `vidaMaxima` (mesma liberdade de edição de m3-10). */
  readonly vidaAtual: number;
  /**
   * Snapshot: 15 + VD ÷ 2 (`m4-02`) — editável depois. Criatura nunca reage a ataques
   * (sem Esquivar/Bloquear); Contra-Ataque só existe quando `modificadores.luta` é `FORTE`
   * (derivado, não persistido).
   */
  readonly defesa: number;
  /** Soma dos `valor` ≤ Limite de Resistências (`2×VD`, +25% por Fraqueza extra além da 1ª). */
  readonly resistencias: readonly FichaCriaturaResistenciaDto[];
  /**
   * Ao menos 1 obrigatória; mínimo de cada `valor` é 5 ou metade da soma de resistências
   * (o que for maior). Mesma forma de `FichaCriaturaResistenciaDto` — o campo (`resistencias`
   * × `fraquezas`) já carrega a semântica; um segundo tipo estruturalmente idêntico seria
   * duplicação sem ganho.
   */
  readonly fraquezas: readonly FichaCriaturaResistenciaDto[];
  /** Ausente = sem Regeneração Natural (propriedade opcional, não existe por padrão). */
  readonly regeneracao?: FichaCriaturaRegeneracaoDto;
  readonly porte: PorteCriaturaEnum;
  /** Ao menos um modo preenchido; trocar de modo em combate é gratuito (regra de uso, não de forma). */
  readonly deslocamento: FichaCriaturaDeslocamentoDto;
  readonly cadencia: CadenciaEnum;
  /**
   * Bônus fixo somado à Iniciativa após a rolagem normal de XD6 de Destreza — Habilidade
   * Especial Passiva opcional (sugestão do guia: ~10% da VD). Ausente/`0` = sem bônus.
   */
  readonly iniciativaBonus?: number;
  readonly ataques: readonly FichaCriaturaAtaqueDto[];
  readonly habilidades: readonly FichaCriaturaHabilidadeDto[];
  /** Texto livre — mesmo tratamento privado (só dono/mestre) da ficha de jogador. */
  readonly anotacoes?: string;
}

/**
 * Ficha de Identidade da criatura (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação
 * de Ameaças" > "Identidade e Classificação"). Preenchida **antes** de qualquer número —
 * a criatura precisa existir como conceito coerente primeiro.
 */
export interface FichaCriaturaIdentidadeDto {
  /** Nome da criação — algo lembrável, não um código técnico. */
  readonly designacao: string;
  readonly origem: OrigemCriaturaEnum;
  /** "Linha de Conceito" — uma única frase, o gancho de criação que guia tudo depois. */
  readonly conceito: string;
  readonly naturezaFisica: string;
  readonly comportamento: ComportamentoCriaturaEnum;
  readonly motivacao: string;
  /** O detalhe que nenhum monstro convencional tem — o que os jogadores vão contar depois. */
  readonly ganchoUnico: string;
  /** Opcional — o que a criatura representa (perda de controle, corpo, identidade…). */
  readonly temaHorror?: string;
}

/** Um modificador por atributo (mesmas 10 chaves de `FichaAtributosDto`). */
export type FichaCriaturaModificadoresDto = Record<keyof FichaAtributosDto, ModificadorCriaturaEnum>;

/**
 * Uma resistência (ou fraqueza — mesma forma, usada nos dois campos) da criatura. `tipo`
 * reusa `TipoDanoEnum` (não redefine — proibição #21); `subtipo` é texto livre para uma
 * abertura mais específica dentro do tipo (ex.: "Cortante" dentro de Físico) — a cada 2
 * pontos de um subtipo só 1 ponto do Limite de Resistências é gasto (metade do custo de um
 * tipo amplo). Resistência a `TipoDanoEnum.GERAL` conta em **dobro** no Limite. Numa
 * fraqueza, `valor` é o dano adicional recebido (não dano filtrado) — crítico na fraqueza
 * multiplica em 3× (tipo amplo) ou 4× (subtipo), cálculo derivado, não persistido. Uma
 * criatura nunca tem resistência e fraqueza ao mesmo tipo/subtipo (validado por
 * `shared/regras/criatura`).
 */
export interface FichaCriaturaResistenciaDto {
  readonly tipo: TipoDanoEnum;
  readonly subtipo: string | null;
  readonly valor: number;
}

/**
 * Regeneração Natural (opcional — campo `regeneracao` ausente na ficha = sem regeneração).
 * `condicao` é obrigatória em texto quando `modo` é `CONDICIONAL` e `null` quando `PASSIVA`
 * (validado por `shared/regras/criatura`, não pelo tipo). `valor` é absoluto — o % da Vida
 * Máxima calculado **uma vez** na criação e registrado como número fixo.
 */
export interface FichaCriaturaRegeneracaoDto {
  readonly modo: RegeneracaoModoEnum;
  readonly intensidade: RegeneracaoIntensidadeEnum;
  readonly valor: number;
  readonly condicao: string | null;
}

/**
 * Deslocamento da criatura — ao menos um modo preenchido (validado por
 * `shared/regras/criatura`). Cada modo é independente e trocar entre os declarados não
 * consome ação. `terrestre` tem uma tabela de sugestão por Destreza no guia, mas o valor é
 * sempre declarado pelo Mestre, nunca calculado automaticamente a partir do atributo.
 */
export interface FichaCriaturaDeslocamentoDto {
  readonly terrestre?: number | null;
  readonly voador?: number | null;
  readonly aquatico?: number | null;
  /** Ignora terreno/obstáculos e reações; ver guia para as regras especiais de uso em jogo. */
  readonly sobrenatural?: number | null;
}

/**
 * Um ataque da criatura. `teste`, `dano` e `danoCritico` são texto livre na notação de dados
 * do sistema (ex. `"4D12+10"`) — a tabela de dano de referência por VD/custo de ação
 * (`shared/regras/criatura`) é só **sugestão**, o Mestre pode divergir. `area: true` exige
 * Ação Completa por padrão e testa Destreza/Vigor do alvo contra a DT do teste de ataque da
 * criatura, em vez da Defesa individual (regra de uso, não de forma).
 *
 * `teste`/`danoCritico` viraram expressão livre (não mais `atributo: keyof FichaAtributosDto`
 * + dobra automática) porque um ataque de criatura pode testar/rolar mais dados do que o
 * convencional de um único atributo — o Mestre escreve a fórmula exata que quer, inclusive
 * quando o "crítico" não é simplesmente o dobro do dano normal (ex.: muda o tipo de dano).
 */
export interface FichaCriaturaAtaqueDto {
  readonly nome: string;
  /** Fórmula de teste (ex. `"lutad20kh1+3"`) — livre, não fica preso a um único atributo. */
  readonly teste: string;
  readonly custoAcao: CustoAcaoEnum;
  /** Fórmula de dano (ex. `"4D12+10[Físico]"`) — o tipo de dano vai na própria fórmula, não é
   * mais um campo à parte (`rolarFormula` já extrai a tag de tipo direto da expressão). */
  readonly dano: string;
  /** Fórmula de dano crítico — independente de `dano`, o Mestre escreve o efeito exato. */
  readonly danoCritico: string;
  readonly area: boolean;
  /** Condição/teste/efeito adicional além do dano — opcional. */
  readonly efeito?: string;
}

/**
 * Uma habilidade especial da criatura — propriedade da própria criatura, não selecionada de
 * um catálogo (diferente das habilidades de jogador). `restricao` é a frequência/condição
 * de uso quando aplicável (ex.: "uma vez por cena", "recarga de 3 turnos").
 */
export interface FichaCriaturaHabilidadeDto {
  readonly nome: string;
  readonly tipo: HabilidadeTipoCriaturaEnum;
  readonly descricao: string;
  readonly restricao?: string | null;
}
