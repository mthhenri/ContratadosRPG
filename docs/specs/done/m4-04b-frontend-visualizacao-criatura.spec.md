# m4-04b-frontend-visualizacao-criatura.spec.md

> Pendência registrada ao fechar `m4-04` (não é uma das 10 tasks originais do milestone
> `m4-ficha-criatura-npc.spec.md` — `m4-05` a `m4-10` já estão reservadas para NPC,
> listagem/revelação e refinamento mobile). Ver `m4-04-frontend-criacao-criatura.spec.md`,
> seção "Fora de Escopo": *"Tela de visualização/edição da ficha de criatura já criada... se
> precisar de tela dedicada além da reutilização de `FichaVisualizacao`/`modo`, registrar
> como pendência ao fechar esta task."*

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição
> #29). O protótipo `docs/design/examples/ficha-de-criatura.html` é o alvo de fidelidade
> desktop (comparação visual registrada — gate obrigatório de UI, `AGENTS.md`).

## Objetivo

Hoje, ao terminar o assistente de criação (`m4-04`), o mestre é levado para
`/painel/:campanhaId/ficha/:id` — a mesma rota da ficha de **jogador** (`FichaVisualizacao`),
que só entende `FichaJogadorDadosDto`. O documento da criatura não tem `classe`/`nivel`/
`maestria`/`estado`/`inventario`, então a tela quebra. Esta task constrói a tela de
visualização **e edição no próprio lugar** da ficha de criatura já criada — mesma filosofia
"snapshot editável no próprio lugar" da ficha de jogador (decisão de abertura do M4, ver
`m4-ficha-criatura-npc.spec.md`), com liberdade total de edição (sem trava de faixa),
incluindo editores de lista para Atributos/Modificadores/Resistências/Fraquezas/Ataques/
Habilidades. Tarefa **100% frontend** — `m4-03` já entrega `GET/PUT /ficha/criatura/:id`
completos, com validação (`validarDadosCriaturaContraRegras`), permissões (§14) e broadcast
WS (`ficha:alterada`) reusado; nada muda no backend.

## Entregáveis

1. **Rota nova**: `criatura.routes.ts` ganha `path: ':id'` (irmão de `nova`) →
   `/painel/:campanhaId/criatura/:id`. Permanece dentro do prefixo hoje guardado por
   `mestreCampanhaGuard` (só o mestre acessa pela UI nesta task — ver "Fora de Escopo").
   `criar-criatura.page.ts` (linha do `criar()`) passa a navegar para essa rota em vez de
   `/painel/:campanhaId/ficha/:id`.
2. **Página nova** `paginas/visualizar-criatura/visualizar-criatura.page.{ts,html,scss}`,
   adaptada de `paginas/visualizar/visualizar.page.ts`: mesmo cabeçalho, menu (⋯), dialog de
   acesso de visualização, dialog de confirmação de exclusão, esqueleto de carregamento, WS
   (`entrarSalaFicha`/`sairSalaFicha`/`fichaAlterada$`/refetch na reconexão — §9),
   `HistoricoRolagensSidebar` + `CalculadoraFlutuante` no cabeçalho — tudo isso já é
   agnóstico de tipo (só toca `nome`/`cor`/`imagemUrl`/`oculta`/`usuarioId`/`campanhaId`,
   presentes nos dois DTOs). Troca pontual: `fichaService.recuperarFicha` →
   `recuperarFichaCriatura`; `FichaEdicaoService` → `FichaEdicaoCriaturaService` (novo);
   bloco `<app-ficha-visualizacao>` → `<app-criatura-visualizacao>`.
3. **Merge de conflito**: `mesclarFichaCriatura` (mirror de `mesclarFicha`,
   `modules/ficha/mesclar-ficha.ts`) para `absorverRemoto` da nova página — mesmo algoritmo
   campo a campo, tipado para `FichaCriaturaDadosDto`.
4. **Componente novo** `componentes/criatura-visualizacao/criatura-visualizacao.component.{ts,html,scss}`
   — Signals, `computed` para tudo que vem de `shared/regras/criatura` (Atributo Efetivo,
   Defesa, limite de resistências, valor de regeneração…), edição no próprio lugar campo a
   campo (mesmo padrão de lápis/confirmação de `FichaVisualizacao`), reusando
   `HoldRepeat`/`Tooltip`/`Icone`/`Dialog` (PrimeNG) onde `FichaVisualizacao` já reusa.
   Seções (conteúdo mínimo; layout exato confirmado contra o protótipo durante a
   implementação, não travado aqui): Identidade (designação, origem, conceito, natureza
   física, comportamento, motivação, gancho único, tema de horror), Ameaça (NA/VD),
   Atributos + Modificadores, Saúde (Tenacidade, Vida Máxima/Atual), Defesa, Resistências
   (lista tipo/subtipo/valor), Fraquezas (mesma forma), Regeneração (opcional — modo/
   intensidade/valor/condição), Porte/Deslocamento (terrestre/voador/aquático/sobrenatural)/
   Cadência/Bônus de Iniciativa, Ataques (lista nome/atributo/custo de ação/dano/tipo de
   dano/área/efeito), Habilidades Especiais (lista nome/tipo/descrição/restrição),
   Anotações.
