---
name: regras-do-jogo
description: >
  Alterar ou investigar fórmula, cálculo, regra do jogo, progressão, nível, patente, atributo,
  dano, resistência, energia, vida, maestria, habilidade, Civil, Experimento ou classe — inclusive
  quando "o valor está errado na tela X". Use antes de tocar em regra de domínio para achar o
  documento canônico, o motor puro compartilhado e todos os consumidores derivados.
---

# Regras do Jogo — Documento, Motor e Consumidores

> A regra canônica vive em [`docs/core/`](../../../docs/core/): jogador em
> `sistema-v4.1.0.md`, ameaça/criatura/NPC em `guia_de_mestre-v4.0.0.md`. A arquitetura vive em
> `SYSTEM.SPEC.md` §6.6 e a convenção curta em `CONVENTIONS.md` (“Motor de Regras”); o mapa de
> localização está em `MEMORY.md` §1/§2. Em conflito, o documento vence — a skill executa o
> caminho, não reescreve regra nem fórmula.

## 1. Localizar a fonte e o motor

1. Classifique a regra: jogador → `docs/core/sistema-v4.1.0.md`; ameaça, criatura ou NPC →
   `docs/core/guia_de_mestre-v4.0.0.md`. Cite arquivo e seção no teste e no fecho.
2. Leia a seção canônica antes do código. Se divergir do código, altere o código e o teste; não
   adapte o documento sem decisão expressa do autor.
3. Localize a área do motor pelo mapa abaixo e confira os arquivos reais, não só o nome da pasta.
   Regra nova ou composição reutilizável nasce ali como função pura compartilhada.
4. Liste quem consome o resultado antes de editar. Frontend e backend usam o mesmo motor; não
   replique uma fórmula numa página, service, mapper ou componente.

| Assunto | Área do motor puro |
|---|---|
| Atributos, saúde, defesa, dano, inventário, habilidades, progressão e stats de agente | `shared/src/regras/agente/` |
| Catálogo, carrinho, modificações, amplificadores, venda e fragmentos | `shared/src/regras/compras/` |
| Atributos, saúde, defesa, resistência, ataques e validação de ameaças | `shared/src/regras/criatura/` |
| Tabelas tipadas de progressão, Civil e patentes | `shared/src/regras/dados/` |
| Recuperação, dados e resultado de descanso | `shared/src/regras/descanso/` |
| Dificuldade de Teste de atributo | `shared/src/regras/dt/` |
| Ordem, condições e dano recebido em Encontro | `shared/src/regras/encontro/` |
| Personalidade, origem, formação e Experimento | `shared/src/regras/identidade/` |
| Entrada de novo agente | `shared/src/regras/novo-agente/` |
| Consulta de patente por Prestígio | `shared/src/regras/patente/` |
| Fórmula, validação e rolagem de dados | `shared/src/regras/rolagem/` |

## 2. Limites do motor

- Só funções puras e dados tipados: sem I/O, estado, persistência, permissão ou framework.
- Dependência externa não entra em `shared/src/regras/`. A exceção de aleatoriedade precisa ser
  explícita e isolada na utilidade de rolagem.
- Serviço orquestra e autoriza; interface só apresenta estado e encaminha interação. Nenhuma das
  duas camadas recalcula a regra por conta própria.
- Todo cálculo alterado ganha teste unitário contra o documento, com a seção usada citada no
  comentário/descrição do teste. Rode `npm run test --workspace=shared` antes dos demais gates.

## 3. Consumidores derivados — não fechar cedo

Antes de concluir uma mudança, procure pelo símbolo da função, pelos campos de entrada e pelo
campo persistido/derivado. Para agentes, confira sempre os consumidores relevantes: ficha,
Inventário, catálogo “Adicionar itens”, `FichaService.paraResumoPublico`,
`backend/src/modules/encontro/encontro-combatente.mapper.ts` e Encontro. Um cálculo aplicado
“por cima” nasce no motor compartilhado e é consumido nesses pontos; nunca só numa tela.

Leia [`references/armadilhas.md`](references/armadilhas.md) quando houver estado persistido,
modificação de equipamento, Maestria/Tanque, Civil ou progressão. Ela descreve os recortes que já
causaram divergência, sem copiar nenhuma fórmula do jogo.

## 4. Fecho

- [ ] Documento canônico e seção citados; divergência resolvida a favor do documento.
- [ ] Função/dado puro fica na área correta de `shared/src/regras/`.
- [ ] Teste unitário cobre a regra contra o documento e `npm run test --workspace=shared` passou.
- [ ] Todos os consumidores derivados foram listados e atualizados quando aplicável.
- [ ] Não há fórmula duplicada fora de `shared/src/regras/`.
- [ ] Escopo do problema, pendências e evidência foram registrados conforme `task-flow`.
