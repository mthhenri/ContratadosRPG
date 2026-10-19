# Correções editoriais dos livros em produção

> **Spec de execução do autor.** Reúne `regras-visual-11` (fórmulas em faixa), `P-119` (notas coladas) e `P-120` (tachado
> literal) numa única passada na Oficina. **Quem executa é você**, na produção; eu não mexo no banco de produção. Escrita a
> partir do código e das specs M11 da Oficina — **não testei estes cliques ao vivo na produção**, então onde um nome de botão
> divergir, vale o que aparecer na tela.
> Anexo: [inventário completo dos 67 cálculos](livro-correcoes-editoriais-producao/inventario-formulas.md).

## Por que isto é uma tarefa sua

Os livros agora vivem no banco de produção. Uma correção de texto ali é publicação de versão para os jogadores, e a Oficina
**não tem "desfazer publicação"**. Por isso o plano é: editar tudo num **rascunho**, conferir, e só então publicar a versão.

## Resumo do que muda

| ID | Livro | Onde (sumário) | O que muda | Mexe no texto da regra? |
|---|---|---|---|---|
| F1 | Sistema | Regras › Gerais › Descanso | Parágrafo em itálico vira **Fórmula** (faixa); some o "Fórmula:" que fecha o parágrafo de cima | Não (só some o rótulo "Fórmula:") |
| F2 | Guia | Guia de Criação de NPCs › Construção Mecânica › Defesa | Parágrafo de três linhas vira **três Fórmulas** | Não |
| D1 | Sistema | Criação de Personagem › Iniciando um Novo Agente › Bônus Monetário | **Decisão sua**: manter a conta resolvida como Fórmula (recomendado) ou virar Exemplo | Não |
| P-119a | Sistema | Equipamentos › Armazenamento › Modificações | Separar as duas frases da nota de Armazenamento (um ponto) | Acrescenta pontuação |
| P-119b | Sistema | Regras › Aposentadoria › Contido ou Exterminado | Separar o nome da condição da descrição (opcional) | Acrescenta pontuação |
| P-120 | Guia | Introdução | `~~torturar psicologicamente~~` vira texto tachado de verdade | Não (só tira os `~~`) |

O resto do inventário (45 cálculos dentro de frases, 19 que já estão certos) fica **como está**, com a justificativa no anexo.

## Antes de começar

- [ ] Você está com login de **admin** e abre a Oficina de cada livro.
- [ ] Confira no site que o texto de cada ponto abaixo ainda é igual ao descrito aqui. O inventário foi tirado da versão
      publicada em 12/10/2026 (Sistema 4.1.4, Guia 4.2.0). **Se a produção já mudou, pare nesse ponto e me avise.**
- [ ] Ninguém mais está editando o mesmo livro.
- [ ] P-120 usa o atalho novo `Ctrl+Shift+X`, que só existe depois que o deploy do site com essa mudança estiver no ar (bloco 4).

## Bloco 1 — Sistema: Fórmula do Descanso (F1)

Onde: Sistema › Regras › Gerais › **Descanso** (âncora `#descanso`), perto do fim da seção.

Hoje o parágrafo de cima termina assim: "…recuperaria 4D3+6 de Energia. **Fórmula:**" e logo abaixo vem um parágrafo em itálico:
*ATRIBUTO dados de descanso + ( NÍVEL × 2 )*, com **ATRIBUTO** e **NÍVEL** em negrito. Ele deveria aparecer na mesma faixa de
"Inventário Máximo = Força × 5".

Passos:
1. No parágrafo de cima, apague só o final ` Fórmula:` (a faixa já se identifica sozinha). O resto do parágrafo não muda.
2. Logo abaixo desse parágrafo, insira uma peça **Fórmula**: num parágrafo vazio digite `/` e escolha "Fórmula" (ou use o
   `+` entre as peças).
3. Digite `ATRIBUTO dados de descanso + ( NÍVEL × 2 )` e coloque **ATRIBUTO** e **NÍVEL** em negrito (selecione e `Ctrl+B`).
   Sem itálico: a faixa já é o destaque.
4. Remova o parágrafo antigo em itálico (barra da peça → remover).
5. Confira na gaveta **"O que mudou"**: 1 peça alterada (o parágrafo de cima), 1 nova (a Fórmula), 1 removida (o itálico).

Texto final da faixa: `**ATRIBUTO** dados de descanso + ( **NÍVEL** × 2 )`.

## Bloco 2 — Guia: Defesa do NPC (F2)

Onde: Guia › Guia de Criação de NPCs › Construção Mecânica › **Defesa** (âncora `#defesa-2`). Há um único parágrafo em
itálico com três linhas:

```
Defesa Base = 10 + Nível
Bloquear = Defesa Base + VIG        (VIG em negrito)
Esquivar = Defesa Base + DES        (DES em negrito)
```

Passos: crie **três peças Fórmula** em sequência, uma por linha, com o mesmo texto (VIG e DES em negrito, sem itálico), e
remova o parágrafo antigo. Gaveta "O que mudou": 3 novas, 1 removida. (Escolhi três peças e não uma com três linhas porque
é o que a Oficina garante que funciona; se você preferir uma faixa só com três linhas, teste antes numa peça e me conte.)

## Bloco 3 — Sistema: notas coladas (P-119)

