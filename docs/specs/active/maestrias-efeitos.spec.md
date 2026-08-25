# maestrias-efeitos.spec.md

> **Task avulsa (pergunta do autor, 2026-08-24/25), não é feature de milestone.** Nasce de uma
> auditoria pedida pelo autor sobre a Maestria de Vigor, que revelou uma lacuna sistêmica: nenhum
> dos 10 efeitos de Maestria está implementado, só a elegibilidade para adquiri-la. O autor aprovou
> em 2026-08-25 o recorte executável desta task: **somente Vigor**. Os demais grupos permanecem
> registrados como trabalho futuro e exigem sua própria spec/design antes de implementação.

## Objetivo

Fazer o efeito da **Maestria de Vigor** (`docs/core/sistema-v4.1.0.md`, linhas 274 e 281) ser
aplicado nas resistências calculadas da ficha de jogador e do Encontro. Maestria é exclusiva de
**ficha de jogador** (agente) — criatura e NPC não a possuem (`m4-ficha-criatura-npc.spec.md`,
linha 12-13).

## Estado atual (o que existe)

O único código relacionado a "maestria" é `shared/src/regras/agente/maestria.ts`
(`maestriaAtingivel`/`maestriaValida`), que só valida se o agente **pode adquirir** a maestria
(atributo com 6+ pontos) — usado em `backend/src/modules/ficha/ficha.service.ts:1179` para
rejeitar uma maestria inválida ao salvar a ficha. Nenhum dos 10 efeitos é lido em lugar nenhum do
motor de regras, backend ou frontend hoje.

## Escopo, por esforço

### Escopo desta task — mecânica-base já existe, falta só ler `ficha.maestria`

1. **Vigor** — adiciona Vigor como resistência base de **cada** Proteção. O bônus pertence à
   ficha: não é gravado no catálogo nem no item persistido, mas aparece no valor efetivo das
   Proteções já presentes no Inventário e no catálogo "Adicionar itens". Exemplo aprovado pelo
   autor: uma Proteção com `3 [Balístico]` para agente com Vigor 6 e Maestria de Vigor exibe
   `9 [Balístico]`.
   `montarResistencias` (`shared/src/regras/agente/resistencia.ts:107-126`) hoje soma
   `manual + equipamento + formacao` por tipo de dano; deve somar Vigor por Proteção equipada
   quando `ficha.maestria === 'vigor'`.
### Trabalho futuro — fora do escopo desta task

1. **Força** — soma o dano de Corpo em ataques físicos. `calcularDanoCorpo`
   (`shared/src/regras/agente/dano.ts:88-104`, exposto como `danoCorpoACorpo` em
   `derivados.ts:68`) já calcula o valor de referência mostrado na ficha, mas hoje só entra numa
   rolagem se o jogador digitar manualmente o atalho `"corpo"` (`expandirAtalhosDano`,
   `rolagem.ts:486-498`). Decisão de design necessária: qual é o gatilho de "ataque físico" para
   somar automaticamente — todo teste de Luta/Pontaria com arma corpo a corpo? Precisa da mesma
   definição usada por `calcularDanoCorpo` em si.

2. **Sentidos** — imune a ataques furtivos. `calcularDanoFurtivo`
   (`shared/src/regras/agente/dano.ts:111-117`) calcula a expressão de dano furtivo de quem
   **ataca**, mas não existe nenhum passo de "aplicar dano furtivo ao alvo" onde a imunidade
   poderia ser checada — `shared/src/regras/encontro/receber-dano.ts` só processa dano bruto já
   somado por tipo, sem diferenciar furtivo do resto. Precisa decidir, fora desta task, como/onde
   o dano furtivo passa a ser "recebido" distintamente antes de a maestria ter algo para negar.

3. **Luta** — ao tirar crítico em ataque físico, realiza um ataque simples adicional com a arma,
   que não pode ser reagido. Não existe motor de resolução de ataque/combate no código;
   `shared/src/regras/encontro/` só cobre ordem de turno, condições e recebimento de dano já
   calculado. `critico` em `rolagem.ts:595-598` só dobra dados de uma rolagem isolada, sem noção
   de "ataque adicional" nem de reação.
4. **Pontaria** — atirar sempre é considerado mirando. "Mirar/mirando" hoje só existe como texto
   descritivo de habilidades (`shared/src/regras/agente/habilidades-catalogo.dados.ts:30,61,83,
   143,213,297`). Não há estado "mirando" rastreado em nenhum DTO de combatente
   (`EncontroCombatenteResumoDto`/`CondicaoCombatenteDto`, `shared/src/dtos/encontro/
   encontro.dtos.ts:50-54`, são genéricos).
