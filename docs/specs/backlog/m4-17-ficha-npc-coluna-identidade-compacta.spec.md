# m4-17-ficha-npc-coluna-identidade-compacta.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, continuação da revisão do NPC.
> Pedido direto do autor (2026-10-05): *"a gente tem que reduzir um pouco mais essa visão,
> porque ela está grande demais. Por exemplo, a foto do NPC está muito grande… tudo está muito
> grande nessa primeira coluna. Reduzir o tamanho da foto, pegar o defesa, bloqueio e esquiva e
> também reduzir eles, deixar eles um pouquinho mais finos. Assim como a cooperação, a
> cooperação poderia ser uma barra abaixo da foto, talvez como uma barrinha que vai de
> vermelho até verde, e mostra onde está a cooperação dele."*
>
> Segunda das três specs desta frente: `m4-16` (usabilidade da edição, **deve estar em `done/`
> antes**) → **`m4-17` (esta)** → `m4-18` (`m4-18-ficha-npc-atributos-como-jogador.spec.md`).
> Esta task muda **como a coluna de identidade se vê em leitura**; **como ela se edita** é da
> `m4-16` (padrão de lápis + Salvar/Cancelar no bloco), que esta apenas consome.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Análogos aprovados obrigatórios** (registrar no fecho qual serviu para quê):
> - o card **Identidade da ficha de Jogador** (`componentes/ficha-visualizacao/`, `&__avatar`
>   com `175×175`) — referência de **escala** da foto e do cartão;
> - o card **Identidade da ficha de Criatura** (`componentes/criatura-visualizacao/`, avatar
>   `215×215` que enquadra a foto em `175×175`, selos redondos, perfil centralizado) —
>   referência de **composição** e dos selos de retrato já adotados na `m4-14`.
> Mapear shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e
> comportamento responsivo — não só "usar os tokens".

## Objetivo

