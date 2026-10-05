# m4-16-ficha-npc-usabilidade-edicao.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, continuação da revisão do NPC
> (`m4-12`…`m4-15`, em `done/`). Pedido direto do autor (2026-10-05): *"quando você clica no
> editar, ele não tem um cancelar… ele só tem um editar e é isso. Então temos que rever toda a
> usabilidade desse cara."* Retoma o que a `m4-14` deixou de fora de propósito — o **modelo e o
> fluxo de edição** (decisão 1 da `m4-14`) — agora a pedido do autor.
>
> **Ordem das specs desta frente:** `m4-16` (esta) → `m4-17`
> (`m4-17-ficha-npc-coluna-identidade-compacta.spec.md`) → `m4-18`
> (`m4-18-ficha-npc-atributos-como-jogador.spec.md`) → `m4-19`
> (`m4-19-npc-testes-de-atributo-regra-e-rolagem.spec.md`). As seguintes **consomem o padrão de
> edição definido aqui**; por isso esta vem primeiro.
>
> **Decisão do autor (2026-10-05):** *"a gente tem que seguir o mesmo que a gente tem lá na
> criatura e no jogador. Que é a questão de editar blocos. Eu edito uma coisa de cada vez,
> usando os inputs — é um texto que, quando clicado, se torna um input… sobre a edição do NPC,
> eu sigo a sua opinião de salvar e cancelar por blocos."* Está **resolvida** a escolha de
> modelo: **salvar por bloco**, sem rascunho acumulado, **um bloco/valor em edição por vez**,
> com os mesmos dois mecanismos que Criatura e Jogador já usam (item 2).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Análogos aprovados obrigatórios** (registrar no fecho qual serviu para quê):
> - a edição do card **Atributos da ficha de Jogador**
>   (`componentes/ficha-visualizacao/ficha-visualizacao.component.html`, bloco `#blocoAtributos`,
>   `editandoAtributos()`): lápis no cabeçalho **some** ao editar e **Salvar + Cancelar**
>   (`app-botao`) aparecem logo abaixo do cabeçalho do próprio card;
> - a edição do card **Atributos da ficha de Criatura**
>   (`componentes/criatura-visualizacao/criatura-visualizacao.component.html`,
>   `atributosEmEdicao()`): `criatura__atributos-acoes` com Salvar/Cancelar `tamanho="pequeno"`
>   e avisos de validação **dentro** do card; a classificação usa o lápis que vira ✕
>   ("Cancelar edição") — `criatura__lapis--ativo`.
> Mapear shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e
> comportamento responsivo — não só "usar os tokens".

## Objetivo

Hoje, ao clicar no lápis de um bloco da ficha de NPC, os campos aparecem no lugar, mas o
**Cancelar** e o **Salvar alterações** estão num cartão de rascunho (`ficha-pagina__rascunho`)
colocado em `visualizar-npc.page.html` **depois** das duas colunas — longe do bloco editado e,
no mobile, no fim da página inteira. O lápis continua o mesmo ("Editar") e não oferece saída.
Esta task faz toda edição da ficha de NPC ter **entrada, saída e confirmação no próprio bloco**,
com o mesmo desenho que Jogador e Criatura já usam, e revisa a usabilidade ponta a ponta
(foco, teclado, erro, estado de salvando, saída da página).

## Decisões do autor (já tomadas — não perguntar de novo)

1. **Modelo: salvar por bloco, um de cada vez.** O rascunho acumulado entre grupos
   (`mesclarDocumento`, "Salvar confirma todos os grupos editados") **sai**. Cada edição
   termina — salvando ou cancelando — antes de outra começar. O PUT continua sendo da ficha
   inteira (`alterarFichaNpc`), com o `dados` completo e a validação de `shared/regras/npc`; só
   muda **quando** e **o que** o formulário monta.
2. **Mesmos dois mecanismos de Criatura e Jogador:**
   - **Valor avulso** (nome, nível, Vida/Energia atuais e máximas, Defesa etc.): o **texto é um
     `app-valor-editavel`** — clica, vira input no lugar, **Enter confirma e salva**, **Esc
     cancela**, perder o foco cancela (é o contrato do primitivo; ver seu spec). Sem
     Salvar/Cancelar visíveis: a confirmação **é** o Enter.
   - **Bloco de vários campos** (Atributos, Conduta, Habilidades, Sequelas/Traumas e qualquer
     grupo em que hoje a edição abre vários campos juntos): **lápis** no cabeçalho → o lápis some
     e **Salvar + Cancelar** (`app-botao`) aparecem sob o cabeçalho do próprio bloco, como no card
     Atributos do Jogador/Criatura.
   A **classificação de cada campo do NPC** em "avulso" ou "bloco" segue o **análogo mais
   próximo** (Criatura para Identidade/Recursos, Jogador para Atributos) e é registrada na
   tabela da auditoria (item 1) — **não inventar** um terceiro mecanismo.

