# montador-rolagens-revisao.spec.md

> Task avulsa de **revisão/correção** (não de reescrita) do montador de rolagens. Origem: Sessão 4 da
> campanha (27/10/2026): ao trocar de visão a tela ficou diferente, um jogador viu "a página ficar
> diferente" e as rolagens saírem "aleatórias", outro notou que "o de atributos é diferente dos outros
> dois", e o autor precisou explicar onde ficam coisas como a habilidade de personalidade. Pedido **C** de
> `PEDIDO_CLAUDE_CODE_SPECS_SITE.md`. Só especificação: nenhum código nesta etapa.

## Decisões do autor (25/11/2026) e andamento

Decisões: (1) **esqueleto único** das visões (alternativa 1); (D2) **manter o motor e só avisar na tela**; (D3) **o
dadinho da Visão Geral é a referência**: o Teste do montador leva os mesmos ajustes; (D4) **ocultar o modelo
Teste** onde não há ficha. Reprodução e medidas: [`montador-rolagens-revisao/reproducao.md`](montador-rolagens-revisao/reproducao.md).

**Entregue** (testes e verificação ao vivo em 1920×1080 e 360×800, base escura):

- Teste determinístico montador → fórmula → motor (`montador-resultado.spec.ts`, Entregável 2), com D1 e D2 fixadas.
- D1: o editor de Teste não oferece mais "Sem"; "Máximo" acende também para fórmula sem `cm`. A margem do inspetor
  de termos (Dano/Livre) **não** mudou: lá "Sem" é válido para pools de dano.
- Segmento aceso = editor mostrado (`resolverTesteDoEditor` e `modoExibidoMontador`, fonte única).
- Janela única para os três modelos; trocar de modelo não muda o tamanho nem desmaximiza.
- Aviso quando a troca de modelo substitui a fórmula (a anterior continua guardada).
- D2: aviso de "Desvantagem" ou "Nenhum dado" sob a faixa de resultado.
- D3: `ajustesTeste` (dado extra de Formação e modificador de teste: manual + amplificador + Formação) levado do
  painel de rolagens da ficha até o editor de Teste; trocar o atributo leva os ajustes do novo atributo e preserva o
  que o jogador mexeu à mão. Paridade com o dadinho provada em teste (atributo positivo).
- D4: sem ficha (rolagem do mestre, campanha do mestre, rolador avulso) o modelo Teste não é oferecido.
- Guia do montador: onde ficam os ajustes, margem natural 1 e onde a habilidade de personalidade se define.

**Fechada em 25/11/2026 por decisão do autor**, com o comportamento corrigido e testado. O que ficou de fora foi
registrado em [`IDEAS.md` I-064](../../context/IDEAS.md) (acabamento visual, que o autor fará na própria máquina):

- Entregável 3 inteiro: seções e nomes **iguais** entre o editor de Teste (Atributos, Ajustes, Opções do teste) e o de
  termos (Termos, Adicionar dados, Adicionar atributo ou bônus, Opções dos dados). Hoje só o comportamento foi
  unificado, não a estrutura visual.
- Preservar dentro de cada editor o termo selecionado, o campo de expressão e o segundo atributo ao trocar de editor
  (o texto da fórmula já é preservado).
- D5 (duas definições de "é teste": `lerTeste` no frontend × `ehFormulaTeste` no motor) e D6 (NPC passa
  `proficiencia = nivel`, Criatura não passa PROF/NIV): registradas, sem decisão.
- A margem "Sem" do inspetor de termos para um pool `1d20kh1` que o motor trata como teste continua com rótulo
  enganoso.
- Verificação em 960×1080 e 1366×768, base clara e toque real.

## Objetivo

Tornar o montador **previsível**: mesma estrutura de campos entre as visões, estado preservado ao trocar,
controles exclusivos de uma visão claramente identificados, descoberta rápida de ajustes, dados a mais ou a
menos e habilidade de personalidade, e **garantia de que o resultado rolado bate com o que foi montado**.
Nenhuma regra do jogo muda; todo cálculo continua no motor puro de `shared/src/regras/rolagem/`.

