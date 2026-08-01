---
name: dto-conventions
description: Convenções de nomenclatura, estrutura e localização de DTOs do ContratadosRPG. Use antes de criar, nomear, revisar ou validar qualquer DTO ou contrato entre camadas.
---

# Convenções de DTO

Leia `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md` e `AGENTS.md` quando houver
dúvida. Estas regras são obrigatórias.

## Fórmula

`Entidade + Complemento? + Verbo + Dto`

- Entrada usa infinitivo: `UsuarioCriarDto`, `UsuarioAlterarDto`.
- Saída usa particípio: `UsuarioCriadoDto`, `UsuarioAlteradoDto`.
- Listagem sempre retorna resumo: `UsuarioResumoDto`.
- Complementos descrevem sub-aspectos e vêm inteiros antes do verbo:
  `UsuarioSenhaAlterarDto`, `DemandaMembroInternoAtribuirDto`.
- Operações internas service → repository usam `Interno` como complemento.
- Relatórios/consultas calculadas usam `Entidade + Recorte + Dto`, sem verbo:
  `PontoDiarioDto`.
- Value objects usam apenas o conceito: `IntervaloDto`.

## Regras absolutas

| Correto | Evitar |
|---|---|
| `Alterar` | `Atualizar` |
| `UsuarioResumoDto` | `UsuarioListadoDto` |
| `UsuarioRecuperarDto { id: number }` | parâmetro primitivo `id: number` |
| `validarLogin(dto: UsuarioValidarLoginDto)` | parâmetros soltos |
| `service.alterar({ ...dto, id })` | `service.alterar(id, dto)` |

Todo DTO que carrega parâmetros deve ser um DTO. DTOs de negócio declaram seus
próprios campos explicitamente e não herdam de outros DTOs de negócio. A única
herança permitida é de DTOs core genéricos, como `PaginatedResult<T>` e
`StandardResponse<T>`.

## Localização

DTOs ficam exclusivamente em `shared/src/dtos/<modulo>/`, nunca em `backend/` ou
`frontend/`. Use os barrels do shared para importar, por exemplo:

```typescript
import { UsuarioCriarDto } from '@contratados-rpg/shared/dtos/usuario';
```

Antes de finalizar, confirme nome, verbo, direção (entrada/saída), complemento,
herança e localização.
