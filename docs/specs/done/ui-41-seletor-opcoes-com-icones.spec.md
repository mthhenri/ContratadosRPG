# ui-41-seletor-opcoes-com-icones.spec.md

> Correção solicitada pelo autor em 2026-10-17 após UI-41: os ícones também devem
> aparecer nas opções abertas. Autor aprovou criar um seletor reutilizável.

## Objetivo

Mostrar o ícone de cada tipo na lista aberta de Nova cena, mantendo o ícone no
valor selecionado e o formulário acessível por teclado e toque.

## Entregáveis

1. Primitivo `shared/ui/seletor`: opções com valor/rotulo/icone opcional e estado
   desabilitado, placeholder, integração ControlValueAccessor, estado disabled e
   semântica combobox/listbox. Uma seleção, sem busca remota ou multisseleção.
2. Teclado: Enter/Espaço e setas abrem; setas/Home/End navegam; Enter/Espaço
   confirmam; Escape cancela só a lista; Tab e clique fora fecham; letras localizam
   rótulos. Seleção atual preservada ao cancelar, foco permanece no controle.
3. Lista ancorada que caiba no viewport, com rolagem e opções de 44px; funciona
   dentro do modal nativo. Aplicar apenas ao Tipo de Nova cena, mantendo validação,
   Planejar/Abrir agora e os mapas de domínio existentes.
4. Registrar o primitivo em DESIGN.md e o resultado em contexto e relatório anexo.

## Critérios de Aceite

Testes do primitivo: CVA, valor externo, teclado, opções desabilitadas, cancelar,
blur/touched e disabled. Testes do diálogo selecionam cada tipo pela lista real e
confirmam DTOs e validação. Build, lint, suíte frontend e repo:verificar aprovados.
Gate visual real em 1920×1080 e 360×800: fechado/vazio, aberto com cinco ícones,
selecionado, teclado, Escape sem fechar modal, foco e ausência de overflow/corte.
Análogos: Campo da Biblioteca (controle) e MenuAcoes (lista, borda e destaque).
Tokens de docs/design/tema; nenhum primitivo existente ampliado ou substituído.

## Fora de Escopo

Migrar outros seletores, redesenhar ícones, multisseleção, filtros, regras de cena,
backend ou tempo real. Não reescrever a spec histórica UI-41 em done.

## Dependências

UI-41 concluída; docs/design/DESIGN.md e docs/design/tema/; autorização expressa
do autor nesta conversa para criar o novo primitivo.
