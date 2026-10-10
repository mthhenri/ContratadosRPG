# m4-ficha-criatura-npc.spec.md

> **Fechada em 09/10/2026:** todas as tasks `m4-01`…`m4-21` estão em `done/`; o guarda-chuva
> foi movido sem novas implementações. O trecho "tasks restantes" abaixo é o registro da época.

> **Milestone M4 — Ficha de Criatura/NPC.** Fonte mecânica corrente:
> `docs/core/guia_de_mestre-v4.2.0.md` (capítulos "Guia de Criação de Ameaças" e "Guia de Criação
> de NPCs"); este spec fixa o escopo acordado. Milestone já dividido em tasks numeradas;
> planejamento visual revisado em 2026-09-30; contrato, motor e backend NPC concluídos
> em `m4-05`/`m4-06`/`m4-07`.

> **Adequações ao livro corrente:** P-100, P-101/01/02/03 e M4-19 concluídas;
> Competências/testes privados de NPC entregues. Ataques/Equipamentos: investigação concluída,
> decisões do autor registradas, spec executável preparada em `m4-20` (depende da `m4-19`).
> O escopo original abaixo não equivale a conformidade integral com Guia v4.2.0.

> **Decisão (ex-pendência do `m3-10`):** Criatura e NPC seguem a mesma convenção da ficha de
> jogador — **snapshot na criação + máximos editáveis** (Vida Máxima, Defesa/Bloquear/Esquivar,
> Energia não recalculam depois), **edição no próprio lugar**, atual pode exceder o máximo. Os dois
> capítulos novos do guia confirmam a mesma lógica de progressão por VD/Nível que já embasa a ficha
> de jogador, então não há razão para divergir. A **Maestria** continua exclusiva de **jogador** —
> não se aplica a criatura nem a NPC.

## Objetivo

Ferramenta do mestre para criar e gerenciar ameaças (criaturas) e NPCs, seguindo os roteiros de
criação do `docs/core/guia_de_mestre-v4.2.0.md`.

## Escopo Acordado

- **Dois contratos, não um com variação**: `FichaCriaturaDadosDto` e `FichaNpcDadosDto` fecham
  separados em `SCHEMA.md`/`shared/src/dtos/ficha/` — a mecânica divergiu bastante entre os dois
  capítulos do guia (Criatura: NA/VD, Modificadores, Tenacidade, Cadência; NPC: Categoria, Nível,
  Cooperação, Energia por modelo).
- **`shared/regras/criatura`**: roteiro de Ameaças (atributos, modificadores, saúde, defesa,
  resistências/fraquezas, regeneração, porte, deslocamento, cadência/iniciativa, ataques,
  habilidades especiais), testado contra o guia — incluindo o exemplo completo "A Estátua" do
  documento como caso de teste.
- **`shared/regras/npc`**: roteiro de NPCs (categoria/nível/cooperação, atributos com cap por
  categoria, vida, defesa, energia por modelo de categoria, DT de atributo calculada sob demanda —
  nunca persistida, pois varia por atributo/contexto —, volume de habilidades por categoria),
  testado contra a Biblioteca de Referência do guia (Operativo/Veterano/Elite/Lendário) como casos
  de teste.
- **Backend**: criação restrita ao mestre (tipos `CRIATURA` e `NPC`); mesmas permissões e
  mecanismos do M3 (dono = mestre; invisível a jogadores; revelável via `usuario_ficha_acesso`);
  eventos WS reusados.
- **Frontend**: assistente de criação de ameaça guiado pelo roteiro de Ameaças; assistente de
  criação de NPC guiado pelo roteiro de NPCs (mais leve — o guia descreve o NPC como uma "versão
  otimizada" da estrutura de agente); listagem no painel do mestre; revelação seletiva a
  jogadores.
- **Ficha pronta de NPC** (`m4-08b`): consulta e edição no lugar, tela dedicada ao contrato
  de NPC, duas colunas seguindo a criatura atual e controles de recurso/edição do jogador.
  Criação agrupada em cinco etapas, ficha e estados definidos em
  `docs/design/FICHA-NPC.md`. Não deixar consulta/edição como pendência da listagem.
- **Refinamento de UI/UX mobile** (task numerada dedicada no fim do milestone): os dois
  assistentes de criação (multi-etapas) e a listagem/revelação no painel do mestre otimizados
  para tela pequena (~360px, sem scroll horizontal, alvos de toque adequados, navegação de
  etapas confortável no polegar), incluindo fichas prontas. Reusar padrões responsivos e
  análogos atuais definidos em `docs/design/FICHA-NPC.md`; o mockup antigo de criatura não
  representa o shell atual. O polimento final não adia o gate mobile de cada task de UI.

## Ordem das tasks restantes

`m4-08` (criação) → `m4-08b` (ficha pronta) →
`m4-09` (listagem/revelação integrada) → `m4-10` (polimento responsivo).
`m4-19` (Competências/teste de atributo) → `m4-20` (ataques/equipamentos, depende da `m4-19`)
seguem a segunda revisão do NPC (após `m4-16`/`17`/`18`), fora da ordem original acima.
`m4-21` (revisão visual e de usabilidade da ficha pronta, pedido do autor) veio depois da `m4-20`.

São quatro tasks restantes, preservando os números originais. `m4-05`/`m4-06`/`m4-07` já
entregaram contrato, motor e backend de NPC: volume validado pela tabela do guia; cap de Civil
sem marcador de desbloqueio (decisão do mestre); criação solta e atribuição conforme `m4-11`.
Morrendo foi definido em `dados.condicoes.morrendo` (`SCHEMA.md`), com resolução pura em
`shared/regras/npc`; a futura UI consome o contrato. O refinamento visual não modifica fórmulas.

## Critérios de Aceite (mínimos)

- Mestre monta a ficha de exemplo do guia ("A Estátua") e o sistema reproduz os valores do
  documento
- Mestre monta um NPC por Categoria usando a Biblioteca de Referência do guia e o sistema
  reproduz Vida/Defesa/Energia calculados
- Jogador não vê criatura/NPC sem concessão; passa a ver após revelação
- Nenhuma regra de criação duplicada fora de `shared/regras/criatura` e `shared/regras/npc`
- Assistentes de criação e listagem do mestre usáveis no mobile (~360px) sem scroll horizontal
- NPC criado abre sua ficha própria; mestre edita no lugar e jogador autorizado lê, sem
  depender da tela de agente. Fidelidade aos dois análogos observada no app real em todos os
  viewports/estados do contrato visual, com recursos adequados às cinco Categorias.

## Dependências

- M3 (módulo ficha + tempo real)
