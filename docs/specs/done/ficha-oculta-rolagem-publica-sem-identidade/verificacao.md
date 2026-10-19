# Verificação — rolagem pública com origem reservada

Concluída em 19/10/2026 no ambiente local isolado (API 3101, SPA 4301,
Postgres real). Produção não foi alterada. Cenário sintético compartilhado com
as duas correções anteriores, preservado para a sequência autorizada.

## Contrato e arquitetura

- `FichaService.avaliarIdentidadeRolagem` consulta a ficha atual e reutiliza
  o árbitro existente. A suspensão é somente de jogador oculto em campanha;
  não transforma concessão de criatura/NPC em suspensão de jogador.
- `RolagemIdentidadeService` aplica o recorte em lotes e exclusão. B/S recebem
  fichaId, combatenteId, nome e cor nulos, com `identidadeReservada`; A/M
  conservam seu recorte. Resultado, fórmula/rótulo e conta autora permanecem.
- Histórico antigo usa o estado atual sem alterar a persistência. REST de
  campanha/ficha, retorno de registro/exclusão e projeções usam o mesmo serviço.
  Prévia usa o alvo; espectador usa identidade nula, inclusive com JWT do mestre.
- Evento público é montado por observador. Geração por campanha impede reutilizar
  cache ou consulta de permissão anterior à invalidação durante envio a várias abas.
  Invalidador só leva campanhaId; alcança também campanhas históricas da ficha.
- O ingresso confirmado também invalida rolagens, cobrindo eventos perdidos entre
  a carga inicial e a assinatura da sala.
- Feeds limpam o recorte anterior, cancelam/rejeitam leituras superadas e mantêm
  tombstones de exclusão. Prévias nunca incorporam payload do mestre. Escrita em
  voo continua; se necessário seu retorno é relido pelo feed autorizado.
- Painel/janela mantêm o teto anterior de 50 itens. Não há novo controle ou CSS.
  Bandeja de uma página de ficha expulsa é limpa, inclusive sua cor copiada.

## Evidência automatizada

Regressões de autoria e feed ficaram vermelhas antes da implementação. Testes
incluem lote por ficha, dono/mestre/terceiros/espectador, concessão suspensa,
criatura, ficha inexistente, projeção do alvo, exclusão, histórico em voo,
invalidação de terceira campanha e WS B1 → C lento → B2 em registro/exclusão.

| Gate | Resultado |
|---|---|
| Shared, suíte completa | 76 arquivos, 1335 testes aprovados |
| Backend, suíte integrada | 1240 aprovados, 99 skipped; última alteração de histórico validada em 23/23 do serviço |
| Gateway, incluindo geração e alteração de papel | 72/72 |
| Frontend, suíte integrada | 285 arquivos, 3579 testes aprovados |
| Preservação do teto 50 após integração | 2 suítes, 24 testes aprovados |
| Build shared/backend e tipos das specs backend | Aprovados |
| Build frontend de produção | Aprovado; aviso de orçamento inicial 599,62 kB / 450 kB |
| Lint dos três workspaces | Sem erros; avisos de estilo existentes no projeto |
| Organização/espelhos | Aprovados na árvore local; gate staged executado antes do commit |

Os 99 testes de integração condicionados à configuração de banco não foram
habilitados nesta rodada; a evidência de banco/HTTP/WS abaixo usa o stack real.
Avisos de navegação jsdom não impediram a suíte do frontend. Alterações do autor
em ícones e arquivo de lançamento ficaram fora do commit desta spec.

## Aplicação real

`verify.cjs` carregou os feeds visíveis, registrou uma pública, ocultou A e
registrou outra. REST e sockets A/B/M/S, prévias M→A/B e M→S conferidos campo
a campo: ambos resultados presentes; B/S sem identidade estruturada; A/M com
identidade. Exibir restaurou a identidade no feed aberto.

Onze páginas/contextos: detalhe B, combate B, espectador S, prévia M→B,
prévia M→S, painel M→S, janela B, janela M→S, janela A, janela M e janela
com GET inicial autorizado retido. A resposta antiga foi liberada depois da
ocultação; não restaurou a identidade. As dez páginas existentes mantiveram
sentinela sem reload.

`reconnect.cjs` abriu seis feeds, derrubou a API isolada, ocultou somente a
ficha sintética diretamente no banco sem emitir evento e reiniciou o build.
B/S/prévias voltaram reservados; A/M conservaram identidade, sem reload.

`extra.cjs` conferiu exclusão REST/WS nos quatro papéis e remoção no feed aberto,
privadas ausentes para B/S e presentes para A/M, NPC com pedido PUBLICA persistido
como PRIVADA, Investigação normal e prévias B/S usando origem reservada.

## Verificação visual e impacto

Análogo: cartão canônico de rolagem, mesma autoria em linha, resultado, controles,
tokens e layout. A origem reservada distingue a ficha oculta da avulsa “Mestre”.
Capturas em 1920×1080, 360×800, 960×1080 e 1366×768 nos contextos acima;
orquestrador inspecionou pessoalmente desktop/mobile de detalhe, combate,
espectador, janela e Investigação/prévia, além dos tamanhos intermediários.
O rótulo cabe, mantém hierarquia/densidade e contraste, sem novos alvos de toque
ou overflow causado pela alteração. No mobile, a aba canônica Rolagens dá acesso
ao histórico. Uma captura encontrou duplicação do mesmo id no detalhe;
o prepend foi corrigido e a regressão cobre o eco duplicado.

`impacto RolagemResumoDto` e mapeamento dos consumidores cobriram feeds,
última rolagem nos cartões, histórico lateral/janela, combate, Investigação,
prévias, autoria e abertura por ficha. Sem fichaId não há associação ao cartão
da ficha oculta; não se reconstrói o vínculo pela conta autora. Notificação
genérica não guarda DTO de ficha. Bandeja é limpa na negação da página.

Revisão independente: duas corridas procedentes corrigidas (cache WS e POST
cancelado); mudança de papel passou a invalidar recorte, inclusive conexão que
perdeu a sala. Consulta SQL nova é somente DISTINCT de campanhas, parametrizada
e com is_deleted=false. Sem controllers com regra, nova herança de DTO,
duplicação de autorização ou alteração de regra do jogo.

Evidências locais ignoradas: `.artifacts/ficha-oculta-rolagem-publica-sem-identidade/`
(scripts, resultados semânticos, capturas e logs). O relatório descreve o
veredito sem depender da disponibilidade desses arquivos. Sem pendência de D-01;
avatar e médias permanecem nas próximas specs.

Delegação: Codex (modelo herdado) — backend/contratos, consumidores de prévia e
revisão independente em recortes da mesma spec; integração e inspeção visual pelo orquestrador.
