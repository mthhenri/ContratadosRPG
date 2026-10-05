# m4-19-npc-testes-de-atributo-regra-e-rolagem.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, continuação da revisão do NPC.
> Pedido direto do autor (2026-10-05), em três partes: (a) o NPC **deve poder ter** modificador
> de teste e ajuste de dados como o Jogador — *"ele pode ter uma habilidade passiva que aumenta
> os testes dele em mais 10, por exemplo"*; (b) a regra atual *"NPC só joga de 20 e pega o maior,
> ele nunca vai passar num teste alto. Tem que rever isso… dar uma olhada no sistema"*; (c)
> *"sobre a rolagem de atributo do NPC, também tem que criar uma spec para isso"*.
>
> Quarta e última das specs desta frente: `m4-16` → `m4-17` → `m4-18`
> (`m4-18-ficha-npc-atributos-como-jogador.spec.md`, que deixa o ladrilho `app-atributo-ficha`
> pronto com as linhas de modificador, dados e rolar **desligadas**) → **`m4-19` (esta)**, que
> as liga. Esta é a **única** spec da frente que mexe em **regra, dados e backend**.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Fontes de verdade, nesta ordem:** `docs/core/sistema-v4.1.0.md` (Testes; Crítico; DTs de
> Atributos; Proficiência/Progressão), `docs/core/guia_de_mestre-v4.0.0.md` (NPC > Nível,
> Atributos, DTs, Habilidades) — **em conflito, o documento vence o código**, e **alterar o
> documento é decisão do autor**. **Análogos aprovados:** a rolagem de teste de atributo do
> **Jogador** (`ficha-visualizacao.component.ts`: `rolarTesteAtributo`, `atributosParaDados`,
> `modificadorTeste`, `proficiencia`) e a da **Criatura** (`criatura-rolagem.ts`:
> `rolarTesteAtributoCriatura` → `"<chave>d20kh1±N"`).

## Objetivo

Hoje o NPC **não rola nada** de atributo e **não tem onde guardar** bônus de teste. Esta task
(1) **audita o sistema** para decidir, com o autor, como um NPC monta um teste de atributo —
a regra escrita é omissa e, lida literalmente, deixa o NPC incapaz de passar testes difíceis;
(2) acrescenta ao NPC o modelo de dados de **modificador de teste** e **ajuste de dados** por
atributo, iguais aos do Jogador; (3) liga no ladrilho do NPC as linhas de modificador, dados e
**rolar**, com a rolagem registrada no histórico como as demais.

## O que já se sabe do sistema (ponto de partida da auditoria — **conferir, não confiar**)

- **Teste (Sistema, "Testes"):** rola-se o valor do atributo em D20 e o resultado é o **maior**
  dado; crítico = dado na margem (20) soma **+2 por crítico** ao resultado. **Não há**, no
  sistema, soma fixa implícita além de Proficiência e bônus.
- **Jogador** compõe: `<atributo>d20kh1` + **Proficiência** (Nível; Civil sem) + **modificador
  de teste** (manual + amplificador + Formação) + dados extras (`dadosTeste`, equipamento).
- **Criatura** rola `<atributo>d20kh1 ± valor do Modificador` (derivado do VD).
- **NPC (Guia de Mestre, "Construção Mecânica > Nível"):** *"O Nível do NPC funciona como
  **Proficiência** em todos os contextos, seja para testes de ataque, cálculo de Defesa e DT."*
  Atributos partem de 1 e têm **teto por Categoria: Civil 2, Operativo 3, Veterano 4, Elite 5,
  Lendário 6** (`shared/regras/npc/atributos.ts`). DT própria: `10 + Nível + Atributo × 2`.
- **Habilidades de NPC no próprio Guia** falam em "pool de dados", "+2 em todos os testes",
  "+1 dado em todos os testes", "mínimo de 2 dados" e "pool completo de dados + Proficiência" —
  ou seja, o Guia **assume** pool e bônus de teste para NPC sem dizer **como o NPC os monta**
  fora de ataque.