## Estado atual encontrado no código

> Levantamento por leitura estática do código em 25/11/2026. Itens marcados **[confirmado no código]**
> estão provados por trecho ou teste citado; **[a reproduzir]** exigem rodar o app (Entregável 1). A
> Sessão 4 **não foi reproduzida** em tela.

Caminhos: `FE = frontend/src/app`; `MR = FE/shared/montador-rolagem`.

### Quem é quem

- O "botão do dadinho" do montador é o gatilho `app-icone nome="dado-mais"` em `MR/montador-rolagem.component.html`
  (componente `MontadorRolagem`). **Há outro "dadinho" que não é o montador**: o do box de atributo da Visão Geral
  da ficha (`rolarTesteAtributo`, `ficha-visualizacao.component.ts`), e os dois **não somam as mesmas coisas**
  (ver Divergências).
- Cadeia: `MontadorRolagem` (casca, estado, janela, rodapé) → `MontadorEditorPecas` (editor do **Teste**) →
  `MontadorEditorTermos` (lista e adição de termos) → `MontadorEditorTermo` (inspetor do termo). Funções puras
  no frontend: `montador-modelo.ts`, `montador-pecas.ts`, `montador-leitura.ts`, `montador-apresentacao.ts`.
- Consumidores: `RolagemRapida` (ficha, criatura, NPC, detalhe do mestre, rolagem do mestre) e `RolagemAvulso`
  (encontro). O montador **não** existe no formulário de presets.
- Specs que definiram o estado atual (done): `montador-atributos-poc`, `montador-rolagem-interface-e-guia`,
  `montador-rolagem-fechamento`, `montador-rolagem-cobertura-telas`. Nada em `active/` cobre o montador;
  `PROBLEMS.md` não tem entrada aberta de montador/rolagem.

### As "três visões"

São os segmentos de `RECEITAS_MONTADOR` (`MR/montador-modelo.ts:72-81`): **Teste de atributo** (`LUTd20kh1cm1 + PROF`),
**Dano de arma** (`2d6 + FOR [F]`) e **Dados livres** (fórmula vazia).

**[confirmado no código]** Estruturalmente existem **duas telas, não três**:

| Visão | Editor | Particularidade |
|---|---|---|
| Teste de atributo | `MontadorEditorPecas` (`montador-editor-pecas.component.html`) | Atributo principal, "Combinar com", Só um/Soma/Média; Ajustes (Proficiência, Nível, "Dados a mais ou a menos" −10..10, Bônus fixo); Opções (Manter Maior/Menor, Margem de crítico Sem/Máximo/2 maiores/3 maiores, Repetir). **Sem** tipo de dano, sinal por termo ou dado explosivo. |
| Dano de arma | `MontadorEditorTermos` (lista + inspetor) | Fórmula inicial `2d6 + FOR [F]`; peças novas nascem com tipo Físico (`tipoPadraoDoModo`, `montador-pecas.ts:91`) |
| Dados livres | **o mesmo** `MontadorEditorTermos` | Fórmula inicial vazia; peças novas sem tipo |

Dano e Livre diferem só em dois pontos (fórmula inicial e tipo padrão). Isso explica "o de atributos é diferente
dos outros dois" e **corrige parcialmente a hipótese do autor**: não é que o rolador livre tenha "controles a
mais"; é que o **Teste é outra tela**, e a mesma capacidade aparece com **nomes e lugares diferentes** em cada uma:

| Conceito | No Teste | Nos termos (Dano/Livre) |
|---|---|---|
| Proficiência | toggle em "Ajustes" | botão "Adicionar proficiência" |
| Dados a mais ou a menos | stepper em "Ajustes" | stepper de quantidade do termo, ou "Quantidade de dados" por expressão |
| Margem de crítico | "Opções do teste" | inspetor do termo de dado |
| "Máximo de crítico" | opção "Máximo" (= `cm1`) | opção "Máximo" do inspetor |

