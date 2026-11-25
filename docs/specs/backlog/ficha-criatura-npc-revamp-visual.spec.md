# ficha-criatura-npc-revamp-visual.spec.md

> Task avulsa de **redesign visual** (M4, pós-fechamento). Origem: pedido do autor depois das Sessões 4 e
> 5 (27/10 e 10/11/2026): as fichas de Criatura e de NPC estão "complexas e difíceis de entender"; o pior
> caso é o visual das **habilidades das criaturas**. Pedido **D** de `PEDIDO_CLAUDE_CODE_SPECS_SITE.md`,
> prioridade alta. Só especificação: nenhum código nesta etapa.

## Objetivo

Redesenhar a leitura das fichas de Criatura e de NPC para **uso rápido na mesa durante o combate**:
hierarquia clara (o que o mestre precisa agora × o que consulta depois), habilidades e ataques com um
padrão visual único e escaneável, e a mesma linguagem visual entre Criatura, NPC e a ficha de Jogador.

## Relação com specs existentes (sobreposição)

- **`criatura-npc-vd-habilidades-ataques.spec.md` (backlog)** tem o Entregável 3 "Habilidades e Ataques —
  UX a redesenhar", com a pergunta "quais dores o autor sente" ainda em aberto. **Este pedido é essa
  resposta e a amplia** (bloco inteiro, NPC incluso). Proposta: esta spec **absorve** o Entregável 3
  daquela; a outra fica com VD/NPC. Decisão do autor (pergunta 1); nenhuma das duas é editada até lá.
- `ficha-exportar-criatura-npc-agente.spec.md` (backlog) exporta fichas; não redesenha a tela. Se esta spec
  mudar a hierarquia de seções, o HTML exportado deve espelhá-la; registrar a dependência quando ambas
  forem executadas.
- Specs concluídas que moldaram a tela atual e **não** são reescritas: `m4-04b`, `m4-08b`, `m4-10`, `m4-14`,
  `m4-16`, `m4-17`, `m4-21`, `criatura-visualizacao-shell-ui34`, `criatura-ataques-habilidades-scroll-interno`,
  `ficha-criatura-formularios-compactos`, `icones-criatura-vd-tenacidade`.

## Estado atual encontrado (inventário; arquivos em `frontend/src/app/modules/ficha/`)

> O inventário abaixo vem de leitura do código em 25/11/2026. A primeira tarefa de execução é reconfirmá-lo
> **na tela renderizada** (Entregável 1), pois a leitura do código não prova como a tela se comporta.

### Criatura (`componentes/criatura-visualizacao/`, HTML 1.796 linhas, SCSS 1.158; página `paginas/visualizar-criatura/`)

Grade de duas colunas `694px minmax(0,1fr)`, uma coluna abaixo do breakpoint de tablet.

| Coluna | Bloco | Conteúdo |
|---|---|---|
| 1 | Card **Identidade** | Selos só-leitura (ficha visível/oculta, rolagem oculta/pública); Perfil (designação, registro, avatar); Combate: **VD, Defesa, Tenacidade**, **Vida** (botão "Receber dano", −/valor/máx/+, barra própria `criatura__barra-vida`), **Resistências** e **Fraquezas** (`app-criatura-resistencia-lista`); Classificação (chips de Origem, Comportamento, Porte, NA) |
| 1 | Card **Atributos** | Físico e Mental; ladrilho próprio `criatura__atributo-card` (d20, sigla, valor, efetivo `+n` com `data-nivel` Forte/Médio/Fraco/Frágil); edição em bloco |
| 2 | Abas **Geral · Ataques · Habilidades** | ver abaixo |
| 2 / Geral | Cadência (e turnos), Bônus de Iniciativa, Deslocamento (tags por modo), Descrição, Gancho, Motivação, Regeneração (modo, intensidade, valor, condição), Natureza, Tema de Horror |
| 2 / Ataques | `app-rolagem-rapida` + `app-criatura-ataque-lista` |
| 2 / Habilidades | `app-criatura-habilidade-lista` |

Fora do fluxo: diálogo de receber dano, painel flutuante de Anotações privadas, bandeja de dados.

### NPC (`componentes/npc-visualizacao/`, HTML 161 linhas + componentes filhos)

