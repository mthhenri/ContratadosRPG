# Caderno do Esquadrão colaborativo — Design

## Objetivo

Adicionar ao utilitário Caderno uma terceira origem, **Caderno do Esquadrão**. Ela pertence à
campanha, não a uma pessoa: todo membro ativo pode consultá-la, criar páginas, renomeá-las e
editá-las ao mesmo tempo. Somente o mestre pode excluir páginas.

Ao contrário de **Meu caderno** e **Cadernos dos jogadores**, o conteúdo compartilhado deve
convergir sem conflitos quando duas ou mais pessoas escrevem na mesma página. A alteração aparece
nos demais editores abertos enquanto a pessoa digita, sem recarregamento manual e sem a perda de
texto do controle de versão otimista usado nos cadernos privados.

## Decisões confirmadas

- O Caderno do Esquadrão é um terceiro modo da mesma janela flutuante já existente. Os outros dois
  modos e suas permissões não mudam.
- Todo membro ativo — mestre ou jogador — pode listar, abrir, criar, renomear e editar as páginas
  compartilhadas.
- Somente o mestre pode excluir uma página compartilhada.
- O conteúdo usa colaboração real: edições concorrentes são mescladas, não substituídas nem
  interrompidas por uma tela de conflito.
- O título segue a mesma política colaborativa do conteúdo: participantes podem renomeá-lo, e o
  último valor convergente do documento é exibido para todos.
- O Caderno do Esquadrão continua usando Markdown sem HTML, imagens ou anexos. O Markdown
  materializado permanece pesquisável pela busca textual da campanha.

## Alternativas avaliadas

1. Reaproveitar o `PUT` atual e emitir a página inteira via Socket.IO. Foi descartado: duas pessoas
   ainda sobrescreveriam o texto uma da outra entre autosaves.
2. Usar um serviço colaborativo externo. Foi descartado por acrescentar infraestrutura, autenticação
   e operação separadas para um único recurso da aplicação.
3. Integrar o editor Milkdown a um documento Yjs persistido pelo backend da aplicação. Escolhido:
   o plugin oficial do Milkdown foi feito para esse protocolo, preserva cursores remotos e merge de
   operações, e o NestJS continua dono da autorização e da persistência.

## Arquitetura e dados

### Documento e página

`pagina_caderno` ganha uma categoria de posse explícita: privada (o comportamento existente) ou
esquadrão. Uma página de esquadrão não tem autor proprietário; ela referencia a campanha e tem um
estado CRDT binário persistido. A coluna `conteudo_markdown` permanece como projeção legível do
estado colaborativo, usada pela busca PostgreSQL e como recuperação segura para clientes novos.

O estado binário não substitui a projeção Markdown: ele é a fonte operacional para merge, enquanto
o Markdown é a fonte de leitura, visualização e indexação. O título também fica no documento
colaborativo para que renomeações concorrentes converjam sob a mesma sessão.

Uma migration cria as colunas e índices necessários, migra as páginas existentes como privadas e
mantém o `tsvector` atualizado a partir do título e do Markdown projetado. Não há alteração nem
migração de conteúdo dos cadernos pessoais.

### Contratos e API

Os contratos compartilhados passam a distinguir o tipo de caderno e as permissões derivadas. Os
endpoints privados permanecem compatíveis. A nova família de endpoints recebe a campanha na rota e
sempre verifica que o requisitante é membro ativo:

- listar e criar páginas do caderno do esquadrão;
- recuperar a página compartilhada;
- enviar uma atualização CRDT para uma página existente;
- excluir uma página compartilhada, restrito ao mestre;
- obter o estado CRDT completo quando uma sessão precisa se recuperar.

Atualizações colaborativas chegam ao backend por REST, são autorizadas e persistidas antes do
broadcast. Assim, o gateway existente continua broadcast-only: nenhum conteúdo é aceito como
escrita pelo Socket.IO. O evento contém a atualização já persistida e o identificador da página;
clientes que o recebem a aplicam ao documento Yjs aberto. A reconexão recupera o estado atual pelo
REST antes de retomar a edição.

O evento é emitido apenas na sala da campanha, que já é acessível somente a membros. Ainda assim,
o serviço é o árbitro: todos os endpoints e a emissão pós-persistência exigem vínculo ativo. Ao
perder o vínculo, o cliente descarta o documento aberto e não recebe conteúdo novo.

### Editor e presença

O `EditorMarkdown` recebe um modo colaborativo independente do modo atual de Markdown comum. No
modo esquadrão ele usa a integração oficial Milkdown + Yjs, ligando um documento por página. O
adaptador do editor encaminha atualizações locais ao endpoint REST, aplica atualizações remotas sem
reemitir digitação e fecha o documento ao trocar de página, campanha ou modo.