### Onde o estado se perde ao trocar de visão

1. **[confirmado no código]** `escolherReceita` (`montador-rolagem.component.ts:196-201`) grava o texto atual em
   `montagens[modoAtual]` e carrega `montagens.get(novo) ?? receita.formula`. A fórmula visível muda por
   completo; **Teste → Livre na primeira vez zera o visor** (Livre começa vazio e "Rolar" fica desabilitado),
   embora o texto do Teste continue guardado. `montagens` é um `Map` comum, **não reativo e não persistido**; o
   Desfazer restaura texto e modo, mas não `montagens`.
2. **[confirmado no código]** A troca de editor **destrói e recria** o componente (`@if teste() … @else`): somem o
   termo selecionado, o texto do campo de expressão, o uso Bônus/Quantidade, o atributo escolhido para adicionar
   e o `segundoGuardado`.
3. **[confirmado no código]** `@if (mostraEditor())` destrói o editor sempre que a fórmula vira AVANÇADA ou
   INVÁLIDA (por exemplo ao digitar no visor).
4. **[confirmado no código]** A janela tem **dois tamanhos** (`janelaTeste` 520×728 e `janelaTermos` 760×880,
   `montador-rolagem.component.ts:257-273`); trocar de modelo muda a janela inteira, e `escolherReceita` chama
   `janela.restaurar`, que **desmaximiza**. É o "a página ficou diferente" relatado.
5. **[confirmado no código]** O **segmento ativo pode não corresponder à tela mostrada**: o `modo` explícito não é
   reavaliado quando o texto muda por fora (visor/barra). Modo TESTE com texto que não é teste (ex.: `2d6`) mostra
   o editor de termos; modo DANO/LIVRE com um texto de teste (ex.: `LUTd20kh1cm1 + PROF`) mostra o editor de Teste
   **com o segmento "Dano" aceso**. O tamanho da janela também segue `modoAtual`, não o editor.
6. **[confirmado no código]** Com modo TESTE e fórmula vazia (por exemplo após "Limpar"), o editor mostra
   `TESTE_INICIAL` (LUT, Máximo, PROF ligada) **enquanto o texto está vazio**: controles exibem valores que não
   estão na fórmula até alguém tocar neles. Há teste que protege isso de propósito
   (`montador-rolagem.component.spec.ts`, ~l.53), então é **decisão anterior a rediscutir**, não descuido.

### Cálculo e risco de divergência

O cálculo é do motor puro (`shared/src/regras/rolagem/rolagem.ts`: `interpretarFormula`, `rolarTermo`,
`rolarInterpretada`). O caminho montar → rolar passa **só por texto**: o montador escreve a fórmula no
`FormControl`; `RolagemRapida.rolar` valida e chama `rolarFormula({ formula, atributos, proficiencia, nivel })`.
**[confirmado no código]** Não há estado paralelo e, no mesmo contexto, não foi achada divergência entre o que a
tela lê (faixa, média, "N d20", via `montador-leitura.ts`) e o que o motor rola.

**Divergências confirmadas** (candidatas a bug; cada uma precisa de passos de reprodução no Entregável 2):

