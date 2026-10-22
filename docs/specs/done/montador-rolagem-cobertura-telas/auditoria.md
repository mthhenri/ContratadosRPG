# Auditoria e verificação — montador de rolagem

Data: 22/10/2026. Escopo: pedido do autor e [spec](../montador-rolagem-cobertura-telas.spec.md).
Resultado: cobertura entregue no montador Completo, disponível a usuário NORMAL, sem gate local.

## Método e evidências

Aplicação Angular/Nest/Postgres real em `localhost:4300`/`3100`, Chromium com barras de rolagem.
Contas NORMAL separadas para mestre e jogador; campanha temporária com agente, criatura, NPC,
cenas de Investigação e Combate, e combatente avulso. Sem mocks de API na verificação visual.
As capturas, cenários e logs são evidências locais em `.artifacts/montador-rolagem-cobertura-telas/`,
ignoradas pelo Git. O relatório descreve os resultados sem depender desses arquivos no clone.

Todas as doze linhas de superfície abaixo foram exercitadas em **1920×1080, 1366×768,
960×1080 e 360×800** (48 combinações). A janela externa é uma verificação adicional de leitura.

| Superfície | Campo/montador e fluxo observado | Resultado |
|---|---|---|
| Ficha completa do jogador | Aba Rolagens, fórmula livre, inválida, resultado e fechar | Aprovado |
| Ficha completa da criatura | Aba Ataques, fórmula livre, resultado privado | Aprovado |
| Ficha completa de NPC | Nova barra, atributos/NIV/PROF da ficha, resultado privado | Aprovado |
| Campanha do jogador / ficha parcial | Coluna externa, inclusive cheia; fechar sobre a ficha | Aprovado após P-135 |
| Campanha do mestre / Esquadrão | Rolador da campanha; cartão não tem campo livre próprio | Aprovado |
| Cena de Investigação do mestre | Novo rolador avulso, resultado e feed | Aprovado |
| Cena com Iniciativa do mestre | Novo rolador avulso, independente de combatente | Aprovado |
| Ficha flutuante do agente | Aba Rolagens, modelo por clique, resultado e fechar | Aprovado após correção móvel |
| Ficha flutuante da criatura | Aba Ataques, modelo por clique, resultado e fechar | Aprovado |
| Investigação do jogador | Rolador da própria ficha, modelo por clique, resultado | Aprovado após correção móvel |
| Iniciativa do jogador | Rolador da própria ficha, modelo por clique, resultado | Aprovado após correção móvel |
| Combatente avulso do encontro | Novo montador, mesma expressão, resultado privado, sem atributos | Aprovado após correção de empilhamento |

NPC continua na página dedicada: a ficha flutuante não suporta esse tipo (decisão existente,
I-044), portanto não foi criada uma segunda representação de NPC nesta tarefa.
A janela externa de rolagens é **histórico de leitura**: aberta pelo botão real, exibiu o registro
público e o privado do mestre, fechou normalmente e não possui campo livre nem montador.

## Defeitos reproduzidos e corrigidos

1. **P-135, campanha do jogador:** seis rolagens ativaram `overflow-fade--base` na coluna.
   `mask-image` no ancestral prendeu/recortou a janela fixa. Em 1366×768, o centro de Fechar montador
   atingia um cabeçalho da ficha e Fechar resultado atingia a bandeja (`elementFromPoint`).
   Retirada somente a máscara/diretiva desse corpo rolável, preservando limite e scroll.
   Repetição com coluna cheia: ambos os botões atingíveis e clicáveis, nas quatro resoluções.
2. **Rolagens internas no celular:** o destino móvel selecionava corretamente a aba, mas aplicava
   a classe que esconde Status quando Rolagens mora na coluna externa. Na ficha flutuante e nas
   cenas, o próprio card hospeda Rolagens; condicionar a classe a `!mostrarRolagensCompacto()`
   mantém a coluna externa da campanha e deixa os painéis internos visíveis.
   Teste existente ampliado falhou antes (1 falha/123 aprovados) e passou após a correção.
3. **Montador do combatente avulso:** a primeira integração aninhava a janela no painel fixo
   `z-index:35`, abaixo da bandeja `z-index:50`. Reprodução móvel confirmou ambos os fechamentos
   bloqueados. O montador passou a ser irmão da seção fixa; o gatilho canônico chama `abrir()`.
   Nenhum primitivo ou z-index global alterado. Repetição das quatro resoluções aprovada.

## Comparação visual e estados

Análogo aprovado: **RolagemRapida da ficha completa**, moldura do montador Completo e controles
da rolagem avulsa da campanha do mestre. O principal inspecionou pessoalmente capturas das
superfícies renderizadas, incluindo desktop/celular e recortes notebook/tela dividida.

Mesma família visual, densidade e hierarquia; moldura, ícones, barras e estados canônicos.
Barra do NPC e rolador do mestre reutilizam `RolagemRapida`; avulso reutiliza `MontadorRolagem`,
`Campo`, `Botao` e `BotaoIcone`, com tamanhos/variantes explícitos. Não foi criado primitivo.
Sem overflow horizontal nas medições da matriz principal; fechamentos do montador atingíveis.
Alvos de fechar no mobile medidos com 44×44 px. Foco voltou ao gatilho após fechamento.
Os estados inválido/avançado mantêm leitura e contraste do análogo; janela mobile ocupa a tela.

