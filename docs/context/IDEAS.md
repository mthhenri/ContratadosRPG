# IDEAS.md — Insights e Ideias

> **O que este arquivo é:** o lugar onde ideias levantadas durante uma conversa **não se perdem**.
> Um insight que apareceu no meio de outra task, uma feature que alguém imaginou, uma direção que
> vale considerar um dia. Nada aqui é compromisso.
>
> **A porta de saída importa mais que a entrada.** Quando uma ideia amadurece, ela vira uma spec em
> `docs/specs/backlog/` e **sai da lista de abertas**, indo para "Promovidas" com o link da spec.
> Sem isso, este arquivo vira um segundo backlog concorrente e o `docs/specs/backlog/` deixa de ser
> a fila real.
>
> **O que NÃO entra aqui:** trabalho já decidido (isso é spec no backlog), bug ou dívida (isso é
> [`PROBLEMS.md`](PROBLEMS.md)), e decisão já tomada (isso é `CONTEXT.md` §5).
>
> **Formato de entrada** — copie o bloco abaixo:
>
> ```markdown
> ### I-0NN — <título curto> · <área>
>
> - **Ideia:** o que é, em uma ou duas frases.
> - **Origem:** de onde saiu (task, conversa, observação de uso).
> - **Por quê:** que problema real ela resolveria — se não houver, provavelmente não é uma ideia.
> - **Custo aparente:** o que ela exigiria (schema novo? motor novo? só UI?).
> ```

---

## Promovidas

### I-041 — Montador de rolagem enxuto: ações base + guias · frontend/rolagem

- **Promovida em 2026-10-02** (o autor pediu a spec depois da E3.3 e das decisões abaixo): duas specs em
  `docs/specs/backlog/` — `rolagem-expressao-quantidade-dados.spec.md` (extensão definitiva do motor, para todos) e
  `montador-rolagem-experimento.spec.md` (guarda-chuva do experimento exclusivo de tester, tasks `montador-exp-01`…`04`).
  A spec do **montador vencedor** e a liberação para todos são do autor, depois do experimento. O registro de pesquisa
  abaixo é a memória dos achados; o contrato está nas specs.

- **Ideia:** reduzir o `MontadorRolagem` ao que se usa toda sessão (dado, atributo com modo explícito
  Somar/Testar, bônus, tipo de dano com nome, atalhos do agente) e mover o resto — `kh`/`kl`, `cm`,
  `(ATR±n)dM`, `(…)#N`, composto, explosão — para um guia embutido no painel, com exemplos que se
  inserem no visor; leitura em português da fórmula sob o visor.
- **Origem:** pedido do autor em 2026-10-01 (montador "burocrático e confuso"); análise de UX/UI e sete
  direções de POC em [`docs/design/propostas/montador-rolagem-simplificado.html`](../design/propostas/montador-rolagem-simplificado.html).
- **Por quê:** hoje são cerca de 75 controles em 9 grupos, com teclado de calculadora, parênteses que
  geram fórmula inválida, operadores que agem num alvo oculto e ajuda só em tooltip/modal fora do
  contexto (medido no POC; achados 1–8 e A–D na página).
- **Custo aparente:** só frontend. A recomendação (Opção 1 + guia com receitas + leitura da Opção 4)
  não pede primitivo novo nem regra nova; as opções 2, 5 e 7 pedem divisor de termos exportado do
  `shared/regras/rolagem` e primitivos novos em `shared/ui/` (decisão do autor). Falta o autor escolher a
  direção e as decisões da seção 6 da página (janela × gaveta, "Testar atributo" como ação base, nome
  completo de tipo de dano) antes de virar spec.
- **Decisões do autor (2026-10-01):** a janela flutuante **fica** (nada de gaveta); tipo de dano com
  **nome completo no botão** e a sigla (`[F]`) valendo na fórmula; **primitivos novos em `shared/ui/`
  autorizados** (toggle, ficha selecionável/removível, cartão de receita etc.). "Testar atributo" como
  ação base e a tokenização no `shared` ficaram sem resposta (o autor não entendeu): os mockups assumem o
  modo explícito Somar/Testar, e a tokenização é decisão técnica sem efeito visual. Cinco versões visuais
  no canvas "Montador de rolagem" (claude.ai), pendente escolher uma.
- **Preferência (2026-10-01, depois dos mockups):** o autor gostou de Essencial, Fichas, Bandeja e Receitas
  (Paisagem ficou de fora) e pediu mesclas entre elas; cinco mesclas no mesmo canvas — A Essencial + Bandeja,
  B Fichas + Bandeja, C Receitas + Essencial, D Receitas + Fichas, E todas juntas. Pendente escolher uma.
- **Direção escolhida (2026-10-02):** o autor decidiu seguir com a **Mescla E** ("todas juntas") e pediu o
  que mais aprimorar. Achados da revisão (render da E + código real): três representações da mesma fórmula
  (fichas, frase, texto) mais o texto repetido no botão Rolar; "Começar por" fixo e destrutivo (a fórmula é o
  mesmo texto da barra, `formula = model<string>`); Somar/Testar como interruptor em vez de modo derivado do
  estado; aba Atalhos sempre visível (o real só mostra `CORPO`/`FURTIVO` quando há valor, e a E não mostra o
  valor); "Número" como aba em vez de bônus na bandeja; vermelho com três significados (seleção, tipo Físico,
  Rolar); `⌫` sem rótulo e com alvo pequeno; faltam os estados avançada, inválida e resultado da rolagem (o
  real não fecha o painel ao rolar). Aguardam resposta do autor: decisão 2 ("Testar atributo") e 4
  (tokenização no `shared`), agora ligadas à E; sem spec ainda.
- **Respostas do autor (2026-10-02):** "Testar atributo" **fica como um dos quatro pontos de partida** (Teste de
  atributo, Dano de arma, Dados livres, Em branco); a **tokenização no `shared` está aprovada** (o motor passa a
  devolver a fórmula como lista ordenada de peças, sem mudar nenhum resultado de rolagem); **Dado e Atributo sempre
  visíveis, sem aba, no desktop** (no mobile ficam as abas Dado, Atributo e Atalhos). A recomendação de seleção
  neutra (item 5) foi **recuada**: o tema define o estado selecionado em vermelho (`.selecionavel--ativo` em
  `docs/design/tema/_componentes.scss`), então a E2 mantém o padrão e só deixa o Rolar como único preenchido sólido.
  Mescla E2 publicada no canvas (desktop e 360×800), ainda sem spec.
