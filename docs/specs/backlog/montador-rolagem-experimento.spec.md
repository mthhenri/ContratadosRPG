# montador-rolagem-experimento.spec.md

> **Guarda-chuva** do experimento do montador de rolagem — `I-041` de `docs/context/IDEAS.md`
> (promovida em 2026-10-02). Implementar somente pelas tasks `montador-exp-01`…`montador-exp-04` abaixo; cada
> uma ganha o próprio arquivo de spec em `docs/specs/backlog/` quando for aberta (ver "Quebra em tasks").
> **O fechamento do experimento — escolher o montador final, apagar o resto, liberar para todos — é do autor
> e tem spec própria, fora deste arquivo.**

## Objetivo

Deixar **exclusivamente para testers** (`TESTER`/`ADMIN`) um montador de rolagem mais enxuto, em três versões
para comparar com o montador de hoje, de modo que o autor e os testers escolham qual ganha. **Não ficam quatro
montadores**: o experimento existe para terminar com **um**, que o autor especificará depois, possivelmente com
preferência de usuário (por exemplo "completo" ou "essencial") gravada.

## Decisões de produto fechadas (autor, 2026-10-02)

1. **Tudo do montador é exclusivo de tester até haver um montador final.** Hoje o gatilho já é restrito
   (`restringirMontadorATester="true"` em `ficha-visualizacao`, `criatura-visualizacao` e
   `ficha-campanha-card`; `podeUsarMontador` em `rolagem-rapida.component.ts`). O experimento mantém e
   centraliza essa restrição.
2. **Quatro opções num seletor, só para tester**, nesta ordem e com estes nomes:
   - **Atual** — o `MontadorRolagem` de hoje, **intocado**, só como linha de base de comparação. O autor
     considera "basicamente impossível" que ele seja mantido. **É a opção padrão** de quem nunca escolheu.
   - **Essencial** — a E3.3 do canvas (divulgação progressiva).
   - **Completo** — a E3.1 do canvas (controles de base à vista).
   - **Blocos** — a E3.2 do canvas (formulário por blocos, sem bandeja).
3. **Avaliam o autor/admin e os jogadores de confiança marcados como `TESTER`.** Não há telemetria no projeto:
   a avaliação é qualitativa (ver "Critérios de Aceite").
4. **Sinal por termo é requisito do núcleo** (dado e atributo podem ser subtraídos), nas três versões novas.
5. **Campo de expressão (opção B)**: um campo no "+ Adicionar", com leitura ao vivo do resultado
   (`(FOR+VIG)*2 = 14 dados`), para montar a conta de quantidade de dados que a spec
   `rolagem-expressao-quantidade-dados.spec.md` passa a aceitar. Os botões Soma/Média do teste ficam.
6. **O texto da fórmula é a única fonte de verdade.** O montador lê e escreve o mesmo texto da barra de
   "Rolagem rápida" (`formula = model<string>` hoje); o estado da tela é derivado dele. Fórmula que a versão
   escolhida não sabe montar aparece como **avançada** (texto editável), nunca é alterada em silêncio.

7. **Gate centralizado em um ponto**, com padrão restrito (autor, 2026-10-02): some o input
   `restringirMontadorATester` (hoje o padrão `false` significa "liberado" e um consumidor novo esqueceria a
   restrição). Liberar depois é remover a verificação desse único ponto.
8. **Preferência de versão só em `localStorage`, por ora** (autor, 2026-10-02): por dispositivo, com padrão `Atual`
   quando vazio ou quando o armazenamento falhar. Nenhuma migration; só vai para o perfil/banco se o montador final
   mantiver a preferência (spec do autor, depois).
9. **Uma pasta própria** (`frontend/src/app/shared/montador-rolagem-experimental/`) para as três versões novas,
   de modo que apagar as perdedoras seja apagar código, não desfazer enxertos (organização, sem decisão de produto).

10. **O campo de expressão serve aos dois usos do motor** (autor, 2026-10-02): a **quantidade de dados** de um dado
    escolhido (`((FOR+VIG)*2)d4`) e o **bônus fixo** (`(FOR+VIG)*2`), com leitura ao vivo do valor. O autor
    pediu o bônus fixo no motor e confirmou que a mesma tela o cobre.

## Referência visual e comportamental

- Canvas "Montador de rolagem" (Artifact do autor, privado): E3.1, E3.2 e E3.3, desktop `1920×1080` e `360×800`,
  todas navegáveis. Histórico, achados, números de controles e resultados das baterias em `IDEAS.md` `I-041` e
  `HISTORY.md` (2026-10-02); POC anterior em `docs/design/propostas/montador-rolagem-simplificado.html`.