| # | Divergência | Evidência | Natureza |
|---|---|---|---|
| D1 | **"Margem de crítico = Sem" no Teste é rótulo enganoso.** `escreverTeste` omite `cm` quando a margem é 0 (`montador-pecas.ts:264`), mas o motor aplica margem natural: `margemCritico ?? 1` em fórmula de teste (`rolagem.ts:744`) e o +2 de crítico. Logo **"Sem" e "Máximo" rolam igual** num teste. O mesmo ocorre com `1d20kh1 + FOR` montado em Dano/Livre, onde o inspetor mostra "Sem". | Teste do motor "aplica a margem natural sem exigir cm" (`critico-teste.spec.ts:30`); Sistema, "Crítico e Margem de Crítico": **todos os testes possuem margem natural de 1** | **Bug de UI/rótulo** (o motor está certo; o Sistema não prevê "sem crítico"). Candidato forte a "rolagem aleatória" |
| D2 | **"Dados a mais ou a menos" tem semânticas diferentes conforme a forma da fórmula.** Com 1 atributo e extra ≠ 0, vira `(LUT+n)d20kh1` e o motor **clampa em 0 dados e não aplica a desvantagem intrínseca**; com extra = 0 e atributo ≤ 0, vale a desvantagem (2+\|atr\| dados, mantém o menor); com 2 atributos `(A+B+n)` é "conta" e usa desvantagem quando ≤ 0. O mesmo "−1 dado" dá 0 dados ou 2+ dados mantendo o menor. | `rolagem.ts:166-192, 570-608`; `rolagem.spec.ts:754-768` **documenta** o comportamento | **Decisão de regra pendente** (pergunta 3): pode ser intencional; se divergir do Sistema, é bug do **motor** e segue a skill `regras-do-jogo`, não esta spec. Candidato forte a "rolagem aleatória" com atributo baixo |
| D3 | **O dadinho da Visão Geral soma o que o montador não soma:** dado extra de Formação da Origem e `modificadorTeste` (manual + amplificador + bônus plano de Formação). O montador Teste usa só `atributosParaDados`. Para o mesmo atributo, as duas rolagens podem diferir. | `ficha-visualizacao.component.ts` (~l.1435-1470) × `ficha-rolagens-painel.component.*` | A confirmar ao vivo; decisão de qual é a referência (pergunta 4) |
| D4 | **Contexto neutro do mestre:** `RolagemMestre` e a campanha do mestre passam atributos **todos 0**; a receita "Teste de atributo" mostra LUT 0 e **rola em desvantagem** (2d20, o menor). No `RolagemAvulso`, `formulaValida` rejeita qualquer fonte de ficha, então a receita Teste é **sempre inválida**, mas o montador oferece o modelo mesmo assim. | `rolagem-mestre.component.ts:27`; `detalhe-mestre.page.html:207-212`; `rolagem-avulso.component.ts:22-60,146` | A reproduzir; hipótese de confusão, não de erro de cálculo |
| D5 | **Duas definições de "é teste":** `lerTeste` no frontend (exige o resto só com PROF, NIV e números) × `ehFormulaTeste` do motor (qualquer pool único d20 kh/kl sem tipo). `1d20kh1 + FOR` é "termos" no editor e "teste" no motor. Duplicação de **leitura/apresentação**, não de regra de dano. | `montador-pecas.ts:161-199`; `rolagem.ts:710-721` | Origem de D1 em Dano/Livre |
| D6 | **PROF/NIV por contexto:** NPC passa `proficiencia = nivel`; Criatura não passa nenhum (valem 0). | `npc-visualizacao.component.html:15-23`; `criatura-visualizacao.component.html:1705-1711` | Verificar se é intencional |

### Habilidade de personalidade

**[confirmado no código]** O montador **não tem** seleção de habilidade nem de personalidade (zero ocorrências em
`MR/` e `RolagemRapida`); a habilidade **nunca altera a fórmula** (os efeitos de habilidade foram aposentados na
`m3-31`; no motor só contam Energia). A habilidade de personalidade é definida na aba **Extras** da ficha
(`ajusteHabilidadePersonalidade`, `m3-78`), materializada como item `categoria: PERSONALIDADE` em
`dados.habilidades` e, na rolagem, só reaparece como **chip no editor de presets** (`ficha-rolagens`), para debitar
Energia por passo. **[a reproduzir]** não foi observado se ela aparece ali como qualquer habilidade. Ou seja:
ajustes e dados a mais ficam no montador; a habilidade só nos presets. **Ainda assim, "onde fica a habilidade de
personalidade" é uma pergunta de descoberta, não de cálculo.**

### Testes existentes e lacunas

