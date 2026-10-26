# Montador de rolagens — plano de integração

**Objetivo:** integrar a POC aprovada preservando contratos e gramática.
**Arquitetura:** MontadorRolagem continua dono da fórmula/histórico/janela; MontadorEditorPecas apresenta teste ou delega termos; editor de termos organiza lista/adição/seleção; editor de peça emite substituições isoladas. Funções puras atuais montam/interpretam. Guia fora do painel preserva foco e reutiliza GuiaFormula compartilhado.
**Stack:** Angular standalone/Signals, Reactive Forms, primitivas reais e tokens atuais.
**Spec:** `../montador-rolagem-interface-e-guia.spec.md`.

## Restrições e foco de revisão

- Fórmula externa nunca é sobrescrita na abertura ou por seleção de linha.
- Seleção deve reconciliar remoções, Desfazer e alterações externas, inclusive lista vazia.
- Fontes escaladas/divididas, contas e atalhos precisam continuar representados sem perda de tipo/opção.
- Não copiar POC com dados de exemplo nem estado que compita com o texto.
- Não alterar primitivos nem regras; todos os consumidores do montador recebem a melhoria.

## Cortes executáveis

- [x] Acrescentar testes que falhem para seleção/edição independente/multiplicador, segundo atributo estável e preservação de modelos.
- [x] Implementar editor de peça + lista de termos e adaptar o editor de teste sobre os auxiliares existentes. Testar o recorte e corpus.
- [x] Integrar modelos/guia/tamanho na casca, mantendo visor, resultado, atalhos e consumidor de rolagem.
- [x] Em paralelo, migrar GuiaFormula e guia aprovado (responsabilidade independente do subagente; sem commit).
- [x] Subir stack local, dirigir consumidores reais nos quatro viewports e comparar com POC; corrigir divergências.
- [x] Consolidar lint/testes/build/revisão; documentar evidências, fechar specs, conferir organização/staged e commitar com coautoria.
