# P-101 — Criaturas e Guia v4.2.0: verificação integrada

**Data:** 2026-10-06. **Estado:** P-101-01, P-101-02 e P-101-03 concluídas,
com execução conjunta autorizada pelo autor. Guarda-chuva P-101 concluído.

## Matriz documento → regra → consumidores

| Fonte canônica | Regra confirmada | Consumidor e resultado |
|---|---|---|
| Guia v4.2.0, Atributos/Realocação, linhas 421–439 | Até três pontos retirados **no total**, de uma ou mais origens; negativo permitido | `shared/regras/criatura/atributos.ts`: consulta única de base, teto, piso, retirados, gastos, saldo e violações. Assistente e criação REST consomem a mesma validação |
| Mesma seção | Teto por VD e pontos de ajuste devem fechar a distribuição inicial | Assistente bloqueia avanço/registro inválido; REST rejeita orçamento, teto e retirada excessivos. Edição de ficha pronta preserva snapshots fora desse orçamento inicial |
| Guia, Modificadores/DT, linhas 457–492 | Modificador soma ao resultado do teste; DT = `10 + atributo + trunc(modificador/2)` | `calcularDtAtributoCriatura` em shared; assistente e ficha usam a consulta. Helper antigo de Atributo Efetivo e seu DTO removidos após inventário de todos os usos |
| Sistema v4.1.3, Testes/desvantagem; motor compartilhado | Zero/negativo ativa desvantagem intrínseca; modificador continua fixo | Executor de Criatura já correto, preservado. Novas provas de zero/−1/−2: 2/3/4 D20, mantém menor e soma −3. Preview usa fonte simbólica do atributo, evitando quantidade literal negativa |
| Guia, A Estátua, linhas 791–869 | Explosão26; Esmagamento3D12+4; resistência contra DT Força17 | Fixture completa shared e fixture do assistente alinhadas. Referência geral de ataque Padrão continua 4D12+10; redução do exemplo acompanha seu efeito adicional |
| Guia, Cadência, linhas 675–700 | Turnos excedentes ficam no fim quando faltam posições | `intercalarCadencia` e teste existente já compatíveis. Só comentário canônico alterado; algoritmo conservado |
| Guia, Biblioteca de NPC | DTs de efeitos apontam para Pontaria/Social | Inventário de `shared/regras/npc/referencia.ts`, `biblioteca-referencia.spec.ts` e consumidores: catálogo do produto guarda nome, custo e descrição genérica, sem copiar aquelas condições/DTs. Nenhuma alteração de conteúdo necessária; nenhum parser criado |
| Encontro e resumos | DT é derivada contextual, sem novo campo persistido | `encontro-combatente.mapper.ts` lê Vida/Defesa armazenadas e Destreza base; resumos não calculam DT nem usam o helper removido. Sem novo campo, migration ou recálculo desses consumidores |

Contratos novos estão em `shared/src/dtos/ficha/ficha-criatura-calculo.dtos.ts`,
exportados pelo barrel existente. Não herdam DTOs de negócio. UI apresenta a consulta;
service aplica permissões e validação de criação; regras puras permanecem em shared.

Não houve nova responsabilidade de domínio no componente extenso: foram substituídos
helpers e contas locais, retirado o clamp e encaminhada a consulta compartilhada. O acréscimo
ao service é somente a validação da distribuição antes da persistência, sem duplicar fórmula.
O formato persistido de `ficha.dados` não mudou; nenhuma atualização de schema necessária.

## Gate visual: análogos e comparação pessoal

Análogos escolhidos antes das edições: assistente atual de Criatura (shell, roteiro,
resumo, métricas e grade de atributos), ficha atual de Criatura (grade de leitura/edição)
e nome/sigla com tooltip de DT dos atributos de NPC/Jogador. Código e aplicação real
inspecionados, usando `verify` e `design-fidelity`.

Preservados shell, hierarquia, espaçamento, densidade, ícones e respostas ao breakpoint.
Novo contador usa `app-stat` com `tamanho="compacto"`, no mesmo grupo de métricas.
Campos continuam `app-step-input` compacto no guia e mini na edição; botões de ações
mantêm variantes/tamanhos existentes. DT usa `appTooltip` e nome acessível no mesmo
padrão do análogo. Ícone de erro usa `app-icone`. Sem novo CSS, controle ou variante local.

| Viewport | Estados exercitados no app real | Resultado |
|---|---|---|
| 1920×1080 | Distribuição negativa, múltiplas origens, saldo/teto inválidos, retomada, DT, revisão, criação, ficha, edição/cancelamento/salvamento, reabertura e leitor | Aprovado |
| 360×800 | Mesmos estados; foco por teclado e alvos de toque | Aprovado |
| 960×1080 | Mesmos estados; resumo abaixo do formulário e ficha em coluna | Aprovado |
| 1366×768 | Mesmos estados; layout de notebook e rolagem vertical | Aprovado |

O agente principal inspecionou pessoalmente a renderização/capturas nos quatro viewports,
incluindo erros, negativos, DTs, edição e leitura. A implementação parece parte do mesmo
produto: tipografia IBM Plex, superfícies, densidade e hierarquia do análogo preservadas;
controles canônicos e nenhum aspecto de formulário HTML genérico. Sem overflow horizontal
nos estados percorridos; contraste e foco observados. Tab chega ao input Social, com
contorno sólido de 2px. No mobile, botão do StepInput mede 44×54px.