- **Correção de rumo (2026-10-02, depois da E2):** o autor apontou que a E2 deixou os Dados livres mais fracos que a
  E (um termo só, um tipo de dano, bônus de −5 a +5). Era limitação do mockup vazando para o desenho: o motor aceita
  vários termos com sinal, tipo de dano por segmento, até 100 dados por termo e qualquer constante. Decisão: **um
  editor único com vários termos**, em que Dano de arma e Dados livres são presets (o dano abre com 2d6 + Força
  [Físico]; os livres abrem em branco) e Teste de atributo segue como o único modo à parte. Dados livres ganha
  "Opções" por ficha de dado (manter maior/menor, explodir/implodir, margem de crítico) e "Repetir a fórmula ×N"
  recolhido; "Dado por propriedade + ajuste" fica só no Guia. O ponto de partida "Em branco" virou o próprio Dados
  livres (já abre em branco). Mescla E3 publicada no canvas; o "Desfazer" do rodapé não é demonstrável no mockup
  (o Limpar zera) e fica como item de spec.
- **Teste de fórmulas na E3 (2026-10-02):** 78 fórmulas reais (exemplos do Guia, dos testes de `shared/regras/rolagem` e do
  montador, mais casos de jogo) foram interpretadas pelo motor do projeto (compilado localmente) e montadas na E3 por
  cliques; o texto que a tela gerou foi relido pelo mesmo interpretador e comparado ao original. Resultado: 31 montadas
  iguais, 19 equivalentes (mesma leitura do motor, texto diferente), 17 que a E3 não monta, 3 que divergem, 5 inválidas no
  motor e 3 acima do limite do mockup. Achados que valem para a spec: (1) a bandeja precisa ser uma lista ordenada de
  fichas, não um termo por face: `2d6[F]+1d6[Q]` e `(2d6+1d8)[F]+(1d4+1d6)[B]` não cabem; (2) atributo e número herdam
  o tipo do segmento por posição (sem tipo vale Físico), e a E3 fixa a posição no primeiro termo, então
  `2d8[B]+PON`, `1d12+FOR[F]+1d4[Q]` e `furtivo+FOR` mudam de tipo; o tipo precisa ser escolha explícita de cada ficha;
  (3) o teste de atributo precisa de margem de crítico (`LUTd20kh1cm2+PROF`); (4) atalhos expandem com tag própria e
  devem ficar no fim do texto (defeito da E3, corrigido: `2d6+FOR+CORPO[F]` saía inválida). Fora dos botões por decisão
  (Guia): kh/kl com N, limiar de explosão/implosão, `[F-Q]`, dado por atributo + ajuste e `FOR*3`/`LUT/2`; d100 não está
  na paleta (d3–d20). `d20` vira `1d20` e o texto segue a ordem das faces (equivalentes, mas reescritos).
- **Fórmulas dos jogadores (2026-10-02):** o autor trouxe dez fórmulas de uso real; o teste na E3 (motor como juiz) deu:
  duas montadas equivalentes (`(5d8+6d6[Q]+6d4+8[B])#2` e `(5d8[Q]+3d4+8[B])#2`, reescritas na ordem das faces), uma
  igual (`(2d8[Q])#2`), duas acima do limite do mockup (`3D10+36[Balístico]+3D8[Químico]` e `6D8+36[Balístico]`:
  o número real passa de 20 e exige campo digitável), quatro que a E3 não monta e uma inválida no motor. As quatro
  que não montam são todas o que se escondeu no Guia por decisão: dado por atributo + ajuste em três delas
  (`(PON+1)d20kh1cm1+PROF+...`, `(des+1)d20...`, `(pon+1)d20...`, 3 de 10) e dano composto `[F-Q]` em uma. O uso real
  derruba essas duas decisões: **"dados a mais/menos" do teste, "repetir ×N" e "margem de crítico" no teste e "dano
  composto" (dois tipos na mesma ficha) viram controles de base**; `cm1` é o padrão (os jogadores o escrevem por hábito).
  Pedido do autor ("não funciona, mas deveria"): `((Int+soc)/2)d20kh1cm1+prof` é inválida hoje ("Termo desconhecido";
  o motor só aceita `(ATR±n)dM` e `(ATR*Y)dM`). **Extensão de regra pendente de decisão do autor:** quantidade de dados
  como expressão de atributos (soma e média). Arredondamento: `docs/core/sistema-v4.1.0.md` manda arredondar para baixo
  em "Arredondamentos" mas diz "para cima" em "Ordem de Bônus"; o motor usa para baixo (`LUT/2`). Não achei a regra da
  média de dois atributos em `docs/core`; a origem (habilidade, regra da mesa) fica a confirmar.
