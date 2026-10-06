# Investigação — NPC, Ataques e Equipamentos (Guia v4.2.0)

> Spec: [`npc-ataques-e-equipamentos-guia-v4.2.0.spec.md`](../specs/active/npc-ataques-e-equipamentos-guia-v4.2.0.spec.md).
> **Rodada exclusivamente investigativa — proposta para revisão do autor; nenhuma
> interface, DTO ou migração foi implementada.** Data: 2026-10-06.

## Fonte

Guia de Mestre v4.2.0, "⬥ Ataques e Equipamentos" (`:1031–1037`):

> NPCs utilizam as mesmas regras de ataques e equipamentos dos agentes. Diferente das
> criaturas, seu dano não é definido por Categoria ou Nível, mas pelo equipamento
> utilizado. Ataques corpo a corpo utilizam **Luta** por padrão e ataques à distância
> utilizam **Pontaria**. Caso o Atributo utilizado seja uma Competência, o Modificador
> de Categoria é aplicado normalmente ao teste. O dano, alcance, modificações, munição e
> demais propriedades são definidos pelo equipamento utilizado. Proteções e Escudos
> também funcionam normalmente. A Patente Equivalente da Categoria representa o limite
> de acesso do NPC a equipamentos e modificações, não uma obrigação de utilizá-lo ao
> máximo. Escolha apenas equipamentos coerentes com sua função, recursos e identidade.
> NPCs não possuem Dano Furtivo por padrão. Caso esse seja um elemento importante do
> indivíduo, deve ser concedido por uma habilidade específica.

Tabela "Patente Equivalente" por Categoria (`:925–931`):

| Categoria | Patente Equivalente |
|---|---|
| Civil | Abaixo de Agente |
| Operativo | Agente / Operador |
| Veterano | Experiente / Veterano |
| Elite | Força Tarefa / Operações Especiais |
| Lendário | Líder Operacional ou superior |

## Contrato atual — confirmado no código

`FichaNpcDadosDto` (`shared/src/dtos/ficha/ficha-npc.dtos.ts`) **não tem nenhum campo de
inventário, arma ou ataque**. `defesaBase`/`bloquear`/`esquivar` são os três únicos campos
de combate, e são **snapshots manuais** (fórmula calculada na criação, editável depois —
mesma filosofia de `m3-10`; SCHEMA.md:687 / 713–715), sem qualquer soma de equipamento —
diferente do agente, cujo `defesa.ts`/`resistencia.ts` somam bônus de itens equipados por
cima do valor base.

## Matriz de reaproveitamento

O motor de compras/equipamento (`shared/src/regras/compras`) e os bônus de defesa/resistência
do agente (`shared/src/regras/agente/{defesa,resistencia}.ts`) são majoritariamente
**genéricos por item** (`CarrinhoItemDto`), não por classe — a tabela abaixo separa o que já
serve ao NPC sem mudança do que precisa de uma ponte nova.

| Função / contrato | Reusável como está | Observação |
|---|---|---|
| `calcularStatItem`, `resolverDadosItem`, `obterCategoriaEmprestada`, `listarModificacoesDisponiveis`, `verificarConflitoModificacao`, `ehEscudo`, `calcularTotaisCarrinho`, `listarSubInventarios` | **Sim** | Operam só sobre `CarrinhoItemDto`/`ItemCatalogo`; nenhuma depende de `ClasseEnum` ou de Prestígio. |
| `calcularBonusDefesaEquipamento`, `calcularResistenciaEquipamento`/`montarResistencias`, `calcularAjusteDadosEquipamento` (`agente/defesa.ts`, `agente/resistencia.ts`) | **Sim** | Recebem `itens: CarrinhoItemDto[]` cru — dão exatamente o bônus de Esquiva/Bloqueio/Defesa e resistência por tipo que o NPC precisaria somar a `bloquear`/`esquivar`/`defesaBase`. |
| `obterLimiteModificacoes` (limite de modificações por patente) | **Não direto** | Assinatura é `{ prestigio: number }` → deriva a `PatenteEnum` via `obterPatente`. NPC não tem Prestígio. Ver "Patente Equivalente" abaixo — precisa de uma entrada nova (por `PatenteEnum` direto, ou tabela própria `CategoriaNpcEnum → LimiteModificacoesDto`). |
| `calcularDanoCorpo`, `calcularDanoFurtivo`, `calcularInventario` (`agente/dano.ts`, `agente/inventario.ts`) | **Fora de escopo** | Dependem de `ClasseEnum` (Civil vs. agente) e de Nível/Mochileiro — conceitos de jogador, não do contrato de NPC. O Guia não menciona dano de corpo desarmado nem Mochileiro para NPC; não importar. |
| `calcularDefesa`, `calcularProficiencia`, `calcularContraAtaque` (`agente/defesa.ts`) | **Não** | Já existe equivalente próprio do NPC (`defesaBase` snapshot, Nível já soma como Proficiência — Guia `:954`); não trocar o cálculo do NPC pelo do agente, só reaproveitar o bônus de equipamento por cima. |
| Dano Furtivo (`MARCOS_DANO_FURTIVO`, progressão) | **Não** | NPC não possui por padrão (`:1037`); só entraria via habilidade específica, narrativa — fora do motor de equipamento. |