Existentes: `montador-rolagem.component.spec.ts` (11 casos: Limpar, Desfazer, modos, receitas, **preservar
montagens ao alternar**, sincronia visor↔barra), `montador-editor-pecas`, `montador-pecas.spec.ts` (corpus das
fórmulas dos jogadores remontadas sem divergência de **interpretação**), `montador-modelo`, `montador-leitura`,
`janela-montador`, `guia-montador`, consumidores (`rolagem-rapida`, `rolagem-avulso`, `rolagem-mestre`) e o motor
(`rolagem.spec.ts`, `rolagem.conta.spec.ts`, `critico-teste.spec.ts`).

**Não cobrem:** rolagem **determinística de ponta a ponta** a partir do que o montador monta (os testes comparam
interpretação, não resultado); coerência do rótulo "Sem" com a margem natural; troca de visão com texto
divergente do modo; perda de estado dos editores; Teste em contexto neutro; diferença de desvantagem entre
`(ATR+n)` e `(A+B+n)`; paridade montador × dadinho da Visão Geral.

## Proposta

### Princípios

1. **Uma estrutura, três modelos.** Todas as visões mostram a mesma sequência de seções (Termos/Atributos →
   Ajustes → Opções dos dados → Resultado/leitura), com os mesmos nomes. O que só existe numa visão (tipo de
   dano, sinal por termo, dado explosivo no Teste) aparece **identificado** ("Só em Dano e Dados livres"), nunca
   escondido por ausência.
2. **A fórmula é a única verdade; trocar de visão é uma lente, não uma reinicialização.** Trocar para uma visão
   que **não consegue representar** a fórmula atual não pode apagá-la: mantém o texto e avisa, em vez de zerar.
3. **O que se vê é o que rola.** O rótulo descreve o efeito real (D1) e a leitura mostra o que o motor vai fazer.
4. **Janela estável.** Mesmo tamanho (ou mesma regra) entre modelos; trocar de modelo não desmaximiza.
5. **Descoberta:** um atalho "Ajustes" fixo (dados a mais/menos, proficiência, nível, bônus, crítico) em todas
   as visões e um ponto único que diga onde fica a habilidade de personalidade.

### Alternativas consideradas

| # | Alternativa | Prós | Contras |
|---|---|---|---|
| 1 | **Unificar o esqueleto** das visões (mesmas seções e nomes), mantendo os dois editores por dentro | Menor mudança; resolve "ficou diferente" | Ainda há dois editores para manter |
| 2 | **Um único editor** para as três receitas (o Teste vira um conjunto de termos com atalhos) | Elimina a divergência de raiz | Maior reescrita; risco ao fluxo aprovado em 25/10 |
| 3 | Manter como está e só **corrigir D1/D2 e o estado** | Mais barato | Não ataca a descoberta nem "a página fica diferente" |

Recomendação: **1**, com a correção de D1 e a preservação de estado; **2** só se o autor quiser (pergunta 1).

### Comportamento proposto

- **Estado preservado por visão** (inclusive seleção do termo, campo de expressão, segundo atributo) e
  **persistido entre aberturas do painel** apenas se o autor quiser (pergunta 5); no mínimo, reativo e
  recuperável pelo Desfazer.
- **Troca para visão que não representa o texto:** mantém o texto, mostra o editor que o representa e acende o
  segmento coerente com ele (resolve o item 5 de perda de estado); nada de visor zerado sem aviso.
- **D1:** substituir "Sem" por rótulo fiel ao motor (por exemplo "Natural (20)") e deixar claro que a margem
  mínima do Sistema é 1; as demais opções ("Máximo", "2 maiores", "3 maiores") passam a ser descritas pelos
  valores de d20 que criticam. **Sem alterar o motor.**