- **Respostas do autor e novas telas (2026-10-02):** arredondamento da quantidade de dados por expressão: **sempre para baixo**;
  a expressão deve aceitar **qualquer conta** (`+ − × ÷`, parênteses e números sobre atributos); a regra vem de **uma
  habilidade de um jogador** (não está em `docs/core`). Aprovada a E3.1 e pedida uma E3.2 **sem bandeja** ("fichas/tokens
  fica complexo"). **E3.1** = E3 + teste com 1 ou 2 atributos (soma ou média, que arredonda para baixo), dados a mais ou a menos
  (−5..+5), manter maior/menor, margem de crítico, repetir ×N (também no dano de arma), dano composto (segundo tipo na ficha de
  dado) e número fixo de −10 a +60 (no produto, campo digitável). **E3.2** = formulário por blocos, sem bandeja: três modos
  (Teste, Dano de arma, Dados livres); dano e livres são listas de blocos (até 2 e 3), cada bloco com tipo de dano (e segundo
  tipo), uma contagem por dado, atributos e bônus, mais opções do bloco nos livres; linha de leitura fixa com faixa, média e
  texto. Contas fora da soma e da média de atributos (ex.: `(INT*2+SOC)/3`) ficam para o texto e para a extensão do motor.
  Teste das dez fórmulas dos jogadores: **E3.1 9 de 10** (a que diverge, `3D10+36[B]+3D8[Q]`, tem o +36 preso ao primeiro termo
  por ordem de face); **E3.2 10 de 10** (o tipo é do bloco, então atributo e número ficam no segmento certo). Limites da E3.2:
  atributos só somam, opções valem para todos os dados do bloco e o texto sai na ordem das faces (equivalente, não idêntico).
- **Bateria completa E3.1 × E3.2 (78 fórmulas, 2026-10-02):** E3.1: 35 iguais, 19 equivalentes, 13 que não monta, 3 que
  divergem (`2d8[B]+PON`, `furtivo+FOR` e `1d12+FOR[F]+1d4[Q]`, todas por tipo herdado da posição), 5 inválidas no motor e 3
  acima do limite do mockup. E3.2: 39 iguais, 19 equivalentes, 12 que não monta, nenhuma divergente. Em comum, fora dos botões
  por decisão: `kl2`, `!5`, `?<=2`, `(FOR-1)d6`, `FOR*3`, `LUT/2`, `2d8+FOR*3+5`, `1d100`, `LUTd20kh1+FOR`. Só na E3.1: quatro
  fórmulas com o mesmo dado em tipos diferentes (`2d6[F]+1d6[Q]`...). Só na E3.2: três fórmulas com termo subtraindo
  (`d6+2d8-FOR+3`, `2d6+FOR[F]-1d8[Q]+3`, `2d6-FOR`). A E3.2 teve um defeito corrigido: atalhos (`CORPO`/`FURTIVO`) agora vão no
  início do texto, porque cada um expande com a própria tag e, no fim, carimbava o atributo anterior (`furtivo+FOR`). Para a
  spec: sinal por termo (dado e atributo) é requisito, nas duas arquiteturas.
- **E3.3 — divulgação progressiva (2026-10-02):** o autor achou a E3.1 "too much" e pediu uma E3.3 sobre ela. Mesmo estado e
  mesmo texto de saída da E3.1; muda só o que fica à vista. Ficha de dado mostra dado, quantidade, tipo de dano e ✕; sinal,
  segundo tipo (composto) e opções do dado ficam em "⋯ Mais". Atributo, número, "repetir ×N" e atalhos viram painéis de
  "+ Adicionar" (um aberto por vez); no teste só o atributo fica à vista e combinar, dados a mais/menos, bônus e opções
  entram por "+ Adicionar". Número sem o passo de ±5 e sem abas no mobile. Controles visíveis na janela, medidos por
  `t/contar.js`: Dano padrão 42→24, Dados livres vazio 34→16, Dados livres montado 41→22, Teste 31→23; altura da janela no
  desktop 703→449 px (Dano) e 733→526 px (Teste). Teste de cliques: 0 falhas (desktop e 360×800). Dez fórmulas dos jogadores:
  5 equivalentes, 4 montadas iguais, 1 diverge (a mesma `3D10+36[B]+3D8[Q]` da E3.1). Herda as três divergências por tipo
  herdado da posição da E3.1 (`furtivo+FOR` inclusive, que a E3.2 já corrige). Bateria de 78 fórmulas na E3.3: 35 iguais, 19
  equivalentes, 13 que não monta, 3 que divergem, 5 inválidas no motor e 3 acima do limite do mockup — idêntico à E3.1, como esperado.
  A pergunta "qual versão vai para a spec" foi respondida logo depois: as três entram como variantes de um experimento
  exclusivo de tester (ver "Decisões do autor para a spec", abaixo); o sinal por termo segue pendente.
- **Decisões do autor para a spec (2026-10-02, depois da E3.3):**
  - **Um montador só, experimental e exclusivo de tester.** Hoje a barra de rolagem rápida já restringe o gatilho
    (`restringirMontadorATester="true"` na ficha de jogador, criatura/NPC e cartão de campanha; `podeUsarMontador`
    em `rolagem-rapida.component.ts`). Durante o experimento valem **quatro opções** num seletor só para testers/admin:
    **Atual** (montador de hoje, intocado, só linha de base e descartado no fim), **Essencial** (E3.3), **Completo**
    (E3.1) e **Blocos** (E3.2). A spec deixa explícito que **não ficam quatro montadores**: fica um, talvez com
    preferência de usuário (Completo/Essencial) gravada. Avaliam o autor/admin e testers escolhidos. A **spec do
    montador vencedor e a liberação para todos são do autor**, fora do escopo da spec do experimento.
  - **Recomendações minhas, ainda não confirmadas:** preferência de layout em `localStorage` durante o experimento
    (migration é a única categoria irreversível em produção e a variante pode morrer); gate centralizado em um ponto
    único, com padrão restrito (hoje o padrão do input é `false`, liberado, e um consumidor novo esqueceria a
    restrição), para que liberar depois seja uma mudança só.
  - **Extensão do motor para todos, definitiva** (não é do experimento): quantidade de dados por expressão com
    **qualquer conta** (`+ − × ÷`, parênteses) sobre números, os 10 atributos, `PROF` e `NIV`; a conta vai entre
    parênteses logo antes do `dM` (`((FOR+VIG)*2)d4`) e vale para **qualquer dado**, não só d20. Arredondamento
    **para baixo** (confirmado após a leitura de `:2027-2045`; ver `P-093`). Mantém o limite de 100 dados; divisão
    por zero literal = fórmula inválida; negativos arredondam para baixo (−1,5 → −2). **Correção minha:** eu tinha dito que o
    teste com resultado ≤ 0 "segue a regra atual do motor (2+|n| dados)", mas no código essa desvantagem só vale
    para `ATRdM…kh` (atributo nu); as formas de contagem explícita `(ATR±n)dM`/`(ATR*Y)dM` só travam em 0 dado. A
    escolha para a conta nova ficou como **D1, em aberto**, na spec do motor. A regra
    fica no guia de fórmulas do app (`frontend/src/app/modules/ficha/componentes/guia-formula/`), **não** em
    `docs/core`; a spec corrige só a linha 2045.
  - **UI da conta, opção B:** campo "Dados por expressão" no "+ Adicionar", com leitura ao vivo (`(FOR+VIG)*2 = 14
    dados`); os botões Soma/Média do teste ficam. **Ainda sem mockup** dessa opção no canvas.
  - **Confirmados depois:** o **sinal por termo** entra no núcleo (já está na E3.3 em "⋯ Mais"; a E3.2 do mockup só
    soma e ganha o "subtrair" no produto) e a opção **Atual** é a selecionada por padrão para o tester.

### I-038 — Faxina das imagens órfãs no armazenamento · backend/armazenamento

- Implementada em 2026-09-30: `docs/specs/done/armazenamento-faxina-imagens-orfas.spec.md`. Comando
  `npm run armazenamento:faxinar --workspace=backend -- [--apagar] [--carencia-dias=30]`, simulação por
  padrão, com carência pela data de gravação e trava de sanidade.

### I-037 — Uma constante compartilhada para os MIMEs de imagem · shared/validators

- Implementada em 2026-09-30, a pedido do autor, sem spec própria (troca mecânica):
  `shared/src/validators/imagem.validators.ts` (`IMAGEM_EXTENSAO_POR_MIME`, `IMAGEM_MIMES_PERMITIDOS`,
  `IMAGEM_MIMES_ACCEPT`), usada pelos sete pontos do frontend e pelas três services e o OpenAPI do
  backend. `DOCUMENTO_IMAGEM_MIMES_PERMITIDOS` virou alias.

### I-036 — Título neutro da ficha flutuante fora do combate · frontend/ficha

- Implementada em 2026-09-26, a pedido do autor, logo depois da `m7-24` (sem spec própria: uma
  linha de template e um `computed`). A janela passou de "Ficha do combatente" fixo para
  "Ficha · {nome}", com o nome lido do documento que o conteúdo já carrega (jogador ou criatura).
  Detalhe em `HISTORY.md`.

### I-014 — M9 sugerido: documentos e anotações de campanha · campanha/documentos

- Promovida em 2026-09-21 a `docs/specs/backlog/m9-documentos-campanha.spec.md`. Nasceu do pedido
  do autor de 2026-08-11 (biblioteca de documentos da campanha) e se encontrou com um segundo
  pedido, de 2026-09-21, para que a cena de Investigação do módulo de Cenas
  (`docs/specs/backlog/m7-cenas.spec.md`) pudesse apresentar documentos junto das fichas dos
  jogadores. O upgrade "mesa investigativa/mapa mental" registrado nesta entrada foi levado à spec
  como item de "Fora de escopo", não implementado. Os **cadernos privados**, que já tinham saído
  desta ideia, continuam em
  `docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md`, sem mudança.

### I-028 — Pesquisar na descrição da habilidade · ficha/habilidades

- Promovida em 2026-09-22 a `docs/specs/done/habilidades-busca-descricao.spec.md` (implementada na
  mesma tarefa). Em vez de só ampliar o filtro existente para também casar contra a descrição, o
  autor pediu um controle de 3 opções (Título/Descrição/Ambos) em vez de um toggle binário —
  resolvido com `app-segmentado`, primitivo já existente em `shared/ui/`. Cobre tanto o seletor de
  habilidades da ficha quanto o guia de criação, que reusa o mesmo componente.

### I-027 — Janela externa para histórico de rolagens, anotações da ficha e Caderno · frontend/UX

- Concluída em 2026-09-25, em três fatias (Histórico → Anotações → Caderno), todas via
  `window.open` para rotas isoladas `/janela/...` sobre `JanelaExternaService`
  (`shared/janela-externa/`), um contexto por janela, com o painel local recolhido enquanto a
  janela existe e devolvido ao fechá-la: `docs/specs/done/rolagens-janela-externa.spec.md`,
  `docs/specs/done/i-027-rolagens-janela-contextos.spec.md` (as oito visões do histórico),
  `docs/specs/done/i-027-anotacoes-janela-externa.spec.md` e
  `docs/specs/done/i-027-caderno-janela-externa.spec.md`. A opção C (Document Picture-in-Picture,
  só Chromium) continua descartada como via principal; pode voltar como upgrade opcional.

## Abertas

### I-040 — Tela de acessos mostrar concessão suspensa pela ocultação · frontend/ficha

- **Ideia:** na lista "Acesso de visualização" do dono/mestre, marcar como "suspensa" a concessão
  de uma ficha de jogador oculta, em vez de listá-la igual a uma concessão efetiva.
- **Origem:** `fix-ficha-oculta-concessao-e-leitura` (2026-09-29) — a concessão passou a ficar
  gravada e sem efeito enquanto a ficha está oculta; a spec não pedia mudança na tela de acessos.
- **Por quê:** hoje o dono vê "B tem acesso" enquanto B, na prática, não lê nada; pode achar que
  revogar é necessário ou que a ocultação não funcionou.
- **Custo aparente:** baixo — selo/nota no item quando `ficha.oculta`, sem mudança de contrato
  (o front já sabe se a ficha exibida está oculta).

### I-039 — Salas e presença compartilhadas entre instâncias do backend · tempo real/infra

- **Ideia:** se o backend passar a rodar em mais de uma instância, trocar o estado de tempo real
  que hoje vive na memória do processo por um compartilhado: o adapter do Socket.IO (salas e
  emissão entre instâncias, ex.: `@socket.io/redis-adapter`) **e**, junto, a presença de leitura
  da Biblioteca (`DocumentoLeituraService`, `m9-09`), que é um mapa em memória por processo.
- **Origem:** `m9-09` (2026-09-28), "Fora de Escopo" da spec — a presença foi desenhada para um
  processo único, como as salas.
- **Por quê:** com duas instâncias, o mestre conectado a uma não recebe `documento:alterado` nem
  `documento:leitores` de quem está na outra, e o retrato de presença fica partido ao meio.
- **Custo aparente:** médio — dependência de infraestrutura (Redis ou equivalente), adapter no
  `WsIoAdapter` e a presença movida para o armazenamento compartilhado (com expiração, porque uma
  instância que morre não roda o `handleDisconnect` dos sockets dela). Só vale quando o deploy
  exigir escala horizontal.

### I-035 — Mecânica da cena de Resistência no painel · cenas/regras

- **Ideia:** dar ao painel da cena de Resistência a mecânica do capítulo "⬥ Resistência" de
  `docs/core/sistema-v4.1.0.md` — Atributo Principal, DT inicial móvel, Limiar de sucessos e
  fracassos, "três falhas removem um sucesso" e "um crítico remove um fracasso" —, com a regra em
  `shared/regras/cena` e o painel só apresentando o placar.
- **Origem:** `m7-24` (2026-09-26), que entregou só a casca do painel sem iniciativa e deixou a
  mecânica fora de escopo, no mesmo tratamento que a decisão #10 do milestone `m7-cenas` deu a
  Furtiva e Perseguição.
- **Por quê:** hoje a Resistência é um painel de agentes + Rolagens; o mestre conduz o Limiar de
  cabeça. O placar é exatamente o estado que a mesa perde entre uma rolagem e outra.
- **Custo aparente:** estado próprio da cena (JSONB ou tabela), endpoint e evento de tempo real,
  motor puro com testes e um bloco no palco — uma task de backend e uma de frontend.

### I-034 — Testes de repositório contra um Postgres real · backend/banco

- **Ideia:** uma suíte pequena de integração que rode os repositórios (`*.repository.ts`) contra um
  Postgres de verdade com as migrations aplicadas, para que CHECK, FK, `NOT NULL` e índices únicos
  participem do teste — hoje todo teste de backend mocka o repositório.
- **Origem:** `P-076` (2026-09-24). A rolagem rápida do mestre gravava ficha e combatente nulos e o
  CHECK `chk_rolagem_origem` recusava toda linha; o teste da service passava porque o repositório
  era mock. Só a verificação ao vivo achou o defeito, um dia depois do commit.
- **Por quê:** mudança de service que cria uma combinação nova de colunas não tem hoje nenhum gate
  automático contra o schema real; o defeito só aparece no navegador ou em produção.
- **Custo aparente:** infraestrutura de teste (Postgres efêmero no CI, banco de teste isolado,
  `db:migrate` antes da suíte, limpeza entre casos) e uma convenção de quais repositórios cobrir.
  Nenhuma mudança de produto.

### I-030 — Log de iniciativa: retomar em outro formato · encontro/iniciativa

- **Ideia:** reconstruir uma trilha de eventos do combate (dano sofrido e de quem veio, gasto de
  Energia, condição aplicada, virada de rodada) em um formato mais legível do que o painel
  granular por turno que existiu antes — hoje a feature foi removida por completo do frontend, não
  só escondida.
- **Origem:** o painel `LogEncontro` (m7-07) tinha ficado oculto "por enquanto" desde a revisão da
  `ui-33` (achado 3ª/4ª rodada, `CONTEXT.md`) — nesta conversa (2026-09-13) o autor decidiu que o
  controle fino por rodada/turno "vai gerar mais confusão do que ter ele" e pediu a remoção
  completa (não só ocultar): `LogEncontro` e seu uso em `IniciativaLeitura` (Painel do espectador +
  Prévia de jogador) saíram do código.
- **Por quê:** mestre e jogadores ainda podem querer uma trilha do que aconteceu no combate, mas o
  formato anterior (marcador de rodada/turno, revelação progressiva, uma linha por evento) provou
  ser granular demais para o uso real — vale repensar o formato (ex.: resumo por rodada, agrupado
  por combatente) antes de reconstruir, em vez de reativar o mesmo desenho.
- **Custo aparente:** o backend permanece intacto — tabela `encontro_evento` (migration `0021`) e a
  gravação de eventos em `EncontroService` (dano, cura, energia, condição aplicada/expirada, rodada
  iniciada, estado alterado) continuam funcionando e alimentando `EncontroRecuperadoDto.eventos`,
  só sem consumidor no frontend. Uma reconstrução seria majoritariamente frontend (componente(s)
  novo(s) de apresentação), a não ser que o novo formato exija um recorte diferente dos dados que o
  backend já grava.

### I-029 — Extrair o bloco de Identidade de `FichaVisualizacao`/`FichaCampanhaCard` · frontend/ficha

- **Ideia:** dos três blocos que esta ideia originalmente cobria, dois já saíram — `FichaReacoes` e
  `FichaResistencias` (2026-09-22, sem spec própria, ver `HISTORY.md`). O bloco de **Identidade**
  (nome/contrato, avatar com recorte de enquadramento, editor de classe/arquétipo, modal de Origem)
  continua duplicado byte a byte entre os dois componentes — deliberadamente **não** extraído nesta
  rodada: ao contrário de Reações/Resistências (grid de dados + um booleano), Identidade carrega
  uma dúzia de sinais de edição locais (`editandoIdentidade`, `corFichaForm`,
  `enquadramentoOrigem`, `arquivoPendente`, `editandoClasse`, `rascunhoClasse`, `editandoOrigem`,
  `rascunhoOrigem`...) e métodos de confirmar/cancelar para cada um — uma extração seria bem maior
  e mais arriscada do que o resto da ideia original previa.
- **Origem:** item 2 da spec `ficha-separar-completa-e-campanha-card` (`docs/specs/done/`); revisada
  em 2026-09-22 a pedido do autor, que fechou Reações/Resistências e decidiu adiar Identidade dado
  o tamanho do acoplamento encontrado ao investigar.
- **Por quê:** mesma razão original — a duplicação arrisca as duas cópias divergirem de verdade num
  ajuste futuro que toque só uma; agora é o único dos três blocos que ainda duplica.
- **Custo aparente:** maior do que o resto da ideia original — 1 componente novo, mas com um output
  por campo editável (nome/contrato/nível/prestígio/cor/imagem/classe/arquétipo/origem) e a
  migração do modal de Origem (`app-modal`) e do recorte de enquadramento
  (`app-ajuste-enquadramento-imagem`) para dentro dele.
- **Investigação 2026-09-22 (sem implementação — decisão do autor foi só discutir, não tocar código):**
  confirmado no HTML real que o bloco `Identidade` propriamente dito é menor que o `<section>` que o
  hospeda em cada componente (`ficha-cartao--identidade` em `FichaVisualizacao`, linhas 77–1061;
  `ficha-cartao` em `FichaCampanhaCard`, linhas 86–946) — em ambos, uma fatia grande do `<section>`
  (Vitalidade/Saúde) é vitals coladas por layout, não Identidade de verdade. O trecho de
  avatar+cor+enquadramento é **byte-idêntico** nos dois arquivos; os nomes de signal (`editandoClasse`,
  `rascunhoClasse`, `corFichaForm`, `arquivoPendente`, `enquadramentoOrigem`, `editandoOrigem`,
  `rascunhoOrigem`) também batem 1:1 no TS dos dois componentes. **Achado novo**, não registrado antes:
  a ordem diverge entre os dois — `FichaVisualizacao` põe Personalidade/Origem **depois** da
  Vitalidade (rodapé full-width do card); `FichaCampanhaCard` põe **antes** (dentro da coluna do
  avatar). Isso significa que uma extração não pode assumir "um bloco fechado idêntico nos dois
  lugares" — precisaria expor Personalidade/Origem como projeção separada (`ng-content`/sub-
  componente) pra cada pai manter sua própria ordem, ou unificar a ordem visualmente num dos dois
  (decisão de produto, não só refactor). Nenhuma das duas opções foi escolhida — fica para quando a
  ideia for retomada para implementação.

