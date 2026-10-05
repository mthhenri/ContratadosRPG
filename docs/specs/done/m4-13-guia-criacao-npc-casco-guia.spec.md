# m4-13-guia-criacao-npc-casco-guia.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, revisão do trabalho de NPC.
> Pedido direto do autor (2026-10-04): *"sobre a aparência do Guia de criação tem que assimilar
> mais ao que temos no Jogador/Criatura"*. **Reaparelha a apresentação** do guia entregue na
> `m4-08` (`docs/specs/done/m4-08-frontend-criacao-npc.spec.md`); contrato, regras, validações,
> passos e envio **não mudam**.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Análogos aprovados obrigatórios:** o guia de criatura
> (`paginas/criar-criatura/criar-criatura.page.{html,scss}`) e o guia de jogador
> (`paginas/criar/criar.page.{html,scss}`), que compartilham o mesmo vocabulário `guia__*`.
> Mapear shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e
> comportamento responsivo deles — não só "usar os tokens". O NPC é o único dos três guias que
> hoje tem casco próprio (`npc-guia__*`).

## Objetivo

Trocar o casco do guia de NPC (`criar-npc.page.html`/`.scss` e o `npc-etapa.scss`) pelo
vocabulário e pela densidade dos guias de Jogador e Criatura, de modo que os três pareçam o
mesmo produto. O conteúdo dos cinco passos — Identidade, Atributos e recursos, Habilidades,
Conduta e sanidade, Revisão — e as regras que eles aplicam permanecem.

## Decisões de abertura

Tomadas com o autor antes da escrita:

1. **Copiar o subconjunto do casco, não extrair um SCSS compartilhado.** O casco `guia__*` hoje
   vive duplicado em `criar.page.scss` e `criar-criatura.page.scss` (cada componente carrega o
   próprio SCSS). A terceira cópia, restrita ao que o NPC usa, é o caminho de menor risco;
   extrair um parcial compartilhado mexeria em duas telas já aprovadas e fica **fora** desta
   task. Registrar a extração em `docs/context/IDEAS.md` ao fechar.
2. **Só apresentação.** O que é comportamento dos guias de Jogador/Criatura e o NPC não tem —
   rascunho local com "Retomar"/"Começar do zero" e o diálogo "Sair do guia?" — **não entra**
   aqui. O autor pediu aparência; se quiser esse comportamento, é uma spec à parte.

## Entregáveis

### 1. Casco da página (`criar-npc.page.html`)

Reescrever na estrutura do análogo, mantendo `ficha-pagina guia` como classes de raiz como os
outros dois guias:

- **Cabeçalho** (`guia__cabecalho`): botão de voltar (`app-botao-icone`, ícone `voltar`,
  `aria-label` coerente — o NPC volta ao destino, sem diálogo), `//` (`guia__indice`), grupo de
  título com kicker "Guia de criação de NPCs" e `h1` "Novo NPC", régua (`guia__regua`) e o botão
  "Resumo" (`app-botao`, `tamanho="medio"`, `estilo="contorno"`, ícone `visao-geral`). O chip
  "NPC · MESTRE" e o subtítulo atuais saem do cabeçalho; o contexto Acervo × Campanha segue
  existindo (hoje no kicker) e deve continuar visível de algum modo coerente com o análogo.
