# m4-ficha-criatura-npc.spec.md

> **Milestone M4 — Ficha de Criatura/NPC.** Design mecânico fechado em
> `docs/core/guia_de_mestre-v4.0.0.md` (capítulos "Guia de Criação de Ameaças" e "Guia de Criação
> de NPCs"); este spec fixa o escopo acordado. Quebrar em tasks numeradas quando o milestone
> começar.

> **Decisão (ex-pendência do `m3-10`):** Criatura e NPC seguem a mesma convenção da ficha de
> jogador — **snapshot na criação + máximos editáveis** (Vida Máxima, Defesa/Bloquear/Esquivar,
> Energia não recalculam depois), **edição no próprio lugar**, atual pode exceder o máximo. Os dois
> capítulos novos do guia confirmam a mesma lógica de progressão por VD/Nível que já embasa a ficha
> de jogador, então não há razão para divergir. A **Maestria** continua exclusiva de **jogador** —
> não se aplica a criatura nem a NPC.

## Objetivo

Ferramenta do mestre para criar e gerenciar ameaças (criaturas) e NPCs, seguindo os roteiros de
criação do `docs/core/guia_de_mestre-v4.0.0.md`.

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
- **Refinamento de UI/UX mobile** (task numerada dedicada no fim do milestone): os dois
  assistentes de criação (multi-etapas) e a listagem/revelação no painel do mestre otimizados
  para tela pequena (~360px, sem scroll horizontal, alvos de toque adequados, navegação de
  etapas confortável no polegar), reusando o padrão responsivo por tokens de `m1-15` e a
  identidade `docs/design/` (protótipo `docs/design/examples/ficha-de-criatura.html` é alvo
  desktop — falta protótipo equivalente para NPC, avaliar se é necessário antes da task). Ver
  `m1-15-*`.

## Critérios de Aceite (mínimos)

- Mestre monta a ficha de exemplo do guia ("A Estátua") e o sistema reproduz os valores do
  documento
- Mestre monta um NPC por Categoria usando a Biblioteca de Referência do guia e o sistema
  reproduz Vida/Defesa/Energia calculados
- Jogador não vê criatura/NPC sem concessão; passa a ver após revelação
- Nenhuma regra de criação duplicada fora de `shared/regras/criatura` e `shared/regras/npc`
- Assistentes de criação e listagem do mestre usáveis no mobile (~360px) sem scroll horizontal

## Dependências

- M3 (módulo ficha + tempo real)
