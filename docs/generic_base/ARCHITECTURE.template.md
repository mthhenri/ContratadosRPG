# ARCHITECTURE.md — <nome-do-projeto>

> **Leia este arquivo integralmente antes de iniciar qualquer sessão de implementação.**
> Este é o documento de constituição do projeto. Toda decisão técnica e de negócio relevante está
> aqui documentada. Em caso de dúvida sobre qualquer padrão, este arquivo tem precedência sobre
> qualquer outra fonte, exceto a(s) fonte(s) de verdade do domínio listada(s) abaixo.
>
> **Modo de usar este template:** preencha todo trecho entre `<...>`. Apague a seção inteira
> quando ela não se aplicar ao projeto (ex.: §9 se não houver tempo real) — não deixe `<N/A>`
> solto, isso é pior que a seção ausente porque parece esquecimento. As instruções em
> `> Nota do template:` explicam a razão do padrão e o que decidir; remova essas notas do
> documento final.

---

## 1. Visão Geral

**Nome:** <nome-do-projeto>
**Tipo:** <uma linha: o que o sistema é>
**Descrição:** <2-4 frases: para quem é, o que resolve, principais fluxos>

### 1.1 Fontes da Verdade do Domínio

> Nota do template: se o projeto tem regras de negócio complexas e estáveis o bastante para
> merecer documento próprio (fórmulas, tabelas de progressão, políticas regulatórias, regras de
> um jogo, um cálculo financeiro...), documente-as **fora do código**, e declare aqui qual
> documento manda. Se o domínio é simples (CRUD comum), apague esta subseção.

| Documento | Escopo |
|---|---|
| `<caminho/do/documento-de-dominio.md>` | <o que ele cobre> |

Consulte-o(s) antes de alterar qualquer fórmula, tabela ou regra de domínio.
**Em conflito entre código e documento, o documento vence.**

---

## 2. Stack Técnica

> Nota do template: liste a stack real. As seções seguintes deste arquivo (7-12) assumem um
> backend em camadas + frontend + banco relacional + tempo real opcional — adapte a linguagem se a
> stack for diferente (ex.: monolito sem frontend separado, arquitetura serverless, sem banco
> relacional). O que não muda com a stack é a *forma* das decisões: onde a regra de negócio mora,
> como um contrato é compartilhado, como se nomeia algo, o que nunca se faz.

### Backend
- **Runtime:** <...>
- **Framework:** <...>
- **Banco de dados:** <motor, versão, onde roda local/produção>
- **Query layer:** <ORM ou SQL bruto — decida e documente o porquê>
- **Autenticação:** <mecanismo>
- **Tempo real:** <se houver — biblioteca e modelo (broadcast-only? bidirecional?)>
- **Validação:** <biblioteca/camada>

### Frontend
- **Framework:** <...>
- **UI:** <biblioteca de terceiros ou componentes próprios — decida e documente>
- **Estado:** <padrão de estado reativo>
- **Formulários:** <padrão>
- **HTTP:** <cliente>

### Infraestrutura
- **Local:** <como se sobe o ambiente de desenvolvimento>
- **Produção:** <onde cada peça roda>
- **CI:** <o que roda em todo PR>
- **Deploy:** <automático via push, pipeline manual, etc — e quem dispara migration>

---

## 3. Estrutura do Repositório

> Nota do template: a forma abaixo (monorepo com pacote compartilhado + backend + frontend) é um
> padrão, não uma exigência — um projeto sem frontend separado, ou com múltiplos serviços, adapta
> a árvore mantendo a mesma ideia: **contratos e regras compartilhadas isolados num único lugar**,
> nunca duplicados entre quem produz e quem consome.