## Entregáveis

### 1. Auditoria de usabilidade (primeiro passo, antes de editar)

Com o app real rodando (**pedir autorização ao autor antes de subir o stack**; ver `verify`),
percorrer **todo ponto de edição** da ficha de NPC em `1920×1080` e `360×800` e registrar uma
**tabela** no fecho: *ponto de entrada → como cancela → como salva → onde o botão aparece na tela
→ foco depois de entrar/sair → onde o erro de validação aparece → **mecanismo-alvo** (valor avulso
com `app-valor-editavel` ou bloco com lápis + Salvar/Cancelar) e o análogo que o justifica*. Pontos: Identidade (nome,
função, categoria, nível, cooperação, cor), Recursos (Vida/Defesa/Bloquear/Esquivar/Energia/
Recarga), Cooperação, Atributos, Conduta (3 campos), Habilidades (adicionar/editar/remover item),
Sequelas/Traumas, retrato (escolher/enquadrar/remover — já imediato, fora do rascunho), ajuste
rápido de Vida/Energia (`app-barra-recurso` editável, imediato), Anotações (painel flutuante, já
tem Salvar/Cancelar próprios). A tabela é o contrato dos itens 2–5: **não implementar nada que
não esteja nela**. Hipóteses já vistas no código, a confirmar ao vivo:

- Salvar/Cancelar fora da viewport do bloco editado (cartão no fim da página).
- Lápis permanece igual durante a edição; não há saída óbvia no bloco.
- Dois lápis ("Editar identidade" e "Alterar Cooperação") abrem o **mesmo** grupo `identidade`
  — o autor não sabe que editar um abre os campos do outro.
- Erro de validação (`edicao.erro()`, `formulario.erroFormulario()`, `edicao.violacoes()`) sai
  em `ficha-pagina__erro`/`ficha-pagina__pendencias`, fora do bloco.
- Habilidades/Sequelas/Traumas: "Concluir" por item **e** Salvar global — dois níveis de
  confirmação.
- Sem foco gerenciado, sem Esc para cancelar, sem aviso de qual bloco está editando.

### 2. Os dois mecanismos de edição, aplicados ao NPC

Aplicar a classificação da tabela do item 1:

- **Valor avulso → `app-valor-editavel`.** O texto exibido vira o campo (`<input>`/`<select>`
  projetado, tipo conforme o dado) ao clicar; Enter confirma e **persiste só aquele valor**
  (merge no `dados` e PUT, no estilo de `confirmarCampoIdentidade` da Criatura); Esc/blur
  cancela e restaura o valor. O NPC já usa o primitivo no nome e nos ajustes rápidos de
  Vida/Energia — estender ao resto do que for avulso (nível, categoria, função, Defesa/
  Bloquear/Esquivar, máximos de Vida/Energia, recarga) **na mesma receita** dos análogos. Uso
  completo da API (`[bloco]`, `[alinhamento]`, `[tooltip]`, `[desabilitado]` enquanto salva).
- **Bloco → lápis + Salvar/Cancelar no próprio bloco.** Com o bloco fora de edição, lápis
  (`app-botao-icone`, `app-icone nome="editar"`, `appTooltip`); em edição o lápis **some** e,
  sob o cabeçalho do **próprio bloco**, aparece a linha de ações com **Salvar** (`app-botao
  variante="primario"`) e **Cancelar** (`app-botao variante="secundario"`), `tamanho="pequeno"`
  no desktop e alvo ≥ 44 px no mobile, na mesma ordem e classe de receita do análogo. Salvar:
  `[carregando]` + `[disabled]` enquanto `edicao.salvando()` ou com violação conhecida;
  Cancelar: desabilitado só enquanto salvando. Sem botão nativo estilizado à mão.
- **Um por vez.** Enquanto um valor avulso ou um bloco está em edição, os demais gatilhos
  (outros lápis, outros valores clicáveis) ficam desabilitados com `appTooltip` "Conclua ou
  cancele a edição de <nome>" — nunca duas edições abertas, nunca estado acumulado.
