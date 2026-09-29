# m7-27 — Investigação: visão de esquadrão para o jogador

> Task complementar do módulo M7 (Cenas), posterior ao painel de Investigação de `m7-25`.
> Concluída em 2026-09-29, como extensão do módulo M7.

## Origem e estado

Pedido do autor em 2026-09-29. Composição A (alternar Rolagens/Esquadrão) escolhida pelo autor. O POC visual foi aprovado como direção.

`PainelCenaSemIniciativaJogador` apresenta documentos, rolagens e a própria ficha; não renderiza o esquadrão. O detalhe da campanha já tem a visão de equipe (`equipeExibicao`, painel Esquadrão), que deve servir de referência de conteúdo e permissões.

## Objetivo

O jogador acompanha sua equipe durante a Investigação sem voltar à campanha, mantendo acesso à própria ficha e aos documentos apresentados.

## Requisitos definidos

- Exibir apenas agentes autorizados para o observador: sua própria ficha pode aparecer mesmo oculta; ficha oculta de outro jogador não aparece nem deixa cartão, marcador, contador ou espaço reservado.
- Ficha visível sem acesso completo usa somente a carteirinha canônica; acesso completo não pode ser inferido pela presença no esquadrão. Reutilizar os contratos e regras do painel da campanha.
- Abrir ficha alheia apenas quando autorizado, usando o fluxo existente de ficha flutuante. Não acrescentar edição alheia.
- Preservar própria ficha, ações de rolagem e documentos; equipe não depende de o jogador possuir ficha.
- Sincronizar vitalidade/condições autorizadas, entrada/saída, ocultação/revelação e revogação; reconexão refaz o recorte. Ocultar ficha remove também seleção/prévia aberta de outro jogador.
- Mestre em prévia vê exatamente o recorte do jogador-alvo, nunca a lista completa do mestre.

## Discussão visual antes de implementar

Análogos a inspecionar: Esquadrão de `detalhe-jogador`, painel sem iniciativa do jogador e grade de agentes do mestre. Ler DESIGN e handoff tema; registrar shell, densidade, hierarquia, controles, estados e responsividade.

Opções comparadas com o autor antes da escolha:

| Composição | Vantagem | Custo |
|---|---|---|
| Seção de equipe no palco | Equipe imediatamente visível | Disputa altura com própria ficha e documentos |
| Painel lateral com alternância | Reaproveita a composição da campanha | Exige definir acesso e prioridade no mobile |
| Painel flutuante de esquadrão | Mantém a cena disponível | Pode sobrepor documentos e ficha; exige conferir cobertura dos primitivos |

O corte abaixo fixa localização, abertura inicial, conteúdo, convivência com documentos e ficha
própria e comportamento em 360×800. Se `shared/ui` não cobrir a solução, consultar o autor antes
de ampliar primitivo.

### POC visual para decisão · 2026-09-29

[`docs/design/propostas/investigacao-jogador-esquadrao.html`](../../design/propostas/investigacao-jogador-esquadrao.html)
compara as três composições acima em desktop e numa janela de 360×800. É um protótipo
descartável, com dados ilustrativos; a opção A foi aprovada, ainda sem implementação no Angular.

Análogo principal: `PainelCenaSemIniciativaJogador` (casca, documentos, Rolagens e ficha). O
Esquadrão de `detalhe-jogador` é o análogo de conteúdo, densidade das carteirinhas, seletor e
acesso; a grade do mestre é referência secundária de espaçamento na cena. O POC mostra uma
carteirinha sem concessão, uma ficha acessível, a ficha própria e nenhum vestígio da oculta.

**Decisão do autor:** alternativa A, alternância Rolagens/Esquadrão na lateral existente. No
celular, o seletor fica após os documentos, antes da ficha, conforme o corte apresentado.
O roster inclui a ficha própria como referência, sem criar segunda área de edição; a ficha
principal continua no palco. **Decisões posteriores do autor:** abrir com Esquadrão selecionado;
na prévia de jogador do mestre, permitir entrar na Investigação e apresentar a mesma visão do alvo
em somente leitura. A prévia precisa usar projeção autorizada do alvo também para cena, documentos,
fichas e membros; jamais buscar esses dados pelas rotas normais com o privilégio do mestre.

### Contrato do corte aprovado

- O seletor `app-segmentado` ocupa o topo da coluna lateral e inicia em Esquadrão. Rolagens mantém
  o histórico e sua janela existentes; alternar não descarta dados nem fecha documento ou ficha.
- A lista contém apenas fichas de jogadores presentes em `membros` no recorte do observador. O
  próprio agente permanece mesmo oculto. Membros sem ficha, mestre e espectadores não criam cartão
  de agente. A ordem segue a Equipe da campanha (`ordenarMembros`/`montarEquipeExibicao`).
- Acesso completo mostra nome, avatar, vida, energia e condições já autorizados pela projeção;
  colega com acesso abre `FichaFlutuante`. A própria ficha no roster é referência sem segunda
  edição. Sem acesso completo, mostrar somente nome, classe, avatar e condições da carteirinha,
  sem números nem ação de abrir. Não usar `fichasCampanha` para ampliar `acessoCompleto`.
