---
name: dto-conventions
description: >
  Convenções completas de nomenclatura, estrutura e localização de DTOs do ContratadosRPG.
  Use esta skill sempre que for criar, nomear, revisar, listar ou validar DTOs do projeto —
  mesmo que o usuário não mencione "DTO" explicitamente. Se a tarefa envolve entrada ou saída
  de dados entre camadas (controller, service, repository, frontend), consulte esta skill antes
  de escrever qualquer nome de classe ou interface. Erros de nomenclatura de DTO são uma das
  falhas mais frequentes em tasks de implementação — esta skill existe para eliminá-los.
---

# Convenções de DTO

> **Leia antes de nomear qualquer DTO.** A regra vive em `docs/CONVENTIONS.md` ("## DTOs") e
> `docs/SYSTEM.SPEC.md`; em conflito entre esta skill e esses documentos, o documento vence.
> Antes de inventar um nome novo, procure um par análogo em `shared/src/dtos/` — o repositório
> já tem ~214 DTOs; o melhor argumento contra um nome errado é um precedente já existente.

## Fórmula Geral

```
Entidade + Complemento (se houver) + Verbo + Dto
```

- **Entrada** → verbo no **infinitivo**: `CriarDto`, `AlterarDto`, `RecuperarDto`
- **Saída** → verbo no **particípio**: `CriadoDto`, `AlteradoDto`, `RecuperadoDto`
- **Complemento** → aparece só quando a operação atinge um sub-aspecto da entidade, não o
  modelo inteiro

| Entrada | Saída | Situação |
|---|---|---|
| `FichaCriarDto` | `FichaCriadaDto` | Operação no modelo inteiro |
| `FichaAlterarDto` | `FichaAlteradaDto` | Alteração completa — nunca `Atualizar`/`Atualizado` |
| `FichaRecuperarDto { id }` | `FichaRecuperadaDto` | Recuperação individual — entrada sempre `{ id: number }` |
| `FichaListarDto` | `FichaResumoDto` | Listagem — saída **sempre** resumida |
| `CampanhaConviteRegenerarDto` | `CampanhaConviteRegeneradoDto` | Complemento simples + verbo |
| `CampanhaMembrosListarDto` | `CampanhaMembroResumoDto` | Complemento coleção (plural na entrada) |
| `CampanhaMembroInternoRecuperarDto` | `CampanhaMembroInternoRecuperadoDto` | `Interno` como complemento (só service ↔ repository) |

Todos os exemplos acima existem hoje em `shared/src/dtos/campanha/` e `shared/src/dtos/ficha/` —
confira com `grep -n "export interface CampanhaConviteRegenerarDto" shared/src/dtos/campanha/*.ts`
antes de copiar um nome deste arquivo para outro contexto.

## Regras do Complemento

- **Omitir** quando a operação representa o modelo inteiro → `FichaAlterarDto`.
- **Usar** quando atinge só um sub-aspecto → `CampanhaConviteRegenerarDto`.
- **Múltiplos campos**: agrupar num substantivo semântico, nunca concatenar dois complementos.
  Sem substantivo natural que agrupe os campos, a operação provavelmente é alteração completa
  → omitir o complemento.
- **Coleção**: plural do complemento (`CampanhaMembrosListarDto`, não `CampanhaMembroListarDto`).
- **Complemento com mais de uma palavra**: todas as palavras vêm antes do verbo, sem exceção —
  `CampanhaInventarioItemQuantidadeAjustarDto` ✅ / `CampanhaInventarioAjustarItemQuantidadeDto` ❌.
  Vale igual quando `Interno` é uma das palavras: `CampanhaMembroInternoRecuperarDto` ✅ /
  `CampanhaMembroRecuperarInternoDto` ❌.

Casos especiais que fogem dessa fórmula (`Interno`, relatório/consulta computada, value-object)
e a tabela de anti-padrões estão em
[`references/casos-especiais.md`](references/casos-especiais.md).

## Regras Absolutas

| Regra | ✅ Correto | ❌ Proibido |
|---|---|---|
| Palavra `Alterar`, nunca `Atualizar` | `FichaAlterarDto` | `FichaAtualizarDto` |
| Saída de listagem sempre `Resumo` | `CampanhaResumoDto` | `CampanhaListadoDto` |
| Recuperação individual sempre `{ id: number }` | `FichaRecuperarDto { id: number }` | parâmetro primitivo `id: number` |
| Toda operação com parâmetros usa DTO | `validarLogin(dto: UsuarioAutenticarDto)` | `validarLogin(login: string)` |
| `id` de `@Param` injetado no DTO **pela controller** | `service.alterar({ ...dto, id })` | `service.alterar(id, dto)` |
| DTOs de negócio declaram os próprios campos | campos explícitos em cada interface | herança entre DTOs de negócio |
| Nenhum DTO é alias ou re-export | — | `export { FichaCriarDto as FichaDto }` |

## Herança

DTOs de negócio **nunca** estendem outro DTO de negócio — cada um declara os próprios campos
explicitamente, mesmo que sejam idênticos a outro. A única herança permitida é de DTOs **core**
(genéricos/arquiteturais, em `shared/src/interfaces/`): `PaginatedResult<TItem>` (classe) e
`StandardResponse<TData>` (interface, montada pelo interceptor — DTOs de negócio não a estendem
diretamente).

```typescript
// ✅ Herança permitida — único caso real do projeto hoje (shared/src/dtos/usuario/usuario.dtos.ts)
export class UsuarioListadosDto extends PaginatedResult<UsuarioResumoDto> {}

// ❌ Proibido — DTO de negócio estendendo outro DTO de negócio, mesmo vazio
export class FichaAlteradaDto extends FichaCriadaDto {}
```

A razão: pares de DTOs (`Criado`/`Alterado`, por exemplo) tendem a divergir ao longo do tempo;
herança permanente entre eles cria acoplamento frágil e viola a regra de campos explícitos.

## Localização

DTOs ficam exclusivamente em `shared/src/dtos/<modulo>/`, nunca em `backend/` ou `frontend/`.
Os módulos hoje são: `campanha/`, `encontro/`, `ficha/`, `pagina-caderno/`, `rolagem/`,
`usuario/`. Cada módulo expõe um barrel (`index.ts`) — importe sempre por ele:

```typescript
import { CampanhaConviteRegenerarDto } from '@contratados-rpg/shared/dtos/campanha';
import { FichaResumoDto }              from '@contratados-rpg/shared/dtos/ficha';
```

Um DTO **nunca** é declarado dentro de `backend/` nem `frontend/` — apenas importado do shared.

## Checklist Final

Antes de finalizar, confirme, nesta ordem: **nome** (bate com um par já existente do mesmo
padrão?) → **verbo** (infinitivo na entrada, particípio na saída) → **direção** (entrada/saída
corretas) → **complemento** (necessário? todas as palavras antes do verbo? plural se coleção?)
→ **herança** (nenhuma entre DTOs de negócio) → **localização** (`shared/src/dtos/<modulo>/`,
importado pelo barrel).
