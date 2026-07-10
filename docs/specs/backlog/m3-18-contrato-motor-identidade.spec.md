# m3-18-contrato-motor-identidade.spec.md

> Task 18 do milestone `m3-ficha-jogador.spec.md`. Primeira das três da **Identidade**
> (`m3-18` contrato+motor → `m3-19` backend → `m3-20` frontend).

> **Regras de jogo:** `docs/core/sistema-v4.1.0.md` §⬡ Identidade (Personalidade, Fortificação de
> Traços, Origem: Formação/Especialidade/Saber de Campo). **O documento vence** (proibição #27).

## Objetivo

Fechar o contrato da **Identidade** no JSONB `ficha.dados` e o motor puro que interpreta os bônus de
**Formação**. Hoje a Identidade está explicitamente fora do contrato (`SCHEMA.md`: *"Ainda fora do
contrato: Identidade (Personalidade, Origem: Formação/Especialidade/Saber de Campo)"*).

Sem backend e sem UI — só `shared/` e documentação.

## Contexto que já existe

- `HabilidadeCategoriaEnum.PERSONALIDADE` **já existe** (m3-01), com o JSDoc *"Habilidade derivada da
  Personalidade escolhida na Identidade"*. A **habilidade** de Personalidade é uma
  `FichaHabilidadeDto` normal em `habilidades[]`; a **Fortificação de Traços** (níveis 7 e 14) é o
  Mestre reescrevendo `custoEnergia`/`descricao` dessa habilidade. **Nada disso ganha estrutura
  nova** — o documento diz que cada fortificação é "completamente decidida pelo Mestre em conjunto
  com o Jogador". Só a **palavra** (o adjetivo) precisa de campo.
- `obterBonusAtributos` (m3-10) é o **precedente** de bônus aplicado como **delta único** na escolha,
  e `ajustarClasse` já resolve o caso "trocou: remove o bônus antigo, soma o novo".
- `incrementarDanoFurtivo` (m3-10) já soma um dado ao `danoFurtivo`.

## Entregáveis

### 1. Contrato (`shared/src/dtos/ficha/ficha.dtos.ts`)

```ts
readonly identidade?: FichaIdentidadeDto;   // opcional — fichas anteriores a esta task não têm

interface FichaIdentidadeDto {
  readonly personalidade: string | null;    // uma única palavra, um adjetivo
  readonly origem: FichaOrigemDto | null;
}

interface FichaOrigemDto {
  readonly nome: string;                             // o rótulo: "Bombeiro"
  readonly descricao: string;                        // texto de sabor
  readonly formacao: readonly FichaFormacaoDto[];    // exatamente 2
  readonly especialidade: FichaEspecialidadeDto;
  readonly saberDeCampo: string;
}

interface FichaFormacaoDto {
  readonly bonus: FormacaoBonusEnum | null;  // null = bônus custom autorizado pelo Mestre
  readonly parametro: string | null;         // "Vigor", "Armas de Fogo", "Químico", "Esquiva"…
  readonly texto: string;                    // sempre presente — é o que se exibe
}

interface FichaEspecialidadeDto {
  readonly gatilho: string;                  // uma frase objetiva
  readonly efeito: EspecialidadeEfeitoEnum;  // não acumula (documento)
}
```

`bonus: null` **não é lacuna, é o escape do documento**: *"A lista apresentada não é definitiva.
Bônus adicionais podem ser autorizados pelo Mestre."* O `texto` sempre existe; o `bonus` tipado é
opcional. Um catálogo fechado mentiria sobre a regra.

### 2. Enums (`shared/src/enums/`) — conteúdo de jogo, **sem tabela `tipo_*`** (§10.3)

- **`FormacaoBonusEnum`** — as **21** linhas da tabela do documento, distribuídas nos grupos
  Combate (5), Movimento (2), Perícia (4), Equipamento (7) e Logística (3).
- **`FormacaoParametroEnum`** — `ATRIBUTO`, `CATEGORIA_ARMA`, `TIPO_DANO`, `ESQUIVA_OU_BLOQUEIO`,
  `CONDICAO`. Algumas linhas não são um bônus sozinhas: `+1 dado em testes com uma categoria de
  arma` e `+1 dado em testes de um atributo específico` exigem parâmetro.
- **`EspecialidadeEfeitoEnum`** — `DADO_EXTRA` (+1 dado), `BONUS_TESTE` (+3 no resultado),
  `DANO` (+2 no dano). O documento fixa esses três e proíbe acumular.

### 3. Motor (`shared/regras/identidade/`, puro, zero-dep, testado)

Cada linha da tabela vira um **descritor declarativo** — um formato, vários consumidores. Evita 21
funções sob medida e permite que os efeitos ainda sem campo existam como **dados tipados**, não como
comentário.

```ts
type EfeitoFormacao =
  | { alvo: 'DERIVADO';          campo: 'deslocamento' | 'inventarioMaximo'; valor: number }
  | { alvo: 'DERIVADO_ESCOLHA';  campos: ['esquiva', 'bloqueio']; valor: number }  // parâmetro decide
  | { alvo: 'DANO_CORPO';        valor: number }
  | { alvo: 'DANO_FURTIVO_DADO' }
  | { alvo: 'ROLAGEM';           modificador: 'DADO' | 'BONUS'; valor: number }
  | { alvo: 'RESISTENCIA' | 'SOBRECARGA' | 'INICIATIVA' | 'DT_REPARO'; valor: number };
```

- **`FORMACOES`** — as 21 definições (`codigo`, `grupo`, `rotulo`, `parametro`, `efeito`), conferidas
  1:1 contra o documento.
- **`aplicarFormacaoAosDerivados(derivados, formacoes): FichaDerivadosDto`** — aplica **apenas** os
  alvos que hoje têm campo em `FichaDerivadosDto`. **Delta único**, no momento em que a Origem é
  definida (mesmo padrão de `obterBonusAtributos`); o motor **não** recalcula sobre edições manuais
  (princípio invertido na m3-10). Trocar de Origem remove o delta da anterior e soma o da nova,
  espelhando `ajustarClasse`.
- **`listarEfeitosPendentes(formacoes)`** — devolve, estruturados, os efeitos **sem campo onde
  aterrissar**.
- **`somarDanoFixo(dano, valor)`** — helper novo: `danoCorpoACorpo` é a string `"1D3 [Físico]"` e
  nenhuma função existente soma um valor fixo (`incrementarDanoFurtivo` só mexe em dados).
  Fail-safe fora do formato, como as demais de `regras/agente/dano`.

#### Cobertura real: 5 de 21

Auditoria da tabela contra `FichaDerivadosDto`. **Cinco** linhas têm campo hoje:

| Linha do documento | Campo |
|---|---|
| `+1 de Esquiva ou Bloqueio (escolha um)` | `esquiva` / `bloqueio` |
| `+1m de Deslocamento` | `deslocamento` |
| `+1 no dano de Corpo (golpes desarmados)` | `danoCorpoACorpo` |
| `+1 dado de dano Furtivo` | `danoFurtivo` |
| `+1 na base de cálculo de Inventário` | `inventarioMaximo` |

As **outras 16 não têm campo nenhum**: `+3 de resistência contra um tipo de dano` (a ficha não modela
resistências), `+3 de tolerância de Sobrecarga`, `+1 dado em Iniciativa`, `Reduz a DT de reparo em
-2`, as 7 de Equipamento e as 4 de Perícia — todas modificadores de rolagem, e o motor de dados só
nasce na `m3-15` (backlog).

> **Aviso à sessão futura — isto não é código morto.** Ao fim desta task, os alvos `ROLAGEM`,
> `RESISTENCIA`, `SOBRECARGA`, `INICIATIVA` e `DT_REPARO` estarão **corretos, testados e sem nenhum
> consumidor**. É **deliberado** (decisão do autor): quando os campos existirem, muda-se o
> **aplicador**, não a tabela. **Não apagar por "não usado".**

### 4. Documentação

`SCHEMA.md`: descrever o bloco `identidade` no JSONB e **remover a Identidade** da lista "Ainda fora
do contrato". Registrar que o `bonus: null` é o escape autorizado pelo documento.

## Critérios de Aceite

- As 21 linhas existem em `FORMACOES` com `codigo`/`grupo`/`rotulo`/`efeito` conferidos contra
  `sistema-v4.1.0.md`; as que exigem parâmetro o declaram.
- `aplicarFormacaoAosDerivados` aplica as 5 aplicáveis, **ignora as 16 pendentes sem quebrar**, e
  trocar de Origem remove o delta antigo antes de somar o novo.
- `listarEfeitosPendentes` devolve exatamente as 16.
- Nenhuma fórmula duplicada (proibições #26/#27): `danoFurtivo` reusa `incrementarDanoFurtivo`.
- `identidade` é **opcional** — uma ficha anterior a esta task continua válida (fallback).
- Zero mudança em `backend/` e `frontend/`.

## Fora de Escopo

- Validação e trava de imutabilidade (`m3-19`).
- Qualquer UI (`m3-20`).
- Criar os campos que faltam (resistências, Sobrecarga, Iniciativa, DT de reparo) e o motor de
  rolagem que consumiria os modificadores — os 16 efeitos ficam **modelados e sem consumidor**.
- Fortificação de Traços como estrutura própria: é a habilidade de Personalidade sendo reescrita.

## Dependências

- `m3-01` (contrato do JSONB, `HabilidadeCategoriaEnum.PERSONALIDADE`).
- `m3-10` (`derivados` stored e editáveis; `obterBonusAtributos`/`ajustarClasse` como precedente de
  delta único; `incrementarDanoFurtivo`).