Grade `minmax(0,694px) minmax(0,1fr)`. Coluna 1: `app-npc-identidade` (cartão com Cooperação via
`app-barra-escala`, Categoria/Nível/Patente, Defesa/Bloquear/Esquivar, Vida e Energia em
`app-barra-recurso`, "Morrendo"/"Confirmar socorro") e `app-npc-atributos` (resumo DT/Competências/
Modificador, `app-atributo-ficha`, `app-npc-competencias`). Coluna 2: `app-rolagem-rapida` (só gestor) e abas
**Conduta · Equipamento · Habilidades · Sanidade** num único cartão (`npc-equipamento` tem 431 linhas de HTML;
`npc-habilidades-lista` 330). **O NPC não tem ataques** no DTO (Luta e Pontaria passam por rolagem rápida e
por teste de atributo).

### Tipos de habilidade, ataque e variações de condição

| Item | Contrato (`shared/src/dtos/ficha/`) | Campos |
|---|---|---|
| Ataque de Criatura | `FichaCriaturaAtaqueDto` | `nome`, `teste`, `dano`, `danoCritico` (fórmulas de texto, ex.: `lutad20kh1+3`), `custoAcao` (`ACAO_LIVRE · MOVIMENTO · PADRAO · COMPLETA · TURNO`), `area` (booleano), `efeito?` (Markdown) |
| Habilidade de Criatura | `FichaCriaturaHabilidadeDto` | `nome`, `tipo` (`PASSIVA · ATIVA · GATILHO`), `descricao` (Markdown), `restricao?` (texto livre) |
| Habilidade de NPC | `FichaNpcHabilidadeDto` | `nomeNeutro`, `nomeNarrativo?`, `tipo` (`PASSIVA · ATIVA`, **sem** Gatilho), `custoEnergia?`, `descricao` e `restricao?` em texto puro |
| "Condições" de ação fora das listas | Criatura | `cadencia` (`SINGULAR · DUPLA · TRIPLICE · FRENETICA`) + `turnosPorRodada`, `iniciativaBonus`, `regeneracao` (modo `PASSIVA/CONDICIONAL`, intensidade `RESIDUAL…IMPARAVEL`, `valor`, `condicao`), `deslocamento` (4 modos) |

**Importante para a proposta:** **não existem** hoje, em nenhuma habilidade, campos estruturados de custo,
alcance, alvo, duração, frequência ou gatilho (a Criatura não tem custo de habilidade; o NPC tem só
`custoEnergia`). O único lugar da "condição de uso" é `restricao` em texto livre. O pedido do autor
("nome, custo, alcance/tipo, efeito e condições bem separados") **só é totalmente atendível com mudança de
contrato** (ver Fase 2 e pergunta 2).

### Como o ataque e a habilidade são renderizados hoje (problemas observáveis no código)

1. **Ataque:** a fórmula de teste, dano e dano crítico **não aparece como texto**; vive só em `appTooltip`
   dos três botões (`criatura-ataque-lista.component.html` l.82-100). Tooltip não é leitura rápida na mesa,
   e não existe em toque. Um teste de spec confirma a intenção ("a expressão de dano não ocupa o espaço dele").
2. Os três botões **Teste / Dano / Crítico** usam o **mesmo ícone d20** e rótulo mono de 10px em caixa alta;
   diferem só por cor/glow.
3. Custo de ação e "Área" são selos mono de 9px; a diferença entre Movimento, Padrão, Completa e Turno é
   **só tom**, e Ação Livre fica sem cor: decodificar cor para ler custo.
4. **Habilidade:** o tipo é um chip no cabeçalho; a lista é **ordenada por nome** (`localeCompare`), então
   Passivas, Ativas e Gatilhos se misturam.
5. A descrição é cortada em **5 linhas** (`line-clamp`) com olho de tooltip para o resto, e a **restrição** (a
   frequência/condição de uso, dado tático) vem depois, em itálico mono de 11px: **menor peso visual para o
   dado mais acionável**.
6. Para decidir um turno é preciso trocar entre três abas: Cadência/Bônus de Iniciativa/Regeneração estão em
   **Geral**, ataques em **Ataques** e habilidades em **Habilidades**.
7. A aba Geral é uma pilha heterogênea (stats editáveis, quatro tags de deslocamento, três cards `//`, quatro
   tags de regeneração), com markup editável repetido.