- **O problema do autor, em números (conferir na auditoria):** com no máximo 6 dados e sem
  nenhum bônus fixo, o NPC **nunca** passa DT 25 ("Muito Difícil" — o dado máximo é 20, e cada
  crítico dá só +2) e passa DT 20 em ~26 % dos testes de um Lendário (`1 − (19/20)^6`); um
  Civil de Atributo 1 passa DT 15 em 30 % (`1 − 14/20`). **Somando Nível como Proficiência** (o
  que o Guia literalmente manda) o quadro muda muito — por isso a decisão é **qual fórmula** é a
  regra, e **isso é do autor**.
- **Memória do projeto, `m3-31` (sem fusão automática de efeitos na rolagem):** bônus de
  habilidade/item a teste ficam **só descritivos**; o jogador aplica à mão. Para o NPC isso
  significa: a habilidade passiva "+10 em testes" continua texto; o **mestre lança** o +10 no
  campo de modificador de teste. **Não** fundir habilidade com fórmula automaticamente.

## Entregáveis

### 1. Auditoria de regras (primeiro passo; **só leitura e documento — nenhum código**)

Produzir no fecho (e como proposta ao autor) um relatório com:

1. O que `sistema-v4.1.0.md` e `guia_de_mestre-v4.0.0.md` dizem **literalmente** sobre teste de
   NPC, Proficiência de NPC e Nível (citar trecho e linha). Inclusive a ambiguidade: o Civil
   **agente** não tem Proficiência (`calcularProficiencia` → `null`), mas o Guia dá Nível ao
   **NPC Civil** (faixa sugerida 1–4) e diz "em todos os contextos" — o Civil NPC soma Nível?
2. Uma **tabela de probabilidade** (fórmula exata, não amostra): para cada Categoria (atributo
   no teto, 1 e no meio) e Nível típico (ponto médio da faixa sugerida), a chance de passar DT 5,
   10, 15, 20, 25 e 30 com `Xd20kh1`, **com e sem** soma de Nível, e a do **agente Jogador**
   de Nível equivalente — para o autor ver onde a regra falha.
3. **Opções de fórmula** para o teste de atributo do NPC, cada uma com seu efeito na tabela,
   por exemplo: **A** `Atributod20kh1 + Nível` (leitura literal do Guia, igual ao Jogador não
   Civil); **B** A + modificador de teste lançado pelo mestre (sempre disponível, ver item 2);
   **C** outra proposta do auditor com justificativa. Recomendação explícita.
4. Impacto de cada opção em **outras partes que já usam Nível/DT de NPC** (Defesa, DT,
   habilidades do Guia) — **sem alterá-las**; só mapear.

**PARAR aqui e perguntar ao autor** (`AskUserQuestion`): qual fórmula vale e se o texto do Guia
de Mestre (e/ou do Sistema) deve ser **atualizado** para dizê-la. Alterar `docs/core/` **só com
aprovação expressa**, com o diff proposto mostrado antes. Sem essa resposta, os itens 2–5 **não
começam** (os itens 2 e 3 dependem da fórmula e da lista de campos).

### 2. Modelo de dados do NPC

- `FichaNpcDadosDto` (`shared/src/dtos/ficha/ficha-npc.dtos.ts`) ganha **opcionais**
  `modificadoresTeste` e `dadosTeste` com **exatamente o tipo** do Jogador
  (`Partial<Record<keyof FichaAtributosDto, number>>`, `ficha.dtos.ts`), ausência = 0 —
  **não redefinir o tipo**; reutilizar. Sem coluna nova: tudo no JSONB `dados`
  (`docs/SCHEMA.md` ganha a descrição dos dois campos do NPC).
- `shared/regras/npc/validacao.ts` valida: inteiros; faixas coerentes com as do Jogador
  (conferir o que `validarFicha` faz para `modificadoresTeste`/`dadosTeste` e **reaproveitar**);
  chaves só dos 10 atributos. Documentos antigos sem os campos continuam válidos.
- Backend: o `validarFichaNpc` já roda no service; **nenhuma coluna, rota ou DTO de
  nível-de-API novo** além dos campos acima. Estender os specs de validação/serviço do NPC.
- Permissão: igual à do restante do `dados` do NPC (só mestre edita; leitor vê conforme o
  recorte atual). **Conferir** que o recorte de leitura do NPC não vaza `modificadoresTeste`/
  `dadosTeste` para quem não deveria (mesma regra de `anotacoes`/conduta — decidir com o autor
  se o jogador com acesso vê os bônus de teste do NPC; **recomendado: não**).

