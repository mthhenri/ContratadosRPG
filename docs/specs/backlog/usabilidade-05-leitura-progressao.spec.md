# Usabilidade 05 — Ganhos e escolhas da progressão

> Task 5/6 da revisão pública de 09/10/2026; recorte de progressão do achado U-04 no [relatório](../active/usabilidade-classes-condicoes-2026-10-09/RELATORIO.md). Quebra solicitada pelo autor. Prioridade média.

## Objetivo

Facilitar a leitura do que um nível concede e do que exige escolher, relacionando a explicação
à classe/registro. Conservar a distinção entre ganhos do nível atual e progressão acumulada.

## Entregáveis

1. Orientação de progressão junto dos painéis existentes na Simulação, separando ganhos
   concedidos de escolhas necessárias segundo o domínio vigente e vinculando à regra completa.
2. Organização da consulta pública Níveis e Melhorias de Agente que explicite como combinar
   regras gerais e de classe, preservando texto/tabela integrais e destinos existentes.
3. Avaliação inicial do fluxo autenticado de evolução da ficha, para evitar sugerir ações que
   já sejam automáticas; registrar limites se não houver acesso, sem implementar nessa ficha.
4. Proposta/verificação em `usabilidade-05-leitura-progressao/`; capturas locais em
   `.artifacts/usabilidade-05-leitura-progressao/`.

## Critérios de Aceite

No nível inicial, níveis com escolhas e limites de cada registro, a interface distingue o que
foi concedido naquele nível, o que é acumulado e o que o jogador precisa decidir. Conferir
classes base, Experimentos e Treinamentos civis: não generalizar uma progressão para todos.
Conteúdo corresponde ao livro; explicações dinâmicas não duplicam regras fora de `shared/regras`.

Análogo: Benefícios deste Nível/Progressão Acumulada e seção pública de progressão existentes.
Inspecionar e registrar o corte visual antes de editar; primitivos e tema obrigatórios, ampliação
de biblioteca somente após decisão do autor. Pesquisa, tabela integral e links devem continuar funcionando.

Usar `verify` nos quatro viewports 1920×1080, 1366×768, 960×1080 e 360×800: início, marcos de
escolha e limite de progressão, Civil, leitura longa, links, foco e mobile. Registrar comparação
visual, checagens proporcionais ao domínio, build, lint e `repo:verificar`. Falta de acesso à
jornada autenticada requerida mantém esse item aberto, sem presumir conclusão.

## Fora de Escopo

Automatizar evolução/persistência de ficha, criar novas regras de progressão ou checklist salvo;
alterar fórmulas de estatísticas (task 04); reconstruir toda a seção de Regras.

## Dependências

Constituição/convenções, design e tema; Sistema vigente, Níveis e Melhorias/Classes/Subclasse/Civil;
contratos de progressão em `shared/regras` e fluxo de ficha atual. Acesso local autorizado para
a inspeção autenticada; não inferir autorização de login a partir desta spec.