- Corpus de aceite no repositório: `docs/design/propostas/montador-rolagem-formulas.json` (10 fórmulas dos
  jogadores + 78 de bateria). Medido no mockup com o motor real como juiz: E3.1 e E3.3 acertam 54 de 78 (3
  divergem), E3.2 acerta 58 (nenhuma diverge); nas dez dos jogadores, E3.1/E3.3 9 de 10 e E3.2 10 de 10.
- **O que o mockup limita e o produto não deve herdar:** números por passo de −10 a +60 (no produto, campo
  numérico digitável com `app-step-input`/`campo`); "Limpar" no lugar de desfazer (no produto, **Desfazer**
  real); uma ficha por face e tipo herdado da posição na E3.1/E3.3 (no produto, **lista ordenada de termos**,
  cada um com o próprio sinal e tipo — é o que elimina as três divergências); quantidade de repetição até ×5 e
  de dados até 8 (o motor vai a 20 e 100).
- **Fora dos botões por decisão do I-041** (continuam só no texto/Guia, como fórmula "avançada"): `kl2`/`kh` com N
  maior que 1, explosão/implosão com limiar (`!5`, `?<=2`), dado por atributo fora do teste (`FORd6`) e
  `1d100`. O que o uso real trouxe e **entra como controle de base**: dados a mais/menos no teste, repetir ×N,
  margem de crítico no teste e dano composto (`[F-Q]`).

## Quebra em tasks

Ordem obrigatória: `rolagem-expressao-quantidade-dados` → 01 → 02 → 03 e 04 (independentes entre si).

### `montador-exp-01` — Tokenização da fórmula em `shared` (sem UI)

**Entrega:** em `shared/src/regras/rolagem/`, funções puras que leem o texto da fórmula como **lista ordenada de
peças** (dado, fonte escalar, número, conta de quantidade, conta de bônus fixo, atalho `CORPO`/`FURTIVO`, cada uma com sinal, tag de
tipo simples ou composto, operadores por pool e repetição `#N`) e a recompõem em texto. Aprovada pelo autor em
2026-10-02: o motor passa a devolver a fórmula em peças **sem mudar nenhum resultado de rolagem**.
**Aceite:** para toda fórmula do corpus **válida no motor**, `montar(tokenizar(texto))` é interpretada **igual** ao
original por `interpretarFormula` (o texto pode vir normalizado: `d20` → `1d20`); a que não tem representação
devolve `null` (a UI mostra "avançada") — **nunca** uma peça trocada em silêncio; os testes existentes do motor
não mudam; `npm run test --workspace=shared` verde. Skill `regras-do-jogo` (motor puro) e `dto-conventions`
(nomes dos DTOs de peça).

### `montador-exp-02` — Núcleo, seletor e gate

**Entrega:** (a) o gate centralizado e restrito (item "Propostas"), removendo o input dos três consumidores;
(b) o seletor Atual/Essencial/Completo/Blocos, visível só a quem tem o montador, **fora** das janelas (o Atual não
é modificado); (c) preferência por dispositivo com `try/catch` e padrão `Atual`; (d) o modelo de estado das
versões novas em `montador-rolagem-experimental/`: sinais derivados das peças da task 01, sincronização nos dois
sentidos com o texto da barra, **Desfazer**, estados "avançada", "inválida" e "resultado da rolagem" (o painel
**não fecha** ao rolar), e atalhos `CORPO`/`FURTIVO` só quando a ficha tem valor para eles.
**Aceite:** testes de componente/util cobrindo gate (tester vê, jogador comum não, ADMIN vê), seletor, preferência
(armazenamento indisponível → `Atual`), desfazer e a sincronização; abrir o **Atual** com uma fórmula nova (conta
de quantidade) **não quebra**; lint e build de produção sem aviso novo; `verify` do seletor em `1920×1080` e
`360×800`.

### `montador-exp-03` — Versões Completo e Essencial (um componente, duas densidades)