```
<nome-do-projeto>/
  shared/                         → pacote compartilhado entre backend e frontend (§6)
    src/
      dtos/                       → contratos de entrada/saída de cada módulo
      enums/
      interfaces/                 → tipos genéricos/arquiteturais (paginação, resposta padrão)
      validators/                 → constantes puras de validação (fonte única)
      regras/                     → motor de regras de domínio, SE existir a exceção do §6.6
  backend/
    src/
      modules/                    → um diretório por módulo de negócio
      core/
        base/                     → classes/utilitários genéricos (entidade base, repositório base)
        exceptions/
        filters/                  → tratamento de erro centralizado
        interceptors/
        gateway/                  → infraestrutura de tempo real, SE houver
      config/
  frontend/
    src/
      modules/                    → um diretório por área de negócio
      core/                       → services, interceptors, guards, estado global
      shared/                     → componentes/pipes reutilizáveis sem regra de negócio
  docs/
    ARCHITECTURE.md                → este arquivo — lido no início de toda sessão
    CONVENTIONS.md                 → referência rápida de convenções
    context/                       → estado do projeto (atualizado após cada task) — ver context/
    specs/
      backlog/                    → tasks a implementar
      active/                     → task em andamento na sessão atual
      done/                       → tasks concluídas (histórico)
  package.json                    → workspaces root, se monorepo
  README.md
```

---

## 4. Regra de Linguagem

> Nota do template: este é o único padrão deste documento que é **opcional por natureza** — só se
> aplica quando a equipe escreve código e documentação num idioma diferente do inglês e quer uma
> regra explícita para não misturar os dois de forma inconsistente. Se a equipe escreve tudo em
> inglês, apague esta seção inteira (a distinção genérico/negócio deixa de fazer sentido).

### Princípio

**Teste:** "Esse conceito existiria em qualquer projeto de software, independente do domínio?"
- **Sim** → inglês (o termo é sobre arquitetura de software, não sobre o negócio)
- **Não** → idioma do time/produto (o termo é sobre o domínio que o sistema modela)

### Tabela de Referência

| Inglês (genérico / arquitetural) | Idioma do domínio (negócio / projeto) |
|---|---|
| Pastas: `controllers/`, `services/`, `repositories/`, `dtos/`, `core/`, `shared/` | Arquivos de entidade: `<entidade>.service.ts` |
| Classes genéricas: `BaseEntity`, `BaseRepository`, `StandardResponse`, `PaginatedResult` | Métodos: `criar<Entidade>()`, `listar<Entidades>()` |
| Campos de entidade base: `id`, `isDeleted`, `createdDate`, `updatedDate` | DTOs: `<Entidade>CriarDto`, `<Entidade>AlterarDto` |
| Exceptions: `BusinessException`, `ResourceNotFoundException`, `UnauthorizedAccessException` | Valores de enum de domínio |
| Decorators/anotações de framework | Módulos de negócio (nome da pasta) |
| Padrões técnicos: `auth-token.interceptor.ts`, `global-exception.filter.ts` | Comportamento de negócio: `<entidade>.guard.ts` |

---

## 5. Convenções de Nomenclatura

Ver `CONVENTIONS.md` para a referência completa com exemplos. Resumo normativo:

- **DTOs/contratos:** `Entidade + Complemento? + Verbo + Dto`. Entrada no infinitivo
  (`<Entidade>CriarDto`), saída no particípio (`<Entidade>CriadoDto`), item de listagem
  `<Entidade>ResumoDto`. Verbo de alteração consistente em todo o projeto (escolha um: `alterar`
  ou `atualizar` — nunca os dois convivendo). Complemento inteiro antes do verbo
  (`<Entidade>DadosAlterarDto`, nunca `<Entidade>AlterarDadosDto`).
- **Herança de DTO:** negócio nunca herda negócio; negócio herda apenas core (`PaginatedResult<T>`).
  Nenhum DTO é alias/re-export de outro.
- **Métodos:** `verbo + entidade`, sem abreviações — `criarPedido()`, `validarLogin()` (nunca
  `existeLogin` — prefira `validarLogin`/`validarExistenciaLogin`).
- **Variáveis:** nunca abreviadas.
- **Enums:** string enum, valor igual ao nome, `SCREAMING_SNAKE_CASE`, sempre no pacote
  compartilhado.
- **Zero primitivos** em assinaturas de service e repository — sempre DTO, mesmo com um único
  campo. O `id` de rota/query é injetado no DTO pela controller/handler.

---

## 6. Pacote Compartilhado

