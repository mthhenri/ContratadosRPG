# rede-03-invalidacao-seletiva-tempo-real.spec.md

> Task avulsa de frontend/backend, originada pela revisão de requisições de 2026-09-20. Terceiro
> corte da frente `rede-*`: depois do ciclo de vida correto das salas e da carga inicial única,
> reduz o trabalho provocado pelos broadcasts sem confiar em payload inadequado ao recorte.

## Objetivo

Fazer cada evento em tempo real invalidar somente o recurso que pode ter mudado, agrupando eventos
da mesma mutação e descartando respostas obsoletas. Prévia de jogador e Painel do espectador
continuam buscando do backend os recortes seguros, mas deixam de reconstruir uma projeção completa
quando só o encontro ativo mudou.

## Entregáveis

1. **Projeções estreitas de encontro ativo.** Expor, no módulo `campanha-projecao`, GETs de leitura
   para:
   - `/campanha/:id/painel-espectador/encontro-ativo`;
   - `/campanha/:id/previa-jogador/:usuarioAlvoId/encontro-ativo`.
   As rotas delegam respectivamente a
   `EncontroService.recuperarEncontroAtivoParaEspectador` e
   `recuperarEncontroAtivoParaAlvo`, após os mesmos gates já usados pelas projeções completas.
   Retornam `EncontroRecuperadoDto | null`; não criam um segundo formato de encontro nem aceitam
   identidade do cliente no corpo.
2. **Painel do espectador atualiza só encontro.** `encontro:alterado`, filtrado pela campanha
   atual, chama exclusivamente o endpoint estreito e substitui `encontroAtivo`. Não busca
   identidade, fichas, membros nem rolagens e não altera paginação/feed.
3. **Coordenador de invalidação da Prévia de jogador.** Os eventos são convertidos em intenções
   (`projecao`, `ficha-exibida`, `inventario`, `encontro`) e processados por fluxo cancelável
   (`switchMap`) com uma pequena janela de agrupamento. Dentro da mesma janela:
   - invalidação da projeção absorve invalidação de encontro, pois a projeção já o contém;
   - cada categoria executa no máximo uma request;
   - somente a resposta da execução mais recente pode escrever nos Signals.
   `ficha:alterada` ainda refaz a projeção segura e, se for a ficha aberta, sua recuperação
   dedicada; `encontro:alterado` isolado usa somente o endpoint estreito.
4. **Detalhe de campanha separa recursos.** Em `CampanhaDetalheDadosService`, eventos de ficha
   (`criada`, `alterada`, visibilidade e remoção) recarregam somente a lista de fichas; eventos de
   membro recarregam somente membros; inventário e estado mantêm seus caminhos próprios. A
   reconexão continua ressincronizando todos os recursos que podem ter mudado durante a queda.
5. **Filtros antes de trabalho.** Todo consumidor confere `campanhaId`, `fichaId` ou o conjunto de
   fichas atualmente inscritas antes de produzir invalidação. Evento de sala/contexto alheio é
   ignorado mesmo como defesa adicional ao `rede-01`.
6. **Payload seguro continua prevalecendo.** Páginas normais de ficha e encontro podem absorver
   payload completo já redigido para o socket, como hoje. Painel do espectador e Prévia de jogador
   nunca usam diretamente `EncontroAlteradoDto.encontro`, porque o socket do mestre carrega o
   recorte real do mestre, não o papel simulado.
7. **Estado de carregamento sem corrida.** Finalização de uma request cancelada/antiga não pode
   esconder o carregamento de uma request mais nova. O coordenador mantém estado por categoria ou
   por geração, sem `finalize` concorrente escrevendo booleano global incorreto.

## Critérios de Aceite

- No Painel do espectador, um `encontro:alterado` gera exatamente um GET de encontro ativo e zero
  GETs da projeção completa, fichas, membros ou rolagens; campanha alheia gera zero requests.
- Na Prévia de jogador, `ficha:alterada` seguida pela ponte deliberada
  `sincronizarFichaAlterada → encontro:alterado` dentro da janela resulta em no máximo um GET da
  projeção completa e, quando a ficha está aberta, um GET da ficha; não há GET estreito redundante
  do encontro.
- `encontro:alterado` isolado na Prévia gera somente um GET estreito e preserva equipe, feed,
  inventário e seleção da ficha.
- Uma rajada de eventos equivalentes enquanto uma carga está em voo cancela a assinatura anterior;
  resolver respostas fora de ordem deixa os Signals com a resposta da intenção mais recente.
- No detalhe da campanha, `ficha:alterada` faz uma chamada a `listarFichas` e nenhuma a
  `listarMembros`; `membro:entrou` faz uma chamada a `listarMembros` e nenhuma a `listarFichas`;
  reconexão faz ambas uma vez.
- Testes backend dos endpoints estreitos cobrem mestre em prévia, espectador real, jogador
  recusado, alvo que não é jogador, campanha inexistente e `null` quando não há encontro ativo.
- Verificação real com dois usuários e skill `verify`: editar uma ficha combatente atualiza ficha,
  resumo e Iniciativa; as contagens da aba Network respeitam os limites acima; espectador e prévia
  exibem exatamente o mesmo recorte seguro após a atualização.
- Testes focados e suites completas de backend/frontend, `npm run lint` e builds afetados ficam
  verdes.

## Fora de Escopo

- Trocar o modelo broadcast-only, enviar mutações por socket ou confiar no payload do mestre em
  telas de simulação de outro papel.
- Cache global de projeções autenticadas.
- Otimizar a carga inicial duplicada — responsabilidade de `rede-02`.
- Alterar o conteúdo dos eventos existentes ou a matriz de visibilidade, salvo os novos GETs
  estreitos de leitura.
- Atualização otimista de `FichaResumoDto` a partir de `ficha:criada`; a lista autorizada continua
  vindo do backend para não revelar ficha fora do recorte.

## Dependências

- `rede-01-ciclo-vida-salas-tempo-real.spec.md` em `done/`.
- `rede-02-carga-inicial-projecoes.spec.md` em `done/`.
- `docs/SYSTEM.SPEC.md` §9 e §14; skill `tempo-real`; skill `verify`.

## Riscos e Mitigação

- **Agrupamento esconde uma atualização necessária.** Intenções têm precedência explícita e a
  projeção completa absorve apenas os recursos que ela realmente contém; inventário e ficha
  completa permanecem categorias próprias.
- **Janela grande deixa a interface atrasada.** Usar somente o menor intervalo que agrupe eventos
  da mesma mutação; teste funcional não depende do valor exato em milissegundos.
- **Resposta cancelada ainda terminou no servidor.** `switchMap` garante consistência no cliente;
  o ganho principal vem do agrupamento e dos endpoints estreitos, não da suposição de cancelamento
  do trabalho já recebido pelo backend.