- **Progresso mobile** (`guia__progresso-mobile`): mesmo formato do análogo (rótulo "NPC ·
  NN/05", título da etapa, trilho), com `role="progressbar"` e os atributos `aria-*` que já
  existem.
- **Trilha "Roteiro"** (`guia__trilha`): `guia__painel-cabecalho` com "Roteiro" e `NN/05`; cada
  passo como no análogo — índice, título e legenda de estado (**Em preenchimento / Disponível /
  Aguardando**), ícone de check nos concluídos. A regra de **bloqueio de passos à frente** vale
  como no análogo (`[disabled]` além do mais distante já visitado). Hoje o guia de NPC deixa
  navegar livremente; o contrato visual do análogo passa a valer, **mantendo** a validação por
  etapa existente em `NpcCriacaoFormularioService` ao avançar.
- **Cabeçalho da seção** (`guia__secao`): índice `NN`, "Etapa atual" e o título da etapa, com
  régua (`guia__secao-regua`), no lugar do `h2.npc-guia__titulo`. O foco no título ao trocar de
  etapa (`tituloEtapa`) continua.
- **Corpo e rodapé** de navegação (Voltar/Continuar/Registrar NPC) no formato dos análogos:
  `app-botao` com `tamanho`, `estilo`, `variante` e `posicaoIcone` completos — confirmar controle
  por controle, não só a diretiva.
- **Resumo** (`guia__resumo*`): o painel lateral "Resumo do NPC" passa para a estrutura do
  resumo do análogo (cabeçalho, linhas rótulo/valor, estado vazio "a definir"); o modal inferior
  do mobile continua como está, só com o conteúdo na nova estrutura. O **conteúdo** do resumo
  (nome, função, categoria/nível, cooperação, Vida/Defesa/Energia, passivas/ativas, conduta,
  sequelas/traumas) não muda.
- **Estado "NPC registrado"**: manter o conteúdo e as duas ações (Abrir NPC, voltar ao acervo/
  campanha); só sai do casco `npc-guia__*`, consumindo `app-cartao` como hoje ou o padrão de
  sucesso do análogo — o que o corte visual indicar, registrado no fecho.

### 2. Casco dos passos

`npc-identidade`, `npc-atributos`, `npc-habilidades`, `npc-conduta` e `npc-revisao` deixam de
depender do `npc-etapa.scss` próprio para a apresentação de campos e passam a usar a mesma
receita de campos dos análogos (`guia__introducao`, `guia__campos`, `app-campo`/`campo__*`,
mesmas grades e espaçamentos). Cada passo ganha, como nos análogos, a introdução curta do passo
(`guia__introducao-codigo` + frase). **Textos novos, se houver, em português e sem inventar
regra**; o conteúdo vem do que o passo já diz.

- A imagem de registro (`guia__avatar-campo`) existe nos guias de Criatura e Jogador. O guia de
  NPC **já** tem upload de imagem? Conferir no código; se tiver, adotar a caixa de avatar do
  análogo; se não tiver, **não criar** — apenas registrar a lacuna no fecho como pendência para o
  autor decidir.
- Controles de UI exclusivamente por `shared/ui/` com a API completa (`[variante]`, `[estilo]`,
  `[tamanho]`, `[posicaoIcone]`). **Se `shared/ui/` não cobrir algo que o análogo usa, parar e
  perguntar ao autor** antes de contornar com HTML/CSS local.

### 3. SCSS

- `criar-npc.page.scss` ganha o subconjunto de `.guia__*` que o NPC usa, copiado dos análogos
  **sem copiar o que o NPC não renderiza** (`guia__retomar*`, `guia__sair-dialog*`) — nada de
  estilo morto.
- Remover `npc-guia__*` e o que ficar morto em `npc-etapa.scss`/`npc-revisao.scss`.
- Só tokens (`var(--surface)`, `var(--accent)`, `var(--font-mono)` etc.); nenhum hex, fonte ou
  raio solto. `.botao` encapsulado: copiar a receita para o SCSS de cada componente que a usa,
  como o projeto já faz.
- Responsivo: o breakpoint do análogo para a trilha lateral × barra de progresso mobile.

## Critérios de Aceite

- O guia de NPC é, lado a lado com o de Criatura em `1920×1080` e `360×800`, indistinguível no
  casco: cabeçalho, Roteiro, cabeçalho de seção, progresso mobile, rodapé, resumo e densidade dos
  campos.
- Os cinco passos mantêm os mesmos campos, as mesmas validações e o mesmo envio; "Registrar NPC"
  cria o NPC igual a antes (nenhuma mudança de DTO, regra ou endpoint).
- Passo à frente bloqueado até ser alcançado; passos já visitados navegáveis; estados
  Em preenchimento / Disponível / Aguardando corretos.
- Foco, contraste e alvos de toque ≥ 44 px corretos; sem overflow em nenhum viewport.
- Nenhum `npc-guia__*` restante; nenhum estilo morto; nenhum hardcode.
- Todo botão/campo/chip usa o primitivo de `shared/ui/` com os inputs que lhe dão densidade e
  forma.

## Verificação exigida

- **Testes**: `criar-npc.page.spec.ts` ajustado ao novo casco (etapas, bloqueio à frente,
  resumo, registro, estado "registrado"); `npc-criacao-formulario.service.spec.ts` sem mudança
  (nada de regra mudou — confirmar que continua passando).
- **Gate visual obrigatório** (`AGENTS.md`, skills `verify` e `design-fidelity`), em
  `1920×1080` **e** `360×800`, percorrendo: cada um dos cinco passos; passo bloqueado; erro de
  validação visível; resumo (painel e modal mobile); estado "NPC registrado"; ambos os contextos
  (acervo e campanha). Comparação lado a lado com o guia de Criatura, com correções registradas
  no fecho. O agente principal inspeciona pessoalmente; relato de subagente não encerra o gate.
- O app real precisa estar rodando; **pedir autorização ao autor antes de subir o stack**.

## Fora de Escopo

- Rascunho local e diálogo de sair (ver decisão 2).
- Extração do casco `guia__*` para um SCSS compartilhado (decisão 1; vira ideia em `IDEAS.md`).
- Mudar contrato, regras (`shared/regras/npc`), validações ou backend de NPC.
- O guia de Civil (`docs/specs/backlog/civil-guia-criacao.spec.md`).
- A ficha completa de NPC (`m4-14`).

## Dependências

- `m4-08` (`done`) — o guia de NPC atual.
- `m4-04` (`done`) e `m3-57`/`m3-58`/`m3-59` (`done`) — os guias análogos.
- `m4-10` (`done`) — o refinamento mobile do guia de NPC; os comportamentos responsivos que ele
  consolidou (resumo em modal inferior, progresso mobile) precisam sobreviver à troca de casco.
