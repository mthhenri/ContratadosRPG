# M4-09 — verificação de listagem e revelação

Data: 2026-09-30. Spec concluída em `docs/specs/done/`.

## Entrega e responsabilidade

`CampanhaFichasEspeciais` integra criaturas e NPCs na campanha usando a listagem já
autorizada do hospedeiro. `CartaoFichaAcervo` continua sendo o cartão comum; criatura
conserva registro, classificação, NA/VD, Vida/Defesa, ficha rápida e menu do mestre.
NPC apresenta Categoria/Nível e abre sua ficha dedicada. Acervo oferece filtro e criação
NPC para o mestre. Fichas especiais deixaram de entrar na projeção de agentes e nos
destinos de inventário que esperam uma ficha de jogador.

`FichaAcessoEstadoService`, fornecido por componente, controla seleção, respostas antigas,
carga/repetição e envio ocupado. Usa os endpoints existentes. Concessão confirmada seguida
de falha de leitura tem erro próprio; não confunde falha com uma lista vazia confirmada.
O backend continua autoritativo. Espectador não é destinatário de ficha completa.

A verificação com dois usuários descobriu que conceder/revogar acesso não invalidava a
listagem da campanha. `FichaService` agora emite o evento existente de visibilidade após
persistir; nenhuma emissão em falha ou concessão idempotente. Sem endpoint, DTO, regra
ou schema novo. As páginas refazem sua consulta autorizada, sem projetar acesso do evento.

## Gate visual pessoal

| Recorte | Análogo aprovado | Reuso conferido |
|---|---|---|
| Listagem e filtro | Acervo e Esquadrão do mestre | CartaoFichaAcervo, Cartao com cabeçalho quebrável, Campo compacto, ícones canônicos e BEM |
| Criação e ações | Acervo e ficha NPC | Botao com variante, estilo e tamanho médio; rotas dedicadas |
| Acesso seletivo | Diálogo da ficha NPC | Modal, Campo padrão, Cartao, EstadoVazio com slot de ação e Esqueleto |
| Leitor | Painel do jogador | Mesmo cartão, apenas fichas autorizadas; sem controles de gestão |

Aplicação real: Angular 4300, NestJS 3100 e Postgres local. Cenário próprio da verificação,
com mestre, jogador e espectador stub; não foram modificadas campanhas do autor.
Capturas renderizadas inspecionadas pessoalmente, comparadas com os análogos.

Viewports: **1920×1080, 1366×768, 960×1080 e 360×800**. Matriz percorreu vazio/cheio,
nomes extensos, Todos/NPCs/Criaturas, acesso vazio/concedido/revogado, carga, envio ocupado,
erro de envio conservando seleção, abertura de cada ficha, atalhos e filtro do acervo.
Verificado reflow sem overflow horizontal, controles e foco canônicos, contraste e densidade
compatíveis com o produto. No mobile, ações e concessões empilham e o diálogo rola sem
perder acesso aos controles. Filtro recebeu nome acessível explícito.

Dois navegadores autenticados comprovaram concessão/revogação de ambos os tipos sem F5
nos quatro viewports. Leitor não recebeu botões de gestão. Espectador não apareceu no seletor.
Falha de GET e repetição foram exercitadas na aplicação; ficha rápida de criatura foi aberta.
Reconexão real: API interrompida, somente o acesso temporário revogado no banco durante
indisponibilidade, API restaurada; listagem do jogador e diálogo do mestre recuperaram o
estado correto sem broadcast nem F5, comprovado por sentinelas preservadas nas páginas.

## Gates

- Frontend: `npm run test --workspace=frontend -- --watch=false`, **2702 testes**, 195 arquivos.
- Backend: `npm run test --workspace=backend`, **954 testes**, um skip preexistente, 52 arquivos.
- Builds frontend e backend passaram. Aviso preexistente P-004: inicial 555,92 kB / aviso 450 kB.
- `npm run lint`: zero erros nos três workspaces; avisos legados.
- ESLint dos novos arquivos de estado, componente integrado e projeção: zero erros/avisos.
- Revisão do diff e arquivos novos contra spec, arquitetura e convenções; `git diff --check`.
- Shared não mudou nesta task; motor e contratos conservados. A limitação global de fixture
  P-092 registrada na M4-08b permanece sem relação com esta entrega.

Nenhum gate obrigatório da M4-09 permanece aberto. Capturas e logs em `.superpowers/m4-09-*`
são evidência local ignorada. O cenário descartável será reutilizado e limpo no gate da M4-10.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