8. Em desktop a coluna 2 trava a altura da vizinha (`contain: size`) e as listas rolam por dentro; em tablet e
   mobile rola a página.

### Compartilhamento e divergência

- Comuns: `app-abas`, `app-valor-editavel`, `app-botao`, `app-icone`, `appTooltip`, `app-estado-vazio`,
  `app-rolagem-rapida`, `app-bandeja-dados`, padrão de lista com cabeçalho `//`.
- **Só o NPC** usa `app-cartao`, `app-chip`, `app-stat`, `app-barra-recurso`, `app-barra-escala`,
  `app-atributo-ficha`, `app-campo`, `app-step-input`.
- **Só a Criatura** usa receita própria para ladrilho de atributo (`criatura__atributo-card`, **zero** uso de
  `app-atributo-ficha`/`app-stat`), barra de vida própria (`criatura__barra-vida`), cards/tags/chips
  `criatura__*`. Pendência registrada: `I-048` (unificar o ladrilho da Criatura em `app-atributo-ficha`).
- Edição: Criatura por valor avulso e por lista; NPC por bloco com Salvar/Cancelar (`m4-16`).
- `docs/design/DESIGN.md` (l.13-14 e l.1050) declara a Criatura **fora da revisão**, sem seção própria;
  `docs/design/FICHA-NPC.md` é o contrato do NPC; `docs/design/examples/ficha-de-criatura.html` é mockup
  manual **desatualizado** em relação ao cabeçalho (README dos exemplos, l.59-65).
- `P-129` (aberto): abas não selecionadas sem nome acessível no celular (rótulo `display:none`). A mesma
  causa vale para as abas da Criatura e do NPC. O redesign **não** pode reintroduzir isso.
- Testes: 53 testes em `criatura-visualizacao`, 13 e 10 nas listas de ataque e habilidade, muitos no NPC.
  **Não há teste visual, e2e, de hierarquia ou de overflow.** O redesign quebra seletores BEM dos specs
  existentes; isso é esperado e deve ser migrado, não removido.

## Proposta

> Wireframes abaixo são **hipóteses de trabalho** para o autor reagir, não decisão. Seguem
> `docs/design/DESIGN.md` (tema "Terminal de Contenção", dark-first, IBM Plex, tokens SCSS) e a skill
> `design-fidelity`. **Nenhum token é alterado nesta proposta.** Se a execução precisar de token novo
> (por exemplo, cor semântica por custo de ação), isso é registrado como mudança explícita e submetido ao
> autor antes de tocar `docs/design/tema/_tokens.scss` e o espelho do frontend.

### Princípios

1. **Camadas de leitura.** Camada 1 (sempre visível): o que muda a decisão do turno: Vida, Defesa,
   Tenacidade/Bloquear/Esquivar, Cadência/Deslocamento, **ataques com fórmulas visíveis**, ameaças ativas.
   Camada 2 (um toque): habilidades completas, resistências/fraquezas detalhadas, regeneração. Camada 3
   (consulta/edição): descrição, gancho, motivação, classificação, anotações.
2. **Mesmo cartão de ação para todo ataque e habilidade** (um padrão escaneável, abaixo).
3. **A fórmula é texto, não tooltip.** Teste, Dano e Crítico legíveis no cartão; o botão rola, o texto informa.
4. **Cor nunca é o único canal:** custo e tipo têm texto/ícone além do tom (também por acessibilidade).
5. **Mesma linguagem Criatura/NPC/Jogador:** mesmo cartão de recurso (Vida/Energia), mesmo ladrilho de
   atributo, mesmas abas; divergências só onde o conteúdo diverge (NPC sem ataques; Criatura sem Energia).

### Cartão de ação (ataque e habilidade) — hipótese

```text
┌────────────────────────────────────────────────────────────┐
│ [PADRÃO] Mordida Dilacerante                    [ÁREA]    │  nome + custo em texto
│ ATAQUE · teste  lutad20kh1+3                              │  linha de teste visível
│ [⚄ Teste]  [⚄ Dano  4D12+10 Físico]  [⚄ Crítico 8D12+20]  │  rótulo + fórmula legíveis
│ ▸ Efeito: derruba o alvo (Forte)                          │  efeito recolhido
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ [ATIVA] Rugido Sísmico                                     │  tipo em texto + ícone
│ Quando: 1×/cena · gasta 2 ações                            │  condição de uso EM DESTAQUE
│ Atordoa quem estiver a até 6 m...                    [ver] │  descrição curta, expandir
└────────────────────────────────────────────────────────────┘
```