> Nota do template: aplica-se a qualquer projeto com dois ou mais consumidores do mesmo contrato
> (backend + frontend, dois serviços, CLI + API). Se o projeto é um único processo, esta seção
> descreve só "onde ficam os tipos/contratos internos" — mantenha a mesma ideia sem o pacote npm.

Pacote `<@escopo/shared>`, importado por todos os consumidores.

### 6.1 O que fica no shared

- **DTOs/contratos** — todas as interfaces de entrada e saída entre camadas/serviços
- **Enums** — de coluna/estado e de conteúdo de domínio
- **Interfaces genéricas** — resposta padrão, resultado paginado
- **Validators** — constantes puras de validação (fonte única, sem acoplar a uma lib de validação
  específica se ela não roda nos dois lados)
- **Regras de domínio** (`regras/`) — ver §6.6, só se aplicável

### 6.2 O que NÃO fica no shared

- Decorators/anotações de framework, componentes de UI, configuração de framework
- Modelos de banco de dados (só do lado que persiste)
- Lógica de negócio **de aplicação** (permissões, orquestração, persistência)

### 6.6 Exceção sancionada — motor de regras de domínio (`regras/`)

> Nota do template: só existe esta seção se o projeto tiver cálculo/regra de domínio complexo o
> bastante para precisar rodar **nos dois lados** (frontend calcula para feedback instantâneo,
> backend valida autoritativamente o que é salvo). Um CRUD comum não precisa disso — apague a
> seção.

A regra "lógica de negócio não fica no shared" tem **uma** exceção: `shared/src/regras/` — o motor
de regras de domínio (as fórmulas/decisões que o `1.1` documenta).

**Racional:** é fonte única exigida pelos dois lados — o cliente calcula instantaneamente (sem
latência de rede) e o servidor valida autoritativamente o que é persistido.

**Restrições invioláveis do `regras/`:**
1. Somente **funções puras e dados tipados** — sem estado, sem I/O, sem `Date.now`/aleatoriedade
   fora de utilidades explícitas e isoladas
2. **Zero dependências** externas de framework
3. Toda fórmula tem **teste unitário** validado contra o documento de domínio (§1.1)
4. Permissões e persistência **nunca** entram aqui — isso é responsabilidade da service

---

## 7. Arquitetura do Backend

### 7.1 Camadas — regras obrigatórias

**Controller/Handler — burra.** Só expõe endpoint, aplica guards/decorators e repassa. Sem `if`,
sem `try/catch`, sem lógica. Única microinteligência: montar o DTO com o id da rota
(`service.alterar({ ...dto, id })`).

**Service — inteligente.** Toda regra de negócio: validações, **verificação de permissões**,
orquestração de repositórios, chamada ao motor de regras (se existir), e **emissão de eventos de
tempo real após mutação bem-sucedida** (se houver). Lança exceções tipadas
(`BusinessException`, `ResourceNotFoundException`, `UnauthorizedAccessException`).

**Repository/DAO — só acesso a dados.** Sem lógica, sem `if` de validação. Nunca recebe primitivo
solto — sempre DTO interno.

### 7.2 Base comum, resposta padrão e exceções

- **Entidade base** com campos comuns a toda tabela (id, timestamps, soft delete — ver §10.1) e um
  repositório base que centraliza consulta/comando/soft-delete.
- **Resposta padrão** (`{ sucesso, dados, mensagem, erros? }` ou equivalente) montada por um
  interceptor/middleware central — nunca montada manualmente em cada controller.
- **Tratamento de erro central** que padroniza toda exceção lançada pela service num formato de
  erro único.

---

## 8. Arquitetura do Frontend

> Nota do template: os bullets abaixo descrevem *decisões*, não a stack específica do
> ContratadosRPG (Angular/Signals). Substitua pelo equivalente da stack escolhida, mantendo a
> forma: componentização, estado reativo explícito, formulários com validação, camada de
> interceptação central, carregamento sob demanda.

- **Componentização** consistente (evite o padrão de módulo pesado se o framework oferecer
  alternativa mais simples).
