# montador-rolagem-interface-e-guia.spec.md

> Integração aprovada pelo autor em 2026-10-25, após avaliação iterativa da POC `montador-atributos-poc`. Autor pediu implementar e criar o commit, sem solicitar publicação.

## Objetivo

Levar à aplicação os três modelos e o guia aprovados, tornando a montagem previsível sem reduzir os recursos do montador atual. A fórmula da barra continua sendo a fonte única da edição e o motor existente continua calculando/validando.

## Entregáveis

1. Teste de atributo: dois seletores estáveis acima de Só um/Soma/Média; segundo seletor desabilitado em Só um e escolha preservada; Proficiência/Nível antes dos dados a mais/menos e bônus fixo. Opções manter/crítico/repetição mantidas.
2. Dano de arma e Dados livres: botões de todos os dados; lista de **todas** as peças com seleção da linha inteira/brilho discreto; edição da peça selecionada em área fixa, ao lado no desktop e abaixo em janela estreita.
3. Cada dado, atributo, Proficiência, Nível, número e conta preserva sinal/tipo/divisão próprios. Multiplicador de fonte editável, preservando fontes divididas existentes. Nenhum tipo comum que altere outros termos.
4. Preservar inclusão/remoção/quantidade, expressões na quantidade e bônus, atalhos CORPO/FURTIVO disponíveis, opções por dado, repetição, valores atuais da ficha, digitação no visor, avançada/inválida, Desfazer/Limpar, último resultado e rolagem/histórico pelo consumidor existente. Não substituir a fonte de verdade por um estado paralelo da POC.
5. Modelos acessíveis por seleção estável; montagens locais preservadas ao alternar, sem persistência nova. Janela continua arrastável/redimensionável/maximizável e cabe nos quatro viewports.
6. Guia de uso aprovado no cabeçalho, complementar ao guia de expressões existente, preservando fórmula/foco ao abrir/fechar. Remover do conteúdo de produto os avisos/dados de demonstração da POC. Exemplos do guia são instruções, sem botões da demonstração no editor real.
7. Separar responsabilidades entre casca, editor de teste, lista/adição de termos, edição da peça e guia. GuiaFormula passa mecanicamente para shared do frontend, sem modificar sua gramática.
8. Revisão, evidências na aplicação real, documentação de contexto e commit com coautoria Codex; specs e anexos nos destinos canônicos.

## Critérios de Aceite

- Testes demonstram valor/tipo independente: Força ×2 e Proficiência Físicos, d8/Nível Balísticos; quantidade/opções de um dado não afetam outro; expressão inválida não destrói a fórmula; atalhos e corpus existente continuam aceitos.
- Texto da barra e visor sincronizam em ambos os sentidos; externo/Desfazer/remover selecionado/limpar deixam seleção e editor coerentes.
- Testes de componente para o teste com segundo atributo estável, seleção, multiplicador e modelos; guia aninhado não perde fórmula/foco. Testes/lint/build proporcionais e suites nos gates finais.
- `verify` no stack real em 1920×1080, 1366×768, 960×1080 e 360×800; checar modelos, guia/expressões, estados vazio/preenchido/inválido/avançado/resultado e rolar/registrar. Análogo visual: POC aprovada, com shell/controles atuais. Inspeção pessoal do agente principal.
- Mapa de impacto inclui RolagemRapida e RolagemAvulso, suas telas consumidoras e importadores do GuiaFormula; sem controle/tema compartilhado alterado silenciosamente.
- `npm run repo:verificar` e, após preparar arquivos, `npm run repo:verificar -- --staged`; mensagem do commit conferida com trailer Co-authored-by.

## Fora de Escopo

Alterar regras/gramática, backend/SQL/WebSocket/permissões, dependências, publicar versão/push/deploy, persistir preferências ou exemplos de demonstração na ficha. A POC não vira componente de produção por cópia de seu estado local.

## Dependências

POC aprovada em `docs/specs/done/montador-atributos-poc.spec.md`, `docs/design/DESIGN.md`, `docs/design/tema/`, motor e auxiliares atuais do montador.