**Correção encontrada na verificação:** o clamp no guia podia deixar o input exibindo9
enquanto o estado havia sido limitado a4. O guia agora conserva a digitação finita e
mostra as violações da consulta, bloqueando avanço; os botões respeitam piso/teto.
Prova automatizada e reprodução real confirmam que9 permanece visível até a correção.
Não houve alteração adicional no primitivo StepInput.

## Provas REST e preservação

- Quatro criações reais (HTTP201): VD5, Social−1, Medicina0, retirada total3,
  Força4/Luta2; Vida175/Defesa17. Retomada e reabertura mantiveram os valores.
- Criação inválida recusada (HTTP400): quatro retirados de duas origens com saldo zero,
  teto ultrapassado e orçamento excedido. Mesmas violações vistas no assistente.
- Consulta de DT: Social−1/Frágil−3 →8; Força3/Médio9 →17;
  Luta5/Forte12 →21. Bônus zero e metade negativa também cobertos nas provas puras.
- Edição real salva e reabre negativos nos quatro viewports (HTTP200); cancelar não
  grava o rascunho. Edição de snapshot com Social−4/Força12 foi aceita sem orçamento
  de criação; Vida777, Defesa43 e fórmulas livres conferidas por igualdade integral.
  Salvamento posterior pela UI também preservou Vida, Defesa e ataques desse snapshot.
- Segundo usuário com concessão lê DT e bônus, sem edição/rolagem; anotações privadas
  não aparecem na resposta nem na tela. Rolagens de Criatura continuam privadas.

## Gates de código

| Comando / recorte | Resultado final |
|---|---|
| `npm run test --workspace=shared` | 66 arquivos, 1.111 testes aprovados |
| `npm run test --workspace=backend` | 52 arquivos, 964 aprovados + 1 skip existente |
| `npm run test --workspace=frontend` | 213 arquivos, 3.014 aprovados; repetida após correção do clamp |
| `npm run test --workspace=backend -- src/modules/ficha/ficha.service.spec.ts` | 211 aprovados após ajuste final das fixtures |
| `npm run build --workspace=shared` | Aprovado; executado antes da verificação REST |
| `npm run build --workspace=backend` | Aprovado |
| `npm run build --workspace=frontend` | Aprovado após correção final |
| `npm run lint` + lint backend/frontend após os ajustes finais | Todos sem erros; backend inclui checagem de tipos das specs |
| Revisão do diff e `git diff --check` | Sem erros; contratos/consumidores e primitivos conferidos |

Total do gate amplo: **5.089 aprovados + 1 skip**. Classes de avisos já presentes no
repositório: ESLint shared: 5.879/backend: 4.451/frontend: 27.065, sem erros;
bundle frontend: 557,18kB acima do orçamento de450kB; jsdom informa ausência de canvas
nos testes do leitor de PDF.
Esses avisos não impedem os comandos. Na implementação, fixtures novas receberam ajuste
de resistências para VD5 e remoção de campos duplicados detectados pela checagem de tipos;
falhas corrigidas antes do fecho. Depois dos gates, somente comentários canônicos e
quebras de linha de expressões HTML foram alinhados, sem alterar seu comportamento.

## Pendências editoriais para decisão do autor

Estas propostas cumprem P-101-03; não alteram o livro nem bloqueiam a implementação,
pois a decisão de m4-02 já determina que a fórmula geral prevalece sobre o exemplo.

| Trecho do exemplo A Estátua | Proposta concreta | Motivo |
|---|---|---|
| Fraco+6 em Intelecto, Medicina e Vontade, VD30 | Trocar os três bônus por **+5** | `−2 + 5×1,5 = 5,5`, arredondado para baixo segundo a tabela geral |
| Narrativa de Social base2→0 como retirada de “três pontos” | Trocar por **“dois pontos”**, mantendo os atributos finais | O exemplo eleva oito acima da base, devolve dois e consome seis de ajuste; já fecha o orçamento |

Não há pendência técnica ou visual na P-101. P-102, m4-19 e investigação de
ataques/equipamentos NPC continuam em suas specs; nenhuma foi encerrada por este fecho.

## Evidências e limpeza

- [Resultados REST e quatro jornadas](p-101/resultados.json).
- [Foco, alvos e salvamento/reabertura](p-101/foco-salvamento.json).
- [Comparação anterior, desktop](p-101/antes-1920-atributos.png) e
  [estado final com foco](p-101/foco-1920-viewport.png).
- [Foco mobile](p-101/foco-360-viewport.png),
  [retirada inválida mobile](p-101/depois-360-realocacao-invalida.png),
  [DT positiva](p-101/depois-1366-dt-positiva.png) e
  [edição negativa](p-101/salvar-960-atributos.png).
- [Limpeza sintética](p-101/limpeza.json): fichas196–199, campanha35 e contas57/58
  excluídas exclusivamente por soft delete REST; consultas de ficha/campanha retornam404.
  Dados existentes preservados. Removidos 17 arquivos transitórios (5.643.337 bytes):
  logs, helpers e sessão; alvos regulares conferidos dentro da raiz do workspace;
  evidências finais preservadas. Proposta M10 permanece intocada para sua conversa própria.

Nenhum commit, push, publicação ou alteração de versão nesta execução.