- **Estado:** um padrão único de estado reativo em todo o projeto — não misture duas abordagens
  concorrentes para o mesmo tipo de estado.
- **Formulários:** um padrão único (controlado/reativo) em todo formulário do projeto.
- **Interceptors/middlewares de HTTP:** autenticação, tratamento de erro, indicador de carregamento
  — centralizados, nunca replicados por tela.
- **Carregamento sob demanda** (lazy loading) por rota, quando o framework suportar.
- Estilos: **fora do escopo deste template** — ver nota no `README.md` desta pasta sobre por que
  identidade visual não está aqui.

---

## 9. Tempo Real

> Nota do template: apague esta seção inteira se o projeto não tiver comunicação em tempo real.

- **Broadcast-only.** Toda mutação entra por REST (guards + validação). O canal de tempo real
  **nunca** recebe escrita. A service emite eventos **depois** da mutação bem-sucedida.
- **Handshake autenticado:** mesmo mecanismo de autenticação do REST.
- **Salas/canais:** nomeados por recurso (`<entidade>:<id>`); entrar numa sala exige a mesma
  verificação de permissão do REST equivalente — **nunca duplicar a regra**, a service dona do
  recurso é o único árbitro tanto para REST quanto para tempo real.
- **Resiliência:** cliente ressincroniza (refetch do que está aberto) ao reconectar — nunca confie
  em "nenhum evento perdido" como garantia.

---

## 10. Banco de Dados

> Nota do template: esta seção assume banco relacional com SQL — se o projeto usa outro modelo de
> persistência, adapte mantendo os princípios (identidade auditável, nunca deletar fisicamente por
> padrão, nomenclatura consistente, sem valores implícitos).

### 10.1 Entidade base — obrigatória em toda tabela

```sql
id            <tipo>      PRIMARY KEY,
created_date  TIMESTAMPTZ NOT NULL,
updated_date  TIMESTAMPTZ NOT NULL,
is_deleted    BOOLEAN     NOT NULL,
deleted_date  TIMESTAMPTZ
```

> Nota do template: decida e documente se colunas têm `DEFAULT` ou se todo valor é fornecido
> explicitamente no INSERT (o ContratadosRPG escolheu a segunda opção deliberadamente, para que
> nenhum valor "apareça" sem estar no código que grava). As duas são válidas — escolha uma e
> aplique sem exceção.

### 10.2 Regras SQL

1. Todo SELECT filtra `is_deleted = false` (se o projeto usa soft delete — decida e documente)
2. Nomenclatura de tabela/coluna consistente (escolha singular ou plural, um idioma, um caso —
   documente a escolha, não deixe implícito)
3. Campos de data com sufixo consistente (`_date`/`_at`, nunca os dois convivendo)
4. Parâmetros nomeados no lugar de posicionais, sempre — nunca interpolação de string em SQL
5. Soft delete via método central (`executarSoftDelete()` ou equivalente) — nunca DELETE físico,
   se o projeto adotou soft delete
6. Constraints/índices/triggers sempre nomeados explicitamente com prefixo por tipo (`pk_`, `fk_`,
   `uix_`, `ix_`, `chk_`, `trg_`)
7. **Enums de coluna** — decida entre tabela de referência (`tipo_<entidade>`) e tipo enum nativo
   do banco; documente a escolha e aplique sem exceção

### 10.3 Documento estruturado vs. relacional

> Nota do template: só se aplica se o projeto usa um campo de documento (JSONB, campo JSON) para
> parte do conteúdo. Princípio: **relacional para identidade, posse e permissão; documento para
> conteúdo que muda de forma com o domínio**. Decida por entidade, documente a fronteira, e
> declare se o campo é contrato tipado no pacote compartilhado.

### 10.4 Migrations

Formato de arquivo de migration escolhido pelo projeto (SQL puro numerado, ou migration da
ferramenta do ORM). Se SQL puro: nomeado com prefixo sequencial + descrição legível, seções
`UP`/`DOWN` (ambas obrigatórias, salvo justificativa documentada). Transação por migration é
responsabilidade da ferramenta de orquestração, nunca escrita manualmente no arquivo.

