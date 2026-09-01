# swagger-documentacao-api.spec.md

> Task avulsa de infraestrutura e documentação da API REST atual. Não altera contratos de
> negócio: torna-os navegáveis e verificáveis por uma especificação OpenAPI gerada pelo backend.

## Objetivo

Disponibilizar documentação Swagger/OpenAPI completa e confiável para a API NestJS do
Contratados RPG. Quem integra ou mantém o frontend deve conseguir descobrir cada operação REST,
seus parâmetros, corpo, resposta padronizada, regras de autenticação e erros possíveis sem ler as
controllers ou inferir o contrato pelo código.

## Entregáveis

1. **Infraestrutura OpenAPI no backend.** Adicionar a dependência oficial `@nestjs/swagger` e
   configurar no bootstrap um documento OpenAPI 3.x chamado **Contratados RPG API**, com versão
   compatível com a versão atual da aplicação, descrição em português e contatos/links somente
   quando já existirem como informação oficial no repositório. Expor a interface Swagger UI em
   rota estável sob `/api/docs` e o JSON bruto em `/api/docs-json`; as duas rotas são de
   documentação, não substituem nem recebem o envelope `StandardResponse` da API de negócio.

2. **Contrato global explícito.** O documento declara:

   - esquema HTTP Bearer JWT (`Authorization: Bearer <token>`) e que todas as operações são
     protegidas por padrão, exceto as marcadas com `@Public()`;
   - o envelope de sucesso real `StandardResponse<T>` (`sucesso: true`, `dados`, `mensagem`) e
     o envelope de falha real (`sucesso: false`, `dados: null`, `mensagem`, `erros`), sem
     documentar a carga interna retornada pela controller como se fosse a resposta HTTP;
   - os status de erro globais `400`, `401`, `403`, `404`, `409` e `500`, explicando quando cada
     um pode ser emitido pelo guard, pipes e filtro de exceção atuais; cada operação só anuncia
     adicionalmente os erros que lhe forem aplicáveis;
   - paginação (`pagina`, `itensPorPagina`, e os parâmetros próprios de cada endpoint), upload
     `multipart/form-data` com campo `arquivo`, e `204 No Content` quando esta for a resposta
     realmente adotada pela operação. Não inventar status ou formatos que o backend não produz.

3. **Esquemas reaproveitáveis sem duplicar regra de domínio.** Criar, no recorte de
   infraestrutura do backend, modelos/documentadores OpenAPI exclusivamente para representar os
   DTOs públicos e envelopes em runtime. Eles devem derivar seus nomes, campos, obrigatoriedade,
   enums, exemplos e descrições dos contratos existentes em `shared/src/dtos/`,
   `shared/src/enums/` e `shared/src/interfaces/`, preservando estes como fonte de verdade.
   DTOs `Interno`, `JwtPayload`, entidades/repositories e detalhes de persistência não podem
   vazar para a especificação. Como os DTOs de negócio atuais são interfaces TypeScript (sem
   metadados em runtime), a solução escolhida deve isolar a ponte OpenAPI e deixar claro no
   código e nos testes que ela é documentação do contrato público, não uma segunda camada de
   validação nem uma redefinição da API.

4. **Documentação de todas as operações REST existentes.** Decorar e agrupar as controllers por
   tags de domínio, com `operationId` estável, resumo objetivo, descrição quando a permissão ou
   efeito não for evidente, parâmetros tipados, corpo, content type, sucesso e falhas. A cobertura
   inclui, no mínimo, todas as rotas expostas por `health`, `autenticacao`, `usuario`, `campanha`,
   `ficha`, `rolagem`, `pagina-caderno` e `encontro`, inclusive operações aninhadas de acesso,
   inventário, imagem, iniciativa, condição, caderno de esquadrão e busca. Rotas públicas devem
   aparecer sem cadeado; as protegidas, com a exigência JWT. Cada descrição de permissão deve
   refletir a service autoritativa (por exemplo, membro, dono, mestre, administrador), nunca uma
   simplificação inventada na controller.

5. **Métodos e exemplos úteis.** Para cada operação, documentar o verbo e caminho efetivos, a
   finalidade de negócio, campos de rota/query/corpo, enumerações relevantes, formato de retorno
   dentro de `dados` e ao menos um exemplo representativo de sucesso. Os exemplos devem usar dados
   sintéticos e valores válidos do domínio; nunca token JWT, senha real, credencial de ambiente,
   URL assinada ou conteúdo privado de campanha. Operações de upload devem informar MIME/tamanho
   conforme a validação atual, sem prometer formatos ainda não aceitos.

