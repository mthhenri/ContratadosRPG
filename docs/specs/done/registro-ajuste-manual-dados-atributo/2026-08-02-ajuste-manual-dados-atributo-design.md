# Ajuste manual de dados por atributo — design

## Problema

Hoje a tela de edição do atributo (`ficha-visualizacao`) tem dois ajustes por atributo:

- **Valor do atributo** (`atributos[chave]`) — afeta Energia, Deslocamento, Vida, Maestria, etc.
- **Modificador de teste** (`modificadoresTeste[chave]`) — soma/subtrai no **resultado** do teste, sem
  mexer no atributo.

Falta um terceiro: ajustar quantos **dados** o atributo rola nos testes, sem alterar o valor base —
ex.: ter 6 em Destreza mas rolar só 5D20 (ou ter 4 e rolar 5D20), mantendo intactos os cálculos que
dependem do valor base (Energia, Deslocamento, Vida, Maestria).

## Escopo

- Só o ajuste **manual** (stepper livre, como o modificador de hoje). Lesões continuam mexendo no
  atributo efetivo como já fazem; Sequelas/Traumas continuam sem mecânica automática (texto livre) —
  fora de escopo aqui.
- O ajuste vale em **qualquer rolagem que use o atributo como fonte de dados** (`ATRd20`, `ATRd6` da
  Iniciativa, dados de descanso, presets/habilidades que referenciam o atributo) — não só no botão de
  teste do card do atributo.
- **Fora do alcance:** `calcularDtAtributo` (DT é um número-alvo derivado do atributo, não "usar o
  atributo como fonte de dados") e o bake de lesões permanentes em `ficha-edicao.service.ts` — os
  dois continuam usando só `atributosEfetivos` (lesão), sem o ajuste manual.

## Modelo de dados

Novo campo em `FichaJogadorDadosDto`, irmão de `modificadoresTeste`:

```ts
/**
 * Ajuste manual de quantos dados o atributo rola em testes/rolagens — sem alterar o valor base
 * (Energia, Deslocamento, Vida, Maestria continuam intocados). Some ao atributo efetivo (lesão)
 * antes de virar contagem de dados. Opcional/parcial — atributo ausente cai em 0.
 */
readonly dadosTeste?: Partial<Record<keyof FichaAtributosDto, number>>;
```

Editado no mesmo grupo de `AjusteAtributos` (junto de `atributos`/`maestria`/`modificadoresTeste`),
persistido junto, sem clamp — mesma liberdade dos steppers existentes.

## Cálculo

Nova função em `shared/src/regras/agente/lesao.ts` (ao lado de `calcularAtributosEfetivos`):

```ts
/** Atributo efetivo (lesão) + ajuste manual de dados — usado só como contagem de dados de rolagem. */
export function calcularAtributosParaDados(
  atributos: FichaAtributosDto,
  lesoes: readonly FichaLesaoDto[],
  dadosTeste: Partial<Record<keyof FichaAtributosDto, number>>,
): FichaAtributosDto
```

Sem piso — pode zerar/negativar, disparando a desvantagem intrínseca já existente no motor de
rolagem (atributo ≤ 0 → rola `2+|attr|` dados e mantém o menor). Nenhuma mudança no motor de
rolagem em si.

## Onde entra

`atributosParaDados` substitui `atributosEfetivos` como o `atributos` passado a `rolarFormula`/
`resolverPreset` em todo lugar que rola dados a partir do atributo:

- `rolarTesteAtributo` (card do atributo, Visão Geral).
- Painel de presets/habilidades (`ficha-rolagens-painel`).
- Iniciativa automática.
- Dados de descanso (se consumirem `FichaAtributosDto` do mesmo jeito).

`calcularAtributosEfetivos` (lesão-only) continua existindo e sendo usado, sem mudança, em
`calcularDtAtributo` e no bake de lesões permanentes.

## UI

Terceiro stepper no card de edição do atributo (mesma tela da imagem anexada: `DES` com `−`/`+` no
valor, estrela da Maestria, `−`/`+` no modificador `+0`) — um quarto elemento com ícone de dado e
`−`/`+`, rótulo `+0` quando ausente. O valor do atributo exibido na ficha continua sendo sempre o
base; esse stepper não altera nem é alterado por ele.

**Impacto de layout:** o card de edição ganha um elemento a mais por atributo (10 atributos × 1
stepper novo) — precisa validar que não estoura/quebra em mobile nem cresce demais em desktop.

## Critério de verificação (obrigatório antes de fechar)

Verificação **ao vivo** (stack real, skill `verify`), nos dois viewports fixos do projeto:

- **Mobile:** 360×800 (Galaxy S20 FE).
- **Desktop:** 1920×1080 (FullHD).

Checar nos dois tamanhos: zero scroll horizontal, alvo de toque ≥44px no novo stepper (mobile),
card do atributo não estourando a coluna, e o stepper legível/alinhado com os outros dois já
existentes (valor e modificador) — mesmo tratamento visual, sem virar o elemento mais destacado do
card.

## Testes

- `shared/regras/agente/lesao.spec.ts`: casos de `calcularAtributosParaDados` (soma manual, sem
  piso, combinação com lesão).
- `rolagem.spec.ts`/specs de preset: rolagem usando `atributosParaDados` em vez do atributo cru.
- `ficha-visualizacao.component.spec.ts`: novo stepper edita/persiste `dadosTeste` junto do resto do
  grupo (mesmo padrão de `modificadoresTeste`).