5. **Destreza** — concede a habilidade "Tomar Iniciativa" (utilizável todo turno) se o agente não a
   tiver; se já tiver, reduz o custo em 1 E. "Tomar Iniciativa" é hoje uma entrada estática do
   catálogo (`habilidades-catalogo.dados.ts:84`, custo fixo 5E) — nada concede habilidade
   automaticamente por maestria nem ajusta custo condicionalmente.
6. **Intelecto** — soma o segundo melhor dado do teste (máx. 5) ao melhor dado. O motor de rolagem
   (`rolarTermo`, `rolagem.ts:567-647`) só suporta manter maior/menor (`kh`/`kl`, descarta o
   resto) — precisaria de um operador novo no motor, não um simples gate por maestria.
7. **Medicina** — não falha mais em nenhum item medicinal. Não existe lógica de sucesso/falha de
   uso de item medicinal em `shared/src/regras` hoje; itens em `shared/src/regras/compras/
   catalogo.dados.ts:205-223` são definições estáticas de efeito, sem teste de resolução.
8. **Social** — 1x por missão, remove a última penalidade adquirida por um aliado nessa missão.
   Não existe conceito de "penalidade atrelada a um aliado, na ordem em que foi adquirida":
   `CondicaoCombatenteDto` é um marcador genérico por nome/duração, e
   `shared/src/regras/encontro/condicoes.ts` só expira condições por rodada — não há histórico
   ordenado nem contador "por missão" (conceito que também não existe hoje fora de encontro).
9. **Vontade** — aumenta em +1 a redução de sequelas por descanso longo (regra-fonte:
    `docs/core/sistema-v4.1.0.md:349`, "Vontade ÷ 3" por descanso longo confortável). Essa fórmula
    não existe em `shared/src/regras/descanso/descanso.ts:26-71` (só calcula faixas de recuperação
    de Vida/Energia). **Atenção**: `shared/src/regras/agente/sanidade.ts:16-24`
    (`sequelasRemovidasPorMissao = vontade`) é uma mecânica **diferente** (retorno à base por
    missão, doc linha 1391) — não confundir as duas ao implementar.

## Critérios de Aceite

Por maestria adquirida (`ficha.maestria` preenchido) e comparando contra a mesma ficha sem
maestria:

- **Vigor**: cada valor de resistência de uma Proteção sobe exatamente pelo valor de Vigor do
  agente (inclusive em notação composta de escudo); o total da ficha e do Encontro agrega esses
  valores efetivos.
- **Inventário**: a descrição de uma Proteção já possuída e o cartão da mesma Proteção no catálogo
  "Adicionar itens" mostram o valor efetivo com a Maestria, sem mutar o item persistido nem o
  catálogo canônico.
- Sem Maestria de Vigor, e com Maestria em outro atributo, as resistências não mudam em relação ao
  estado atual; sem Proteção equipada, a Maestria não cria resistência (sem regressão).
- `shared`/`backend`/`frontend`: suítes verdes, lint limpo e verificação ao vivo da ficha e do
  Encontro.

## Fora de Escopo

- Aplicar Maestria a criatura ou NPC — exclusiva de ficha de jogador (decisão já fechada em
  `m4-ficha-criatura-npc.spec.md`).
- Todo efeito de Maestria além de Vigor. Os mapeamentos e lacunas de Força, Sentidos, Luta,
  Pontaria, Destreza, Intelecto, Medicina, Social e Vontade permanecem documentados em "Trabalho
  futuro" e só avançam com specs próprias.
- Qualquer efeito de Maestria além dos 10 listados na seção "⬥ Maestrias" do sistema.
- Resolver, nesta spec, as decisões de design do Grupo B/C (onde/como dano furtivo é recebido por
  alvo, o que significa "ataque físico" para a Força, motor de resolução de ataque para a Luta,
  estado de "mirando" para a Pontaria, operador de segundo-melhor-dado para o Intelecto, resolução
  de item medicinal para a Medicina, histórico ordenado de penalidade por aliado para o Social) —
  cada uma precisa de spec própria antes de virar task executável.

## Dependências

- `shared/src/regras/agente/maestria.ts`, `resistencia.ts`, `dano.ts`, `rolagem.ts`,
  `habilidades-catalogo.dados.ts`, `sanidade.ts`.
- `shared/src/regras/encontro/receber-dano.ts`, `condicoes.ts`.
- `shared/src/regras/descanso/descanso.ts`.
- `shared/src/regras/compras/catalogo.dados.ts`.
- `shared/src/dtos/encontro/encontro.dtos.ts` (`CondicaoCombatenteDto`,
  `EncontroCombatenteResumoDto`).
- `backend/src/modules/ficha/ficha.service.ts:1179` (único ponto que já lê `maestria` hoje).
- `docs/core/sistema-v4.1.0.md:272-282` (regra-fonte), `:349` (redução de sequela por descanso
  longo), `:1391` (sequelas removidas por missão — mecânica vizinha, não confundir).