### I-023 — Gate automático de convenções no CI · processo/qualidade

- **Ideia:** executar o passe mecânico de `convencoes-check` automaticamente no CI para avisar sobre violações novas antes do merge, preservando a classificação manual para falsos positivos e regras semânticas.
- **Origem:** `skills-08-convencoes-check.spec.md` (2026-08-27), que entrega o passe local mas mantém o gate de CI fora de escopo.
- **Por quê:** o passe depende de ser lembrado no fecho; uma checagem automatizada reduziria a regressão das proibições detectáveis sem fingir que substitui revisão humana.
- **Custo aparente:** script estável com allowlist versionada, integração em GitHub Actions e política para diferenciar dívida preexistente de linha nova.

### I-001 — Campanha com status, briefing e log de atividade · campanha

- **Ideia:** dar à campanha os elementos que os protótipos aprovados já desenham mas o sistema não
  tem: **status** (ao vivo / agendada / pausada), um **briefing** textual, um **log de atividade** e
  um **indicador de membro online**.
- **Origem:** `m2-09` e `m2-15` — esse conteúdo aparece em `docs/design/examples/` e foi
  deliberadamente deixado de fora das duas tasks por não existir dado real que o alimentasse.
- **Por quê:** hoje a tela de campanha mostra pouco mais que nome, descrição e membros. Estes quatro
  elementos são exatamente o que transformaria a lista em um painel com informação de verdade — e o
  desenho deles já foi aprovado.
