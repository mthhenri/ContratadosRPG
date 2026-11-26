# Verificação — criatura-ataques-habilidades-leitura

Data: 2026-11-26. Capturas em `.artifacts/criatura-ataques-habilidades-leitura/` (v1 = primeiro corte, v2 =
depois dos ajustes da inspeção) e o "antes" em `.artifacts/ficha-criatura-npc-revamp-visual/`.

## Cenário

Stack do autor em execução (4300/3100). Criatura de estresse "Estátua Estresse" (base: A Estátua), importada
pelo admin de teste: 5 ataques (Livre, Movimento, dois Padrão, Completa com Área e efeito longo) e 6
habilidades (1 Ativa com restrição longa, 2 Gatilhos, 3 Passivas; uma com três fases em parágrafos).

## Ao vivo (`1920×1080` e `360×800`)

- Habilidades em grupos **Ativas 1 · Gatilhos 2 · Passivas 3**, alfabética dentro do grupo; duas colunas no
  desktop, uma no celular.
- Restrição em bloco "Restrição" destacado logo após a descrição (no primeiro corte era a linha "Quando"
  acima dela; ver "Criaturas reais").
- "Fases da Pedra": recolhida mostra "Ver mais"; aberta mostra as três fases (parágrafos separados) e
  "Ver menos"; recolher volta ao "Ver mais".
- Ataques na ordem Toque da Pedra (Livre) › Pancada (Movimento) › Arremesso › Esmagamento (Padrão) › Onda de
  Fragmentos (Completa). Teste/Dano/Crítico com a fórmula escrita; no celular, empilhados com a fórmula à
  direita, 44px de altura.
- Modo de edição: lápis do cabeçalho, editar um item dentro do grupo (formulário no lugar do cartão),
  concluir.
- Sem rolagem horizontal; sem erro de página.

## Criaturas reais (O Ausente e O Eco)

O autor importou as duas criaturas da mesa dele (#29 e #30 no banco local); copiadas para o admin de teste
(#32 e #33) e capturadas em `1920×1080` e `360×800` (`.artifacts/criatura-ataques-habilidades-leitura/reais/`).
O Ausente tem 6 ataques com escala por estágio no efeito e 12 habilidades, uma delas "Evolução" com cinco
estágios.

- **Defeito achado e corrigido:** restrição longa não quebrava linha e invadia o cartão vizinho (medido:
  bloco de 500px, editor de 3096px). O `app-editor-markdown` compacto impõe `flex: none` no próprio host, e
  a regra `flex: 1 1 auto` do consumidor perdia. O bloco passou a grid (`auto minmax(0, 1fr)`).
- **Semântica:** as restrições reais são limites ("Suprimida por chumbo.", "Uma vez por rodada; não funciona
  sob chumbo."), não condição de uso; uma tem um parágrafo inteiro (Encaixe dos Três Dedos). Rótulo voltou
  a "Restrição" e o bloco foi para depois da descrição, para não empurrar o que a habilidade faz.
- Depois da correção: sem rolagem horizontal, sem erro de página, "Evolução" abre os cinco estágios e fecha;
  O Eco começa por Gatilhos (não tem Ativas) e o grupo vazio não aparece; os ataques do Eco mostram as
  fórmulas `INTd20kh1cm1`, `2D10 [Geral]` etc. inteiras.
- **Nos dados, não na tela:** quebras de linha simples (um `
`) são juntadas pelo Markdown — "E1 => Ação
  Completa E2 => Ação Padrão…" (Teletransporte Mnemônico) e "[Estágio 2] — 2 Sessões Ao preencher…"
  (Evolução) saem numa linha só. Onde o texto usa linha em branco (efeitos dos ataques) cada estágio fica na
  sua linha. Não alterado: o editor do app já gera parágrafos com Enter; decidir com o autor se a leitura
  deve tratar quebra simples como quebra.

## Comparação visual

Análogos: as próprias listas da criatura (cabeçalho `//`, cartão `surface-2`, edição no lugar), a lista de
habilidades da ficha de Agente e o "Ver mais / Ver menos" do `ficha-habilidade-seletor`.

- Mesma voz: cartão, selos de custo e de tipo (escala `--selo-*` pedida pelo autor em 2026-09-18) e cores dos
  botões Teste/Dano/Crítico (mesma hierarquia da ficha de Agente) mantidos.
- Novo só o necessário: título de grupo no mesmo rótulo mono do cabeçalho, um degrau abaixo; bloco "Restrição"
  com filete `--accent-border`; "Ver mais" em `app-botao` `primario`/`texto`/`pequeno` com `chevron`.
- Correções feitas na inspeção: parágrafos colados na descrição aberta (fases viravam um bloco só) ganharam
  espaço, só no modo expansível; botões de rolar e "Ver mais" subiram de 40px para 44px no celular.

## Testes

- Frontend: suíte completa com `NODE_OPTIONS=--no-experimental-webstorage` (P-138) — 303 arquivos verdes.
  Migrados: ordem dos ataques (agora por custo) e fórmulas (agora no DOM, sem tooltip); ordem das
  habilidades (agora por grupo). Novos: grupo vazio omitido, bloco "Restrição" logo após a descrição, modo expansível
  ligado na criatura, Ver mais/Ver menos com `aria-expanded`, descrição curta sem botão.
- ESLint nos três componentes: 0 erros.

## Limites

- Fases continuam Markdown livre: o bloco por fase é o parágrafo que o autor escrever (campos estruturados
  são a Fase 2 da spec de redesenho).
- Testado com as duas criaturas reais que o autor importou; nenhuma de produção além delas.
- Ficha de Agente: modo padrão inalterado (testes de `ficha-habilidades` verdes); não recapturada ao vivo.