**Limite da Oficina que decide isto:** numa **Nota** a tecla Enter pula de campo e **não existe quebra de linha** (Shift+Enter
só vale na abertura do livro). Então não dá para separar por linha; só por pontuação. Por isso estes dois pontos são
**decisões editoriais suas**, e o texto muda por um sinal de pontuação.

**P-119a — nota de Armazenamento.** Sistema › Equipamentos › Armazenamento › **Modificações**, a nota em negrito no topo:
"Estas modificações não agregam nenhum peso ao item Modificações de Armazenamento custam 300 $ ao invés do valor padrão".
Proposta: colocar um **ponto depois de "item"** → "…ao item. Modificações de Armazenamento custam 300 $…". Peso e custo não mudam.

**P-119b — Amaldiçoado pelo Passado (opcional).** Sistema › Regras › Aposentadoria › **Contido ou Exterminado**, a nota em
itálico: "⬦ Amaldiçoado pelo Passado Você é a sucessão de uma besta…". O nome da condição está colado à descrição. Opções:
(1) ponto ou travessão depois do nome ("⬦ Amaldiçoado pelo Passado. Você é a sucessão…"); (2) deixar como está — os três
efeitos ▢ e a ressalva já aparecem separados no site (`regras-visual-06`).

Se preferir quebra de linha de verdade nessas notas, isso é uma **tarefa de código minha** (permitir Shift+Enter em nota);
me diga e eu abro.

## Bloco 4 — Guia: tachado da Introdução (P-120)

Onde: Guia › Introdução, no parágrafo "…ajudarão à executar essa árdua tarefa de ~~torturar psicologicamente~~ divertir e
alegrar seus jogadores". O site já sabe mostrar tachado, mas o texto no banco tem os `~~` escritos à mão.

**Pré-requisito resolvido (código, feito em 15/10/2026):** a Oficina agora tem o atalho **`Ctrl+Shift+X`** (tachado, em
texto rico; liga e desliga como o negrito). Ele só vale depois que esta versão do site estiver publicada na produção — confira
que o atalho funciona antes de editar o livro.

Passos: (1) apague os dois `~~` da frente e os dois de trás; (2) selecione "torturar psicologicamente" e aperte
`Ctrl+Shift+X`; (3) gaveta "O que mudou": 1 peça alterada (a Introdução). O texto das palavras não muda. Se o atalho não
funcionar no seu navegador, me avise.

## Publicar (sempre nesta ordem)

1. Em cada livro editado, abra **Publicar ▾ → rascunho**. No diálogo, confira o resumo: ele tem de listar **só** o que está
   nesta spec. Esperado — Sistema: Descanso (1 alterada, 1 nova, 1 removida), Armazenamento (1 alterada) e, se fizer, Amaldiçoado
   (1 alterada). Guia: Defesa (3 novas, 1 removida) e, se o bloco 4 estiver pronto, Introdução (1 alterada).
   **Se aparecer qualquer coisa além disso, não publique.**
2. Confira o rascunho como tester (lista de conferência abaixo).
3. Só então **Publicar ▾ → versão**. O diálogo sugere o número (próximo patch: Sistema 4.1.5, Guia 4.2.1). Na nota "o que
   mudou", em linguagem de jogador, algo como: "Ajustes de formatação: fórmulas do Descanso e da Defesa de NPC em destaque; nenhuma
   regra mudou." (escreva do seu jeito).
4. **Não existe desfazer publicação.** Se errar, corrige-se com nova edição e nova versão — por isso o rascunho antes.

## Depois de publicar

- [ ] No repositório: `npm run regras:exportar` (e, se quiser só comparar, `npm run regras:exportar -- --conferir`), depois
      commite `docs/core/`. Rode `npm run repo:verificar`; se ele acusar cabeçalho ou corpo de `docs/core/`, me chame.
- [ ] Os números de versão novos aparecem nos nomes dos arquivos de `docs/core/`; se algo do repositório ainda apontar para
      `sistema-v4.1.5.md` ou `guia_de_mestre-v4.2.0.md`, avise que eu ajusto os ponteiros.

## Conferência no site (em 1920×1080 e 360×800)

- [ ] **Descanso:** a fórmula aparece na mesma faixa de "Inventário Máximo"; no celular não corta nem cria rolagem lateral.
- [ ] **Defesa de NPC:** três faixas, na ordem Defesa Base, Bloquear, Esquivar.
- [ ] **Armazenamento** e (se feito) **Amaldiçoado:** as duas frases lidas separadamente, sem texto perdido.
- [ ] **Introdução (se bloco 4 feito):** "torturar psicologicamente" riscado, sem `~~`.
- [ ] **Busca** de Regras: "dados de descanso" e "torturar" ainda são encontrados.

## Critérios de aceite

- Os dois livros republicados e exportados; `repo:verificar` sem acusar `docs/core/`.
- Cada ponto aprovado convertido sem alterar o texto da regra além do descrito.
- `P-119` e `P-120` removidos de `docs/context/PROBLEMS.md` por mim, quando você disser que concluiu (e a conferência passou).

## Fora de escopo

Mudar regras ou valores; redesenhar a faixa; estilizar exemplos; permitir quebra de linha em nota (tarefa de código à parte).

## Pendências minhas (código)

1. ~~Atalho de tachado na Oficina~~ — feito (`Ctrl+Shift+X`).
2. Quebra de linha em Nota na Oficina (só se você quiser separar título e descrição por linha em vez de pontuação).