- Em 360×800, os documentos precedem o seletor e o esquadrão; a ficha própria permanece abaixo.
  Painel vazio usa `app-estado-vazio`; carregamento usa `app-esqueleto`.
- A prévia do mestre parte do item Cenas da campanha em prévia e usa uma rota dedicada de
  Investigação, em somente leitura. A projeção `recuperarPreviaJogador` valida mestre e alvo e
  fornece fichas, membros e rolagens do alvo. A cena ativa e os documentos revelados usam os
  endpoints seguros já existentes do painel de espectador, cujo recorte destes dados é o mesmo
  para jogador e espectador. Ficha completa usa `recuperarFichaPreviaJogador`, jamais o GET normal
  do mestre. Sem Investigação ativa, apresentar estado vazio e saída para a prévia da campanha.
  A ficha alheia aberta nessa prévia usa `app-modal` com `FichaCampanhaCard` em leitura e carga
  pelo endpoint de prévia; a janela flutuante normal buscaria a ficha com o privilégio do mestre.
- O evento em tempo real é só invalidador. Rebuscar fichas e membros nas respectivas mudanças;
  ocultação/revogação deve fechar a ficha flutuante alheia que perdeu autorização, inclusive se
  uma requisição de abertura ainda estiver pendente. Reconexão recompõe todo o recorte.

O corte deve usar os primitivos de `shared/ui/` para seletor, cartões, botões, chips e estados.
Nenhuma ampliação da biblioteca foi identificada no POC; se a implementação revelar uma lacuna,
consultar o autor conforme `AGENTS.md`.

## Aceite e gates futuros

- Jogador vê colegas permitidos sem sair da Investigação; próprio agente oculto permanece disponível apenas para si e mestre.
- Cenário com colega visível sem concessão, colega com concessão, colega oculto e jogador sem ficha. Prévia e sessão real coincidem.
- Verificar atualizações e revogação com mestre e dois jogadores separados. Integrar `auditoria-ficha-oculta-todos-consumidores.spec.md` antes de liberar nova listagem.
- Testes focados e gates proporcionais; skill verify em 1920×1080 e 360×800 com documentos e ficha abertos, foco, toque, contraste e overflow. Registrar comparação pessoal com o análogo e correções. Sem decisão visual e evidência real, permanece aberta.

## Verificação e fecho · 2026-09-29

- **Análogo e composição:** `PainelCenaSemIniciativaJogador` forneceu casca, palco, documentos e histórico; o Esquadrão de `detalhe-jogador` forneceu ordenação, carteirinha, densidade e contrato de acesso. A opção A aprovada foi aplicada com Esquadrão inicial. A prévia dedicada usa somente as projeções do alvo e endpoints seguros de cena/documento.
- **Aplicação real:** Postgres, API NestJS e SPA Angular locais; campanha sintética com mestre, dois jogadores com ficha e um sem ficha, eliminada ao final pelas rotas de exclusão lógica. Inspeção pessoal do jogador e da prévia em **1920×1080, 1366×768, 960×1080 e 360×800**; sem erro de página nem overflow horizontal. Documentos precedem seletor e ficha no mobile. Cartões, controles, tipografia, estados e hierarquia preservam a identidade do análogo. Ajustados os alvos de toque do seletor e de “Ver ficha” para 44 px em 360 px.
- **Estados interativos:** Esquadrão/Rolagens alternam; documento apresentado abre em leitura; ficha alheia concedida abre na janela normal do jogador e em modal somente leitura na prévia. Sem concessão, há só carteirinha, sem vitais ou abertura. Revogação em duas sessões abertas fechou as fichas e retirou ações/vitais sem recarga; ocultação removeu o cartão de terceiro da sessão real e prévia, preservando a própria ficha do dono. Jogador sem ficha manteve esquadrão/documento. Reconexão real de Socket.IO refez membros no jogador e a projeção na prévia.
- **Permissão da prévia:** tráfego observado restrito a `previa-jogador`, `previa-jogador/:fichaId`, `painel-espectador/cena-ativa` e `painel-espectador/cena/:cenaId/documento`; não houve GET normal de ficha/lista com privilégio do mestre. A ação Cenas do detalhe em prévia aponta para essa rota.
- **Gates:** `npm run test --workspace=frontend -- --watch=false` — 185 arquivos/2.628 testes passaram; `npm run build --workspace=frontend` — passou, com aviso preexistente de orçamento do bundle inicial; `npm run lint --workspace=frontend` — 0 erros, 24.569 avisos de estilo do repositório; `npx tsc -p frontend/tsconfig.app.json --noEmit` e `git diff --check` — passaram. A matriz em `docs/auditorias/ficha-oculta-todos-consumidores.md` recebeu o recorte desta tela; a auditoria geral continua com outras decisões abertas.

## Fora de escopo

Inventário compartilhado, novas regras de equipe, composição de participantes da cena e extensão para outros tipos de cena por conveniência.