A primeira coluna da ficha de NPC (cartão **Identidade**) ocupa mais altura e largura que a de
Jogador e a de Criatura: retrato de até `230px` (`npc-visualizacao.scss`, `&__identidade` com
coluna fixa de `230px` e `&__retrato` com `max-width: 230px`), ladrilhos de Defesa/Bloquear/Esquivar
altos, barras de Vida/Energia em `tamanho="padrao"`, notas de apoio ("Pool + Recarga · Recarga
X/turno", "Sem Energia"), e a **Cooperação** como subseção com ladrilho + frase social. Esta task
**compacta toda a coluna** e troca a Cooperação por uma **barra de escala de vermelho a verde**
sob a foto, sem alterar o que a ficha mostra, calcula ou edita.

## Decisões de abertura (confirmar com o autor **antes** de implementar)

`shared/ui/` hoje **não** cobre dois itens desta task; pela regra do projeto, ampliar um
primitivo ou criar um novo é decisão do autor — **pergunte** (`AskUserQuestion`, com os
trade-offs abaixo) e implemente só a escolhida. As duas perguntas podem ir juntas.

1. **Barra de Cooperação (escala 0–10, vermelho → verde com marcador).** Não existe primitivo:
   `app-barra-recurso` é um recurso atual/máximo (preenche da esquerda) e usa as cores
   fixas de Vida/Energia.
   - **A (recomendada): novo primitivo `app-barra-escala`** em `shared/ui/barra-escala/`
     (entrada: `valor`, `minimo`, `maximo`, `rotulo`, `textoValor`; gradiente
     `var(--vida)` → `var(--warning)` → `var(--positive)`; marcador na posição do valor;
     `role="meter"` com `aria-valuemin/max/now` e `aria-valuetext`). Reutilizável e dentro da
     regra de primitivos. Custo: um primitivo novo + spec + registro em `DESIGN.md`.
   - **B: variante de `app-barra-recurso`** (`recurso="escala"`). Menos arquivos, mas mistura
     duas semânticas (preenchimento × posição) num primitivo de recurso.
   - **C: bloco local no componente NPC.** Mais rápido, mas é exatamente o "receita local que
     reinventa o primitivo" que a regra proíbe — só com autorização expressa.
2. **Ladrilhos mais finos de Defesa/Bloquear/Esquivar.** `app-stat` só tem `tamanho`
   `compacto | padrao | hero`; "mais fino" que `compacto` não existe.
   - **A (recomendada): novo tamanho `'fino'`** em `Stat` (`StatTamanho`) — menos padding
     vertical, rótulo e valor na mesma linha ou rótulo colado ao valor — consumido só aqui por
     enquanto.
   - **B: trocar o ladrilho por uma linha "Def 24 · Blo 27 · Esq 27"** no desenho já usado em
     `EspectadorFichaCard` (`espectador-ficha__reacoes`). Mais compacto ainda, mas deixa de ser
     "ladrilho" e perde o rótulo por extenso (pode ir no `appTooltip`).
   - **C: sobrescrever o padding do `Stat` por CSS local.** Proibido sem o autor aprovar.

## Entregáveis

### 1. Diagnóstico de escala (primeiro passo, antes de editar)

Com o app real rodando (**pedir autorização ao autor antes de subir o stack**; ver `verify`),
medir em `1920×1080` e `360×800`, **NPC combatente (com Energia) e NPC Civil**, e registrar no
fecho uma **tabela antes/depois** com: largura e altura do retrato; altura do cartão
Identidade; altura de cada ladrilho; altura de cada barra; altura total da coluna 1 (Identidade
+ Atributos); e as mesmas medidas do card Identidade de **Jogador** e de **Criatura**. A tabela
propõe o alvo numérico (o autor valida): **a Identidade do NPC não pode ficar mais alta que a de
Criatura**, e no desktop Identidade + Atributos devem caber na viewport `1920×1080` junto do
cabeçalho da página, sem rolagem da página.

### 2. Retrato menor

Reduzir o retrato ao tamanho do análogo de Jogador/Criatura (`175×175` de foto; moldura/selos
como na Criatura, **já adotados na `m4-14`**: enquadrar, remover e trocar sobre o avatar,
`app-botao-icone [redondo]`, só para o mestre — **não** mudar a lógica de upload/enquadramento).
A coluna fixa de `230px` de `npc__identidade` e o `max-width: 230px` do `npc__retrato` saem;
o retrato volta a ser dimensionado por token/variável e fica centralizado no cartão. Foto vazia
mantém o padrão listrado atual. O enquadramento (`appFocoImagem`, `imagemFoco`) continua válido
em qualquer tamanho.

### 3. Recursos compactos

- Barras de Vida e Energia passam de `tamanho="padrao"` para `tamanho="compacto"` (o tamanho que
  `EspectadorFichaCard` e a campanha já usam), mantendo edição rápida (`[editavel]`,
  `atualAlterado`, `maximoAlterado`), "Morrendo" + "Confirmar socorro" e Civil sem Energia.
- As notas "Pool + Recarga · Recarga X/turno", "Reserva Fixa" e "Sem Energia" deixam de ocupar
  linhas próprias: vão para um `app-chip variante="sutil"` ao lado do rótulo da barra ou para o
  `appTooltip` da barra (conferir com o autor qual lê melhor), sem perder a informação.
- Defesa/Bloquear/Esquivar: o ladrilho fino da decisão de abertura 2, em uma só fileira de 3,
  **sem** o subcabeçalho "Recursos" separado se a fileira já estiver agrupada visualmente; o lápis
  de edição de recursos segue o padrão da `m4-16` (no bloco, sem botão solto).

### 4. Cooperação como barra de escala sob a foto

- Remover o subcabeçalho "Cooperação", o ladrilho `app-stat` e a frase social do corpo da
  coluna; remover o lápis "Alterar Cooperação" (a edição vive no **mesmo** bloco de Identidade,
  campo "Cooperação" já existente com `app-step-input`, conforme a `m4-16`).
- Sob a foto, a barra de escala 0–10 (primitivo da decisão 1) com o **marcador** na posição de
  `dados().cooperacao`; gradiente de `var(--vida)` (hostil) a `var(--positive)` (amigável),
  passando por `var(--warning)`; **nenhum hex**. Fora do contrato 0–10 (`obterReferenciaCooperacao`
  lança `RangeError`) mantém o fallback atual ("Valor inválido") sem quebrar a tela.
- Rótulo curto da faixa ("Hostil", "Evasivo", "Desconfiado", "Neutro", "Colaborativo",
  "Amigável" — `shared/regras/npc/referencia.ts`, **não duplicar** a tabela no frontend) ao lado
  do número, e a frase social/de combate no `appTooltip`/`aria-valuetext` da barra. A cor do
  marcador **não** é a única informação (rótulo e número sempre presentes — contraste e
  daltonismo).
- Marcação de faixas (opcional, a confirmar com o autor): ticks discretos nos limites 1/2/4/7/10
  para que a posição se leia como categoria, não só como número.

### 5. Reduzir o resto da coluna

- Perfil (rótulo "NPC", nome, função) com a mesma escala tipográfica do card de Jogador/
  Criatura; chips de Categoria/Nível na faixa de rodapé, **uma linha** no desktop.
- Espaçamentos (`gap`, padding do cartão) nos degraus mínimos dos tokens, no nível do análogo;
  sem `gap` maior que o do card Identidade da Criatura.
- Mobile `360×800`: retrato centralizado e menor, ladrilhos na fileira de 3 sem quebrar, barra de
  Cooperação em largura cheia, nenhum overflow, alvos ≥ 44 px nos controles.
- Painel lateral aberto (`apertado`) não gera overflow (comportamento da `m4-10`/`m4-14`
  preservado).

### 6. Código

- `npc-visualizacao.component.html` já passa de 490 linhas: **extrair** o cartão Identidade (e,
  se fizer sentido, o bloco Recursos) para subcomponente(s) em `componentes/npc-visualizacao/`
  antes de acrescentar a barra; registrar no fecho a razão se não extrair.
- `npc-visualizacao.scss`: remover o que ficar morto (`npc__identidade` 230px, `npc__cooperacao`,
  `npc__nota` onde sair); copiar para o SCSS de qualquer subcomponente novo só o necessário
  (encapsulação por componente). Nenhum hex, fonte ou raio solto.

## Critérios de Aceite

- Tabela antes/depois do item 1 no fecho, com o alvo cumprido: Identidade do NPC **não mais alta
  que a de Criatura**; no desktop Identidade + Atributos cabem em `1920×1080` com o cabeçalho.
- Lado a lado com os cards Identidade de Jogador e de Criatura em `1920×1080` e `360×800`: mesma
  escala de foto, mesma densidade e hierarquia, mesmos selos e controles; **não parece HTML
  genérico**; sem overflow; foco, contraste e alvos de toque corretos.
- A barra de Cooperação mostra a posição certa para 0, 1, 2, 4, 7 e 10 (testes) e lê bem sem
  depender só da cor.
- Nenhuma mudança de conteúdo, regra, fórmula, permissão, DTO, endpoint, rolagem ou tempo real;
  Vida/Energia, "Morrendo"/"Confirmar socorro" e Civil sem Energia comportam-se como antes.
- Primitivo novo/ampliado (se escolhido) tem spec, entrada em `docs/design/DESIGN.md` e é usado
  por ao menos esta tela; nenhum estilo morto.

## Verificação exigida

- **Testes:** `npc-visualizacao.component.spec.ts` (e dos subcomponentes extraídos) ajustados,
  **sem enfraquecer** as asserções de comportamento. Novos: tamanho de recursos compacto,
  Cooperação como barra (valor, faixa, `aria-valuetext`, fallback inválido), ausência do
  ladrilho/subcabeçalho antigos, chips de Pool/Reserva presentes, Civil sem Energia. Spec do
  primitivo novo (valor, limites, ARIA). Spec focado a cada passo; suíte completa + lint no fecho.
- **Gate visual obrigatório** (`AGENTS.md`, skills `verify` e `design-fidelity`), em
  `1920×1080` **e** `360×800` (e `960×1080`, que exerce a zona antes do mobile): combatente e
  Civil; modo mestre e leitor; foto vazia e com imagem; Cooperação 0, 5 e 10; edição de
  Identidade (com o campo Cooperação); Vida baixa/Morrendo; painel de histórico aberto. O agente
  principal inspeciona pessoalmente e compara com os análogos.
- Dados de teste por soft delete ao fim.

## Fora de Escopo

- **Como** cada bloco edita (lápis, Salvar/Cancelar, foco, erro) — é a `m4-16`.
- Os atributos (`m4-18`), as abas Habilidades/Conduta/Sanidade, a coluna de ações.
- Regras de Cooperação, categorias e níveis (`shared/regras/npc`), textos da tabela de faixas.
- Rolagem de Defesa/Bloquear/Esquivar ou de qualquer atributo.
- Ficha de Criatura e de Jogador (são o análogo; **exceto** o registro do primitivo novo em
  `DESIGN.md`). Se a Criatura ou o Jogador quiserem a barra de escala/ladrilho fino depois,
  é `IDEAS.md`.

## Dependências

- `m4-16` em `done/` (padrão de edição por bloco que esta task consome).
- `m4-14` (`done`) — o casco e os selos do retrato atuais; `m4-10` (`done`) — o refinamento
  mobile que precisa sobreviver.
- `I-047` (`IDEAS.md`) é a ideia correlata do ladrilho de atributo; **tratada na `m4-18`**, não
  aqui.
- Fontes: `docs/design/DESIGN.md`, `docs/design/tema/_tokens.scss` (`--vida`, `--warning`,
  `--positive`), `shared/regras/npc/referencia.ts`.

## Riscos e Mitigação

- **Gradiente vermelho→verde e daltonismo:** vermelho/verde são justamente o par de pior
  contraste para deuteranopia. Mitigação já no desenho: rótulo e número sempre visíveis, marcador
  com forma (não só cor), ticks de faixa. Validar com o autor.
- **Tokens de verde/âmbar:** `--positive` e `--warning` são tokens de domínio com outro papel
  (ganho/aviso); usá-los num gradiente é aceitável, mas **não** criar token novo sem o autor.
- **Atalho tentador:** reduzir tudo com `font-size`/`padding` mágicos no SCSS local. Reduzir pelos
  degraus dos tokens e pelos tamanhos dos primitivos; o que não existir vira decisão do autor.
- **Retrato menor e `appFocoImagem`:** conferir o enquadramento salvo com imagem real
  (não só a foto vazia) — a `m4-14` não exercitou imagem real ao vivo.
