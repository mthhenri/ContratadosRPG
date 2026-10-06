# m4-19-npc-testes-de-atributo-regra-e-rolagem.spec.md

> Task numerada da segunda revisão do NPC, após m4-16/17/18.
> **2026-10-06: execução autorizada.** Após o pedido de fechar decisões e implementar,
> o autor pediu para continuar. Execução segue as duas propostas apresentadas:
> crítico +2 uma vez no teste e indicador fixo de privacidade no cabeçalho.
> [Revisão vigente](../../reviews/m4-19-revisao-guia-v4.2.0.md).
> Auditoria/opções/probabilidades de 05/10 são evidência histórica, não contrato atual.

## Objetivo

Permitir ao mestre configurar ajustes de teste e Competências de NPC e rolar cada
atributo pelo dadinho da ficha. Compor a fórmula em shared conforme o Guia v4.2.0,
com leitor autorizado sem edição e rolagens privadas.

## Contrato e decisões já tomadas

- Fontes: Guia v4.2.0 > NPC > Nível, Atributos, Modificadores, DT e Ataques/Equipamentos;
  Sistema v4.1.3 > Testes e Crítico.
- Sem Competência: maior D20 do atributo + Nível + ajuste manual de resultado.
  Com Competência: acrescentar dados de Categoria da tabela. `dadosTeste` só ajusta D20.
- Nível 0–20, independente da Categoria. Civil Nível 0 soma zero; não zerar fichas
  existentes nem retirar o Nível de um Civil com outro Nível.
- Competência exige atributo base positivo; não altera atributo, Defesa ou DT.
  Habilidades não aumentam quantidade/faces desses dados; crítico não os dobra.
- P-097-01 já trata crítico no teste com um pool. Esclarecimento posterior do autor:
  teste e dano/cura resultantes são operações separadas; API não deduz a segunda.
  Dados de Competência pertencem ao teste pelo contrato explícito do NPC, não são
  a rolagem posterior. Crítico do D20 mantido soma +2 uma única vez ao teste inteiro,
  sem dobrar Nível, ajustes fixos ou dados de Competência;
  proposta global P-099 descartada, preservada só como memória, sem execução nesta task.
- Bônus de habilidade/item manuais, conforme m3-31; nenhuma interpretação automática de texto.
- Leitor vê valores, ajustes e Competências apresentados; não edita nem rola.
  Anotações privadas; sem concessão, sem acesso. Não ocultar mapas nem alterar Conduta.
- Dadinho por atributo e item “Ocultar rolagens” aprovados; autor declarou rolagens
  sempre ocultas. Execução `PRIVADA`, sem autorização presumida de exposição pública.

| Categoria | Dados da Competência | Quantidade de Competências |
|---|---|---|
| Civil | Nenhum | 0 |
| Operativo | 1D4 | 2 |
| Veterano | 1D6 | 3 |
| Elite | 2D6 | 4 |
| Lendário | 3D6 | 5 |

## Entregáveis

1. **Contrato, validação e persistência.** Estender `FichaNpcDadosDto` em `shared/src/dtos/ficha/`
   com `competencias` (chaves únicas de `FichaAtributosDto`), `modificadoresTeste` e `dadosTeste`.
   Mapas opcionais com mesmo contrato do Jogador; ausência de ajuste equivale a zero.
   Dados de Categoria derivados, nunca campo livre ou lançamento nos mapas manuais.
   JSONB `dados`, sem coluna nova; atualizar SCHEMA, validação estrutural backend e
   `validarFichaNpc`. Inteiros/chaves válidos para mapas, negativos permitidos, sem
   faixas arbitrárias. Competências positivas, únicas e na quantidade canônica.
   NPC antigo sem campos permanece legível e salva recursos sem escolhas automáticas;
   ao configurar o bloco explicitamente, exigir seleção canônica. Criação nova exige
   quantidade da tabela. Categoria/atributo incompatível com seleção gera conflito no
   bloco, sem apagar ou substituir escolhas silenciosamente.
2. **Regra pura única.** Tabela e composição da fórmula em `shared/regras/npc`, usando
   atributo + ajuste D20, Nível, ajuste fixo e dados de Competência. Consumir motor existente;
   nunca somar +2 no frontend. Pool zero usa dois D20; negativo usa `2 + abs(pool)` D20,
   mantendo o menor, conforme motor vigente/m3-31; sem mínimo de dois em teste normal. Competência depende do atributo base,
   não de ajuste temporário. Não alterar DT `10 + Nível + 2 × atributo` ou recursos.
   Antes de alterar crítico, registrar contrato da ação escolhida: este botão é teste
   de atributo; não inferir resultado futuro da quantidade/faces dos pools. Separar
   o bônus do teste dos dados resultantes conforme decisão registrada nesta execução.
3. **Criação/configuração.** Seleção de Competências no bloco Atributos do assistente
   e da ficha pronta, com contagem necessária/selecionada e dado de Categoria separado
   do ajuste D20 e fixo. Salvar/Cancelar conforme m4-16. P-100 adapta atributos zero.
   Antes de UI, ler DESIGN e tema; análogos: assistente atual de NPC, `npc-atributos`
   e `app-atributo-ficha` no Jogador. Registrar também controle de seleção aprovado de
   `shared/ui/`, inspecionar API completa e usar seus inputs de forma/densidade. Se
   faltar capacidade/primitivo, perguntar ao autor antes de criar HTML/CSS locais.