6. **Proteção contra deriva e guia de manutenção.** Criar teste automatizado do backend que gere
   o documento e verifique a disponibilidade das duas rotas, o esquema Bearer, os envelopes
   globais, as tags e a presença de toda a matriz atual de `método + caminho` registrada nesta
   spec. O teste deve falhar se uma operação REST atual ficar sem documentação ou se ela declarar
   uma resposta de sucesso fora de `StandardResponse`. Acrescentar uma seção concisa à
   documentação técnica do projeto explicando onde acessar Swagger, a diferença entre Swagger
   REST e Socket.IO, e a obrigação de atualizar o contrato OpenAPI na mesma task que cria, remove
   ou altera endpoint/DTO público.

### Matriz mínima de cobertura

| Domínio | Rotas que a documentação deve cobrir |
|---|---|
| Operação | `GET /health` |
| Autenticação | registro, login, refresh/encerramento de sessão e demais operações hoje expostas por `AutenticacaoController` |
| Usuários | perfil, senha, administração, alteração de papel e impersonação, conforme `UsuarioController` |
| Campanhas | CRUD, convite, membros, estado e inventário de esquadrão |
| Fichas | CRUD, médias do esquadrão, vitalidade, avatar, acervo, acesso e operações de inventário |
| Rolagens | registro e históricos de ficha, campanha e combatente avulso |
| Caderno | páginas privadas e de esquadrão, estado/alteração colaborativa e busca de campanha |
| Encontros | criação/listagem, combatentes, imagem, identidade, iniciativa, turnos, recursos e condições |

## Critérios de Aceite

- Com backend iniciado na configuração local, `GET /api/docs` exibe Swagger UI e
  `GET /api/docs-json` retorna um documento OpenAPI válido, sem exigir token e sem erro no
  console do servidor.
- O documento lista todos os pares `método + caminho` das controllers REST atuais e cada operação
  tem tag, `operationId`, resumo, segurança correta, parâmetros/corpo quando aplicáveis, resposta
  de sucesso envelopada e erros relevantes. O teste de cobertura protege essa condição.
- `GET /health`, registro/login e as demais rotas `@Public()` são documentadas como públicas;
  uma rota protegida escolhida de cada domínio apresenta Bearer JWT como requisito.
- A UI mostra corretamente um endpoint de paginação, um endpoint com enum, `POST /ficha/:id/imagem`
  ou equivalente multipart e uma operação de exclusão, incluindo os formatos reais de resposta.
- `npm run test --workspace=backend`, `npm run lint --workspace=backend` e
  `npm run build --workspace=backend` terminam sem falha causada pela task. Qualquer falha
  preexistente é identificada separadamente no fecho.
- A documentação técnica informa que WebSocket é broadcast-only e continua fora do escopo do
  Swagger/OpenAPI REST; os eventos seguem documentados na fonte própria do gateway, sem serem
  apresentados como endpoints HTTP.

## Fora de Escopo

- Alterar comportamento, autorização, validação, rotas, DTOs públicos, status HTTP ou envelopes
  para acomodar Swagger.
- Converter os DTOs de negócio compartilhados de interfaces para classes, introduzir
  `ValidationPipe` ou duplicar validadores no backend. Qualquer evolução desse contrato exige uma
  spec própria.
- Gerar cliente HTTP para Angular, SDK externo, portal de desenvolvedores, versionamento de API,
  documentação AsyncAPI/Socket.IO ou publicação pública fora da aplicação.
- Documentar rotas inexistentes, recursos futuros do backlog ou detalhes de banco, JWT e
  armazenamento que não pertencem ao consumidor HTTP.

## Dependências

- `docs/SYSTEM.SPEC.md` §6, §7, §9 e §14 — contratos compartilhados, arquitetura HTTP, tempo
  real e permissões.
- `docs/CONVENTIONS.md` — nomes e separação de responsabilidades.
- Contratos públicos atuais em `shared/src/dtos/`, `shared/src/enums/` e
  `shared/src/interfaces/`.
- Controllers e services atuais em `backend/src/` são o inventário autoritativo das operações e
  permissões até que esta task crie a verificação automática de cobertura.

## Riscos e Mitigação

- **Schema enganoso por interfaces sem runtime:** não deixar o Swagger inferir `object` vazio nem
  criar cópias ad hoc dentro de cada controller. Centralizar a ponte de documentação, testar
  schemas críticos e mantê-la explicitamente vinculada aos DTOs públicos do `shared`.
- **Drift quando uma rota nova entrar:** o teste de matriz de operações deve ser atualizado e
  aprovado na mesma task da rota; uma controller sem tag/operação/resposta documentada é falha de
  conclusão, não dívida posterior.
- **Vazamento de informações internas:** revisar exemplos, DTOs e descrições para não publicar
  payloads internos, segredos, dados reais de campanha ou uma permissão mais ampla que a service
  aplica.