- **Erro dentro do que se edita.** Violações de `validarFichaNpc`, `edicao.erro()` e
  `formulario.erroFormulario()` aparecem **no bloco/valor editado**, logo abaixo da linha de
  ações ou do campo (como `criatura__atributos-aviso`), com `role="alert"`. O
  `ficha-pagina__erro` global fica só para falha de carga/rede sem bloco associado.
- **Identidade × Cooperação sem grupo oculto.** Hoje "Editar identidade" e "Alterar Cooperação"
  abrem o mesmo grupo `identidade`. Cada gatilho passa a abrir **só o que o rótulo promete**
  (Cooperação como valor avulso/controle próprio — a forma final do controle é da `m4-17`, que
  a transforma em barra editável); nenhum lápis abre campos de outro bloco.
- **Habilidades, Sequelas e Traumas.** Seguem o análogo `criatura-habilidade-lista`: o lápis do
  cabeçalho da lista liga o modo de edição **da lista**, com Salvar/Cancelar no cabeçalho
  da lista; editar/remover por item **somente** depois do lápis (memória do projeto "botões
  sob demanda"); o "Concluir" por item deixa de ser um segundo nível de confirmação.
- **Remoções.** `ficha-pagina__rascunho`, `ficha-pagina__rascunho-acoes` e o texto "Salvar
  confirma todos os grupos editados" saem da página (e o SCSS morto). O rascunho global do
  `FichaEdicaoNpcService`/`NpcEdicaoFormulario` é substituído por um estado **por edição**
  (qual valor/bloco está aberto + seu rascunho local); `visualizar-npc.page.ts` perde o
  `salvar()` global e `textoPersistencia` fica só com "Salvando…/Salvo/Falha ao salvar" no
  cabeçalho.

### 3. Teclado, foco e acessibilidade

- Ao entrar em edição, o foco vai para o primeiro campo (valor avulso: o input já recebe foco
  e seleção pelo primitivo); ao salvar ou cancelar, volta ao lápis do bloco/ao texto do valor (ou ao próprio bloco, se o lápis sumiu — usar `tabindex="-1"` no cabeçalho).
- **Valor avulso:** Enter confirma, Esc cancela, blur cancela (contrato do `app-valor-editavel`).
  **Bloco:** **Esc** cancela (mesma ação do botão), exceto com menu/seleção aberto; **Ctrl/Cmd+
  Enter** salva; **Enter** em campo de uma linha dentro de bloco não salva sozinho, a menos que o
  análogo já faça diferente — nesse caso seguir o análogo.
- O bloco em edição ganha estado visual de "editando" (borda/realce de acento já usados por
  `criatura__lapis--ativo` ou pelo card de Atributos em edição — **sem inventar token**) e
  `aria-busy` enquanto salva; o resumo para leitor de tela anuncia "Editando <bloco>".
- Contraste, foco visível e alvos de toque corretos nos dois viewports.

### 4. Saída da página e perda de dados

- Manter o guard de saída existente (`canDeactivate`, `imagemPendente`) — agora disparado
  quando **há valor ou bloco em edição com alteração não salva**, não mais um rascunho global.
- Cancelar um bloco **sem alterações** não pergunta nada; cancelar com alterações descarta sem
  confirmação (padrão Jogador/Criatura) — **a menos que o autor peça confirmação**; registrar.
- Falha de salvamento mantém o bloco aberto com o erro dentro dele e os valores digitados
  preservados (nunca fechar o bloco nem perder o texto).

### 5. Modo leitor, concorrência e estados raros

- Modo leitor (`gerenciavel() === false`): nenhum lápis, nenhuma linha de ações, nada de foco
  forçado — como hoje.
- Revogação de acesso, exclusão da ficha por outro mestre e reconexão **durante** a edição:
  comportamento atual preservado (testes existentes de reconexão/revogação continuam
  passando); se o bloco em edição perder a ficha, sair do modo de edição com mensagem no bloco.
- Dois valores/blocos nunca editam ao mesmo tempo (decisão 1 do autor).

## Critérios de Aceite

- Em `1920×1080` e `360×800`, **todo** bloco editável mostra Salvar e Cancelar **dentro do
  próprio bloco**, visíveis sem rolar além do bloco; nenhum Salvar/Cancelar fica no fim da
  página e o texto *"Salvar confirma todos os grupos editados"* não existe mais.
- Tabela da auditoria (item 1) no fecho com cada linha marcada como resolvida.
- Comparação lado a lado com o card de Atributos de Jogador/Criatura em edição: mesmo desenho
  de ações, mesma densidade, mesmos controles; **não parece HTML genérico**.
- Valores avulsos editam por clique → input → Enter/Esc (como Criatura/Jogador); Esc/Ctrl+Enter/
  foco funcionam e estão cobertos por teste; erro de validação aparece no bloco/valor editado.
- Nenhuma mudança de conteúdo, regra, fórmula, permissão, DTO, endpoint, rolagem ou tempo real;
  os mesmos campos editam e persistem como antes (conferir `alterarFichaNpc` por teste).
- Nenhum SCSS/template morto (`ficha-pagina__rascunho*` se removidos); sem hardcode; sem overflow.

## Verificação exigida

- **Testes:** `npc-edicao-formulario.service.spec.ts`, `ficha-edicao-npc.service.spec.ts`,
  `npc-visualizacao.component.spec.ts` e `visualizar-npc.page.spec.ts` ajustados ao novo fluxo,
  **sem enfraquecer** as asserções de comportamento (edição por bloco, ajuste de Vida/Energia,
  "Confirmar socorro", modo leitor, salvar/cancelar, reconexão, revogação, guard de saída).
  Novos testes: Salvar/Cancelar dentro do bloco, lápis some em edição, erro dentro do bloco,
  Esc cancela, foco volta ao lápis, bloqueio de segunda edição, valor avulso salva só aquele campo
  no Enter, falha de salvamento preserva valores. Rodar o spec focado a cada passo e a suíte completa + lint no fecho.
- **Gate visual obrigatório** (`AGENTS.md`, skills `verify` e `design-fidelity`), em
  `1920×1080` **e** `360×800`, percorrendo cada bloco em edição com: valor válido, valor
  inválido (violação), salvando (atraso simulado de rede), falha de rede, cancelar com e sem
  alteração; NPC combatente e Civil (sem Energia); modo mestre e modo leitor; painel de
  histórico aberto; teclado (Tab, Esc, Ctrl+Enter). O agente principal inspeciona pessoalmente.
- Dados de teste por soft delete ao fim; nenhuma ficha real tocada.

## Fora de Escopo

- Qualquer mudança visual de **layout** da coluna de identidade (`m4-17`) ou dos atributos
  (`m4-18`) — esta task só muda **como se edita**, não **como cada bloco se vê em leitura**.
- Itens da coluna de ações, conteúdo/regras do NPC, rolagens, tempo real, o painel de
  Anotações (já tem Salvar/Cancelar próprios), o upload/enquadramento do retrato (já
  imediato).
- Backend, `shared/regras/npc`, DTOs, rotas e permissões.
- Ficha de Criatura e de Jogador (são o análogo, não o alvo).
- Achado fora do escopo vira `PROBLEMS.md`/`IDEAS.md` e aviso ao autor, sem corrigir aqui.

## Dependências

- `m4-14` (`done`) — a ficha de NPC no casco atual; `m4-15`, `m4-13`, `m4-12` (`done`).
- Fontes: `docs/design/DESIGN.md`, `docs/design/tema/`, `docs/SYSTEM.SPEC.md`,
  `docs/CONVENTIONS.md`, e a memória do projeto "botões de editar/remover sob demanda" e
  "edição no próprio lugar".
- Antecede `m4-17` e `m4-18`.

## Riscos e Mitigação

- **Mexer no modelo de edição quebra a reconexão/revogação.** Há testes de reconexão e revogação
  em `visualizar-npc.page.spec.ts`; reutilizá-los como rede de segurança e **não** enfraquecer.
- **Salvar por valor/bloco com PUT da ficha inteira** pode sobrescrever alteração concorrente de outro
  bloco feita por outro cliente. Hoje já é assim (rascunho da ficha inteira); manter a mesma
  garantia e **registrar**, não resolver aqui. Se aparecer, `PROBLEMS.md`.
- **Atalho tentador:** esconder o cartão de rascunho por CSS ou duplicar botões Salvar/Cancelar
  em cada template. Extrair um subcomponente de ações de bloco (ou usar um já existente em
  `shared/ui/` se houver) — se `shared/ui/` não cobrir (ex.: uma "barra de ações de edição"
  compartilhada), **parar e perguntar ao autor** antes de criar ou ampliar primitivo.
- `npc-visualizacao.component.html` já tem ~490 linhas: **extrair** o bloco de ações de edição e,
  se necessário, os blocos Identidade/Recursos em subcomponentes antes de acrescentar lógica;
  registrar no fecho a razão se não extrair.
