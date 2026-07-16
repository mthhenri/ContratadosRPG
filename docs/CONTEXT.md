# CONTEXT.md — Estado Atual do Projeto

> Última atualização: 2026-07-15 (**m3-13++ — refinamentos do seletor + confirmar remoção na Sanidade**:
> no `FichaHabilidadeSeletor`, o **"＋" agora adiciona a habilidade direto na ficha** (o diálogo
> **permanece aberto**) e a marca **"Na ficha ✕"** (o ✕ ali mesmo a remove) — dá para montar a lista
> inteira sem fechar; as **gerais melhoradas** ganharam **selo** (não se misturam mais às do arquétipo);
> a lista virou **2 colunas** com **fade topo/base** (`appOverflowFade`, mesmo recurso das listas da
> calculadora) e o diálogo ficou **menos comprido** (teto 600px). O parent `FichaHabilidades` trocou o
> fluxo "pré-preenche editor" por **`aoAdicionarDoCatalogo`** (grava direto, com `origem`) +
> **`aoRemoverDoCatalogo`** (por nome). Na aba **Sanidade** (`FichaSanidade`), remover
> sequela/trauma/lesão agora pede **confirmação inline** (mesmo padrão de `FichaHabilidades`). Testes:
> frontend **273** (habilidades: add/remove direto + custo variável; sanidade: gate de confirmação),
> `lint`/`build` verdes (bundle **569,77 kB**). **Verificação de render ainda pendente** — validado por
> testes/build.)
>
> (**m3-13+ — habilidades do sistema na ficha**: a aba **Habilidades**
> passou a permitir **adicionar habilidades do catálogo do sistema**, não só texto livre. Novo dado
> puro em `shared/regras/agente`: `habilidades-catalogo.dados.ts` (as ~224 habilidades do
> `sistema-v4.1.0.md` — Gerais, Classe, Arquétipo, Gerais Melhoradas e Subclasses de Experimento,
> desnormalizadas) + `habilidades-catalogo.ts` com a função pura **`catalogoHabilidades(classe,
> arquetipo)`** que resolve os grupos de filtro do seletor: **Gerais** sempre; **Classe** entre as três
> classes-base (a da ficha em `ehDaFicha`, omitida p/ Civil); **Arquétipo** só os arquétipos da classe
> da ficha (o Experimento entra como **subclasse**; Gerais Melhoradas só do **próprio** arquétipo;
> outras subclasses **nunca** aparecem). +7 testes shared (181). Enum `HabilidadeCategoriaEnum` ganhou
> **`ESPECIALIDADE`** (categoria só-criada, como Personalidade); `FichaHabilidadeDto` ganhou o campo
> opcional **`origem`** (classe/arquétipo-fonte, dentro do JSONB — sem schema relacional novo). UI: novo
> **`FichaHabilidadeSeletor`** (modal com abas + **sub-filtro inline** de chips, o da ficha destacado
> com ponto accent e ativo por padrão, + busca; item já na ficha esmaecido "Na ficha"); escolher
> pré-preenche o editor inline (com a `origem`) para revisar antes de salvar. `FichaHabilidades` ganhou
> os botões **"＋ Do sistema"** / **"＋ Personalizada"**, o botão **⚡ Utilizar** por habilidade (custo
> fixo gasta a Energia direto; custo variável `[X E]` abre mini-campo perguntando quanto — a Energia
> **pode negativar**, reusa o `ajusteVitalidade` de m3-10) e o **chip com origem** ("Classe -
> Especialista" quando é de outra classe/arquétipo; cor por categoria, **Personalidade = accent do
> tema**). +6 testes frontend (270). `lint`/`build` verdes (bundle **569,77 kB**). Design em
> `docs/superpowers/specs/2026-07-14-habilidades-do-sistema-design.md`; stub visual conferido.
> **Verificação de render pendente** — validado por testes/build, não dirigido no navegador ainda.)
>
> (**m3-13 — editor de Habilidades no próprio lugar**: preenche a aba
> **Habilidades** (m3-11), antes um placeholder "em construção", com o CRUD da lista `habilidades` do
> `dados` (`FichaHabilidadeDto` — `{ nome, categoria (HabilidadeCategoriaEnum), custoEnergia (número|0|null),
> descricao }`). **Novo componente standalone `FichaHabilidades`** (`componentes/ficha-habilidades/`):
> input `habilidades`/`editavel`, output **`habilidadesMudou`** que emite a **lista inteira** a cada
> mutação. **Controlado** — a lista vem sempre do input; o componente só guarda o **rascunho transitório**
> do formulário (Reactive Forms, sem `ngModel`). **Um editor por vez** (`indiceEmEdicao`, `-1` = adicionar);
> um `<ng-template>` reusado entre **adicionar** e **editar** (`ngTemplateOutlet`). Campos: `nome`
> (obrigatório — única validação de forma), `<select>` de **categoria** (as 8 chaves do enum, com rótulos
> legíveis vindos do **shared** — novo `ROTULOS_HABILIDADE_CATEGORIA` ao lado do enum, fonte única), custo
> de Energia (stepper −/+ com piso 0 + checkbox **"Variável"** → persiste `custoEnergia: null`), `descricao`
> (textarea). Cada card exibe chip da categoria, o custo em notação do documento (`[N E]`/`[0 E]`/`[X E]`
> para `null`) e a descrição. **Remover com confirmação inline** (padrão do projeto — `indiceRemovendo`,
> área "Remover X?" Sim/Não; não usa `window.confirm`). Sem catálogo tipado (a ficha guarda a habilidade
> desnormalizada, contrato m3-01) e sem trava de regra (liberdade total, m3-10). Cada mutação sobe pela
> nova saída **`ajusteHabilidades`** do `FichaVisualizacao` (que agora embute o `FichaHabilidades` na aba,
> substituindo o placeholder + resumo read-only) e a `visualizar.page` (`ajustarHabilidades`) troca
> `dados.habilidades` inteira — **otimista** + persistência **em lote** (mesmo `alterarFicha` debounced de
> m3-10). Handler **trivial**, sem cascata/progressão: o custo de Energia é só registro (fora de escopo o
> efeito mecânico em play, como pré-requisitos/catálogo por classe). Só tokens do tema (proibição #29 — card
> e stepper `.ficha-passo` espelham o `FichaSanidade` de m3-12); nenhuma fórmula de jogo nova. **+10 testes**
> (Vitest, **frontend 266/266**): `ficha-habilidades.spec` (8 — read-only sem botões com chip/custo `[X E]`,
> adicionar aparando nome/descrição, nome vazio não emite, editar, custo variável persiste `null`, editar
> variável semeia a caixa marcada, stepper piso 0, remover só após confirmação), `ficha-visualizacao.spec`
> (aba Habilidades embute o editor e propaga `ajusteHabilidades`; o teste antigo de "em construção" passou a
> cobrir só Rolagens) e `visualizar.page.spec` (+1 — habilidades otimista + PUT em lote). `lint`/`build`
> verdes (bundle inicial **569,77 kB** dentro do budget de 575 kB — o editor mora na chunk lazy
> `visualizar-page`, agora 112,63 kB). Spec `m3-13` → `done/`. **M3 avança: 3 das 4 sub-coleções da ficha
> agora têm editor (Sanidade m3-12, Habilidades m3-13); faltam Inventário (m3-14) e presets de Rolagem
> (m3-15).** Sessão anterior (2026-07-14, **m3-12 — editor de Sanidade no próprio lugar**: preenche a aba
> **Sanidade** (m3-11) com o CRUD das três listas de `estado` — **sequelas** (temporárias), **traumas**
> (permanentes, tratáveis) e **lesões** (removem pontos de atributo) —, antes só read-only (m3-07).
> **Novo componente standalone `FichaSanidade`** (`componentes/ficha-sanidade/`): inputs
> `sequelas`/`traumas`/`lesoes`/`editavel`, output **`sanidadeMudou`** que emite o **trio inteiro** a cada
> mutação. **Controlado** — as listas vêm sempre dos inputs; o componente só guarda o **rascunho
> transitório** do formulário (Reactive Forms, sem `ngModel`), nunca uma cópia das listas: assim a
> persistência otimista + reconciliação do backend fluem sem dessincronizar. **Um editor por vez**
> (`listaEmEdicao`/`indiceEmEdicao`, `-1` = adicionar); um `<ng-template>` por lista é reusado entre
> **adicionar** e **editar** (`ngTemplateOutlet`). **Sequelas/Traumas** = `{nome, descricao?}` (+ `tratado`
> no trauma, com **toggle "Tratado" in loco** — o trauma permanece, só a penalidade cai, `sistema-v4.1.0`);
> **Lesões** = `{atributo (select das 10 chaves), severidade (SeveridadeLesaoEnum), pontos (stepper −/+
> com piso 0), permanente (checkbox)}`, exibindo o **efeito derivado** "−N Atributo (permanente)" (não
> persistido). Trocar a severidade **sugere** os pontos de origem (LEVE 1 / GRAVE 3 / MORTAL 5) — sugestão,
> **não trava** (liberdade total, m3-10; nome obrigatório é a única validação de forma). Cada mutação sobe
> pela nova saída **`ajusteSanidade`** do `FichaVisualizacao` (que agora embute o `FichaSanidade` na aba,
> substituindo a lista read-only; a antiga `marcasSanidade` saiu e o contador `totalMarcas` passou a somar
> os três `length`) e a `visualizar.page` (`ajustarSanidade`) troca os três blocos em `estado` de uma vez,
> **otimista** + persistência **em lote** (mesmo `alterarFicha` debounced de m3-10). Só tokens do tema
> (proibição #29 — o padrão de "marca" com borda colorida à esquerda espelha o read-only de m3-11; stepper
> `.ficha-passo` copiado); nenhuma fórmula de jogo nova. Fora de escopo (mantido): **aplicar
> mecanicamente** o efeito de lesão/trauma nos derivados (o autor edita os `derivados` direto — m3-10) e o
> **limite por Vontade** como trava (só o documento; aqui nem aviso). **+10 testes** (Vitest, **frontend
> 252/252**): `ficha-sanidade.spec` (8 — read-only sem botões, adicionar sequela emitindo o trio, nome
> vazio não emite, editar trauma, alternar tratado in loco, remover lesão, sugestão de pontos por
> severidade + stepper com piso + efeito derivado, adicionar lesão), `visualizar.page.spec` (+1 — edição de
> Sanidade otimista + PUT em lote) e `ficha-visualizacao.spec` (o teste da aba Sanidade passou a ler
> `.sanidade__nome`). `lint`/`build` verdes (bundle inicial **568,16 kB** dentro do budget de 575 kB — o
> editor mora na chunk lazy `visualizar-page`). **Verificado por render** (Playwright/Chromium sobre o build
> de desenvolvimento, sessão + REST mockados): como **mestre**, a aba Sanidade mostra os três grupos
> (Sequelas/Traumas/Lesões) com "＋ Adicionar", a sequela "Insônia" e o trauma "Pânico" (com toggle
> TRATADO), o **editor de lesão** com selects de Atributo/Severidade + stepper de Pontos + Permanente, e
> **adicionar "Vertigem" aparece na hora** (otimista) na lista de sequelas; a barra de abas confirma **uma
> só aba ativa** (aria-selected único); **zero erros de app** (só o socket sem gateway → selo offline).
> **Refino pós-entrega (a pedido do autor): efeito mecânico das lesões no atributo + aba renomeada.** A
> aba **Sanidade** virou **"Sanidade & Lesões"** (id `sanidade` mantido — deep-link estável; título do
> card idem). As **lesões passaram a impactar o atributo efetivo** — nova regra pura
> `shared/regras/agente/lesao.ts` (`somarLesoesAtributo`/`calcularAtributoEfetivo`/
> `calcularAtributosEfetivos`), conferida contra `sistema-v4.1.0.md` ("⬡ Lesões": cada ponto de lesão
> remove 1 do atributo; Leve 1 / Grave 3 / Mortal 5), **sem piso — o efetivo pode negativar** (ver 3ª
> rodada do refino, abaixo). **Princípio-chave: o valor base
> (`atributos`) nunca é mutado — o efetivo é derivado.** Consequência (concern explícito do autor): a
> **Maestria sobrevive à lesão** — ela é validada sobre o **base** (`maestriaValida`), então FOR 6 com
> Maestria que toma −1 mostra **5** mas **mantém a estrela** (o backend segue aceitando a Maestria; nada
> a revalidar). Os **Atributos (leitura)** exibem o **efetivo + badge "−N"** (accent) + leve tinta no box
> lesionado; **edição/rascunho e a Maestria seguem no base**.
>
> **Lesões PERMANENTES cascateiam para todos os cálculos (2ª rodada do refino, a pedido do autor).** O
> documento ("⬥ Lesões Permanentes") é explícito: *"ter uma lesão permanente irá afetar qualquer cálculo
> que utilize este atributo — Vigor removeria vida e inventário; Destreza, deslocamento e energia."* — ao
> contrário da temporária, que (linha "lesão em atributo de cálculo de saúde não afeta os mesmos") **não**
> reduz Vida/Energia. Implementado assim: no `ajustarSanidade` da `visualizar.page`, calcula-se o atributo
> efetivo **só pelas lesões permanentes** (`calcularAtributosEfetivos(base, lesões.filter(permanente))`)
> **antes vs. depois** da edição; se mudou, roda a **mesma progressão por delta de m3-10**
> (`aplicarProgressao`) usando esses efetivos como entrada — máximas (Vida/Energia) **e** todos os
> derivados stored acompanham a variação, preservando ajustes manuais. O valor **base** continua
> intocado, então a **Maestria sobrevive** mesmo à permanente. A **temporária** segue só reduzindo o
> atributo efetivo exibido (badge "−N"); os `derivados` dela seguem manuais (m3-10). O box de Atributos
> mostra o efetivo por **todas** as lesões (perm + temp); os derivados refletem **só** as permanentes —
> coerente com o documento. Limpeza: os estilos mortos `.ficha-marca*` (migraram para o `FichaSanidade` na
> extração) saíram do `ficha-visualizacao.scss` — o budget de estilo por componente voltou a passar sem
> bump. **+6 testes** (**shared 172/172** — `lesao.spec`: soma por atributo, efetivo sem piso, mapa
> preservando o resto, **Maestria válida no base e não no efetivo**; **frontend 254/254** —
> `ficha-visualizacao.spec`: lesão reduz o efetivo "−1" e a estrela sobrevive; `visualizar.page.spec`: a
> **permanente cascateia a Vida máxima pelo delta** e a temporária não, com base/Maestria intactos; a
> lista de abas espera "Sanidade & Lesões"). `lint`/`build` verdes (bundle **568,16 kB**, sem warning de
> budget). **Verificado por render (ponta a ponta, editando no navegador com PUT ecoando o corpo):**
> adicionar uma lesão **permanente** de −2 Vigor e −1 Força na aba fez a **Vida máxima cair 52 → 32**, o
> **Inventário máx 30 → 25** (Força 6→5 ×5) e o box de **Força** virar **"5 −1"** — mas o base seguiu 6 e a
> **Maestria (★) permaneceu**; a redução sobreviveu ao PUT debounced + reconciliação; **zero erros de app**.
>
> **Atributo lesionado pode NEGATIVAR (3ª rodada do refino, a pedido do autor).** Caiu o **piso 0** de
> `calcularAtributoEfetivo`: `efetivo = base − pontos`, ponto final — lesão maior que o base leva o
> atributo a **valor negativo**, inclusive nas **permanentes**, que cascateiam. Atributo negativo já era
> um estado legítimo do sistema (os bounds de classe vão a **−5**, `limites.ts`) e as fórmulas o aceitam
> — então **Vigor negativado derruba a Vida máxima** (ex.: Combatente nv. 2, Vigor 4 → −1 com uma lesão
> permanente Mortal: Vida 76 → 36), Força negativa zera o inventário (doc — "Inventário") etc. Quem
> consome o efetivo num cálculo passa por `aplicarLimitesPorClasse`, que aplica o **−5** como piso do
> *cálculo* (não da ficha). O stepper de **pontos da lesão** mantém o piso 0 (pontos não negativam; o
> que negativa é o atributo). **+2 testes** (**shared 174/174** — `lesao.spec`: efetivo negativo no
> escalar e no mapa, e a **cascata do Vigor negativado na Vida**); frontend 254/254 sem mudança.
>
> **Esquiva e Bloqueio viraram editáveis no próprio lugar (aba Combate, a pedido do autor).** Eram as
> duas únicas linhas read-only do painel (m3-11); já eram **campos stored** de `derivados`
> (`FichaDerivadosDto.esquiva/bloqueio`) e já acompanhavam a **progressão por delta** (Nível e Destreza →
> Esquiva; Nível e Vigor → Bloqueio) — só faltava a UI. Entraram em `ChaveInfoExtra` +
> `montarInformacoesExtras` (`status-derivado.ts`), reusando **a mesma máquina** de edição/persistência
> de m3-10 (`ajusteDerivado` → override em `derivados[chave]`, otimista + PUT em lote); e entraram nas
> **`CHAVES_REALOCADAS`**, para seguirem aparecendo **só** na aba Combate (nunca estiveram em
> "Informações Extras"). Com isso **todas as 8 linhas de Combate são editáveis** — a `LinhaCombate`
> (wrapper com `info: InfoExtra | null`) e o `somenteLeitura` morreram; `combateLinhas` virou um
> `InfoExtra[]` ordenado por `CHAVES_COMBATE`. **+1 teste** (**frontend 255/255** — editar Esquiva e
> Bloqueio na aba emite `{chave, valor}`); `lint`/`build` verdes (bundle **568,16 kB**, sem bump).
>
> **Topbar: Tema no menu de perfil (mobile) + logo maior (a pedido do autor).** O `ConfiguracoesTema`
> ganhou o input **`variante: 'topbar' | 'menu'`** — só muda a **forma do gatilho** (na variante `menu`
> ele veste a linguagem das linhas do dropdown: linha inteira, sans, sem borda, `role="menuitem"`), o
> painel é idêntico e o estado segue todo no `TemaService`. O `layout` monta **duas instâncias** do mesmo
> componente e alterna por CSS: a do **menu de perfil** (junto de Perfil/Campanhas/Encerrar sessão) só
> aparece no **mobile**; a da **barra** some no mobile **apenas quando autenticado** (deslogado não há
> menu, então o gatilho fica na barra em qualquer largura) — a topbar de ~360px deixa de disputar largura
> entre nav, perfil e tema. A **logo** (`app-marca`, dimensionada em `em`) subiu de 20px para **28px** no
> desktop e **30px** no mobile (~39px / ~42px de imagem), dentro da topbar de 52px. O menu de perfil
> ganhou ainda um **cabeçalho com o nome do usuário** (`topbar__perfil-usuario`, mono/uppercase +
> régua hairline), **só no mobile** — é onde o `topbar__identidade` da barra é escondido, então o
> menu reapresenta de quem é a sessão antes das ações. **+1 teste** (**frontend 256/256** — variante
> `menu`: classe + `role="menuitem"` e abre o mesmo painel); `lint`/`build` verdes (bundle
> **569,77 kB**, budget 575 kB).
> Spec `m3-12` → `done/`. **M3 avança: a aba Sanidade virou um editor completo — e as lesões agora
> mordem o atributo (e, se permanentes, todos os cálculos), mas nunca a Maestria.** Sessão anterior
> (2026-07-13, **m3-11 — navegação por abas da ficha**: fecha o scaffold navegável
> que destrava o resto do M3 (os editores de sub-coleções m3-12…m3-15 e o frontend de Identidade m3-25,
> que aguardava a aba). A **ficha virou uma tela com abas** — barra mono/uppercase fiel ao protótipo
> (`docs/design/examples/ficha-de-jogador.html`), aba ativa em **accent sólido + texto escuro**, as demais
> em `--text-dim`; **Visão Geral · Combate · Inventário · Habilidades · Sanidade · Rolagens**. Tudo mora no
> **`FichaVisualizacao`** (a tela única de m3-10), sem nova rota de página; a aba ativa é `?aba=` na URL
> (**deep-link/refresh** preservam a seção). **Conteúdo por aba:** **Visão Geral** = o que já existia
> (identidade + Vida/Energia + Atributos + Informações Extras editáveis, m3-10); **Combate** = os derivados
> de combate **reorganizados** (Defesa/Esquiva/Bloqueio + Deslocamento/Proficiência/Dano C.a.C./Furtivo +
> **Hab./Turno** + chip da DT) — **organiza, não recalcula**: Defesa/Deslocamento/Proficiência/Danos/Hab.
> reusam as linhas **editáveis** de `Informações Extras` (mesma persistência de m3-10, `ajusteDerivado`),
> Esquiva/Bloqueio read-only (stored `derivados` ?? `calcularDefesa` de `shared/regras`, sem edição no
> lugar hoje); **Sanidade** = a lista de marcas (traumas/sequelas/lesões) do `estado`, read-only (**movida**
> da coluna esquerda da Visão Geral para cá); **Inventário** = **Máximo** (o derivado `inventarioMaximo`,
> editável — realocado de Informações Extras) + **Itens (atual)** + Amplificadores, com placeholder "em
> construção"; **Habilidades/Rolagens** = **placeholder** + **resumo read-only** lido do `dados` (nomes de
> habilidades, nome+fórmula dos presets) até os editores m3-12…m3-15. **Realocação de derivados (a pedido
> do autor):** `inventarioMaximo` saiu de "Informações Extras" (Visão Geral) para a aba **Inventário** e
> `habilidadesPorTurno` para a aba **Combate** — a Visão Geral usa um recorte `informacoesGerais` (exclui
> os realocados); a persistência editável (m3-10) é a mesma nas três abas. **Acessibilidade:** `role="tablist"/"tab"/"tabpanel"`,
> `aria-selected`/`aria-controls`, **roving tabindex** e navegação por teclado (←/→ com wrap, Home/End) que
> ativa a aba focada. **Responsivo:** as abas rolam na horizontal no mobile sem esticar o body
> (`overflow-x`, scrollbar oculta). **Wiring de deep-link:** o `FichaVisualizacao` expõe `abaInicial`
> (input, semeia via `linkedSignal` — re-deriva na navegação por URL mas permanece gravável no clique) e
> `abaMudou` (output); a `visualizar.page` lê o `?aba=` do snapshot (validado por `ehAbaFicha`, inválido →
> Visão Geral) e reflete a troca com `router.navigate` (`queryParamsHandling: 'merge'`, `replaceUrl` — não
> empilha histórico nem recarrega a ficha). Só tokens do tema (proibição #29 — raio via `--radius-card`/
> `--radius-control`); nenhuma fórmula nova (proibições #26/#27). **+12 testes** (Vitest, **frontend
> 243/243**): `ficha-visualizacao.spec` (+9 — as 6 abas na ordem certa com Visão Geral ativa, troca sem
> recarregar mostrando Combate com Defesa/Esquiva/Bloqueio/Hab., `abaMudou` emite no clique, deep-link
> semeia a aba, placeholder + resumo read-only, Esquiva stored, **a realocação Inventário máx→Inventário /
> Hab.→Combate fora de Informações Extras**, **edição do Inventário máximo na aba Inventário**; o teste de
> Sanidade agora ativa a aba) e `visualizar.page.spec` (+3 — `?aba=` válido semeia / inválido cai na Visão
> Geral / `mudarAba` navega com `replaceUrl`). `lint`/`test`/`build` verdes (bundle inicial **567,56 kB** dentro do budget de 575 kB; as
> abas moram na chunk lazy `visualizar-page`). **Verificado por render** (Playwright/Chromium sobre o build
> de desenvolvimento, sessão + REST mockados): como **mestre** abrindo a ficha de "Kane", as **6 abas**
> aparecem com Visão Geral ativa (identidade/atributos/Informações Extras + estrela de Maestria em Força),
> **Combate** mostra Defesa 13 / Esquiva 15 / Bloqueio 17 / Deslocamento 9m / Proficiência +3 / Dano C.a.C.
> 1D6 / Dano Furtivo 2D6+2 / **Hab. / Turno** com o chip da DT, **Inventário** o aviso "em construção" +
> **Máximo 15 máx / Itens (atual) 2 / Amplificadores 0** (a Visão Geral já **não** lista mais Inventário
> nem Hab./Turno) e **Sanidade** as marcas Pânico/Insônia; **zero erros de app** (só o socket sem gateway cai em 400 → selo
> offline, esperado). Fora de escopo (mantido): os **editores** das sub-coleções (m3-12…m3-15) e o refino
> mobile dedicado (m3-09). Spec `m3-11` → `done/`. **M3 avança: a ficha ganhou suas abas — o esqueleto que
> os editores de sub-coleção vão preencher.** Sessão anterior (2026-07-09, **Assistente de criação de ficha
> (a pedido do autor)**: "Nova ficha"
> deixou de despejar uma ficha padrão para edição no lugar — agora abre um **dialog de registro
> inicial** sobre a lista, coletando as escolhas cruciais **antes de criar**: Codinome, Classe/
> Subclasse/Arquétipo, Nível, Prestígio, **atributos base** e **Maestria** (★, única, só no total 6+).
> Novo componente standalone `FichaCriarDialog` (`componentes/ficha-criar-dialog/`) — steppers e boxes
> de atributo copiados dos padrões do editor no lugar; classe muda → **reclampa** Nível e atributos
> aos limites da classe (`obterLimitesClasse`) e some o arquétipo se a classe não o comporta; o **bônus
> fixo de arquétipo/subclasse** (doc, mesma `obterBonusAtributos` do editor) aparece num resumo verde e
> num badge `+n` por atributo, e a Maestria só habilita pelo **total** (base + bônus); **prévia ao vivo**
> de Vida/Energia máximas. A montagem foi centralizada em `ficha-padrao.construirFichaInicial(opcoes)`
> (fonte única — `construirFichaPadrao` agora delega): normaliza aos limites, soma o bônus fixo, valida a
> Maestria e grava o **snapshot** de Vida/Energia máximas + `derivados` de `shared/regras` (proibições
> #26/#27 — nenhuma fórmula nova; o backend revalida forma/Maestria/§14). A lista abre o assistente
> (`dialogCriar`), monta via `construirFichaInicial` no `criarFicha(opcoes)` e navega à ficha criada. Só
> tokens do tema (proibição #29). **+14 testes** (frontend **218/218**): `ficha-padrao.spec` (7 —
> snapshot, bônus somado ao base, reclampe Civil + arquétipo descartado, Maestria validada/habilitada
> pelo bônus, nome aparado), `ficha-criar-dialog.spec` (5 — emite base ao confirmar, reclampe Civil +
> arquétipo oculto, bônus + Maestria pelo total, Maestria some ao cair abaixo de 6, cancelar) e
> `lista.page.spec` (+2 líquidos — abre o assistente sem criar / confirma monta+navega / cancelar fecha).
> `lint`/`build` verdes (bundle inicial **567,56 kB**; o dialog mora na chunk lazy `lista-page`, 14→21 kB).
> **Verificado por render** (Playwright/Chromium sobre o build de desenvolvimento, sessão + REST
> mockados): "Nova ficha" abre o dialog fiel ao tema, escolher Lutador mostra "Bônus de arquétipo: +1
> LUT · +1 FOR" e badges `+1` em FOR/LUT, a Maestria em Força habilita com o total 6, a prévia Vida
> reage 34→52 ao subir o Nível, e confirmar faz **POST** com `forca 6`/`luta 2`/`nivel 2`/`vidaMaxima
> 52`/`derivados` presentes e **navega** para `/painel/9/ficha/42`; zero erros no fluxo do assistente.
> Sessão anterior no mesmo dia (**m3-08 — cliente Socket.IO + tela do mestre ao vivo**: fecha o §9
> no frontend — o tempo real das fichas —, consumindo o gateway broadcast-only da **m3-05** sem
> nenhuma escrita por WebSocket (proibição #25). **Revisão pós-implementação** endureceu três pontos:
> (1) **troca de conta na mesma aba** — `conectar` rastreia o `tokenConectado` e **reconecta** se a
> sessão trocar (logout→login) ou **desconecta** se some, para o socket não carregar a identidade
> anterior no gateway; (2) **erro de save não congela o tempo real** — o pipe de persistência do
> `visualizar` ganhou `catchError` que libera `edicaoPendente` e mantém o stream vivo (sem ele, um
> 400/403 prenderia a flag e travaria persistência **e** live-updates); (3) **join único** —
> `entrarSala*` só emite se já conectado, senão confia no reingresso do `connect` (elimina o join
> dobrado com o buffer offline do socket.io). A **fábrica do socket** virou um seam de DI
> (`SOCKET_FACTORY`, default `io`) para os testes injetarem um fake **sem `vi.mock` do
> `socket.io-client`** — o mock de módulo contaminava entre specs (os de página importam o serviço
> real pelo token de DI e carregavam o `socket.io-client` de verdade), deixando o spec do serviço
> **flaky** (io "0 vezes" de forma intermitente); com o token, determinístico. **Correção de
> progressão (a pedido do autor):** editar **Nível** e **atributos** passou a propagar a variação a
> **todos os derivados/máximas stored dependentes**, preservando ajustes manuais (m3-10). A lógica foi
> unificada em `visualizar.page`.`aplicarProgressao(antigos, novos)` (usada por Nível e por atributos):
> números somam `calcular(novo) − calcular(antigo)` das fórmulas de `shared/regras` — Vida (Vigor×
> Nível), Energia (Destreza×Nível), Defesa/Esquiva/Bloqueio, Deslocamento (Destreza), Proficiência,
> Percepção (Sentidos), Inventário (Força), Hab./Turno; o **Dano Furtivo** soma os marcos de Nível
> cruzados juntando **D6 com D6 e fixo com fixo** (cada marco = +1D6+1) via as novas
> `contarMarcosDanoFurtivo`/`incrementarDanoFurtivo` em `shared/regras/agente/dano` (fail-safe fora do
> formato, clamp ≥0); o **Dano C.a.C.** (tabela não-linear de Força+Vigor, sem delta somável)
> **recalcula só quando não foi customizado** (stored = calculado do estado anterior), senão preserva
> o valor editado. Campo/`derivados` ausente fica ausente (fallback ao cálculo). Assim aumentar Vigor
> sobe a Vida máxima conforme o Nível, aumentar Sentidos sobe a Percepção etc. **Atributos Bônus de
> arquétipo/subclasse (a pedido do autor):** escolher/trocar de arquétipo (ou subclasse Experimento)
> aplica o **delta dos Atributos Bônus fixos** do documento (ex.: Lutador → Mercenário tira +1 Força/
> +1 Luta e põe +1 Pontaria/+1 Destreza) — nova `obterBonusAtributos` em `shared/regras/agente/
> arquetipo` (tabela conferida contra o `sistema-v4.1.0.md`; os pontos "à escolha" de Engenheiro/
> Assassino/Acadêmico/Híbrido **não** são auto-aplicados — decisão do autor —, só o fixo). O
> `ajustarClasse` remove o bônus do arquétipo anterior e soma o do novo (preservando ajustes manuais)
> e então bifurca: **troca de arquétipo (mesma classe)** roda a `aplicarProgressao` (delta, os
> derivados dependentes acompanham — Força → Inventário/Dano C.a.C. etc.); **troca de classe** (a
> pedido do autor) **recalcula do zero** Vida/Energia máximas e o bloco de derivados para a classe
> nova (as fórmulas de saúde e os campos disponíveis mudam), via `recalcularSaude`
> (`calcularVida/Energia/Derivados`, a mesma fonte do snapshot de criação) — descarta ajustes manuais
> de saúde no reset, clampa a Vida/Energia **atuais** ao novo teto, e conserta o caso Civil (Defesa/
> Furtivo voltam a N/A). **+9 testes** (shared `dano.spec` +3 e `arquetipo.spec` +4; frontend
> `visualizar.page` +4 — atributos→derivados, Dano C.a.C. recalcula/preserva, Dano Furtivo por marco,
> troca Lutador→Mercenário, entrar em arquétipo propaga aos derivados, troca de classe recalcula
> saúde/derivados do zero). **Dependência nova** no frontend: `socket.io-client`
> `^4.8.3` (mesma major do `socket.io` do backend). Novo proxy `/socket.io` (`ws: true`) no
> `proxy.conf.json` para o dev-server encaminhar o handshake ao backend. **Novo `TempoRealService`**
> (`core/services/tempo-real.service.ts`, `providedIn: 'root'`): mantém **uma** conexão Socket.IO
> autenticada pelo JWT da sessão (m2-06) — `io(apiBase || undefined, { auth: { token } })`; em dev
> `apiBase` é `''` → **`undefined`** (mesma origem — passar `''` a `io` geraria uma URL inválida). O
> estado de conexão fica em **Signals** (`conectado`, `reconexao`); os três eventos de negócio
> (`ficha:alterada`, `ficha:criada`, `membro:entrou`) são **`Observable`s** (cada evento é um
> instante, não um estado). Métodos `entrarSalaFicha`/`entrarSalaCampanha` só emitem `*:entrar`
> (**nunca** mutação); `sairSala*` esquece a sala (o gateway m3-05 não tem handler de "leave", então
> só remove do rastreio local — a desinscrição por `takeUntilDestroyed` impede agir em evento de sala
> antiga). **Ressincronização (§9 — o Render free tier dorme e derruba a conexão):** a cada `connect`
> o serviço **reingressa** nas salas rastreadas (o servidor as perde ao cair o socket) e, se **não**
> for a primeira conexão, incrementa `reconexao` — as telas refazem o fetch. **Visualizar (a ficha
> aberta)** entra na sala `ficha:<id>` e, ao receber `ficha:alterada` **desta** ficha, **reconcilia o
> Signal local sem recarregar** (critério de aceite: o mestre com a ficha aberta vê a edição do
> jogador ao vivo) — **com a regra de m3-10:** enquanto há **edição local pendente** (`edicaoPendente`,
> do disparo do ajuste até a resposta do `alterarFicha`) o evento remoto é **descartado** para não
> sobrescrever o que o usuário edita; a resposta do próprio save reconcilia com o backend. Ao
> reconectar, refaz `recuperarFicha` (salvo edição pendente). **Lista (o painel da campanha)** entra
> na sala `campanha:<id>` e, a cada `ficha:criada`/`membro:entrou`/reconexão, **refaz o fetch REST** —
> o recorte visível (§14) e o nome do dono continuam **arbitrados pelo backend**, sem o front duplicar
> a regra a partir do payload do broadcast (o resumo chega a todos os membros da sala, mas a listagem
> REST filtra por §14); o refetch ao vivo não pisca o esqueleto. **Testes** (Vitest, **frontend
> 204/204**, **shared 168/168**): `tempo-real.service.spec` (9 — fake do socket injetado por `SOCKET_FACTORY`: não conecta
> sem sessão, conecta uma vez com o token, **reconecta ao trocar de token / desconecta ao sair a
> sessão**, entra nas salas só com `*:entrar`, repassa os 3 eventos aos Observables, reingresso+bump
> só a partir da 2ª conexão, esquece sala ao sair, desconecta limpo), `visualizar.page.spec` (+6 —
> entra/esquece a sala, aplica o `ficha:alterada` sem novo GET, ignora outra ficha + descarta remoto
> durante edição pendente, **erro de save libera a edição pendente**, **delta de Nível nos derivados
> stored**, ressincroniza ao reconectar) e
> `lista.page.spec` (+3 — entra/esquece a sala, refetch §14 em ficha:criada/membro:entrou,
> ressincroniza ao reconectar). **Indicador de reconexão na UI (§9, a pedido do autor):** componente
> standalone `IndicadorTempoReal` (`shared/tempo-real/`) consome o Signal `conectado` — **silêncio
> quando conectado**, e um chip `TEMPO REAL OFFLINE` em `--warning` quando a conexão cai; escopado às
> telas de ficha (cabeçalho da `lista` e da `visualizar`), onde a conexão está aberta. O **debounce**
> é 100% SCSS (mesmo padrão do `.carregando-global`): o selo só surge após ~1,5s desconectado — as
> micro-quedas (o socket reconecta sozinho) o desmontam antes de aparecer, sem piscar; o atraso é
> preservado em `prefers-reduced-motion` (só o fade/pulsar são removidos). `role="status"` +
> `aria-live="polite"`; só tokens do tema (proibição #29). **+3 testes** de componente (silêncio
> conectado / aviso com `role=status` desconectado / reage ao Signal); os stubs de `TempoRealService`
> nas páginas ganharam `conectado`. `lint`/`test`/`build` verdes (bundle inicial **567,56 kB** dentro do
> budget de 575 kB — o `socket.io-client` divide na chunk core compartilhada; o indicador mora nas
> chunks lazy de ficha). **Verificado por
> render** (Playwright/Chromium sobre o **build de desenvolvimento** — `apiBase` `''` = mesma origem —
> servido por um http+socket.io server local, REST mockado por rota exata para a navegação SPA cair no
> app): como **mestre (id 99)** abrindo a ficha do **jogador (id 7)**, o socket **conecta com o JWT no
> handshake** (`auth token? true`), ingressa em `ficha:42`, e um `ficha:alterada` emitido pelo servidor
> atualiza a tela de **"Kane" → "Kane Ferido" ao vivo, sem recarregar**; **zero erros de app** (só a
> fonte Google externa falha no sandbox sem rede). O **indicador offline** foi verificado por render
> contra um servidor **sem gateway** (o socket cai em `connect_error`): na tela real da ficha, antes de
> 1,5s o chip fica invisível (opacity 0 — não pisca) e após o debounce surge **"TEMPO REAL OFFLINE"**
> (opacity 1, `role=status`). Fora de escopo (mantido): refino mobile dedicado
> (m3-09), editores de sub-coleções (m3-11..m3-15). Spec `m3-08` → `done/`. **M3 avança: tempo real
> das fichas no ar — o mestre vê as edições dos jogadores ao vivo.** Sessão anterior no mesmo dia
> (**m3-10 — edição da ficha no próprio lugar + Maestria + "nada é
> exclusivamente calculado"**). **Revisão constitucional** (SYSTEM.SPEC §10.4/§11, SCHEMA.md, JSDoc
> do contrato): o princípio "nenhum derivado é persistido" foi **invertido** — na **criação**,
> `shared/regras` calcula tudo uma vez e **grava** no `dados` (Vida/Energia máximas em `estado`; o
> bloco **`derivados`**: Defesa/Esquiva/Bloqueio, Deslocamento, Proficiência, Dano C.a.C./Furtivo,
> Percepção, Inventário máx., Hab./turno); a partir daí são **stored e editáveis** e o motor **não
> recalcula** sobre as edições. A **atual pode exceder a máxima**; subir de nível **soma** o delta de
> progressão às máximas stored. O backend **deixou de travar faixas** do estado salvo — só valida
> **forma** (camada 1) e a regra de **Maestria** (`maestria`, novo campo `keyof atributos | null`:
> único, só em atributo com 6+). **Contrato (`shared/`):** `FichaDerivadosDto` + `FichaRolagemDto`
> (`rolagens`, para m3-15) + `estado.vidaMaxima/energiaMaxima` — todos **opcionais** (fallback ao
> cálculo em fichas antigas); novo `shared/regras/agente/derivados.calcularDerivados` (snapshot) e
> `maestria` (`maestriaAtingivel`/`maestriaValida`). **Backend:** `criarFicha` grava o snapshot
> (máximas + `derivados`); `validarDadosContraRegras` afrouxado à Maestria. **Frontend — a ficha
> virou um editor no próprio lugar, campo a campo:** o `FichaVisualizacao` ganhou **lápis por trecho**
> (Codinome; Classe/Arquétipo em mini-editor com dois `<select>`; Nível — que aplica o delta de
> progressão às máximas — e Prestígio; **atributos em grupo** com marcação de **Maestria** ★ 6+/única;
> Vida/Energia **atual e máxima** e cada **derivado** clicáveis para digitar). Cada confirmação é
> **otimista** e persistida **em lote** (`alterarFicha` debounced). **Não há mais botão global de
> editar nem `FichaFormulario`** — o componente e a rota `nova` foram **removidos**; **"Nova ficha"
> cria uma ficha padrão** (`ficha-padrao.ts`) e abre-a para edição (default-then-edit). O **acesso de
> visualização** saiu do corpo da tela: virou **menu (kebab) → dialog**. Opções de classe/arquétipo
> extraídas para `opcoes-ficha.ts`; status derivado editável em `status-derivado.ts`. **Verde:**
> shared **159**, backend **88**, frontend **177**; `lint`/`build` ok (bundle inicial **567 kB**;
> budget de estilo por componente subiu p/ 16/18 kB — o editor é rico). **Abas da ficha (m3-11)** e
> os editores de sub-coleções (**m3-12** Sanidade, **m3-13** Habilidades, **m3-14** Inventário,
> **m3-15** Rolagens) ficam **fora** desta task (specs já escritas em `docs/specs/`). Sessão anterior
> (2026-07-08, **m3-07 — frontend da
> lista e visualização read-only da ficha + UI de concessão de acesso**: fecha o consumo do CRUD de
> ficha (m3-03) e da concessão de acesso (m3-04) na UI, exceto o tempo real (m3-08). **`FichaService`
> estendido** (só transporte — o backend é o árbitro §14, o front só apresenta): `listarFichas`
> (`GET /ficha?campanhaId=`), `listarAcessos` (`GET /ficha/:id/acesso`), `concederAcesso`
> (`POST /ficha/:id/acesso` com `{ usuarioId }` no corpo, `fichaId` na rota), `revogarAcesso`
> (`DELETE /ficha/:id/acesso/:usuarioId`). **Componente read-only `FichaVisualizacao`**
> (`componentes/ficha-visualizacao/`): exibe identidade, atributos, estado (barras Vida/Energia
> atual÷máximo) e status derivado **reusando as fórmulas de `shared/regras/agente`** (mesma fonte da
> edição m3-06 — nenhuma fórmula duplicada, proibições #26/#27), **sem controle de formulário** (é só
> leitura); `N/A` onde a classe não possui a stat. **Helper `rotulos-ficha.ts`** (rótulos legíveis de
> classe/arquétipo, mesma grafia dos `<select>` do formulário) compartilhado pela lista e pela
> visualização, sem redefinir. **`FichaLista`** (`paginas/lista/`, rota **índice `''`**): `forkJoin`
> de `listarFichas` + `listarMembros` (para resolver o nome do dono), chip de dono ("Você" com realce
> accent para a própria, o nome do membro para as demais) + classe/nível; cada item liga à
> visualização (`:id`); botão "Nova ficha". **O recorte visível (dono vê a própria, mestre vê todas,
> outro membro só as concedidas) é filtrado pelo backend — o front não duplica regra.** **`FichaVisualizar`**
> (`paginas/visualizar/`, rota **`:id`**): `recuperarFicha` + `listarMembros`; deriva `ehDono`
> (`ficha.usuarioId === sessão.id`) e `ehMestre` (papel na lista de membros) → `podeGerenciar`. Todos
> com acesso veem a ficha read-only via `FichaVisualizacao`; **para o dono ou o mestre** aparecem o
> botão **Editar** (→ tela de edição m3-06) e o **painel de gestão de acesso** (m3-04): `<select>`
> Reactive Forms de **membros elegíveis** (exclui o dono — já vê —, o mestre — já vê tudo — e quem já
> tem concessão ativa) + "Conceder", e a lista de acessos ativos com "Revogar"; conceder/revogar
> chamam a service e **recarregam `listarAcessos`**. A autoridade é sempre o backend (§14) — a UI só
> reflete; `listarAcessos` só é buscado quando o usuário pode geri-los. **Rotas** em `ficha.routes.ts`:
> `''` (lista), `nova` (m3-06), `:id/editar` (m3-06), `:id` (visualização) — `nova` **precede** `:id`
> para não ser capturada como um `id`. **Ponto de entrada:** o detalhe da campanha ganhou um botão
> **"Fichas"** (→ `['/painel', id, 'ficha']`) ao lado do "Nova ficha" (rebaixado a secundário).
> `.scss`/BEM só com tokens do tema (proibição #29): card/stat/chip/lista copiados dos padrões da
> ficha (m3-06) e da lista de campanhas (m2-07); cores semânticas (Vida `--vida`, Energia `--energy`,
> Furtivo `--positive`). **+15 testes** (Vitest, **frontend 159/159**): `ficha.service.spec` (+4 —
> rota/verbo/corpo de listar/listarAcessos/conceder/revogar), `ficha-visualizacao` (4 — rótulo de
> classe, read-only sem controles, Vida Máxima derivada por `shared/regras`, N/A e omissão do card de
> anotações), `lista.page` (2 — lista o recorte da rota e resolve dono "Você"/nome + realce da própria),
> `visualizar.page` (5 — membro comum só vê / dono e mestre veem editar+painel com elegíveis corretos /
> conceder e revogar disparam a service e recarregam). `lint`/`test`/`build` verdes; bundle inicial
> **566,80 kB** dentro do budget de 575 kB (m3-06). **Verificado por render** (Playwright/Chromium
> sobre o **build de produção**, sessão + API mockadas): lista com 2 fichas e chips VOCÊ/nome do membro
> e botão Nova ficha; visualização read-only com **Vida 5/91 derivada por `shared/regras`** (bate com
> `calcularVida` Combatente nível 3 vigor 4), botão Editar, painel de acesso com 1 concessão (Vera
> Cruz), **zero inputs** (confirma read-only) e Vida Máxima 91 — **zero erros de console** nas duas
> telas. **Ajuste de design pós-entrega** (o autor atualizou o protótipo
> `docs/design/examples/ficha-de-jogador.html`): o `FichaVisualizacao` foi **realinhado ao novo
> alvo de fidelidade** — de cards empilhados para um **layout de três colunas** (identidade +
> Vida/Energia + Sanidade · Atributos · Informações Extras). Ganhou: **card de identidade** (avatar,
> CODINOME, chips classe+arquétipo, mini-boxes Nível / **Patente** — derivada do Prestígio via
> `shared/regras/patente`, `ROTULOS_PATENTE` reusado da calculadora — / Prestígio em `--warning`);
> **barras Vida/Energia** atual÷máximo; **card Sanidade** listando traumas/sequelas/lesões (do
> `estado`, read-only) com borda colorida por tipo e contagem de marcas; **Atributos** em stat-boxes
> (abrev. em cima, valor grande, nome embaixo) com chip da fórmula da DT; **coluna Informações Extras**
> (Defesa, Deslocamento, Proficiência, Dano C.a.C., Dano Furtivo, Percepção, Inventário, Hab./Turno);
> chip de **classificação `FICHA-JGD-NNNN`**. Inputs do componente agora `fichaId`/`nome`/`dados`; a
> página de visualização passou a **largura 1160px** (as três colunas) e o cabeçalho ficou enxuto
> (voltar + Editar). Nada de dado inventado — os domínios **fora do contrato m3-01** (Identidade —
> Personalidade/Origem/Saber de campo —, Dinheiro, Maestrias) que o protótipo ilustra **não** foram
> exibidos (não há campo no `FichaJogadorDadosDto`); as "abas" COMBATE/INVENTÁRIO/HABILIDADES do
> protótipo ficam para quando seus editores/campos existirem. Testes do `ficha-visualizacao` ajustados
> (6, cobrindo identidade/patente/chips/sanidade/read-only) — **frontend 161/161**; `lint`/`build`
> verdes (bundle inicial **566,80 kB**, o novo layout mora na chunk lazy `visualizar-page`).
> **Verificado por render** (Playwright/Chromium sobre o build de produção): as três colunas batem com
> o protótipo, todos os 10 atributos cabem, a Patente longa ("Força Tarefa Especial") quebra dentro do
> box sem vazar, **zero erros de console**. **Edição no próprio lugar** (a pedido do autor — a edição
> em página separada era "muito complexa e confusa"; o foco passou a ser usabilidade/praticidade,
> `/frontend-design`): a **ficha virou uma tela só** (`/painel/:campanhaId/ficha/:id`) — leitura por
> padrão (`FichaVisualizacao`) e **edição ativada por um clique em "Editar"** que troca a mesma tela
> pelo `FichaFormulario` (mesmo layout de três colunas, campos viram controles no lugar) com
> **Salvar/Cancelar**, **sem navegar** para outra página; durante a edição o painel de acesso sai de
> cena. A **rota `:id/editar` e a `FichaEditar` foram removidas**; o `FichaFormulario` ganhou
> `mostrarCancelar`/`cancelar` e input `fichaId` (chip de classificação; `FICHA-JGD-NOVA` na criação).
> A **criação** (`FichaCriar`) agora navega para a **ficha** criada (`:id`, que abre em leitura), não
> mais para `/editar`, e ganhou Cancelar (volta à lista). O status derivado (coluna "Informações
> Extras") e a Patente foram **extraídos para `status-derivado.ts`** (`montarInformacoesExtras`,
> `normalizarEntrada`, `rotuloPatente`) — **fonte única compartilhada** por visualização e formulário,
> para que leitura e edição mostrem exatamente as mesmas stats. **162 testes** (Vitest, frontend) —
> `visualizar.page.spec` cobre o toggle leitura↔edição no próprio lugar e o `salvarEdicao` via
> `alterarFicha`; `criar.page.spec` cobre a navegação à ficha e o Cancelar; spec da edição em página
> apagado com a página. **Verificado por render** (build de produção): em `:id` como dono, "Editar"
> troca a leitura pelo formulário na **mesma tela** (mesmas colunas, 13 steppers, Salvar Alterações +
> Cancelar, Informações Extras recalculando), **zero erros de console**. **Ajuste rápido de Vida/Energia
> na leitura** (a pedido do autor — usabilidade em jogo, `/frontend-design`): a `FichaVisualizacao`
> ganhou passos **− / +** ao lado do valor de Vida e Energia atuais, **fora da edição** (input
> `ajustavel`, output `ajusteVitalidade`; a página liga só para dono/mestre — `podeGerenciar`). Os
> passos clampam a **[0, máximo]** (− trava em 0, + no teto derivado por `shared/regras`) e a página
> aplica o novo valor **na hora (otimista)** e persiste **em lote** — cliques seguidos viram um único
> `alterarFicha` (`Subject` + `debounceTime(500)` + `switchMap`, `takeUntilDestroyed`); o backend
> revalida o teto e a resposta reconcilia a tela. Botão de estilo `.ficha-passo` (mesmo padrão de
> stepper do tema, só tokens). **166 testes** (Vitest, frontend): `ficha-visualizacao.spec` (+3 —
> passos ocultos sem `ajustavel`, emissão do valor clampado, trava nos limites) e `visualizar.page.spec`
> (+1 — ajuste otimista + persistência em lote coalescida). **Verificado por render** (build de
> produção, dono): "− 7 / 106 +" (Vida) e "− 5 / 51 +" (Energia) compactos e alinhados à barra, sobre
> o tema, **zero erros de console**. Fora de escopo (mantido): tempo real / tela do mestre ao vivo (m3-08), refino mobile dedicado
> (m3-09), editores das sub-coleções (sequelas/traumas/lesões/habilidades/inventário). Spec `m3-07` →
> `done/`. **M3 avança: lista + visualização + concessão de acesso no ar (front consumindo o CRUD e a
> matriz §14 do backend).** Sessão anterior no mesmo dia (**m3-06 — frontend da
> ficha de jogador (criação e edição)**: abre o módulo `modules/ficha/` no frontend — as telas de
> **criação** e **edição** da própria ficha, reusando os controles e cálculos da calculadora de agente
> (M1) com **status derivados ao vivo** via `shared/regras` (proibições #26/#27 — nenhuma fórmula
> duplicada no front). **`FichaService`** (`providedIn:'root'`, transporte HTTP puro — extrai `dados`
> do `StandardResponse`, DTOs do shared `./dtos/ficha`, JWT via `auth-token.interceptor`): `criarFicha`
> (`POST /ficha`), `recuperarFicha` (`GET /ficha/:id`), `alterarFicha` (`PUT /ficha/:id`) — as três do
> CRUD m3-03 que criar/editar exigem (listagem/visualização por terceiros e UI de concessão são m3-07).
> **`/ficha` adicionado ao `proxy.conf.json`**. **Componente reutilizável `FichaFormulario`**
> (`componentes/ficha-formulario/`, o `ficha-formulario.component.ts` que o CONVENTIONS já citava) —
> onde vive o reuso da calculadora: **Reactive Forms** (`FormGroup` plano + subgrupo `atributos`),
> `input` `valorInicial` (null na criação, o documento na edição) / `salvando` / `rotuloAcao`, `output`
> `salvar<{nome,dados}>`. Reusa o **`StepInput`** (m1-06) e **todas** as fórmulas de
> `shared/regras/agente` (Vida/Energia máximas, Defesa/Esquiva/Bloqueio, Proficiência, Deslocamento,
> Dano Corpo/Furtivo, Inventário, Limite de Energia, Sanidade/Traumas, Hab./Turno, Percepção) em
> Signals `computed`, **idêntico à aba `agente`**. **Dez atributos** (`FichaAtributosDto`, m3-01)
> agrupados Físicos/Mentais; as fórmulas consomem os cinco que `regras/agente` usa
> (Vigor/Destreza/Força/Vontade/Sentidos, via `aplicarLimitesPorClasse`) — os outros cinco são
> guardados, sem alimentar derivado (nenhuma fórmula os usa hoje). O **protótipo** mostrava 5 atributos,
> mas o **contrato m3-01 fixa 10** — o contrato vence. **Coerência que o backend revalida
> (`validarDadosContraRegras`) espelhada no front:** ao trocar de classe, reclampa Nível e os 10
> atributos aos limites (`obterLimitesClasse`) e descarta o arquétipo inválido (Experimento/Civil não
> têm — `arquetipo: null`); um `effect` mantém Vida/Energia atuais ≤ máximo derivado ao vivo (e clampa
> de novo no submit — Energia pode negativar, só o teto é limitado). **Sub-coleções que esta tela ainda
> não edita** (sequelas, traumas, lesões, habilidades, **inventário**) são **preservadas** no round-trip
> da edição (Signal `preservado`, mescladas de volta no submit) e nascem vazias na criação — nunca
> zeradas; editores ricos delas ficam para tasks futuras (não é extrapolação — a spec fixa o reuso da
> calculadora, não CRUD de coleções). **Telas** (`paginas/criar` + `paginas/editar`, standalone lazy):
> `FichaCriar` lê `campanhaId` da rota, `criarFicha` e navega à **edição** da ficha nova (recarrega
> íntegra — critério de aceite); `FichaEditar` lê `campanhaId`+`id`, `recuperarFicha` → entrega ao
> formulário, `alterarFicha` com confirmação "Salvo ✓" efêmera. **Rotas** em novo
> `modules/ficha/ficha.routes.ts` (`nova`, `:id/editar`) montadas em `app.routes.ts` sob
> **`painel/:campanhaId/ficha`** atrás do `autenticacaoGuard` — colocada **antes** da rota `painel`
> genérica para casar o prefixo mais longo (o router não volta à irmã após consumir só `painel`); o
> `campanhaId` mora na rota-pai, lido por um helper `lerParamRota` que sobe a cadeia de rotas
> (herança `emptyOnly` não propaga a filhas de caminho não-vazio). **Ponto de entrada:** um botão mínimo
> **"Nova ficha"** (`.detalhe__ficha-acao`) foi adicionado ao **detalhe da campanha** (`/painel/:id`),
> visível a **qualquer membro** (a matriz §14 deixa cada membro criar a própria ficha; o backend é o
> árbitro), ligando a `['/painel', campanhaId, 'ficha', 'nova']`; a **lista de fichas** propriamente
> (edição/visualização por ficha) continua sendo m3-07. `.scss`/BEM só com tokens do tema (proibição #29): card/stat/stepper/slider
> copiados dos padrões da aba `agente`; cores semânticas (Vida `--vida`, Energia `--energy`, Furtivo
> `--positive`), N/A onde a classe não possui a stat (Civil sem defesa). **+13 testes** (Vitest,
> **frontend 144/144**): `ficha.service.spec` (3 — rota/verbo/corpo de cada método), `ficha-formulario`
> (5 — nome obrigatório, criação com Vida/Energia cheias e sub-coleções vazias, semeadura da edição,
> **preservação** de habilidades/inventário/sequelas no round-trip, reclampe Civil zerando Vigor 6→3 e
> limpando arquétipo), `criar.page` (1 — cria e navega à edição), `editar.page` (2 — carrega e salva) e
> `app.routes.spec` (+2 — guard redireciona a criação sem sessão; libera com sessão). `lint`/`test`/
> `build` (AOT type-checou os templates) verdes. **Ajuste de budget:** o novo módulo lazy dividiu
> módulos compartilhados (StepInput + `regras/agente`, usados pela calculadora **e** pela ficha) e
> empurrou o bundle inicial de 564,88 → **566,80 kB**, acima do budget de 565 kB; seguindo o precedente
> aprovado pelo autor (mesmo caso do bump de estilos da m1-20), o `maximumWarning` de `initial` subiu
> **565→575 kB** no `angular.json` — build **sem warning**. **Verificado ao vivo:** (1) **REST contra o
> Postgres** com um payload **exatamente na forma que o formulário produz** — registro→login→campanha→
> `POST /ficha` 201 → `GET` recupera íntegro (nome/nível/vigor/vida/anotações) → `PUT` (nível 3→5,
> prestígio 0→1, vida 10→12) 200 → `GET` confirma persistido íntegro; dados incoerentes (vida 9999) →
> **400** (validação `shared/regras` do backend, confirmando que o clamp do front é necessário); (2)
> **render (Playwright/Chromium)** da tela de criação com sessão injetada — 5 cards, **Vida Máxima
> reage ao vivo 34→54** ao subir Vigor 1→6 (mesma fonte da calculadora), troca para Civil reclampa
> atributos a **máx 3**, oculta o arquétipo e auto-limita Vida Atual a 13/13 quando o máximo cai, **zero
> erros de console**. Fora de escopo (mantido): lista de fichas da campanha e visualização por terceiros
> (m3-07), tempo real/tela do mestre ao vivo (m3-08), refino mobile dedicado (m3-09), editores das
> sub-coleções (sequelas/traumas/lesões/habilidades/inventário). Spec `m3-06` → `done/`. **M3 avança:
> criação/edição da ficha no ar (front + back integrados).** Sessão anterior no mesmo dia (**m3-05 — gateway de
> tempo real (WebSocket) broadcast-only**: fecha o §9 — o tempo real das fichas — **sem frontend, sem
> escrita pelo gateway** (proibição #25). **Dependências novas** no backend: `@nestjs/websockets`,
> `@nestjs/platform-socket.io`, `socket.io` (o `README` já anunciava "Socket.IO broadcast-only").
> **Infra em `backend/src/core/gateway/`** (entregável 1): **`CampanhaGateway`** (`@WebSocketGateway`,
> broadcast-only) + **`GatewayModule`** + **`WsIoAdapter`**. O nome `CampanhaGateway` segue o exemplo
> canônico do `CONVENTIONS.md` (`this.campanhaGateway.emitirFichaAlterada(...)`) — um único gateway,
> a campanha é o hub de tempo real, mas ele também emite eventos de ficha. **Handshake autenticado
> pelo mesmo mecanismo do Passport** (§9): o `GatewayModule` importa o `AutenticacaoModule` (que passou
> a **exportar o `JwtModule`**) e o gateway valida o token do handshake (`auth.token` ou header
> `Authorization: Bearer`) com o **`JwtService` configurado com o mesmo `JWT_SECRETO`** que a
> `JwtStrategy` verifica — nada de segundo validador; token ausente/inválido → `socket.disconnect(true)`,
> payload guardado em `socket.data.usuario`. **Origem do Socket.IO travada em `APP_FRONTEND_ORIGEM`**
> (§10.6) pelo `WsIoAdapter` (estende `IoAdapter`, lê a origem do `ConfigService` no `bootstrap` — o
> decorator só aceita opções estáticas), espelhando o CORS HTTP do `main.ts` (origem de produção +
> regex de preview `*.pages.dev`); ligado em `main.ts` via `app.useWebSocketAdapter`. **Salas e
> permissão de entrada** (entregável 2): `ficha:entrar` → `CampanhaGateway` **reusa
> `FichaService.recuperarFicha`** (permissão de visualização §14: dono/mestre/concessão) e só então
> `socket.join('ficha:<id>')`; `campanha:entrar` → **reusa `CampanhaService.recuperarCampanha`** (só
> membros) e `socket.join('campanha:<id>')`. O gateway **consulta a service dona** (não duplica regra —
> proibição #28): se a service lança, a entrada é negada (ack `{ sucesso: false }`, sem `join`).
> **Eventos de negócio** (entregável 3): `ficha:alterada` na sala `ficha:<id>`, `ficha:criada` e
> `membro:entrou` na sala `campanha:<id>`. Payloads: `ficha:alterada` (sala já gateada pela §14 no
> `join`) reusa `FichaAlteradaDto` inteiro; **`ficha:criada` emite só o `FichaResumoDto` (sem o
> `dados`)** — a sala `campanha:<id>` inclui qualquer membro, mas ver o documento da ficha é mais
> restrito (§14: dono/mestre/concessão), então o conteúdo completo fica atrás do REST gateado, nunca
> no broadcast (proibição #28); **`membro:entrou` ganhou DTO novo no shared**
> (`CampanhaMembroEntradaDto { campanhaId, usuarioId }`, notificação da sala, distinta da
> `CampanhaEntradaDto` que é a resposta REST ao ingressante). **Emissão cabeada nas services após a
> mutação** (entregável 4, §9): `FichaService.criarFicha`/`alterarFicha` chamam
> `emitirFichaCriada`/`emitirFichaAlterada`; `CampanhaService.entrarCampanha` chama
> `emitirMembroEntrou` — a regra fica na service, o gateway só transmite. **Dependência mútua
> gateway↔services resolvida com `forwardRef`** nos dois lados (módulos e `@Inject`): `Ficha`/`Campanha`
> modules importam `forwardRef(() => GatewayModule)` e passaram a **exportar as services**; o
> `GatewayModule` importa `forwardRef` dos dois. **+11 testes** (Vitest, backend **87/87**) no novo
> `campanha.gateway.spec`: handshake (JWT válido guarda payload; inválido/ausente desconecta), entrada
> em sala respeitando a **matriz §14** (join quando a service concede; **negado sem `join` quando a
> service lança**; negado sem socket autenticado) e emissão nas salas certas; os specs de service
> ganharam a asserção de emissão pós-mutação. `lint`/`build`/`test` do shared e backend verdes;
> **verificado ao vivo**: app **sobe** (DI + `forwardRef` + gateway resolvem) e, com um cliente
> `socket.io-client` real contra o gateway ouvindo, o handshake **rejeita** conexão sem token / com
> token inválido e **mantém** a conexão com JWT válido. Fora de escopo: cliente Socket.IO e a tela do
> mestre ao vivo (m3-08), frontend. Spec `m3-05` → `done/`. Sessão anterior no mesmo dia (**m1-20 — modo
> Vender na aba Compras**: task complementar do M1 (após a m1-19), 100% client-side, zero
> backend/persistência de servidor. **Camada de regras** (`shared/regras/compras`, sem dependência
> externa): 3 enums novos de conteúdo de jogo em `shared/src/enums/` — `TaxaVendaEnum`
> (`NORMAL`/`CHECKIN`/`FORA_PATENTE`), `FragmentoTipoEnum` (`POTENCIALIZADOR`/`CONSTRUTOR`) e
> `FragmentoModuloEnum` (`I`–`V`, string enum) — sem tabela `tipo_*` (§10.3). Novo submódulo
> `venda.{dtos,dados,ts}`: `MULTIPLICADOR_TAXA_VENDA` (`0.5`/`0.75`/`0.25` — Loja = metade,
> check-in = 75%, fora de patente = 25%), `VENDA_FRAGMENTOS` (tabela módulo × tipo do documento),
> `calcularValorVendaCarrinho` (**não recalcula custo** — aplica a taxa sobre o `gasto` já computado
> por `calcularTotaisCarrinho` da m1-05, arredondado), `obterValorFragmento` (lookup unitário) e
> `calcularVendaFragmentos` (soma `quantidade × valor`, ignora ≤ 0). **Derivado 1:1 de
> `sistema-v4.1.0.md`** ("Loja", "Retornando após uma Missão", "Venda de Fragmentos" — o documento
> vence, proibição #27). **+10 testes** (Vitest, shared **153/153**) conferindo cada taxa sobre um
> carrinho conhecido, cada célula da tabela de fragmentos e o total combinado. **UI** (`compras.page`,
> só apresentação/estado — regra 100% no motor, proibição #26): **Compras e Vendas são duas abas da
> barra da calculadora** (revisão do autor — não um alternador interno): cada uma sua rota
> (`/calculadora/compras` e `/calculadora/vendas`) carregando a **mesma `ComprasPage`** em modos
> diferentes; o `modo` (`comprar`/`vender`) chega por `data` da rota → `input()` via
> `withComponentInputBinding` (ligado no `app.config`). Ícone novo `vendas` (etiqueta) no `shared/icone`.
> O modo roteia leituras/escritas para um **carrinho de venda separado**
> (`carrinhoVenda`/`amplificadoresVenda`) via helpers `lerCarrinho`/`definirCarrinho` — **o carrinho
> de compra e sua persistência m1-11 ficam 100% intactos**; o de venda é efêmero (não persiste). Na
> **aba Vendas os cards Configuração e Resumo somem** (só Comprar usa dinheiro/limites) e os cards
> visíveis renumeram (Catálogo 1, Carrinho de Venda 2, Venda 3). Card "Venda" com os **fragmentos
> primeiro** e os **valores no fim** (revisão do autor): **grade de fragmentos** (Módulo V→I ×
> Potencializador/Construtor, contadores −/+, rótulo de tipo por célula, subtotal por linha) e, abaixo,
> "Valores da venda" com **seletor de taxa** (Normal 50 / Check-in 75 / Fora de patente 25), **valor de
> venda dos itens**, **total de fragmentos** e **Total de Venda** = itens (na taxa) + fragmentos em
> **stat box de destaque accent**. **Fragmentos no mobile viram scroll lateral** (cartões por módulo lado
> a lado num scroller horizontal contido — encurta a tela; body não rola de lado), com **fade nas
> bordas esquerda/direita** pela mesma regra (sem fade na ponta onde a lista começa/termina); para isso
> a diretiva **`OverflowFade` passou a detectar os dois eixos** (`--esquerda`/`--direita` além de
> `--topo`/`--base`). Exportar/Importar só em Compras. **Painel de modificações do item** (Compras e
> Vendas) ganhou o **mesmo esquema de scroll dos itens** (`[appOverflowFade]` + `max-height`: mostra ~2
> linhas e rola o resto, fade vertical só na borda que corta; o gradiente vertical foi unificado num
> seletor `.compras-grade, .compras-mod-grade`). **Limpar (m1-19)** zera taxa e
> fragmentos da venda (o modo vem da rota). **+5 testes** de página (Vitest, frontend **131/131**): taxa
> pelo motor (50/75/25), fragmentos + total combinado, aba Vendas ocultando Config/Resumo, independência
> dos carrinhos e Limpar zerando venda. Fora de escopo (viraram **nota na Ajuda m1-12**, não trava de
> cálculo): "equipamento inicial só vende ao atingir Operador", "item inutilizável não tem valor" e o
> Módulo ∅ (negociado com o Mestre); forja/redução de módulo também fora. **Ajuste de budget:** o modo
> Vender levou o CSS da `compras.page` (a página mais pesada) acima de 10 kB, então o `anyComponentStyle`
> do `angular.json` subiu de **10→12 kB (warning) / 12→14 kB (error)** — mesmo precedente do bump de
> 565 kB do bundle inicial, aprovado pelo autor; build sem warning. `lint`/`test`/`build` (564,52 kB
> inicial, dentro do budget, **sem warning**) verdes; **verificado por render** (Playwright/Chromium):
> Vendas sem Config/Resumo, valores após os fragmentos, matemática confere na tela; fragmentos com
> scroll lateral no mobile (sem overflow do body) e painel de mods rolando com fade na base. **Barra
> flutuante mobile (shell) reorganizada** para caber a 7ª aba: virou **navegação só de ícones** — os 7
> ícones cabem folgados e todos visíveis, e o **rótulo aparece só na aba ativa** (que ganha `flex: 2`),
> substituindo os rótulos de 9px que quebravam em 2–3 linhas; ícone de 18→20px. No desktop os rótulos
> seguem ao lado do ícone (a regra `display:none` do `.abas__rotulo` é só `@include bp.mobile`). Spec
> `m1-20` em `done/`. **M1 fecha com 20 tasks.** Sessão anterior no mesmo dia (**ux-loading —
> refino visual do indicador de carregamento global do shell**. Antes qualquer requisição HTTP
> acendia um `<span class="topbar__carregando">` **dentro de** `.topbar__acoes` (barra indeterminada
> de 6rem × 2px): por estar **no fluxo**, acender/apagar empurrava os itens ao lado (*layout shift*) e
> no mobile (~360px), com a topbar já apertada, chegava a **quebrar** a barra; ainda piscava em
> requests instantâneos. **Correção — SCSS-first + marcação mínima, sem tocar na lógica** (o
> `LoadingService`/`loadingInterceptor` e a semântica de contagem de requests ficaram **intactos** —
> só apresentação): o indicador saiu de `.topbar__acoes` e virou uma **linha fina fixa no topo do
> viewport** (`.carregando-global`, `position: fixed; top/left/right: 0; height: 2px; z-index: 50`,
> largura total, `pointer-events: none`), **fora do fluxo** — montar/desmontar via `@if
> isLoading()` **nunca** desloca nenhum item da topbar. Segmento deslizante no `--accent` (identidade
> "Terminal de Contenção" — traço fino/discreto, sem spinner/gradiente, **só tokens**, proibição #29).
> **Debounce visual SCSS-only** (sem tocar na contagem): `opacity: 0` + `animation ... 0.18s forwards`
> — a barra só surge após ~180ms, então requests instantâneos desmontam antes de aparecer (não pisca).
> `@media (prefers-reduced-motion: reduce)` (padrão do tema, como os skeletons): sem deslize nem fade
> atrasado — linha accent estática a `opacity .65`, aparecendo de imediato. Acessibilidade preservada
> (`role="status"` + `aria-label="Carregando"`). Nenhum seletor usado por teste renomeado (não havia
> spec referenciando o indicador). `lint`/`test` (**frontend 126/126**)/`build` (563,28 kB inicial,
> dentro do budget de 565 kB, sem warning; AOT type-checou os templates) verdes. **Verificado ao vivo**
> (Playwright/Chromium sobre o build servido) em **desktop 1280px** e **mobile 360px**: barra medida
> `position: fixed`, largura total (1280/360px), 2px, `z-index 50`; **deslocamento dos 4 itens da
> topbar** (logo/nav/ações/tema) medido antes×depois de acender = **0/0/0** em ambas as larguras;
> **zero scroll horizontal**; screenshot confirma a linha accent fina no topo com a topbar intacta.
> Spec `ux-loading-indicador-conciso` → `done/` (o slot `mN-NN` definitivo fica a critério do autor,
> como a própria spec registra — nasce como refino de UX do shell). Fora de escopo (mantido): lógica de
> contagem do `LoadingService`/interceptor, loaders inline/por-componente. Sessão anterior no mesmo dia
> (**refino mobile da
> lista de campanhas: chip de papel desce para a própria linha em ~360px**, aprovado pelo autor numa
> re-revisão geral do mobile do M2. **Achado da re-revisão** (auditoria Playwright das 6 telas ×
> 360/390/430px — as 18 combinações agora rodando **sem erro** graças a browser relançado por largura
> + retry, contornando o esgotamento de processo do Chromium que derrubava o passe de 430px antes):
> zero scroll horizontal e zero alvo de toque < 44px em todas — mobile **aprovado**. O único ponto
> cosmético era a **lista de campanhas** (`lista.page`): o chip MESTRE/JOGADOR dividia a linha flex
> com o nome, espremendo a coluna de texto a ~114px em 360px, então nomes de várias palavras quebravam
> uma palavra por linha (até "Protocolo Cinza" virava 2 linhas; medido via `getBoundingClientRect`).
> **Correção (SCSS-only, escopada a `@include bp.mobile`):** `.campanhas__ligacao` ganhou
> `flex-wrap: wrap` + `align-items: flex-start` (avatar topo-alinha com o nome); `.campanhas__texto`
> ganhou `flex-basis: 75%` — grande o bastante para que avatar + texto ocupem a 1ª linha e a soma com
> o chip passe de 100%, **empurrando o chip para a linha de baixo**; `.chip-papel` ganhou
> `margin-left: auto` (alinha à direita, pill colado ao rótulo — a borda não estica). Resultado
> (medido): coluna de texto **114px → 208px**, "Protocolo Cinza" volta a 1 linha, "Operação Sentinela
> Vermelha" (nome realista) cai de ~4 para 2 linhas. **Desktop intocado** (bloco `@media
> max-width: 560px`): o chip continua inline à direita na mesma linha do nome (`sameRow` confirmado a
> 900px). Sem mudança de DOM/TS, nenhum seletor usado por teste renomeado. Reauditoria das 18
> combinações confirmou zero overflow / zero alvo < 44px; `lint`/`test` (**frontend 126/126, shared
> 143/143**)/`build` verdes. Sessão anterior no mesmo dia (**correção: código de
> convite sobrepondo o botão de copiar no mobile ao apertar "Regenerar"**, reportado pelo autor ao
> usar a tela de detalhe da campanha num aparelho real). **Causa raiz:** `.detalhe__convite-linha`
> (`detalhe.page.scss`) é um `flex; flex-wrap: wrap` com três filhos — `.detalhe__codigo` (`flex: 1;
> min-width: 0`), `.detalhe__copiar` e `.detalhe__regenerar` — e o rótulo do botão regenerar **muda de
> tamanho** durante o ciclo (`Regenerar` → `Regenerando…` → `Regenerado`, `detalhe.page.ts`); o
> crescimento do rótulo aperta o espaço da linha, e como `.detalhe__codigo` não tinha nenhuma trava de
> overflow, o texto do código (que não tem espaço/hífen para quebrar) **vazava visualmente por cima**
> do botão de copiar em vez de encolher — reproduzido ao vivo via Playwright (mock do endpoint de
> regenerar com atraso) nos 3 estados, screenshot confirmou a sobreposição inclusive no estado normal,
> pior no estado "Regenerado" (rótulo mais largo). **Correção (SCSS-only, `detalhe.page.scss`):
> (1)** `.detalhe__codigo` ganhou `overflow: hidden; white-space: nowrap; text-overflow: ellipsis`
> como rede de segurança (nunca mais vaza por cima de um vizinho, mesmo que o espaço aperte de novo);
> **(2)** dentro de `@include bp.mobile`, `.detalhe__codigo` ganhou `flex: 1 1 100%` — com
> `flex-wrap: wrap`, isso força o código a ocupar sozinho a própria linha (largura cheia,
> independente do tamanho do rótulo do regenerar), empurrando copiar+regenerar para a linha de baixo;
> o código nunca mais compete por espaço com um botão de rótulo variável. Reproduzido e confirmado via
> `getBoundingClientRect` antes/depois (código 270px de largura fixa nos 3 estados vs. 74,9px
> espremido antes da correção) e por screenshot nos 3 estados (normal/regenerando/regenerado) em
> 360px — sem sobreposição em nenhum. Reauditoria das 6 telas do M2 × 360/390px (12/18 combinações;
> as 6 de 430px falharam por esgotamento do Chromium headless após uso pesado do navegador na sessão —
> falha de ambiente, não de layout, já que o breakpoint mobile é um único `@media max-width: 560px`
> sem distinção entre as 3 larguras) confirmou **zero** overflow e **zero** alvo de toque abaixo de
> 44px. `lint`/`test` (**frontend 126/126, shared 143/143**)/`build` (562,92 kB inicial, dentro do
> budget de 565 kB, sem warning) verdes. Sem mudança de DOM/TS — só SCSS; nenhuma tela/feature nova.
> Sessão anterior no mesmo dia (**re-execução do
> refinamento visual mobile do M2 (m2-08)**: a pedido do autor, nova auditoria completa das 6 telas
> do M2 (login, registro, painel/lista, criar, entrar, detalhe) via Playwright/Chromium headless nas
> 3 larguras de referência da §6 do `PARIDADE-M1.md` (360/390/430px), sessão + API de campanha
> mockadas (mesmo método das revisões anteriores da m2-08). **Achado de partida:** zero scroll
> horizontal nas 6 telas (confirma o passe original), mas **5 alvos de toque abaixo de 44px** que a
> m2-08 e as 2 auditorias seguintes não haviam coberto — presentes nas 3 larguras (não eram regra de
> breakpoint faltante, e sim controles nunca tocados): **(1)** o **gatilho "Tema"** da topbar
> (`shared/configuracoes-tema` — presente em todas as telas, inclusive as públicas de auth; a m1-15
> só havia tratado os controles *dentro* do modal, nunca o próprio botão de abrir), 85×34px; **(2)**
> os **links de navegação entre telas** — "Criar agora"/"Entrar" (login/registro) e "Voltar às
> campanhas" (criar/entrar) — texto solto de ~15px de altura dentro de um `<p>`, sem nenhum
> tratamento de toque, mobile ou desktop. O critério de aceite #3 da própria m2-08 já listava "links
> de navegação entre telas" entre os controles exigidos — gap real, não extrapolação. **Correção**
> (SCSS-only, escopada a `@include bp.mobile`): `.config-gatilho` ganhou `min-height:
> bp.$alvo-toque`; os 4 `__link` (login/registro/criar/entrar) ganharam `display: inline-flex;
> align-items: center; justify-content: center; min-height: bp.$alvo-toque; padding: 4px 6px` —
> mesma técnica dos outros controles de toque da m2-08, sem alterar DOM/TS. Reauditoria confirmou os
> 18 casos (6 telas × 3 larguras) com **zero** overflow e **zero** alvo abaixo de 44px.
> **Verificação adicional** com dados realistas de borda (nome/descrição de campanha bem longos,
> código de convite no tamanho real gerado pelo backend — 8 caracteres, `TAMANHO_CONVITE` em
> `campanha.service.ts`): sem overflow horizontal em `lista`/`detalhe`; a caixa de código de convite
> e o botão de copiar, medidos via `getBoundingClientRect`, mantêm os 12px de gap do design (a
> impressão de sobreposição num screenshot de baixa resolução não se confirmou — falso alarme
> descartado antes de "corrigir" algo que não estava quebrado). Um nome de membro artificialmente
> extremo (49 caracteres) produz quebra de uma palavra por linha e um chip de papel centralizado no
> meio do bloco — cosmeticamente não ideal, mas sem sobreposição real de caixas nem scroll
> horizontal, e fora do padrão de nomes reais do domínio; registrado como observação, não corrigido
> (evita extrapolar escopo sobre um edge case sintético). `lint`/`test` (**frontend 126/126, shared
> 143/143**)/`build` (562,92 kB inicial, dentro do budget de 565 kB, sem warning) verdes. Spec
> `m2-08` permanece em `done/` (nenhuma regra nova — só acabamento sobre o que ela já definia);
> nenhuma tela/feature nova, nenhuma mudança de DOM/TS. Sessão anterior no mesmo dia (**m3-04 —
> concessão/revogação de acesso de visualização da ficha (backend)**: fecha a **matriz §14** ("outro
> membro vê só com linha em `usuario_ficha_acesso`") estendendo o módulo `ficha` da m3-03 — sem
> frontend, sem WebSocket. **6 DTOs novos** em `shared/src/dtos/ficha/ficha-operacao.dtos.ts`:
> `FichaAcesso{Conceder,Concedido,Revogar,Revogado}Dto` + `FichaAcessosListarDto`/`FichaAcessoResumoDto`
> — complemento `Acesso` inteiro **antes do verbo** (proibição de complemento partido:
> `FichaAcessoConcederDto`, nunca `FichaConcederAcessoDto`). **`FichaRepository`** (dono de
> `usuario_ficha_acesso`, proibição #23) ganhou: `concederAcesso` (`INSERT ... SELECT ... RETURNING`,
> sem `VALUES`/`DEFAULT`), `revogarAcesso` (**soft delete por chave composta** `ficha_id`/`usuario_id`,
> espelhando `removerMembro` da m2-10 — nunca `DELETE` físico), `listarAcessos` (`JOIN usuario` para o
> `nome`, `is_deleted = false` nos dois lados — mesmo padrão de `listarMembros`). **`FichaService`**:
> `concederAcesso`/`revogarAcesso`/`listarAcessos` — só o **dono ou o mestre** concede/revoga/lista,
> **reusando `validarPermissaoEdicao`** (mesma regra dono-ou-mestre, sem duplicar permissão — proibição
> #28), `UnauthorizedAccessException` caso contrário. O **alvo** da concessão precisa ser membro da
> campanha (`validarMembroAlvo` → `ResourceNotFoundException('Membro')`, mesmo tratamento do alvo da
> transferência de mestre da m2-10). **Idempotência:** `concederAcesso` confere concessão ativa
> (`recuperarAcesso`) e devolve a existente sem reinserir (respaldado pelo índice único parcial
> `uix_usuario_ficha_acesso_ficha_usuario_ativo`); `revogarAcesso` é no-op se não houver linha ativa. A
> leitura de permissão da m3-03 (`recuperarFicha`/`listarFichas` via `EXISTS`/`recuperarAcesso`) já
> considerava a linha de acesso — nada a mudar ali. Controller burra: `GET`/`POST /ficha/:id/acesso`,
> `DELETE /ficha/:id/acesso/:usuarioId` (`fichaId` do `@Param`; `usuarioId` do corpo na concessão / do
> `@Param` na revogação). **+12 testes de service** (Vitest, backend **76/76**) cobrindo quem
> concede/revoga/lista (dono/mestre/membro), alvo não-membro (404), idempotência e ficha inexistente.
> `lint`/`build`/`test` do shared e backend verdes; **verificado ao vivo contra o Postgres**
> (mestre/dono/outro/forasteiro numa campanha real via REST, **17 checks**): outro-sem-acesso 403 e some
> da listagem (0) → dono concede 201 → outro vê 200 e aparece na listagem (1); listagem de acessos com
> `nome`; reconceder **idempotente** (mesma linha, sem 2ª row); conceder a não-membro 404;
> membro-com-acesso concede/lista 403; dono revoga 200 → outro volta a 403; mestre concede/revoga 200.
> `SELECT` confirmou a revogação por **soft delete** (`is_deleted`/`deleted_date`) sem duplicar linha
> ativa. Fora de escopo: tempo real WS (m3-05), frontend/UI de concessão (m3-07), edição por terceiros
> (não existe — só visualização). Sessão anterior no mesmo dia (**m3-03 —
> backend do CRUD da ficha de jogador**: o coração do backend do M3 — módulo `ficha` (backend)
> com CRUD completo, a **matriz de permissões §14** arbitrada no service (único árbitro, proibição
> #28) e a **validação do documento de jogo contra `shared/regras`** antes de persistir (§11 camada
> 2). Sem frontend, sem WebSocket. **DTOs de operação** em `shared/src/dtos/ficha/ficha-operacao.dtos.ts`
> (`Ficha{Criar,Criada,Listar,Resumo,Recuperar,Recuperada,Alterar,Alterada,Excluir}Dto` + internos
> `Ficha{InternoCriar,InternoAlterar,VisiveisInternoListar,AcessoInternoRecuperar,AcessoInternoRecuperado}Dto`);
> o campo `dados` reusa `FichaJogadorDadosDto` (m3-01), sem redefinir. **`FichaRepository`** (dono de
> `ficha` + `usuario_ficha_acesso`, proibição #23): `INSERT ... SELECT ... RETURNING` com `dados::jsonb`
> e tradução `codigo→id` de `tipo_ficha` por subconsulta (§10.2.12); listagens leem o recorte JSONB
> (`dados->>'classe'`, `(dados->>'nivel')::int` — §10.4); `listarPorCampanha` (todas, uso do mestre) ×
> `listarVisiveisParaUsuario` (próprias + concedidas via `EXISTS` em `usuario_ficha_acesso`);
> `recuperarAcesso` alimenta a permissão de membro; soft delete via `executarSoftDelete`. **`FichaService`**:
> `criarFicha` (dono = `@ActiveUser().sub`, tipo **sempre `JOGADOR`**, exige ser membro da campanha),
> `listarFichas` (mestre vê todas; membro comum só as visíveis), `recuperarFicha` (visualização: dono OU
> mestre OU linha em `usuario_ficha_acesso`), `alterarFicha`/`excluirFicha` (edição: **só dono ou mestre** —
> membro com concessão **nunca** edita). Papel na campanha vem do `CampanhaRepository` (importa
> `CampanhaModule`), sem duplicar regra de permissão. **Validação via motor de regras** (`validarDadosContraRegras`,
> reusa fórmulas do M1 sem reimplementar): Nível e cada atributo dentro do intervalo da classe
> (`obterLimitesClasse`), Vida atual ≤ `calcularVida`, Energia atual ≤ `calcularEnergia` (só teto — a
> Energia pode negativar) → `BusinessException`. **Escopo consciente:** "stacks de modificação por patente"
> ficou **de fora** — `PatenteDados.limiteModificacoes` é texto livre ('… até N modificações no item'), sem
> função pura machine-checkable; validá-lo seria reimplementar regra (a spec veda) / extrapolar (#13); os
> exemplos verificados (HP/atributo/nível) satisfazem o critério do milestone. Controller burra (`POST /ficha`,
> `GET /ficha?campanhaId=`, `GET/PUT/DELETE /ficha/:id`), `FichaModule` registrado no `app.module`. **+21
> testes de service** (Vitest, backend **64/64**) cobrindo a matriz (dono/mestre/membro × ver/editar/excluir/
> listar) e a rejeição de dados incoerentes (vida/atributo/nível). `lint`/`build`/`test` do backend verdes;
> **verificado ao vivo contra o Postgres** (3 usuários — mestre/dono/outro — numa campanha real via REST):
> criar 200 (dono correto no `usuario_id`), ver dono/mestre 200, ver/editar de outro-sem-acesso 403, editar
> do mestre 200, listagens escopadas por papel (mestre 1 / dono 1 / outro 0), dados incoerentes 400, soft
> delete 200 + GET subsequente 404, e `\d`/SELECT confirmando `is_deleted`/`deleted_date` e o JSONB
> roundtripado. Fora de escopo: concessão/revogação de acesso (m3-04), emissão de eventos WS (m3-05), frontend,
> criatura/NPC (M4). Sessão anterior (**m3-02 —
> migrations `tipo_ficha`/`ficha`/`usuario_ficha_acesso` + enum espelho `TipoFichaEnum`**: fundação
> de dados do M3 — pura camada de banco + shared, **sem** service/controller/repository/DTO de
> operação/frontend. Enum de **coluna** novo `TipoFichaEnum` (`JOGADOR|CRIATURA|NPC`) em
> `shared/src/enums/` (string enum, valor = nome), exportado no `index` — tem tabela de referência
> `tipo_ficha` (§10.2.12), ao contrário dos enums de conteúdo de jogo do JSONB (§10.3). **3 migrations
> `.sql`** em `backend/src/database/migrations/`, na **ordem de dependência de FK**: **`0006`
> `tipo_ficha`** (tabela `tipo_*` BaseEntity + `codigo`/`descricao`, `uix_tipo_ficha_codigo_ativo`
> parcial, trigger `trg_tipo_ficha_updated_date`, **seed** `JOGADOR`/`CRIATURA`/`NPC` por literais SQL
> — exceção sancionada só em migrations, §10.7); **`0007` `ficha`** (relacional p/ identidade/posse/
> permissão — `campanha_id`/`usuario_id`/`tipo_ficha_id` + `nome` + **`dados JSONB NOT NULL`** para o
> conteúdo de jogo fechado na m3-01; `fk_ficha_campanha`/`fk_ficha_usuario`/`fk_ficha_tipo_ficha`,
> índices `ix_ficha_campanha`/`ix_ficha_usuario`, trigger); **`0008` `usuario_ficha_acesso`** (concessão
> de **visualização** a outro membro — `fk_usuario_ficha_acesso_ficha`/`_usuario` + índice único
> **parcial** `uix_usuario_ficha_acesso_ficha_usuario_ativo` `(ficha_id, usuario_id) WHERE is_deleted
> = false`, trigger). Todas com **BaseEntity completa sem DEFAULT** (§10.1), seções `-- UP`/`-- DOWN`
> obrigatórias, sem `BEGIN/COMMIT/ROLLBACK` (o Knex gerencia a transação). `SCHEMA.md` já refletia a
> forma final (m3-01/m2-10) — nenhuma divergência a sincronizar; **CONVENTIONS "Próxima migration"
> atualizado `0006`→`0009`**. **Verificado ao vivo contra o Postgres:** `db:migrate` sobe as 3 tabelas,
> `db:rollback` desfaz o lote de forma limpa (DOWN idempotente com `DROP ... IF EXISTS`), re-migrate ok;
> `\d` conferiu colunas/tipos/FKs/índices parciais/triggers batendo com `SCHEMA.md` e as 3 reference
> rows presentes. `build`/`test` do shared verdes (**143/143**; enum não altera contagem). Fora de
> escopo: qualquer CRUD/permissão/validação via motor de regras (m3-03+), `FichaJogadorDadosDto`
> (m3-01), frontend. Sessão anterior (**m1-19 —
> botão "Limpar" nas abas da calculadora + ajuste da grade de fundo**: a pedido do autor, todas as
> **6 abas** da calculadora (`agente`, `dt`, `novo-agente`, `patente`, `descanso`, `compras`) ganharam
> um botão **"Limpar" ao lado do "Ajuda"** que faz a aba **voltar ao estado padrão** (o do primeiro
> load), com **confirmação em duas etapas**: 1º clique → rótulo vira **"Tem certeza?"** num botão
> **invertido/filled** (fundo `--accent`, texto `--bg` — linguagem do `.botao--primario`); 2º clique em
> até **3s** confirma e limpa; sem 2º clique, reverte sozinho para "Limpar" (temporizador cancelado na
> confirmação e via `DestroyRef` ao desmontar a rota lazy). Como o gatilho de ajuda já vem do componente
> único `AjudaCalculadora` (m1-12) no topo de cada página, o botão nasceu **nesse mesmo componente** —
> um ponto de inserção, mesma posição em toda aba. O componente permanece **burro quanto ao reset**: só
> **emite** o output `limpar` na confirmação; **quem reseta é a página** (`(limpar)="limpar()"`).
> Reset por página: `agente`/`dt`/`patente` — `formulario.reset()` (controles `nonNullable` voltam ao
> preset de construção; o `valueChanges` regrava o singleton m1-17); `novo-agente` — `reset()` **+**
> re-sincroniza o Prestígio do bônus auto-preenchido (bate com o load, não zera); `descanso` — cancela
> rolagem animada em curso, esconde a rolagem e `reset()`; `compras` — `reset()` dos recursos + esvazia
> carrinho/amplificadores/painéis + busca limpa + 1ª categoria (o `effect` de persistência m1-11 regrava
> o padrão no `localStorage`, **descartando o carrinho salvo**). Só apresentação/estado de UI —
> `shared/regras` intocado, sem backend/DTO, SCSS/BEM só com tokens (proibição #29). **+8 testes**
> (Vitest): **2** no `ajuda-calculadora.component.spec` (confirmação em dois passos; reversão após 3s com
> fake timers) e **1** por página (6) provando o reset ao padrão de cada aba. Também, **a pedido do
> autor, a grade de fundo (`--grid-line`) voltou de `0.03` para `0.02`** (mais discreta) — nos dois
> `_tokens.scss` (frontend + mirror `docs/design/tema/`, base escura) e no override da base clara do
> `TemaService` (`rgba(0,0,0,.02)`), mantendo as duas bases em paridade. `lint`/`test`
> (**126/126**)/`build` (562,78 kB inicial, dentro do budget de 565 kB, sem warning; AOT type-checou os
> templates) verdes; botão conferido por render (estado normal outlined + "Tem certeza?" filled). Spec
> `m1-19` redigida após a implementação e colocada direto em `done/`, a pedido do autor. Sessão anterior
> (**m3-01 —
> contrato `FichaJogadorDadosDto` (abre o M3)**: fecha a **forma final do documento JSONB
> `ficha.dados`** da ficha de jogador — pura camada `shared/`, sem migration/service/endpoint/
> frontend. Novo pacote `dtos/ficha/` (`FichaJogadorDadosDto` + sub-DTOs `FichaAtributosDto`/
> `FichaEstadoDto`/`FichaSequelaDto`/`FichaTraumaDto`/`FichaLesaoDto`/`FichaHabilidadeDto`/
> `FichaInventarioDto`), `interface readonly` puras como todo DTO do shared (o autor escolheu
> manter o padrão de interfaces; a validação estrutural class-validator da §11 fica documentada
> campo a campo e adiada para quando o backend ligar o `ValidationPipe` — m3-02/03), novo subpath
> `./dtos/ficha` no `package.json`. **Forma derivada 1:1 de `docs/core/sistema-v4.1.0.md`** (o
> documento vence — proibição #27), o que corrigiu o rascunho do `SCHEMA.md`: **10 atributos**
> (Destreza/Força/Luta/Pontaria/Vigor/Intelecto/Medicina/Sentidos/Social/Vontade), não 4 —
> **`sentidos` é um atributo**, não campo à parte (a Área de Percepção `5 + Sentidos×5` é
> derivada); **subclasse não é campo** — `ClasseEnum` já codifica as três Experimento e `CIVIL`,
> então guarda-se só `classe` + `arquetipo` (`ArquetipoEnum | null`, null p/ Experimento/Civil);
> **`nivel` 0–20**, **`prestigio`** inteiro que pode negativar e do qual a **Patente é derivada**
> (não persistida); **`estado`** com `vidaAtual`/`energiaAtual` (pode negativar) + listas
> `sequelas` (temporárias) / `traumas` (permanentes, `tratado`) / `lesoes` (estruturadas:
> `atributo`/`pontos`/`severidade`/`permanente`); **`habilidades`** com `categoria` +
> `custoEnergia` (número/0/`null` variável); **`inventario` reusa o carrinho da calculadora M1**
> (`{ itens: CarrinhoItemDto[], amplificadores: AmplificadorAplicadoDto[] }` de
> `shared/regras/compras` — **sem duplicar tipo**, `regras/` segue zero-dep). **Nenhum derivado
> persistido** (vida/energia máx, defesa, deslocamento, dano de corpo/furtivo, limite de
> inventário, DT, proficiência, patente/salário/limite de modificações). 3 enums novos de
> conteúdo de jogo em `shared/src/enums/` (§10.3, sem tabela `tipo_*`): `ArquetipoEnum` (9),
> `SeveridadeLesaoEnum` (LEVE/GRAVE/MORTAL), `HabilidadeCategoriaEnum` (8). **Escopo consciente:**
> a spec fixou o 1:1 em classe/atributos/estado/inventário; domínios do documento **não listados**
> (Identidade — Personalidade/Origem —, Dinheiro, Maestrias, Peculiaridade) ficaram **de fora** do
> contrato inicial e entram nas tasks de formulário do M3 (registrado no `SCHEMA.md`). `SCHEMA.md`
> passado de rascunho para a forma final do jogador. `build`/`lint`/`test` do shared verdes
> (**143/143**; interfaces não emitem runtime, os 3 enums resolvem 9/3/8); subpath compila e
> resolve em `dist/dtos/ficha`. Fora de escopo: migrations/tabelas (m3-02), validação via motor de
> regras no service (m3-03), `FichaCriaturaDadosDto`/NPC (M4). Sessão anterior (**m2-15 —
> refino visual da tela de campanhas**: passe de acabamento **SCSS-first** (com marcação mínima,
> sem tocar em TS/lógica/regra de negócio) aproximando a **lista** (`/painel`) e o **detalhe**
> (`/painel/:id`) dos protótipos `docs/design/examples/campanhas.html` e `lobby-de-campanha.html`,
> só apresentação e só com tokens do tema (proibição #29). Conteúdo decorativo dos protótipos **sem
> backing no schema** (status ao vivo/agendada/pausada, briefing, log de atividade, indicador online,
> níveis de esquadrão, "meu agente") ficou **de fora**, como a m2-09 já registrara. **Lista:** itens
> ganharam presença de "card de campanha" — avatar 40→44px, nome mono 14/600→15/700, padding
> 14/16→16/18px, gap 12→14px (esqueleto e bloco de avatar acompanham a nova silhueta); o cabeçalho do
> card ganhou **contagem à direita** (`card__contagem`, nº de campanhas — dado já em tela, mono mute),
> no padrão do contador de seção dos protótipos. **Detalhe:** o subtítulo seco "Membros" virou
> **cabeçalho de seção temático** (`detalhe__secao` — rótulo mono uppercase + régua fina +
> **contagem de membros** à direita), espelhando o painel "ESQUADRÃO 4" do lobby; e o **código de
> convite** passou a ser **emoldurado como campo próprio** (`detalhe__codigo` com caixa `--surface` +
> borda + raio), dando hierarquia de "credencial" como no protótipo, em vez de texto solto. Nenhum
> seletor usado pelos testes foi renomeado (`.detalhe__acoes`/`__exclusao`/`__membro-*`/`__entrada`,
> `.card__titulo`, `.campanhas`); comportamento das m2-12/m2-13 intacto (editar/excluir campanha,
> remover jogador, transferir mestre só se acomodaram melhor no layout). Responsividade da m2-08
> preservada (alvos de toque ≥44px, sem scroll horizontal ~384px). `lint`/`test` (**118/118**)/`build`
> (562,78 kB inicial, dentro do budget de 565 kB, sem warning; AOT type-checou os templates) verdes;
> conferido visualmente por render (desktop + 384px) contra os dois protótipos. **Fecha as tasks de
> polimento do M2.** Fora de escopo: qualquer dado/campo/seção novo, features funcionais e backend.
> Sessão anterior no mesmo dia (**m2-14 —
> frontend de perfil do usuário**: fecha o self-service do usuário na UI sobre o backend das
> m2-11 (perfil) e m2-03 (senha) — só camada de frontend. Novo módulo `modules/usuario/` com
> `UsuarioService` (`providedIn:'root'`, transporte HTTP puro — extrai o `dados` do
> `StandardResponse`, DTOs do shared `./dtos/usuario`, JWT via `auth-token.interceptor`):
> `recuperarPerfil` (`GET /usuario/perfil`), `alterarPerfil` (`PATCH /usuario/perfil`),
> `alterarSenha` (`PATCH /usuario/senha`) e `excluirConta` (`DELETE /usuario`, mapeia a resposta a
> `void`). **Rota privada nova `/perfil`** (lazy `loadChildren` em `usuario.routes`, atrás do
> `autenticacaoGuard`) e **item "Perfil"** no dropdown de perfil da topbar (`shared/layout`, ícone
> `agente`, antes de "Campanhas"). **Tela de perfil** (`paginas/perfil/`, standalone, Signals,
> Reactive Forms) com três cards: **editar nome/login** (`alterarPerfil` — reflete a nova
> identidade na sessão via novo `SessaoService.atualizarPerfil({nome,login})`, que atualiza o
> Signal + `localStorage` mantendo token/id, então a topbar acompanha sem novo login; login em uso
> é barrado pelo backend §11 e o toast vem do `error-handler`), **trocar senha** (`senhaAtual` +
> `novaSenha` com o toggle "olhinho" existente, `minLength(6)`; ao concluir limpa o formulário — a
> senha nunca fica retida) e **excluir conta** (**confirmação inline forte** — sem `confirm()`
> nativo, fora do tema; caixa `--accent-dim`/`--accent-border` no padrão das m2-12/m2-13; ao
> confirmar: `excluirConta` → `SessaoService.sair` → navega a `/login`). Feedback de sucesso inline
> (`--positive`) por não haver toast de sucesso global. `.scss`/BEM só com tokens (proibição #29 —
> card/botão/campo/olho/esqueleto copiados dos blocos sancionados), alvos de toque 44px no mobile,
> nenhum DTO redefinido no front (os 5 DTOs das m2-11/m2-03 já existiam no shared: `Usuario
> Recuperado/PerfilAlterar/PerfilAlterado/SenhaAlterar/SenhaAlterada`). **+13 testes** (Vitest):
> **4** no `usuario.service.spec` (cada método atinge rota/verbo/corpo e mapeia o `dados`), **1** no
> `sessao.service.spec` (`atualizarPerfil` reflete nome/login mantendo token/id no Signal e no
> `localStorage`), **6** no `perfil.page.spec` (carrega o perfil nos campos; salvar chama
> `alterarPerfil` e `atualizarPerfil`; trocar senha chama `alterarSenha` e limpa o form; nova senha
> curta não chama o backend; excluir exige confirmação → `excluirConta`+`sair`+navega a `/login`;
> cancelar não toca o backend) e **2** no `app.routes.spec` (`/perfil` redireciona ao login sem
> sessão e resolve a tela com sessão). `lint`/`test` (**118/118**)/`build` (562,78 kB inicial,
> dentro do budget de 565 kB, sem warning; AOT type-checou os templates; `perfil-page` vira chunk
> lazy) verdes. O `/usuario` já estava no proxy de dev (m2-11). Fora de escopo: backend (m2-11 /
> m2-03) e refino visual da tela de campanhas (m2-15). Sessão anterior no mesmo dia (**m2-13 —
> frontend de gestão de membros da campanha**: leva à tela de detalhe (`/painel/:id`), **só para o
> mestre**, a **remoção de jogador** e a **transferência do papel de mestre** sobre os endpoints da
> m2-10 (backend já pronto — só camada de frontend). O `CampanhaService` (frontend) ganhou
> `removerMembro(id, usuarioId)` (`DELETE /campanha/:id/membro/:usuarioId`, retorna
> `CampanhaMembroRemovidoDto`) e `transferirMestre(id, novoMestreUsuarioId)`
> (`POST /campanha/:id/mestre/transferir` com corpo `{ novoMestreUsuarioId }`, retorna
> `CampanhaMestreTransferidoDto`) — só transporte, DTOs do shared, autoridade no backend (§14). Na
> **lista de membros** do detalhe, cada linha de **jogador** (nunca a própria linha do mestre) ganha
> dois botões-ícone de gestão (coroa = transferir mestre, lixeira = remover). Cada ação abre uma
> **confirmação inline** na própria `<li>` (Signal `acaoMembro {usuarioId, tipo}` — **sem `confirm()`
> nativo**, fora do tema; caixa com `--accent-dim`/`--accent-border` no mesmo padrão da exclusão da
> m2-12); a de transferir deixa **claro que o mestre passará a jogador**. Ao **remover**, o membro sai
> da lista (`membros.update` filtrando); ao **transferir**, recarrega os membros (`listarMembros`) — o
> `ehMestre` (derivado dos membros vs `sessao.usuario().id`) recomputa para `false` e **todas** as
> ações de mestre (editar/excluir/convite/gestão) somem na hora, e o novo mestre passa a tê-las. A
> `<li>` de membro virou coluna (`&__membro-linha` + confirmação abaixo); botões-ícone reusam o
> tratamento do `&__copiar` (32px, hover `--accent-border`), alvos de 44px no mobile. Signals/
> standalone/Reactive Forms; `.scss`/BEM só com tokens (proibição #29), nenhum DTO redefinido no
> front (os 4 DTOs da m2-10 já existiam no shared). **+7 testes** (Vitest): **2** no
> `campanha.service.spec` (DELETE/POST atingem rota/verbo/corpo certos e mapeiam o `dados`) e **5** no
> `detalhe.page.spec` (gestão só na linha do jogador e nunca na do mestre; jogador comum não vê nada;
> remover chama `removerMembro` e tira o membro da lista; transferir chama `transferirMestre` e perde
> as ações de gestão/editar/excluir na hora; cancelar não toca o backend) — `lint`/`test`
> (**105/105**)/`build` (562 kB inicial, dentro do budget de 565 kB, sem warning; AOT type-checou os
> bindings do template) verdes. Fora de escopo: backend (m2-10), edição/exclusão da campanha (m2-12) e
> refino visual geral (m2-15). Sessão anterior no mesmo dia (**m2-12 —
> frontend de edição e exclusão de campanha**: fecha o CRUD de campanha na UI sobre os endpoints
> `PUT`/`DELETE /campanha/:id` da m2-04 (backend já pronto — só camada de frontend). O
> `CampanhaService` (frontend) ganhou `alterarCampanha(id, dto)` (`PUT`, retorna
> `CampanhaAlteradaDto`) e `excluirCampanha(id)` (`DELETE`, mapeia a resposta a `void`) — só
> transporte, DTOs do shared, autoridade no backend (§14). Na tela de **detalhe** (`/painel/:id`),
> **só para o mestre** (`ehMestre` já derivado dos membros): **edição inline** de nome/descrição via
> **Reactive Forms** (Signal `editando` alterna o card entre exibição e formulário; ao salvar,
> reflete o resultado no Signal `campanha` **e** no `CampanhaContextoService` — o seletor da topbar
> atualiza junto) e **exclusão com confirmação inline** (Signals `confirmandoExclusao`/`excluindo`;
> **sem `confirm()` nativo** — fora do tema; ao confirmar, `excluirCampanha` → navega de volta a
> `/painel`). Dois glifos novos de linha no `shared/icone` (`editar` lápis / `excluir` lixeira, mesmo
> SVG `stroke: currentColor`, sem emoji) para os botões do mestre. O jogador **não vê** as ações;
> tentativa direta seria barrada com 403 pelo backend e tratada pelo `error-handler`. Confirmar
> exclusão reusa `.botao--primario` (accent = vermelho já é a cor de perigo do tema, sem inventar
> variante); caixa de confirmação com `--accent-dim`/`--accent-border`. `.scss`/BEM só com tokens
> (proibição #29), standalone, alvos de toque 44px no mobile. **+7 testes** (Vitest): **2** no
> `campanha.service.spec` (PUT/DELETE atingem rota/verbo/corpo certos e mapeiam o `dados`) e **5**
> no novo `detalhe.page.spec` (só o mestre vê editar/excluir; a edição chama `alterarCampanha` e
> reflete nome no card **e** no `CampanhaContextoService`; a exclusão exige confirmação, chama
> `excluirCampanha` e navega a `/painel`; cancelar não toca o backend) — `lint`/`test`
> (**98/98**)/`build` (562 kB inicial, dentro do budget de 565 kB, sem warning) verdes; o `build`
> de produção (AOT) type-checou os bindings do template. Fora de escopo: gestão de
> membros/transferência de mestre no front (m2-13) e refino visual geral (m2-15). Sessão anterior no
> mesmo dia (**m2-11 —
> perfil do usuário (backend)**: completa o self-service do módulo `usuario` (m2-03) com
> **alteração de perfil (nome + login)** e **exclusão da própria conta** (soft delete), sem
> frontend nem WebSocket. `alterarPerfil` (`PATCH /usuario/perfil`): altera `nome`/`login` do
> usuário autenticado (`@ActiveUser()`); **valida unicidade do `login`** reusando
> `recuperarPorLogin` (m2-02) — login em uso por **outra** conta ativa → `BusinessException('Login
> já está em uso')` (§11), reinformar o próprio login é permitido; a resposta **nunca** inclui a
> senha. `excluirConta` (`DELETE /usuario`): soft delete da **própria** conta via
> `executarSoftDelete` (guarda existência → `ResourceNotFoundException`); o encerramento da sessão
> do cliente fica para o frontend (m2-14). Repositório `usuario` (dono, proibição #23) ganhou
> `alterarPerfil` (`UPDATE nome, login ... RETURNING id, login, nome`) e `excluirConta` (embrulha
> `executarSoftDelete`). 4 DTOs novos no shared (`UsuarioPerfilAlterarDto {nome,login}` /
> `UsuarioPerfilAlteradoDto {id,login,nome}` — sem senha; internos `UsuarioPerfilInternoAlterarDto
> {id,nome,login}` e `UsuarioExcluirDto {id}`); **+5 testes de service** (Vitest, **43/43** no
> backend) cobrindo alteração de nome/login, rejeição de login duplicado, reinformar o próprio
> login e a exclusão. Edge conhecido do v1 (campanhas órfãs de um mestre que exclui a conta) fica
> **fora de escopo** — a saída é transferir o mestre (m2-10) ou excluir a campanha antes.
> `lint`/`build`/`test` do backend verdes; fluxo validado **ao vivo contra o Postgres** (alterar
> perfil sem senha na resposta, 400 no login duplicado, `DELETE` → 404 subsequente + `is_deleted`/
> `deleted_date` conferidos no banco). Sessão anterior no mesmo dia (**m2-10 —
> gestão de membros da campanha pelo mestre (backend)**: estende o módulo `campanha` (m2-04/m2-05)
> com **remoção de jogador** e **transferência do papel de mestre**, sem frontend nem WebSocket.
> `removerMembro` (`DELETE /campanha/:id/membro/:usuarioId`): só o **mestre** remove (gate
> `validarMestre` — único árbitro, proibição #28); o mestre **não** pode remover a si mesmo
> (`BusinessException` orientando a transferir o papel ou excluir a campanha), membro-alvo
> inexistente → `ResourceNotFoundException`; remoção é soft delete do `campanha_membro`.
> `transferirMestre` (`POST /campanha/:id/mestre/transferir`): só o **mestre atual** transfere —
> promove um membro `JOGADOR` a `MESTRE` e **se rebaixa a `JOGADOR`** na mesma ação, mantendo a
> invariante de **exatamente um mestre**; alvo não-membro → `ResourceNotFoundException`, alvo =
> próprio / já-mestre → `BusinessException`. **Decisão de escopo que alterou a constituição:** o
> mestre deixou de ser necessariamente "(o criador)" — o papel é transferível (SYSTEM.SPEC §14 +
> SCHEMA.md atualizados). No repositório, a transferência é **atômica num único `UPDATE`** com
> `CASE` sobre os dois vínculos (troca os papéis sem janela intermediária); a remoção espelha o
> `executarSoftDelete` para a chave composta de `campanha_membro`. 4 DTOs públicos + 2 internos no
> shared; **+10 testes de service** (Vitest, **38/38** no backend) cobrindo permissões e a
> invariante de um único mestre. `lint`/`build`/`test` do backend verdes. Sessão anterior no mesmo
> dia (**toggle "olhinho"
> de revelar senha** no login e no registro, a pedido do autor). Dois glifos novos de linha no
> `shared/icone` (`olho` / `olho-fechado`, mesmo SVG `stroke: currentColor`, sem emoji); botão
> sobreposto à direita do campo (`&__olho`, alvo de 44px, `aria-label`/`aria-pressed`) alterna o
> `[type]` do input entre `password`/`text` via Signal. Login tem **um** toggle (`senhaVisivel`);
> registro tem **dois independentes** (`senhaVisivel` + `confirmacaoVisivel` — revelar a senha não
> afeta a confirmação). Reactive Forms/Signals/standalone, só tokens (`--text-mute`/`--text`,
> proibição #29), validações preservadas. `lint`/`test` (91/91)/`build` (562 kB) verdes; conferido
> no S24+ (oculto `••••` ↔ texto revelado, ícone alterna). Sessão anterior no mesmo dia (**revisão visual
> mobile da m2-08 no Galaxy S24+** — 384px CSS, via Playwright/Chromium com sessão + API de campanha
> mockadas; overflow horizontal conferido programaticamente = **zero** nas 7 telas). A revisão aprovou
> a m2-08 e rendeu **3 melhorias de UI/UX** aplicadas (SCSS-only, `lint`/`test` 91/91/`build` 561 kB
> verdes, re-conferidas por screenshot): **(1)** o **chip de campanha ativa some no mobile** — colapsado
> a só o ícone, ele duplicava o glifo "campanhas" do nav Painel ao lado, sem valor (o texto do chip fica
> escondido); **(2)** o **painel de marca de login/registro enxuga no mobile** — esconde descrição/
> destaques/nota (mantém logo+eyebrow+slogan), trazendo o formulário pra cima da dobra (escopado ao
> `&__marca` porque `--descricao` também existe no painel do formulário); **(3)** as **ações Criar/Entrar
> da lista empilham em coluna** (largura total) no mobile em vez de duas colunas apertadas. Uma 4ª ideia
> testada (`justify-content: flex-start` no painel do formulário) foi **descartada** — sem efeito visível,
> o espaço percebido era padding legítimo, não banda morta (bom exemplo de testar antes de aplicar).
> Sessão anterior no mesmo dia (m2-08 —
> **refinamento mobile de auth + campanhas**, **fechando o M2 no código: 9/9 tasks**). Passe de
> acabamento responsivo (~360px) **SCSS-only** sobre as telas do M2 como ficaram pós-m2-09, na
> linha da m1-15. Reusa os tokens de `_breakpoints.scss` (`$bp-mobile: 560px`, mixin `mobile`,
> `$alvo-toque: 44px`) — nenhuma largura mágica por arquivo, nenhum hex/fonte/raio solto
> (proibição #29). **Achado de partida:** o override global de densidade (`--pad-card`/`--gap-grid`
> num `@media` no `styles.scss`) e a trava `html { overflow-x: clip }` da m1-15 **já eram globais**
> e cobriam as telas de campanha; e a m2-09 já entregara um 1º passe mobile na topbar (colapso de
> rótulos) e no split-panel de auth (`flex-wrap` + troca de borda). Logo o trabalho real foi
> **alvo de toque ≥ 44px** nas superfícies novas (m2-09), não reflow. **(1) Topbar** (`shared/layout`):
> nav central, chip de campanha, gatilho + itens do dropdown de perfil e botões de sessão
> (Entrar/Registrar) ganharam `min-height`/`min-width: bp.$alvo-toque` no mobile (os que colapsam
> pra ícone também `justify-content: center`); o **wordmark textual "CONTRATADOSRPG" passou a ser
> escondido no mobile** (o logo `app-marca` já ancora a identidade) — libera a largura que nav+perfil+
> tema disputavam em ~360px, evitando que a topbar estourasse/fosse cortada. **(2) Auth** (login/
> registro): inputs e botão de enviar com `min-height` de 44px; painel de marca (que empilha inteiro
> acima do formulário) com padding apertado (34→22px), painel do formulário 26/20px e slogan 22→19px
> pra trazer o formulário mais pra cima da dobra. **(3) Campanha:** `criar`/`entrar` — inputs/enviar
> 44px; `lista` — ações Criar/Entrar esticam (`flex: 1`) e viram alvos de 44px; `detalhe` — botão de
> **copiar convite de 34→44px**, "Regenerar" e "Voltar" com 44px. Só `.scss` — zero mudança de DOM/TS,
> nenhum teste tocado. `lint`/`test` (91/91)/`build` (561 kB inicial, dentro do budget de 565 kB, sem
> warning) verdes. Verificação responsiva **estática** (sem tooling de browser no ambiente): Sass
> compilou (todos os `@use bp`/`bp.mobile`/`bp.$alvo-toque` resolvem), e o bundle emitido carrega as
> 25 media queries `max-width:560px` e os alvos de 44px; conferência de largura confirma que as únicas
> larguras fixas novas são os alvos quadrados intencionais (copiar 44×44), todo o resto é `min-*` que
> cresce o toque sem restringir layout. Sessão anterior no mesmo dia: 3 ajustes de
> UI/UX a pedido do autor, achados numa revisão de hover/foco do sistema). **(1) Ícone "tema"
> maior:** `font-size` do `app-icone` no gatilho subiu de 13px pra 17px — o glifo de sliders tem
> mais traço que o círculo antigo e ficava espremido/difícil de reconhecer. **(2) Foco de teclado
> brandado (acessibilidade):** regra global nova em `_base.scss` (+ mirror `docs/design/tema/`,
> documentada em `docs/design/DESIGN.md`) — `a:focus-visible, button:focus-visible { outline: 2px
> solid var(--accent-border); outline-offset: 2px; }`, definida **uma vez**, nenhum componente
> repete; inputs ficam de fora (já têm `:focus` próprio). **(3) Hover dos botões do sistema
> auditado:** achado que `.botao--primario`/`.botao--secundario` (bloco sancionado, duplicado em
> 6 páginas + o canônico `docs/design/tema/_componentes.scss`) **nunca tiveram hover** desde que
> foram criados — corrigido nos 7 lugares: primário ganha `filter: brightness(1.08)` (funciona com
> qualquer accent trocado em runtime, não uma 2ª cor fixa), secundário ganha
> `background: var(--surface-2)` + `border-color: var(--accent-border)`. Também reforçado:
> `.topbar__perfil-gatilho` (não tinha hover) e `.detalhe__copiar` (só trocava a cor do texto,
> agora também fundo+borda, consistente com o secundário). `lint`/`test` (91/91)/`build` verdes,
> conferido visualmente (hover + foco por Tab). Sessão anterior no mesmo dia: glifo do ícone
> "tema" trocado por "ajustes/sliders" — o autor escolheu essa opção entre 6 comparadas num
> artifact; path final `M5 21v-8M5 9V3M12 21v-7M12 10V3M19 21v-4M19 13V3` +
> `M3 13h4M10 10h4M17 13h4` no `@case ('tema')` de `shared/icone`. Comunica "3 controles
> ajustáveis" (base + preset + cor custom), mais fiel ao que o painel faz do que uma metáfora
> literal de sol/lua. `lint`/`test` (91/91) verdes, conferido visualmente. Sessão anterior no
> mesmo dia: 3 melhorias de
> UI/UX sugeridas e aplicadas a pedido do autor). **(1) Ícone do gatilho de tema:** trocou o glifo
> unicode cru `◐` (`config-gatilho__marca`) por `<app-icone nome="tema">` — novo glifo (`shared/
> icone`, círculo bissectado por uma linha) alinhado ao resto do sistema de ícones, único lugar que
> ainda fugia do padrão. **(2) Esqueletos de carregamento:** `campanhas` lista/detalhe trocaram o
> texto seco "Carregando…" por blocos `.esqueleto-bloco` pulsantes (`@keyframes esqueleto-pulso`,
> respeita `prefers-reduced-motion`, só token `--border-strong`) mimetizando a silhueta do conteúdo
> real (avatar+linha na lista; título+convite+linhas no detalhe) — `role="status"` mantém o
> anúncio pra leitor de tela. **(3) Hover das linhas de campanha:** o `<a class="campanhas__ligacao">`
> passou a envolver avatar+texto+chip (a linha inteira, que antes só a área de nome/descrição era
> clicável) e ganhou fundo `--accent-dim` no hover — antes só a borda escurecia; a lista de membros
> do detalhe **não** ganhou o mesmo hover porque não é clicável (interativo deve parecer
> interativo, e vice-versa). `lint`/`test` (91/91)/`build` verdes, conferido visualmente. Sessão
> anterior no mesmo dia: correção: o `.3` da
> `--grid-line` foi engano do autor — achava que o valor inicial já era `.2` (era `.02`) e pediu
> `.3` achando que seria um ajuste pequeno. Corrigido pra `.03`, mantendo a mesma proporção de
> aumento (~1,5×) que o autor pretendia sobre o valor real de origem. `lint`/`test` (91/91) verdes.
> Sessão anterior no mesmo dia: `--grid-line` subiu
> de novo, a pedido do autor: de `rgba(255,255,255,.045)` pra `.3` — grade de fundo agora bem
> marcada (efeito "papel quadriculado"), não mais discreta. Mesmo token único e global
> (`_tokens.scss` + mirror `docs/design/tema/`, `--grid-cell` 32px intocado). `lint`/`test` (91/91)
> verdes, conferido visualmente. Sessão anterior no mesmo dia: contraste do avatar
> decorativo reforçado, achado ao conferir a base clara: as listras diagonais (`.topbar__avatar`,
> `.campanhas__avatar`, `.detalhe__avatar`) usavam `--surface`/`--surface-2` — par calibrado pra
> diferença sutil de superfície, quase invisível na base clara (`#ffffff`/`#e7eaee`, m1-13). Trocado
> por `background-color: var(--surface-2)` + listras em `var(--border-strong)` (alpha já calibrado
> pra ler em cima de superfícies nas duas bases), mesmo raciocínio nos 3 lugares. `lint`/`test`
> (91/91) verdes, conferido visualmente nas duas bases. Sessão anterior no mesmo dia: grade de fundo mais
> visível, a pedido do autor: `--grid-line` de `_tokens.scss` (frontend + mirror
> `docs/design/tema/`) foi de `rgba(255,255,255,.02)` pra `rgba(255,255,255,.045)` — mesmo
> `--grid-cell` de 32px, token único e global (`body` em `_base.scss`), nada de valor solto por
> componente. `lint`/`test` (91/91) verdes, conferido visualmente (grade perceptível a olho nu sem
> virar poluição visual). Sessão anterior no mesmo dia: 2 achados de UI/UX
> corrigidos, a pedido do autor, ao revisar os prints da m2-09: (1) o `card__indice` de `campanhas`
> lista/detalhe mostrava literalmente **"M2"** (nome do milestone interno) pro usuário final — trocado
> por `//`, o mesmo neutro já usado em `criar`/`entrar`; (2) itens da lista de campanhas e da lista de
> membros do detalhe ganharam o **avatar decorativo** (quadrado com listras diagonais, mesmo padrão do
> botão de perfil da topbar) que faltava — antes era só texto+chip, sem o ícone que ancora cada linha
> nos protótipos. `lint`/`test` (91/91)/`build` verdes, conferido visualmente. Sessão anterior no mesmo
> dia (ajuste pós-m2-09): (1) **rota raiz redireciona a `/painel`** — `app.routes.ts` trocou o `path: ''` que carregava
> a `Home` do M0 por `redirectTo: '/painel'` (`pathMatch: 'full'`); sem sessão, o `autenticacaoGuard` de
> `/painel` encadeia o redirect até `/login?retorno=%2Fpainel` — a `Calculadora` continua pública (sem
> guard, inalterada). A `Home`/`HealthService` do M0 (`pages/home/`, `core/services/health.service.ts`)
> ficaram irrecuperáveis por rota e foram **removidas** (o próprio comentário da `Home` já previa a
> substituição "a partir do M1"); `docs/DEPLOY.md` atualizado (a verificação pós-deploy não depende mais
> da home exibindo `/health` — agora é registro de teste sem erro de CORS, ou `GET .../health` direto no
> Render). (2) **Vermelho padrão do sistema trocado de `#e5484d` para `#d53030`** — `--accent`/`--vida`
> em `_tokens.scss` (frontend + mirror `docs/design/tema/`), preset `'vermelho'` do `TemaService`, e a
> paleta 50-950 do `contencao.preset.ts` (frontend + mirror) regenerada com `palette('#d53030')` do
> `@primeuix/themes` (a antiga não batia bit-a-bit com a função atual — provavelmente gerada por versão
> diferente da lib); `CLAUDE.md` (tabela TEMA VISUAL) e testes do `tema.service.spec` ajustados. Segue
> passando a trava de contraste (§WCAG, piso 3:1) nas duas bases. Validado com `lint`/`test` (91/91,
> chunk da home some do bundle)/`build` (sem warning de budget) e conferência visual via Playwright
> (root deslogado → `/login`, root logado → `/painel`, calculadora pública sem sessão). Sessão anterior
> no mesmo dia: m2-09 — **revisão geral de
> estilização**: alinha topbar, autenticação e campanhas aos novos protótipos de `docs/design/examples/`
> (`login`/`cadastro`/`campanhas`/`lobby-de-campanha`/`topbar`). **Topbar (`shared/layout`)** reconstruída
> na direção "Barra de Comando" (1a) do handoff: nav central Painel/Calculadora (ícone + `routerLinkActive`,
> mesmo padrão do `CalculadoraShell`), seletor de campanha ativa (chip nome+código, só dentro de
> `/painel/:id`) alimentado pelo novo `CampanhaContextoService` (`modules/campanha/`, `providedIn:'root'`,
> puro estado de apresentação — `CampanhaDetalhe` define ao carregar e limpa ao desmontar via
> `DestroyRef`), dropdown de perfil (Campanhas/Encerrar sessão) que fecha só por ação (mesmo padrão de
> acessibilidade do painel de tema, sem clique-fora). **`shared/icone`** ganhou 11 novos glifos
> (`campanhas`, `calculadora`, `sair`, `entrar`, `chevron`, `copiar`, `mais`, `convite`, `coroa`,
> `atualizar`, `voltar`), reusando `agente`/`protecoes` onde já serviam. **`login`/`registro`** viraram
> layout split marca+formulário (detalhes de canto, eyebrow, destaques com ícone), mesmos campos/
> validators de antes — sem o bloco decorativo de "entrar por código" pré-autenticação do protótipo (não
> existe esse fluxo no domínio). **Marca do projeto** (`frontend/public/logo-{white,black}.{png,svg}`,
> assets do autor do design): novo componente `shared/marca/` troca a variante branca/preta conforme a
> base ativa do tema (`TemaService.base`) e substitui o wordmark só-texto na topbar e no painel de marca
> de login/registro, que ganhou também a marca d'água (`opacity: .04`, canto inferior direito, mesmo
> tratamento dos protótipos) no painel de marca; budget de bundle inicial ajustado de 560→565 kB no
> `angular.json`. **Correção:** a nav da topbar escondia "Calculadora" (rota pública, sem guard) junto
> com "Painel" quando deslogado — agora só "Painel" fica condicionado à sessão, "Calculadora" sempre
> visível. **`campanhas` lista**: ícones nos botões de ação e no `chip-papel`
> (coroa mestre / escudo jogador). **`campanha` detalhe**: botão de copiar o código de convite
> (clipboard, só apresentação), ícone no botão "Regenerar", `chip-papel` dos membros com ícone, link
> "Voltar" com seta. Conteúdo decorativo dos protótipos sem dado real (chips de status ao vivo/agendada/
> pausada, briefing, log de atividade, indicador online) ficou de fora — não existe no schema de
> `campanha`/`campanha_membro`. Nenhuma regra de negócio, permissão (§14 continua só backend) ou de jogo
> alterada; `/painel/criar`/`/painel/entrar` continuam páginas dedicadas (sem mudança de IA). Validado com
> `lint`/`test` (91/91) verdes e `build` de produção; telas conferidas visualmente via Playwright headless
> (topbar deslogado/logado, seletor de campanha, dropdown de perfil, login, registro, lista e detalhe com
> API mockada). **Fecha as 9 tasks do M2.** Sessão anterior no mesmo dia: m2-07 — **frontend de
> campanhas**: fecha o fluxo do M2 na UI sobre o backend das m2-04/m2-05 e a sessão/guard da m2-06. Módulo
> `modules/campanha/` com `CampanhaService` (`providedIn:'root'`, transporte HTTP puro — extrai o `dados`
> do `StandardResponse`, DTOs do shared `./dtos/campanha`, JWT via `auth-token.interceptor`) e **4 telas
> standalone lazy** montadas sob `/painel` (guard `autenticacaoGuard`, `loadChildren`): `lista` (`/painel`)
> — campanhas do usuário com o papel (chip `MESTRE`/`JOGADOR`), links p/ criar/entrar/detalhe; `criar`
> (`/painel/criar`) e `entrar` (`/painel/entrar`) — Reactive Forms, ao concluir navegam ao detalhe da
> campanha criada/ingressada; `detalhe` (`/painel/:id`, id do `ActivatedRoute.snapshot`) — nome/descrição,
> membros com papel, e **só para o mestre** o `codigo_convite` + botão **regenerar** (o `ehMestre` é
> derivado da lista de membros vs `sessao.usuario().id` — apenas apresentação; a autoridade é o backend §14,
> um jogador regenerando levaria 403 via `error-handler`). Estado em Signals; `.scss`/BEM/tokens do tema
> "Terminal de Contenção" (proibição #29 — card/botão/chip copiados de `_componentes.scss`, zero hex solto).
> A casca semente `pages/painel/` da m2-06 foi **substituída** por este módulo; proxy dev passou a encaminhar
> `/campanha` ao backend. DTOs consumidos do shared, nunca redefinidos no front. **18 arquivos de teste /
> 91 testes** no frontend (novo `campanha.service.spec` 6 — cada método atinge rota/verbo certo e mapeia o
> `dados`; `app.routes.spec` ajustado: `/painel` agora resolve a lista de campanhas `.campanhas`);
> `lint`/`build`/`test` do frontend verdes. Nenhuma regra de jogo (`shared/regras` intocado), nenhuma
> alteração de backend. Sessão anterior no mesmo dia: m2-06 — **primeira UI
> do M2**: frontend de autenticação sobre o backbone JWT da m2-02/m2-03. `SessaoService` (`core/services`)
> é o dono do estado de sessão em runtime — Signal do `UsuarioAutenticadoDto` (token + `{id,login,nome}`),
> ações `registrar`/`logar`/`sair`, token persistido em `localStorage` (`contratados-rpg.sessao`) e
> restaurado no boot (F5 mantém a sessão). Telas públicas standalone lazy `login` (`/login`) e `registro`
> (`/registro`) em `modules/autenticacao/` — Reactive Forms (sem `ngModel`), BEM/tokens do tema "Terminal
> de Contenção"; o registro encadeia `registrar → logar` e cai no `/painel`. `auth-token.interceptor`
> injeta `Authorization: Bearer <token>` quando há sessão; o `error-handler.interceptor` ganhou o trato
> de `401` (só com sessão ativa: encerra a sessão e vai ao `/login?retorno=<url>`; login inválido é 400,
> não dispara). `autenticacaoGuard` (`core/guards`) protege a **primeira rota privada** `/painel` (casca
> mínima, semente da m2-07): sem sessão redireciona ao `/login` guardando o destino em `retorno`, retomado
> após logar. A topbar do `shared/layout` reflete a sessão (entrar/registrar deslogado ↔ nome + sair
> logado); a **calculadora permanece pública** (sem guard). Proxy dev encaminha `/autenticacao` ao backend.
> DTOs consumidos do shared (`./dtos/usuario`), nunca redefinidos no front. **17 arquivos de teste / 85
> testes** no frontend (novos: `sessao.service.spec` 6, `autenticacao.guard.spec` 2, `app.routes.spec` 4 —
> resolução das rotas públicas + redirect/liberação do guard); `lint`/`build`/`test` do frontend verdes.
> Sessão anterior no mesmo dia (2026-07-06): m2-05 — **fecha o
> backend de campanhas**: entrada por código de convite, regeneração do código e listagem de membros,
> sobre o módulo `campanha` da m2-04. `entrarCampanha` (`POST /campanha/entrar`): o usuário autenticado
> ingressa informando o `codigoConvite` e vira `JOGADOR`; código inexistente → `ResourceNotFoundException`
> (404), já-membro → `BusinessException` (400, respeitando `uix_campanha_membro_campanha_usuario_ativo`).
> `regenerarConvite` (`POST /campanha/:id/convite/regenerar`, **só mestre**): gera um novo código único
> e invalida o anterior (o antigo deixa de resolver). `listarMembros` (`GET /campanha/:id/membros`):
> nome do usuário + papel, visível a qualquer membro (`UnauthorizedAccessException` p/ não-membro). 3
> novas rotas na `CampanhaController` burra (8 no total), 3 métodos na `CampanhaService` (permissões
> reusando `validarMembro`/`validarMestre` da m2-04 — service é o único árbitro, proibição #28) e no
> `CampanhaRepository` (`recuperarPorCodigoConvite`, `alterarConvite`, `listarMembros` — este junta
> `campanha_membro`→`usuario`→`tipo_campanha_membro_papel`); 8 novos DTOs no shared (incl.
> `CampanhaConviteRegenerarDto`/`...RegeneradoDto`, `CampanhaEntrarDto`/`...EntradaDto`,
> `CampanhaMembrosListarDto`/`CampanhaMembroResumoDto`); **matriz de permissões da campanha (§14)** coberta
> por +9 testes de service (Vitest, **28/28** no backend); fluxo completo (entrar/listar/regenerar +
> mestre×jogador×não-membro) validado ao vivo contra o Postgres). Sessão anterior no mesmo dia: m2-04 —
> módulo `campanha` (backend): **CRUD completo de campanha** — criar (o criador vira `MESTRE`, gerando o
> `campanha_membro` com papel e um `codigo_convite` aleatório único), listar só as campanhas de que o
> usuário autenticado é membro (com o papel dele), recuperar (exige ser membro), alterar e excluir
> (soft delete) restritos ao **mestre** (`UnauthorizedAccessException`; a service é o único árbitro —
> proibição #28). `CampanhaController` burra (5 rotas protegidas) + `CampanhaService` (permissões +
> geração de convite) + `CampanhaRepository` (dono de `campanha`/`campanha_membro`, traduz `codigo ↔
> id` do papel no SQL); **1º pacote de DTOs de campanha** no shared + subpath `./dtos/campanha`; 10
> testes de service (Vitest, 19/19 no backend); CRUD + matriz de permissões validado ao vivo contra o
> Postgres). Sessão anterior no mesmo dia: m2-03 — perfil e
> troca de senha self-service do módulo `usuario`: **1ª rota protegida da API** consumindo o
> `@ActiveUser()`/`JwtAuthGuard` da m2-02 — `GET /usuario/perfil` (dados do usuário logado, **sem**
> senha) e `PATCH /usuario/senha` (valida `senhaAtual` por `bcrypt.compare` → `BusinessException` se
> incorreta; grava `novaSenha` como hash bcrypt); `UsuarioService` + `UsuarioController` burra +
> métodos `recuperarPorId`/`alterarSenha` no `UsuarioRepository`; 4 novos DTOs no shared; 4 testes de
> service (Vitest, 9/9 no backend); fluxo perfil + troca de senha validado ao vivo contra o Postgres).
> Sessão anterior no mesmo dia: m2-02 — backbone de
> autenticação do M2: módulo `autenticacao` (registro `@Public()` com senha bcrypt; login JWT via
> Passport `JwtStrategy` lendo `JWT_*` do `ConfigService`), `JwtAuthGuard` global via `APP_GUARD`
> ativando o `@Public()` do M0, decorator `@ActiveUser()`, e a persistência mínima do módulo `usuario`
> (`UsuarioRepository`); primeiro test-runner do backend (Vitest) com 5 testes de service; fluxo
> `registrar → logar → rota protegida` validado ao vivo contra o Postgres — **1ª camada de negócio da
> API**. Sessão anterior no mesmo dia: m2-01 — fundação de dados do M2: migrations `0002`–`0005`
> criando `usuario`/`tipo_campanha_membro_papel`/`campanha`/`campanha_membro` conforme `SCHEMA.md` +
> enum espelho `TipoCampanhaMembroPapelEnum`; round-trip `db:migrate`/`db:rollback` validado no
> Postgres local — **abre o M2**. Sessão anterior: m1-18 — scrollbar customizada global do tema
> "Terminal de Contenção", definida uma vez em `_base.scss` — só CSS global; **fecha o M1 no código, 18 tasks**.

---

## Estado Geral

**Fase:** M0 concluído (implementação em repositório). O esqueleto do monorepo npm workspaces está de pé
(`shared/`, `backend/`, `frontend/`) com os pacotes se importando corretamente. A
infraestrutura de banco local está pronta: PostgreSQL 16 via Docker Compose e Knex
configurado com migrations. O `core/` do backend está implementado (`ConfigService`,
`BaseEntity`, `BaseRepository`, exceções, filtro global e interceptor de resposta), com o
Nest app subindo de ponta a ponta sem erros. A API já expõe seu primeiro endpoint real,
`GET /health` (público, `StandardResponse`), validando o `core/` de ponta a ponta. O
frontend agora tem shell mínimo de pé: topbar + `router-outlet`, interceptors `loading` e
`error-handler`, proxy de dev para o backend e uma home que consome `GET /health` — a
integração HTTP frontend → backend → `StandardResponse` está provada de ponta a ponta. O
shell já usa o tema "Terminal de Contenção" (dark-first) a partir do handoff em
`docs/design/` — tokens, base e preset PrimeNG `ContencaoPreset` ligados. A integração
contínua está ativa: um workflow do GitHub Actions (`.github/workflows/ci.yml`) roda lint +
testes nos três workspaces em todo Pull Request — lint configurado nos três (backend já
tinha; shared e frontend ganharam eslint agora), testes via `--if-present` (só o frontend
tem testes antes do M1). O deploy fecha o M0 por **integração nativa das plataformas** (sem GitHub Actions no deploy):
no push para `master`, o Render (backend) e a Cloudflare Pages (frontend) puxam do Git e
reimplantam sozinhos, com banco de produção no Supabase. A ligação frontend→backend em produção
é cross-origin: o backend habilita CORS a partir de `APP_FRONTEND_ORIGEM` (`main.ts`) e o
frontend chama a URL absoluta do Render via `environment.apiBase` (dev fica vazio → chamada
relativa pelo proxy; produção fixa a URL do Render no `environment.production.ts`, embutida no
build). Provisionamento das plataformas em `docs/DEPLOY.md`. O backend em produção já responde
`/health` no Render; o frontend fica live quando as Pages forem conectadas ao Git com branch de
produção `master`. Ainda sem módulo de negócio — esses nascem a partir do M1.

## Status dos Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Fundação (workspaces, docs, Docker, core/, pipelines, deploy) | **concluído** (deploy nativo Render+Cloudflare; setup das plataformas em `docs/DEPLOY.md`) |
| M1 | Calculadora com paridade | **concluído no código** (`m1-01` a `m1-20`, incluindo os refinamentos pós-paridade: mobile `m1-15`, tema em runtime `m1-16`, singleton de estado das abas `m1-17`, scrollbar customizada `m1-18`, botão Limpar `m1-19` e **modo Vender na aba Compras `m1-20`** — taxa de venda + venda de fragmentos, 100% client-side sobre `shared/regras/compras/venda`). Restam 2 passos operacionais de plataforma: publicar a Cloudflare Pages e arquivar o repo antigo no GitHub (ver `docs/PARIDADE-M1.md`) |
| M2 | Auth + Campanhas | **concluído no código** (`m2-01`…`m2-09`, **9/9 tasks**) — dados + backbone de autenticação JWT com guard global + perfil/troca de senha self-service + CRUD de campanha com papéis + convite/membros + **frontend de autenticação** (login/registro, sessão, interceptor JWT, guard de rota) + **frontend de campanhas** (listar/criar/entrar por código/detalhe com membros + convite/regenerar do mestre) + **revisão geral de estilização** (topbar "Barra de Comando", split-panel de auth, ícones em nav/dropdown/chips/botões, alinhados aos protótipos de `docs/design/examples/`) + **refino mobile `m2-08`** (alvos de toque de 44px nas telas de auth/campanha/topbar + densidade do painel de marca, SCSS-only na linha da m1-15); **backend de campanhas fechado** e **fluxo do M2 completo ponta a ponta na UI**, usável no mobile (~360px). **Lote de extensão `m2-10`…`m2-15`** (CRUD restante de campanha/usuário): backend **m2-10** (gestão de membros — remover/transferir mestre), **m2-11** (perfil do usuário — alterar nome/login + excluir conta), frontend **m2-12** (edição/exclusão de campanha) e **m2-13** (frontend de gestão de membros — remover jogador / transferir mestre) **concluídos**; restam o frontend **m2-14** (perfil/exclusão de conta) e o refino visual **m2-15** |
| M3 | Ficha de Jogador | **em andamento** — **m3-01** concluído (contrato final `FichaJogadorDadosDto` do JSONB `ficha.dados` em `shared/dtos/ficha/` + `SCHEMA.md` fechado, derivado 1:1 de `sistema-v4.1.0.md`; 3 enums novos de conteúdo de jogo) + **m3-02** concluído (migrations `0006`–`0008`: `tipo_ficha` com seed + `ficha` com `dados JSONB` + `usuario_ficha_acesso`, round-trip `db:migrate`/`db:rollback` validado; enum de coluna `TipoFichaEnum`) + **m3-03** concluído (backend do CRUD da ficha de jogador: módulo `ficha` com controller/service/repository, matriz de permissões §14 no service, validação do documento contra `shared/regras`; DTOs de operação no shared; **verificado ao vivo contra o Postgres**; backend 64/64) + **m3-04** concluído (concessão/revogação de acesso de visualização — `usuario_ficha_acesso`: `concederAcesso`/`revogarAcesso`/`listarAcessos` no service, só dono ou mestre — reusa `validarPermissaoEdicao`, sem duplicar permissão; alvo precisa ser membro; idempotente; soft delete na revogação; 6 DTOs novos; **verificado ao vivo contra o Postgres**; backend 76/76) + **m3-05** concluído (gateway de tempo real WebSocket broadcast-only — `CampanhaGateway`/`GatewayModule`/`WsIoAdapter` em `core/gateway/`; handshake autenticado pelo mesmo `JwtService`/`JWT_SECRETO`; salas `ficha:<id>`/`campanha:<id>` com permissão §14 reusada das services; eventos `ficha:alterada`/`ficha:criada`/`membro:entrou` emitidos pelas services após a mutação; `forwardRef` gateway↔services; `CampanhaMembroEntradaDto` novo no shared; `ficha:criada` emite só o resumo (sem `dados` — §14); **verificado ao vivo com `socket.io-client`**; backend 87/87). Próxima: **m3-06** (frontend de criação/edição da ficha) |
| M4 | Ficha de Criatura/NPC | backlog |
| M5 | Guia de Missão | backlog |

## Status dos Módulos

| Módulo | Status |
|---|---|
| shared (estrutura) | **`interfaces/`** (`StandardResponse`/`PaginatedResult`) + **`enums/`** (`ClasseEnum`, `PatenteEnum`, `ItemCategoriaEnum`, `TipoDescansoEnum`, `QualidadeDescansoEnum`, `MotivoEntradaAgenteEnum` + `TipoCampanhaMembroPapelEnum` — m2-01, **1º enum de coluna**, espelho da tabela `tipo_*`; **+ m3-01:** `ArquetipoEnum` (9 arquétipos), `SeveridadeLesaoEnum` (LEVE/GRAVE/MORTAL) e `HabilidadeCategoriaEnum` (8) — enums de conteúdo de jogo do JSONB `ficha.dados`, sem tabela `tipo_*`; **+ m1-20:** `TaxaVendaEnum` (NORMAL/CHECKIN/FORA_PATENTE), `FragmentoTipoEnum` (POTENCIALIZADOR/CONSTRUTOR) e `FragmentoModuloEnum` (I–V) — conteúdo de jogo da venda, sem tabela `tipo_*`) + **`dtos/usuario/`** (m2-02, **1º pacote de DTOs de negócio**: `UsuarioCriarDto`/`UsuarioCriadoDto`, `UsuarioAutenticarDto`/`UsuarioAutenticadoDto` — saída sem `senha` — e os internos `UsuarioInternoCriarDto`/`UsuarioLoginRecuperarDto`/`UsuarioInternoRecuperadoDto`; **+ m2-03:** `UsuarioRecuperarDto {id}`/`UsuarioRecuperadoDto {id,login,nome}` (perfil, saída sem senha), `UsuarioSenhaAlterarDto {senhaAtual,novaSenha}`/`UsuarioSenhaAlteradaDto {id,login,nome}` (troca de senha) e o interno `UsuarioSenhaInternoAlterarDto {id,senha}` (repositório, senha = hash); export subpath `./dtos/usuario` no `package.json`; **+ m2-11:** `UsuarioPerfilAlterarDto {nome,login}`/`UsuarioPerfilAlteradoDto {id,login,nome}` (alteração de perfil, saída sem senha) e os internos `UsuarioPerfilInternoAlterarDto {id,nome,login}` (repositório) e `UsuarioExcluirDto {id}` (exclusão da própria conta)) **+ `dtos/campanha/`** (m2-04, **1º pacote de DTOs de campanha**: públicos `CampanhaCriarDto`/`CampanhaCriadaDto`, `CampanhaListarDto {usuarioId}`/`CampanhaResumoDto {id,nome,descricao,papel}`, `CampanhaRecuperarDto {id}`/`CampanhaRecuperadaDto`, `CampanhaAlterarDto`/`CampanhaAlteradaDto`, `CampanhaExcluirDto {id}`; internos `CampanhaInternoCriarDto`/`CampanhaInternoAlterarDto` e os do vínculo `CampanhaMembroInternoCriarDto`/`CampanhaMembroInternoRecuperarDto`/`CampanhaMembroInternoRecuperadoDto` — `papel` como `TipoCampanhaMembroPapelEnum`; subpath `./dtos/campanha` no `package.json`) **+ m2-05** (convite/membros: públicos `CampanhaEntrarDto {codigoConvite}`/`CampanhaEntradaDto {id,nome,descricao,papel}`, `CampanhaConviteRegenerarDto {id}`/`CampanhaConviteRegeneradoDto {id,codigoConvite}`, `CampanhaMembrosListarDto {campanhaId}`/`CampanhaMembroResumoDto {usuarioId,nome,papel}`; internos `CampanhaConviteRecuperarDto {codigoConvite}` e `CampanhaConviteInternoAlterarDto {id,codigoConvite}`) **+ `dtos/ficha/`** (m3-01, **1º pacote de DTOs de ficha** — contrato final do JSONB `ficha.dados` do jogador: `FichaJogadorDadosDto` + sub-DTOs `FichaAtributosDto` (10 atributos), `FichaEstadoDto`/`FichaSequelaDto`/`FichaTraumaDto`/`FichaLesaoDto`, `FichaHabilidadeDto` e `FichaInventarioDto` (reusa `CarrinhoItemDto`/`AmplificadorAplicadoDto` de `regras/compras`, sem duplicar); `interface readonly` puras; subpath `./dtos/ficha`; **+ m3-03:** DTOs de operação em `ficha-operacao.dtos.ts` (`Ficha{Criar,Criada,Listar,Resumo,Recuperar,Recuperada,Alterar,Alterada,Excluir}Dto` + internos `Ficha{InternoCriar,InternoAlterar,VisiveisInternoListar,AcessoInternoRecuperar,AcessoInternoRecuperado}Dto`); **+ m3-04:** `FichaAcesso{Conceder,Concedido,Revogar,Revogado}Dto` + `FichaAcessosListarDto`/`FichaAcessoResumoDto {usuarioId,nome}` — complemento `Acesso` inteiro antes do verbo); `validators/` ainda esqueleto |
| shared/regras | **`agente/` completo** (m1-02): 15 fórmulas puras da aba agente com testes Vitest conferidos contra o sistema (vida, energia, limite de energia, defesa/esquiva/bloqueio, proficiência, deslocamento, dano de corpo, dano furtivo, inventário, percepção, sanidade, limite hab./turno, benefícios por nível, progressão acumulada, limites por classe). **`dt/`, `novo-agente/`, `patente/` completos** (m1-03): DT de atributo (`10 + Nível + Atributo×2`); nível/prestígio iniciais + bônus monetário por motivo de entrada; lookup de patente por prestígio + recorte da aba, consumindo `PATENTES`. **`descanso/` completo** (m1-04): escada de dados (`ESCADA_DADOS` + `ajustarDado`/`elevarDado`/`descreverDado`), tabelas `DADOS_DESCANSO`/`QUALIDADE_MOD`, faixa de recuperação (`calcularDescanso`), interpretação de dados extras (`interpretarDadosExtras`), resultado a partir de valores rolados (`calcularResultadoDescanso`) + a utilidade de rolagem `rolarDados` (única brecha a `Math.random` — §6.6). **`compras/` completo** (m1-05): catálogo (`CATALOGO_CATEGORIAS`/`CATALOGO_ITENS`), modificações por categoria (`MODIFICACOES`) + custos (`CUSTO_MODIFICACAO`), amplificadores (`AMPLIFICADORES`) e limites por patente (`LIMITES_MODIFICACAO`); fórmulas `obterLimiteModificacoes`/`obterCustoModificacao`/`obterPesoModificacao`/`contarComprasModificacao`/`verificarConflitoModificacao`/`calcularStatItem` (reusa `elevarDado`)/`calcularCustoAmplificador`/`calcularTotaisCarrinho`/`calcularResumoCompras`, reusando `obterPatente` (m1-03). **+ m1-20 (venda):** submódulo `venda.{dtos,dados,ts}` — `MULTIPLICADOR_TAXA_VENDA` (0.5/0.75/0.25), `VENDA_FRAGMENTOS` (tabela módulo × tipo), `calcularValorVendaCarrinho` (taxa sobre o `gasto` de `calcularTotaisCarrinho`, sem recalcular custo), `obterValorFragmento` e `calcularVendaFragmentos`; conferidos 1:1 contra "Loja"/"Retornando após uma Missão"/"Venda de Fragmentos". `dados/` com `dadosAgente`, `dadosCivil` e `PATENTES` (m1-01) |
| backend/core | **pronto** (`BaseEntity`, `BaseRepository`, exceções, filtro, interceptor) |
| backend/config | **pronto** (`ConfigService`/`ConfigModule`, lê `DB_*`/`JWT_*`/`APP_*`) |
| backend/database | **pronto** (`DatabaseModule`/`database.provider.ts` — conexão Knex em runtime via DI) |
| backend/health | **pronto** (`HealthController` `GET /health` público; sem service/repository) |
| backend/core/decorators | **`@Public()`** (metadado `isPublic`, agora interpretado pelo `JwtAuthGuard` da m2-02) + **`@ActiveUser()`** (m2-02 — injeta o payload do JWT em `request.user`; validado ao vivo) |
| backend/autenticacao | **pronto (m2-02)** — `AutenticacaoController` (`POST /autenticacao/registro` e `/login`, ambas `@Public()`), `AutenticacaoService` (registro com `bcrypt.hash`; `validarLogin` recusa duplicado com `BusinessException`; login com `bcrypt.compare` + emissão de JWT; mesma mensagem p/ login inexistente e senha errada), `JwtStrategy` (Passport, segredo do `ConfigService`), `JwtAuthGuard` global via `APP_GUARD` (exige JWT salvo `@Public()`), `JwtModule.registerAsync` lendo `JWT_SECRETO`/`JWT_EXPIRACAO`. `JwtPayload { sub, login }`. 5 testes de service (Vitest) |
| backend/usuario | **completo (m2-03 + m2-11)** — perfil e troca de senha self-service, **1ª rota protegida da API** (sem `@Public()`; guard global + `@ActiveUser()` da m2-02). `UsuarioController` burra: `GET /usuario/perfil` (monta `{ id: usuarioAtivo.sub }`), `PATCH /usuario/senha` (repassa o body + `@ActiveUser()`), **+ m2-11:** `PATCH /usuario/perfil` (body + `@ActiveUser()`) e `DELETE /usuario` (monta `{ id: usuarioAtivo.sub }`). `UsuarioService`: `recuperarPerfil` (projeta os dados públicos, **sem** senha; `ResourceNotFoundException` se a conta sumiu) e `alterarSenha` (valida `senhaAtual` por `bcrypt.compare` → `BusinessException('Senha atual incorreta')`; encripta `novaSenha` com bcrypt cost 10 e persiste); **+ m2-11:** `alterarPerfil` (altera `nome`/`login`; **valida unicidade do `login`** via `recuperarPorLogin` — outra conta com o mesmo login → `BusinessException('Login já está em uso')`, o próprio login é permitido; retorna sem senha) e `excluirConta` (guarda existência → `ResourceNotFoundException`; soft delete da própria conta). `UsuarioRepository` (estende `BaseRepository`) ganhou `recuperarPorId` (`SELECT ... WHERE id = :id AND is_deleted = false`, carrega o hash) e `alterarSenha` (`UPDATE usuario SET senha = :senha ...`), **+ m2-11:** `alterarPerfil` (`UPDATE usuario SET nome = :nome, login = :login, updated_date = NOW() WHERE id = :id AND is_deleted = false RETURNING id, login, nome`) e `excluirConta` (embrulha `executarSoftDelete`), somando aos herdados da m2-02 `criarUsuario` (`INSERT ... SELECT ... RETURNING id, login, nome`) e `recuperarPorLogin`; dona das queries da tabela `usuario` (proibição #23). `UsuarioModule` registra controller + service e exporta o repositório; importado direto no `AppModule`. **9 testes de service (Vitest)** |
| backend/campanha | **completo (m2-04 + m2-05 + m2-10)** — CRUD de campanha com papéis + convite/membros + **gestão de membros pelo mestre** (remover jogador / transferir mestre). `CampanhaController` burra: **10 rotas protegidas** — CRUD (`POST /campanha`, `GET /campanha`, `GET /campanha/:id`, `PUT /campanha/:id`, `DELETE /campanha/:id`) **+ m2-05** `POST /campanha/entrar`, `GET /campanha/:id/membros`, `POST /campanha/:id/convite/regenerar` **+ m2-10** `DELETE /campanha/:id/membro/:usuarioId`, `POST /campanha/:id/mestre/transferir` — montando o DTO com o `id`/`usuarioId` do `@Param`, o corpo, ou o `usuarioId` do token. **m2-10** na `CampanhaService`: `removerMembro` (só mestre via `validarMestre`; mestre não se auto-remove → `BusinessException`; membro-alvo inexistente → `ResourceNotFoundException`; soft delete do vínculo) e `transferirMestre` (só o mestre atual; promove um `JOGADOR` a `MESTRE` e se rebaixa a `JOGADOR` **atomicamente**, mantendo exatamente um mestre; alvo não-membro → 404, alvo próprio/já-mestre → `BusinessException`). No `CampanhaRepository`: `removerMembro` (soft delete de `campanha_membro` pela chave composta campanha+usuário, espelhando o `executarSoftDelete`) e `transferirMestre` (troca de papéis num **único `UPDATE` com `CASE`** — atômico, traduz `codigo → id` do papel por subconsulta). 4 DTOs públicos (`CampanhaMembroRemoverDto`/`...RemovidoDto`, `CampanhaMestreTransferirDto`/`...TransferidoDto`) + 2 internos (`CampanhaMembroInternoRemoverDto`, `CampanhaMestreInternoTransferirDto`) no shared. **SYSTEM.SPEC §14 + SCHEMA.md atualizados:** o mestre deixou de ser necessariamente "(o criador)" — o papel é transferível pelo mestre atual, invariante de um único mestre preservada. `CampanhaService` (m2-04/m2-05): `criarCampanha` (gera `codigo_convite` aleatório — alfabeto sem caracteres ambíguos, unicidade garantida pelo índice parcial `uix_campanha_codigo_convite_ativo` — insere a campanha e o `campanha_membro` do criador com papel `MESTRE`), `listarCampanhas` (só campanhas de que o usuário é membro, com o papel dele), `recuperarCampanha` (exige ser membro → `UnauthorizedAccessException`; `ResourceNotFoundException` se não existe), `alterarCampanha`/`excluirCampanha` (gate `validarMestre` — só o mestre; soft delete via `executarSoftDelete`); **m2-05:** `entrarCampanha` (ingresso por `codigoConvite` como `JOGADOR`; 404 se código não existe, `BusinessException`/400 se já é membro), `regenerarConvite` (só mestre via `validarMestre`; novo código único invalida o anterior), `listarMembros` (nome+papel, exige ser membro via `validarMembro`); permissões validadas na service, único árbitro (proibição #28). `CampanhaRepository` (estende `BaseRepository`, dona das queries de `campanha`/`campanha_membro` — proibição #23): `criarCampanha` (`INSERT ... SELECT ... RETURNING`, alias `codigo_convite AS "codigoConvite"`), `criarMembro` (traduz `codigo → id` do papel via subconsulta em `tipo_campanha_membro_papel` — §10.2.12), `listarPorUsuario` (JOIN membro→campanha→tipo, todas com `is_deleted = false`), `recuperarPorId`, `recuperarMembro` (papel do vínculo p/ as permissões), `alterarCampanha` (`UPDATE ... RETURNING`), `excluirCampanha`, **+ m2-05** `recuperarPorCodigoConvite` (SELECT por `codigo_convite` ativo), `alterarConvite` (`UPDATE codigo_convite ... RETURNING`), `listarMembros` (JOIN membro→usuario→tipo, `is_deleted = false`, ordena por nome). `CampanhaModule` registra controller + service e exporta o repositório; importado no `AppModule`. **29 testes de service** (Vitest, 10 m2-04 + 9 m2-05 + 10 m2-10 cobrindo a matriz §14 e a invariante de um único mestre). **m3-05:** `entrarCampanha` injeta o `CampanhaGateway` (`forwardRef`) e emite `membro:entrou` na sala `campanha:<id>` após criar o vínculo; `CampanhaModule` exporta o `CampanhaService` e importa `forwardRef(() => GatewayModule)` |
| backend/ficha | **completo (m3-03 + m3-04 + emissão WS m3-05)** — CRUD da ficha de jogador com a **matriz de permissões §14** (único árbitro no service, proibição #28) e a **validação do documento contra `shared/regras`** antes de persistir. **m3-04 — concessão de visualização:** `FichaService` ganhou `concederAcesso`/`revogarAcesso`/`listarAcessos` (só dono ou mestre — **reusa `validarPermissaoEdicao`**, mesma regra dono-ou-mestre, sem duplicar permissão; alvo da concessão precisa ser membro da campanha → `validarMembroAlvo`/`ResourceNotFoundException('Membro')`; **idempotente** via `recuperarAcesso` + índice único parcial); `FichaRepository` ganhou `concederAcesso` (`INSERT ... SELECT ... RETURNING`), `revogarAcesso` (**soft delete por chave composta** `ficha_id`/`usuario_id`) e `listarAcessos` (`JOIN usuario` p/ o nome); controller `GET`/`POST /ficha/:id/acesso` + `DELETE /ficha/:id/acesso/:usuarioId`; 6 DTOs novos (`FichaAcesso{Conceder,Concedido,Revogar,Revogado}Dto` + `FichaAcessosListarDto`/`FichaAcessoResumoDto`). `FichaController` burra: `POST /ficha`, `GET /ficha?campanhaId=`, `GET/PUT/DELETE /ficha/:id`. `FichaService`: `criarFicha` (dono = `@ActiveUser().sub`, tipo sempre `JOGADOR`, exige ser membro da campanha), `listarFichas` (mestre vê todas via `listarPorCampanha`; membro comum só as visíveis via `listarVisiveisParaUsuario`), `recuperarFicha` (visualização: dono OU mestre OU linha em `usuario_ficha_acesso`), `alterarFicha`/`excluirFicha` (edição: só dono ou mestre — membro com concessão nunca edita); papel na campanha vem do `CampanhaRepository` (importa `CampanhaModule`), sem duplicar regra. `validarDadosContraRegras` reusa `obterLimitesClasse`/`calcularVida`/`calcularEnergia` (Nível/atributos no intervalo da classe, Vida atual ≤ máx, Energia atual ≤ máx — só teto; Energia pode negativar) → `BusinessException`; "stacks de modificação por patente" ficou de fora (texto livre em `PatenteDados.limiteModificacoes`, sem função pura — validá-lo seria reimplementar regra/extrapolar). `FichaRepository` (dona de `ficha` + `usuario_ficha_acesso`, proibição #23): `INSERT ... SELECT ... RETURNING` com `dados::jsonb` + tradução `codigo→id` de `tipo_ficha`; listagens leem `dados->>'classe'`/`(dados->>'nivel')::int` (§10.4); `recuperarAcesso` (`EXISTS`/SELECT em `usuario_ficha_acesso`); soft delete via `executarSoftDelete`. DTOs de operação no shared (`shared/dtos/ficha/ficha-operacao.dtos.ts`). `FichaModule` importa `CampanhaModule`, registrado no `AppModule`. **33 testes de service** (Vitest, backend 76/76 — 21 do CRUD m3-03 + 12 de acesso m3-04) cobrindo a matriz, a rejeição de dados incoerentes e quem concede/revoga/lista; **verificado ao vivo contra o Postgres** (permissões, listagens escopadas por papel, validação, soft delete, concessão/revogação + idempotência). **m3-05 — emissão WS pós-mutação:** `criarFicha`/`alterarFicha` injetam o `CampanhaGateway` (`forwardRef`) e chamam `emitirFichaCriada`/`emitirFichaAlterada` após persistir (a regra fica na service; o gateway só transmite — §9). Fora de escopo (próximas tasks): frontend (m3-06+) |
| backend/core/gateway | **completo (m3-05)** — gateway de tempo real WebSocket **broadcast-only** (§9, proibição #25). `CampanhaGateway` (`@WebSocketGateway`, um único gateway — nome do exemplo canônico do `CONVENTIONS`), `GatewayModule` e `WsIoAdapter` (estende `IoAdapter`, **trava a origem em `APP_FRONTEND_ORIGEM`** lida do `ConfigService`, espelhando o CORS HTTP do `main.ts`; ligado via `app.useWebSocketAdapter`). **Handshake autenticado pelo mesmo mecanismo do Passport:** valida o token do handshake (`auth.token` ou header `Authorization: Bearer`) com o `JwtService`/`JWT_SECRETO` (o `GatewayModule` importa o `AutenticacaoModule`, que passou a exportar o `JwtModule`); token ausente/inválido → `disconnect(true)`, payload em `socket.data.usuario`. **Salas + permissão de entrada:** `ficha:entrar` reusa `FichaService.recuperarFicha` (visualização §14) e `campanha:entrar` reusa `CampanhaService.recuperarCampanha` (só membros) — consulta a service dona, sem duplicar regra (#28); nega a entrada (ack `{sucesso:false}`, sem `join`) se a service lançar. **Emissão:** `emitirFichaAlterada` (sala `ficha:<id>`), `emitirFichaCriada`/`emitirMembroEntrou` (sala `campanha:<id>`), chamadas pelas services após a mutação. Dependência mútua gateway↔services por `forwardRef` nos dois lados. **11 testes** (`campanha.gateway.spec` — handshake, entrada em sala §14, emissão) + asserções de emissão nos specs de service; **verificado ao vivo** (`socket.io-client` rejeita sem/token inválido, mantém com JWT válido) |
| frontend (shell) | **pronto** (topbar + `router-outlet` via `shared/layout`, tema "Terminal de Contenção" dark-first via `docs/design`). Em **dev** a aba do navegador recebe sufixo "- DEV" (`provideAppInitializer` no `app.config.ts`, gated por `!environment.producao`; produção mantém o `<title>` do `index.html`). **Topbar reconstruída (m2-09)** na direção "Barra de Comando" do handoff: nav central Painel/Calculadora, seletor de campanha ativa (só dentro de `/painel/:id`, via `CampanhaContextoService`) e dropdown de perfil (fecha só por ação). **Rota raiz (pós-m2-09):** `/` redireciona a `/painel` (era a `Home` do M0 consumindo `/health`, removida junto do `HealthService` — ambos ficaram irrecuperáveis por rota; a calculadora segue pública, sem guard). **Refino mobile (m2-08):** alvos de toque de 44px (`bp.$alvo-toque`) na nav central, chip de campanha, gatilho + itens do dropdown de perfil e botões de sessão (os que colapsam pra ícone também centralizam); o **wordmark textual "CONTRATADOSRPG" é escondido no mobile** (logo `app-marca` mantém a identidade) pra topbar não estourar em ~360px. **Revisão S24+ (pós-m2-08):** o **chip de campanha ativa também some no mobile** (`&__campanha` `display: none`) — colapsado a só o ícone, duplicava o glifo "campanhas" do nav Painel logo ao lado |
| frontend/tema | **pronto + troca em runtime (m1-13)** (tokens + base + `ContencaoPreset` PrimeNG em `src/styles/tema/`). **Sistema de tema em runtime (m1-13):** `TemaService` (`core/services/tema.service.ts`) é a contraparte em runtime de `_tokens.scss` para a parte trocável — escreve `--accent` (e overrides de base clara) em `<html>`, alterna a classe `.dark` e regenera a paleta primária do PrimeNG (`updatePrimaryPalette`/`palette`); 4 presets de accent (só cores da paleta do tema — vermelho/azul/verde/âmbar), base clara/escura e color picker custom com **trava de contraste WCAG** (`razaoContraste`/`luminanciaRelativa`, piso 3:1 vs superfície); persiste em `localStorage` e restaura no boot via `provideAppInitializer`. Painel `ConfiguracoesTema` (`shared/configuracoes-tema/`) na topbar (gatilho + modal, fecha por botão). **Refino m1-16:** (a) **slot de cor custom salvo** — `salvarAccentCustom`/`selecionarAccentSalvo`/`accentCustomSalvo` no `TemaService` + swatch "Salva" no painel: guarda **um** slot (sobrescreve o anterior), persistido em `accentCustomSalvo` (distinto do `accentCustom` ativo), re-selecionável com um clique sem reabrir o picker; (b) **inversão visual por incompatibilidade de base** — `accentAplicado`/`accentAdaptado` + `variantePorContraste` (complemento RGB → ajuste de luminância até cruzar `CONTRASTE_MINIMO`): quando a cor salva/ativa fica ilegível na base ativa, o `--accent` exibido é uma variante legível **preservando o valor salvo**; ao voltar à base compatível a cor original é reaplicada (substitui o descarte antigo em `definirBase`, que agora só troca **presets fixos** travados). Nota discreta no painel quando a cor está adaptada. Paleta de presets expandida de 4 p/ **9** (as 4 oficiais + roxo/rosa/dourado/turquesa/cinza, a pedido do autor), todas sujeitas à mesma trava de contraste por base. Budget inicial elevado p/ 565 kB (era 560 kB; o motor de paleta do `@primeuix/themes` entra no bundle
inicial, e o novo `shared/marca/` da m2-09 empurrou mais alguns bytes). **Tailwind instalado e integrado ao build** (m1-06): `frontend/tailwind.config.ts` mescla o `theme.extend` do handoff (`docs/design/tema/tailwind.config.ts`) apontando cores/fontes/raios utilitários para as CSS custom properties dos tokens; diretivas `@tailwind` no fim de `styles.scss`, coexistindo com SCSS + tokens (preflight não sobrescreve a identidade — só reset). **Scrollbar customizada global (m1-18):** padrão próprio da barra de rolagem definido **uma vez** em `styles/tema/_base.scss` (espelhado no handoff `docs/design/tema/_base.scss`) — thumb fino (`10px`) em `--surface-2` com contorno `--border-strong` e raio `--radius-control`, track/corner transparentes, `:hover` realça o contorno com `--accent-border` (nunca `--accent` sólido); cross-browser via `::-webkit-scrollbar-*` (Chrome/Edge/Safari) + `scrollbar-width: thin`/`scrollbar-color` (Firefox). Só tokens → segue legível/discreto nas duas bases (clara/escura) do tema em runtime, que sobrescrevem `--surface-2`/`--border-strong`. Vale globalmente (scroll geral, os 3 modais, tabelas/textarea) sem repetição por componente; documentado em `docs/design/DESIGN.md` para as telas futuras (M2+) não reintroduzirem a barra nativa |
| frontend/core (interceptors + services) | **pronto** (`loading`/`error-handler` interceptors, `LoadingService`, `HealthService`). **m2-06:** `SessaoService` (Signal do `UsuarioAutenticadoDto`, `registrar`/`logar`/`sair`, token em `localStorage` restaurado no boot), `auth-token.interceptor` (injeta `Bearer` quando há sessão; registrado entre `loading` e `error-handler` no `app.config`), `error-handler` passou a tratar `401` (com sessão → `sair()` + `/login?retorno=`), `autenticacaoGuard` (`core/guards`, protege rotas privadas) |
| frontend/autenticacao | **pronto (m2-06)** — módulo `modules/autenticacao/` com telas standalone **lazy** `login` (`/login`) e `registro` (`/registro`), Reactive Forms + Signals, BEM/tokens do tema; login retoma o `retorno` ou vai ao `/painel`; registro encadeia `registrar → logar`. Rotas públicas montadas em `app.routes` (coexistindo com a `''` da home). Topbar (`shared/layout`) reflete a sessão (entrar/registrar ↔ nome + sair). A rota privada `/painel` (guardada pelo `autenticacaoGuard`) passou na m2-07 de casca semente para o **módulo de campanhas** (a `pages/painel/` foi removida). **Layout split marca+formulário (m2-09)**: painel de marca com detalhes de canto/eyebrow/destaques com ícone à esquerda, formulário à direita — mesmos campos/validators de antes. **Refino mobile (m2-08):** inputs e botão de enviar com `min-height` de 44px; no mobile o painel de marca (que empilha acima do formulário) aperta o padding (34→22px), o painel do formulário fica 26/20px e o slogan 22→19px, trazendo o formulário mais pra cima da dobra em ~360px. **Revisão S24+ (pós-m2-08):** o painel de marca **enxuga no mobile** — esconde descrição/destaques/nota (mantém logo+eyebrow+slogan), regra escopada ao `&__marca` porque `--descricao` também existe no painel do formulário; traz o formulário bem mais pra cima da dobra. **Toggle de senha (2026-07-07):** botão "olhinho" (`&__olho`) revela/oculta a senha — 1 no login, 2 independentes no registro (senha + confirmação), via Signal alternando o `[type]` do input; glifos `olho`/`olho-fechado` novos no `shared/icone` |
| frontend/campanha | **pronto (m2-07)** — módulo `modules/campanha/` (área privada sob `/painel`, `loadChildren` guardado): `CampanhaService` (`providedIn:'root'`, cliente HTTP dos endpoints das m2-04/m2-05 — `listarCampanhas`/`criarCampanha`/`entrarCampanha`/`recuperarCampanha`/`listarMembros`/`regenerarConvite`, extrai o `dados` do `StandardResponse`, DTOs do shared `./dtos/campanha`) e **4 telas standalone lazy**: `lista` (`/painel`, campanhas do usuário + papel, links criar/entrar/detalhe), `criar` (`/painel/criar`) e `entrar` (`/painel/entrar`) — Reactive Forms que ao concluir navegam ao `/painel/:id` —, `detalhe` (`/painel/:id`) — nome/descrição, membros com papel e, **só para o mestre** (derivado da lista de membros vs `sessao.usuario().id` — apresentação, não regra: autoridade é o backend §14), o `codigo_convite` + botão **regenerar**. Estado em Signals; `.scss`/BEM/tokens do tema (card/botão/chip de `_componentes.scss`, sem hex solto — proibição #29). Proxy dev encaminha `/campanha`. **6 testes** (`campanha.service.spec`). **m2-09:** novo `CampanhaContextoService` (`providedIn:'root'`, puro estado de apresentação — nome/código da campanha ativa para o seletor da topbar; `CampanhaDetalhe` define ao carregar e limpa ao desmontar via `DestroyRef`); ícones no `chip-papel` (coroa/escudo), botão de copiar o convite (clipboard) e ícone no "Regenerar". **Refino mobile (m2-08):** alvos de toque de 44px — `criar`/`entrar` (inputs/enviar), `lista` (ações Criar/Entrar esticam com `flex: 1` e viram 44px), `detalhe` (botão de copiar convite de 34→44px, "Regenerar" e "Voltar" com 44px); listas já eram de uma coluna, então o trabalho foi toque/densidade, não reflow. **Revisão S24+ (pós-m2-08):** as **ações Criar/Entrar da lista empilham em coluna** (largura total) no mobile — rótulos numa linha só, sem a quebra apertada de duas colunas. **m2-12:** edição inline (nome/descrição via Reactive Forms) e exclusão com confirmação inline da campanha, só para o mestre (Signals `editando`/`confirmandoExclusao`); `alterarCampanha`/`excluirCampanha` no `CampanhaService`; glifos `editar`/`excluir` no `shared/icone`. **m2-13:** **gestão de membros** na lista do detalhe, só para o mestre — cada linha de **jogador** ganha botões-ícone de **transferir mestre** (coroa) e **remover** (lixeira), cada um com **confirmação inline** na própria `<li>` (Signal `acaoMembro {usuarioId, tipo}`, sem `confirm()` nativo, caixa `--accent-dim`/`--accent-border`); a transferência avisa que o mestre passa a jogador. `removerMembro`/`transferirMestre` no `CampanhaService` (endpoints da m2-10). Remover tira o membro da lista; transferir recarrega os membros → `ehMestre` recomputa e as ações de mestre somem na hora. `+7 testes` (2 service + 5 detalhe) |
| frontend/usuario | **pronto (m2-14)** — módulo `modules/usuario/` (rota privada `/perfil`, `loadChildren` guardado pelo `autenticacaoGuard`): `UsuarioService` (`providedIn:'root'`, cliente HTTP self-service — `recuperarPerfil` `GET /usuario/perfil`, `alterarPerfil` `PATCH /usuario/perfil`, `alterarSenha` `PATCH /usuario/senha`, `excluirConta` `DELETE /usuario`; extrai o `dados` do `StandardResponse`, DTOs do shared `./dtos/usuario`) e a **tela `perfil` standalone lazy** (Reactive Forms + Signals, 3 cards): editar nome/login (reflete na sessão via `SessaoService.atualizarPerfil` → topbar acompanha; login em uso barrado pelo backend §11 → toast do `error-handler`), trocar senha (`senhaAtual`+`novaSenha`, toggle "olhinho", `minLength(6)`, limpa o form ao concluir) e excluir conta (confirmação inline forte, sem `confirm()` nativo; `excluirConta` → `sair` → `/login`). Item "Perfil" (ícone `agente`) no dropdown de perfil da topbar. `.scss`/BEM só com tokens (proibição #29), alvos de toque 44px no mobile. **13 testes** (4 `usuario.service.spec` + 1 `sessao.service.spec` + 6 `perfil.page.spec` + 2 `app.routes.spec`) |
| frontend/calculadora | **6 abas prontas (paridade da calculadora completa)**. Fundação (m1-06): módulo `modules/calculadora/` com 6 rotas públicas **lazy** — `agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras` — sob o `CalculadoraShell` (navegação de abas + deep-link por rota via `routerLink`/`routerLinkActive`, paridade com o `switchTab`/`VALID_TABS` por hash do site antigo) e o `StepInput` (stepper/input numérico reutilizável, `ControlValueAccessor` + Reactive Forms, sem `ngModel`). **Aba `agente` (m1-07):** carro-chefe — `AgentePage` (Reactive Forms + Signals) consumindo `shared/regras/agente` para **todas** as stats. **Abas leves `dt`/`novo-agente`/`patente` (m1-08):** três páginas Reactive Forms + Signals consumindo `shared/regras/{dt,novo-agente,patente}`, reusando o `StepInput` e os tokens/BEM do tema; rótulos de `PatenteEnum`/`MotivoEntradaAgenteEnum`→pt-BR em `modules/calculadora/rotulos.ts` (formatação de UI). **Aba `descanso` (m1-09):** `DescansoPage` (Reactive Forms + Signals) consumindo `shared/regras/descanso` — faixa determinística + **rolagem animada** (scramble via `requestAnimationFrame`, RNG por `rolarDados`). **Aba `compras` (m1-10):** `ComprasPage` — a mais pesada: configuração do agente (4 steppers), resumo de limites/gastos, catálogo com busca/categorias e o carrinho com itens, modificações (painel + empilhamentos) e amplificadores; estado em **Signals**, todos os números vindos de `shared/regras/compras` (`calcularResumoCompras`/`calcularStatItem`/custos). **Persistência e exportar/importar (m1-11):** `effect()` salva carrinho/amplificadores/recursos em `localStorage` a cada mudança e recarrega na construção da página; modais de exportar (código `CRPG-COMPRAS-V1:<base64>`) e importar, com aviso de incompatibilidade com códigos do site antigo. **Ajuda por aba (m1-12):** componente único `AjudaCalculadora` (`componentes/ajuda-calculadora/`) — gatilho "? Ajuda" + modal — embutido nas 6 páginas via input signal `aba`; o texto (guia de "como usar cada página") vive em `CONTEUDO_AJUDA`, keyed por aba, sem duplicação. Todas as 6 abas concluídas com paridade completa. **Verificação de paridade + "sem duplicação" (m1-14):** achado corrigido — `compras.page.ts` recalculava custo/penalidade de amplificador com constantes de regra embutidas (`3000/1000/2`) → passou a consumir `calcularCustoAmplificador` + `PENALIDADE_VONTADE_POR_EMPILHAMENTO` de `shared/regras/compras` (zero constante de regra no front). **Cor da stat Vida** (abas agente/descanso) desacoplada do `--accent` trocável: novo token fixo `--vida`/`--vida-border` (vermelho da identidade) em `_tokens.scss` (front + `docs/design/tema/`) — Vida permanece vermelha mesmo com accent trocado no tema em runtime. **Refinamento mobile (m1-15):** estratégia responsiva dirigida por token — `src/styles/tema/_breakpoints.scss` (`$bp-mobile: 560px` + mixin `mobile` + `$alvo-toque: 44px`, resolvido via `stylePreprocessorOptions.includePaths` em `angular.json`); a densidade mobile vem de **override dos tokens** `--pad-card`/`--gap-grid` num `@media` no `styles.scss` (reflui todos os cards/grids de uma vez, sem valor mágico por arquivo); trava de scroll horizontal via `overflow-x: clip` em `html`/`.conteudo`. Abas do shell viram **barra flutuante fixa no rodapé** no mobile (ícone sobre rótulo, 6 itens distribuídos, deep-link preservado, área segura do iOS + espaço reservado no conteúdo); alvos de toque de 44px no `StepInput`, chips de categoria, mini-botões e controles do painel de tema; os 3 modais (ajuda/tema/exportar-importar) ganham `max-height` + rolagem interna. As 6 grades já refluem por `auto-fit`/`auto-fill minmax`. Verificação responsiva (360/390/430px) na §6 de `docs/PARIDADE-M1.md`. **Estado entre-abas em memória (m1-17):** singleton `providedIn: 'root'` `EstadoAbasCalculadoraService` (`modules/calculadora/estado-abas-calculadora.service.ts`, mapa `aba → valor bruto` em Signal, sem I/O) preserva o formulário das 5 abas `agente`/`dt`/`novo-agente`/`patente`/`descanso` ao trocar de aba (cada página restaura no construtor via `patchValue` e grava em cada `valueChanges`); F5 recria o service vazio → volta ao preset (só `compras` sobrevive a F5, pelo seu `localStorage` da m1-11, intocado). Preset da aba `agente` passou a **Nível 0** e atributos **1/1/1/1/1** (era Nível 3 / 2/2/2/1/1). **Sem regra de jogo** (`shared`/`shared/regras` intocados). **Aba Vendas (m1-20):** Compras e Vendas são **duas abas** da barra da calculadora (rotas `/calculadora/compras` e `/calculadora/vendas`) carregando a mesma `ComprasPage` em modos distintos — o `modo` vem por `data` da rota → `input()` (`withComponentInputBinding`). Em Vendas somem os cards Config/Resumo, **carrinho de venda separado** (o de compra e a persistência m1-11 intactos), card "Venda" com fragmentos primeiro (scroll lateral no mobile) e valores no fim (taxa 50/75/25%, valor itens, total fragmentos, Total de Venda em destaque); regra 100% no motor (`shared/regras/compras/venda`). Painel de modificações (Compras e Vendas) com scroll+fade igual ao dos itens (`[appOverflowFade]`, agora bi-eixo — fade lateral no scroller horizontal de fragmentos). Limpar (m1-19) zera taxa/fragmentos da venda. Budget `anyComponentStyle` subiu p/ 12/14 kB. Ícone novo `vendas` no `shared/icone`. **Barra flutuante mobile do shell** virou navegação **só de ícones** (rótulo só na aba ativa) para acomodar a 7ª aba sem espremer |
| frontend/ficha | não iniciado |
| Infra — banco local (Docker + Knex) | **pronto** (Postgres 16 + migrations). Migrations `0001` (`fn_set_updated_date`) + **`0002`–`0005` (m2-01)**: `tipo_campanha_membro_papel` (seed `MESTRE`/`JOGADOR`), `usuario`, `campanha`, `campanha_membro` + **`0006`–`0008` (m3-02)**: `tipo_ficha` (seed `JOGADOR`/`CRIATURA`/`NPC`), `ficha` (FKs campanha/usuario/tipo_ficha + `dados JSONB NOT NULL`), `usuario_ficha_acesso` (índice único parcial `(ficha_id, usuario_id) WHERE is_deleted = false`) — round-trip `db:migrate`/`db:rollback` validado. Próxima migration: `0009` |
| Infra — CI (lint + testes em PR) | **pronto** (GitHub Actions; lint nos 3 workspaces, testes via `--if-present`). **m2-02:** o backend ganhou seu 1º test-runner — **Vitest** (`backend/vitest.config.ts`, script `test`), então o CI agora roda também os testes de backend |
| Infra — Deploy (produção) | **pronto** (integração nativa: Render auto-deploy via `render.yaml` + Cloudflare Pages via Git; CORS + `apiBase` fixo. Sem GitHub Actions no deploy — `docs/DEPLOY.md`) |

## Próxima Task

**M2 concluído no código.** O milestone **M2 — Auth + Campanhas**
(`docs/specs/backlog/m2-auth-campanhas.spec.md`) foi quebrado em **9 tasks numeradas**
(`m2-01`…`m2-09`), **todas concluídas** (specs em `docs/specs/done/`): **m2-01** (fundação de dados),
**m2-02** (backbone de autenticação JWT), **m2-03** (perfil e troca de senha), **m2-04** (CRUD de
campanha), **m2-05** (convite/membros), **m2-06** (frontend de autenticação), **m2-07** (frontend de
campanhas), **m2-09** (revisão geral de estilização) e **m2-08** (refino mobile). O **backend de
campanhas está fechado** (CRUD + entrada por convite + regeneração + listagem de membros + matriz de
permissões §14); a UI fecha o **fluxo do M2 ponta a ponta** — sob `/painel` (guardado): listar
campanhas, criar, entrar por código e o detalhe com membros + convite/regenerar do mestre —, alinhada
aos protótipos de `docs/design/examples/` (topbar "Barra de Comando", split-panel de auth, ícones) e
**usável no mobile (~360px)** com alvos de toque de 44px (m2-08).

**Lote de extensão `m2-10`…`m2-15`** (CRUD restante de campanha/usuário, specs no backlog): fecha as
lacunas de gerência do M2 antes de abrir o M3. Backend **m2-10** (gestão de membros — remover/transferir
mestre), backend **m2-11** (perfil do usuário — alterar nome/login + excluir conta), frontend **m2-12**
(edição/exclusão de campanha — consome os endpoints `PUT`/`DELETE` da m2-04), frontend **m2-13** (gestão
de membros — remover jogador / transferir mestre, consome a m2-10) e frontend **m2-14** (perfil do
usuário — alterar nome/login, trocar senha e excluir a própria conta, consome as m2-11/m2-03) e
frontend **m2-15** (refino visual da tela de campanhas — passe SCSS-first aproximando lista/detalhe dos
protótipos, só apresentação e só com tokens) **concluídos** (specs em `docs/specs/done/`). **Lote de
extensão `m2-10`…`m2-15` fechado — M2 encerrado ponta a ponta.**

**M3 — Ficha de Jogador em andamento.** **m3-01** (contrato final `FichaJogadorDadosDto` do JSONB
`ficha.dados`), **m3-02** (fundação de dados — migrations `tipo_ficha`/`ficha`/`usuario_ficha_acesso`
+ enum `TipoFichaEnum`), **m3-03** (backend do CRUD da ficha de jogador — módulo `ficha` com a matriz
de permissões §14 e a validação do documento contra `shared/regras`; verificado ao vivo contra o
Postgres) e **m3-04** (concessão/revogação de acesso de visualização — `usuario_ficha_acesso`:
`concederAcesso`/`revogarAcesso`/`listarAcessos`, só dono ou mestre, alvo membro, idempotente, soft
delete; fecha a matriz §14; verificado ao vivo contra o Postgres; backend 76/76) e **m3-05** (gateway
de tempo real WebSocket broadcast-only — `CampanhaGateway`/`GatewayModule`/`WsIoAdapter` em
`core/gateway/`; handshake autenticado pelo mesmo `JwtService`/`JWT_SECRETO` do Passport; salas
`ficha:<id>`/`campanha:<id>` com a permissão §14 reusada das services `recuperarFicha`/`recuperarCampanha`;
eventos `ficha:alterada`/`ficha:criada`/`membro:entrou` emitidos pelas services após a mutação;
`forwardRef` nos dois lados; verificado ao vivo com `socket.io-client`; backend 87/87) **concluídos**
(specs em `docs/specs/done/`).

O frontend da ficha avançou muito além do CRUD inicial: **m3-06** (criação/edição), **m3-07**
(lista + visualização), **m3-08** (tempo real do mestre), **m3-10** (edição inline + Maestria + stats
editáveis), **m3-11** (navegação por abas), **m3-12** (editor de Sanidade & Lesões), **m3-13** (editor de
Habilidades), **m3-14** (editor de Inventário) e **m3-17** (merge de edição concorrente) — todos em
`docs/specs/done/`. As abas da ficha já editam Visão Geral, Combate, Sanidade, Habilidades e Inventário no
próprio lugar.

**m3-14 concluído** — editor de **Inventário** no próprio lugar (aba Inventário): componente controlado
`FichaInventario` (`componentes/ficha-inventario/`) que **reusa 100% de `shared/regras/compras`** (catálogo,
limites por patente, custo/peso de modificação, conflitos, stat de item, custo de amplificador e totais —
proibições #26/#27, nenhuma regra reimplementada). Monta/edita itens (com modificações) + amplificadores no
formato do carrinho da M1 (`FichaInventarioDto` = `CarrinhoItemDto[]` + `AmplificadorAplicadoDto[]`, sem tipo
duplicado — m3-01); catálogo recolhível com busca + categorias, painel de modificações por item, alternância
guardada/vestida e stacks de amplificador. Cada mutação emite o `FichaInventarioDto` inteiro e a página
(`FichaVisualizar.ajustarInventario`) persiste **otimista + em lote** (mesma máquina de m3-10/m3-12/m3-13). O
**Inventário máximo** (`Força × 5`, stored/derivado, editável em m3-10) entra como **referência** do peso
usado — exceder é **aviso**, não trava (liberdade total). SCSS-first só com tokens do tema (proibição #29).

**Refino de UX do inventário (ficha + calculadora de compras, em paridade)**: remover a última unidade pede
**confirmação inline**; remover um **stack** (quantidade > 1) abre um **dialog** perguntando quantas unidades
tirar; **Esvaziar** pede confirmação. Botão de adicionar dá **feedback visual** ("✓ Adicionado", pulso).
Passou a existir **item custom** (nome/categoria/custo/peso) e **modificação custom** (nome/empilhamentos) —
sem definição de catálogo, o motor cobra custo/peso padrão da categoria (fonte única mantida — proibição #26).
As modificações deixaram de aparecer sempre: um botão **"Modificar"** revela a caixa de mods. Armazenamento
ganhou um botão **menor e simples** de vestir/guardar. As mesmas mudanças valem na calculadora M1 de compras
(`ComprasPage`), usando o `app-step-input` nativo da calculadora.

**2ª rodada de refino (ficha + calculadora):** o card do item ganhou um **rodapé de ações** com
**Modificar** e o botão de porte **antes do X** de remover (X à direita). A **remoção confirma no próprio
X** (ele troca in-place por ✓/✕, sem abrir linha extra); stack ainda usa o dialog. O botão de porte agora
tem **ícone próprio** (novos ícones `vestida`/`guardada` no `Icone`): **Vestida = cor do tema (accent)**,
**Guardada = cinza claro**. E os custom ficaram **funcionais de fato**: `CarrinhoItemDto`/
`ModificacaoAplicadaDto` (shared) ganharam um `descricao?` opcional (ignorado pelo motor — proibição #26
intacta), então item custom e modificação custom carregam uma **descrição/efeito** em texto livre, exibida
na lista/chip. Verificado ao vivo (stack real) nos dois lados. Frontend 293/293, shared 190/190.

**3ª rodada (item/mod custom REALMENTE funcionais + Fragmentos):** o texto "Remover item?" acompanha o
✓/✕ da confirmação; **Operacional/Medicinal não aceitam modificação** (nem custom). O motor
(`shared/regras/compras`) passou a **resolver os stats do item pelo próprio item** quando ele é custom
(`resolverDadosItem`): `CarrinhoItemDto` ganhou `dano`/`informacao`/`resistencia`/`bonus`/
`categoriaEmprestada`/`modulo`, então uma **arma/explosivo/proteção/armazenamento custom calcula
dano/resistência/bônus de verdade** como um do catálogo. **Exótico custom** informa em qual categoria "se
encaixa" (recebe mods dela, ex.: manopla que aceita mods de Corpo a Corpo). **Modificação custom** ganhou
efeito **mecânico** (`ModificacaoAplicadaDto.efeito`: dano fixo, dados extras `NDx [tipo]`, resistência)
aplicado por `calcularStatItem`. Duas novas **categorias de item — Fragmento Construtor e Fragmento
Potencializador** (achados, montados como item custom com módulo I–V + forma base). Formulários de item/mod
custom (ficha e calculadora) ganharam os campos por categoria. Tudo com testes no motor (`compras.spec`
+7) e nos componentes. Frontend 296/296, shared 190/190.

**4ª rodada (mod custom cobrindo todos os casos + cadastro melhorado):** o efeito da mod custom deixou de
ser três campos fixos e virou uma **lista de efeitos** (`ModificacaoAplicadaDto.efeitos[]`) discriminada por
`ModificacaoEfeitoTipoEnum` (enum novo), cobrindo **todos os arquétipos** das tabelas de modificação de todas
as categorias: `DANO_FIXO`, `DANO_DADOS`, `DANO_DADOS_BASE`, `ELEVAR_DADO`, `PERFURACAO`, `BONUS_TESTE`,
`RESISTENCIA` (todas ou por tipo, aceita negativo), `DEFESA`, `ALCANCE`, `RAIO`, `DURACAO`, `CONDICAO`,
`INVENTARIO`. O motor **funde no stat computado** os efeitos de dano/resistência/inventário (como as mods do
catálogo) e os demais viram **descrição do chip** via `descreverEfeitoModificacao`/`descreverEfeitosModificacao`
(novos helpers puros). Uma mod pode **combinar efeitos** (ex.: dados + condição, estilo Incendiária). O
**cadastro** foi redesenhado: `FormArray` de efeitos com **seletor de tipo por linha** + campos condicionais do
tipo (add/remover efeito), espelhado em `FichaInventario` e `ComprasPage`, com os metadados de UI em
`app/shared/inventario/efeito-modificacao.ui.ts` (sem acoplar `ficha`↔`calculadora`). Verificado ao vivo:
uma mod multi-efeito num rifle exibe `Dano 2D8+PON [Balístico] + 1D6 [Químico]` e o chip
`+1D6 [Químico] · aplica Em Chamas por 2t (DT Vigor) · ignora 5 de resist. [Balístico]`. Shared 204/204,
frontend 298/298, lint limpo, build AOT ok.

**5ª/6ª rodadas (layout + limites flexíveis + marcadores):** o **X** de remover foi para o fim do cabeçalho
(`[Modificar] [Vestir] $custo peso [X]`); armazenamento **vestido ocupa "0 slots"**. O campo da mod custom
virou o **teto** dela (`empilhamentoMaximo`; entra em 1×) e **corrigiu** o bug de perder efeitos ao empilhar.
Os limites da **patente** deixaram de travar: exceder é permitido e marcado **"Excedente"** (âmbar). Cada mod
(catálogo ou custom) pode ser marcada, via checkbox no chip, para **não contar** no limite total da arma
(`ignoraLimiteTotal`) ou no próprio teto (`ignoraLimiteProprio`) — `modsUsados`/`podeAumentar`/`excedente`
respeitam as flags. Contrato: `ModificacaoAplicadaDto` ganhou `empilhamentoMaximo`/`ignoraLimiteTotal`/
`ignoraLimiteProprio`. Espelhado ficha+calculadora. Shared 204/204, frontend 301/301, lint limpo, build AOT ok.
m3-14 **concluída** (spec em `done/`, com a seção "Refinamentos entregues").

**m3-15 concluída** — **presets de rolagem** da ficha (aba Rolagens). Novo motor puro
**`shared/regras/rolagem`** (não `regras/dados`, que já é a pasta de dados/tabelas de jogo):
`interpretarFormula`/`validarFormula` (parser de `NdM`, inteiros e atributos por abreviação `LUT`/`FOR`/…
ou nome, com `+`/`−` e teto de dados) + `rolarFormula` (RNG **injetável** — a brecha a `Math.random` no
`rolarDadoPadrao`, §6.6; testes determinísticos). Tabela de abreviações em `rolagem.dados`, DTOs em
`rolagem.dtos`, export em `package.json`. **Editor `ficha-rolagens`** (controlado, Signals + Reactive
Forms): add/editar/remover preset com **validação de fórmula ao vivo** (inválida = aviso) e **Rolar**
mostrando o total em destaque + detalhamento (`18 · 1D20 [15] + LUT 3`); embutido na aba Rolagens da
`ficha-visualizacao`, persiste `dados.rolagens` via `alterarFicha` (otimista). Comentário do
`FichaRolagemDto` corrigido para apontar `regras/rolagem`. Spec em `done/` (com "Notas de implementação").
Shared 213/213, frontend 306/306, lint limpo, build AOT ok, verificado ao vivo. **Com m3-15, todas as abas
da ficha têm editor** (m3-12 Sanidade, m3-13 Habilidades, m3-14 Inventário, m3-15 Rolagens).

**Milestone Rolagem v2 (m3-16, m3-18…m3-22)** — em andamento. Expande o motor de rolagem para as
regras reais: atributo como fonte de dados, `× ÷`, dano tipado + Composto, **modo TESTE** (maior
dado + Proficiência), **efeitos estruturados de habilidade**, presets **encadeados** que gastam
energia, guia de fórmula e **rolar teste na Visão Geral**. As specs de Identidade e otimização foram
renumeradas para **m3-23…m3-26** (rodam depois). Plano completo em
`~/.claude/plans/nos-presets-tamb-m-tem-structured-sparrow.md`.

**m3-16 concluída** — **gramática v2** do motor (`shared/regras/rolagem`). `interpretarFormula` ganhou
o **atributo como fonte de dados** (`FORd6` = FOR dados de 6 faces; `quantidadeAtributo` no
`TermoDadoDto`) e o **escalonamento** de atributo (`FOR*3`, `LUT/2` com piso; `multiplicador`/`divisor`
no `TermoAtributoDto`), além de **rejeitar parênteses** com mensagem. `rolarFormula` resolve a contagem
pelo atributo (≤0 → 0 dados, teto 100) e aplica mult/div. **Ainda somando** — modo TESTE e dano tipado
vêm a seguir. Tudo aditivo/opcional (presets legados idênticos). Shared **222/222** (6 novos casos).
Spec em `done/`.

**m3-18 concluída** — **dano tipado** no motor. Novo `TipoDanoEnum` (`shared/enums`, valores = as
strings já usadas em compras → sem migração) + `TIPOS_DANO_BLOQUEAVEIS`. A fórmula aceita tags
`[Tipo]` e `[TipoA-TipoB]` (**Composto**): o parser virou por **segmentos** (`split` por tag),
estampando cada termo; trecho sem tag numa fórmula tipada assume **Físico**; `resolverTipoDanoSimples`
tolera caixa/acentos. `rolarFormula` agrupa o total por tipo (`grupos: GrupoDanoDto[]`) e divide cada
Composto pela **soma do segmento** (resto pro primeiro). DTOs aditivos (`tipoDano?`/`composto?` nos
termos e resultados, `constantesTipadas?`, `GrupoDanoDto`). **Sem tags = idêntico ao legado** (sem
`grupos`). Shared **231/231** (9 novos casos). Spec em `done/`.

**Próxima task:** `m3-19` — **modo TESTE** (`RolagemModoEnum`): rolar `(Atributo)`D20 e **pegar o
maior**, somar **Proficiência** (nível) e amplificadores; `ResultadoTesteDto` (maior + descartados);
açúcar `luta` = `lutad20`. Depois `m3-20` (efeitos de habilidade), `m3-21` (presets + runner
encadeado), `m3-22` (frontend). Em seguida o backlog anterior: `m3-23`→`m3-25` (**Identidade**),
`m3-09` (**mobile**), `m3-26` (**espaço** da ficha). **Antes de qualquer UI, ler `docs/design/DESIGN.md`
e consumir os tokens de `docs/design/tema/`** (proibição #29).

**`M3` — Ficha de Jogador** (CRUD + cálculo automático via `shared/regras` + permissões +
tempo real): o milestone já foi quebrado em tasks numeradas (`m3-01`…`m3-09`, specs no backlog).
**Antes de qualquer UI, ler `docs/design/DESIGN.md` e consumir os tokens de `docs/design/tema/`** — o
tema "Terminal de Contenção" é a fonte da verdade visual (proibição #29).

**M1 concluído no código** (18 tasks, backlog do M1 vazio). Os specs de milestone concluídos
(`m0-fundacao`, `m1-calculadora-paridade`) e todas as tasks `m0-*`/`m1-*` já entregues estão em
`docs/specs/done/`.

> **Passos operacionais pendentes (plataforma, não bloqueiam código — ver `docs/PARIDADE-M1.md`):**
> 1. **Cloudflare Pages no ar:** conectar a Pages ao Git com **branch de produção `master`**
>    (Auto-Deploy) e validar a calculadora funcionando com o Render dormindo. Runbook em `docs/DEPLOY.md`.
> 2. **Arquivar `contratados-calculadora`:** marcar o repo antigo como *Archived* no GitHub
>    (a documentação deste repo já o descreve como arquivado após o M1).

## Implementado

- **m1-20 — modo Vender na aba Compras** (2026-07-08): task complementar do M1 (após a m1-19), 100%
  client-side, sem backend/persistência de servidor. **Regras** (`shared/regras/compras`, zero-dep):
  3 enums de conteúdo de jogo (`TaxaVendaEnum`, `FragmentoTipoEnum`, `FragmentoModuloEnum`) +
  submódulo `venda.{dtos,dados,ts}` — `MULTIPLICADOR_TAXA_VENDA` (0.5/0.75/0.25), `VENDA_FRAGMENTOS`
  (tabela módulo × tipo), `calcularValorVendaCarrinho` (taxa sobre o `gasto` de `calcularTotaisCarrinho`,
  sem recalcular custo), `obterValorFragmento` e `calcularVendaFragmentos`; **+10 testes** (shared
  153/153) conferindo cada taxa, cada célula da tabela e o total combinado, 1:1 com `sistema-v4.1.0.md`
  ("Loja"/"Retornando após uma Missão"/"Venda de Fragmentos"). **UI** (`compras.page`, só apresentação):
  Compras e Vendas são **duas abas** da barra da calculadora (rotas próprias carregando a mesma página
  em modos distintos; `modo` via `data` da rota → `input()` com `withComponentInputBinding`). Em Vendas
  somem os cards Config/Resumo; **carrinho de venda separado** (o de compra e a persistência m1-11
  intactos); card "Venda" com **fragmentos primeiro** (scroll lateral no mobile) e **valores no fim**
  (taxa, valor itens, total fragmentos, Total de Venda em destaque accent). Painel de modificações
  (Compras e Vendas) com **scroll+fade igual ao dos itens** (`[appOverflowFade]` + max-height).
  Exportar/Importar só em Compras; Limpar (m1-19) zera taxa/fragmentos da venda. Ícone novo `vendas`.
  **+5 testes** de página (frontend 131/131). Restrições fora de escopo viraram **nota na Ajuda**
  (equipamento inicial só vende ao atingir Operador, item inutilizável sem valor, Módulo ∅ negociado com
  o Mestre), não trava de cálculo; forja/redução de módulo também fora. Budget `anyComponentStyle` do
  `angular.json` subiu p/ **12/14 kB** (aprovado pelo autor, precedente do bump de 565 kB).
  `lint`/`test`/`build` (564,52 kB, sem warning) verdes; **verificado por render** (Playwright,
  1200/360px): Vendas sem Config/Resumo, valores após fragmentos, matemática confere, fragmentos com
  scroll lateral no mobile sem overflow do body.
- **m3-04 — concessão/revogação de acesso de visualização da ficha (backend)** (2026-07-08): fecha a
  **matriz §14** ("outro membro vê só com linha em `usuario_ficha_acesso`") estendendo o módulo `ficha`
  da m3-03 — sem frontend, sem WebSocket. **6 DTOs novos** em `shared/dtos/ficha/ficha-operacao.dtos.ts`:
  `FichaAcesso{Conceder,Concedido,Revogar,Revogado}Dto` + `FichaAcessosListarDto`/`FichaAcessoResumoDto`
  (complemento `Acesso` inteiro antes do verbo — proibição de complemento partido). `FichaRepository`
  (dona de `usuario_ficha_acesso`, proibição #23) ganhou `concederAcesso` (`INSERT ... SELECT ...
  RETURNING`, sem `VALUES`/`DEFAULT`), `revogarAcesso` (**soft delete por chave composta**
  `ficha_id`/`usuario_id`, espelhando `removerMembro` da m2-10 — nunca `DELETE` físico) e `listarAcessos`
  (`JOIN usuario` p/ o `nome`, `is_deleted = false` nos dois lados — padrão de `listarMembros`).
  `FichaService`: `concederAcesso`/`revogarAcesso`/`listarAcessos` — só o **dono ou o mestre**
  concede/revoga/lista (**reusa `validarPermissaoEdicao`**, sem duplicar permissão — proibição #28),
  `UnauthorizedAccessException` caso contrário; o **alvo** precisa ser membro da campanha
  (`validarMembroAlvo` → `ResourceNotFoundException('Membro')`, como o alvo da transferência de mestre da
  m2-10). **Idempotência:** `concederAcesso` confere concessão ativa (`recuperarAcesso`) e devolve a
  existente sem reinserir (respaldado pelo índice único parcial `uix_usuario_ficha_acesso_ficha_usuario_ativo`);
  `revogarAcesso` é no-op sem linha ativa. A leitura de permissão da m3-03 (`recuperarFicha`/`listarFichas`)
  já considerava a linha de acesso — nada a mudar. Controller burra: `GET`/`POST /ficha/:id/acesso`,
  `DELETE /ficha/:id/acesso/:usuarioId`. **12 testes de service** (backend 76/76); `lint`/`build`/`test`
  do shared e backend verdes. **Verificado ao vivo contra o Postgres** (mestre/dono/outro/forasteiro numa
  campanha real via REST, 17 checks): outro-sem-acesso 403 e some da listagem → dono concede 201 → outro
  vê 200 e aparece na listagem; listagem de acessos com nome; reconceder idempotente; conceder a
  não-membro 404; membro-com-acesso concede/lista 403; dono revoga 200 → outro volta a 403; mestre
  concede/revoga 200; `SELECT` confirmou revogação por **soft delete** (`is_deleted`/`deleted_date`) sem
  duplicar linha ativa. Fora de escopo: tempo real WS (m3-05), frontend/UI de concessão (m3-07), edição
  por terceiros (não existe — só visualização).
- **m3-03 — backend do CRUD da ficha de jogador** (2026-07-08): módulo `ficha` (backend) com CRUD
  completo, a **matriz de permissões §14** arbitrada no service (único árbitro — proibição #28) e a
  **validação do documento de jogo contra `shared/regras`** antes de persistir (§11 camada 2). DTOs de
  operação em `shared/dtos/ficha/ficha-operacao.dtos.ts` (o campo `dados` reusa `FichaJogadorDadosDto` da
  m3-01). `FichaRepository` dona de `ficha`/`usuario_ficha_acesso` (proibição #23): `INSERT ... SELECT ...
  RETURNING` com `dados::jsonb`, tradução `codigo→id` de `tipo_ficha`, listagens lendo `dados->>'campo'`
  (§10.4), `recuperarAcesso` p/ a permissão de membro, soft delete. `FichaService`: `criarFicha` (dono =
  usuário autenticado, tipo `JOGADOR`, exige ser membro), `listarFichas` (mestre vê todas; membro só as
  visíveis), `recuperarFicha` (dono/mestre/concessão), `alterarFicha`/`excluirFicha` (só dono ou mestre);
  papel na campanha vindo do `CampanhaRepository` (importa `CampanhaModule`), sem duplicar regra.
  `validarDadosContraRegras` reusa `obterLimitesClasse`/`calcularVida`/`calcularEnergia` → `BusinessException`
  (Nível/atributos no intervalo da classe, Vida/Energia atuais ≤ máx; "stacks de modificação por patente"
  fora — texto livre sem função pura, validá-lo seria reimplementar regra/extrapolar). Controller burra +
  `FichaModule` no `AppModule`. **21 testes de service** (backend 64/64); `lint`/`build`/`test` verdes.
  **Verificado ao vivo contra o Postgres** (mestre/dono/outro numa campanha real via REST): criar 200
  (dono correto), ver dono/mestre 200, ver/editar de outro-sem-acesso 403, editar do mestre 200, listagens
  escopadas por papel (1/1/0), dados incoerentes 400, soft delete 200 + GET 404, `is_deleted`/`deleted_date`
  e JSONB conferidos no banco. Fora de escopo: concessão de acesso (m3-04), eventos WS (m3-05), frontend.
- **toggle "olhinho" de revelar senha** (2026-07-07, sem spec numerada, pedido do autor): botão de
  mostrar/ocultar senha no **login** e no **registro**. Dois glifos novos no `shared/icone` (`olho` /
  `olho-fechado`, SVG de linha `stroke: currentColor`, sem emoji — proibição do tema). Botão `&__olho`
  sobreposto à direita do campo (posição absoluta, alvo de 44px, `aria-label` "Mostrar/Ocultar senha" +
  `aria-pressed`, herda o foco de teclado global); o input ganha `padding-right` pra não correr por baixo
  do ícone. Alternância por Signal: `[type]` vai de `password` a `text`. **Login:** um toggle
  (`senhaVisivel` + `alternarSenha`). **Registro:** dois independentes (`senhaVisivel`/`confirmacaoVisivel`
  + `alternarSenha`/`alternarConfirmacao`) — revelar a senha não afeta a confirmação. Reactive Forms/
  Signals/standalone, só tokens (`--text-mute`/`--text`, proibição #29), validações (minlength/divergência)
  preservadas. `lint`/`test` (91/91)/`build` (562 kB) verdes; conferido no S24+ via Playwright.
- **revisão visual mobile da m2-08 (Galaxy S24+) + 3 melhorias de UI/UX** (2026-07-07, sem spec numerada):
  render de cada tela do M2 a 384px CSS (Playwright/Chromium headless, sessão + API de campanha mockadas),
  com overflow horizontal conferido programaticamente (`scrollWidth === innerWidth` = zero nas 7 telas). A
  m2-08 passou; a revisão rendeu 3 ajustes **SCSS-only** (aprovados antes de aplicar): (1) **chip de campanha
  ativa escondido no mobile** (`layout.component.scss` `&__campanha` `display: none`) — colapsado a só o
  ícone, duplicava o glifo "campanhas" do nav Painel; (2) **painel de marca de login/registro enxuto no
  mobile** — esconde `&__descricao`/`&__destaques`/`&__nota` (escopado ao `&__marca`, senão sumia a descrição
  do formulário), sobe o formulário pra dobra; (3) **ações Criar/Entrar da lista empilhadas em coluna**
  (`&__acoes` `flex-direction: column` + `&__acao` `width: 100%`) no mobile. Uma 4ª ideia (`justify-content:
  flex-start` no painel do formulário) foi **descartada** por não ter efeito visível (o espaço era padding
  legítimo, não banda morta do `justify-content`). `lint`/`test` (91/91)/`build` (561 kB) verdes; cada
  mudança conferida por screenshot antes/depois no viewport do S24+.
- **m2-08 — refinamento mobile de auth + campanhas** (2026-07-07, **fecha o M2 no código, 9/9 tasks**):
  passe de acabamento responsivo (~360px) **SCSS-only** sobre as telas do M2 pós-m2-09, na linha da
  m1-15, reusando `_breakpoints.scss` (`$bp-mobile: 560px`, mixin `mobile`, `$alvo-toque: 44px`). O
  override global de densidade (`--pad-card`/`--gap-grid`) e a trava `html { overflow-x: clip }` da
  m1-15 já cobriam as telas de campanha, e a m2-09 já dera um 1º passe na topbar/auth — então o trabalho
  foi **alvo de toque ≥ 44px** nas superfícies novas, não reflow. **Topbar** (`layout.component.scss`):
  `min-height`/`min-width: bp.$alvo-toque` na nav central, chip de campanha, gatilho + itens do dropdown
  de perfil e botões de sessão (colapsados pra ícone → `justify-content: center`); **wordmark textual
  escondido no mobile** (logo `app-marca` mantém a identidade) pra topbar não estourar em ~360px.
  **Auth** (`login`/`registro`): inputs + enviar com `min-height` 44px; painel de marca 34→22px, painel
  do formulário 26/20px, slogan 22→19px. **Campanha:** `criar`/`entrar` (inputs/enviar 44px), `lista`
  (ações `flex: 1` + 44px), `detalhe` (copiar 34→44px, "Regenerar"/"Voltar" 44px). Só `.scss` — zero
  mudança de DOM/TS, nenhum teste tocado. `lint`/`test` (91/91)/`build` (561 kB, dentro do budget) verdes;
  verificação responsiva **estática** (sem browser no ambiente): Sass compilou e o bundle carrega as media
  queries + alvos de 44px, com as únicas larguras fixas novas sendo os alvos quadrados (copiar 44×44).
- **achados de UI/UX pós-m2-09** (2026-07-07, sem spec numerada): dois ajustes visuais apontados ao
  revisar os prints com o autor. (1) `card__indice` de `campanhas` `lista`/`detalhe` mostrava
  literalmente `"M2"` (nome do milestone, vazado da m2-07) em vez do neutro `//` que `criar`/`entrar`
  já usavam — corrigido nos dois `.html`. (2) Faltava o **avatar decorativo** (quadrado
  `repeating-linear-gradient` diagonal, mesmo tratamento do `.topbar__avatar`) nos itens da lista de
  campanhas (`campanhas__avatar`, 40px) e da lista de membros do detalhe (`detalhe__avatar`, 32px) —
  placeholder de imagem, sem foto real no domínio ainda. `lint`/`test` (91/91)/`build` verdes,
  conferido visualmente via Playwright.
- **ajuste pós-m2-09** (2026-07-07, pedido direto do autor, sem spec numerada): (1) rota raiz `/`
  redireciona a `/painel` (`app.routes.ts`) em vez de carregar a `Home` do M0 — sem sessão, o
  `autenticacaoGuard` encadeia até `/login?retorno=%2Fpainel`; a `Calculadora` continua pública.
  `pages/home/` e `core/services/health.service.ts` removidos (ficaram irrecuperáveis por rota;
  a própria `Home` já se descrevia como "substituída a partir do M1"). `docs/DEPLOY.md` atualizado
  (verificação pós-deploy agora é registro de teste sem erro de CORS, ou `GET .../health` direto no
  Render, em vez de "a home exibe `/health`"). (2) Vermelho padrão do sistema trocado de `#e5484d`
  para `#d53030`: `--accent`/`--vida` em `_tokens.scss` (frontend + mirror), preset `'vermelho'` do
  `TemaService`, paleta 50-950 do `contencao.preset.ts` (frontend + mirror) regenerada com
  `palette('#d53030')` do `@primeuix/themes`, `CLAUDE.md` (tabela TEMA VISUAL) e `tema.service.spec`
  ajustados — segue passando a trava de contraste (piso 3:1) nas duas bases. `lint`/`test`
  (91/91)/`build` verdes, sem regra de jogo ou de negócio tocada.
- **m2-09-revisao-estilizacao-geral** (2026-07-07): revisão da estilização de topbar, autenticação e
  campanhas contra os novos protótipos entregues em `docs/design/examples/` (`login`, `cadastro`,
  `campanhas`, `lobby-de-campanha`, `topbar`) — mesmos tokens, linguagem visual mais elaborada e mais
  ícones onde antes só havia texto (pedido explícito do autor do design: "sinto que só os textos tá
  misturando demais"). **Entregável 1 — `shared/icone`:** 11 novos glifos (`campanhas`, `calculadora`,
  `sair`, `entrar`, `chevron`, `copiar`, `mais`, `convite`, `coroa`, `atualizar`, `voltar`), reusando
  `agente`/`protecoes` onde já serviam (perfil/jogador). **Entregável 2 — topbar (`shared/layout`):**
  reconstruída na direção "Barra de Comando" (1a) do handoff — nav central Painel/Calculadora (ícone +
  `routerLinkActive`, mesmo padrão do `CalculadoraShell`); seletor de campanha ativa (chip nome+código),
  visível só dentro de `/painel/:id`, alimentado pelo novo `CampanhaContextoService`
  (`modules/campanha/`, `providedIn:'root'`, puro estado de apresentação sem regra de permissão —
  `CampanhaDetalhe` define ao carregar e limpa ao desmontar via `DestroyRef`); dropdown de perfil
  (Campanhas/Encerrar sessão) que fecha só por ação, mesmo padrão de acessibilidade do painel de tema
  (sem clique-fora); Entrar/Registrar com ícone quando deslogado. **Entregável 3 — `login`/`registro`:**
  layout split marca+formulário (detalhes de canto, eyebrow, slogan, destaques com ícone ancorados
  embaixo), mesmos campos/validators de antes — **sem** o bloco decorativo de "entrar por código"
  pré-autenticação do protótipo (não existe esse fluxo no domínio: `entrarCampanha` exige usuário
  autenticado). **Entregável 3.1 — marca do projeto:** o autor do design adicionou os assets
  (`frontend/public/logo-{white,black}.{png,svg}`, commit anterior "Adiciona assets de logo em
  frontend/public") e pediu para aplicá-los; novo `shared/marca/` (`Marca`, componente padrão
  `app-icone` — escala com a fonte via `1.4em`) troca a variante branca/preta conforme
  `TemaService.base()` (branca sobre a base escura, identidade padrão; preta sobre a base clara) e
  substitui o wordmark só-texto na topbar e no painel de marca de `login`/`registro`, que ganhou também
  a **marca d'água** no canto inferior direito do painel de marca (`opacity: .04`, `font-size` grande
  no `app-marca` pra ampliar a imagem, `overflow: hidden` no painel pra conter o transbordo) — mesmo
  tratamento visual de `docs/design/examples/login.html`/`cadastro.html`; budget de bundle inicial
  ajustado 560→565 kB no `angular.json` (poucos bytes a mais do novo componente). **Correção (achado do
  autor):** a nav da topbar (entregável 2) tinha ficado incorreta — escondia **"Calculadora" também**
  quando deslogado, mas essa rota é pública (sem guard, `calculadora.routes.ts`); só "Painel" deveria
  depender de sessão. Corrigido: "Calculadora" sempre visível na nav, "Painel" continua condicionado a
  `sessaoService.autenticado()`. **Entregável 4 — `campanhas` lista:** ícones nos botões "Criar
  campanha"/"Entrar por código" e no `chip-papel`
  (coroa para `MESTRE`, `protecoes`/escudo para `JOGADOR`), estado vazio com ícone. **Entregável 5 —
  `campanha` detalhe:** botão de copiar o código de convite (`navigator.clipboard`, puramente
  apresentação), ícone de atualizar no "Regenerar", `chip-papel` dos membros com ícone, link "Voltar às
  campanhas" com seta. **Fora de escopo, por decisão explícita:**
  chips de status de sessão (ao vivo/agendada/pausada), briefing (ameaça/fase/recompensa), registro de
  atividade da mesa e indicador online por membro — nenhum existe no schema de `campanha`/
  `campanha_membro`, então não entraram (ficam para specs futuras se virarem domínio); arquitetura de
  rotas mantida (`/painel/criar`/`/painel/entrar` continuam páginas dedicadas, não a barra lateral do
  protótipo). Nenhuma regra de jogo (`shared/regras` intocado), de negócio ou de permissão alterada (§14
  continua 100% backend). **Validado:** `lint`/`test` do frontend verdes (**91/91**, nenhum teste novo —
  mudança de apresentação), `build` de produção sem estouro de budget; telas conferidas visualmente via
  Playwright headless contra o dev server (topbar deslogado/logado, seletor de campanha, dropdown de
  perfil, login, registro, lista e detalhe com API mockada).
- **m2-07-frontend-campanhas** (2026-07-07): **fecha o fluxo do M2 na UI** — frontend de campanhas sobre o
  backend das m2-04/m2-05 e a sessão/guard/interceptor da m2-06. **Entregável 1 — telas standalone lazy
  (área privada):** módulo `modules/campanha/` montado sob `/painel` via `loadChildren` atrás do
  `autenticacaoGuard` — 4 telas: `lista` (`/painel`) lista as campanhas do usuário com o papel (chip
  `MESTRE`/`JOGADOR`) e liga a criar/entrar/detalhe; `criar` (`/painel/criar`) e `entrar` (`/painel/entrar`)
  são **Reactive Forms** (sem `ngModel`) que, ao concluir, navegam ao `/painel/:id` da campanha criada/
  ingressada; `detalhe` (`/painel/:id`, `id` do `ActivatedRoute.snapshot`) mostra nome/descrição e os
  membros com papel. **Entregável 2 — detalhe + permissão de apresentação:** só o mestre vê o
  `codigo_convite` e o botão **regenerar** — `ehMestre` é um `computed` que cruza a lista de membros com
  `sessao.usuario().id`; **é só apresentação**, a autoridade é sempre o backend (§14): um jogador que
  tentasse regenerar levaria 403, tratado como toast pelo `error-handler.interceptor` (o front não duplica
  regra — proibição #28). **Entregável 3 — service HTTP + estado:** `CampanhaService`
  (`modules/campanha/campanha.service.ts`, `providedIn:'root'`) é transporte puro — `listarCampanhas`/
  `criarCampanha`/`entrarCampanha`/`recuperarCampanha`/`listarMembros`/`regenerarConvite`, cada um extraindo
  o `dados` do `StandardResponse`; o JWT entra pelo `auth-token.interceptor`; DTOs consumidos do shared
  (`@contratados-rpg/shared/dtos/campanha`), **nunca** redefinidos no front; estado das telas em **Signals**.
  **Entregável 4 — estilos:** `.scss` + BEM + tokens do tema "Terminal de Contenção" (card/botão/chip de
  papel copiados de `docs/design/tema/_componentes.scss`, zero hex/fonte/raio solto — proibição #29).
  **Infra:** a casca semente `pages/painel/` da m2-06 foi **removida** e substituída por este módulo;
  `proxy.conf.json` passou a encaminhar `/campanha` ao backend (`:3100`). **Testes (novos, Vitest/TestBed):**
  `campanha.service.spec` (6 — cada método atinge a rota/verbo certo e mapeia o `dados`); `app.routes.spec`
  ajustado (o teste de `/painel` liberado agora casa a lista de campanhas `.campanhas`). **Validado:**
  `lint`/`build`/`test` do **frontend** verdes — **18 arquivos / 91 testes** (era 17/85; +1 arquivo, +6
  testes) e `build` de produção sem estouro de budget (4 novos chunks lazy: lista/criar/entrar/detalhe).
  Nenhuma regra de jogo (`shared/regras` intocado); nenhuma alteração de backend.
- **m2-06-frontend-autenticacao** (2026-07-07): **primeira UI do M2** — frontend de autenticação sobre
  o backbone JWT da m2-02/m2-03, mantendo a calculadora pública. **Entregável 1 — telas standalone lazy:**
  módulo `modules/autenticacao/` com `login` (`/login`) e `registro` (`/registro`), **Reactive Forms** (sem
  `ngModel`), `.scss` + BEM + tokens do tema "Terminal de Contenção" (proibição #29 — nada de hex/fonte/raio
  solto; bloco `.card`/`.botao` copiado de `docs/design/tema/_componentes.scss`). O registro tem confirmação
  de senha (validador de grupo local, não trafega ao backend) e encadeia `registrar → logar` já abrindo a
  sessão; o login retoma o destino guardado em `retorno` ou cai no `/painel`. **Entregável 2 — sessão:**
  `SessaoService` (`core/services/sessao.service.ts`) é o dono do estado — Signal do `UsuarioAutenticadoDto`
  (token + `{id,login,nome}`), `autenticado` (computed), `obterToken`, ações `registrar` (POST
  `/autenticacao/registro`, **sem** sessão), `logar` (POST `/autenticacao/login`, abre e persiste a sessão)
  e `sair`; token persistido em `localStorage` (`contratados-rpg.sessao`) e restaurado no boot — **F5 mantém
  a sessão** sem nova chamada; conteúdo corrompido é descartado. **Entregável 3 — interceptor `auth-token`:**
  (`core/interceptors/auth-token.interceptor.ts`) injeta `Authorization: Bearer <token>` quando há sessão,
  registrado entre `loading` e `error-handler` no `app.config`; o `error-handler` ganhou o trato de `401`
  (**só com sessão ativa** → `sair()` + `router.navigate(['/login'], { retorno })`; login inválido é 400/
  `BusinessException`, então não dispara logout — evita laço). **Entregável 4 — guard de rota:**
  `autenticacaoGuard` (`core/guards/autenticacao.guard.ts`, `CanActivateFn`) libera com sessão e, sem sessão,
  devolve `UrlTree` p/ `/login` guardando o destino em `retorno` (retomado após logar); a **primeira rota
  privada** `/painel` (`pages/painel/`, casca mínima — semente da m2-07) nasce guardada; a calculadora
  segue **sem** guard. **Entregável 5 — topbar:** `shared/layout` reflete a sessão (entrar/registrar
  deslogado ↔ nome + botão sair logado), reusando o shell existente (`RouterLink` + `SessaoService`).
  **Entregável 6 — DTOs do shared:** `UsuarioCriarDto`/`UsuarioCriadoDto`/`UsuarioAutenticarDto`/
  `UsuarioAutenticadoDto` consumidos de `@contratados-rpg/shared/dtos/usuario` — **nunca** redefinidos no
  front. **Infra dev:** `proxy.conf.json` passou a encaminhar `/autenticacao` ao backend (`:3100`).
  **Testes (novos, Vitest/TestBed):** `sessao.service.spec` (6 — deslogado inicial, abre+persiste no login,
  restaura no boot, `sair` limpa, registra sem sessão, ignora persistência corrompida; HTTP via
  `provideHttpClientTesting`), `autenticacao.guard.spec` (2 — libera com sessão, redireciona com `retorno`
  sem sessão) e `app.routes.spec` (4 — `/login` e `/registro` resolvem apesar da `''` da home coexistir,
  `/painel` redireciona ao `/login?retorno=%2Fpainel` sem sessão e é liberado com sessão, via
  `RouterTestingHarness`). **Validado:** `lint`/`build`/`test` do **frontend** verdes — **17 arquivos /
  85 testes** (era 14/73; +3 arquivos, +12 testes). Nenhuma regra de jogo (`shared/regras` intocado); nenhuma alteração de backend.
- **m2-05-campanha-convite-membros** (2026-07-06): **fecha o backend de campanhas** — entrada por
  código de convite, regeneração do código e listagem de membros, sobre o módulo `campanha` da m2-04
  (reusa `CampanhaRepository` e os gates `validarMembro`/`validarMestre`). **Entregável 1 —
  `entrarCampanha`** (`POST /campanha/entrar`): o usuário autenticado ingressa informando o
  `codigoConvite` (o `usuarioId` vem do JWT) e vira `JOGADOR`; código inexistente/inválido →
  `ResourceNotFoundException` (404), usuário já membro → `BusinessException` (400, respeitando o índice
  único parcial `uix_campanha_membro_campanha_usuario_ativo`); a busca por código usa o novo
  `recuperarPorCodigoConvite` (SELECT por `codigo_convite` ativo). **Entregável 2 —
  `regenerarConvite`** (`POST /campanha/:id/convite/regenerar`, **só mestre** via `validarMestre`): gera
  um novo `codigo_convite` único (reusa `gerarCodigoConvite` — mesma unicidade da criação) e o persiste
  via `alterarConvite` (`UPDATE codigo_convite ... RETURNING`), **invalidando o anterior** (o código
  antigo deixa de resolver para a campanha). **Entregável 3 — `listarMembros`**
  (`GET /campanha/:id/membros`): nome do usuário + papel (`MESTRE`/`JOGADOR`), visível a qualquer membro
  (`validarMembro` → `UnauthorizedAccessException` p/ não-membro); o repositório junta
  `campanha_membro`→`usuario`→`tipo_campanha_membro_papel` (todas `is_deleted = false`, traduz o `codigo`
  do papel, ordena por nome). **Entregável 4 — matriz de permissões (§14)** coberta por **testes de
  service**: mestre × jogador × não-membro; convite/regeneração só pelo mestre; entrada rejeitada p/
  código inválido ou já-membro; a service é o único árbitro (proibição #28). **Entregável 5 — DTOs**
  (8 novos em `shared/src/dtos/campanha/`, seguindo `dto-conventions`): públicos `CampanhaEntrarDto
  {codigoConvite}`/`CampanhaEntradaDto {id,nome,descricao,papel}`, `CampanhaConviteRegenerarDto {id}`/
  `CampanhaConviteRegeneradoDto {id,codigoConvite}` (complemento `Convite` inteiro antes do verbo),
  `CampanhaMembrosListarDto {campanhaId}`/`CampanhaMembroResumoDto {usuarioId,nome,papel}` (listagem →
  item `Resumo`); internos `CampanhaConviteRecuperarDto {codigoConvite}` (precedente
  `UsuarioLoginRecuperarDto`) e `CampanhaConviteInternoAlterarDto {id,codigoConvite}`. **Camadas (§7):**
  `CampanhaController` burra passou de 5 → **8 rotas**; toda a regra/permissão na `CampanhaService`;
  SELECT sempre com `is_deleted = false`, `UPDATE ... RETURNING`, parâmetros nomeados. **Testes:**
  `campanha.service.spec.ts` ganhou **+9 testes** (entrar: cria `JOGADOR` ↔ 404 código inexistente ↔ 400
  já-membro; regenerar: mestre gera ↔ 403 não-mestre ↔ 404 inexistente; listarMembros: membro vê ↔ 403
  não-membro ↔ 404 inexistente), `randomBytes` dublado, repositório dublado. **Validado:** `build` do
  **shared** verde; `lint`/`build` do **backend** limpos; `test` do **backend** **28/28** (5 autenticação
  + 4 usuário + 19 campanha). **Verificação ao vivo contra o Postgres:** registro+login de um mestre, um
  jogador e um estranho descartáveis; mestre cria campanha → `{id,codigoConvite}`; jogador entra pelo
  código → `papel: JOGADOR`; `listarMembros` traz MESTRE + JOGADOR; jogador (membro) lista → **200**;
  entrar de novo → **400 'Você já é membro desta campanha'**; código inválido → **404**; estranho
  (não-membro) lista → **403**; não-mestre regenera → **403**; mestre regenera → novo código; entrar com
  o código **antigo** → **404** (invalidado); estranho entra com o **novo** → **201**; membros final = 3
  (MESTRE + 2 JOGADOR); sem token → **401**. Nenhuma UI, nenhuma regra de jogo (`shared/regras` intocado).
- **m2-04-campanha-crud** (2026-07-06): **módulo `campanha` (backend)** — CRUD de campanha com o
  criador virando `MESTRE` e a gestão restrita ao mestre, sobre as tabelas criadas em m2-01. Reusa o
  padrão de rota **protegida** (guard global + `@ActiveUser()`) provado na m2-03. **Entregável 1 —
  DTOs** (`shared/src/dtos/campanha/`, seguindo `dto-conventions`, **1º pacote de campanha**):
  públicos `CampanhaCriarDto {nome,descricao?}`/`CampanhaCriadaDto {id,nome,descricao,codigoConvite}`,
  `CampanhaListarDto {usuarioId}` (o `usuarioId` vem do JWT, injetado pela controller) /
  `CampanhaResumoDto {id,nome,descricao,papel}` (item de listagem com o papel do usuário),
  `CampanhaRecuperarDto {id}`/`CampanhaRecuperadaDto {...,codigoConvite}`, `CampanhaAlterarDto
  {nome,descricao?}`/`CampanhaAlteradaDto`, `CampanhaExcluirDto {id}`; internos service↔repositório
  `CampanhaInternoCriarDto` (carrega o `codigoConvite` já gerado), `CampanhaInternoAlterarDto` (id no
  DTO — nunca `alterar(id,dados)`) e os do vínculo `CampanhaMembroInternoCriarDto`
  (`{campanhaId,usuarioId,papel}`), `CampanhaMembroInternoRecuperarDto`/`...RecuperadoDto {papel}`
  (base das permissões). Subpath `./dtos/campanha` no `shared/package.json` (+ `shared` rebuildado).
  **Entregável 2 — `criarCampanha`** (service): gera um `codigo_convite` aleatório (alfabeto sem
  caracteres ambíguos, via `crypto.randomBytes`; unicidade garantida pelo índice único parcial
  `uix_campanha_codigo_convite_ativo`), insere a `campanha` e cria o `campanha_membro` do criador com
  papel `MESTRE` (exatamente **um** mestre no v1 — §14). O repositório traduz `codigo → id` do papel
  via subconsulta em `tipo_campanha_membro_papel` no SQL (§10.2.12) — service/DTO só veem o `codigo`.
  **Entregável 3 — `listarCampanhas`**: só as campanhas de que o usuário autenticado é membro (JOIN
  `campanha_membro`→`campanha`→`tipo_campanha_membro_papel`, todas com `is_deleted = false`), com o
  `papel` dele em cada uma; ordenado por nome. **Entregável 4 — `recuperarCampanha`** (exige ser
  membro → `UnauthorizedAccessException`; `ResourceNotFoundException` se não existe),
  **`alterarCampanha`** (nome/descrição) e **`excluirCampanha`** (soft delete via
  `executarSoftDelete`). **Entregável 5 — permissões** (§14): gestão (alterar/excluir) só pelo mestre,
  validada na service via `validarMestre` (`recuperarMembro` + checagem de papel `MESTRE`); a service
  é o **único árbitro** (proibição #28). **Entregável 6 — camadas (§7):** `CampanhaController` burra
  (5 rotas, só monta o DTO e repassa); `CampanhaService` com toda a regra/permissão; `CampanhaRepository`
  (estende `BaseRepository`) dona das queries de `campanha`/`campanha_membro` (proibição #23) — SELECT
  sempre com `is_deleted = false`, INSERT `... SELECT ... RETURNING` (sem `VALUES`/`DEFAULT`),
  parâmetros nomeados, alias `codigo_convite AS "codigoConvite"`. `CampanhaModule` registra controller
  + service e exporta o repositório; importado no `AppModule`. **Testes:** novo `campanha.service.spec.ts`
  com **10 testes** (criação cria o `campanha_membro` MESTRE + gera o código; listar delega ao
  repositório; recuperar de membro ↔ 403 de não-membro ↔ 404 inexistente; alterar de mestre ↔ 403 de
  não-mestre ↔ 404 inexistente; excluir de mestre ↔ 403 de não-mestre), `randomBytes` dublado para o
  código determinístico, repositório dublado. **Validado:** `build` do **shared** verde; `lint`/`build`
  do **backend** limpos; `test` do **backend** **19/19** (5 autenticação + 4 usuário + 10 campanha).
  **Verificação ao vivo contra o Postgres:** registro+login de um mestre e de outro
  usuário descartáveis; criar campanha → devolve `{id,nome,descricao,codigoConvite}` e a listagem do
  mestre traz `papel: MESTRE`; a listagem do outro usuário vem **vazia**; recuperar do mestre ok,
  recuperar do não-membro → **403**; alterar do mestre ok, alterar/excluir do não-mestre → **403**;
  excluir do mestre → **200**; recuperar após excluir → **404** (soft delete); sem token → **401**.
  Nenhuma UI, nenhuma regra de jogo (`shared/regras` intocado).
- **m2-03-usuario-perfil-senha** (2026-07-06): completa o módulo `usuario` com os endpoints
  **self-service** do usuário autenticado — **1ª rota protegida da API** (consome o
  `@ActiveUser()`/`JwtAuthGuard` da m2-02; até aqui só o `/health` e as rotas `@Public()` de auth
  existiam). **Entregável 1 — DTOs** (`shared/src/dtos/usuario/`, seguindo `dto-conventions`):
  `UsuarioRecuperarDto {id}` (entrada de perfil — o `id` vem do JWT, injetado pela controller) e
  `UsuarioRecuperadoDto {id,login,nome}` (perfil, **sem** senha); `UsuarioSenhaAlterarDto
  {senhaAtual,novaSenha}` (body público, complemento `Senha` inteiro antes do verbo) e
  `UsuarioSenhaAlteradaDto {id,login,nome}` (saída, sem senha); interno
  `UsuarioSenhaInternoAlterarDto {id,senha}` (repositório, `senha` = hash — mesmo padrão de
  `UsuarioInternoCriarDto`). `shared` rebuildado (o subpath `./dtos/usuario` já existia da m2-02).
  **Entregável 2 — perfil:** `GET /usuario/perfil` → `UsuarioService.recuperarPerfil` projeta os
  dados públicos do usuário logado (`ResourceNotFoundException` se a conta do token sumiu, ex.:
  soft-delete), **nunca** a senha. **Entregável 3 — troca de senha:** `PATCH /usuario/senha` →
  `alterarSenha` valida a `senhaAtual` por `bcrypt.compare` (incorreta → `BusinessException('Senha
  atual incorreta')`, sem persistir), encripta a `novaSenha` (bcrypt cost 10, igual ao registro) e
  grava; recebe o body + `@ActiveUser()` (precedente Ficha `alterar(dto, usuarioAtivo)` — sem
  `@Param`, o id é o próprio ator). **Entregável 4 — camadas (§7):** `UsuarioController` burra (só
  monta o DTO com o id do token e repassa); `UsuarioService` com toda a regra; `UsuarioRepository`
  ganhou `recuperarPorId` (`SELECT ... WHERE id = :id AND is_deleted = false`, param nomeado, carrega
  o hash) e `alterarSenha` (`UPDATE ... SET senha = :senha, updated_date = NOW() WHERE id = :id AND
  is_deleted = false` — soft-delete-safe, sem `DEFAULT`), dona das queries de `usuario` (proibição
  #23). `UsuarioModule` passou a registrar controller + service (mantendo o export do repositório) e
  foi importado direto no `AppModule`. **Testes:** novo `usuario.service.spec.ts` com **4 testes**
  (perfil sem senha; perfil de conta inexistente → `ResourceNotFoundException`; troca de senha caminho
  feliz — compara, encripta, persiste, retorna sem senha; `senhaAtual` incorreta → `BusinessException`
  sem hashear nem persistir), repositório dublado + `bcrypt` mockado. **Validado:** `build` do
  **shared** verde; `lint`/`build` do **backend** limpos; `test` do **backend** **9/9** (5 de
  autenticação + 4 novos). **Verificação ao vivo contra o Postgres:** `perfil` sem token / com token
  inválido → **401**; registro + login de um usuário descartável → `perfil` com token devolve
  `{id,login,nome}` **sem** senha; `PATCH senha` com `senhaAtual` errada → **400 'Senha atual
  incorreta'**; com a correta → **200**; em seguida login com a senha **antiga → 400** e com a
  **nova → 201** (prova persistência + encriptação corretas). Nenhuma UI, nenhuma regra de jogo
  (`shared/regras` intocado).
- **m2-02-autenticacao-jwt-guard** (2026-07-06): **backbone de autenticação do M2** — registro,
  login com JWT, guard global e `@ActiveUser()`; **primeira camada de negócio da API** (até aqui só
  o `/health` operacional). **Entregável 1 — DTOs** (`shared/src/dtos/usuario/`, 1º pacote de DTOs de
  negócio do projeto): públicos `UsuarioCriarDto {login,senha,nome}`/`UsuarioCriadoDto {id,login,nome}`
  e `UsuarioAutenticarDto {login,senha}`/`UsuarioAutenticadoDto {token,id,login,nome}` — **saída nunca
  expõe `senha`**; internos service↔repository `UsuarioInternoCriarDto` (senha já é hash),
  `UsuarioLoginRecuperarDto {login}` e `UsuarioInternoRecuperadoDto {id,login,senha,nome}` (carrega o
  hash p/ `bcrypt.compare`). Interfaces (sem class-validator — o `ValidationPipe` global não é escopo
  desta task). Export subpath `./dtos/usuario` no `shared/package.json` (+ `shared` rebuildado).
  **Entregável 2 — módulo `autenticacao`** (`backend/src/modules/autenticacao/`): `AutenticacaoController`
  burra (`POST /autenticacao/registro` e `/login`, ambas `@Public()`, só repassam); `AutenticacaoService`
  com toda a regra — registro recusa login duplicado via `validarLogin` (`BusinessException('Login já
  está em uso')`, nunca `existe*`) e grava `bcrypt.hash` (cost 10, igual ao seed da migration 0003);
  login valida por `bcrypt.compare` e emite JWT, com **a mesma mensagem** (`'Login ou senha inválidos'`)
  para login inexistente e senha errada (não revela qual falhou); `JwtStrategy` (Passport, `Bearer`,
  segredo do `ConfigService`); `JwtModule.registerAsync` lê `JWT_SECRETO`/`JWT_EXPIRACAO` do
  `ConfigService` (nunca `process.env` — proibição #10); `JwtPayload { sub, login }`. **Entregável 3 —
  `JwtAuthGuard` global via `APP_GUARD`** (no `AppModule`): estende `AuthGuard('jwt')` e libera as rotas
  `@Public()` lendo `IS_PUBLIC_KEY` pelo `Reflector` — **1º consumidor real do `@Public()` do M0**, que
  até aqui não bloqueava nada. **Entregável 4 — `@ActiveUser()`** (`core/decorators/active-user.decorator.ts`,
  ao lado do `@Public()`): injeta `request.user` (o payload validado). **Entregável 5 — persistência
  `usuario`** (`backend/src/modules/usuario/`, dona das queries — proibição #23): `UsuarioRepository`
  (estende `BaseRepository`) com `criarUsuario` (`INSERT ... SELECT ... RETURNING id, login, nome` — sem
  `VALUES`/`DEFAULT`) e `recuperarPorLogin` (`SELECT ... WHERE login = :login AND is_deleted = false`,
  param nomeado); `UsuarioModule` exporta o repositório, `AutenticacaoModule` o importa. **Test-runner
  do backend (novo):** Vitest (`backend/vitest.config.ts` + script `test`) — `autenticacao.service.spec.ts`
  com **5 testes** (login duplicado no registro; senha inválida e login inexistente no login com a mesma
  mensagem e sem emitir token; encriptação + persistência sem devolver a senha; geração do JWT com
  payload `{sub,login}` e retorno sem senha), colaboradores dublados + `bcrypt` mockado (sem DB nem hash
  real). Deps novas: `@nestjs/passport`/`@nestjs/jwt`/`passport`/`passport-jwt`/`bcrypt` (+ `@types/*`).
  **Fix de build:** `vitest.config.ts` foi adicionado ao `exclude` do `tsconfig.build.json` (senão o
  `nest build` alargava o `rootDir` e emitia `dist/src/main.js`, quebrando `start:prod`). **Validado:**
  `build`/`lint`/`test` do **backend** verdes (5/5); `lint`/`test` do **shared** verdes (143/143,
  intocado). **Verificação ao vivo contra o Postgres:** `GET /health` e as rotas de auth acessíveis sem
  token (200); `registro` devolve o usuário **sem senha** (id 2 — a conta seed `senhor.contratados` é a
  id 1); registro duplicado → `Login já está em uso`; login errado → `Login ou senha inválidos`; login
  correto → JWT válido (payload `{sub,login,iat,exp}`). Guard exercitado numa rota **protegida** de
  teste descartável: **sem token → 401, token inválido → 401, token válido → 200** com `@ActiveUser()`
  injetando o payload. Nenhuma UI, nenhuma regra de jogo (`shared/regras` intocado).
- **m2-01-migrations-tabelas-contas-campanha** (2026-07-06): **primeira task do M2** e fundação de
  dados de Auth + Campanhas — cria as tabelas relacionais e o enum de papel, **sem lógica de
  negócio, service, controller ou frontend** (o backbone de auth nasce na m2-02). **Entregável 1 —
  enum espelho:** `TipoCampanhaMembroPapelEnum` (`MESTRE`/`JOGADOR`) em
  `shared/src/enums/tipo-campanha-membro-papel.enum.ts` (+ barrel `index.ts`) — o **primeiro enum
  de coluna** do projeto (materializado como tabela `tipo_*`, ao contrário dos enums de conteúdo de
  jogo do JSONB — §10.3). **Entregável 2 — migrations `.sql`:** quatro arquivos novos em
  `backend/src/database/migrations/`, em ordem de dependência de FK — `0002` tabela de referência
  `tipo_campanha_membro_papel` (com **seed** `MESTRE`/`JOGADOR` por literais SQL — exceção sancionada
  de migration §10.7), `0003` `usuario` (colunas `login`/`senha`/`nome` — hash bcrypt na `senha`, sem os sufixos
  `_encriptada`/`_completo`; inclui **seed da conta do autor** `senhor.contratados`/`Matheus`
  com a senha como hash bcrypt literal), `0004` `campanha`, `0005` `campanha_membro` — cada uma
  com BaseEntity completa (**sem DEFAULT**), PK/FK/índices nomeados por prefixo (§10.2.11), índices
  únicos **parciais** `WHERE is_deleted = false` (login, código de papel, código de convite, par
  campanha+usuário) + `ix_campanha_membro_usuario`, e trigger `trg_<tabela>_updated_date` usando a
  `fn_set_updated_date()` do M0; seções `-- UP`/`-- DOWN`, sem `BEGIN/COMMIT` (o Knex gerencia a
  transação — §10.7). **Seed da conta inicial** do autor em `usuario` (login `senhor.contratados`,
  nome `Matheus`) com a `senha` como **hash bcrypt** literal (cost 10; validável por
  `bcrypt.compare` na m2-02). **Entregável docs:** `SCHEMA.md` sincronizado (colunas de `usuario`
  renomeadas para `login`/`senha`/`nome` + nota do seed); ajuste de nomenclatura propagado à
  constituição — os exemplos de coluna de negócio da SYSTEM.SPEC §4/§14 e da CONVENTIONS passaram
  de `senha_encriptada`/`nome_completo` para `senha`/`nome`; `CONVENTIONS.md` "Próxima migration"
  atualizado `0002` → `0006`.
  **Validado no Postgres local:** `db:up` + `db:migrate` (batch 1 = 5 migrations) cria as 4 tabelas;
  conferidos por `psql` as 4 tabelas, o seed (`MESTRE`/`JOGADOR`), os 9 índices (`pk_`/`uix_`/`ix_`),
  as 3 FKs de `campanha_membro` e os 4 triggers; **round-trip** `db:rollback` (batch revertido, só
  `knex_*` sobra) + `db:migrate` de novo reconstrói tudo — `-- DOWN` limpo e `-- UP` re-aplicável.
  `lint` **shared** e **backend** limpos; `test --workspace=shared` **143/143** (intocado — enum novo
  não quebra nada). Nenhuma UI, nenhum service.
- **m1-18-scrollbar-customizada** (2026-07-06): última task de refinamento do M1 (mesmo padrão de
  m1-15/m1-16 — acabamento após o fechamento da paridade em m1-14) — **fecha o M1 no código (18
  tasks, backlog do M1 vazio)**. Substitui a barra de rolagem **nativa** do navegador por um padrão
  próprio do tema "Terminal de Contenção", **sem tocar em template/TS de nenhuma página nem em regra
  de jogo** (`shared`/`shared/regras` intocados; mudança 100% CSS global). **Entregável 1 — padrão
  canônico:** novo bloco de scrollbar em `frontend/src/styles/tema/_base.scss` (parcial de tema
  **global**, já importado por `styles.scss` após os tokens — não em `_componentes.scss`, que é
  biblioteca de copiar-por-componente), **espelhado no handoff** `docs/design/tema/_base.scss`. Thumb
  fino (`width`/`height: 10px`) em `--surface-2` com contorno `1px --border-strong` e raio
  `--radius-control`; track e `::-webkit-scrollbar-corner` transparentes; `::-webkit-scrollbar-thumb:hover`
  troca o contorno para `--accent-border` (realce sutil — **nunca** `--accent` sólido, reservado p/
  ação/estado ativo). Cross-browser: `::-webkit-scrollbar-*` (Chrome/Edge/Safari) + `scrollbar-width:
  thin` e `scrollbar-color: var(--border-strong) transparent` no `html` (Firefox e a spec padrão;
  `scrollbar-color` herda para os modais). **Entregável 2 — pontos de rolagem:** o seletor `*` do
  webkit e a herança de `scrollbar-color` cobrem de uma vez o scroll geral (`html`/`.conteudo`), os 3
  modais (`AjudaCalculadora`/`ConfiguracoesTema`/exportar-importar) e as tabelas/textarea com
  `overflow-x: auto` — nenhum override local divergente foi necessário (confirmado: `grep -ri scrollbar`
  no front só retorna o novo bloco). **Só tokens** (`--surface-2`/`--border-strong`/`--accent-border`),
  nenhum hex/raio solto (proibição #29): como o `TemaService` (m1-13) sobrescreve `--surface-2` e
  `--border-strong` na base clara (`TOKENS_CLARO`), o thumb segue legível/discreto nas **duas bases**
  automaticamente. **Entregável 3 — documentação:** nova seção "Scrollbar (padrão global)" no
  `docs/design/DESIGN.md` (+ menção no bullet do `_base.scss`), instruindo as telas futuras (ficha de
  jogador/criatura, guia de missão) a não reintroduzir a barra nativa nem restilizá-la por componente.
  **Fora de escopo respeitado:** CSS puro, sem JS/biblioteca; a affordance de rolagem é **restilizada**,
  não escondida. **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **73/73**
  (inalterado — mudança só de CSS global); `test --workspace=shared` intocado; `build --workspace=frontend`
  verde (inicial **538,12 kB** < 560 kB; `styles.css` global **7,13 kB**; **sem avisos de budget**).
  Os warnings de compat do editor sobre `scrollbar-width`/`scrollbar-color` em navegadores antigos são
  esperados — é justamente por isso que o `::-webkit-scrollbar-*` os acompanha (cobertura cruzada).
- **m1-17-singleton-estado-abas-calculadora** (2026-07-06): task de refinamento do M1 —
  singleton em memória que preserva o formulário das abas da calculadora ao navegar entre elas,
  **sem tocar em regra de jogo** (`shared`/`shared/regras` intocados). **Entregável 1/2/3 —
  singleton de estado:** novo `EstadoAbasCalculadoraService`
  (`modules/calculadora/estado-abas-calculadora.service.ts`, `providedIn: 'root'`) guarda em
  **memória** (mapa `aba → valor bruto` num Signal imutável, **sem I/O**) o valor bruto do
  formulário das 5 abas `agente`/`dt`/`novo-agente`/`patente`/`descanso` (`obterEstado`/
  `definirEstado` genéricos, tipados pelo valor bruto da própria página). Cada página passou a
  **restaurar no construtor** (via `patchValue`, se houver estado salvo; senão usa o preset
  inicial) e **gravar de volta** a cada `valueChanges` — puramente em memória, nenhuma chamada a
  `localStorage`/`sessionStorage`/cookie. Como é `root`, o estado sobrevive à navegação SPA
  (rotas lazy destroem/recriam o componente) mas é **recriado vazio a cada F5** — as 5 abas voltam
  ao preset no reload, exatamente como antes; só `compras` sobrevive a F5 (seu `localStorage` da
  m1-11 fica **intocado** e não é duplicado no singleton). Ordem cuidada nos construtores com
  lógica existente: no `agente` a restauração vem **antes** do reclamp de classe (o valor salvo já
  está normalizado) e o write-sub não muta o form (não realimenta o reclamp — cuidado pedido pela
  spec); no `novo-agente` a restauração vem antes do auto-sync do Prestígio do bônus e o
  `sincronizarPrestigioBonus()` inicial **só roda quando não há estado salvo** (senão sobrescreveria
  o Prestígio restaurado). **Entregável 4/5 — preset da aba `agente`:** o `FormControl` `nivel`
  nasce em **0** (era 3) e os 5 atributos (`vigor`/`destreza`/`forca`/`vontade`/`sentidos`) nascem
  todos em **1** (era `2/2/2/1/1`); classe segue `Combatente`. **Testes:** novo
  `estado-abas-calculadora.service.spec` (guardar/recuperar/sobrescrever/isolar por aba) + um teste
  de **ida-e-volta** em cada uma das 5 specs de página (preencher → desmontar → remontar no mesmo
  injector root → valor preservado); o `novo-agente` prova especificamente que o Prestígio do bônus
  editado não é zerado no retorno; a spec do `agente` teve os números do preset padrão atualizados
  (Vida **34** / Energia **17** para Combatente Nível 0, atributos 1). **Validado:** `lint
  --workspace=frontend` limpo; `test --workspace=frontend` **73/73** (64 anteriores + 9 novos);
  `test --workspace=shared` **143/143** (intocado); `build --workspace=frontend` verde (inicial
  **537,70 kB** < 560 kB, sem avisos de budget).
- **m1-16-preset-cor-salvo-tema** (2026-07-06): refinamento do sistema de tema em runtime
  (m1-13), estendendo o `TemaService` e o painel `ConfiguracoesTema` — **sem regra de jogo**
  (`shared`/`shared/regras` intocados). **Entregável 1 — slot de cor custom salvo:** novo
  `_accentCustomSalvo` (persistido em `accentCustomSalvo`, distinto do `accentCustom` "ativo") +
  `salvarAccentCustom`/`selecionarAccentSalvo`/`accentCustomSalvo`/`salvoAtivo`; a cor do color
  picker vira um **swatch re-selecionável** ("S" no canto) ao lado dos presets, **único por vez**
  (novo salvamento sobrescreve o anterior), sobrevive a reload e reaplica com um clique sem
  reabrir o picker. **Entregável 2 — inversão visual por incompatibilidade de base:** `accentEfetivo`
  passou a ser o valor **selecionado** (lógico) e ganhou par `accentAplicado` (o que é escrito em
  `--accent`) + `accentAdaptado`; quando a cor selecionada/salva fica ilegível na base ativa, o
  `--accent` exibido é uma **variante legível** (`variantePorContraste`: complemento RGB → ajuste
  de luminância até cruzar `CONTRASTE_MINIMO`, com fallback ao preset seguro só em último caso),
  **preservando o valor salvo** — ao voltar à base compatível a cor original é reaplicada.
  `definirBase` deixou de **descartar** a cor custom (só troca **presets fixos** travados). Restauração
  no boot passou a restaurar o custom/salvo **sem** a trava (a legibilidade é resolvida por
  adaptação, não por descarte). A trava de contraste de `definirAccentCustom` (bloquear a
  **definição** de cores ilegíveis na base atual) segue intacta. **Entregável 3 — UI:** botão
  "Salvar cor" na seção de cor personalizada, o swatch salvo (estado selecionado quando ativo) e
  **nota discreta** (`text-mute`) quando a cor está sendo exibida adaptada; tudo **via tokens**
  (nenhum hex/fonte/raio solto — proibição #29). **A pedido do autor (mesma sessão):** (a) paleta
  de presets expandida de 4 → **9** (as 4 oficiais + Roxo/Rosa/Dourado/Turquesa/Cinza; cores
  principais com chroma/lightness próximos das oficiais, todas sujeitas à mesma trava por base);
  (b) o swatch salvo recebe um **nome aproximado** derivado do matiz/saturação/luminosidade da cor
  (`nomearCor` puro — faixas de matiz pt-BR + cinzas por baixa saturação + qualificador
  claro/escuro), exibido no lugar de um rótulo fixo. **Testes:** `tema.service.spec` ganhou o slot
  salvo (salvar/sobrescrever/re-selecionar ilegível→adaptado→voltar, persistência), `variantePorContraste`,
  `nomearCor` e a checagem das cores adicionais; `configuracoes-tema.component.spec` cobre o swatch
  salvo re-selecionável. **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend`
  **64/64** (54 anteriores + 10 novos); `test --workspace=shared` **143/143** (intocado);
  `build --workspace=frontend` verde (inicial **537,70 kB** < 560 kB, sem avisos de budget).
- **m1-15-refinamento-mobile-calculadora** (2026-07-06): task de refinamento do M1 —
  otimização da UI/UX **mobile** das 6 abas, do shell e dos painéis, sem tocar em regra de
  jogo (`shared`/`shared/regras` intocados; nenhuma mudança de DOM/TS, só SCSS + `angular.json`,
  então os 54 testes de front seguem verdes sem edição). **Estratégia responsiva de fonte
  única:** novo `frontend/src/styles/tema/_breakpoints.scss` (`$bp-mobile: 560px`, mixin
  `mobile`, `$alvo-toque: 44px`) — media queries são compile-time e não leem `var(--…)`, por
  isso o breakpoint é token **Sass**, não CSS custom property; resolvido por bare import
  (`@use 'tema/breakpoints'`) via `stylePreprocessorOptions.includePaths: ["src/styles"]`
  adicionado ao `angular.json`. Nenhuma largura mágica repetida por arquivo. **Densidade mobile
  por override de token:** um `@media (max-width: 560px)` no `styles.scss` reduz `--pad-card`
  15px e `--gap-grid` 12px no `:root` — como todos os cards/grids consomem esses tokens, o
  reflow acontece de uma vez, sem editar cada componente. **Zero scroll horizontal do body:**
  `overflow-x: clip` em `html` e `.conteudo` (conteúdo largo — tabelas de DT/Patente, textarea
  de código — já rola no próprio container via `overflow-x: auto`); `img/svg/video/canvas`
  com `max-width: 100%`. **Reflow das 6 abas:** as grades já eram `auto-fit`/`auto-fill minmax`,
  então colapsam para 1–2 colunas no mobile sem mudança estrutural (tabela de colunas por
  largura de referência na §6 de `docs/PARIDADE-M1.md`); a redução de padding/gap por token
  ajusta a densidade. **Alvos de toque (44px):** botões −/+ do `StepInput` (30px→44px só no
  mobile, desktop intacto), abas do shell (que no mobile viram uma **barra flutuante fixa no
  rodapé** — `position: fixed` destacada das bordas, ícone sobre rótulo, 6 itens `flex: 1`
  distribuídos, deep-link por rota preservado, `env(safe-area-inset-bottom)` do iOS +
  `padding-bottom` reservado no conteúdo; `z-index` abaixo dos modais, que a cobrem),
  chips de categoria e mini-botões −/+ do carrinho (aba `compras`), e opções/swatches/**color
  picker** do painel de tema. **Modais mobile-first:** ajuda (`AjudaCalculadora`), config de
  tema (`ConfiguracoesTema`) e exportar/importar do carrinho ganham `max-height:
  calc(100dvh - 32px)` + `overflow-y: auto`, permanecendo operáveis com o polegar. **Identidade
  preservada** (dark base + IBM Plex + grid + cards), **tudo via tokens** — nenhum hex/fonte/raio
  solto, nenhum `style=""`, nenhum `.css` (proibições #17/#18/#29). **Budget:** o SCSS responsivo
  da aba `compras` (a mais pesada) levou o `anyComponentStyle` a 8,28 kB; o `maximumWarning` subiu
  **8→10 kB** (erro mantido em 12 kB) em `angular.json`, mesmo precedente das elevações de budget
  em `m1-10`/`m1-13`. **Acabamentos pedidos na mesma sessão** (mobile + polimento): (1) a
  **categoria de equipamento selecionada** ganhou estado ativo com **glow** de accent — a classe
  `.selecionavel--ativo` era usada no template mas não existia no SCSS scoped da `compras` (só no
  shell), então a seleção não tinha destaque; agora `accent` + `accent-dim` + `box-shadow` suave;
  (2) os botões **Importar/Exportar/Esvaziar** do carrinho foram embrulhados em
  `.compras-carrinho-acoes` (desktop: agrupados à direita; mobile: caem para a própria linha em
  terços iguais, corrigindo a quebra visual); (3) botões de item/**amplificador** com alvo de
  toque ≥40px e `flex-wrap` no mobile; (4) na aba **DT**, o resultado da fórmula e os valores da
  tabela passaram de verde `--positive` para a **cor do tema** (`--accent` trocável em runtime).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **54/54**; `test
  --workspace=shared` **143/143**; `build --workspace=frontend` verde, inicial **533,27 kB** <
  560 kB, **sem avisos de budget**. Verificação responsiva registrada em `docs/PARIDADE-M1.md` §6.
- **m1-14-paridade-deploy-arquivamento** (2026-07-06): última task do M1 — verificação de
  paridade das 6 abas, checagem de "sem duplicação" e fechamento **de código** do milestone
  (o deploy Cloudflare e o toggle de arquivamento do repo antigo são passos operacionais de
  plataforma, documentados como pendências). Task de verificação + documentação, sem regra de
  jogo nova (`shared`/`shared/regras` intocados na lógica). **Método de paridade:** o repo antigo
  `contratados-calculadora` **não está neste monorepo nem no histórico Git** (confirmado por
  `find`/`git log`) — é projeto à parte. Como a milestone autoriza, a paridade é verificada
  contra a **fonte da verdade** `docs/core/sistema-v4.1.0.md` (que vence o código antigo), já
  conferida por domínio nas m1-02..m1-05 com os exemplos numéricos replicados em teste; as 4
  divergências resolvidas a favor do documento (Limite de Energia `Destreza×2`; peso 0 das mods
  de Armazenamento; quebra de formato do export/import; texto de ajuda reescrito) estão
  catalogadas no novo **`docs/PARIDADE-M1.md`** (checklist por aba + tabela de divergências +
  resultado da checagem de duplicação + estado de deploy/arquivamento). **Achado de duplicação
  corrigido:** `compras.page.ts` recalculava o custo do amplificador (`3000 + (stacks−1)×1000`)
  e a penalidade de Vontade (`(stacks−1)×2`) com constantes de regra embutidas — repontado para
  `calcularCustoAmplificador()` + `PENALIDADE_VONTADE_POR_EMPILHAMENTO` de `shared/regras/compras`,
  satisfazendo o critério "nenhuma regra de jogo duplicada no frontend". Confirmado: nenhuma outra
  fórmula/tabela do jogo vive no front/back (backend não importa `shared/regras`); aritmética
  remanescente nas páginas é de UI. **100% das fórmulas testadas:** shared **143/143**; frontend
  **54/54**; `build --workspace=frontend` verde (inicial 532,77 kB < 560 kB, sem avisos) — bundle
  estático servível offline do backend. **Ajustes de acabamento pedidos na mesma sessão** (fora do
  escopo estrito da spec, a pedido do autor): (1) aba do navegador com sufixo **"- DEV"** em
  desenvolvimento (`provideAppInitializer` gated por `!environment.producao`); (2) **stat Vida
  fixada em vermelho** nas abas agente/descanso via novo token `--vida`/`--vida-border` (identidade),
  desacoplada do `--accent` trocável do tema em runtime; (3) housekeeping — specs de milestone
  `m0-fundacao`/`m1-calculadora-paridade` movidos para `done/` e `.gitkeep` removidos das pastas
  que já têm conteúdo (`backend/src/config`, `docs/specs/done`, `frontend/src/app/modules`,
  `shared/src/interfaces`). **Validado:** `lint`/`test`/`build` do frontend verdes; `test` do shared verde.
- **m1-13-sistema-temas-runtime** (2026-07-05): entregável 4 do milestone e item adiado do M1
  (SYSTEM.SPEC §15) — **sistema de troca de tema em runtime** reconstruído sobre o
  `ContencaoPreset`/CSS vars do PrimeNG 21 e os tokens de `docs/design/tema/`. Identidade fixa
  preservada (dark base + IBM Plex); só o `--accent` e a base clara/escura são trocáveis (spec).
  **`TemaService`** (`core/services/tema.service.ts`) é a contraparte em runtime de `_tokens.scss`
  para a parte trocável — o único lugar (fora do SCSS de tokens) sancionado a conhecer valores de
  cor. Estado em Signals (`base`/`presetId`/`accentCustom` → `accentEfetivo`/`presetsExibicao`
  computados). `aplicar()` escreve o token `--accent` em `<html>` (dispara `--accent-dim`/
  `--accent-border` via `color-mix`), na base clara aplica overrides de superfície/texto (na
  escura os remove, deixando o `:root` de `_tokens.scss` valer — sem duplicar os hexes dark),
  alterna a classe `.dark` do PrimeNG e regenera a paleta primária do preset
  (`updatePrimaryPalette(palette(accent))`) para os componentes PrimeNG seguirem o accent.
  **Presets de accent (4):** só cores da paleta do tema (vermelho `--accent` / azul `--energy` /
  verde `--positive` / âmbar `--warning`) — "não inventar cores fora desta lista" (CLAUDE.md).
  **Trava de contraste (WCAG):** `luminanciaRelativa` (≈`relativeLuminance` do site antigo) +
  `razaoContraste` (≈`contrastRatio`) puras; `CONTRASTE_MINIMO = 3` (piso WCAG AA de UI, paridade
  do `SIMILAR_THRESHOLD`); `presetsExibicao` marca os travados p/ a base atual
  (≈`updateSwatchLocks`), `definirAccentCustom` bloqueia (retorna `false`) cores ilegíveis, e
  `definirBase` cai em `accentAlternativoParaBase` (≈`fallbackAccentForBase`) se o accent atual
  ficar travado na nova base. Ex. conferido em teste: **âmbar** trava na base clara (contraste
  ~2,25 vs branco) e libera na escura. **Persistência:** `salvar`/`restaurar` em `localStorage`
  (`contratados-rpg:tema`), restaurados no boot por **`provideAppInitializer`** (aplica antes da
  primeira renderização — sem flash). **UI:** painel `ConfiguracoesTema`
  (`shared/configuracoes-tema/`) — gatilho na topbar (`Layout` ganhou `.topbar__acoes`) + modal
  (base escuro/claro, swatches de preset com os travados desabilitados, `<input type="color">`
  via Reactive Forms — sem `ngModel` — com aviso de contraste bloqueado); **fecha só por botão**
  (padrão de acessibilidade dos modais de ajuda/compras). Consome **só tokens** do tema (nenhum
  hex/fonte/raio solto no SCSS/template — proibição #29; os valores de cor vivem no `TemaService`,
  a fonte em runtime, como no `_tokens.scss`). **Sem regra de jogo** (`shared`/`shared/regras`
  intocados). **Budget:** o motor de paleta do `@primeuix/themes` (`palette`/`updatePrimaryPalette`)
  entra no bundle inicial (~48 kB; import dinâmico não separa porque `@primeuix/themes` já é inicial
  via `contencao.preset.ts`) — o budget `initial` `maximumWarning` foi elevado de 500 kB para
  **560 kB** em `angular.json` (mantendo o erro em 1 MB; decisão do autor, mesmo precedente do
  budget de estilo elevado na m1-10). Novos `tema.service.spec.ts` (contraste WCAG; trava por
  base; aplicação das CSS vars em `<html>`; bloqueio do accent custom ilegível; fallback ao trocar
  de base; round-trip de persistência) e `configuracoes-tema.component.spec.ts` (gatilho abre o
  painel; 4 presets; base clara desabilita o âmbar; picker de baixo contraste sinaliza bloqueio).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **52/52** (36
  anteriores + 16 novos); `build --workspace=frontend` verde **sem avisos de budget** (inicial
  532,49 kB < 560 kB). A troca reflete em runtime em todas as páginas (as pages são token-driven).
- **m1-12-conteudo-ajuda** (2026-07-05): conteúdo de ajuda por aba — parte do entregável 4 do
  milestone (as 6 páginas ganham um modal de ajuda). **Componente único reutilizável**
  `AjudaCalculadora` (`modules/calculadora/componentes/ajuda-calculadora/`) consumido pelas **6
  páginas** (`agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras`): um gatilho "? Ajuda" + o
  modal com o guia de uso, parametrizado só pelo input signal `aba` — **um só componente, sem
  duplicação por aba** (critério de aceite). Estado de abertura em Signal; **fecha apenas por botão**
  ("×" do cabeçalho ou "Fechar"), sem clique-fora — mesmo padrão de acessibilidade dos modais de
  exportar/importar da m1-11 (não aciona `click-events-have-key-events`/`interactive-supports-focus`
  do lint). Modal adaptado do `.compras-modal`, consumindo **só tokens** do tema "Terminal de
  Contenção" (nenhum hex/fonte/raio solto — proibição #29); embutido como nó-raiz acima do `<form>`
  de cada página, com o host em flex alinhando o gatilho à direita. **Conteúdo** em
  `conteudo-ajuda.ts` (`CONTEUDO_AJUDA` keyed por `AbaAjuda` = equivalente ao `HELP_CONTENT` do site
  antigo): cada entrada tem título, resumo, passos e nota. **Origem do texto — quebra de paridade
  documentada (como na m1-11):** o `HELP_CONTENT` original não está neste repositório (a SPA
  `contratados-calculadora` é projeto à parte, arquivada só após o M1 — SYSTEM.SPEC §1; confirmado no
  git e no grep), então a paridade textual literal é impossível. A pedido do autor, cada entrada é um
  **guia de "como usar esta página"** (instruções de uso da aba), redigido a partir do comportamento
  já implementado (m1-07..m1-11) e conferido contra `docs/core/sistema-v4.1.0.md` — é texto de
  interface, **sem regra de jogo nova** (`shared/regras` e `shared` intocados). Novo
  `ajuda-calculadora.component.spec.ts` prova o componente (gatilho abre o modal; título e nº de
  passos batem com `CONTEUDO_AJUDA`; seleção de conteúdo por aba; fecha por botão); os specs das 6
  páginas seguem passando (o gatilho usa classes `.ajuda-*` próprias, não colide com as queries por
  classe dos testes existentes). **Validado:** `lint --workspace=frontend` limpo; `test
  --workspace=frontend` **36/36** (32 anteriores + 4 novos); `build --workspace=frontend` verde **sem
  avisos de budget**. As 6 abas seguem client-side (funcionam sem backend).
- **m1-11-compras-persistencia-carrinho** (2026-07-05): fecha a paridade da aba `compras` —
  persistência e exportar/importar por código, últimos entregáveis do milestone antes de
  `m1-12`/`m1-13`/`m1-14`. **Persistência em `localStorage`:** um `effect()` no construtor da
  `ComprasPage` observa `carrinho`/`amplificadores`/`recursos` (form) e grava o estado a cada
  mudança na chave `contratados-rpg:calculadora-compras`; o construtor tenta carregar esse
  estado antes de qualquer outra inicialização — o carrinho sobrevive a reload/reabertura sem
  nenhuma ação do usuário. **Exportar/importar por código compartilhável:** dois modais novos
  (`abrirModalExportarCodigo`/`abrirModalImportar`, fechados por botão — sem clique-fora, para
  não acionar `click-events-have-key-events`/`interactive-supports-focus` do lint de
  acessibilidade) — exportar serializa `{ versao: 1, recursos, carrinho, amplificadores }` em
  `JSON.stringify` → `encodeURIComponent` → `btoa`, prefixado `CRPG-COMPRAS-V1:`
  (`copiarCodigoCarrinho` usa `navigator.clipboard`); importar reverte a decodificação,
  valida a forma do objeto (`versao === 1` + tipos dos 4 campos de `recursos` + `carrinho`/
  `amplificadores` como array) e só então aplica via `aplicarEstado` (também usado pelo load
  do `localStorage`), recalculando `uidContador` a partir do maior `uid` importado para não
  colidir com itens adicionados depois. **Compatibilidade com códigos do site antigo —
  quebra documentada (critério de aceite cumprido pela via da exceção):** o
  `contratados-calculadora/src/script.js` não está neste repositório (não foi migrado nem
  está disponível para inspeção), então o formato de serialização original não pôde ser
  conferido nem replicado; o novo formato (`CRPG-COMPRAS-V1:`) é uma serialização própria,
  incompatível por construção, e a UI de importação avisa isso explicitamente no texto do
  modal ("Códigos do site antigo... não são compatíveis com este formato"). **Sem lógica de
  jogo nova** — só serialização de estado da página, fora do escopo de `shared/regras`
  (que continua intocado desde a m1-05/m1-10). `compras.page.spec.ts` ganhou 2 testes: um
  round-trip de persistência (adicionar item → remontar a página → item e gasto
  preservados) e um round-trip de exportar/importar (exportar em uma instância, limpar o
  `localStorage`, importar o código numa segunda instância, mesmo gasto/item reproduzidos);
  os testes existentes ganharam `beforeEach`/`afterEach` limpando o `localStorage` (evita
  vazamento de estado entre `it`s) e a função `montar()` ganhou `TestBed.resetTestingModule()`
  + `await fixture.whenStable()` (necessário porque agora há dois `montar()` no mesmo teste e
  porque o `effect()` de salvar é assíncrono — sem o `whenStable()` o segundo `montar()` podia
  ler o `localStorage` antes do `effect()` gravar). **Validado:** `lint --workspace=frontend`
  limpo; `test --workspace=frontend` **32/32** (30 anteriores + 2 novos); `build
  --workspace=frontend` verde sem avisos de budget de estilo (SCSS do modal ficou dentro do
  budget elevado de 8/12 kB definido na m1-10).
- **m1-10-pagina-compras** (2026-07-05): a aba `compras` da calculadora — **a mais pesada** — com paridade
  funcional à aba `compras` do site antigo (`renderCmpSummary`/`renderCmpCatalog`/`renderCmpCart`/
  `computeItemStat`/`getCmpTotals`). **Zero regra de jogo no front**: limites de patente, custo/peso de
  modificação, conflitos, stat computado de item, custo de amplificador e todos os totais vêm de
  `shared/regras/compras` (regras prontas desde a m1-05); a página só orquestra o estado do carrinho em
  Signals e traduz os value-objects do motor para a UI. Mesmo molde das abas anteriores (Reactive Forms +
  Signals, `StepInput` da m1-06, tokens/BEM do tema "Terminal de Contenção"). `ComprasPage`
  (`paginas/compras/`) tem 4 cards: **(1) Configuração** — 4 steppers (Dinheiro passo 100, Prestígio,
  Inventário passo 0,5, Vontade 0–12); **(2) Resumo** — patente (via `ROTULOS_PATENTE`), dinheiro
  restante/gasto, inventário usado vs efetivo, amplificadores vs limite (Vontade×3), limite de mods e
  penalidade de Vontade, com cores semânticas (accent quando estoura, `--positive` quando sobra dinheiro),
  tudo de `calcularResumoCompras`; **(3) Catálogo** — busca (`<input type=search>`) + abas de categoria
  (`CATALOGO_CATEGORIAS`, texto mono sem os emojis do site — proibição de emoji decorativo do tema) e grade
  de cartões (item base com dano/resist/bônus/descrição, ou amplificadores com faixa de stack e info de
  limite); **(4) Carrinho** — itens com stat computado (`calcularStatItem`), toggle Guardada/Vestida para
  armazenamento, chips de mods ativas com −/+, painel de modificações (próprias + emprestadas via "Faz
  Parte"/"Combativo", com pontos de empilhamento, custo/stack, motivo de bloqueio e gate de adição) e
  seção de amplificadores (stacks, custo, penalidade). **Estado em Signals**: `carrinho`/`amplificadores`
  (arrays imutáveis atualizados por `signal.set`), `categoriaAtiva`, `busca`, `painelAbertos` (Set de uids
  abertos), `recursos` (`toSignal` do form) → um `computed` por recorte de UI (`resumo`, `itensCatalogo`,
  `amplificadoresCatalogo`, `itensCarrinho`, `amplificadoresCarrinho`) que remontam view-models a partir do
  motor. **Gate de adição de mod/amp na página** (habilitar/desabilitar botão + travar a mutação) lê os
  limites do motor (`obterLimiteModificacoes`, `verificarConflitoModificacao`, `empilhamentosIniciais`/
  `empilhamentoMaximo` das `ModificacaoDados`) — não reimplementa fórmula, só orquestra a UI (mesma
  disciplina da rolagem animada viver na `DescansoPage`). **Decisões de representação (não divergem de
  regra):** ícones de stat do site (`⚔`/`🛡`/`📦`) viram rótulos de texto ("Dano …"/"Resist. …"/"+N inv."),
  como previsto na m1-05; categorias sem emoji; patente exibida pelo nome pt-BR (`ROTULOS_PATENTE`, m1-08),
  não o código do enum. **Persistência (`localStorage`) e export/import por código ficam para a m1-11**
  (fora de escopo da spec). `calculadora.routes.spec.ts` atualizado (`compras` deixou de ser stub → agora
  checa `.calc` + aba ativa; **não há mais stub**) e novo `compras.page.spec.ts` prova a ligação motor→DOM
  (resumo padrão Prestígio 0 → **Agente** / **$1.000** / gasto **$0**; adicionar "Leve" → gasto/restante
  **$500** e stat **Dano 1D6+DES [Físico]**; aplicar "Balanceada" → gasto **$1.250** (+$750 do motor);
  adquirir amplificador "Defesa" → gasto **$3.000** e amps **1/3**). **Budget de estilo:** a página é grande
  e seu SCSS scoped compila **6,75 kB** (reduzido de 8,46 kB com herança de `--font-mono` no container e
  agrupamento dos padrões repetidos de caixa/controle); o budget global `anyComponentStyle` foi elevado de
  4/8 kB para **8/12 kB** (aviso/erro) em `angular.json` para acomodar a página mais pesada (decisão do
  autor — as demais páginas seguem folgadas). **Validado:** `lint --workspace=frontend` limpo; `test
  --workspace=frontend` **30/30** (26 anteriores + 4 novos); `build --workspace=frontend` verde **sem
  avisos de budget**. As 6 rotas seguem client-side (funcionam sem backend).
- **m1-09-pagina-descanso** (2026-07-05): a aba `descanso` da calculadora com paridade funcional à
  `calcDescanso`/`rollDescanso` do site antigo, **incluindo a rolagem animada** (entregável 5 do milestone).
  **Zero regra de jogo no front** — faixa de recuperação, interpretação dos dados extras, rolagem e resultado
  final vêm de `shared/regras/descanso` (regras prontas desde a m1-04). Mesmo molde das abas anteriores
  (Reactive Forms + Signals, `StepInput` da m1-06, tokens/BEM do tema "Terminal de Contenção"). `DescansoPage`
  (`paginas/descanso/`) tem 3 cards: **(1) Configuração** — `<select>` de tipo/qualidade/refeição/interrupção +
  steppers Vigor/Destreza (0–12) e Nível (0–20); **(2) Resultado determinístico** — faixa mín–máx de Vida
  (accent) e Energia (`--energy`) + fórmula e notas contextuais, tudo de `calcularDescanso`; **(3) Rolar Dados** —
  dois campos de texto para dados extras (`interpretarDadosExtras`), botão de rolagem e o resultado por track
  com memória de cálculo. **Estado em Signals**: `bruto` (`toSignal` do `valueChanges`) → `entrada` (`computed`
  que normaliza os `<select>` Sim/Não em boolean) → um `computed` por saída. **Rolagem animada** (efeito
  scramble): `rolar()` embaralha números aleatórios por ~650ms via `requestAnimationFrame` antes de assentar no
  valor final (paridade com o `scramble` do site), com um pulso de escala via `Element.animate` (WAAPI —
  **sem `@angular/animations`**, que o projeto não instala); o **único não-determinismo vive na página** e usa a
  utilidade `rolarDados` do domínio (§6.6), delegando o total a `calcularResultadoDescanso`. Editar os dados
  extras re-rola sem animação se já houver resultado visível, e mudar a configuração esconde a rolagem antiga
  (paridade com `rollDescansoIfVisible`/`calcDescanso`). **Decisões de representação (não divergem de regra):**
  refeição e interrupção são `<select>` com valores string `'nao'`/`'sim'` (não boolean) porque o value accessor
  nativo do `<select>` escreve string — um controle boolean viraria a string `'sim'`, sempre truthy; a conversão
  para boolean acontece no `computed` `entrada`. `calculadora.routes.spec.ts` atualizado (`descanso` deixou de
  ser stub → agora checa `.calc` + aba ativa; só `compras` segue stub) e novo `descanso.page.spec.ts` prova a
  ligação motor→DOM (preset Curto/Adequado → Energia **1–4** / Vida "Não recupera"; Longo+Confortável+Refeição →
  Energia **1–12** / Vida **1–10**; rolagem Médio Nível 3 com `Math.random` fixo → **7** por track com breakdown
  `[1] + 6 = 7`). **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **26/26** (23
  anteriores + 3 novos); `build --workspace=frontend` verde **sem avisos de budget** (chunk lazy `descanso-page`).
  As 6 rotas seguem client-side (funcionam sem backend).
- **m1-08-pagina-dt-novo-agente-patente** (2026-07-05): as três páginas leves da calculadora, agrupadas por
  serem pequenas, cada uma consumindo seu domínio de `shared/regras` (regras prontas desde a m1-03) —
  **zero fórmula duplicada no front** (proibição de duplicar regra de jogo respeitada). Mesmo molde da
  `AgentePage` (Reactive Forms + Signals, `StepInput` da m1-06, tokens/BEM do tema "Terminal de Contenção",
  layout fiel aos protótipos). **Aba `dt`** (`paginas/dt/`): `DtPage` — steppers Nível (0–20) e Atributo
  (0–12) → `calcularDtAtributo` (`10 + Nível + Atributo×2`) num resultado em destaque + a tabela de
  referência rápida (Atributo 1–6 × Nível 0/5/10/15/20, **cada célula também vinda do motor**, não recalculada
  no front). **Aba `novo-agente`** (`paginas/novo-agente/`): `NovoAgentePage` — `<select>` de motivo de
  entrada + steppers de média de Nível (passo 0,1) e média de Prestígio → `calcularNovoAgente` (Nível/Prestígio
  iniciais, patente resultante, memória de cálculo e aviso de Amaldiçoado pelo Passado). O card de bônus tem um
  campo de Prestígio **auto-preenchido** com o inicial calculado e **editável** (paridade com o `bonus-prest` do
  site antigo, via `merge` dos `valueChanges` da configuração re-sincronizando o campo), computando
  `calcularBonusMonetario`. O re-sync lê de `getRawValue()` (não do Signal `bruto`): como o `valueChanges` do
  controle-filho emite **antes** do form-pai, ler o Signal dentro do subscriber pegaria o valor defasado um passo
  — o modelo do form já está atualizado (bug pego na revisão, com teste de interação que o trava). **Aba `patente`** (`paginas/patente/`): `PatentePage` — stepper de Prestígio →
  `calcularPatente` (patente atual em destaque + tabela completa com a linha atual marcada); a faixa da última
  patente exibe `∞` (o motor entrega `prestigioMaximo` infinito). **Rótulos de UI** (`modules/calculadora/rotulos.ts`):
  `ROTULOS_PATENTE` (`PatenteEnum`→pt-BR, nomes completos do documento — "Força Tarefa Especial"/"Operações
  Especiais") e `ROTULOS_MOTIVO_ENTRADA` (`MotivoEntradaAgenteEnum`→pt-BR) — **formatação de UI**, como o
  `null`→"N/A" da m1-07; a fonte da verdade dos valores segue nos enums do `shared`. **Decisões de representação
  (não divergem de regra):** o cabeçalho de cada aba do protótipo não é repetido (o `CalculadoraShell` já dá o
  chrome); os textos do `<select>` de motivo usam "sucessor convencional / sucessor Experimento" (nomes do
  documento) no lugar de "Regular/Experimento" do site antigo; moeda formatada com `toLocaleString('pt-BR')` e
  prefixo `$` (paridade com o site). **O multiplicador monetário da patente foi omitido da UI** (a pedido do
  autor — confundia mais que ajudava): sai do stat box e da coluna "Mult." da aba `patente` e da linha de info do
  bônus; a fórmula do bônus segue usando-o por baixo (`calcularBonusMonetario`), só não o expõe. **Estilo:** cada página tem seu `.scss` **scoped auto-contido** copiando só
  os blocos BEM que usa (`.calc-cartao`/`.calc-stat`/`.calc-tabela`… de `docs/design/tema/_componentes.scss`) —
  mesmo padrão da `agente` (uma tentativa inicial de parcial `@use` compartilhado foi revertida por estourar o
  budget de 4kB de estilo por componente do Angular, que o `@use` inflava ao inlinar tudo em cada página).
  `calculadora.routes.spec.ts` atualizado (dt/novo-agente/patente deixaram de ser stubs → agora checam `.calc` +
  aba ativa; só `descanso`/`compras` seguem stub) e três novos specs provam a ligação motor→DOM (DT Nível 0/Atr 1
  → **12** + linha ATR 1 = 12/17/22/27/32; Novo Agente preset Morte média 5/10 → Nível **4**/Prestígio **9**/patente
  **Experiente**/bônus **$ 9.000**; Patente Prestígio 0 → **Agente** 0–2 e Prestígio 70 → **Líder Operacional** 66–∞).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **23/23** (16 anteriores + 7 novos,
  incluindo o teste de re-sync do bônus);
  `build --workspace=frontend` verde **sem avisos de budget** (chunks lazy `dt-page`/`novo-agente-page`/`patente-page`).
  As 6 rotas seguem client-side (funcionam sem backend).
- **m1-07-pagina-agente** (2026-07-05): primeira página real da calculadora — a aba `agente` (carro-chefe),
  com paridade funcional à `calc()` do site antigo consumindo `shared/regras/agente`. **Zero regra de jogo no
  front** — toda stat vem do motor (proibição de duplicar fórmula respeitada). `AgentePage`
  (`paginas/agente/`) é um **formulário reativo** (`FormGroup` tipado `nonNullable`: `classe` num `<select>`
  agrupado, os cinco atributos nos **steppers da m1-06** e o Nível num **slider** `<input type="range">`
  — fiel ao protótipo, com o valor atual em accent — todos via `[formControlName]`, sem `ngModel`)
  cujo **estado deriva em Signals**: `bruto` (`toSignal` do `valueChanges` + `getRawValue`) → `entrada`
  (`computed` que normaliza tudo por `aplicarLimitesPorClasse` antes de alimentar as fórmulas) → um `computed`
  por stat. Exibe **todas** as stats derivadas da spec: Vida/Energia (hero, com tons semânticos accent/energy),
  Defesa Base, Proficiência, e o grid secundário Esquiva/Bloqueio/Deslocamento/Inventário/Dano de Corpo/Dano
  Furtivo (verde `--positive`)/Limite de Energia (azul `--energy`)/Traumas/**Sequelas por Missão**/Hab. por
  Turno/Percepção, mais **Benefícios do Nível** e **Progressão Acumulada** (grid de ganhos > 0). Stats que a
  classe não possui (Civil sem defesa/proficiência/dano furtivo/traumas → `null` do motor) são mapeadas para
  `"N/A"` **no front** (formatação de UI, como previsto na m1-02). Ao trocar de classe, um `subscribe` a
  `classe.valueChanges` (`takeUntilDestroyed`) reclampa Nível e atributos via `aplicarLimitesPorClasse`
  (paridade com o clamp de input do site ao mudar de registro); os `[min]/[max]` dos steppers vêm de
  `obterLimitesClasse`. **Layout fiel ao protótipo** `docs/design/examples/calculadora-de-atributos.html`:
  cards numerados (índice mono + título UPPERCASE + régua), stat boxes e stepper adaptados dos padrões de
  `docs/design/tema/_componentes.scss`, consumindo **só tokens** do tema (nenhum hex/fonte/raio solto —
  proibição #29). O Nível usa o **slider** `<input type="range">` do protótipo (a pedido do autor), integrado a
  Reactive Forms pelo `RangeValueAccessor` nativo; os atributos usam os steppers da m1-06. **Adaptações
  conscientes (não divergem de regra):** o
  cabeçalho "Terminal de Agente" do protótipo não é repetido (o `CalculadoraShell` já dá o chrome da
  calculadora); Sequelas e Progressão Acumulada foram **acrescentadas** ao protótipo por serem entregáveis da
  spec; **Limite de Energia mostra `Destreza × 2` (agente) / `Destreza` (civil)** — o valor do motor, que
  corrige a fórmula `(Vig+Des)×2` do site antigo (divergência já registrada e resolvida na m1-02, documento
  vence), então este é o único stat que **intencionalmente** diverge do site (o front nunca reintroduz a
  fórmula antiga). Rótulos e títulos alternam Agente/Civil ("Nível"↔"Treinamentos", "Benefícios deste
  Nível"↔"Treinamento"). Os rótulos sobre os steppers de atributo são `<span>` (o nome acessível vem do
  `ariaRotulo`/`aria-label` do `StepInput`, componente custom sem controle nativo p/ associar); os controles
  nativos usam `<label for>` real (classe e o slider de Nível). `calculadora.routes.spec.ts` atualizado (a aba `agente` deixou de ser stub: agora checa
  `.agente` + aba ativa; as outras 5 seguem em `.stub-pagina__titulo`) e novo `agente.page.spec.ts` prova a
  ligação motor→DOM (Combatente Nível 3 → Vida **71**/Energia **43**; Civil → Defesa/Proficiência **N/A**).
  **Validado:** `lint --workspace=frontend` limpo; `test --workspace=frontend` **16/16** (os 14 anteriores + 2
  novos); `build --workspace=frontend` verde (chunk lazy `agente-page` carregando `shared/regras/agente`). As
  6 rotas continuam servidas client-side (funcionam sem backend).
- **m1-06-frontend-calculadora-base** (2026-07-05): fundação do frontend da calculadora — primeira task de
  UI do M1, esqueleto sobre o qual as páginas de cada aba são construídas (m1-07+). **Tailwind instalado e
  integrado** (`tailwindcss@^3` no workspace `frontend`): `frontend/tailwind.config.ts` mescla o
  `theme.extend` do handoff (`docs/design/tema/tailwind.config.ts`) — cores/fontes/raios utilitários
  apontam para as **mesmas CSS custom properties** dos tokens (`--bg`, `--accent`, `--font-mono`, …), então
  utilitário Tailwind e SCSS/BEM nunca divergem (proibições #17/#29 preservadas — nenhum hex/fonte/raio
  solto). As diretivas `@tailwind base/components/utilities` entram **no fim** de `styles.scss` (o Sass
  exige `@use` — tokens/base — antes de qualquer regra CSS): o preflight carrega depois do `tema/base`, mas
  **não** sobrescreve a identidade (não toca em background/fonte/grid do `body`), só adiciona reset;
  confirmado `box-sizing:border-box` do preflight no CSS compilado. Angular 21 autodetecta o
  `tailwind.config.ts`. **Módulo `modules/calculadora/`** com 6 rotas públicas **lazy** (`loadComponent`,
  sem guard — client-side): `calculadora.routes.ts` monta o `CalculadoraShell` (path `''` com `children`,
  base redireciona para `agente`) e cada aba (`agente`/`dt`/`novo-agente`/`patente`/`descanso`/`compras`)
  carrega sua página stub em chunk próprio; `app.routes.ts` liga `calculadora` via `loadChildren`. **Shell +
  navegação de abas com deep-link por rota**: `CalculadoraShell` renderiza cabeçalho + `nav.abas`
  (`@for` sobre as abas, cada uma um `routerLink` relativo com `routerLinkActive="abas__item--ativo"`) + o
  `router-outlet` aninhado — paridade com o `switchTab`/`VALID_TABS` do site antigo, agora dirigido pela URL
  (`/calculadora/<aba>`) em vez do `#hash` (a aba `novo` do site vira a rota `novo-agente`, conforme a spec).
  **`StepInput`** (`componentes/step-input/`): stepper/input numérico reutilizável, **`ControlValueAccessor`**
  (integra a Reactive Forms via `[formControl]`/`formControlName`, **sem `ngModel`**) com botões − / +,
  clamp em `[min, max]`, `passo` configurável e arredondamento a 2 casas — unifica os antigos
  `stepInput` (inteiro, `passo=1`) e `stepInputFloat` (fracionário) num só componente; o valor central é um
  `<input type="number">` que também aceita digitação direta. **Estilos**: cada componente consome só os
  tokens do tema — o `.stepper` foi copiado de `docs/design/tema/_componentes.scss` (valor central adaptado
  de `<div>` para `<input>`), o estado ativo das abas reusa o padrão `.selecionavel--ativo`, e os 6 stubs
  compartilham o cartão via o parcial `paginas/_stub-pagina.scss` (`@use`), copiado do padrão `.card`. Tudo
  standalone, `.scss`, sem `style=""`/seletor de ID/hex solto (proibições #16–18/#29). **Decisões de
  representação:** sem emojis nos rótulos das abas (o site antigo usava `⚔ 🎯 🔄 🏅 💤 🛒` — o tema
  "Terminal de Contenção" proíbe emoji decorativo), rótulos em mono UPPERCASE; a página `home` do M0 ficou
  intocada (redesenho de home é fora do escopo desta task). **Verificado:** `build --workspace=frontend`
  verde (6 chunks lazy de página + shell + rotas); `test --workspace=frontend` 14/14 (7 do `StepInput` via
  host com `FormControl` — writeValue, incremento/decremento com clamp, passo fracionário, digitação; 7 de
  roteamento via `RouterTestingHarness` — redirect da base + navegação a cada uma das 6 rotas com a aba
  ativa correta, provando o carregamento lazy e o deep-link); `lint --workspace=frontend` limpo. As 6 rotas
  são servidas pelo `frontend:dev` (SPA client-side, funcionam sem backend).
- **m1-05-regras-compras** (2026-07-05): `shared/regras/compras/` completo — o domínio mais pesado da
  calculadora (aba `compras` do site antigo, `contratados-calculadora/src/script.js`) extraído e conferido
  contra `docs/core/sistema-v4.1.0.md` — "Equipamentos", "Prestígio e Patentes" e "Amplificadores"
  (34 testes novos; workspace shared 143/143 verde). **Dados** — `catalogo.dados.ts`: `CATALOGO_ITENS`
  (catálogo completo por categoria) + `ItemCatalogo`; `compras.dados.ts`: `CATALOGO_CATEGORIAS`,
  `CUSTO_MODIFICACAO` (exceções ao padrão $750: Explosivos/Munições $250, Armazenamento $300),
  `LIMITES_MODIFICACAO` (empilhamentos/mods por patente), `MODIFICACOES` (mods por categoria com
  `bloqueia`), `AMPLIFICADORES` e as constantes de regra (peso padrão 0,2; amp $3000/$1000; penalidade
  −2 Vontade/empilhamento; limite Vontade×3). Tudo indexado por `ItemCategoriaEnum`/`PatenteEnum` (não
  pelas strings de UI do site). **Fórmulas** (`compras.ts`): `obterLimiteModificacoes` (= antigo
  `getPatenteMod`, **reusa `obterPatente` da m1-03** para não duplicar as faixas de Prestígio),
  `obterCustoModificacao`/`obterPesoModificacao`/`contarComprasModificacao` (custo/peso/cobranças de mod,
  com empréstimo de categoria via "Faz Parte"/"Combativo" — `obterCategoriaEmprestada`/
  `listarModificacoesDisponiveis`), `verificarConflitoModificacao` (conflitos nas duas direções a partir
  da coluna "Bloqueia"), `calcularStatItem` (= antigo `computeItemStat`; **reusa `elevarDado` da m1-04**
  para o degrau da mod Pesada, teto D10), `interpretarBonusArmazenamento`, `calcularCustoAmplificador`,
  `calcularTotaisCarrinho` (= antigo `getCmpTotals`) e o orquestrador `calcularResumoCompras`
  (= `renderCmpSummary`). Exemplos do documento replicados em teste (limite Veterano 3/9; Pesada 3D8→3D10;
  amplificador 1º=$3000 / 3 empilh.=$5000; penalidade Vontade −2). **Divergência encontrada e corrigida
  (documento vence — proibição #27), documentada em JSDoc e teste:** as **modificações de Armazenamento
  não agregam peso** (doc — "não agregam nenhum peso ao item"), mas o site antigo somava o padrão 0,2/stack;
  implementado `peso: 0` nessas mods. Sem outras divergências numéricas vs `script.js`. **Decisões de
  representação (não são divergências de regra):** `calcularStatItem` devolve um value-object estruturado
  (`StatItemDto` com `dano`/`resistencia`/`bonusArmazenamento` em notação de jogo) em vez da string com
  ícone `⚔`/`🛡`/`📦` do site — o ícone/rótulo é formatação de UI (m1-10), como o `null`→"N/A" da m1-02;
  o antigo `PATENTES_MOD` (que duplicava as faixas de Prestígio) virou `LIMITES_MODIFICACAO` indexada por
  `PatenteEnum`, com a tradução Prestígio→patente delegada a `obterPatente` (mesma disciplina anti-duplicação
  da escada de dados na m1-04); estado do carrinho (adicionar/remover, `localStorage`, export/import) fica
  para m1-10/m1-11 — aqui só se calcula a partir de um estado dado. DTOs de entrada e value-objects de saída
  co-locados em `compras.dtos.ts` (dados tipados do motor — §6.6). Barrel `compras/` preenchido; o subpath
  `@contratados-rpg/shared/regras/compras` (pré-registrado na m1-01) agora resolve conteúdo real. Validado:
  `npm run test --workspace=shared` 143/143; `lint`/`typecheck`/`build` verdes; `build` não vaza `*.spec.js`
  para `dist/`.
- **m1-04-regras-descanso** (2026-07-05): `shared/regras/descanso/` completo — as regras da aba
  `descanso` do site antigo (`contratados-calculadora/src/script.js`) extraídas e conferidas contra
  `docs/core/sistema-v4.1.0.md` — "Descanso" (30 testes novos; workspace shared 109/109 verde).
  **Dados** (`descanso.dados.ts`): `ESCADA_DADOS` (escada de tipos de dado `[3,4,6,8,10,12,20]`),
  `DADOS_DESCANSO` (keyed por `TipoDescansoEnum` — Curto 1D4/—, Médio 1D6/1D4, Longo 1D8/1D6),
  `QUALIDADE_MOD` (Insalubre −1 / Adequado 0 / Confortável +1) e `REFEICAO_MOD` (+1). **Escada de
  dados** (`dado.ts`): `ajustarDado` (move na escada com trava nos dois extremos = antigo `tipoDado`),
  `elevarDado` (sobe com teto = antigo `_upgradeDie`, primitiva **compartilhada** que a aba compras
  m1-05 reusa para o dado de dano) e `descreverDado` (notação `"D8"`/`"—"` = antigo `descDado`).
  **Fórmulas** (`descanso.ts`): `calcularDescanso` (faixa mín/média/máx de Energia = Destreza dados e
  Vida = Vigor dados, fórmula `ATRIBUTO dados + Nível×2`, Curto sem Vida, interrupção = `⌊valor÷2⌋` =
  antigo `calcDescanso`), `interpretarDadosExtras` (parse puro de `NdM`/bônus fixo, sem rolar =
  `parseExtraDice` menos a rolagem), `calcularResultadoDescanso` (total a partir de valores **já
  rolados**, puro e determinístico = núcleo de `buildResult`) e `rolarDados` (utilidade de rolagem
  explícita — a única brecha a `Math.random` no motor, §6.6). O documento foi replicado em teste
  (Nível 3, Destreza 4, Curto insalubre → **4D3+6** de Energia — dado D4 reduzido a D3 pelo ambiente
  insalubre, confirmando o degrau D3 da escada). **Decisões de representação (não são divergências de
  regra):** parse e rolagem foram **separados** (o antigo `parseExtraDice` já rolava dentro; aqui o
  parse é puro e a rolagem fica em `rolarDados`) para manter `regras/` determinístico e testável — o
  `Math.random` do site antigo era testável só por faixa, e agora só `rolarDados` o usa (testado por
  limites, não por valor); `descreverDado(0)` devolve `"—"` (o ramo `faces === 0 → "0"` do site era
  código morto — o `if (!faces)` já capturava o 0), preservado por paridade; `media` é exposta (fórmula
  `enMed` que o site calculava mas não exibia) além do mín/máx; a escada `ESCADA_DADOS` vive no domínio
  descanso (por decisão da spec) como primitiva compartilhada — compras (m1-05) importará
  `elevarDado`/`ESCADA_DADOS` daqui, evitando duplicar a escada. DTOs de entrada
  (`<Conceito>CalcularDto`/`<Conceito>InterpretarDto`) e value-objects de saída co-locados em
  `descanso.dtos.ts` (dados tipados do motor — §6.6). Barrel `descanso/` preenchido; o subpath
  `@contratados-rpg/shared/regras/descanso` (pré-registrado na m1-01) agora resolve conteúdo real.
  Validado: `npm run test --workspace=shared` 109/109; `lint`/`typecheck`/`build` verdes; `build` não
  vaza `*.spec.js` para `dist/`.
- **m1-03-regras-dt-novo-agente-patente** (2026-07-05): três domínios leves de `shared/regras/`
  extraídos do site antigo (`contratados-calculadora/src/script.js`) e conferidos contra
  `docs/core/sistema-v4.1.0.md` (22 testes novos; workspace shared 79/79 verde). **`regras/dt/`**:
  `calcularDtAtributo` = `10 + Nível + Atributo×2` (doc "DTs de Atributos"; sem divergência vs
  `calcDT`). **`regras/patente/`**: `obterPatente({prestigio})` (faixa de `PATENTES` da m1-01; a
  última patente cobre 66+ via `prestigioMaximo` infinito) e `calcularPatente` (recorte da aba =
  `{patenteAtual, tabela}`). **`regras/novo-agente/`**: `calcularNivelInicial`
  (`max(0, round(médiaNível) − 1)`; `Math.round` arredonda 0,5 para cima = regra do doc para médias
  não-negativas), `calcularPrestigioInicial` (dedução `⌊média÷divisor⌋` e piso na patente do grupo —
  ou uma abaixo quando o motivo permite), `calcularBonusMonetario`
  (`Prestígio × (500 × multiplicador)`), e o orquestrador `calcularNovoAgente`. Todos os exemplos
  numéricos do documento replicados em teste (Morte ÷7 → 24; Aposentadoria ÷10 → 26; Contido/Exterminado
  sucessor convencional ÷5 → 24 e sucessor Experimento ÷3 → 20; bônus 24×(500×3)=36.000). **Novo enum
  de conteúdo de jogo** `MotivoEntradaAgenteEnum` em `shared/src/enums/` (input da calculadora, não é
  JSONB `ficha.dados` — §10.3; análogo a `TipoDescansoEnum`): 6 motivos que mapeiam os divisores do
  documento (o site antigo os chamava "Experimento/Contido → Regular/Experimento"). **Decisões de
  representação (não são divergências de regra):** os divisores ÷5 (sucessor convencional) e ÷3
  (sucessor Experimento) do documento vêm do capítulo "Aposentadoria" > "Contido ou Exterminado" — o
  documento defere esses valores àquele capítulo; a flag `recebeAmaldicoadoPeloPassado` é verdadeira só
  para os motivos de Contenção/Extermínio (doc + fidelidade ao site); `obterPatente` preserva o fallback
  do site (`find(...) ?? última patente`) para Prestígio fora do domínio (negativo), caminho não esperado
  — Prestígio válido é sempre ≥ 0. DTOs de entrada (`<Conceito>CalcularDto`) e value-objects de saída
  co-locados em `<domínio>.dtos.ts` (dados tipados do motor — §6.6). Barrels `dt/`, `novo-agente/`,
  `patente/` preenchidos; os subpaths `@contratados-rpg/shared/regras/{dt,novo-agente,patente}`
  (pré-registrados na m1-01) agora resolvem conteúdo real. Validado: `npm run test --workspace=shared`
  79/79; `lint`/`typecheck`/`build` verdes; `build` não vaza `*.spec.js` para `dist/`.
- **m1-02-regras-agente** (2026-07-05): `shared/regras/agente/` completo — as 15 fórmulas puras da
  aba `agente` do site antigo (`calc()` + auxiliares), com testes Vitest conferidos contra
  `docs/core/sistema-v4.1.0.md` (57 testes no workspace shared, todos verdes). Organização por arquivo
  coeso: `saude.ts` (`calcularVida`/`calcularEnergia`/`calcularLimiteEnergia`), `defesa.ts`
  (`calcularDefesa` → `{defesa,esquiva,bloqueio}` | `null` civil; `calcularProficiencia`),
  `movimento.ts` (`calcularDeslocamento` em metros), `dano.ts` (`calcularDanoCorpo` tabela de
  Pontuação Corporal; `calcularDanoFurtivo` marcos 3/6/9/12/15/18), `inventario.ts`, `percepcao.ts`,
  `sanidade.ts` (`calcularSanidade` → limite de traumas `VON+1` / `null` civil + sequelas por missão
  `VON`), `habilidades.ts` (`calcularLimiteHabilidadesPorTurno` base 4 + ganhos lidos de `dadosAgente`;
  civil 3), `progressao.ts` (`calcularBeneficiosNivel` + `calcularProgressaoAcumulada` categorizando
  ganhos), `limites.ts` (`obterLimitesClasse` + `aplicarLimitesPorClasse` — contraparte pura do clamp
  de DOM do script). DTOs de entrada (`<Conceito>CalcularDto`) e value-objects de saída co-locados em
  `agente.dtos.ts` (dados tipados do motor — SYSTEM.SPEC §6.6; não são DTOs de API, ficam no `regras/`,
  não em `dtos/`). Fórmulas keyed por `ClasseEnum` (não pela string de UI). **Divergência encontrada e
  corrigida (documento vence — proibição #27), documentada em JSDoc e no teste:** o **Limite de
  Energia** era `(Vigor + Destreza) × 2` no `script.js`, mas o documento
  (`sistema-v4.1.0.md` — "Limites de Energia" e "Jogando como um Civil") define **`Destreza × 2`**
  (agente) e **`Destreza`** (civil) — implementado conforme o documento. Sem outras divergências
  numéricas vs `script.js`. **Decisões de representação (não são divergências de regra):** stats que a
  calculadora exibia como "N/A" para civil viram `null` tipado (defesa, proficiência, dano furtivo,
  limite de traumas) — o UI (m1-07) mapeia `null`→"N/A"; deslocamento/percepção retornam número em
  metros (o "m" é formatação de UI); os bounds de atributo de `aplicarLimitesPorClasse` (−5 a 7; 8 p/
  Experimento Artificial; 3 p/ Civil) são clamps de input da calculadora, não fórmula do documento
  (o que o documento fixa é Nível 0–20 / civil 0–5). Barrel `regras/agente/index.ts` preenchido; o
  subpath `@contratados-rpg/shared/regras/agente` (pré-registrado na m1-01) agora resolve conteúdo
  real. Validado: `npm run test --workspace=shared` 57/57 verde; `npm run lint`/`typecheck`/`build`
  verdes; `build` não vaza `*.spec.js` para `dist/`.
- **m1-01-regras-fundacao-enums** (2026-07-05): fundação do motor de regras no `shared/`, antes de
  qualquer fórmula de domínio ou UI — primeira task do M1. **Harness de teste configurado** no
  workspace `shared`: a spec pedia Jest, mas trocado por **Vitest** na revisão (a pedido do autor)
  para não ter dois test runners no monorepo — o `frontend` já usa Vitest desde a m0-06. `vitest`
  como devDependency, `shared/vitest.config.ts` (`test.environment: 'node'`) e script
  `test: vitest run`; specs importam `describe`/`it`/`expect` explicitamente de `'vitest'` (sem
  globals ambíguos, diferente do `frontend`, que usa `vitest/globals`). Para não vazar `*.spec.ts`
  compilado para `dist/` (consumido por `backend`/`frontend`), o script `build` passou a rodar
  contra um novo `shared/tsconfig.build.json` (estende o `tsconfig.json` base excluindo
  `src/**/*.spec.ts`), enquanto `tsconfig.json`/`typecheck` continuam cobrindo tudo — mesmo padrão já
  usado em `backend/tsconfig.build.json` (essa parte independe do runner escolhido).
  **Estrutura `regras/`**
  conforme SYSTEM.SPEC §3: `agente/`, `dt/`, `novo-agente/`, `patente/`, `descanso/`, `compras/`
  nasceram como barrels vazios (`export {}` + comentário apontando a task que os preenche —
  m1-02 a m1-05); `criatura/` fica para o M4, fora desta task. **Enums de conteúdo de jogo** em
  `shared/src/enums/` (conteúdo de JSONB `ficha.dados`, sem tabela `tipo_*` — §10.3):
  `ClasseEnum`, `PatenteEnum`, `ItemCategoriaEnum`, `TipoDescansoEnum`, `QualidadeDescansoEnum`.
  **`regras/dados/`** com `dadosAgente`/`dadosCivil` (`BeneficiosPorNivel`, mapa nível→benefícios) e
  `PATENTES` (`PatenteDados[]`, com `prestigioMaximo: Number.POSITIVE_INFINITY` na última faixa),
  migrados de `contratados-calculadora/src/script.js` e conferidos contra
  `docs/core/sistema-v4.1.0.md` (documento vence — proibição #27). **Divergências encontradas e
  corrigidas** (documentadas em JSDoc no próprio arquivo de dados): (a) `dadosAgente` níveis 5, 10,
  15, 20 — o site antigo omitia a palavra "outro" em "outra classe/**outro** arquétipo da sua
  classe"; (b) níveis 7, 14 — o site antigo omitia "sua" em "Fortificação de **sua** Personalidade";
  (c) `PatenteEnum` usa os nomes completos do documento (`FORCA_TAREFA_ESPECIAL`,
  `OPERACOES_ESPECIAIS`) em vez das abreviações do site antigo ("FT Especial", "Op. Especiais") —
  sem divergência numérica em `PATENTES` (faixas de prestígio, salário e multiplicador batem com o
  documento e com o site antigo). `shared/package.json` ganhou os subpaths `./enums`,
  `./regras/dados` e, preventivamente, um subpath por domínio ainda vazio (`./regras/agente`,
  `./regras/dt`, `./regras/novo-agente`, `./regras/patente`, `./regras/descanso`,
  `./regras/compras` — todos já apontam para os barrels `export {}` que existem em `dist/`), mesmo
  padrão de `./interfaces` da m0-03. Registrar os seis já evita que uma task futura esqueça de
  adicionar o subpath ao preencher o domínio — o `backend` resolve `exports` estritamente
  (`moduleResolution: nodenext`) e falharia silenciosamente sem sinal de CI, enquanto o `frontend`
  (path-mapping curinga no tsconfig) não notaria o esquecimento.
  **Prova de harness**: `regras/dados/patente.dados.spec.ts` (2 testes triviais sobre `PATENTES`).
  Validado: `npm run test --workspace=shared` verde (2/2); `CI=true npm run test` (raiz) roda
  shared + frontend verde (backend segue sem testes, pulado por `--if-present`); `npm run lint`
  verde nos 3 workspaces; `npm run build --workspace=shared` não gera `.spec.js` em `dist/`.
- **m0-07-deploy** (2026-07-05): deploy de produção — última task do M0. **Decisão final:
  integração nativa das plataformas, sem GitHub Actions no deploy.** (A 1ª rodada chegou a montar
  um `.github/workflows/cd.yml` com gate de CI + Render deploy hook + `wrangler pages deploy`,
  validado verde de ponta a ponta em produção; foi revertido a pedido do autor por complexidade
  desnecessária — o `cd.yml` e os secrets/variables do GitHub que o serviam foram removidos. A CI
  em PR, `m0-06`, permanece.) Estado final: **Backend → Render** via blueprint `render.yaml` (web
  service `contratados-rpg-api`, `autoDeploy: true`, build `npm install && npm run build
  --workspace=backend`, start `npm run start:prod --workspace=backend` = `node dist/main`,
  `healthCheckPath: /health`; `APP_PORTA=10000`/`APP_AMBIENTE=production`/`JWT_EXPIRACAO=8h` no
  blueprint, `DB_*`/`JWT_SECRETO`/`APP_FRONTEND_ORIGEM` como `sync:false` no dashboard). **Frontend →
  Cloudflare Pages** conectado ao Git com **branch de produção `master`** (build `npm run build
  --workspace=frontend`, output `frontend/dist/frontend/browser`). **Ligação cross-origin:**
  `backend/src/main.ts` chama `app.enableCors({ origin: frontendOrigem })` lendo `APP_FRONTEND_ORIGEM`
  do `ConfigService` (§10.6); `frontend/src/environments/` (`environment.ts` dev `apiBase:''` →
  relativo pelo proxy; `environment.production.ts` com `apiBase` fixo
  `https://contratados-rpg-api.onrender.com` — não é segredo) via `fileReplacements` no `angular.json`;
  `HealthService.verificar()` usa `` `${environment.apiBase}/health` ``; `frontend/public/_redirects`
  (`/* /index.html 200`) dá o fallback de SPA. Runbook em `docs/DEPLOY.md` (no modelo do Project 2.0 do
  autor). Validado: backend `/health` em produção no Render responde `200 {"sucesso":true,...}`;
  `npm run build` verde em backend e frontend. **Gotchas aprendidos:** (a) `APP_FRONTEND_ORIGEM` é
  lida no boot (`obterConfiguracaoAplicacao`) → o backend não sobe sem ela; (b) na Cloudflare, a
  branch de produção precisa ser `master` (default é `main`), senão o deploy vira preview e a URL
  principal fica no placeholder; (c) SSL e migrations do Supabase são M2 (no M0 nada consulta o banco).
- **m0-06-ci-lint-teste** (2026-07-05): integração contínua ativa via GitHub Actions.
  `.github/workflows/ci.yml` dispara em todo `pull_request` (+ `workflow_dispatch` manual),
  em `ubuntu-latest` com Node 22 (`actions/setup-node` + cache npm): `npm install` (o
  `postinstall` compila o shared), depois `npm run lint` e `npm run test`. Lint agora
  configurado nos **três** workspaces (deliverable 2): o backend já tinha `eslint.config.mjs`
  (typescript-eslint `recommendedTypeChecked`); **shared** ganhou `eslint.config.mjs` espelhando
  o do backend (CommonJS, `globals.node`) + devDeps (`eslint`, `typescript-eslint`, `@eslint/js`,
  `globals`); **frontend** ganhou `eslint.config.mjs` com `angular-eslint` (flat config: TS
  `recommended` + `angular.configs.tsRecommended` com regras de seletor prefixo `app`; HTML
  `templateRecommended` + `templateAccessibility`) + devDeps (`angular-eslint`,
  `typescript-eslint`, `@eslint/js`, `eslint`). O `lint` do backend perdeu o `--fix` (rodar com
  `--fix` na CI mascararia violações auto-corrigíveis, ferindo o critério "sem etapa mascarando
  falha"); cada workspace tem `lint` (checagem, CI-safe) e `lint:fix` (dev). Scripts agregados na
  raiz: `lint` = `npm run lint --workspaces` (roda os 3; qualquer falha → exit ≠ 0), `test` =
  `npm run test --workspaces --if-present` (só o frontend tem teste por ora — shared/backend são
  pulados, não mascarados). Validado: `npm run lint` verde nos 3; `CI=true npm run test` roda o
  vitest do frontend uma vez (sem watch) → 2/2 verde; sonda de erro de lint confirmou `exit 1`
  agregado na raiz (pipeline quebra). Testes de regra de jogo (`shared/regras`) nascem no M1;
  deploy é a `m0-07`.
- **m0-05-frontend-shell** (2026-07-05): shell mínimo do frontend e prova de integração
  ponta a ponta com o backend. `shared/layout/layout.component.ts` (standalone `Layout`,
  seletor `app-layout`) é o shell: topbar institucional, indicador de carregamento global
  (lê `LoadingService.isLoading()`), `<p-toast/>` e o `<router-outlet/>`; o root `App` só
  renderiza `<app-layout/>`. `core/interceptors/` traz dois interceptors funcionais
  registrados em `app.config.ts` via `withInterceptors`: `loading.interceptor` (conta
  requisições em voo no `LoadingService` — signal `isLoading`) e `error-handler.interceptor`
  (exibe toast PrimeNG com a `StandardResponse.mensagem` do backend e reencaminha o erro).
  `core/services/health.service.ts` (`HealthService.verificar()`) consome `GET /health`
  tipado como `StandardResponse<{ status: string }>` (sem DTO de negócio — payload inline,
  conforme m0-04). `pages/home/home.page.ts` (standalone `Home`, lazy via `loadComponent`
  na rota `''`) chama o health no `ngOnInit`, guarda o resultado em signals e exibe o status
  (`ok`) + mensagem — prova visual do pipeline HTTP frontend → backend → `StandardResponse`.
  `proxy.conf.json` encaminha `/health` para `http://localhost:3100` e foi ligado ao
  `serve.options.proxyConfig` do `angular.json` (dev-server em `:4300`). PrimeNG configurado
  com `providePrimeNG` + `MessageService` no root; **sem `@angular/animations`** — o PrimeNG 21
  usa animações CSS próprias, então `provideAnimationsAsync()` foi descartado (o pacote nem
  está instalado). **Tema "Terminal de Contenção" aplicado** a partir do handoff em
  `docs/design/` (revisão pós-implementação): `src/styles/tema/` recebeu `_tokens.scss`
  (CSS custom properties — fonte da verdade em runtime), `_base.scss` (reset, corpo dark,
  grid de textura) e `contencao.preset.ts` (preset PrimeNG base Aura; único ajuste ao repo:
  imports `@primeng/themes` → `@primeuix/themes`). `styles.scss` importa tokens + base nessa
  ordem; `index.html` é dark-first (`<html lang="pt-BR" class="dark">`) e carrega IBM Plex
  Mono/Sans via `<link>` do Google Fonts (Opção B do handoff — `@fontsource` fica p/ quando
  quiserem offline). `app.config.ts` usa `providePrimeNG({ theme: { preset: ContencaoPreset,
  options: { darkModeSelector: '.dark' } } })`. Topbar e home consomem os tokens (`--surface`,
  `--border`, `--accent`, `--font-mono`, `--positive`…) e a home reusa o padrão canônico de
  card + cabeçalho de seção (índice em badge mono + título UPPERCASE + régua) de
  `_componentes.scss`. Tailwind ainda não está instalado, então utilitários Tailwind ficam
  para depois — SCSS + BEM + tokens cobrem o shell. `app.spec.ts` atualizado (provê
  `provideRouter([])` + `MessageService`; verifica a marca da topbar). Validado:
  `npm run build --workspace=frontend` e `--workspace=backend` passam; `npm run test
  --workspace=frontend` 2/2 verde; com backend (`node dist/main.js`) + `frontend:dev` no ar,
  `curl http://localhost:4300/health` (via proxy) retorna
  `200 {"sucesso":true,"dados":{"status":"ok"},"mensagem":"Operação realizada com sucesso."}`
  e `:4300/` serve o `index.html` do SPA.
- **m0-04-healthcheck-endpoint** (2026-07-05): primeiro endpoint real da API.
  `backend/src/core/decorators/public.decorator.ts` traz o decorator `@Public()` (grava o
  metadado `IS_PUBLIC_KEY = 'isPublic'` via `SetMetadata`) com barrel `index.ts` no padrão
  da pasta `exceptions/` — sem efeito de bloqueio ainda, pois o guard global que o
  interpreta só nasce no M2 (nenhuma rota está protegida). `backend/src/health/health.controller.ts`
  expõe `GET /health` (`@Public()`, método `verificar()`), sem service/repository próprios
  (não há regra de negócio nem persistência — só confirma que o processo Nest responde);
  retorna o literal `{ status: 'ok' }`, que o `response-format.interceptor` da m0-03
  embrulha em `StandardResponse<T>`. Health é conceito operacional genérico → sem DTO de
  negócio no `shared/` (payload inline). `HealthController` registrado direto no array
  `controllers` do `AppModule` (não há módulo de negócio para ele). `npm run build --workspace=backend`
  passa; endpoint validado de ponta a ponta com `node dist/main.js` + `curl` →
  `200 {"sucesso":true,"dados":{"status":"ok"},"mensagem":"Operação realizada com sucesso."}`.
- **m0-03-backend-core** (2026-07-04): `core/` do backend completo.
  `shared/src/interfaces/` ganhou `StandardResponse<TData>` (interface — envelope de
  sucesso/erro) e `PaginatedResult<TItem>` (classe — herdada por DTOs de listagem), com
  subpath `@contratados-rpg/shared/interfaces` adicionado ao `exports` do
  `shared/package.json`. Em `backend/src/core/`: `BaseEntity` (campos de infraestrutura);
  `base/base.repository.ts` com `executarConsulta<T>()`/`executarComando()`/
  `executarSoftDelete(id)`/`executarConsultaPaginada<T>()` (SQL bruto via `knex.raw`,
  paginação com `allRows` conforme §10.5 — nota: `ordenarPor` chega como identificador de
  coluna interpolado diretamente na query, então a service chamadora deve validá-lo contra
  uma lista permitida antes de repassar, já que identificador não aceita parâmetro
  nomeado); `exceptions/` com `BusinessException` (400), `ResourceNotFoundException` (404)
  e `UnauthorizedAccessException` (403); `filters/global-exception.filter.ts` e
  `interceptors/response-format.interceptor.ts`, ambos registrados globalmente via
  `APP_FILTER`/`APP_INTERCEPTOR` em `app.module.ts`. Novo `backend/src/config/` expõe
  `ConfigService` (carrega o `.env` da raiz via `dotenv` — movido de devDependencies para
  dependencies do `backend/package.json` — e expõe getters tipados
  `obterConfiguracaoBanco()`/`obterConfiguracaoJwt()`/`obterConfiguracaoAplicacao()`; nenhum
  `process.env` direto fora dele) num `ConfigModule` global. Novo
  `backend/src/database/database.provider.ts`/`database.module.ts` registra a conexão Knex
  de runtime (token `KNEX_CONNECTION`) lendo a config via `ConfigService` — o `knexfile.ts`
  continua a única exceção autorizada a ler `process.env` direto, por ser ferramenta de CLI
  fora do ciclo do Nest. `main.ts` agora lê a porta via `ConfigService` em vez do antigo
  placeholder `process.env.PORT`. Extensibilidade do `BaseRepository` validada com um
  repositório descartável (compilou e foi removido — nenhum módulo de negócio o reaproveita
  ainda, já que a `m0-04` não usa repository). `npm run build` passa em `shared` e
  `backend`; app sobe com `node dist/main.js` sem erros de DI mesmo sem o Postgres local
  ativo (Knex conecta sob demanda).
- **m0-02-docker-banco** (2026-07-04): PostgreSQL 16 local via `docker-compose.yml` na raiz
  (variáveis interpoladas do `.env`, ver `.env.example` / SYSTEM.SPEC §10.6) e Knex
  configurado em `backend/knexfile.ts` (client `pg`). Scripts de banco funcionais: `db:up` /
  `db:down` na raiz e `db:migrate` / `db:rollback --workspace=backend`. Migrations seguem a
  convenção §10.7: arquivos `.sql` puros em `backend/src/database/migrations/`
  (`NNNN - Nome descritivo.sql`, seções `-- UP` / `-- DOWN`), carregados por um
  `SqlMigrationSource` customizado (`backend/src/database/sql-migration-source.ts`) — a
  tabela de controle continua sendo a `knex_migrations` do Knex, que abre uma transação por
  migration (salvo `-- NO TRANSACTION`). A migration `0001 - Função fn_set_updated_date.sql`
  cria a function genérica `fn_set_updated_date()` (function de trigger reutilizável para
  manter `updated_date`; os triggers `trg_<tabela>_updated_date` nascem junto de cada tabela,
  M2+). Nenhuma tabela de negócio criada. O knexfile lê `process.env` por ser ferramenta de
  CLI fora do NestJS — o código da aplicação usará `ConfigService` (m0-03). O knexfile e o
  `SqlMigrationSource` rodam via `ts-node` (bloco `ts-node` no `backend/tsconfig.json`,
  compilando como CommonJS); o registro do source no runtime (`database.provider.ts`) vem no
  m0-03.
- **m0-01-workspaces-npm** (2026-07-04): monorepo npm workspaces com `shared/`, `backend/`
  (NestJS 11) e `frontend/` (Angular 21 + PrimeNG 21). `npm install` na raiz instala os três
  workspaces; `postinstall` compila `shared` para `dist/`. Import de `@contratados-rpg/shared`
  validado nos dois lados — backend via referência de workspace (dist), frontend via path
  mapping do `tsconfig` para a fonte. `npm run build` passa em backend e frontend.
  Constante trivial `SHARED_PACKAGE_NAME` valida a ligação (será substituída por conteúdo
  real nas tasks seguintes).

## Decisões Pendentes

- **Identidade visual do site** — **definida**: tema "Terminal de Contenção" (dark-first,
  IBM Plex), com handoff completo em `docs/design/` (tokens, base, preset PrimeNG, exemplos,
  trecho Tailwind). Aplicado ao shell na m0-05. Resta para o M1: sistema de troca de tema em
  runtime (presets + color picker com trava de contraste). A instalação/merge do Tailwind foi **concluída
  na m1-06** (config apontando para os tokens; ver "Implementado"). Nota: na 1ª rodada da m0-05 o
  `docs/design/` passou batido (não estava no Session Start) e o
  shell nasceu com preset Aura base + hex hardcoded, corrigido na revisão. Documentação já
  ajustada para não repetir: `CLAUDE.md` agora manda ler `docs/design/DESIGN.md` antes de UI e
  ganhou a seção "Visual Design Source of Truth"; SYSTEM.SPEC §3/§8/§15 e a proibição #29
  (nunca hardcodar cor/fonte) + CONVENTIONS (Estilos e tabela) reforçam o consumo dos tokens.

## Referências

- Design original (brainstorming de 2026-07-01) no repo antigo:
  `contratados-calculadora/docs/superpowers/specs/2026-07-01-contratados-rpg-design.md`
- Código a migrar no M1: `contratados-calculadora/src/script.js` (regras) — o repo antigo
  permanece disponível até o M1 ser concluído, e então será arquivado.
