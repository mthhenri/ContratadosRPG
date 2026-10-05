# m4-17-ficha-npc-coluna-identidade-compacta.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, continuação da revisão do NPC.
> Pedido direto do autor (2026-10-05): *"a gente tem que reduzir um pouco mais essa visão,
> porque ela está grande demais. Por exemplo, a foto do NPC está muito grande… tudo está muito
> grande nessa primeira coluna. Reduzir o tamanho da foto, pegar o defesa, bloqueio e esquiva e
> também reduzir eles, deixar eles um pouquinho mais finos. Assim como a cooperação, a
> cooperação poderia ser uma barra abaixo da foto, talvez como uma barrinha que vai de
> vermelho até verde, e mostra onde está a cooperação dele."*
>
> Segunda das specs desta frente: `m4-16` (usabilidade da edição, **deve estar em `done/`
> antes**) → **`m4-17` (esta)** → `m4-18` (`m4-18-ficha-npc-atributos-como-jogador.spec.md`)
> → `m4-19` (`m4-19-npc-testes-de-atributo-regra-e-rolagem.spec.md`).
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

## Decisões do autor (2026-10-05 — já tomadas, não perguntar de novo)

1. **Barra de Cooperação = novo primitivo de "barra de escala", editável ou não.** Palavras do
   autor: *"uma barra que pode ser editável ou não… um slider… que exibe, podendo ter uma cor
   de início, uma cor de fim, que faz um degradê no meio"*. Fica decidido criar o primitivo em
   `shared/ui/barra-escala/` (`app-barra-escala`), genérico, **sem nada de NPC dentro**:
   - entradas: `valor`, `minimo`, `maximo`, `passo` (default 1), `editavel` (default `false`),
     `corInicio` e `corFim` (cores do degradê; o consumidor passa tokens — ex.:
     `var(--vida)` e `var(--positive)`), `corMeio` opcional (ex.: `var(--warning)`; sem ela, o
     degradê vai direto de início a fim), `rotulo`, `textoValor` (texto curto exibido ao lado do
     número, ex.: "Neutro") e `descricao` (vai ao `appTooltip` e ao `aria-valuetext`);
   - saída: `valorConfirmado` (number). Em modo `editavel`, o controle é um slider acessível
     (`<input type="range">` estilizado **dentro do primitivo** — o primitivo é dono do elemento
     nativo; o consumidor nunca usa `<input type=range>` solto), teclado completo (setas,
     Home/End, PageUp/PageDown), **confirma ao soltar o ponteiro ou ao Enter** (não a cada
     movimento) e **Esc restaura** o valor anterior; enquanto o consumidor sinaliza ocupado
     (`desabilitado`), não responde;
   - em modo somente leitura é `role="meter"` com `aria-valuemin/max/now` e `aria-valuetext`;
     em edição é o próprio `role="slider"` nativo;
   - marcador na posição do valor com **forma** (não só cor) e número sempre visível; ticks
     opcionais (`marcadores: number[]`) para os limites de faixa;
   - spec próprio (valor, limites, arredondamento ao passo, teclado, confirmar/Esc, ARIA, cores) e
     **entrada no `docs/design/DESIGN.md`**.
   Não é variante de `app-barra-recurso` nem bloco local. O autor quer que seja reutilizável
   (outras escalas futuras); **não** acoplar às cores de Cooperação.
2. **Ladrilhos de Defesa/Bloquear/Esquivar mais finos = novo tamanho do `Stat`.** Decidido:
   acrescentar `'fino'` a `StatTamanho` (`shared/ui/stat/`) — menos padding vertical,
   rótulo e valor colados — com spec do primitivo ampliado e registro em `DESIGN.md`. Sem
   sobrescrever o padding do `Stat` por CSS local e sem trocar o ladrilho por linha de texto.

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
- Defesa/Bloquear/Esquivar: o ladrilho `Stat` `tamanho="fino"` (decisão 2 do autor), em uma só fileira de 3,
  **sem** o subcabeçalho "Recursos" separado se a fileira já estiver agrupada visualmente; o lápis
  de edição de recursos segue o padrão da `m4-16` (no bloco, sem botão solto).

### 4. Cooperação como barra de escala sob a foto

