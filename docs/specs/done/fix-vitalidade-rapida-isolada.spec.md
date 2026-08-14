# fix-vitalidade-rapida-isolada.spec.md

## Objetivo

Impedir que os ajustes rápidos dos cards da campanha regravem a ficha inteira.

## Escopo

1. Criar uma operação REST dedicada para alterar somente `dados.estado.vidaAtual` e/ou
   `dados.estado.energiaAtual` de uma ficha.
2. A operação usa a mesma permissão de edição da ficha, valida que há ao menos um valor inteiro,
   mantendo Vida atual não negativa e permitindo Energia atual negativa conforme a regra de jogo,
   e emite `ficha:alterada` após a persistência.
3. A atualização SQL altera exclusivamente o bloco `dados.estado` informado e `updated_date`;
   não toca `nome`, `cor`, `imagem_url`, `oculta` nem os demais campos de `dados`.
4. `FichaVitalidadeRapidaService` passa a chamar somente essa operação, em lote por ficha, sem
   buscar a ficha completa nem chamar o `PUT /ficha/:id` genérico, serializando os PATCHes da
   mesma ficha para o valor mais recente não ser sobrescrito por uma resposta anterior.
5. Cobrir a regressão: um ajuste rápido em uma ficha colorida, oculta e com avatar preserva esses
   campos; os testes de backend comprovam o recorte SQL e a permissão/emissão do novo fluxo.

## Fora de escopo

- Alterar a regra de valores máximos de Vida/Energia.
- Mudar a edição completa de ficha, os uploads de avatar ou a interface visual dos cards.