- A linha **"Quando"** carrega o que hoje é `restricao`. Na Fase 1 ela é exibida com peso alto, **sem**
  mudar o contrato; só vira campos separados na Fase 2.
- **Agrupar e ordenar por tipo** (Passivas, Ativas, Gatilhos) em vez de alfabético puro (pergunta 5).
- Botões Teste/Dano/Crítico com **ícones distintos** (ou rótulo + fórmula), não três d20 iguais.

### Visão de mesa (Criatura) — hipótese de layout

```text
┌─ Identidade resumida ───────────────┬─ AGIR ─────────────────────────────┐
│ Nome   VD 12  NA ▮▮▯   Porte        │ Cadência: DUPLA · Iniciativa +3    │
│ ♥ 84/120 ▮▮▮▮▮▮▯▯   [Receber dano]  │ Deslocamento: Terr 9 · Voo 12      │
│ Defesa 17  Tenacidade 4             │ ── Ataques ───────────────────     │
│ Resist.: ... · Fraq.: ...           │  (cartões de ação)                 │
├─ Atributos (ladrilho unificado) ────┤ ── Habilidades (por tipo) ────     │
│ FOR +4 · AGI +2 · VIG +3 ...        │  Passivas / Ativas / Gatilhos      │
└─────────────────────────────────────┴────────────────────────────────────┘
        Consulta: Descrição · Gancho · Motivação · Regeneração · Natureza · Classificação  (abas ou recolhido)
```

- Ideia central: **"Agir" junta cadência, deslocamento, ataques e habilidades numa só superfície**, e o que é
  consulta (descrição, gancho, classificação, regeneração) vai para uma camada secundária. Reduz o ir-e-vir
  entre Geral/Ataques/Habilidades.
- NPC segue o mesmo esqueleto, sem a lista de Ataques, com Conduta/Equipamento/Sanidade na camada 2.

### Alternativas consideradas

| # | Alternativa | Prós | Contras |
|---|---|---|---|
| 1 | **Só reestilizar** os cartões de ataque/habilidade mantendo abas Geral/Ataques/Habilidades | Menor risco; sem mudar estrutura | Mantém o ir-e-vir entre abas; não resolve "complexa" |
| 2 | **Superfície única "Agir"** + camada de consulta (hipótese acima) | Resolve leitura de turno; alinha com Jogador | Mexe na estrutura; mais specs de teste a migrar |
| 3 | Modo **"Combate"** × **"Ficha completa"** alternável no topo | Mesa rápida sem perder edição | Dois modos para manter; decisão de estado e persistência |
| 4 | Estruturar habilidade (custo, alcance, frequência, gatilho) | Atende o pedido literalmente | **Mudança de contrato e migração de conteúdo**; exige o autor re-catalogar |

Recomendação: executar **1 + 2 em fases** e deixar **4** como Fase 2 condicionada à decisão do autor.
**3** só se o autor quiser dois modos explícitos (pergunta 3).

### Fases

1. **Fase 0 (diagnóstico):** capturas do estado atual (1920×1080 e 360×800) das duas fichas, com as dores do
   autor anotadas por tela; registro do análogo aprovado.
2. **Fase 1 (visual, sem contrato):** cartão de ação, fórmulas visíveis, "Quando" em destaque, agrupamento por
   tipo, hierarquia de camadas, ladrilho e recurso unificados. **Sem mudar DTO, regra ou persistência.**
3. **Fase 2 (opcional, contrato):** campos estruturados de habilidade; spec própria com migração de dados e
   `docs/SCHEMA.md`.

## Entregáveis

> Anexos em `ficha-criatura-npc-revamp-visual/` ao lado da spec; capturas em
> `.artifacts/ficha-criatura-npc-revamp-visual/`.