- **Custo aparente:** schema novo em `campanha` (status, briefing) e provavelmente uma tabela de
  eventos para o log. O indicador online sai de graça do gateway WebSocket que já existe. As specs
  `m2-18`/`m2-19`/`m2-20` do backlog atacam a mesma tela e podem absorver parte disto.

### I-002 — Passe de redução do bundle inicial · frontend

- **Ideia:** auditar o que está no chunk inicial do frontend e empurrar para lazy o que não é
  necessário no primeiro paint, em vez de continuar elevando o budget.
- **Origem:** observação recorrente ao longo de `m1-06`…`m3-27` — ver `PROBLEMS.md` `P-004`.
- **Por quê:** o budget já subiu quatro vezes. Ele deixou de ser um limite e virou um registro do
  que aconteceu, o que anula a razão de existir dele.
- **Custo aparente:** só frontend, sem schema nem regra. Provavelmente uma task de meio dia com
  `source-map-explorer` na frente.

### I-003 — Registrar trabalho que chega por PR sem passar pelo fluxo de spec · processo

- **Ideia:** decidir o que fazer com trabalho vindo de branches `claude/*` mergeadas por PR, que
  hoje não atualiza documentação nenhuma. Ou o merge passa a exigir o registro, ou fica explícito
  que essa via é não-documentada.
