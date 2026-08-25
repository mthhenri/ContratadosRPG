# maestrias-efeitos.spec.md

> **Task avulsa (pergunta do autor, 2026-08-24/25), não é feature de milestone.** Nasce de uma
> auditoria pedida pelo autor sobre a Maestria de Vigor, que revelou uma lacuna sistêmica: nenhum
> dos 10 efeitos de Maestria está implementado, só a elegibilidade para adquiri-la. **Escopo grande
> e heterogêneo** — o Grupo C abaixo provavelmente exige um design próprio por item antes de virar
> task executável. Quebrar em tasks numeradas (`mN-NN` ou avulsas, a critério do autor) na revisão
> de backlog, começando pelo Grupo A.

## Objetivo

Fazer os 10 efeitos de **Maestria de atributo** (`docs/core/sistema-v4.1.0.md`, seção
"⬥ Maestrias", linhas 272-282) serem de fato aplicados nos cálculos e fluxos correspondentes.
Maestria é exclusiva de **ficha de jogador** (agente) — criatura e NPC não a possuem
(`m4-ficha-criatura-npc.spec.md`, linha 12-13).

## Estado atual (o que existe)

O único código relacionado a "maestria" é `shared/src/regras/agente/maestria.ts`
(`maestriaAtingivel`/`maestriaValida`), que só valida se o agente **pode adquirir** a maestria
(atributo com 6+ pontos) — usado em `backend/src/modules/ficha/ficha.service.ts:1179` para
rejeitar uma maestria inválida ao salvar a ficha. Nenhum dos 10 efeitos é lido em lugar nenhum do
motor de regras, backend ou frontend hoje.

## Escopo, por esforço

### Grupo A — mecânica-base já existe, falta só ler `ficha.maestria` (baixo esforço, pronto pra virar task)

1. **Vigor** — adiciona Vigor como resistência base de **todas** as proteções.
   `montarResistencias` (`shared/src/regras/agente/resistencia.ts:107-126`) hoje soma
   `manual + equipamento + formacao` por tipo de dano; falta somar Vigor quando
   `ficha.maestria === 'vigor'`.
2. **Força** — soma o dano de Corpo em ataques físicos. `calcularDanoCorpo`
   (`shared/src/regras/agente/dano.ts:88-104`, exposto como `danoCorpoACorpo` em
   `derivados.ts:68`) já calcula o valor de referência mostrado na ficha, mas hoje só entra numa
   rolagem se o jogador digitar manualmente o atalho `"corpo"` (`expandirAtalhosDano`,
   `rolagem.ts:486-498`). Decisão de design necessária: qual é o gatilho de "ataque físico" para
   somar automaticamente — todo teste de Luta/Pontaria com arma corpo a corpo? Precisa da mesma
   definição usada por `calcularDanoCorpo` em si.

### Grupo B — mecânica-base parcial (esforço médio, precisa de uma decisão de design antes de planejar)

3. **Sentidos** — imune a ataques furtivos. `calcularDanoFurtivo`
   (`shared/src/regras/agente/dano.ts:111-117`) calcula a expressão de dano furtivo de quem
   **ataca**, mas não existe nenhum passo de "aplicar dano furtivo ao alvo" onde a imunidade
   poderia ser checada — `shared/src/regras/encontro/receber-dano.ts` só processa dano bruto já
   somado por tipo, sem diferenciar furtivo do resto. Precisa decidir, fora desta task, como/onde
   o dano furtivo passa a ser "recebido" distintamente antes de a maestria ter algo para negar.

### Grupo C — mecânica-base não existe (alto esforço; cada item abaixo provavelmente é uma task própria, com sua própria spec/design antes de implementar)

4. **Luta** — ao tirar crítico em ataque físico, realiza um ataque simples adicional com a arma,
   que não pode ser reagido. Não existe motor de resolução de ataque/combate no código;
   `shared/src/regras/encontro/` só cobre ordem de turno, condições e recebimento de dano já
   calculado. `critico` em `rolagem.ts:595-598` só dobra dados de uma rolagem isolada, sem noção
   de "ataque adicional" nem de reação.
