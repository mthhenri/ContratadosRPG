# Verificação — interface e guia do montador

Data: 25/10/2026 (America/Sao_Paulo). Escopo: [spec](../montador-rolagem-interface-e-guia.spec.md).

## Entrega e arquitetura

Integrados os três modelos e o guia aprovados na POC. O texto continua a fonte única:
controles emitem fórmulas pelos auxiliares atuais, sem duplicar cálculo/gramática em UI.
Casca mantém janela, histórico e consumidor de rolagem; teste, lista/adição e inspeção de
termo têm componentes próprios. Apresentação de valores é função pura local do frontend.
GuiaFormula foi movido mecanicamente para shared; HTML/SCSS e conteúdo da gramática
preservados. Nenhum primitivo, token, DTO, regra, backend, SQL ou dependência alterado.

## Impacto

Mapa por `npm run impacto -- --simbolo MontadorRolagem`, imports e seletores:

| Contrato | Consumidores e decisão |
|---|---|
| MontadorRolagem | RolagemRapida e RolagemAvulso: API de entrada/saída e ato de rolar preservados; melhoria visual pedida em ambos |
| RolagemRapida | Fichas de jogador, criatura/NPC, campanha/cartões e cenas do mestre: recebem o mesmo componente; nenhuma regra de visibilidade/registro modificada |
| GuiaFormula | RolagemRapida, FichaRolagens, RolagemAvulso e POC: somente caminho de import; novo GuiaMontador usa a mesma instância de componente |
| shared/ui e motor | Somente consumidores; nenhuma alteração de contrato ou comportamento global |

## Verificação na aplicação real

Angular/Nest/Postgres locais (`localhost:4300`/`3100`), Chromium com barras visíveis,
contas NORMAL de teste separadas, campanha e fichas criadas por REST. Sem mock de API,
reset, seed ou uso de dados de produção. Cenário e saídas em
`.artifacts/montador-rolagem-interface-e-guia/` (ignorados).

Matriz: **1920×1080, 1366×768, 960×1080 e 360×800**, nas sete superfícies abaixo
(28 combinações; três modelos por combinação):

- ficha completa do jogador;
- ficha completa de criatura;
- ficha completa de NPC;
- campanha do jogador, incluindo coluna externa móvel;
- campanha do mestre;
- cena de Investigação do mestre;
- cena de Combate do mestre.

Em cada combinação: abrir, selecionar Teste/Dano/Livre, adicionar d8 separado, alterar
apenas seu tipo para Balístico, adicionar dado livre, impedir rolagem inválida, rolar
`1d6 + 3` com POST 201 real, mostrar/fechar resultado, fechar janela e devolver foco ao
gatilho. Sem overflow horizontal nem botões de fechamento bloqueados; sem pageerror.
As superfícies flutuantes e combatente avulso conservam a hospedagem já auditada em
`montador-rolagem-cobertura-telas/auditoria.md`; não foi repetida sua matriz integral.
Seu contrato direto, RolagemAvulso, permanece coberto pela suíte de componentes.

Na ficha do jogador, nos quatro tamanhos, também foram exercitados:

- Limpar teste e reconstruir pelos seletores; Só um/Soma/Média e segundo atributo estável;
- Força ×3 e PROF Físicos ao lado de d8/NIV Balísticos; opções do d8 independentes;
- remoção do selecionado, Desfazer e alteração externa da fórmula, divisor preservado;
- tentativa de decimal no divisor sem produzir fórmula inválida;
- expressão como quantidade, edição explícita e conta inválida que não sobrescreve a fórmula;
- fórmula avançada preservada; maximizar/restaurar nos desktops; minimizar/reabrir;
- três assuntos do guia, expressões em modal aninhado e fechamento por Escape;
- fórmula preservada e foco de volta ao botão Guia após fechar o modal.

## Gate visual e controles

Análogo: **POC aprovada**, moldura original do montador e controles reais do produto.
O principal inspecionou pessoalmente capturas dos quatro viewports, modelos, opções,
guias, resultados e consumidores. Comparação: mesma família visual IBM Plex/dark,
densidade e hierarquia; cartões, ícones, contraste, foco e estados canônicos; sem
aparência de formulário genérico nem overflow. Controles móveis usam alvos de 44px.
O inspetor mantém campos em posições estáveis; em telas estreitas a edição é alcançada
pelo scroll do próprio painel. A faixa de tipo permanece visível sob o brilho da seleção.
Corrigido durante o passe final o alinhamento do cabeçalho de resultado após retirar CSS
obsoleto. Campo/Stepper/Segmentado/Botao/BotaoIcone usam os inputs de forma/densidade.

## Revisão e testes

Delegação: subagentes Codex (modelo padrão), um para guia/migração independente e outro
para uma rodada de revisão somente leitura. O principal manteve arquitetura, integração,
inspeção visual e fecho. Três achados procedentes corrigidos: limpar teste sem perder os
controles, fator/divisor decimal normalizado e Desfazer de troca de modelo com mesmo texto.
Regressões reproduzidas em teste (5 falhas/9 aprovados antes), depois aprovadas e exercitadas
no browser. Guia fechado deixou de criar abas, corrigindo a regressão da suíte da campanha.

Leitura manual do diff e arquivos novos contra spec/convenções: responsabilidades separadas,
sem estado paralelo de fórmula, regra duplicada, HTML de controle novo ou tema local.
Buscas por imports antigos, estilos obsoletos e hardcodes novas conferidas no recorte.

| Gate | Resultado |
|---|---|
| Frontend completo | **292 arquivos, 3.622 testes aprovados**, mais 89 testes do leitor de regras |
| shared completo | **77 arquivos, 1.340 testes aprovados** |
| Recorte após revisão + layout | **8 arquivos, 84 testes aprovados** |
| Build produção frontend | Aprovado; aviso preexistente de bundle **603,33 kB / 450 kB**, igual ao registro da v1.12.0 |
| Lint frontend | **0 erros**; 28.849 warnings de convenções no conjunto, sem correção ampla fora do escopo |
| Organização e staged | `npm run repo:verificar` e `npm run repo:verificar -- --staged` executados no fecho |

Limites operacionais resolvidos sem alterar configuração do produto: TEMP/TMP locais para
evitar EPERM do Vitest; quatro workers na suíte final para evitar timeout de layout sob
excesso de paralelismo; `CI=true` no build para desativar cache persistente compartilhado
com o servidor (as tentativas com esse cache interromperam o processo nativo). Primeira
compilação restrita falhou ao buscar fontes; compilação final com acesso permitido passou.
Nenhuma suíte backend repetida: API, permissões, persistência e eventos não foram alterados;
registro real dos consumidores foi exercitado pela matriz acima. Não houve push/publicação.
