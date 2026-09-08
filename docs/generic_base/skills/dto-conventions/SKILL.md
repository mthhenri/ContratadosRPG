---
name: dto-conventions
description: >
  Convenções completas de nomenclatura, estrutura e localização de DTOs/contratos do projeto. Use
  esta skill sempre que for criar, nomear, revisar, listar ou validar um DTO — mesmo que o usuário
  não mencione "DTO" explicitamente. Se a tarefa envolve entrada ou saída de dados entre camadas
  (controller, service, repository, frontend), consulte esta skill antes de escrever qualquer nome
  de classe ou interface. Erros de nomenclatura de DTO são uma das falhas mais frequentes em tasks
  de implementação — esta skill existe para eliminá-los.
---

# Convenções de DTO

> **Leia antes de nomear qualquer DTO.** A regra vive em `docs/CONVENTIONS.md` ("## DTOs") e
> `docs/ARCHITECTURE.md`; em conflito entre esta skill e esses documentos, o documento vence.
> Antes de inventar um nome novo, procure um par análogo já existente no pacote compartilhado —
> o melhor argumento contra um nome errado é um precedente já existente no próprio projeto.

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
| `<Entidade>CriarDto` | `<Entidade>CriadoDto` | Operação no modelo inteiro |
| `<Entidade>AlterarDto` | `<Entidade>AlteradoDto` | Alteração completa — mantenha um único verbo de alteração em todo o projeto (`Alterar` ou `Atualizar`, nunca os dois) |
| `<Entidade>RecuperarDto { id }` | `<Entidade>RecuperadoDto` | Recuperação individual — entrada sempre `{ id: number }` |
| `<Entidade>ListarDto` | `<Entidade>ResumoDto` | Listagem — saída **sempre** resumida |
| `<Entidade><Complemento>RegenerarDto` | `<Entidade><Complemento>RegeneradoDto` | Complemento simples + verbo |
| `<Entidade><Complementos>ListarDto` | `<Entidade><Complemento>ResumoDto` | Complemento coleção (plural na entrada) |
| `<Entidade><Complemento>InternoRecuperarDto` | `<Entidade><Complemento>InternoRecuperadoDto` | `Interno` como complemento (só service ↔ repository) |

Confira com uma busca no pacote compartilhado (`grep -rn "export interface <Entidade>...Dto"`)
antes de copiar um nome deste arquivo para outro contexto — o precedente real do projeto vence a
lista de exemplos genéricos.

## Regras do Complemento

- **Omitir** quando a operação representa o modelo inteiro → `<Entidade>AlterarDto`.
- **Usar** quando atinge só um sub-aspecto → `<Entidade><Complemento>RegenerarDto`.
- **Múltiplos campos**: agrupar num substantivo semântico, nunca concatenar dois complementos.
  Sem substantivo natural que agrupe os campos, a operação provavelmente é alteração completa
  → omitir o complemento.
- **Coleção**: plural do complemento (`<Entidade>MembrosListarDto`, não `<Entidade>MembroListarDto`).
- **Complemento com mais de uma palavra**: todas as palavras vêm antes do verbo, sem exceção —
  `<Entidade>InventarioItemQuantidadeAjustarDto` ✅ / `<Entidade>InventarioAjustarItemQuantidadeDto` ❌.
  Vale igual quando `Interno` é uma das palavras: `<Entidade>MembroInternoRecuperarDto` ✅ /
  `<Entidade>MembroRecuperarInternoDto` ❌.

Casos especiais que fogem dessa fórmula (`Interno`, relatório/consulta computada, value-object):

- **DTOs de relatório/consulta computada** (recorte calculado, não CRUD) →
  `Entidade + Recorte + Dto`, sem verbo — ex.: `<Entidade>ResumoFinanceiroDto`.
- **Value-objects** (sem entidade nem ciclo de vida) → nome do conceito, sem entidade nem verbo —
  ex.: `EnderecoDto`, `PeriodoDto`.
- **`Interno`** marca uma operação que só circula entre service e repository, nunca exposta na
  API pública — o complemento vem antes do verbo, como qualquer outro.

## Regras Absolutas

| Regra | ✅ Correto | ❌ Proibido |
|---|---|---|
| Um único verbo de alteração em todo o projeto | `<Entidade>AlterarDto` (escolhido) | `<Entidade>AtualizarDto` convivendo com `AlterarDto` noutro módulo |
| Saída de listagem sempre `Resumo` | `<Entidade>ResumoDto` | `<Entidade>ListadoDto` |
| Recuperação individual sempre `{ id: number }` | `<Entidade>RecuperarDto { id: number }` | parâmetro primitivo `id: number` |
| Toda operação com parâmetros usa DTO | `validarLogin(dto: UsuarioAutenticarDto)` | `validarLogin(login: string)` |
| `id` de rota injetado no DTO **pela controller** | `service.alterar({ ...dto, id })` | `service.alterar(id, dto)` |
| DTOs de negócio declaram os próprios campos | campos explícitos em cada interface | herança entre DTOs de negócio |
| Nenhum DTO é alias ou re-export | — | `export { <Entidade>CriarDto as <Entidade>Dto }` |

## Herança

DTOs de negócio **nunca** estendem outro DTO de negócio — cada um declara os próprios campos
explicitamente, mesmo que sejam idênticos a outro. A única herança permitida é de DTOs **core**
(genéricos/arquiteturais, no pacote compartilhado): tipo de resultado paginado e tipo de resposta
padrão.

```typescript
// ✅ Herança permitida — DTO de listagem estendendo o tipo genérico de paginação
export class <Entidades>ListadosDto extends PaginatedResult<<Entidade>ResumoDto> {}

// ❌ Proibido — DTO de negócio estendendo outro DTO de negócio, mesmo vazio
export class <Entidade>AlteradoDto extends <Entidade>CriadoDto {}
```

A razão: pares de DTOs (`Criado`/`Alterado`, por exemplo) tendem a divergir ao longo do tempo;
herança permanente entre eles cria acoplamento frágil e viola a regra de campos explícitos.

## Localização

DTOs ficam exclusivamente no pacote compartilhado (`shared/src/dtos/<modulo>/`), nunca em
`backend/` ou `frontend/` isoladamente. Cada módulo expõe um barrel (`index.ts`) — importe sempre
por ele:

```typescript
import { <Entidade>CriarDto } from '<@escopo/shared>/dtos/<modulo>';
import { <Entidade>ResumoDto } from '<@escopo/shared>/dtos/<modulo>';
```

Um DTO **nunca** é declarado dentro de `backend/` nem `frontend/` — apenas importado do
compartilhado.

## Checklist Final

Antes de finalizar, confirme, nesta ordem: **nome** (bate com um par já existente do mesmo
padrão?) → **verbo** (infinitivo na entrada, particípio na saída) → **direção** (entrada/saída
corretas) → **complemento** (necessário? todas as palavras antes do verbo? plural se coleção?)
→ **herança** (nenhuma entre DTOs de negócio) → **localização** (pacote compartilhado, importado
pelo barrel).
