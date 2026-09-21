# rede-02-carga-inicial-projecoes.spec.md

> Task avulsa de frontend/backend, originada pela revisão de requisições de 2026-09-20. Segundo
> corte da frente `rede-*`: elimina cargas integrais descartadas durante a navegação e reduz a
> latência interna das projeções compostas.

## Objetivo

Carregar o Painel do espectador e a Prévia de jogador uma única vez por navegação, usando o mesmo
resultado tanto para autorização quanto para renderização inicial. Depois da autorização, as
consultas independentes que compõem cada projeção devem executar em paralelo, sem enfraquecer o
recorte de segurança.

## Entregáveis

1. **Resolver do Painel do espectador.** Substituir `espectadorCampanhaGuard` por um resolver de
   rota que chama `recuperarPainelEspectador(id, 1, 20)` uma única vez (a mesma quantidade
   canônica já usada pela página), entrega o
   `CampanhaPainelEspectadorDto` em `ActivatedRoute.data` e redireciona falha para
   `/acesso-negado`. O componente semeia campanha, encontro, fichas, membros, rolagens e paginação
   com esse payload; não repete o GET no construtor. `carregarMais` continua pedindo só páginas
   posteriores.
2. **Resolver da Prévia de jogador.** Substituir `previaJogadorCampanhaGuard` por resolver análogo
   que chama `recuperarPreviaJogador(id, usuarioAlvoId)` e entrega o resultado à página. A página
   inicializa a projeção e escolhe a ficha inicial com esses dados, sem segundo GET integral.
3. **Redirecionamento sem render parcial.** Erros de permissão, campanha inexistente ou alvo
   inválido são tratados pelo resolver antes de montar o componente; nenhuma página dispara
   requests dependentes (inventário ou ficha completa) quando a projeção inicial falha.
4. **Responsabilidades preservadas.** O resolver não reimplementa papel/permissão e não mantém
   cache global. Toda navegação nova volta ao backend; apenas guard e página da mesma navegação
   deixam de repetir o mesmo trabalho. O GET separado de `listarCampanhas()` usado para distinguir
   a prévia do mestre no Painel do espectador permanece nesta task, pois seu payload e sua regra
   são diferentes da projeção segura.
5. **Projeções backend concorrentes após os gates.** Em
   `CampanhaProjecaoService.recuperarPainelEspectador`, validar existência e papel antes de buscar
   conteúdo; depois disso, fichas, membros, rolagens e encontro ativo independentes rodam com
   `Promise.all`. Em `recuperarPreviaJogador`, validar mestre e concluir primeiro
   `listarFichasParaAlvo` (que também valida o alvo); somente então membros, rolagens e encontro
   ativo independentes rodam em paralelo. Erro continua abortando a resposta inteira.
6. **Métricas determinísticas nos testes.** Specs de rota/página contam chamadas do service e
   garantem que o payload resolvido é consumido sem nova assinatura HTTP; specs backend usam
   promessas controladas para provar que as operações independentes foram iniciadas antes de uma
   delas resolver, sem teste baseado em relógio.

## Critérios de Aceite

- Abrir diretamente `/campanhas/:id/espectador` produz exatamente um GET de
  `painel-espectador` antes da primeira renderização, com `pagina=1` e a quantidade real da página;
  não existe request preparatório com `itensPorPagina=1`.
- Abrir diretamente `/campanhas/:id/previa/:usuarioAlvoId` produz exatamente um GET da projeção de
  prévia; inventário e ficha completa só começam depois de o resolver autorizar a rota.
- Em falha dos dois resolvers, a navegação termina em `/acesso-negado`, os componentes não são
  criados e nenhum GET dependente é registrado pelo `HttpTestingController`.
- Paginar o feed do espectador continua anexando a página seguinte sem substituir os itens já
  carregados nem repetir a página 1.
- Testes de `CampanhaProjecaoService` comprovam: conteúdo protegido não inicia antes do gate de
  papel/alvo; depois do gate, as consultas declaradas independentes ficam simultaneamente em voo;
  os DTOs e recortes retornados não mudam.
- Verificação real com Network/skill `verify`: uma carga fria de cada rota apresenta os mesmos
  estados e dados de hoje e confirma a contagem acima, sem flash da página antes do redirecionamento.
- Testes focados e suites completas de backend/frontend, `npm run lint` e builds afetados ficam
  verdes.

## Fora de Escopo

- Cache entre navegações, `shareReplay` global, service worker, ETag ou política HTTP de longa
  duração para dados autenticados.
- Remover `listarCampanhas()` do Painel do espectador; isso exigiria mudar o contrato de produto
  que hoje mantém a projeção idêntica para espectador real e mestre em prévia.
- Alterar eventos ou refetch de tempo real — responsabilidade de `rede-03`.
- Agregar todas as cargas das páginas de campanha, ficha ou encontro num endpoint universal.
- Alterar conteúdo, paginação ou regras de visibilidade das projeções.

## Dependências

- `docs/SYSTEM.SPEC.md` §8, §9 e §14.
- `m8-espectadores-campanha` já implementado; as specs históricas em `done/` são somente leitura.
- Nenhuma dependência de `rede-01`; as duas tasks podem ser executadas separadamente.

## Riscos e Mitigação

- **Resolver vira cache acidental.** Seu resultado vive somente na navegação atual; atualização em
  tempo real continua a cargo da página.
- **Paralelização começa trabalho para usuário não autorizado.** Toda consulta de conteúdo nasce
  apenas depois dos gates descritos no entregável 5.
- **Teste de concorrência fica instável.** Usar promessas manualmente controladas e verificar
  chamadas iniciadas, nunca comparar milissegundos.