- **Origem:** `PROBLEMS.md` `P-002` — 11 commits reais entraram sem registro depois da `m3-27`.
- **Por quê:** o `HISTORY.md` só vale se for completo. Um histórico com buracos silenciosos é pior
  que um histórico assumidamente parcial, porque ninguém sabe onde estão os buracos.
- **Custo aparente:** zero de código. É uma decisão de processo — possivelmente uma linha no
  `CLAUDE.md` ou um item no template de PR.

### I-004 — Venda de Fragmentos na ficha · ficha/fragmentos

- **Ideia:** dar ao inventário da ficha um botão "Vender" num fragmento portado, usando o cálculo de
  `shared/regras/compras/venda.ts` (`obterValorFragmento`/`calcularVendaFragmentos`) que já existe e
  já é testado — hoje só está acoplado à calculadora M1 de criação de personagem.
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — a regra e a tabela de preços existem, só
  não há caminho de UI na ficha viva.
- **Por quê:** um agente em campanha acumula fragmentos que não pretende usar; hoje a única forma de
  convertê-los em dinheiro é sair da ficha e recalcular na tela de criação.
- **Custo aparente:** só frontend — reusar `venda.ts` (`shared`) e o padrão de painel de ação já
  usado por "Aplicar em..."/"Consumir" (`ficha-inventario.component.ts`).

### I-005 — Identificação de Poder de fragmentos · ficha/fragmentos

- **Ideia:** modelar o estado "fragmento não identificado" e o teste de Intelecto (DT 15 + 5 por
  módulo acima de V) que o doc exige para revelar o que um fragmento faz.
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — hoje todo fragmento nasce "identificado":
  módulo, tipo e função ficam visíveis assim que o item existe na ficha.
- **Por quê:** é uma peça de suspense/risco do sistema original (o doc — "⬥ Identificação de Poder")
  que a implementação atual pula inteiramente, achatando a descoberta de fragmentos a uma decisão
  sem custo.
- **Custo aparente:** schema (flag `identificado` no item + módulo/tipo "ocultos" até então) e UI de
  teste — médio, mexe em como o item é exibido antes/depois de identificado.

### I-006 — Auto-desacoplamento e redução de módulo ao perder uso · ficha/fragmentos