4. **Dadinho/registro.** Ligar modificador, dados e rolar em `app-atributo-ficha`;
   Maestria/Lesão desligadas. Só mestre rola, tooltip/aria “Rolar teste de <Atributo>”.
   Bandeja global e registro existentes; histórico apresenta fórmula/contribuições completas.
   Conferir permissão no service e socket após registro; feed/leitor/evento não expõe
   rolagem privada. Item de ocultação conforme decisão visual abaixo, sem transição pública.
5. **Fecho.** Testar regras/validação, roundtrip, ficha antiga, permissões e
   registro privado. Atualizar HISTORY/CONTEXT/SCHEMA depois de executar; `done/` somente
   com gates completos.

## Decisões fechadas para execução

- Indicador fixo “Rolagens ocultas” no cabeçalho, usando `app-chip`; sem alternância pública.
- Crítico: Veterano Nível6, D20 mantido20 e D6=4 totaliza32. Máximo no D6 não gera crítico.
- Análogos: ficha de Jogador (`app-atributo-ficha`), edição do NPC (`npc-atributos`) e
  assistente atual. Seleção por botões `app-botao` tamanho médio, estilo contorno e
  `aria-pressed`, como a liberação Civil; leitura por chips. Não exige novo primitivo.
- Orquestração de rolagem extraída para service próprio para manter apresentação no componente.

## Critérios de Aceite

- Veterano Nível6, atributo3 com Competência, D20 `[18,11,8]` e D6 `[4]` → **28**;
  sem Competência → **24**. Bônus participa do teste; não é dano/cura posterior.
- Caso crítico acima totaliza32, sem inferência de rolagem futura nem dobra dos dados
  de Categoria. Não altera o classificador de fórmulas livres da P-099 descartada.
- Elite/Lendário somam todos os dados de Categoria, mantendo um D20. Máximo do D4/D6
  não gera crítico; D20 crítico descartado não conta. Margem ampliada/repetições cobertas.
- Zero não pode ser Competência, Civil não tem Competências; seleção única/quantidade correta.
  Testar Nível/pool zero, negativos e compatibilidade; média/faixa coerentes com o
  contrato final quando a fórmula for exibida no montador, sem regra duplicada na UI.
- NPC antigo abre/salva recursos sem perdas; mestre configura; leitor vê valores sem
  edição/rolagem/Anotações. Rolagem real persistida e socket/feed respeitam `PRIVADA`.
- Testes focados durante execução; fecho com builds, suítes completas, lint e typechecks
  dos três workspaces. Construir shared antes de usar backend rodando.
- Gate real `verify`/`design-fidelity` em `1920×1080`, `360×800`, `960×1080`, `1366×768`:
  criação/edição/leitura, cinco Categorias, seleção válida/inválida, ficha antiga,
  ajustes negativos, normal/crítico/desvantagem, histórico/ocultação. Principal inspeciona
  pessoalmente análogos, densidade/hierarquia, controles, foco/contraste/alvos e overflow.
  Dados de teste removidos por soft delete; teste unitário não substitui gate visual/socket.

## Fora de Escopo

- Alterar fontes autorais ou specs históricas em done.
- Vida/Energia/Defesa/DT/Proficiência do agente; Maestria/Lesão/Formação de NPC.
- Automatizar habilidades/equipamento, fluxo novo de ataque/dano/inventário ou Dano Furtivo.
- P-095/P-096, criação zero P-100 e Criaturas P-101: tasks separadas.
- P-099 descartada: não rastrear ou inferir rolagens futuras como parte desta task.

## Dependências

- m4-16/17/18 e P-097-01 concluídas.
- [P-100](../done/p-100-npc-criacao-atributo-zero.spec.md) concluída antes do fecho integrado;
  revisão do contrato de crítico no fluxo explicitamente escolhido, sem executar P-099.
- Fontes novas, SCHEMA, CONVENTIONS e docs/design; decisão m3-31.
- [Auditoria histórica](../../reviews/m4-19-auditoria.md) e
  [revisão vigente](../../reviews/m4-19-revisao-guia-v4.2.0.md).

## Riscos e Mitigação

Dados de Categoria não são D20, ponto de atributo ou bônus fixo: distinguir no contrato
na UI e nos testes. Não inventar Competências para legado. Crítico depende do contrato
revisado da ação, sem inferência de dano/cura futuro ou compensação local na UI/service.
Ocultação permanente não vira exposição pública
pela reutilização automática de uma alternância existente.

## Fecho — 2026-10-06

Contrato, validação, persistência, criação/configuração, dadinho, bandeja e registro
privados entregues. Crítico +2 uma vez pelo mantido, sem dobrar Competência; P-099
preservada como descarte. Legado sem configuração automática; conflitos mantêm escolhas.
Gates completos, aplicação real nos quatro viewports e privacidade REST/socket verificadas
em [relatório final](../../reviews/m4-19-verificacao.md). Dados sintéticos e resíduos limpos.