## Patente Equivalente — ambiguidade a decidir

A tabela do Guia mapeia cada Categoria a uma **faixa** de 2–3 patentes do agente, não a uma
única. Conferido contra `shared/src/regras/dados/patente.dados.ts`:

| Categoria | Patentes na faixa | `maxEmpilhamentos`/`maxModificacoes` na faixa |
|---|---|---|
| Civil | nenhuma (abaixo de Agente) | — |
| Operativo | Agente, Operador | 1/2 → 2/4 |
| Veterano | Experiente, Veterano | 2/6 → 3/9 |
| Elite | Força Tarefa, Força Tarefa Especial, Operações Especiais | 3/12 → 4/18 |
| Lendário | Líder Operacional (única; "ou superior" já é o topo da tabela) | 5/20 |

`obterLimiteModificacoes` recebe um único Prestígio e devolve uma única patente — não serve
de entrada direta para uma faixa. Duas opções, nenhuma implementada nesta rodada:

1. Nova tabela `CategoriaNpcEnum → PatenteEnum` fixando **um** ponto da faixa (ex.: o teto —
   Operador, Veterano, Operações Especiais, Líder Operacional), e uma função
   `obterLimiteModificacoesNpc`/sobrecarga de `obterLimiteModificacoes` que aceite
   `PatenteEnum` direto (sem recalcular por Prestígio).
2. Mesma tabela, mas fixando o **piso** da faixa (Agente, Experiente, Força Tarefa).

A ficha de Civil não tem patente equivalente alguma — "limite de acesso" para essa Categoria
precisa ser definido como ausência de modificação (equivalente a não reusar
`obterLimiteModificacoes`, e sim travar o acesso a `MODIFICACOES`/catálogo avançado direto no
fluxo do NPC Civil), não como uma extrapolação abaixo de `AGENTE` (que não existe no enum).

**Decisão do autor necessária:** piso ou teto da faixa (ou outro critério) antes de codar a
tabela de mapeamento; o "não equipar automaticamente no máximo" do Guia sugere que o limite
pode ser generoso (teto) já que é só um teto de acesso, não um equipamento padrão — mas é
escolha de produto, não dedução técnica.

## Fluxo de duas operações — teste e dano

Teste e dano **já são operações independentes** em todo o sistema, não uma invenção desta
spec: a Criatura (`FichaCriaturaAtaqueDto`, `shared/src/dtos/ficha/ficha-criatura.dtos.ts:195`)
persiste `teste` e `dano`/`danoCritico` como duas fórmulas de texto livre, roladas
separadamente pelo mestre — sem qualquer encadeamento automático. P-099 (descartada)
confirmou que o sistema nunca deve inferir a segunda rolagem pela primeira.

Para o NPC, a diferença é que a Criatura **não** usa o motor de equipamento (fórmula livre
por VD, sem catálogo); o NPC, pelo Guia, **usa o catálogo real do agente**. Isso implica:

- **Teste:** Luta/Pontaria padrão, com Modificador de Categoria quando o atributo for
  Competência — é exatamente o motor da m4-19 (`shared/regras/npc`, ainda não implementado),
  não uma fórmula nova desta spec. Dependência confirmada, sem duplicar o teste aqui.
- **Dano:** resolvido pelo equipamento (`calcularStatItem`), igual ao agente — o mestre lê o
  dano já calculado do item equipado e rola a notação na bandeja/montador, como qualquer
  outra rolagem de dano hoje. Nenhuma inferência "teste crítico → dobra automática do dano do
  item" — mesma régua do crítico de teste (P-097-01) versus rolagem resultante.

Nenhum fluxo novo de UI é necessário para "confirmar e rolar dano depois" — é o padrão já
usado pelo agente (ver item de Medicina/cura, também duas rolagens manuais separadas).

## Contrato JSONB proposto (para a task executável, não implementado aqui)