- **D2:** primeiro **decidir** (pergunta 3); depois, ou documentar na leitura ("dados extras anulam a
  desvantagem") ou levar a divergência ao motor via `regras-do-jogo`.
- **D4:** quando o contexto não tem atributos (mestre, avulso), **não oferecer** a receita que não funciona ou
  explicar por que está indisponível.
- **Personalidade:** uma linha de ajuda contextual no montador apontando a aba Extras e, se o autor quiser,
  mostrar a habilidade de personalidade da ficha como informação (não como controle) quando houver.

## Entregáveis

> Anexos em `montador-rolagens-revisao/` ao lado da spec; capturas em `.artifacts/montador-rolagens-revisao/`.

1. **Reprodução ao vivo** (skill `verify`) de cada item de "Onde o estado se perde" e de D1–D6, com **passos,
   resultado observado e resultado esperado**, em `reproducao.md`. Cada divergência confirmada vira entrada em
   `PROBLEMS.md` (`P-0NN`) com passos de reprodução; o que for só de UX segue nesta spec.
2. **Teste determinístico de ponta a ponta** (montador → fórmula → `rolarFormula` com dado injetado) cobrindo
   dados extras, proficiência, margem de crítico e máximo de crítico, nas três receitas e nos contextos jogador,
   NPC, criatura, mestre e avulso. Falha ⇒ bug registrado com passos.
3. **Esqueleto único das visões** conforme a proposta aprovada, com seções e nomes iguais e controles exclusivos
   identificados.
4. **Preservação de estado** ao trocar de visão e de editor, sem zerar o visor nem desmaximizar a janela.
5. **Correção de rótulo D1** (e dos demais textos de margem/máximo de crítico) alinhada ao motor.
6. **Descoberta:** atalho/seção de Ajustes em todas as visões e ajuda sobre a habilidade de personalidade.
7. **Decisões D2, D3 e D4** registradas (e, se forem regra, encaminhadas por `regras-do-jogo`).
8. Atualização do guia (`guia-montador`) se os nomes mudarem, e de `docs/context/` no fecho.

## Critérios de Aceite

- Em cada receita e contexto, **o resultado rolado é compatível com a fórmula e os controles montados**: o teste
  determinístico do Entregável 2 passa, e uma amostra manual (dado fixo) confere dados extras, proficiência,
  margem e máximo de crítico.
- Trocar entre as três visões, ida e volta, **não perde** o que foi montado (texto, termo selecionado, campo de
  expressão), **não zera o visor sem aviso**, não muda o tamanho da janela de forma surpreendente e **não
  desmaximiza**.
- O segmento aceso sempre corresponde ao editor mostrado.
- "Sem" não existe mais como rótulo de margem no Teste; os rótulos descrevem o efeito real.
- Um jogador novo acha, em até poucos segundos e sem ajuda, onde estão "dados a mais ou a menos", proficiência,
  crítico e a habilidade de personalidade (teste de descoberta com o autor ou um jogador; critério de tempo na
  pergunta 6).
- **Nenhuma regra do jogo foi alterada**; nenhum cálculo novo no frontend (a leitura continua chamando o motor).
- Gate visual completo (`verify`, `design-fidelity`) em `1920×1080` e `360×800` (e `960×1080`, `1366×768` onde o
  montador abre em janela), em base escura e clara, percorrendo todos os estados; análogo registrado; sem
  overflow; foco, contraste e alvos de toque de 44px. Testes de `shared` e `frontend`, lint e
  `npm run repo:verificar`.

## Fora de Escopo

- Mudar fórmula, margem de crítico, desvantagem ou qualquer regra (Oficina das Regras e motor).
- Reescrever a gramática de rolagem (`m3-46`) ou o parser.
- Presets de rolagem (`FichaRolagens`), histórico e bandeja de dados.
- Ligar habilidades à fórmula (efeitos de habilidade foram **aposentados** na `m3-31`).
- Redesenho visual geral do montador além do necessário para a consistência (isso vira achado da auditoria).
- Alterar o dadinho da Visão Geral antes da decisão D3.

## Dependências

- Nenhuma de implementação. Convém decidir D2/D3 com o autor antes de executar.
- Fontes: `docs/core/sistema-v4.1.5.md` ("Crítico e Margem de Crítico", "Testes"), skills `regras-do-jogo`,
  `design-fidelity`, `verify`, `tempo-real` (não se aplica), `gerenciamento-de-impacto`; specs done do montador.

## Impacto (skill `gerenciamento-de-impacto`)

| Camada | Efeito |
|---|---|
| Frontend | `MR/*` (casca, editores, modelo, leitura), `janela-montador`, `guia-montador`; todos os consumidores (`RolagemRapida`, `RolagemAvulso`, rolagem do mestre) |
| `shared/regras/rolagem` | **Sem alteração prevista.** Só testes novos. Se D2 virar regra, é outra tarefa |
| Backend/banco/migrations | Nenhum |
| Tempo real | Nenhum (a rolagem registrada continua igual) |
| Regras do jogo | Nenhuma mudança; D2 pode gerar encaminhamento |
| Docs | `guia-montador`, `CONTEXT.md`, `HISTORY.md`, `PROBLEMS.md`, `IDEAS.md` |
| Deploy | Só frontend |

## Riscos e Mitigação

- **Reescrever em vez de revisar:** o fluxo foi aprovado pelo autor em 25/10; manter os modelos e mudar
  estrutura/estado/rótulos. Alternativa 2 só com decisão expressa.
- **Corrigir D2 "por cima" no frontend:** proibido; qualquer ajuste de desvantagem é do motor.
- **Mexer em estado de um componente já extenso** (`MontadorRolagem`): avaliar extração do estado de montagens
  para um serviço/store antes de acrescentar responsabilidade (`AGENTS.md`).
- **Quebrar o corpus de fórmulas dos jogadores:** os testes de `montador-pecas.spec.ts` continuam obrigatórios.
- **Atribuir a Sessão 4 a uma causa não reproduzida:** as hipóteses (D1, D2, troca limpando o visor, contexto de
  mestre) ficam como hipóteses até a reprodução; o relatório diz quais foram confirmadas.

## Estratégia de testes e verificação (skill `verify`)

Testes puros e de componente conforme o Entregável 2, mais regressão do corpus e dos consumidores; stack real
com ficha de jogador, NPC, criatura e contexto de mestre; dois usuários não são necessários (sem tempo real).
Relatório textual: [`montador-rolagens-revisao/verificacao.md`](montador-rolagens-revisao/verificacao.md).

## Perguntas abertas

1. **Estrutura:** alternativa 1 (esqueleto único, dois editores), 2 (um editor só) ou 3 (só corrigir)?
2. **Terceira visão:** o autor se referia a "Dano de arma" (a terceira, estruturalmente igual a "Dados livres")
   ou a outra tela? Faz sentido manter **Dano** e **Livre** como duas receitas se são o mesmo editor?
3. **D2 (desvantagem com dados extras):** o comportamento atual (extra ≠ 0 anula a desvantagem e clampa em 0;
   extra = 0 mantém) é a intenção do Sistema? Se não, é bug do motor (outra tarefa).
4. **D3:** o montador Teste deve incluir o dado extra de Formação e o `modificadorTeste` como o dadinho da Visão
   Geral, ou o dadinho é que deve mudar? Qual é a referência?
5. **Persistência:** o estado de montagem por visão deve sobreviver ao fechar e reabrir o painel (e entre
   sessões), ou só dentro da sessão aberta?
6. **Descoberta:** meta de tempo e quem testa (o autor? um jogador?). A habilidade de personalidade deve só ser
   **explicada** ou **mostrada** no montador?
7. **Contexto neutro:** no mestre/avulso, ocultar a receita Teste ou manter com aviso?
8. **Sessão 4:** existe registro (captura, fórmula usada, resultado) da rolagem que "saiu aleatória"? Ajudaria a
   confirmar qual das hipóteses (D1, D2, troca de visão, contexto do mestre) foi a causa.