1. **Inventário vivo** (Fase 0): confirmar na tela cada bloco, tipo de habilidade e variação de condição da
   tabela acima, incluindo estados vazio, texto longo, edição, Gatilho, Área, Frenética, Regeneração
   condicional, Deslocamento indeterminado e NPC Civil/sem Energia. Resultado em `inventario.md`.
2. **Lista de dores do autor** ligada ao inventário (entrada da pergunta 4), e **análogo aprovado** escolhido
   e registrado (candidato: `ficha-visualizacao` do Jogador para estrutura e `npc-identidade` para o cartão
   de recursos).
3. **Proposta final de layout** com os wireframes ajustados pelo autor, em `design.md`, incluindo
   comportamento em 360×800, estados e o que é camada 1/2/3.
4. **Cartão de ação único** para ataque e habilidade (Criatura) e habilidade (NPC), com os mesmos tipos,
   custos e estados.
5. **Reorganização da Criatura e do NPC** conforme a proposta aprovada, reutilizando `shared/ui`
   (`app-cartao`, `app-chip`, `app-stat`, `app-barra-recurso`, `app-atributo-ficha`, `app-abas`) pela API
   completa; unificação do ladrilho de atributo (resolve `I-048`).
6. **Mensagem explícita** se algum primitivo for insuficiente: parar e propor ao autor (regra "Biblioteca de
   componentes é obrigatória"); nada de HTML/CSS local para contornar.
7. **Documentação:** seção da Criatura em `DESIGN.md` (hoje "fora da revisão") e atualização de `FICHA-NPC.md`
   **somente com aprovação do autor**; mockup `ficha-de-criatura.html` atualizado ou marcado como histórico.
8. Migração dos specs de DOM afetados e testes novos para o cartão de ação.

## Critérios de Aceite

- **Teste de leitura rápida** registrado: com a ficha de uma criatura real (ex.: a de dev), responder em até
  poucos segundos "quanto dano e qual teste do ataque X?", "qual a vida?", "qual habilidade é gatilho?" sem
  abrir tooltip nem trocar de aba (parâmetro de tempo definido com o autor na pergunta 6).
- Fórmulas de teste/dano/crítico **visíveis como texto** em desktop e mobile; nenhuma informação de combate
  exclusiva de tooltip.
- Habilidades agrupadas por tipo e com a condição de uso em destaque; nenhum `line-clamp` esconde a condição.
- Criatura, NPC e Jogador compartilham primitivo/receita de Vida/Energia e de ladrilho de atributo; o cartão
  de recursos não diverge sem justificativa registrada.
- Nada hardcoded: sem hex, fonte ou raio fora dos tokens; nenhum token alterado sem aprovação explícita.
- Sem regressão funcional: rolagem de ataque, receber dano, edição por valor/lista (Criatura) e por bloco
  (NPC), revelação ao jogador, anotações privadas.
- Gate visual completo (`verify`, `design-fidelity`) nos viewports `1920×1080` e `360×800`, percorrendo estados;
  comparação com o análogo; sem overflow; foco, contraste e alvo de toque de 44px; `P-129` não agravado;
  base clara e escura.
- `npm run test --workspace=frontend` e `--workspace=shared` (se tocado), lint e `npm run repo:verificar`.

## Fora de Escopo

- Alterar regras de criação de ameaças, fórmulas, motor `shared/regras/criatura|npc` (Guia de Mestre via
  Oficina).
- Mudança de contrato/DTO/migration de habilidade (**Fase 2**, spec própria).
- VD do NPC e modificadores do NPC (`criatura-npc-vd-habilidades-ataques`).
- Exportação de ficha (`ficha-exportar-criatura-npc-agente`).
- Assistentes de criação (12 passos da Criatura, 6 do NPC) e o card compacto de campanha
  (`criatura-esquadrao-card`), salvo ajuste mecânico de consistência aprovado.
- Redesenho do Jogador e do painel de iniciativa/encontro.

## Dependências

- Recomendável após `auditoria-visual-geral-site` (alimenta o inventário) e, para a Fase 1, **não** depende de
  nenhuma outra spec.
- Decisão sobre sobreposição com `criatura-npc-vd-habilidades-ataques` (pergunta 1).
- Fontes: `docs/design/DESIGN.md`, `docs/design/FICHA-NPC.md`, `docs/design/tema/`, `docs/core/guia_de_mestre-v4.2.0.md`
  (somente leitura), skills `design-fidelity`, `verify`, `gerenciamento-de-impacto`, `regras-do-jogo`.

## Impacto (skill `gerenciamento-de-impacto`)

| Camada | Efeito |
|---|---|
| Frontend | Componentes de Criatura e NPC e seus filhos; possível extração do cartão de ação como componente/primitivo (decisão do autor); `app-rolagem-rapida` e `app-bandeja-dados` só consumidos |
| `shared/ui` | Possível ampliação de `app-cartao`/`app-chip` ou novo primitivo de cartão de ação. **Decisão do autor**; avaliar todos os consumidores (`npm run impacto`) |
| Tokens/SCSS | **Nenhuma alteração prevista.** Se surgir token novo: explícito, nos dois espelhos, com impacto em todas as telas |
| `shared/` (DTO/regras) | Nenhum na Fase 1 |
| Backend/banco/migrations | Nenhum na Fase 1; Fase 2 muda contrato, validação backend e `SCHEMA.md` |
| Tempo real | Nenhum |
| Docs | `DESIGN.md`, `FICHA-NPC.md`, mockup, `CONTEXT.md`, `HISTORY.md`, `IDEAS.md` (`I-048`) |
| Deploy | Só frontend |

## Riscos e Mitigação

- **Redesenhar sem ver a tela real:** o inventário vivo e as dores do autor vêm **antes** do layout.
- **Esconder informação tática atrás de recolhimento:** o teste de leitura rápida cobre; nada de combate
  só em tooltip.
- **Divergência Criatura × NPC × Jogador:** análogo único e primitivos compartilhados.
- **Pedido "custo, alcance, condições" sem campo no DTO:** a Fase 1 melhora a exibição de `restricao`; a
  estrutura depende da Fase 2. Não inventar campos no componente.
- **Quebra de testes de DOM:** esperada; migrar seletores com a mesma cobertura, nunca apagar casos.
- **Componentes já extensos** (HTML da Criatura com 1.796 linhas): o redesign deve **extrair** em vez de
  acrescentar, conforme `AGENTS.md`.
- **Gate visual delegado:** o agente principal inspeciona pessoalmente os viewports.

## Estratégia de testes e verificação (skill `verify`)

Testes de componente para o cartão de ação (tipos, custos, Área, condição, agrupamento, ausência de
dependência de tooltip), regressão das rolagens e da edição; stack real com cenário de dev (criatura e NPC
com habilidades de todos os tipos e textos longos); capturas antes/depois em `.artifacts/`; relatório textual
`verificacao.md` com viewports, estados, análogo e correções feitas durante a inspeção.

## Perguntas abertas

1. **Sobreposição:** absorver o Entregável 3 de `criatura-npc-vd-habilidades-ataques.spec.md` nesta spec (e
   deixar a outra só com VD/NPC), ou manter as duas separadas?
2. **Contrato de habilidade:** o autor quer **campos estruturados** (custo, alcance/alvo, frequência, gatilho)
   — Fase 2 — ou aceita nesta rodada só dar peso visual à `restricao` e à `descricao`? Em qualquer caso, o
   que a Criatura deve ter como "custo" de habilidade (ação? energia? nada?).
3. **Estrutura:** preferência entre as alternativas 1 (só reestilizar), 2 (superfície única "Agir") e 3 (modo
   Combate × Ficha completa).
4. **Dores concretas:** quais telas/trechos o autor e os jogadores acharam piores além de "habilidades das
   criaturas" (Sessões 4 e 5)? Há exemplos de criaturas reais que servem de caso de teste?
5. **Ordem das habilidades:** agrupar por tipo (Passiva, Ativa, Gatilho) ou manter alfabética com filtro?
6. **Teste de leitura rápida:** qual meta de tempo e quais perguntas o autor considera "leitura rápida na mesa"?
7. **Primitivo:** se o cartão de ação exigir primitivo novo ou ampliado em `shared/ui`, o autor autoriza criá-lo
   (ou prefere uma receita local do módulo `ficha`, que a regra do projeto só permite com aprovação)?
8. **Mockup e documentação:** o autor autoriza atualizar `DESIGN.md`/`FICHA-NPC.md` e o mockup
   `ficha-de-criatura.html` como parte da execução?
