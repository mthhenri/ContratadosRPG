# CONVENTIONS.md — <nome-do-projeto>

> Referência rápida. Para contexto completo e justificativas, consulte o `ARCHITECTURE.md`.
> Preencha `<...>` com as escolhas reais do projeto; apague blocos que não se aplicam à stack.

---

## Regra de Linguagem

*(Apague este bloco se o projeto escreve tudo em um único idioma.)*

**Teste:** "Esse conceito existiria em qualquer projeto de software?"
- **Sim → inglês** (pastas arquiteturais, classes genéricas, campos de entidade base, exceptions)
- **Não → idioma do domínio** (arquivos de entidade, métodos, variáveis, DTOs, valores de enum)

| ✅ Inglês | ✅ Idioma do domínio |
|---|---|
| `controllers/` `services/` `repositories/` `core/` `shared/` | `<entidade>.service.ts` |
| `BaseEntity` `BaseRepository` `StandardResponse` `PaginatedResult` | `criar<Entidade>()` |
| `isDeleted` `createdDate` `updatedDate` | `<campo-de-negocio>` |
| `BusinessException` `ResourceNotFoundException` `UnauthorizedAccessException` | `<Entidade>CriarDto` |

---

## Nomes de Arquivo

```
<entidade>.service.ts        → entidade de negócio → idioma do domínio
<entidade>.repository.ts
<entidade>.controller.ts
base.repository.ts           → padrão genérico → inglês
global-exception.filter.ts   → padrão técnico → inglês
auth-token.interceptor.ts    → padrão técnico → inglês
<entidade>-formulario.component.ts
```

---

## DTOs / Contratos

**Padrão:** `Entidade + Complemento (se houver) + Verbo + Dto`

**Entrada** (verbo no infinitivo) / **Saída** (verbo no particípio):

| Entrada | Saída | Quando usar |
|---|---|---|
| `<Entidade>CriarDto` | `<Entidade>CriadoDto` | operação no modelo inteiro |
| `<Entidade>RecuperarDto` | `<Entidade>RecuperadoDto` | recuperação individual — entrada sempre `{ id }` |
| `<Entidade>ListarDto` | `<Entidade>ResumoDto` | listagem — saída sempre resumida |
| `<Entidade>AlterarDto` | `<Entidade>AlteradoDto` | alteração completa |
| `<Entidade><Complemento>AlterarDto` | `<Entidade><Complemento>AlteradoDto` | sub-aspecto específico |

**Regras do complemento:**
- Omitir quando a operação representa o modelo inteiro
- Usar quando atinge só um sub-aspecto (ex.: `Dados`, `Senha`, `Convite`)
- Múltiplos campos → agrupar num substantivo semântico
- Coleção → plural do complemento
- **Complemento com mais de uma palavra → todas as palavras antes do verbo, sem exceção:**
  `<Entidade>AcessoConcederDto` ✅ / `<Entidade>ConcederAcessoDto` ❌

**Regras adicionais:**
- Recuperação individual sempre `<Entidade>RecuperarDto { id }` — nunca primitivo solto
- Toda operação usa DTO mesmo com um único campo — zero primitivos em assinaturas
- O `id` de rota/query é injetado no DTO **pela controller/handler** — service e repository nunca
  recebem `id` solto
- Nenhum DTO é alias ou re-export de outro
- **Herança:** negócio nunca herda negócio (nem subclasse vazia); negócio herda apenas core
  (tipo genérico de paginação/resposta padrão)

**Localização:** sempre no pacote compartilhado, nunca dentro do backend ou frontend isoladamente.

---

## Métodos

Padrão: `verbo + entidade`, sem preposições, sem abreviações:

```typescript
// ✅
criar<Entidade>()      listar<Entidades>()     recuperar<Entidade>()
alterar<Entidade>()    excluir<Entidade>()     validarLogin()

// ❌
create<Entidade>()     get<Entidade>()         findByLogin()
calc<Algo>()           check<Algo>()           existeLogin()
```

---

## Variáveis

Sem abreviações. Sempre explícitas:

```typescript
// ✅
const usuarioEncontrado = await this.usuarioRepositorio.buscarLogin({ login });

// ❌
const u = await this.repo.find(l);
```

---

## SQL

*(Apague se o projeto não usa SQL relacional.)*

```sql
-- ✅ Parâmetros nomeados com objeto
SELECT * FROM <tabela> WHERE <coluna> = :parametro AND is_deleted = false

-- ✅ Soft delete via método central
executarSoftDelete(identificador)  -- nunca DELETE físico, se o projeto adotou soft delete

-- ❌ Nunca
SELECT * FROM <tabela> WHERE id = ?              -- posicional proibido
WHERE login = '${login}'                         -- interpolação proibida
SELECT * FROM <tabela>                           -- sem filtro de exclusão lógica, se adotado
```

**Constraints, índices, triggers, functions — prefixo por tipo, sempre nomeados:**

| Objeto | Prefixo | Exemplo |
|---|---|---|
| Primary key | `pk_` | `pk_<tabela>` |
| Foreign key | `fk_` | `fk_<tabela>_<tabela-referenciada>` |
| Unique index | `uix_` | `uix_<tabela>_<coluna>` |
| Index | `ix_` | `ix_<tabela>_<coluna>` |
| Check constraint | `chk_` | `chk_<tabela>_<regra>` |
| Trigger | `trg_` | `trg_<tabela>_<evento>` |
| Function | `fn_` | `fn_<acao>` |

---

## Enums

