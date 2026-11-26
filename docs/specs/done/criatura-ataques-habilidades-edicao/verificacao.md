# Verificação — criatura-ataques-habilidades-edicao

Data: 2026-11-26. Capturas em `.artifacts/criatura-ataques-habilidades-edicao/` (`antes/` = caixa antiga,
`v1/` = primeiro corte, `v2/` = depois das correções da inspeção).

## Cenário

Stack do autor em execução (4300/3100). Criatura real "O Ausente" (cópia de teste #32 da ficha #29 do
autor: 6 ataques, 5 Padrão e 1 Completa; 12 habilidades, 5 Ativas, 2 Gatilhos e 5 Passivas), aberta por
um admin de teste. A sessão do admin anterior tinha expirado; foi criado outro usuário de teste e as
cópias #32/#33 passaram para ele (as fichas #29/#30 do autor não foram tocadas).

## Ao vivo (`1920×1080` e `360×800`)

- Cabeçalho das duas listas só com "+"; nenhum "Editar habilidades/ataques".
- Lápis e lixeira no cabeçalho de cada cartão. Lixeira abre a confirmação ("Remover habilidade?");
  Cancelar mantém o item.
- Alterar: o cartão vira a caixa "Alterar habilidade/ataque", na largura inteira da lista, preenchida e
  com foco no Nome; Esc fecha. "+" abre a mesma caixa como "Nova …" no topo. Confirmar vazia mostra
  "Informe nome e descrição." / "Informe nome, teste, dano e dano crítico." sem salvar.
- Caixa de ataque: nome, custo (segmentado de 5, quebra em duas linhas no celular) e alvo (Alvo único /
  Área) numa coluna; Teste, Dano e Dano crítico, uma abaixo da outra, na outra; efeito na linha inteira.
  No celular, uma coluna.
- Grupos: título com seta compacta e expande. Compactado mostra só os nomes; o nome abre o item inteiro
  (seta para baixo) e fecha de novo. Ataques agrupados por custo (Ação Padrão 5, Ação Completa 1); linha
  compactada com os três dadinhos à direita.
- Dadinhos: Teste, Dano e Crítico disparam o mesmo `POST /ficha/32/rolagem` dos botões grandes (conferido
  pela rede; a ficha está com rolagem oculta, então o resultado vai só para o histórico).
- Sem rolagem horizontal, nenhum segmentado vazando, sem erro de página.

## Comparação visual

Análogos: `npc-habilidades-lista` (caixa no lugar do item com `app-campo` compacto, `campo__controle` e
`app-segmentado`) e as próprias listas da criatura (cartão, selos, botões de rolagem).

- Mesma voz: cartões, selos `--selo-*` e cores Teste/Dano/Crítico mantidos; os dadinhos usam a mesma
  hierarquia (neutro, accent esmaecido, accent cheio).
- Controles canônicos: `app-campo` + `campo__controle` nos campos de texto, `app-segmentado` no lugar de
  `select`/`checkbox` nativos, `app-botao` nos títulos de grupo e nas linhas compactas (secundário/texto,
  classe local só para layout e tipografia do nome), `app-botao-icone` em lápis, lixeira e dadinhos. Os
  campos Markdown usam a receita `campo` num `<div>`: dentro de `<label>` o clique no texto seria
  repassado ao primeiro botão da barra do editor.
- Correções feitas na inspeção:
  - a Descrição da caixa ficava com 84px: o editor compacto vence o `min-height` do consumidor;
    especificidade aumentada (160px na habilidade, 120px no efeito do ataque);
  - no celular, lápis e lixeira de 44px caíam para uma segunda linha e, depois, espremiam o nome até
    quebrar no meio da palavra ("Imaterialida de"); o cabeçalho do cartão de habilidade virou grade no
    celular (nome na primeira linha, selo abaixo, ações à direita das duas) e o nome só quebra entre
    palavras.

## Testes

- Frontend: suíte completa com `NODE_OPTIONS=--no-experimental-webstorage` (P-138) — 303 arquivos,
  3765 testes verdes. Migrados: modo de edição (removido), formulário do ataque (segmentados no
  lugar de `select`/`checkbox`). Novos: ações por item, leitura sem ações, caixa única com título e
  botão certos, segmentados, aviso do que falta, Esc/Ctrl+Enter, grupos de ataque por custo, compactar e
  abrir item, dadinhos rolando.
- ESLint nos dois componentes: 0 erros.

## Limites

- Ataques no celular: com os três dadinhos de 44px, nomes longos quebram em duas ou três linhas.
- Compactação não é lembrada (decisão do autor).
- Recálculo de Vida/Defesa pela VD fica para a próxima tarefa (`criatura-npc-vd-habilidades-ataques`).