### 3. Regra pura do teste de NPC (`shared/regras/npc`)

- Uma função pura (ex.: `montarFormulaTesteAtributoNpc`) que, dado `dados` do NPC e a chave do
  atributo, devolve a **fórmula** e/ou o **pool** conforme a opção escolhida no item 1:
  contagem de dados = atributo + `dadosTeste`, mínimo conforme a regra, `kh1`, soma de Nível
  (se a opção escolhida), `modificadoresTeste`. **Mesma gramática de fórmula** que
  `rolarFormula`/`criatura-rolagem.ts` já aceitam; **nada** de motor de rolagem novo.
- Spec exaustivo: cada Categoria, Civil com e sem Nível somado conforme a decisão, atributo 0
  (como o Jogador trata pool zero — conferir e igualar), `dadosTeste` negativo que zere o pool,
  modificador negativo, crítico (`+2` por crítico já é do motor — não duplicar).
- Consumida pelo frontend; se o backend precisar recomputar para validar rolagem registrada,
  consome a **mesma** função (regra em um só lugar — `CLAUDE.md`).

### 4. UI: ligar as linhas no ladrilho do NPC

- No card Atributos do NPC (`m4-18`), ligar `mostrarModificador`, `mostrarDados` e
  `mostrarRolar` do `app-atributo-ficha`; `mostrarMaestria` e `mostrarLesao` **continuam
  desligados** (o NPC não tem Maestria nem Lesão; **não** inventar). Leitura mostra o
  modificador e os dados ajustados como o Jogador (inclusive `+0` sempre visível).
- Edição (bloco da `m4-16`): steppers de modificador e de dados no mesmo ladrilho, como o
  `.ficha-atributo--edicao` do Jogador; Salvar/Cancelar do bloco; validação do item 2 dentro do
  card.
- **Rolar** (só mestre; `podeRolar` falso no modo leitor): `rolarTesteAtributoNpc` usa a função
  do item 3; o resultado vai à **bandeja de dados global** (`BandejaDadosService`) e é
  **registrado** pelo mesmo caminho das demais fichas (`FichaRolagemRegistroService`/
  `registrar`), aparecendo no **Histórico de Rolagens do NPC** que a página já tem. **Conferir
  no backend** (`rolagem.service`) que ficha do tipo NPC é aceita como origem de rolagem e que
  o escopo/visibilidade seguem a regra das demais; se não for, é parte desta task.
- **Coluna de ações:** a `m4-14` deixou de fora "Ocultar rolagens" (o NPC não rolava). Agora que
  rola, **perguntar ao autor** se o NPC ganha o item "Ocultar rolagens" na `app-coluna-acoes`
  como a Criatura (`rolagemOculta`/`alternarRolagemOculta`) — **recomendado: sim**, pois rolagem
  de NPC na mesa costuma ser secreta. Sem a resposta, **não** adicionar nem omitir sozinho.
- Tooltip do dadinho e `aria-label` "Rolar teste de <Atributo>", como o Jogador.

### 5. Documentação e fecho

- `docs/context/`: `HISTORY.md` (decisão de fórmula e por quê, tabela de probabilidade),
  `CONTEXT.md` (seção de NPC), `docs/SCHEMA.md` (campos novos). Se o Guia/Sistema foi alterado
  com aprovação, registrar o diff.
- `IDEAS.md`: ideias que surgirem (ex.: "bônus de habilidade do NPC aplicados automaticamente",
  hoje explicitamente descartado pela `m3-31`) entram como ideia, **não** como diff.

## Critérios de Aceite

- Relatório de auditoria (item 1) entregue **antes** de qualquer código, com a tabela de
  probabilidade, e **a escolha do autor registrada** (fórmula + se o documento muda).
- Fórmula de teste do NPC implementada **uma vez**, em `shared/regras/npc`, coberta por spec
  exaustivo; o frontend (e o backend, se aplicável) a consomem — nenhuma cópia da regra.
- NPC aceita, valida e persiste `modificadoresTeste`/`dadosTeste`; ficha antiga sem os campos
  continua abrindo, editando e salvando; ausência equivale a 0.
