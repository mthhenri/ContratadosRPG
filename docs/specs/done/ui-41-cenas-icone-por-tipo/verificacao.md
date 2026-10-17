# UI-41 — verificação em 2026-10-17

## Entrega e decisões

Votos do autor: Investigação B (Pista no dossiê), Combate A (Lâminas cruzadas),
Perseguição B (Trajetória), Resistência B (Pilar), genérico B (Claquete).
Furtiva usa o homem encapuzado solicitado expressamente depois da votação.
Os seis desenhos são originais, com autoria registrada junto dos glifos.
A prancha original e os votos ficam juntos da spec, em `prancha-notas.md`.

`ICONE_TIPO_CENA` cobre os cinco valores de `CenaTipoEnum`; `ICONE_CENAS` e
`iconeTipoCena` centralizam o fallback. O jogador usa a cena ATIVA na coluna e
no menu mobile, com tooltip do tipo. Sem cena ativa, volta à claquete e “Cenas”.
A prévia usa uma leitura autorizada do painel do espectador já usada na prévia
de Investigação; não exibe payloads de mestre nem consulta cenas planejadas.

O autor aprovou também mestre, hub, cabeçalhos e seletor. O seletor conserva o
controle nativo e usa `Campo[icone]` para o tipo selecionado; as opções continuam
textuais. O glifo legado `combate` permanece intacto nos demais sentidos.

## Análogos e impacto

Análogos registrados antes da edição: item Cenas da própria coluna de ações,
menu mobile existente, chips do hub, títulos dos painéis e Campo com ícone da
busca da Biblioteca. Preservados shell, densidade, hierarquia, tokens e controles.
Nenhum primitivo ampliado, nenhum dropdown ou CSS alternativo criado.

Busca inicial: `npm run impacto -- --icone combate` (16 consumidores e um teste),
complementada por bindings, arrays de navegação e mapa de domínio. O desenho antigo
não muda: usos como Iniciativa, ferramentas e referências de combate continuam iguais.

| Consumidor | Classe | Decisão |
|---|---|---|
| Campanha do jogador, coluna e menu mobile | pedido | Tipo ativo e fallback, tooltip e atualização sem recarga |
| Campanha do mestre e prévia do jogador | acompanha aprovado | Mesmo mapa; prévia mantém a projeção segura |
| Hub, estados vazios e chips de tipo | acompanha aprovado | Claquete genérica e ícone por tipo |
| Painéis de mestre/jogador, com e sem iniciativa | acompanha aprovado | Ícone do tipo no título existente |
| Cena do espectador e prévia de Investigação | acompanha aprovado | Mesmo ícone no cabeçalho existente |
| Nova cena | acompanha aprovado | Ícone no campo de tipo selecionado |
| Demais usos do glifo `combate` | preservado | Glifo e comportamento anteriores |

`npm run impacto -- --simbolo entrarSalaCampanha` levantou 18 consumidores e
25 testes (inclui gateway e ocorrências de teste). Todos os 17 caminhos frontend
foram classificados: somente o novo observador de cena da campanha/prévia assina
a confirmação de ingresso. Espectador, histórico de rolagens, hub, prévia de
Investigação, Biblioteca, encontros, fichas e Caderno conservam APIs, contagem de
referências e comportamento anterior. Gateway e contratos compartilhados intactos.

## Tempo real e revisão independente

`CenaService` do backend continua emitindo `cena:alterada` depois da mutação na
sala autorizada de campanha. O novo observador invalida sua leitura REST por evento
da mesma campanha, reconexão e ingresso confirmado na sala. `switchMap` cancela a
consulta anterior, impedindo uma resposta antiga de restaurar o ícone errado.
Erros de leitura deixam o fallback, sem encerrar a assinatura.

O subagente Codex da prancha também fez uma revisão independente de estado,
permissões e sincronização. Encontrou uma janela entre GET inicial e entrada
assíncrona na sala: uma troca nesse intervalo poderia não chegar ao jogador.
Corrigida com `campanhaIngressada$`, emitida somente após o ack de sucesso já
existente do gateway, inclusive no primeiro connect. A confirmação tardia é
ignorada após saída da sala ou troca de socket. `reconexao$` mantém sua semântica
anterior para todos os outros consumidores. Testes cobrem confirmação autorizada,
recusa, primeiro connect, reconexão, saída/logout e nova leitura após ingresso.

## Aplicação real e comparação pessoal

PostgreSQL local, API própria isolada em 3101 e frontend em 4301, com proxy/CORS
casados. Dois usuários criados por REST (mestre e jogador), campanha própria e
cenas de todos os tipos. A visão de espectador foi observada pela prévia do mestre.
Dados temporários removidos pelos endpoints de soft delete; somente o processo
de API criado pelo roteiro foi interrompido.

O agente principal inspecionou pessoalmente capturas da aplicação em **1920×1080**
e **360×800**: campanha do jogador, menu mobile aberto, hub, seletor de nova cena,
cabeçalhos dos cinco tipos no mestre/jogador, cena do espectador e prévia de
Investigação. Evidências em `.artifacts/ui-41-cenas-icone-por-tipo/` (ignoradas).

O roteiro abriu/encerrou os cinco tipos e conferiu a geometria efetivamente
renderizada em jogador e prévia, sem recarga. A sentinela da janela permaneceu
intacta. Sem cena ativa, ambos voltaram à claquete. No celular, o menu exibiu o
homem encapuzado. Hub e seletor mostraram os cinco desenhos correspondentes.

Reconexão real: backend próprio interrompido; enquanto offline, somente cenas da
campanha de teste foram alteradas no Postgres, por parâmetros nomeados. Ao voltar,
jogador e prévia convergiram de Investigação para Resistência sem recarregar.

Comparação com os análogos: mesma família de traço, densidade e hierarquia;
controles do produto preservados; ausência de overflow horizontal; ícones
acompanham o texto e não substituem os rótulos. Alvos de toque existentes e foco
inicial do modal preservados. Os glifos usam cor e contraste do contexto canônico.
A inspeção encontrou sobreposição no seletor, que ainda usava uma receita local
sem recuo de ícone: corrigido usando somente `campo__controle` no select, com
recuo canônico de 36px, e reinspecionado nos dois viewports depois da transição.
A nova UI não parece um formulário HTML genérico.

Limites de escopo: nenhuma alteração de regras, autorização, endpoints ou rotas.
A prévia continua com a capacidade de navegação que já possuía (Investigação).
P-129 das abas mobile, registrado no fecho da UI-40, permanece fora deste recorte.

## Gates

- `npm run test --workspace=frontend -- --watch=false`: **3.506 testes em 279
  arquivos** e **89 testes de regras de texto**, todos passaram. Inclui mapas,
  geometria dos glifos, binding da página e concorrência/reconexão do observador.
- `npm run lint --workspace=frontend`: zero erros; 28.582 avisos de convenções
  no workspace, majoritariamente anteriores, sem correção em massa fora do escopo.
- `npm run build --workspace=frontend`: passou; aviso conhecido de orçamento
  inicial (598,45 kB para limite de aviso de 450 kB).
- Templates revisados contra a spec e primitivos existentes. Passe de
  `convencoes-check` sobre o diff: sem DTO/enum local novo, formulário por ngModel,
  tooltip title, cor/fonte/raio hardcoded ou nova regra de domínio.
- `git diff --check` e `npm run repo:verificar`: passaram; organização e espelhos aprovados na árvore local.

Backend e shared sem mudanças; seus builds e testes não foram repetidos.
