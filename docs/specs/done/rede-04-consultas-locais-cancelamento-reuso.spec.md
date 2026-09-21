# rede-04-consultas-locais-cancelamento-reuso.spec.md

> Task avulsa de frontend, originada pela revisão de requisições de 2026-09-20. Quarto corte da
> frente `rede-*`: aplica cancelamento e reuso local em telas sem dependência de WebSocket.

## Objetivo

Evitar consultas obsoletas na Gestão de usuários e recargas de dados invariantes no Acervo de
fichas. O estado visível deve sempre corresponder à intenção mais recente do usuário, sem criar
cache global ou mudar contratos do backend.

## Entregáveis

1. **Pipeline único dos filtros administrativos.** Busca, tipo, situação e página alimentam uma
   única intenção de listagem. Busca textual mantém debounce de 300 ms e comparação distinta;
   mudança categórica ou de página é imediata. Cada nova intenção usa `switchMap` para cancelar a
   assinatura anterior e somente a resposta mais recente atualiza usuários, totais e carregamento.
2. **Carga inicial pelo mesmo pipeline.** A primeira listagem nasce da intenção inicial, sem uma
   chamada imperativa paralela no construtor. Aplicar filtros volta à página 1 uma vez, sem emitir
   uma consulta intermediária com a página antiga.
3. **Mutações administrativas invalidam uma vez.** Criar, alterar perfil/senha/tipo, excluir ou
   reativar fecha o editor e dispara uma única nova intenção após sucesso. Enquanto a listagem
   pós-mutação estiver em voo, outra mudança de filtro a substitui sem uma resposta antiga
   sobrescrever o novo recorte.
4. **Carregamento resistente a cancelamento.** O indicador da Gestão representa a geração ativa;
   `finalize` de uma request cancelada não pode marcar a tela como ociosa enquanto a próxima ainda
   está em voo. Erro mantém os últimos dados válidos e libera somente o carregamento da geração
   correspondente; a notificação continua responsabilidade do interceptor.
5. **Acervo separa dados por volatilidade.** A carga inicial continua buscando em paralelo
   `listarMinhasFichas` e `listarCampanhas`, mas os dois caminhos ganham métodos independentes.
   Operações de ficha nunca repetem `listarCampanhas` quando vínculo/papel de campanha não mudou.
6. **Atribuição atualiza localmente.** Após `atribuirCampanha`, usar o DTO retornado e a campanha já
   carregada para alterar `campanhaId`/`campanhaNome` da ficha correspondente, nos dois sentidos,
   sem GET de fichas ou campanhas. Se a resposta não identificar a ficha/campanha final de forma
   suficiente, ajustar o DTO da própria operação em `shared` com campos explícitos — nunca buscar
   toda a lista como contorno.
7. **Duplicação recarrega somente fichas.** Depois de `duplicarFicha`, executar no máximo um
   `listarMinhasFichas` para obter o resumo canônico do clone; `listarCampanhas` não é chamado.
   Exclusão continua removendo localmente e nenhuma operação muda a ordenação/agrupamento atual.

## Critérios de Aceite

- Digitar três caracteres dentro dos 300 ms produz exatamente uma request com o termo final.
- Com uma busca em voo, mudar tipo/situação cancela a assinatura anterior; mesmo que o mock da
  resposta antiga seja resolvido depois, somente o filtro novo aparece na tela.
- Aplicar qualquer filtro estando na página maior que 1 produz uma única request já com
  `pagina=1`; não há request intermediária com a página anterior.
- Cada mutação administrativa bem-sucedida produz exatamente uma nova listagem. Falha produz zero
  recargas adicionais e preserva os dados anteriores.
- No Acervo, atribuir ou remover uma ficha de campanha produz somente a request da mutação e
  atualiza o chip correto; duplicar produz a mutação e um único GET de `minhas`; nenhuma das três
  ações chama `listarCampanhas`.
- A carga fria do Acervo continua fazendo exatamente dois GETs em paralelo e mantém os mesmos
  estados vazio, filtros por tipo e permissões para criar criatura.
- Testes focados das duas páginas, suite completa do frontend, `npm run lint --workspace=frontend`
  e `npm run build --workspace=frontend` ficam verdes.

## Fora de Escopo

- Cache global de campanhas, fichas ou usuários; persistência em `localStorage`; service worker ou
  ETag.
- Mudar paginação, ordenação, filtros disponíveis ou layout das telas.
- Atualização em tempo real da Gestão ou do Acervo.
- Otimizar páginas de campanha, ficha ou encontro — cobertas pelas demais specs `rede-*`.
- Alterar consultas SQL ou permissões do backend, salvo eventual complemento estritamente
  necessário de `FichaCampanhaAtribuidaDto` descrito no entregável 6.

## Dependências

- Nenhuma spec precisa estar em `done/`; pode ser executada em paralelo a `rede-01` e `rede-02`.
- Se `FichaCampanhaAtribuidaDto` precisar mudar, aplicar a skill `dto-conventions` e regenerar os
  contratos OpenAPI conforme o fluxo do projeto.

## Riscos e Mitigação

- **Debounce atrasa filtros categóricos.** Somente busca textual espera 300 ms; tipo, situação e
  página emitem imediatamente pelo mesmo coordenador.
- **Cancelamento deixa loading falso cedo demais.** Estado é vinculado à geração/intenção ativa,
  não ao `finalize` indiscriminado de qualquer request.
- **Patch local do Acervo diverge do backend.** O retorno da mutação é a autoridade para ids; o
  nome vem da campanha já carregada. Dado ausente deve ampliar o contrato explícito, não ser
  inferido de texto ou obrigar refetch das duas coleções.
