# Correção — abertura visível do leitor de documentos

> Task avulsa: corrige uma posição persistida que pode deixar o painel do leitor parcialmente fora do viewport ao ser reaberto.

## Objetivo

Garantir que o leitor de documentos abra completamente dentro da área visível, inclusive quando a posição salva pertence a uma janela ou monitor com dimensões diferentes. A correção preserva o painel como janela arrastável e a preferência local do usuário.

## Entregáveis

1. `app-painel-flutuante` reconcilia a posição persistida com o viewport após renderizar uma abertura, antes de receber o foco.
2. Um teste focado prova que uma posição salva fora dos limites é corrigida e persistida ao abrir, sem alterar o fluxo de arraste, minimizar ou o modo mobile.

## Critérios de Aceite

- O teste focado do primitivo passa e cobre uma posição persistida além das bordas da janela.
- Build, lint e a suíte de testes do frontend não introduzem falhas novas.
- Na aplicação real, o leitor de documentos abre inteiro em `1920×1080` e `360×800`, com uma posição persistida propositalmente fora do viewport no desktop; não há corte nem overflow horizontal.
- A moldura, cabeçalho, controles e densidade continuam coerentes com o análogo `app-painel-flutuante`/`CadernoFlutuante` da UI-17.

## Fora de Escopo

- Redesenhar o leitor, mudar o tamanho padrão, alterar maximização/redimensionamento ou a interação do conteúdo PDF.
- Alterar as preferências de posição de outros painéis fora do ajuste de limites compartilhado pelo primitivo.

## Dependências

- `docs/design/DESIGN.md` (contrato de painel flutuante).
- `docs/specs/done/ui-17-painel-flutuante-unificado.spec.md`.

## Riscos e Mitigação

Uma medição anterior à renderização retornaria uma caixa incorreta e ainda deixaria o painel cortado. A reconciliação deve ocorrer no próximo ciclo da abertura, quando a janela já está no DOM.