### 10.5 Configuração de ambiente

Toda configuração passa por uma camada central de configuração (`ConfigService` ou equivalente) —
nunca lida diretamente de variável de ambiente espalhada pelo código.

---

## 11. Validações

**Camada 1 — estrutural:** validação de forma/tipo do contrato de entrada, aplicada de forma
central (pipe/middleware global), não manualmente em cada handler.

**Camada 2 — negócio:** regras que exigem banco ou domínio, na service. Formato de erro
padronizado e único em todo o projeto.

---

## 12. Autenticação e Autorização

- Mecanismo de autenticação central, aplicado por guard/middleware global — rotas públicas são a
  exceção explícita, nunca o padrão.
- Identidade do usuário ativo injetada de forma consistente no handler (decorator/helper único).
- Segredo de sessão/token nunca hardcoded; sempre via configuração central.

---

## 13. Módulos do Sistema

| Módulo (backend) | Responsabilidade |
|---|---|
| `<modulo>` | <o que ele possui e decide> |

| Módulo (frontend) | Responsabilidade |
|---|---|
| `<modulo>` | <o que ele apresenta> |

---

## 14. Entidades e Regras de Negócio

> Todas as tabelas incluem a entidade base (§10.1). Schema completo e comentado em documento à
> parte, se o projeto tiver schema grande o bastante para justificar.

```
<entidade>          <campos principais, FKs>
```

### Matriz de permissões

> Nota do template: se o projeto tem mais de um papel de usuário, documente aqui — validada na
> service, vale igualmente para REST e tempo real.

| Ação | <papel A> | <papel B> | <papel C> |
|---|---|---|---|
| <ação> | ✅ | ❌ | condicional |

### Regras fundamentais

- <invariantes de negócio que atravessam módulos — ex.: "toda mutação de X é validada contra o
  motor de regras antes de persistir">

---

## 15. Milestones / Fases

| # | Fase | Conteúdo | Status |
|---|---|---|---|
| <N> | <nome> | <o que entrega> | backlog/em andamento/concluído |

Specs em `docs/specs/backlog/`. Fases grandes são quebradas em tasks numeradas antes da
implementação.

### Fora de escopo / decisões adiadas

- <decisão consciente de não fazer algo agora, com a razão>

---

## 16. Proibições Absolutas

> Nota do template: esta tabela é o coração operacional do documento — é o que um agente/dev
> consulta em segundos antes de escrever uma linha. Mantenha curta (uma frase, verificável) e
> específica ao projeto; a lista abaixo é o esqueleto que o ContratadosRPG preencheu — adapte,
> não copie linhas que não fazem sentido para a stack escolhida.

Inegociáveis independente do contexto:

| # | Proibição |
|---|---|
| 1 | **Nunca abreviar** nomes de variáveis, métodos, parâmetros, classes ou arquivos |
| 2 | **Nunca colocar lógica de negócio** na controller/handler — apenas repasse para service |
| 3 | **Nunca omitir** o filtro de exclusão lógica em qualquer SELECT (se soft delete) |
| 4 | **Nunca usar parâmetro posicional** em SQL — sempre parâmetros nomeados |
| 5 | **Nunca usar `process.env`/variável de ambiente direta** — sempre a camada central de config |
| 6 | **Nunca extrapolar** o escopo da task sendo implementada |
| 7 | **Nunca fazer** exclusão física — sempre o método central de soft delete (se adotado) |
| 8 | **Nunca passar primitivos** em service/repository — sempre DTO |
| 9 | **Nunca criar DTO** como alias/re-export/subclasse de DTO de negócio |
| 10 | **Nunca colocar em repositório/módulo A** query de responsabilidade do módulo B |
| 11 | **Nunca aceitar mutação via canal de tempo real** — escrita entra só por REST (se aplicável) |
| 12 | **Nunca colocar I/O, estado ou dependências de framework** no motor de regras (se existir) |
| 13 | **Nunca alterar fórmula/regra de domínio** sem consultar o documento de domínio (§1.1) |
| 14 | **Nunca duplicar regra de permissão** — a service do módulo dono é o único árbitro |