- Remover o subcabeçalho "Cooperação", o ladrilho `app-stat`, a frase social do corpo da coluna
  e o lápis "Alterar Cooperação". O campo "Cooperação" com `app-step-input` **sai do bloco de
  edição de Identidade**: a Cooperação passa a ser editada **na própria barra** (valor avulso,
  mecanismo da `m4-16`): `[editavel]="gerenciavel()"`, `valorConfirmado` persiste **só** a
  Cooperação (merge em `dados.cooperacao` + `alterarFichaNpc`, com a validação 0–10 de
  `shared/regras/npc`), `desabilitado` enquanto `edicao.salvando()` ou outra edição aberta.
  Modo leitor: a mesma barra, não editável.
- Sob a foto, `app-barra-escala` (primitivo da decisão 1 do autor) com `minimo=0`, `maximo=10`,
  `valor=dados().cooperacao`, `corInicio="var(--vida)"` (hostil), `corMeio="var(--warning)"` e
  `corFim="var(--positive)"` (amigável); **nenhum hex**. Fora do contrato 0–10 (`obterReferenciaCooperacao`
  lança `RangeError`) mantém o fallback atual ("Valor inválido") sem quebrar a tela.
- Rótulo curto da faixa ("Hostil", "Evasivo", "Desconfiado", "Neutro", "Colaborativo",
  "Amigável" — `shared/regras/npc/referencia.ts`, **não duplicar** a tabela no frontend) ao lado
  do número, e a frase social/de combate no `appTooltip`/`aria-valuetext` da barra. A cor do
  marcador **não** é a única informação (rótulo e número sempre presentes — contraste e
  daltonismo).
- Marcadores de faixa: `marcadores` nos limites 1/2/4/7/10 (as faixas de
  `obterReferenciaCooperacao`) para que a posição se leia como categoria, não só como número;
  se ficar poluído no mobile, esconder abaixo do breakpoint e registrar.

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
- A barra de Cooperação mostra a posição certa para 0, 1, 2, 4, 7 e 10 (testes), lê bem sem
  depender só da cor, e (mestre) edita por arrasto/teclado confirmando ao soltar/Enter e
  persistindo só a Cooperação; no modo leitor não edita.
- Nenhuma mudança de conteúdo, regra, fórmula, permissão, DTO, endpoint, rolagem ou tempo real;
  Vida/Energia, "Morrendo"/"Confirmar socorro" e Civil sem Energia comportam-se como antes.
- `app-barra-escala` (novo) e `Stat` com `tamanho="fino"` têm spec próprio, entrada em
  `docs/design/DESIGN.md` e são usados por esta tela; nenhum estilo morto.

## Verificação exigida

- **Testes:** `npc-visualizacao.component.spec.ts` (e dos subcomponentes extraídos) ajustados,
  **sem enfraquecer** as asserções de comportamento. Novos: tamanho de recursos compacto,
  Cooperação como barra (valor, faixa, `aria-valuetext`, fallback inválido), ausência do
  ladrilho/subcabeçalho antigos, chips de Pool/Reserva presentes, Civil sem Energia. Spec do
  `app-barra-escala` (valor, limites, passo, teclado, confirmar/Esc, ARIA, cores) e do tamanho
  `fino` do `Stat`. Spec focado a cada passo; suíte completa + lint no fecho.
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

- **Slider salvando a cada movimento:** o primitivo só emite `valorConfirmado` ao soltar/Enter;
  testar arrasto longo e teclado com repetição para não disparar vários PUT.
- **Gradiente vermelho→verde e daltonismo:** vermelho/verde são justamente o par de pior
  contraste para deuteranopia. Mitigação já no desenho: rótulo e número sempre visíveis, marcador
  com forma (não só cor), ticks de faixa. Validar com o autor.
- **Tokens de verde/âmbar:** `--positive` e `--warning` são tokens de domínio com outro papel
  (ganho/aviso); usá-los num gradiente é aceitável, mas **não** criar token novo sem o autor.
- **Atalho tentador:** reduzir tudo com `font-size`/`padding` mágicos no SCSS local. Reduzir pelos
  degraus dos tokens e pelos tamanhos dos primitivos; o que não existir vira decisão do autor.
- **Retrato menor e `appFocoImagem`:** conferir o enquadramento salvo com imagem real
  (não só a foto vazia) — a `m4-14` não exercitou imagem real ao vivo.