- **Ideia:** quando o item hospedeiro de um fragmento Potencializador "perde seu uso" (destruído/
  quebrado/gasto — o doc não define o gatilho exato para itens não-consumíveis), o fragmento deveria
  se desacoplar sozinho e cair 1 módulo, mantendo o custo de Energia do módulo antigo.
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1934`.
- **Por quê:** hoje um fragmento acoplado fica preso ao item para sempre (só remoção manual), e a
  ficha não rastreia "uso"/durabilidade de item nenhum — implementar isso exigiria primeiro decidir
  o que "perder o uso" significa mecanicamente para itens não-consumíveis, o que o doc não deixa
  claro e não deveria ser decidido de forma isolada.
- **Custo aparente:** precisa de uma primitiva de "durabilidade/uso de item" que não existe hoje —
  provavelmente maior que qualquer outra peça isolada de fragmentos.

### I-007 — Colapso e transformação em criatura · ficha/fragmentos

- **Ideia:** a cadeia final da Afinidade — morrer em Anomalia Biológica leva a "Colapso", e o
  agente se transforma numa criatura conforme a faixa de Afinidade (Ameaça Baixa a Apocalíptica).
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1962-1968`. A
  `m3-67` cobre o Limite Mínimo de Energia e a Anomalia Biológica, mas para explicitamente antes
  desta parte.
- **Por quê:** é essencialmente "fim da ficha de jogador" — sai do modelo de ficha de agente para
  algo parecido com ficha de criatura/NPC (`m4-ficha-criatura-npc.spec.md`, ainda backlog). Faz mais
  sentido revisitar quando aquele milestone existir de verdade, em vez de modelar uma transformação
  para um sistema que ainda não tem forma.
- **Custo aparente:** alto — depende de `m4` existir primeiro.

### I-008 — Forja de Fragmentos e Fragmento Módulo ∅ · ficha/fragmentos

