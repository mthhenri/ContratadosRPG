# m3-ficha-jogador.spec.md

> **Milestone M3 — Ficha de Jogador.** Receberá design detalhado (brainstorming próprio)
> quando chegar a vez; este spec fixa o escopo acordado. Quebrar em tasks numeradas.

## Objetivo

Fichas de jogador persistentes com cálculo automático de stats, permissões e atualização
em tempo real — o coração do sistema.

## Escopo Acordado

- **Fechamento do contrato `FichaJogadorDadosDto`** (forma do JSONB `dados`) a partir do
  `docs/core/sistema-v4.1.0.md` — atualizar `SCHEMA.md`.
- **Módulo `ficha` (backend)**: CRUD com matriz de permissões (dono edita a própria;
  mestre vê/edita qualquer ficha da campanha; outro membro vê só com
  `usuario_ficha_acesso`); validação dos dados contra `shared/regras`
  (HP ≤ máximo calculado, atributos dentro dos limites de classe/nível, etc.);
  concessão/revogação de acesso de visualização. Migrations de `ficha`, `tipo_ficha`,
  `usuario_ficha_acesso`.
- **Tempo real**: gateway Socket.IO broadcast-only (SYSTEM.SPEC §9) — handshake com JWT,
  salas `ficha:<id>` e `campanha:<id>`, eventos `ficha:alterada`, `ficha:criada`,
  `membro:entrou`; emissão pela service após mutação; cliente ressincroniza ao reconectar.
- **Frontend**: criação de ficha (reusando os formulários/cálculos da calculadora de
  agente), visualização/edição com stats derivados ao vivo via `shared/regras`,
  lista de fichas da campanha (respeitando permissões), tela do mestre com fichas
  atualizando em tempo real.
- **Refinamento de UI/UX mobile** (task numerada dedicada no fim do milestone): a ficha de
  jogador é o ecrã mais denso do sistema — criação/edição, ficha completa com stats
  derivados e a lista/painel do mestre precisam ser confortáveis no mobile (~360px, sem
  scroll horizontal do body, alvos de toque adequados, seções colapsáveis onde fizer sentido),
  reusando o padrão responsivo por tokens de `m1-15` e a identidade `docs/design/` (o protótipo
  `docs/design/examples/ficha-de-jogador.html` é alvo desktop). Ver `m1-15-*`.

## Critérios de Aceite (mínimos)

- Jogador cria/edita a própria ficha; mestre edita qualquer uma; terceiro só vê com acesso
  concedido — matriz coberta por testes de service (REST e entrada em sala WS)
- Backend rejeita ficha salva com dados incoerentes com o motor de regras
- Mestre com a ficha aberta vê alterações do jogador sem recarregar
- Ficha (criação/edição/visualização) e lista usáveis no mobile (~360px) sem scroll horizontal

## Dependências

- M1 (`shared/regras` completo) e M2 (auth + campanhas)