```typescript
// shared/src/enums/<nome>.enum.ts
export enum <Nome>Enum {
  <VALOR_A> = '<VALOR_A>',
  <VALOR_B> = '<VALOR_B>',
}
```

Sempre: string enum, valor igual ao nome, `SCREAMING_SNAKE_CASE`, no pacote compartilhado.

Se o projeto usa a distinção "enum de coluna vira tabela de referência" vs. "enum de conteúdo de
documento fica só como enum de código" (ver `ARCHITECTURE.md` §10.3), documente aqui qual regra
vale para cada enum concreto do projeto.

---

## Motor de Regras de Domínio

*(Apague se o projeto não tiver a exceção sancionada do `ARCHITECTURE.md` §6.6.)*

Única lógica de negócio permitida no pacote compartilhado: fórmulas e tabelas do domínio.

- Funções puras + dados tipados; zero dependências; sem I/O, sem estado
- Consumido por todos os lados que precisam do mesmo cálculo
- Toda fórmula com teste unitário validado contra o documento de domínio
- Permissões e persistência NUNCA entram aqui

```typescript
// ✅
export function calcular<Algo>(dto: <Algo>CalcularDto): number { ... }

// ❌ proibido no motor de regras
import { Injectable } from '<framework>';        // dependência de framework
export async function salvar<Algo>(...)          // I/O
```

---

## Camadas — Regras Rápidas

### Controller/Handler — burro
Só expõe endpoint e repassa. Sem `if`, sem `try/catch`, sem lógica. Única microinteligência:
montar o DTO com o id da rota:

```typescript
@Post()
criar(@Body() dto: <Entidade>CriarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
  return this.<entidade>Service.criar(dto, usuarioAtivo);
}

@Put(':id')
alterar(@Param('id') id: number, @Body() dto: <Entidade>AlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
  return this.<entidade>Service.alterar({ ...dto, id }, usuarioAtivo);
}
```

### Service — inteligente
Regras de negócio, validações, **permissões**, orquestração, motor de regras, emissão de eventos:

```typescript
async alterar(dto: <Entidade>InternoAlterarDto, usuarioAtivo: JwtPayload) {
  const registroRecuperado = await this.<entidade>Repositorio.recuperar({ id: dto.id });
  if (!registroRecuperado) throw new ResourceNotFoundException('<Entidade>');

  await this.validarPermissaoEdicao({ id: dto.id }, usuarioAtivo);
  this.validarDadosContraRegras(dto);

  const registroAlterado = await this.<entidade>Repositorio.alterar(dto);
  this.gateway.emitir<Entidade>Alterada(registroAlterado);   // pós-mutação, se houver tempo real
  return registroAlterado;
}
```

### Repository/DAO — só acesso a dados
Sem lógica. Nunca recebe primitivo nem objeto parcial genérico — sempre DTO interno
(`alterar(dto: <Entidade>InternoAlterarDto)`, nunca `alterar(id, dados)`).

### Gateway de tempo real — broadcast-only
*(Se houver.)* Valida credencial no handshake; valida permissão de sala/canal consultando a
service do módulo dono; **nunca** recebe mutação; **nunca** duplica regra de permissão.

---

## Imports do pacote compartilhado

```typescript
import { <Entidade>CriarDto } from '<@escopo/shared>/dtos/<modulo>';
import { <Nome>Enum }         from '<@escopo/shared>/enums';
import { StandardResponse }   from '<@escopo/shared>/interfaces';
```

DTOs e enums **nunca** são redefinidos dentro do backend ou frontend isoladamente.

---

## Frontend

> Nota do template: adapte os bullets abaixo à stack real. O que se preserva é a decisão de ter
> **um único padrão** para cada uma dessas categorias em todo o projeto — nunca duas abordagens
> concorrentes coexistindo.

- **Componentização/organização** consistente em todo o projeto
- **Estado reativo:** um padrão único
- **Formulários:** um padrão único, com validação
- **Carregamento sob demanda** por rota, quando o framework suportar

---

## Formatação

> Nota do template: documente a ferramenta de formatação escolhida (ou a decisão consciente de
> **não** usar formatador automático nalgum tipo de arquivo, e por quê) e os limites de estilo
> (aspas, ponto e vírgula, comprimento de linha, indentação).

---

## Proibições — Resumo Rápido

| ❌ Nunca fazer | ✅ Fazer em vez disso |
|---|---|
| Abreviar nomes | Nome completo sempre |
| Lógica na controller/handler | Mover para a service |
| `SELECT` sem filtro de exclusão lógica (se soft delete) | Sempre filtrar deletados |
| Parâmetro posicional em SQL | Parâmetro nomeado com objeto |
| Variável de ambiente direta | Camada central de configuração |
| Exclusão física | Método central de soft delete, se adotado |
| Extrapolar escopo da task | Implementar exatamente o que a spec define |
| DTO fora do pacote compartilhado | Sempre no pacote compartilhado |
| Primitivo em service/repository | DTO, mesmo com um único campo |
| `existe*` em método | `validar*` |
| DTO herdando DTO de negócio | Campos explícitos; herança só de core |
| Query do módulo A no repositório do módulo B | Repositório do módulo correto |
| Mutação via canal de tempo real | Escrita só por REST; canal broadcast-only |
| I/O, estado ou framework no motor de regras | Funções puras + dados tipados |
| Alterar fórmula sem consultar o documento de domínio | Documento vence o código; atualizar testes |
| Duplicar regra de permissão (gateway, controller...) | Service do módulo dono é o único árbitro |
