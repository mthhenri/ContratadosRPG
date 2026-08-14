# m4-05-contrato-ficha-npc-dados.spec.md

> Task 5/10 do milestone `m4-ficha-criatura-npc.spec.md`.

## Objetivo

Fechar em código a **forma final do documento JSONB `ficha.dados`** para a ficha de NPC —
o contrato tipado `FichaNpcDadosDto` em `shared/src/dtos/ficha/`, derivado do capítulo
"Guia de Criação de NPCs" (`docs/core/guia_de_mestre-v4.0.0.md`). Design já **fechado** em
`SCHEMA.md` (seção "FichaNpcDadosDto") — esta task codifica, não reabre. Pura camada
`shared/`, mesmo perfil de `m4-01`: sem migration/service/endpoint/frontend/
`shared/regras/npc`.

## Entregáveis

1. **Enums novos** em `shared/src/enums/` (`SCREAMING_SNAKE_CASE`, sem tabela `tipo_*`):
   `CategoriaNpcEnum` (CIVIL/OPERATIVO/VETERANO/ELITE/LENDARIO). Avaliar reuso de
   `HabilidadeTipoCriaturaEnum` (`m4-01`) para o `tipo` de habilidade do NPC (PASSIVA/ATIVA
   — o NPC nunca usa GATILHO, mas o enum já cobre o subconjunto) **ou** um enum próprio
   `HabilidadeTipoNpcEnum` (PASSIVA/ATIVA) se a reutilização confundir o domínio — decidir
   e documentar a escolha nesta task.
2. **`FichaNpcDadosDto`** + sub-DTOs (ex. `ficha-npc.dtos.ts`, mesmo subpath `./dtos/ficha`):
   `identidadeNarrativa` (nome, função), `categoria` (`CategoriaNpcEnum`), `nivel` (0–20),
   `cooperacao` (0–10, estado atual mutável em jogo), `atributos` (**reusa**
   `FichaAtributosDto`), `vidaMaxima`/`vidaAtual` (snapshot editável), `defesaBase`/
   `bloquear`/`esquivar` (snapshot editável), `energia` (`{ maxima, atual,
   recargaPorTurno: number | null }` — modelo depende da Categoria: Civil sem energia,
   Operativo/Veterano Reserva Fixa, Elite/Lendário Pool+Recarga), `sanidade`
   (`{ sequelas: [], traumas: [] }`, esquema análogo ao `estado` do jogador), `habilidades[]`
   (nomeNeutro, nomeNarrativo opcional, tipo, custoEnergia só em Ativa, descrição, restrição
   opcional), `condutaCombate` (gatilhosFuga, prioridadesAlvo, reacaoFerimentoSevero) e
   `anotacoes?`. Forma exata: ver `SCHEMA.md` "FichaNpcDadosDto".
3. **DT de atributo não é persistida** — diferente do `derivados.dtAtributo` do jogador, a
   DT de um NPC (`10 + Nível + Atributo×2`) varia por atributo/contexto: **não** entra no
   contrato como campo, só como fórmula em `shared/regras/npc` (`m4-06`, calculada sob
   demanda).
4. **Sem Maestria.**
5. **`interface readonly` pura, sem class-validator** (mesma decisão vigente de `m4-01`).
6. **`SCHEMA.md`** — remover o marcador "codificar no M4" da seção `FichaNpcDadosDto`.
7. Cada campo conferido contra "Guia de Criação de NPCs" — documento vence código
   (proibição #27).

## Critérios de Aceite

- `FichaNpcDadosDto` compila no `shared`, exportado pelo subpath `./dtos/ficha`.
- Forma bate 1:1 com o exemplo fechado em `SCHEMA.md`.
- Nenhum campo duplica um conceito já existente (`FichaAtributosDto` reusado).
- `SCHEMA.md` reflete o contrato como codificado.
- **Nenhum** service, repository, migration, endpoint, `shared/regras/npc` ou frontend
  nesta task.

## Fora de Escopo

- `shared/regras/npc` (`m4-06`).
- Backend (`m4-07`), frontend (`m4-08`).

## Dependências

- M3 completo (`FichaAtributosDto`, `TipoFichaEnum` já com `NPC` seedado desde `m3-02`).
- `m4-01` (padrão de enums/estrutura já estabelecido para a criatura, reusável como
  referência de estilo).
- Design fechado em `SCHEMA.md` (seção "FichaNpcDadosDto") e
  `docs/core/guia_de_mestre-v4.0.0.md` ("Guia de Criação de NPCs").