5. **Pontaria** — atirar sempre é considerado mirando. "Mirar/mirando" hoje só existe como texto
   descritivo de habilidades (`shared/src/regras/agente/habilidades-catalogo.dados.ts:30,61,83,
   143,213,297`). Não há estado "mirando" rastreado em nenhum DTO de combatente
   (`EncontroCombatenteResumoDto`/`CondicaoCombatenteDto`, `shared/src/dtos/encontro/
   encontro.dtos.ts:50-54`, são genéricos).
6. **Destreza** — concede a habilidade "Tomar Iniciativa" (utilizável todo turno) se o agente não a
   tiver; se já tiver, reduz o custo em 1 E. "Tomar Iniciativa" é hoje uma entrada estática do
   catálogo (`habilidades-catalogo.dados.ts:84`, custo fixo 5E) — nada concede habilidade
   automaticamente por maestria nem ajusta custo condicionalmente.
7. **Intelecto** — soma o segundo melhor dado do teste (máx. 5) ao melhor dado. O motor de rolagem
   (`rolarTermo`, `rolagem.ts:567-647`) só suporta manter maior/menor (`kh`/`kl`, descarta o
   resto) — precisaria de um operador novo no motor, não um simples gate por maestria.
8. **Medicina** — não falha mais em nenhum item medicinal. Não existe lógica de sucesso/falha de
   uso de item medicinal em `shared/src/regras` hoje; itens em `shared/src/regras/compras/
   catalogo.dados.ts:205-223` são definições estáticas de efeito, sem teste de resolução.
9. **Social** — 1x por missão, remove a última penalidade adquirida por um aliado nessa missão.
   Não existe conceito de "penalidade atrelada a um aliado, na ordem em que foi adquirida":
   `CondicaoCombatenteDto` é um marcador genérico por nome/duração, e
   `shared/src/regras/encontro/condicoes.ts` só expira condições por rodada — não há histórico
   ordenado nem contador "por missão" (conceito que também não existe hoje fora de encontro).
10. **Vontade** — aumenta em +1 a redução de sequelas por descanso longo (regra-fonte:
    `docs/core/sistema-v4.1.0.md:349`, "Vontade ÷ 3" por descanso longo confortável). Essa fórmula
    não existe em `shared/src/regras/descanso/descanso.ts:26-71` (só calcula faixas de recuperação
    de Vida/Energia). **Atenção**: `shared/src/regras/agente/sanidade.ts:16-24`
    (`sequelasRemovidasPorMissao = vontade`) é uma mecânica **diferente** (retorno à base por
    missão, doc linha 1391) — não confundir as duas ao implementar.

## Critérios de Aceite

Por maestria adquirida (`ficha.maestria` preenchido) e comparando contra a mesma ficha sem
maestria:

- **Vigor**: a resistência calculada de cada tipo de proteção sobe exatamente pelo valor de Vigor
  do agente.
- **Força**: o dano de um ataque físico do agente soma o dano de Corpo automaticamente, sem o
  jogador digitar o atalho `"corpo"` à mão.
- **Sentidos**: um ataque furtivo contra o agente não aplica o adicional furtivo (resultado igual
  a um ataque não-furtivo do mesmo atacante).
- **Luta**: um crítico em ataque físico do agente dispara um ataque simples adicional com a mesma
  arma, sem chance de reação do alvo.
- **Pontaria**: qualquer ataque à distância do agente é tratado como mirando, mesmo sem a ação
  explícita de mirar.
- **Destreza**: o agente tem acesso a "Tomar Iniciativa" em todo turno; se já a possuía antes da
  maestria, o custo em Energia cai em 1.
- **Intelecto**: em um teste, o segundo melhor dado (até 5) some ao melhor antes de comparar com a
  DT.
- **Medicina**: um uso de item medicinal do agente nunca resulta em falha.
- **Social**: uma vez por missão, o agente pode remover a penalidade mais recente de um aliado
  (e só a mais recente — a ordem de aquisição importa).
- **Vontade**: a redução de sequelas por descanso longo do agente é a fórmula padrão +1.
- Sem a maestria correspondente, nenhum dos comportamentos acima muda em relação ao estado atual
  (sem regressão).
- `shared`/`backend`/`frontend`: suítes verdes, lint limpo, por task entregue.

## Fora de Escopo

- Aplicar Maestria a criatura ou NPC — exclusiva de ficha de jogador (decisão já fechada em
  `m4-ficha-criatura-npc.spec.md`).
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