O editor mostra quem está presente e o cursor/seleção remotos com nome e cor derivados do membro
da campanha. Essa presença é efêmera: não é salva nem aparece na busca. Falha de rede deixa a
edição local em fila; ao reconectar, as operações pendentes são enviadas e mescladas ao estado mais
recente. A interface sinaliza “Reconectando” enquanto não houver confirmação do backend.

### Interface

Na janela do Caderno, a barra segmentada passa a ter:

- **Meu caderno** — inalterado, editável apenas pelo próprio autor;
- **Caderno do Esquadrão** — editável por qualquer membro, com indicador de participantes quando
  uma página está aberta;
- **Cadernos dos jogadores** — visível somente ao mestre e estritamente somente leitura.

O padrão visual de referência é o próprio `CadernoFlutuante`, combinado com
`CalculadoraFlutuante` e `LeitorDocumentos`: mesma casca, densidade, cabeçalho, controles e
comportamento desktop/mobile. No modo Esquadrão, criar e renomear ficam disponíveis a todos;
excluir só aparece para mestre. Estados vazios, carregando, desconectado, sincronizando e permissão
revogada têm mensagens próprias, sem revelar texto antigo.

Na busca unificada, entra a fonte combinável **Caderno do Esquadrão**, autorizada a todo membro
ativo e selecionada por padrão. Um resultado abre a página compartilhada no modo correto.

## Fluxos importantes

1. Ao abrir uma página de esquadrão, o cliente recupera o snapshot persistido, entra/garante a sala
   da campanha e conecta o documento Yjs ao editor.
2. Cada edição local gera uma operação CRDT. O cliente a envia por REST; após persistir, a service
   projeta Markdown/título e o gateway transmite a operação à campanha. A origem pode aplicar a
   confirmação sem duplicar a edição; os demais clientes a mesclam imediatamente.
3. Ao reconectar, o cliente recupera o snapshot completo, aplica operações locais ainda pendentes e
   só então declara a página sincronizada.
4. Criar uma página gera o documento colaborativo inicial. A criação é anunciada na campanha para
   atualizar as listas abertas.
5. Ao excluir, a service confirma mestre e soft-delete. A campanha recebe uma invalidação; qualquer
   editor aberto fecha a página, limpa rascunho e não expõe o texto removido.

## Falhas e limites

- Documento inexistente, removido ou campanha inexistente: 404.
- Não membro ou jogador tentando excluir: 403.
- Atualização CRDT inválida, maior que o limite ou que não possa ser aplicada: 400, sem alterar o
  snapshot existente.
- Queda de rede: operações locais aguardam reenvio; nunca se converte a edição do esquadrão no
  conflito “Recarregar versão” dos cadernos privados.
- A autorização é revista em toda escrita REST. Reconexão e eventos nunca são fonte de permissão.
- Não entram nesta entrega: comentários, histórico navegável de versões, restauração de página,
  anexos/imagens, permissões por página, cadernos compartilhados entre campanhas ou colaboração em
  cadernos privados.

## Verificação

### Backend, shared e banco

- Testar os contratos de posse/permite edição e as permissões: membro cria, lista, recupera e
  atualiza; só mestre exclui; não membro não recebe metadado, snapshot nem operação.
- Testar que duas atualizações concorrentes, em ordens diferentes, convergem para o mesmo estado e
  preservam alterações independentes.
- Testar persistência e recuperação do snapshot, projeção Markdown e indexação da busca.
- Testar remoção lógica, invalidação da página aberta e recuperação após reconexão.
- Testar que os fluxos privados conservam a concorrência otimista e a regra de leitura dos cadernos
  de jogadores.

### Frontend e inspeção visual

- Testar a terceira aba, visibilidade por papel, ações de criar/renomear/excluir e a abertura de
  resultado de busca no modo Esquadrão.
- Testar dois clientes na mesma campanha editando simultaneamente o mesmo texto, título e páginas
  distintas; conferir convergência, presença, cursor remoto e reconexão sem perda.
- Usar a aplicação real em `1920×1080` e `360×800`, comparando com o `CadernoFlutuante` atual nos
  estados fechado, aberto, minimizado, página vazia, edição simultânea, desconectado, reconectado,
  exclusão e busca. Confirmar foco, contraste, alvos de toque e ausência de overflow.

## Arquivos e áreas afetadas

- `shared/src/dtos/pagina-caderno/`, `shared/src/enums/` e validadores: contrato público e limites.
- `backend/src/database/migrations/`: modelo e projeção pesquisável.
- `backend/src/modules/pagina-caderno/`: autorização, persistência e sincronização.
- `backend/src/core/gateway/`: eventos pós-persistência para campanha.
- `frontend/src/app/core/services/tempo-real.service.ts`: consumo dos eventos colaborativos.
- `frontend/src/app/modules/pagina-caderno/`: modos, estado da janela, adaptador Yjs/Milkdown e UI.
- `docs/context/`: atualizados somente no encerramento da implementação.