- Rolar teste de atributo do NPC: mestre rola; leitor não vê o dadinho; o resultado aparece na
  bandeja e no Histórico de Rolagens do NPC com a fórmula usada; rolagem oculta (se adotada)
  respeita a visibilidade.
- Ladrilho do NPC mostra e edita modificador/dados **iguais ao Jogador** em `1920×1080` e
  `360×800`; Maestria e Lesão **não** aparecem; sem overflow; foco, contraste e alvos corretos.
- Nenhuma mudança em fórmulas já existentes (Defesa, DT, Vida, Energia, Proficiência do agente)
  — `docs/core/` vence; qualquer divergência encontrada vira `PROBLEMS.md`/pergunta ao autor.

## Verificação exigida

- **Testes:** `shared` (regra pura + validação), `backend` (service/validação/recorte de leitura
  do NPC, e rolagem com origem NPC), `frontend` (ladrilho do NPC com as linhas ligadas,
  edição de modificador/dados, rolar, modo leitor, histórico). **Reutilizar** os testes
  existentes de NPC e de rolagem do Jogador como modelo; **não enfraquecer** asserções
  existentes. Suítes completas dos três workspaces e lint no fecho
  (`npm run test --workspaces --if-present`, `npm run lint`).
- **`npm run build --workspace=shared`** antes de testar contra o backend rodando (armadilha de
  `verify`: o backend importa `shared/dist`).
- **Gate visual obrigatório** (`AGENTS.md`, skills `verify` e `design-fidelity`), em
  `1920×1080` **e** `360×800`: NPC combatente e Civil; modo mestre e leitor; edição de
  modificador/dados com valor válido, negativo e inválido; rolar com resultado normal, com
  crítico e com pool zerado; histórico aberto; rolagem oculta (se adotada). O agente principal
  inspeciona pessoalmente. **Verificar também ao vivo** uma rolagem real de NPC chegando ao
  backend e ao feed da campanha (socket) — teste unitário não prova isso.
- Dados de teste por soft delete ao fim.

## Fora de Escopo

- **Alterar** as fórmulas de Defesa, DT, Vida, Energia, Categoria ou a Proficiência do agente.
- **Fusão automática** de habilidades/itens do NPC com a rolagem (`m3-31`): o bônus é lançado à
  mão pelo mestre.
- Maestria, Lesão e Formação para NPC; rolagem de **ataque**, dano ou defesa do NPC (são outras
  mecânicas; viram ideia se o autor quiser).
- Ladrilho da Criatura, padrão de edição (`m4-16`), escala da coluna 1 e Cooperação (`m4-17`),
  extração do `app-atributo-ficha` (`m4-18`).
- Qualquer edição de `docs/core/` **sem aprovação expressa** do autor.

## Dependências

- `m4-16`, `m4-17` e `m4-18` em `done/` (nesta ordem); em especial o `app-atributo-ficha` da
  `m4-18`.
- Fontes: `docs/core/sistema-v4.1.0.md`, `docs/core/guia_de_mestre-v4.0.0.md`,
  `docs/SCHEMA.md`, `docs/design/DESIGN.md`; código análogo em `criatura-rolagem.ts` e
  `ficha-visualizacao.component.ts`.
- Memória do projeto: `m3-31` (sem fusão automática), "Criatura não tem Esquiva/Bloqueio"
  (só NPC tem — não confundir), "Mockup divergente das regras: regra vence".

## Riscos e Mitigação

- **Inventar regra.** O Guia é omisso e o autor pediu revisão; a tentação é "consertar" a
  fórmula direto no código. Mitigação: o item 1 termina com **parada obrigatória** e a regra só
  entra no código depois da escolha registrada.
- **Dois lugares com a fórmula** (frontend e backend). Mitigação: regra pura única em
  `shared/regras/npc`, consumida por ambos.
- **Vazar bônus de teste do NPC para o jogador** pelo recorte de leitura. Mitigação: teste de
  backend explícito do recorte (item 2).
- **Pool zero ou negativo** (`dadosTeste` negativo, atributo 0 de Civil em Luta/Pontaria):
  igualar ao tratamento do Jogador/Criatura e cobrir em spec; a habilidade do Guia "mínimo 2
  dados" é **texto de habilidade**, não regra geral — não codificar.
- **Escopo que cresce** para ataque/dano do NPC. Mitigação: Fora de Escopo; vira ideia.