- **Ideia:** um local de base (Forja) onde combinar N fragmentos de um módulo em 1 de módulo
  superior, e a receita especial do Fragmento Módulo ∅ (propriedades negociadas com o Mestre).
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1990-2005`.
- **Por quê:** é um sistema de crafting inteiro (gate de patente, consumo de N itens, custo em
  dinheiro, uma tela/local novo) que não cabe dentro do componente de inventário atual — mais perto
  de merecer sua própria spec de UI (tela de "Base"/LDA) do que de ser espremido na ficha.
- **Custo aparente:** alto — motor (fácil, tabela de proporções) + UI nova (uma tela de base que
  ainda não existe no app).

### I-009 — Redução de Módulo de fragmentos · ficha/fragmentos

- **Ideia:** as duas formas do doc de reduzir o módulo de um fragmento: via uso em item consumível
  (ex.: granada — reduz 1 módulo, mas mantém o custo de Energia do módulo acima) e via redução
  sintética no LDA (patente Força Tarefa+, 50% do valor de venda + espera de uma missão, gera 2
  fragmentos do módulo inferior).
- **Origem:** auditoria de fragmentos (`m3-63`…`m3-67`) — doc `sistema-v4.1.0.md:1982-1988`. Chegou
  a ter uma spec dedicada (`m3-68`), removida do backlog por decisão do autor.
- **Por quê:** a via do item consumível é cálculo puro simples, mas a via do LDA depende de "esperar
  uma missão" — conceito que não existe em nenhum outro lugar do app hoje (sem sistema de missões).
  Modelar isso exigiria inventar uma simplificação (ex.: liberação manual pelo Mestre) sem um
  sistema de missão real para ancorar a decisão.
- **Custo aparente:** médio — motor fácil (duas funções puras + tabela de custo do LDA reusando
  `venda.ts`); a parte incerta é a UI/estado da espera do LDA sem um sistema de missão existente.

### I-010 — Granularidade na permissão de visualização de ficha · ficha/acesso

- **Ideia:** hoje o "Acesso de Visualização" (`FichaAcessoResumoDto`, m3-04) é binário — quem
  recebe acesso vê a ficha inteira (exceto `CAMPOS_PRIVADOS_FICHA`, sempre omitidos) ou não vê
  nada. Dar ao dono/mestre controle mais fino sobre o que cada concessão libera (ex.: só
  status/vitalidade, sem inventário/anotações; ou histórico/identidade escondidos de alguns
  membros).
- **Origem:** pedido do autor ao revisar o menu "⋯" do painel de campanha (2026-08-08) — junto do
  pedido de trazer as ações de ficha (remover/excluir) e o "Acesso de visualização" para fora da
  ficha completa, para o painel do jogador (ver
  `docs/superpowers/specs/2026-08-08-painel-jogador-acoes-ficha-design.md`).
- **Por quê:** a granularidade atual força tudo-ou-nada; um dono que quer compartilhar só parte da
  ficha (ex.: vitalidade para o grupo, mas não o histórico pessoal) não tem opção hoje.
- **Custo aparente:** médio-alto — schema (uma concessão precisaria guardar quais seções/campos
  libera, não só o `usuarioId`) + UI de seleção nos dois lugares que hoje mostram a dialog de
  acesso (`visualizar.page` e, desde este pedido, `campanha/detalhe.page`) + `validarPermissaoVisualizacao`
  no backend teria que aplicar o recorte por seção, não só por `CAMPOS_PRIVADOS_FICHA` fixo.

### I-012 — Foto de contrato, separada do avatar do jogador · ficha/avatar

- **Ideia:** um segundo campo de imagem na ficha, a "foto de contrato" — só o **mestre** define/
  troca essa foto (nunca o dono), distinta do avatar (`imagem_url`, `m3-62`) que o **jogador**
  escolhe e que todo mundo vê hoje. As duas convivem na mesma ficha, com dono de escrita diferente.
- **Origem:** pedido do autor logo após a `m3-62` (avatar da ficha) entrar no ar.
- **Por quê:** hoje só existe um avatar, editável por dono ou mestre — não há como o mestre registrar
  uma imagem "oficial"/de dossiê sem sobrescrever a que o próprio jogador escolheu (ou vice-versa).
- **Custo aparente:** médio — reusa a maior parte do que a `m3-62` já construiu (armazenamento,
  validação de MIME/tamanho, endpoint multipart), mas precisa de uma segunda coluna
  (`ficha.imagem_contrato_url`?), um segundo par de endpoint dedicado com permissão **mestre-only**
  (distinta de `validarPermissaoEdicao`, que hoje deixa dono e mestre editarem igual) e decidir onde
  ela aparece na UI (cabeçalho? aba própria?) — ainda não especificado.

### I-015 — M10 sugerido: assistência por IA · inteligência artificial

- **Ideia:** integrar assistência de IA — possivelmente como M10 — em diferentes pontos do produto:
  no guia de criação de personagem, como ajuda para dúvidas sobre o sistema e como ferramenta de
  escrita e preparação para o mestre.
- **Origem:** conversa com o autor em 2026-08-11, ao levantar módulos futuros para a plataforma.
- **Por quê:** uma assistência contextual pode reduzir a barreira de entrada nas regras, apoiar a
  criação de personagens e acelerar a preparação de campanhas, aproveitando os documentos do
  sistema e o contexto que já existe na plataforma.
- **Custo aparente:** alto e ainda exploratório — integração com provedor, desenho de contexto e
  permissões, custos e limites de uso, privacidade dos dados da campanha, prevenção de respostas
  incorretas sobre regras e UX específica para cada caso. Provedor ainda não definido (Gemini,
  OpenAI ou outro); também falta decidir se será uma experiência única ou recursos independentes.
  A numeração M10 é sugestão, não decisão de roadmap.

### I-016 — M11 sugerido: tabletop virtual e biblioteca de tokens · campanha/mapa

- **Ideia:** criar um tabletop virtual — possivelmente como M11 — no qual o mestre possa montar ou
  carregar um mapa e posicionar, mover e gerenciar os tokens dos participantes da cena. Cada agente
  teria uma biblioteca própria de imagens de token, com upload de múltiplas opções e seleção do
  token que será exibido no tabletop em cada momento.
- **Origem:** conversa com o autor em 2026-08-11, ao levantar módulos futuros para a plataforma.
- **Por quê:** o controle de cenas e iniciativas organiza o estado narrativo e mecânico, mas ainda
  deixa a representação espacial fora do sistema. Um tabletop integrado permitiria conduzir
  posicionamento e movimentação usando diretamente as fichas, cenas e participantes da campanha;
  múltiplos tokens por agente também cobririam mudanças de aparência, equipamento ou estado sem
  substituir permanentemente a imagem principal da ficha.
- **Custo aparente:** muito alto — canvas ou superfície interativa, upload e armazenamento de mapas
  e tokens, associação dos tokens às fichas, sincronização em tempo real, controles de zoom e
  movimentação, permissões e UI de mestre/jogador. Ainda precisa decidir suporte a grade e medidas,
  camadas, obstáculos, áreas, névoa de guerra/visibilidade, vínculo com cenas e iniciativa, quem pode
  mover cada token e se a escolha do token ativo pertence ao jogador, ao mestre ou a ambos. Também
  precisa definir limites e tratamento das imagens enviadas. A numeração M11 é sugestão, não decisão
  de roadmap.

### I-017 — M12 sugerido: Base, esquadrões e histórico operacional · campanha/organização

- **Ideia:** representar a estrutura institucional da Fundação acima das campanhas: uma **Base da
  Fundação** contém **esquadrões**; um esquadrão reúne seus **agentes** e possui um histórico de
  **missões/campanhas**. A experiência seria inicialmente mais documental e histórica do que
  mecânica, dando uma existência concreta ao Esquadrão 251 e à trajetória de suas operações, em vez
  de transformar a Base desde o começo num conjunto de loja, enfermaria, reparos e outros serviços.
- **Origem:** conversa com o autor em 2026-08-11, ao refinar a sugestão de uma possível M12.
- **Por quê:** hoje o esquadrão existe implicitamente dentro da campanha, e a ficha do agente não
  informa a qual esquadrão ele pertence. Isso inverte a hierarquia percebida: conceitualmente, a
  Base contém o esquadrão, o esquadrão reúne agentes e participa de missões ou campanhas. Tornar essa
  estrutura explícita cria identidade coletiva, preserva o histórico entre operações e permite
  acompanhar o esquadrão mesmo quando campanhas acabam ou agentes mudam.
- **Custo aparente:** médio-alto — novas entidades/relacionamentos para Base e Esquadrão, vínculo e
  histórico de participação dos agentes, reorganização da navegação e migração do conceito hoje
  implícito em campanha. O primeiro corte pode ser essencialmente documental: identidade da Base e
  do esquadrão, membros atuais e antigos, campanhas/missões associadas e linha histórica. Serviços
  mecânicos da Base não fazem parte do núcleo e poderiam ser upgrades independentes.
- **Decisões abertas:** definir se “campanha” e “missão” são a mesma entidade em durações diferentes
  ou se a campanha contém missões; se um agente pode mudar de esquadrão preservando histórico; se
  uma campanha pode envolver mais de um esquadrão; e se o vínculo pertence à ficha, ao usuário ou a
  uma participação histórica própria. Embora chamada provisoriamente de M12, a ideia também pode ser
  tratada como uma ampliação tardia da M2. A numeração indica agrupamento de escopo, não dependência:
  M7–M12 podem ser executadas em outra ordem — por exemplo, IA não depende obrigatoriamente de
  documentos.

### I-022 — Caderno: importar em lote, arrastar-e-soltar e exportar `.md` · campanha/caderno

- **Ideia:** depois da importação de **um** arquivo Markdown por vez
  (`docs/specs/done/caderno-importar-markdown.spec.md`), ampliar o trânsito de arquivos do
  Caderno: selecionar vários `.md` de uma vez (uma página por arquivo), arrastar-e-soltar arquivos
  sobre a janela do Caderno, e o caminho inverso — exportar uma página (ou o caderno inteiro) como
  `.md`/`.zip`.
- **Origem:** recortado explicitamente do escopo de `caderno-importar-markdown.spec.md` (2026-08-25),
  para a primeira entrega ficar em um fluxo só.
- **Por quê:** quem já mantém notas fora do sistema (Obsidian, pasta de `.md`) traz um diretório
  inteiro, não um arquivo; e sem exportação o conteúdo entra no Caderno mas não sai dele.
- **Custo aparente:** só frontend. Lote pede resultado por arquivo (sucesso/erro parcial) e algum
  indicador de progresso; arrastar-e-soltar pede zona de soltura e estados de hover na janela
  flutuante; exportação de caderno inteiro pede empacotamento no navegador. Nenhuma mudança de
  schema, endpoint ou contrato.

---

## Descartadas

Ideias consideradas e recusadas, com o motivo. Serve para não voltarem sozinhas.

*(Nenhuma ainda.)*
