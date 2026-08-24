# civil-guia-criacao.spec.md

> Spec avulsa, fora da fila de milestone. Endereça `PROBLEMS.md` `P-018` — o guia de
> criação de ficha (`frontend/src/app/modules/ficha/paginas/criar/criar.page.ts` +
> `.html`) trata a classe Civil com as mesmas fórmulas/tetos/rótulos de um agente
> convencional em pelo menos três passos, divergindo de `docs/core/sistema-v4.1.0.md`
> — "⬡ Jogando como um Civil". Esta spec **não implementa nada**; mapeia o escopo
> confirmado (com citação de fonte) e isola as decisões que só o dono pode tomar,
> por pedido explícito dele ao revisar o levantamento inicial de P-018.

## Objetivo

Fazer o guia de criação respeitar a mecânica própria de Civil nos três pontos abaixo,
escolhidos pelo dono como escopo desta spec (de uma lista maior de divergências
levantada nesta sessão — ver "Fora de Escopo" para o que ficou de fora):

1. Passo // Novo agente — Civil não tem Nível nem Prestígio, só Treinamento (0–5).
2. Passo // Atributos — Civil tem base e orçamento de criação próprios.
3. Passo // Equipamento inicial — Civil tem orçamento fixo e categorias vetadas.

## Estado atual (o que já está correto — não mexer)

O motor de regras (`shared/src/regras/agente`) já tem bastante ramificação de Civil
implementada e testada; a spec não deve tocar nestes pontos, só reaproveitá-los:

- `shared/src/regras/agente/limites.ts` — `obterLimitesClasse` já devolve
  `nivelMaximo: 5` e `atributoMaximo: 3` para `ClasseEnum.CIVIL` (linhas 13/18/32-46).
- `shared/src/regras/agente/saude.ts`, `defesa.ts`, `dano.ts`, `movimento.ts`,
  `inventario.ts`, `sanidade.ts`, `habilidades.ts`, `habilidades-catalogo.ts`,
  `habilidades-iniciais.ts` — todos já ramificam por `ClasseEnum.CIVIL` (Vida/Energia,
  Inventário = Força × 3, dano de corpo = Força − 1, deslocamento, ausência de Defesa
  convencional, lista fechada de Habilidades Civis etc.).
- `shared/src/regras/agente/progressao.ts` (`calcularProgressaoAcumulada`,
  `calcularBeneficiosNivel`) e `shared/src/regras/dados/progressao-civil.dados.ts`
  (`dadosCivil`, Treinamento 0–5) já existem e já são usados corretamente pelo passo
  // Habilidades do guia (`criar.page.ts:325-335`, branch `civil` em `vagasMelhoria`).
- O passo // Equipamento inicial já proíbe modificação/amplificador/fragmento pra
  **todo mundo**, não só Civil (`guia-equipamento-loja.component.ts:59-61`, doc:
  "não se pode modificar itens usando o dinheiro do kit inicial") — não precisa de
  trabalho extra aqui além do que os itens 3 abaixo pedem.

O problema é que o **guia** (`criar.page.ts`/`.html`, não o motor) nunca lê essas
regras específicas — ele computa Nível/Prestígio/atributos/orçamento de compra do
mesmo jeito pra qualquer classe e só depois passa o resultado pro motor, que aceita o
valor sem questionar.

## Divergências confirmadas (com fonte)

### 1 — Novo agente (Nível/Prestígio → Treinamento)

Doc, "⬥ Treinamentos" (`docs/core/sistema-v4.1.0.md:921-923`): *"Todo civíl inicia
**sem nenhum treinamento**."* — absoluto, não depende de média de campanha, motivo de
entrada ou patente (conceitos que a seção de Civil nunca menciona).

Código afetado:

- `criar.page.ts:239-244` — `nivelInicial()`/`prestigioInicial()` computam a mesma
  fórmula de agente (`calcularNovoAgente`/override manual) pra qualquer classe.
