# montador-atributos-poc.spec.md

> POC visual solicitada pelo autor em 2026-10-25. Avaliar antes de alterar a aplicação.

## Objetivo

Mostrar uma alternativa interativa para o teste de atributo do montador, mais compacta e sem deslocamentos ao alternar um atributo, soma e média. Preservar a identidade visual do produto.

Após aprovação visual do teste pelo autor, em 2026-10-25, estender a mesma POC ao modelo de dano de arma. A aprovação não autoriza integrar ao produto.

## Entregáveis

1. POC isolada em `montador-atributos-poc/prototipo/`, consumindo os componentes reais de `shared/ui` e os tokens do projeto, sem modificar suas fontes.
2. Um bloco de atributos com modo de combinação e dois seletores estáveis; segundo seletor desabilitado em “Só um”, preservando sua escolha nas alternâncias.
3. Ajustes de teste e resumo em posições estáveis; desfazer e restaurar exemplo funcionais, sem persistência ou chamadas à API.
4. Relatório de inspeção e acesso local à POC. A implementação no produto depende de avaliação posterior do autor.
5. Prévia de dano de arma: botões de d3/d4/d6/d8/d10/d12/d20 acrescentam ou somam termos pelo auxiliar do montador atual; lista com quantidade, seleção e remoção por termo; tipo e divisão por botões numa área de edição estável. Tipos e opções independentes por termo. Atributo com sinal, proficiência/nível, bônus fixo e repetição. Seletor entre os dois modelos preserva os estados. A limitação inicial de um conjunto de dados foi rejeitada pelo autor e removida.
6. Após nova orientação do autor, atributos, Proficiência, Nível e números também são termos independentes, com sinal, tipo e divisão próprios; fontes têm multiplicador editável. Eliminar o tipo comum de atributo/bônus. Destacar a linha inteira selecionada com brilho discreto, separar lista/edição no desktop e oferecer exemplo misto verificável.

7. Após aprovação visual do dano pelo autor, acrescentar Dados livres: início vazio, termos sem tipo pré-selecionado, edição independente e expressão como bônus ou quantidade de dados, com validação e aplicação explícita. Os três modelos preservam seus estados ao alternar.

8. Após aprovação visual dos três modelos pelo autor, acrescentar guia de uso do montador, complementar ao guia de expressões existente. Cobrir modelos, adição/seleção/edição de termos, quantidade versus multiplicador, independência dos tipos, divisão, opções, repetição, correção e exemplos. Acesso pelos três modelos sem perder a montagem.

## Critérios de Aceite

- Inspeção da POC nos viewports 1920×1080, 1366×768, 960×1080 e 360×800.
- Alternar Só um/Soma/Média e atributos não desloca as seções seguintes nem o rodapé.
- Sem overflow horizontal; teclado e controles acessíveis, alvos móveis de 44px.
- Análogo: `MontadorRolagem`/`MontadorEditorPecas` atuais, moldura `PainelFlutuante`, tipografia IBM Plex, mesma densidade, tokens e controles reais.
- Build isolado e `npm run repo:verificar`; nenhuma alteração em frontend, backend ou shared.

## Fora de Escopo

Integração à aplicação, alterar regras, novos primitivos, salvar ou registrar rolagens. Atalhos da ficha e edição textual de toda a fórmula ainda não estão representados. O botão do rodapé simula o resultado localmente pelo motor existente.

## Dependências

`docs/design/DESIGN.md`, handoff `docs/design/tema/`, montador atual e seus auxiliares puros.

## Fechamento

Os três modelos e o guia foram aprovados pelo autor; a autorização posterior de integração
e commit foi tratada na spec `montador-rolagem-interface-e-guia.spec.md`. Esta POC permanece
como referência visual isolada. Build conferido novamente depois do arquivamento em done;
o import do GuiaFormula acompanha sua realocação mecânica para shared.