5. **Editor de lista genérico o suficiente** para reusar entre Resistências/Fraquezas/
   Ataques/Habilidades (adicionar/remover/editar linha, mesmo padrão visual) — sem duplicar
   quatro implementações quase idênticas.
6. **Service novo** `ficha-edicao-criatura.service.ts` (`FichaEdicaoCriaturaService`),
   mirror de `FichaEdicaoService`: `fichaBase`/`ficha` em Signals, `estadoPersistencia`
   (`ocioso`/`salvando`/`salvo`), debounce + `PUT /ficha/criatura/:id` em lote (documento
   completo, mesma convenção de `FichaCriaturaAlterarDto`). Handlers: vitalidade (vida
   atual/máxima), identidade, na/vd, atributos, modificadores, tenacidade, resistências,
   fraquezas, regeneração, porte/deslocamento/cadência, bônus de iniciativa, ataques,
   habilidades, anotações, nome/cor/oculta (+ imagem via `FichaService.alterarImagem`/
   `excluirImagem`, já agnósticos de tipo — reusados sem mudança).
7. **Rolagem de dados** nos Ataques e em testes de Atributo, sem tocar `shared/regras`:
   - Ataque: rola `ataque.dano` (já é fórmula pronta, ex. `"4D12+10"`) direto via
     `rolarFormula`.
   - Teste de Atributo: monta `` `${abrevAtributo}d20kh1` `` sobre o **Atributo Efetivo**
     (`calcularAtributoEfetivo`, já existe em `shared/regras/criatura`) — sem termo de
     Proficiência (criatura não tem).
   - Reusa `BandejaDadosService` (bandeja/exibição do resultado) e
     `FichaRolagemRegistroService` (registro no histórico da sidebar) — ambos já agnósticos
     de `fichaId`/tipo.
8. Standalone **lazy**; Signals; Reactive Forms (sem `ngModel`); `.scss` + Tailwind + BEM
   com os tokens do tema — mesmos padrões de `FichaVisualizacao` (proibições #16/#17/#18/
   #29).

## Critérios de Aceite

- Mestre cria uma criatura pelo assistente (`m4-04`) e cai direto na ficha dela, sem erro,
  com todos os campos do documento visíveis e corretos.
- Todo campo é editável no próprio lugar (mesma liberdade de edição da ficha de jogador,
  m3-10): Atributos/Modificadores/Resistências/Fraquezas/Ataques/Habilidades incluídos como
  listas editáveis (adicionar/remover/editar linha).
- Ataques e testes de Atributo rolam dado (bandeja + registro no histórico), usando o
  Atributo Efetivo (com modificador aplicado).
- Edição em uma aba reflete **sem recarregar** em outra aba/sessão com a ficha aberta (WS,
  mesmo critério de aceite de `m3-08`).
- Exclusão, remoção da campanha e gestão de acesso de visualização funcionam igual à ficha
  de jogador (rotas já agnósticas de tipo, reusadas sem mudança).
- Nenhuma fórmula de `shared/regras/criatura` reimplementada no componente.
- Comparação visual contra `docs/design/examples/ficha-de-criatura.html` registrada (gate
  obrigatório de UI, `AGENTS.md`), viewports padrão do projeto (360×800 e 1920×1080, ver
  skill `verify`).
- Verificação ao vivo (skill `verify`): fluxo completo criar → visualizar → editar cada
  seção → rolar dado → confirmar sincronização em tempo real, sem depender só de
  lint/testes unitários.

## Fora de Escopo

- **Acesso do jogador revelado pela UI**: o backend já permite (`GET /ficha/criatura/:id`
  reusa `validarPermissaoVisualizacao`), mas a rota `/painel/:campanhaId/criatura/:id`
  segue dentro do prefixo guardado por `mestreCampanhaGuard` nesta task — sem a listagem do
  mestre (`m4-09`), um jogador revelado não teria como descobrir a URL de qualquer forma.
  Relaxar a guarda e expor o link ao jogador é escopo de `m4-09`.
- Listagem no painel do mestre e fluxo de revelação seletiva (`m4-09`).
- Refinamento mobile dedicado — task própria (`m4-10`), mesmo tratamento de `m4-04`.
- NPC (`m4-08`) — este spec cobre só criatura.
- Qualquer mudança em `shared/regras/criatura`, backend, ou nos contratos `FichaCriatura*Dto`
  (`m4-01`/`m4-02`/`m4-03`, já fechados e `done`).
- Extrair uma casca genérica de página compartilhada entre jogador/criatura/NPC — decisão
  adiada para quando `m4-08` (NPC) der o terceiro ponto de dados.

## Dependências

- `m4-01` (contrato), `m4-02` (`shared/regras/criatura`), `m4-03` (endpoints
  `GET`/`PUT /ficha/criatura/:id`, permissões, WS) — os três `done`.
- `m4-04` (assistente de criação, `done`) — fornece o ponto de entrada (navegação pós-
  criação) que esta task corrige.
- `FichaVisualizacao`/`visualizar.page.ts`/`FichaEdicaoService` (M3) como referência de
  padrão — não modificados por esta task.
- `docs/design/examples/ficha-de-criatura.html` (alvo desktop).
