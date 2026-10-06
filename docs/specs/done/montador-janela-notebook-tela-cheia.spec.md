# montador-janela-notebook-tela-cheia.spec.md

> Pedido do autor, fora do guarda-chuva `montador-rolagem-experimento.spec.md` (`IDEAS.md` `I-041`), que segue em avaliação.

## Objetivo

A janela flutuante do montador de rolagem passa a caber no viewport Notebook (`1366×768`) e ganha o modo "ocupa a
viewport" (maximizar/restaurar). Vale para as quatro versões: Atual (`MontadorRolagem`) e Essencial/Completo/Blocos
(`MontadorRolagemExperimental`).

## Diagnóstico (ao vivo, `1366×768`)

As quatro versões estouram a base da tela: janela de 700–725px de altura em `y≈84`, base em `784 > 768`; o rodapé
(Desfazer · Limpar · Rolar) encosta na borda e a alça de redimensionar sai da tela. Causa: a margem de 16px do CSS não
entra no limite que `app-painel-flutuante` aplica à posição (ele só conhece o retângulo sem a margem).

## Entregáveis

1. Classe `JanelaMontador` (`shared/janela-montador/`), sem DI, usada pelas duas casas: tamanho desejado, viewport,
   tamanho efetivo (nunca maior que o viewport menos a margem), redimensionar por alça limitado ao espaço restante e
   maximizar/restaurar (guarda e devolve a posição; não persiste `0,0`). Substitui a lógica de redimensionar duplicada.
2. Margem de 16px da janela sai do SCSS (desktop); a posição inicial compensa. O tamanho inicial é reduzido para caber
   abaixo da posição inicial em telas baixas.
3. Botão **Maximizar/Restaurar** em `[painelAcoesExtras]` (mesmo padrão do Caderno), oculto no mobile (já é folha
   cheia). Maximizada: `[maximizada]` (sem raio), tamanho = viewport, sem alça de redimensionar. Fechar restaura.

## Critérios de Aceite

- Testes unitários da `JanelaMontador` e dos dois componentes (maximizar, restaurar, fechar maximizada, alça oculta).
- `verify` em `1366×768`, `1920×1080` e `360×800`, nas quatro versões: janela inteira dentro do viewport, Rolar visível,
  maximizar/restaurar funcionando, uso no mobile inalterado.

## Fora de Escopo

Layout interno diferente para a janela maximizada (os editores só ganham a largura); Fullscreen API do navegador;
persistir o tamanho entre sessões; backend.

## Dependências

Nenhuma. Análogo aprovado: maximizar do `CadernoFlutuante`.