**Entrega:** os três modos de partida (Teste de atributo, Dano de arma, Dados livres) sobre o modelo da task 02;
ficha de dado com quantidade, tipo de dano, sinal, segundo tipo (composto) e opções do dado; atributo, número
(campo digitável), repetir ×N, atalhos e o **campo de expressão** para quantidade de dados e bônus fixo (decisões 5 e 10); teste com 1–2 atributos (soma ou
média, arredondando para baixo), dados a mais/menos, manter maior/menor, margem de crítico e bônus. **Completo**
deixa tudo à vista; **Essencial** recolhe sinal, segundo tipo e opções em "⋯ Mais" e o restante em painéis de "+
Adicionar" (um aberto por vez), sem abas no mobile. Alternar entre as duas é a mesma janela e o mesmo estado.
**Aceite:** corpus inteiro nos testes de modelo (função pura): nenhuma fórmula **diverge**; as dez dos jogadores
montam nas duas densidades; leitura em português sob o visor coerente com a fórmula; **gate visual completo**
(skills `design-fidelity` e `verify`): análogo aprovado = o `MontadorRolagem` atual (casca de
`app-painel-flutuante`, rodapé fixo) + os mockups E3.1/E3.3; `1920×1080` e `360×800`; estados vazio, preenchido,
avançada, inválida, resultado e cada painel de "+ Adicionar"; controle por controle usando o primitivo de
`shared/ui/` (`segmentado`, `stepper`, `chip`, `campo`, `botao`, `painel-flutuante`…) com a API completa. Faltou
primitivo (toggle, ficha selecionável/removível, cartão de receita — já **autorizados** pelo autor em 2026-10-01)
→ **parar e perguntar** antes de criar; nunca HTML/CSS local.

### `montador-exp-04` — Versão Blocos

**Entrega:** a E3.2 sobre o mesmo modelo: três modos, lista de blocos (até 2 no dano e 3 nos livres), tipo de dano
(e segundo tipo) **do bloco**, uma contagem por dado, atributos e bônus por bloco, opções do bloco nos livres, linha
de leitura fixa (faixa, média e texto) e **sinal por termo** (a E3.2 do mockup só soma; "subtrair" entra aqui),
com os atalhos no **início** do texto (corrigido na E3.2: no fim, cada atalho carimbava o atributo anterior).
**Aceite:** igual à task 03, com análogo E3.2; no corpus a E3.2 do mockup acertava 58 de 78 e **12 não montava** —
no produto as fórmulas com termo subtraindo passam a montar.

## Critérios de Aceite do guarda-chuva

- As quatro tasks em `done/`, com o corpus rodando em testes de função pura e **zero divergência** nas três versões.
- Um tester, sem ajuda, escolhe cada uma das quatro opções, monta as **dez fórmulas dos jogadores** nas três
  versões novas e **não perde a fórmula** ao trocar de versão no meio do caminho (o texto da barra é preservado).
- **Avaliação qualitativa** registrada em `HISTORY.md` ao fim: autor e testers dizem, para as mesmas dez
  fórmulas, qual versão deixariam ligada e o que faltou. É a entrada da spec do vencedor, que é do autor.
- Jogador comum (`NORMAL`) **nunca** vê o montador nem o seletor, em nenhuma tela.

## Fora de Escopo

- **Escolher o vencedor, apagar as perdedoras e o Atual, liberar para todos, patchnote** (`publicar-versao`) e
  decidir se a preferência vai para o perfil/banco (e a migration que isso exige): spec do autor, depois.
- Qualquer alteração no montador **Atual** além de ser servido pelo seletor.
- Backend: nenhuma mudança — o montador só produz texto de fórmula.
- Telemetria e coleta automática de uso.
- A extensão do motor em si (`rolagem-expressao-quantidade-dados.spec.md`) e qualquer edição de `docs/core`
  (`P-093` fica só anotado).

## Dependências

`rolagem-expressao-quantidade-dados.spec.md` (a conta de quantidade de dados precisa existir no motor, para todos,
antes da tokenização e do campo de expressão — **concluída em 2026-10-03**, em `docs/specs/done/`). As superfícies já existem (barra de "Rolagem rápida" da
ficha de jogador, da criatura/NPC e do cartão de campanha) e não dependem de outra spec. Fontes de verdade: `docs/design/DESIGN.md` e o handoff
`docs/design/tema/`; `docs/core/sistema-v4.1.0.md` ("Testes"; "Arredondamentos").

## Riscos e Mitigação

- **Variante virar permanente**: três versões nunca eram o objetivo. Mitigação: pasta única, gate único e a task de
  fechamento já reservada ao autor; esta spec não cria nenhum caminho de código que dependa de "qual versão
  está ligada".
- **Três telas sobre um modelo**: um defeito do modelo aparece nas três. Mitigação: todo o comportamento testável
  fica em função pura (tokenização, modelo, texto gerado) e o corpus roda ali, não por clique.
- **Mockup enganar o produto**: o canvas é CSS puro e tem limites (ver "O que o mockup limita"); o aceite exige a
  comparação visual com o análogo **e** o corpus no motor real, não só a semelhança com o mockup.
- **Gate visual triplicado**: três versões × dois viewports × todos os estados. Mitigação: um corte integrado por
  versão (não uma inspeção por commit) e a verificação completa só nas tasks 03 e 04.
- **Preferência por dispositivo**: o tester vê versões diferentes no celular e no desktop. Aceito durante o
  experimento (decisão 8); muda se o autor promover a preferência ao perfil.