Além da matriz: montagem de `LUTd20kh1cm1 + PROF` **por clique** em modelo; edição/rolagem
na ficha flutuante e nas cenas do jogador; fórmula avançada `FOR+FURTIVO[Q]` preservada;
arraste e maximizar/restaurar nos três tamanhos desktop; minimizar/reabrir e Escape nos quatro.
No NPC, o ancestral `container-type:inline-size` não deslocou a janela em relação ao viewport.
Não foi necessária alteração desse container.

## Histórico e privacidade

Rolagem pública do novo rolador da cena (`1d6 + 101`) chegou ao feed do jogador sem recarregar
(`window.__sentinela` preservada). Autoria Mestre, `fichaId:null`, sem combatente inventado.
Rolagem privada (`1d6 + 102`) apareceu no feed do mestre, ficou ausente do DOM e da consulta de
feed do jogador. Histórico em janela mostrou o recorte do mestre. Registro local e eco são
deduplicados pelo caminho existente, coberto também nos testes de integração das páginas.
NPC persiste no registro privado já inicializado pela página; leitor não recebe a barra e
edição/salvamento bloqueiam rolagem. Avulso conserva a confirmação para tornar pública e a
rejeição de fontes de ficha; a bandeja é exibida uma única vez, pelo fluxo original.

## Impacto e arquitetura

Buscas: `npm run impacto -- <arquivo>` em `rolagem-rapida.component.ts`,
`npc-visualizacao.component.ts`, `ficha-campanha-card.component.ts` e no componente do montador;
imports, seletores e templates conferidos. Classificação:

| Item | Consumidores e decisão |
|---|---|
| RolagemRapida | Campanha do mestre, criatura, FichaRolagens: preservados; novos NPC e RolagemMestre: pedido. Contrato sem alteração |
| MontadorRolagem | Barra comum preservada; novo avulso: pedido. Método público `abrir()` aditivo para gatilho externo, sem mudar `alternar()` |
| FichaCampanhaCard | Campanha jogador: coluna externa preservada; Investigação, Iniciativa e ficha flutuante: pedido, Rolagens internas visíveis no mobile; prévia sem painel interno não muda |
| NpcVisualizacao | Página dedicada: pedido; sem novo provider, DTO, motor ou regra de Competência |
| Painéis do mestre | Com/sem iniciativa: pedido; componente pequeno concentra visibilidade e persistência, páginas apenas confirmam no feed |

Componentes extensos receberam somente composição/condição local. A responsabilidade nova de
rolagem avulsa das cenas foi extraída para `cena/componentes/rolagem-mestre/`.
Backend, SQL, regras, DTOs e primitivos `shared/ui` sem alteração. A fórmula livre do NPC não
substitui seu teste especializado de atributo/Competência. Convenções/diff revisados no recorte;
nenhum hardcode visual novo, regra duplicada ou bypass de permissão.

Revisão independente: subagente Codex, modelo herdado; encontrou o empilhamento do avulso,
confirmado e corrigido. A hipótese de containment no NPC foi descartada na observação real.
Outro subagente Codex implementou as integrações das cenas; principal revisou e fez o gate visual.

## Gates

- `npx ng test --watch=false` (frontend, gate integrado final): **287 arquivos, 3.580 testes aprovados**.
- `npm run test:regras --workspace=frontend`: **89 aprovados**.
- `npm run test --workspace=shared`: **77 arquivos, 1.340 aprovados**.
- `npm run test --workspace=backend`: **74 arquivos/1.275 aprovados; 8 arquivos/99 testes ignorados** pela configuração existente.
- `npm run lint`: sem erros; avisos legados de formatação permanecem, sem correção em massa.
- `CI=true NG_BUILD_MAX_WORKERS=2 npm run build --workspace=frontend`: produção aprovada;
  aviso não bloqueante de orçamento inicial (603,33 kB / 450 kB).
- Formatação HTML/SCSS dos arquivos tocados e revisão do diff: aprovadas.
- `npm run repo:verificar`: **organização e espelhos aprovados**, após mover spec/anexos para `done/`.

Limites de ambiente: testes no sandbox inicialmente falharam antes da coleta por `EPERM` no cache
temporário; repetidos fora do sandbox. Build sem rede falhou na fonte Google e execução habitual
teve a falha nativa P-111; contorno **já documentado** com CI/dois workers passou, sem apagar cache
nem alterar configuração. A primeira suíte ampla revelou mock `matchMedia` com atribuição a
propriedade somente leitura; o teste da campanha agora restaura o descritor original em `finally`.
Suíte integrada completa repetida e aprovada. Não se atribui essa fragilidade ao comportamento do produto.

Verificação visual realizada em Chromium, base escura. Não há declaração de matriz multibrowser
ou auditoria geral de acessibilidade; esses recortes não foram exigidos por esta spec.
Campanha 141 e fichas 488/489/490 de teste removidas por soft delete via API local, com resposta
200 em todos os casos; não foram alteradas as fichas usadas como fonte da fixture.
Sem pendência funcional identificada no recorte solicitado. Commit autorizado pelo autor após o fecho; sem push.
