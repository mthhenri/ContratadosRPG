# Correção — PDF ocupa o corpo do leitor de documentos

> Task avulsa: corrige o corpo do painel de documentos, cujo iframe recebe a altura padrão do navegador e deixa uma grande área vazia abaixo do PDF.

## Objetivo

Fazer o visualizador de documentos ocupar integralmente a área disponível abaixo da barra de seleção, sem mudar a moldura, tamanho salvo ou controles do painel flutuante.

## Entregáveis

1. O conteúdo projetado do leitor fica em um contêiner flexível em coluna, com a barra do documento preservada no topo e o visualizador preenchendo o espaço restante.
2. O layout mobile mantém o leitor próprio com a mesma área restante e não cria corte nem rolagem horizontal.
3. Um teste de componente verifica a estrutura que dá altura flexível ao visualizador desktop e mobile.

## Critérios de Aceite

- O teste focado de `LeitorDocumentos` passa e cobre o contêiner de conteúdo que preenche o corpo do painel.
- Na aplicação real, o PDF ocupa toda a área abaixo da barra em `1920×1080`, no viewport compacto que originou o defeito e em `360×800`; nenhum trecho fica cortado ou vira área vazia indevida.
- Build, lint e suíte do frontend não introduzem falhas novas.
- A moldura e a divisão de regiões seguem o análogo aprovado `CadernoFlutuante`: cabeçalho do painel, barra contextual fixa e corpo flexível.

## Fora de Escopo

- Alterar o motor de PDF, a navegação das páginas, tamanho padrão, arraste, minimização ou maximização do leitor.
- Alterar o contrato de posicionamento de `app-painel-flutuante` corrigido na task anterior.

## Dependências

- `docs/design/DESIGN.md` (painel flutuante).
- `docs/specs/done/ui-17-painel-flutuante-unificado.spec.md`.

## Riscos e Mitigação

Aplicar `flex: 1` diretamente no iframe não tem efeito se seu pai não for um contêiner flexível. O contêiner explícito precisa carregar `height: 100%` e `min-height: 0`, igual ao corpo do editor do caderno.