- `criar.page.ts:206-212` / `.html:319-320` — override manual (`sobrescreverProgressao`)
  aceita `nivelManual` 0–20 (`max="20"` no HTML) e `prestigioManual` sem teto — devia
  usar `obterLimitesClasse({ classe }).nivelMaximo` (5 pra Civil) e não ter
  campo de Prestígio nenhum pra Civil.
- `.html:278-322` — todo o bloco (motivo de entrada, médias de nível/prestígio,
  memorial de cálculo, override manual) mostra rótulos "Nível"/"Prestígio" mesmo
  quando `classeCalculada() === ClasseEnum.CIVIL`.
- `.html:665`, `.html:731-732` — resumo (`dt>Nível / Prestígio`, linhas "Nível
  inicial"/"Prestígio" no aside) — mesmo problema.
- `.html:745` — `{{ nivelInicial() + 10 }}` como "Defesa" no resumo lateral, sem
  checar classe. Doc, "⬥ Defesa e Reações" (`sistema-v4.1.0.md:861-862`): *"Diferente
  de um agente, você não possui defesa"* — o stat inteiro não deveria aparecer pra
  Civil.

### 2 — Atributos (base e orçamento de criação do Civil)

Doc, "⬡ Jogando como um Civil" (`sistema-v4.1.0.md:851-852`): *"você tem todos os
seus atributos com 1 ponto, exceto os seus atributos de Luta e Pontaria, que iniciam
em zero. Você também possui apenas dois pontos para distribuir na sua ficha, além de
que você também pode zerar outros dois atributos adicionais. Durante a montagem da
ficha, você não pode ultrapassar o limite de 2 pontos em um único atributo."*

Código afetado:

- `frontend/src/app/modules/ficha/ficha-padrao.ts:23-34` — `ATRIBUTOS_BASE_PADRAO`
  é fixo (todos os 10 atributos em 1) e usado pra qualquer classe ao inicializar
  `estado().atributos` (`criar.page.ts:211`).
- `shared/src/regras/agente/criacao.ts:35-45` — `calcularOrcamentoAtributos` fixa
  `pontosCriacao: 4` e `maximoNaCriacao: 3` (um atributo pode passar de 2) pra
  qualquer classe; Civil precisa de `pontosCriacao: 2` e nenhum atributo podendo
  passar de 2 na criação (sem a exceção do "um atributo até 3").
- `criacao.ts:47-74` (`validarDistribuicaoAtributos`) — a regra "apenas um atributo
  pode ultrapassar 2 na criação" (linha 66-68) é a exceção de agente; pra Civil o
  teto de 2 deveria valer pra todos, sem exceção.
- `maximoFinal` (`orcamento().maximoFinal`, via `obterLimitesClasse`) já sai certo
  (3) — só o orçamento/base de criação está errado, não o teto final.

### 3 — Equipamento inicial (orçamento fixo + categorias vetadas)

Doc, "⬥ Equipamento Inicial" (`sistema-v4.1.0.md:865-866`): *"o seu equipamento
inicial consta como 1000 $, no qual você não pode aplicar nenhuma modificação em
nenhum dos equipamentos, ou adquirir qualquer tipo de Proteção e/ou Explosivos."*

Código afetado:

- `shared/src/regras/compras/compras.dados.ts:37-40` — `KIT_INICIAL_ORCAMENTO_MAXIMO`
  (2500) e `KIT_INICIAL_PESO_MAXIMO` (5) são constantes fixas, sem variação por
  classe; usadas direto em `criar.page.ts:412-420` (`kitOrcamentoMaximo`,
  `kitPesoMaximo`, `kitValido`, medidores de progresso).
- `guia-equipamento-loja.component.ts` — não filtra categorias; Civil precisa que
  `ItemCategoriaEnum.PROTECOES` e `ItemCategoriaEnum.EXPLOSIVOS` (definidas em
  `shared/src/enums/item-categoria.enum.ts`) fiquem fora do catálogo mostrado (o
  componente já é "burro"/input-output, então o filtro por classe deve vir de fora,
  como um novo `input()` — mesmo padrão dos demais props do componente).

## Decisões que faltam antes de implementar

Estas perguntas não têm resposta unívoca no documento-fonte e precisam de decisão
do dono antes de qualquer código — registrar a resposta escolhida no fecho da spec
quando ela sair do backlog:

1. **"Pode zerar outros dois atributos adicionais" (item 2) — o que isso concede?**
   O documento não diz se zerar um atributo (além de Luta/Pontaria) devolve um ponto
   extra ao orçamento (como um point-buy: zerar = +1 ponto pra gastar em outro lugar)
   ou se é só uma permissão isolada de ficar com um atributo abaixo do piso de 1, sem
   nenhum ganho de orçamento. Não existe mais no repositório a calculadora antiga
   (`contratados-calculadora/src/script.js`, citada como referência por
   `progressao-civil.dados.ts`) pra checar como ela resolvia isso.
2. **Override manual de Treinamento no passo // Novo agente.** O doc é absoluto
   ("todo civil inicia sem nenhum treinamento"), mas o guia já permite ao mestre
   sobrescrever Nível/Prestígio de um agente por conveniência narrativa (ficha
   avulsa, importar personagem com histórico). Civil deveria ter o mesmo escape
   (campo manual 0–5), ou o passo trava sempre em Treinamento 0 sem exceção?
3. **Passo // Recursos (dinheiro rolado 1000 + 4D4×250) para Civil.** Fora do escopo
   explícito desta spec (o dono escolheu só o passo // Equipamento inicial), mas os
   dois passos compartilham o conceito de "dinheiro do agente" na Revisão
   (`totalDinheiro()`, linha 670 do HTML). Confirmar se Civil também rola esse
   dinheiro normalmente (bônus monetário por Prestígio já zera sozinho, já que
   Civil não tem Prestígio) ou se esse passo também precisa de tratamento — decidir
   ao especificar o corte de implementação, não nesta spec.
4. **Peso do kit inicial (5, doc "Informações Adicionais" genérico) se aplica a
   Civil?** A seção de Civil só menciona o teto de dinheiro ($1000), não um teto de
   peso — mas Civil também tem um conceito de capacidade diferente (Inventário =
   Força × 3, já implementado em `inventario.ts`). Decidir se o teto de peso de
   criação (5) continua valendo pra Civil ou se essa restrição nem se aplica.

## Entregáveis (quando a spec for promovida a `active/`)

Numerados por item; cada um deve poder ser um corte revisável separado
(`AGENTS.md` — "corte revisável", commits por área):

**Item 1 — Novo agente:**
1. `criar.page.ts`: `nivelInicial()`/`prestigioInicial()` retornam Treinamento
   0–5 clampado (via `obterLimitesClasse`) e um valor de Prestígio sem sentido pra
   Civil (decisão #2 acima define se existe override manual ou é sempre 0).
2. `.html`: bloco // Novo agente ramifica por `classeCalculada() === ClasseEnum.CIVIL`
   — rótulo "Treinamento" no lugar de "Nível", sem campo/rótulo de "Prestígio",
   sem motivo de entrada/memorial de médias (Civil não herda da campanha).
3. Resumo lateral e Revisão (`.html:665`, `731-732`, `745`): mesma ramificação —
   "Treinamento" no lugar de "Nível / Prestígio", stat "Defesa" oculto pra Civil.

**Item 2 — Atributos:**
4. Base de atributos de criação passa a depender da classe (Luta/Pontaria = 0 pra
   Civil, resto 1) — ponto de entrada a decidir na implementação (`ficha-padrao.ts`
   vira função de `classe`, ou o guia sobrescreve ao entrar no passo // Classe).
5. `shared/src/regras/agente/criacao.ts`: `calcularOrcamentoAtributos` e
   `validarDistribuicaoAtributos` ganham branch de Civil (`pontosCriacao: 2`, sem a
   exceção "um atributo até 3") — com teste novo em `criacao.spec.ts`.
6. Implementar a decisão #1 (zerar 2 atributos adicionais) do jeito escolhido pelo
   dono, com teste cobrindo o caso.

**Item 3 — Equipamento inicial:**
7. `compras.dados.ts` ou `criar.page.ts`: orçamento do kit vira 1000 pra Civil
   (2500 pras demais classes) — decisão #4 resolve se o peso (5) também muda.
8. `guia-equipamento-loja.component.ts`: novo `input()` de categorias vetadas (ou
   equivalente), usado pelo passo pra ocultar `PROTECOES`/`EXPLOSIVOS` do catálogo
   quando a ficha é Civil.

## Critérios de Aceite (da implementação futura)

- As 4 decisões abertas estão registradas com a resposta escolhida (nesta spec ou no
  fecho da task, referenciando o dono).
- Criar uma ficha Civil pelo guia, do zero: Treinamento sempre 0 (ou 0–5 conforme
  decisão #2), sem Prestígio/Defesa visível, atributos partem de Luta/Pontaria = 0 e
  só aceitam 2 pontos de orçamento (mais o que a decisão #1 conceder), kit trava em
  $1000 e não mostra Proteções/Explosivos no catálogo.
- Criar uma ficha de agente convencional (Combatente/Especialista/Suporte/
  Experimento) continua idêntico a hoje — nenhuma regressão nos passos tocados.
- `npm run lint`/`npm run test` em `shared` e `frontend` verdes; testes novos cobrem
  os branches de Civil em `criacao.ts` (orçamento) pelo menos.
- Gate visual obrigatório (skill `verify`, `1920×1080` e `360×800`): guia de criação
  completo com uma ficha Civil, passo a passo, comparado à versão atual do guia para
  agente (mesma densidade/hierarquia, nenhum HTML genérico, nenhum overflow).
- `PROBLEMS.md` `P-018` sai de Ativos; `HISTORY.md` ganha o registro da
  implementação.

## Fora de Escopo

- Qualquer regra de Civil **já implementada e correta** no motor (ver "Estado atual"
  acima) — não retocar.
- Passo // Recursos (dinheiro rolado) — decisão #3 registra a pendência, mas a
  implementação em si fica fora desta spec (o dono não selecionou esse passo no
  escopo).
- Progressão de Treinamento **pós-criação** (o mestre avançando o Treinamento de uma
  ficha Civil já existente, fora do guia) — módulo de ficha/painel do mestre, não o
  guia de criação.
- Habilidades de Civil (catálogo, vagas) — já corretas (`vagasMelhoria` em
  `criar.page.ts:325-335`), sem mudança.
- Qualquer divergência de Civil fora dos três passos escolhidos pelo dono, mesmo que
  encontrada durante a implementação — registrar como novo problema em
  `PROBLEMS.md` em vez de expandir esta spec no meio da task.

## Dependências

- Nenhuma spec ativa depende deste corte. Recomendado implementar antes de qualquer
  outra task grande que toque `criar.page.ts`/`.html` ou `criacao.ts` (arquivos
  centrais, alto risco de conflito de diff).
- `docs/core/sistema-v4.1.0.md` — "⬡ Jogando como um Civil" (linhas 847-931) é a
  fonte de verdade para qualquer detalhe não coberto aqui; em conflito, o documento
  vence (`AGENTS.md`, proibição #27 citada nos comentários do próprio `shared/regras`).

## Riscos e Mitigação

- **Decisões abertas erradas viram regra de jogo incorreta silenciosa** (ex.: dar
  ponto de orçamento errado ao zerar atributo). Mitigado por travar a implementação
  até o dono responder as 4 perguntas — nenhuma delas tem leitura única e segura do
  documento.
- **`criacao.ts` é consumido por outros lugares além do guia** (ex.: qualquer tela
  que valide distribuição de atributos de uma ficha existente) — ramificar por
  classe ali é mudança de contrato compartilhado (`shared/regras`), não só do guia.
  Conferir todos os consumidores de `calcularOrcamentoAtributos`/
  `validarDistribuicaoAtributos` antes de mudar a assinatura/comportamento.
- **Escopo já cresceu uma vez** (P-018 nasceu só com o exemplo de Nível/Prestígio e
  virou 3 passos ao investigar) — manter a trava de "Fora de Escopo" durante a
  implementação para não virar uma quarta expansão informal.
