# Registro Expurgado Variável — Design

## Objetivo

Dar aparência documental ao trecho censurado de `/acesso-negado`, substituindo a barra branca
contínua por um parágrafo expurgado com ritmo natural de palavras, espaços, pontuação e quebras de
linha. Ampliar também a variedade e o conteúdo das mensagens institucionais exibidas a cada
carregamento.

## Comportamento

- O catálogo institucional passa de 16 para 32 mensagens.
- Cada mensagem terá aproximadamente o dobro do conteúdo atual, normalmente duas frases curtas e
  coerentes com o universo institucional da Fundação.
- A cada nova instância da página — inclusive após F5 — uma mensagem será escolhida aleatoriamente.
- Um molde será escolhido aleatoriamente de um catálogo de trechos Lorem Ipsum.
- O texto do molde nunca será apresentado: cada letra será convertida no caractere `█`, enquanto
  espaços e pontuação serão preservados.
- A mensagem institucional e o registro expurgado serão selecionados independentemente.
- Cada mensagem recebe ainda um fragmento contextual censurado, escolhido independentemente entre
  referências a unidade, protocolo, autoridade, localização, data, artefato, destino ou agente.

## Implementação

`acesso-negado.page.ts` conterá os catálogos imutáveis e uma função pura que converte letras de um
molde em `█`. A página selecionará uma mensagem e um registro uma única vez por instância, mantendo
ambos estáveis durante a detecção de mudanças e renovando-os após recarregamento.

O template exibirá o registro como texto censurado responsivo. O SCSS permitirá quebra natural de
linha sem transformar o conteúdo em um retângulo contínuo e sem produzir overflow em 360×800.

## Preservação dos ajustes existentes

Os ajustes visuais já realizados pelo autor — classificação censurada, textos parcialmente
expurgados, segundo aviso, rodapé e tratamento do botão — serão preservados. A mudança ficará
restrita ao conteúdo variável e ao layout necessário do bloco `REGISTRO`.

## Verificação

- Testes unitários comprovam 32 mensagens, maior conteúdo, conversão integral das letras, preservação
  de espaços/pontuação e estabilidade por instância.
- Recarregamentos reais comprovam variação das mensagens e dos registros.
- Inspeção em 1920×1080 e 360×800 confirma aparência documental, quebra natural e ausência de
  overflow.