Estender `FichaNpcDadosDto` com um campo `inventario?: readonly CarrinhoItemDto[]`
(reusando o DTO do agente, sem redefinir forma — `AGENTS.md`: DTOs de negócio não se
duplicam). NPC antigo sem o campo deve continuar legível (`inventario ?? []`, sem exigir
migração). `defesaBase`/`bloquear`/`esquivar` continuam snapshot manual na criação (soma do
bônus de equipamento calculada uma vez, como Vida/Defesa já funcionam), **não** virar campo
computado ao vivo — mesma filosofia do resto do NPC (m3-10).

## UI — análogo aprovado (para quando a task virar execução)

`ficha-inventario` (`frontend/src/app/modules/ficha/componentes/ficha-inventario/`), do
jogador, é o análogo direto — mesmo carrinho (`CarrinhoItemDto`), mesmas categorias, mesmo
catálogo. A ficha de NPC herdaria a mesma inspeção de API completa de `shared/ui/` que as
demais tasks de NPC já seguem (m4-16…m4-19): não é objeto desta investigação documental,
fica registrado como dependência da task de implementação.

## Compatibilidade e permissões

- **NPC antigo:** sem `inventario` persistido, trata como lista vazia — sem perda de recurso,
  sem migração de dados.
- **Leitor autorizado:** vê o inventário/equipamento apresentado, sem editar nem rolar (mesma
  regra já decidida para Competências/dadinho na m4-19) — não é uma decisão nova desta spec.
- **Mestre:** único a equipar/desequipar e rolar; mesma matriz de permissão do resto da ficha
  de NPC (SCHEMA.md:759–764).

## Reaproveitamento que NÃO deve acontecer

- Não copiar Maestria, Formação, Lesão ou progressão do agente — Guia confirma que o NPC não
  tem essas camadas (`SCHEMA.md:685–688`).
- Não equipar automaticamente no teto da Patente Equivalente — é limite de acesso, decisão do
  mestre.
- Não inferir Dano Furtivo nem dano resultante pelo resultado do teste.

## Decisão do autor — Categoria Civil (2026-10-06)

Confirmado: a Categoria **Civil** do NPC segue a mesma restrição de categoria do Civil
**jogador** (`civil-guia-criacao`, sistema v4.1.3 "Equipamento Inicial") — sem acesso a
`ItemCategoriaEnum.PROTECOES` nem `ItemCategoriaEnum.EXPLOSIVOS` no catálogo. É uma decisão
própria do NPC (o autor escolheu espelhar, não uma herança automática de `ClasseEnum`/Civil
do jogador — os dois eixos continuam sem relação de código, só a mesma regra de produto
aplicada aos dois). Sem patente equivalente (abaixo do piso do enum), Civil também não tem
acesso a modificações — coerente com não ter Competências nem Energia (Guia `:977`).
`guia-equipamento-loja.component.ts` ganharia o mesmo `input()` de categorias vetadas já
proposto para o Civil jogador, reusado (não duplicado) para o NPC Civil na task executável.

## Decisões pendentes do autor (antes de qualquer task executável)

1. **Patente Equivalente — qual patente usar dentro da faixa.** A tabela do Guia não dá uma
   patente só por Categoria, dá uma faixa de 2–3. Exemplo concreto, Categoria **Elite**
   ("Força Tarefa / Operações Especiais"):

   | Patente da faixa | Empilhamentos por mod. | Mods por item |
   |---|---:|---:|
   | Força Tarefa (piso) | 3 | 12 |
   | Força Tarefa Especial (meio) | 4 | 15 |
   | Operações Especiais (teto) | 4 | 18 |

   Preciso que você escolha: um NPC Elite pode equipar um item com até **12** modificações
   (piso da faixa) ou até **18** (teto da faixa)? O mesmo vale para Operativo (Agente/Operador:
   2 ou 4 mods) e Veterano (Experiente/Veterano: 6 ou 9 mods). Lendário não tem ambiguidade
   (só Líder Operacional, 20 mods).
2. ~~Forma do contrato / restrição de categoria do Civil~~ — **resolvida acima.**
3. **Timing:** esta investigação não depende de m4-19 estar implementada para ser decidida,
   mas a task executável de ataques/equipamento deveria vir depois (ou junto) da m4-19, já
   que o teste de ataque é o mesmo motor de teste de atributo.

## Fora de Escopo (preservado da spec original)

Implementar agora, expandir m4-19, criar classe/progressão de NPC, equipar automaticamente,
inferir dano/cura, ou alterar fontes do jogo.

## Dependências

Guia v4.2.0 > NPC > Ataques/Equipamentos (`:1031–1037`); m4-19 (Competências/teste de
atributo); `shared/src/regras/compras`, `shared/src/regras/agente/{defesa,resistencia}.ts`;
SCHEMA.md (`FichaNpcDadosDto`); `docs/design/` para a UI futura.
