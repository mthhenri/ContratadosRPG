# ui-44-mestre-defeitos-pequenos.spec.md

> Spec avulsa (autor, 2026-11-28). Continua a `ui-43`: os defeitos pequenos que sobraram da análise
> das telas do mestre, antes dos mockups do redesenho. Fecha o `P-142` e o restante do `P-129`.

## Objetivo

Tirar quatro tropeços pequenos das telas do mestre, sem desenho novo: a cena com iniciativa que não é
Combate falando "combate", o palco da Investigação sem o título do documento em foco, a contagem
solta ao lado de "Novo agente" e as abas compactas do celular sem nome acessível.

## Entregáveis

1. **Vocabulário por tipo de cena (`P-142`)**, decidido pelo autor em 28/11: cada tipo usa o próprio
   nome — Combate → "combate", Furtiva → "infiltração", Perseguição → "perseguição", Resistência →
   "resistência", com o gênero certo ("Perseguição ainda não iniciada"). Uma função pura de
   apresentação em `cena/rotulos-cena.ts` devolve o vocabulário; ela é a única fonte.
   - Título da tela com iniciativa: `<Tipo> · <nome>` (como "Investigação · <nome>"), não mais
     "Iniciativa · <nome>".
   - Coluna do mestre: a categoria "Combate" vira o rótulo do tipo; "Encerrar combate" vira
     "Encerrar <substantivo>"; o tooltip de "Trocar tipo" fala do substantivo do tipo.
   - `app-conducao-turno` recebe o tipo da cena e usa o vocabulário em "Iniciar …", no tooltip de
     Encerrar e de Iniciar, em "… ainda não iniciado(a)" e em "… encerrado(a) — só leitura".
   - O histórico ("Combates encerrados", "Combates anteriores") e o estado vazio sem encontro ficam
     como estão: listam encontros da campanha, não a cena aberta.
2. **Título no palco da Investigação**: acima do texto do documento em foco, o cabeçalho de seção da
   própria tela (o mesmo de "Agentes") com o título do documento.
3. **Contagem com rótulo**: o número ao lado de "Novo agente"/"Nova criatura"/"Novo NPC" diz o que
   conta ("4 agentes", "1 criatura", "2 NPCs"), como o "4 agentes" da cena.
4. **Abas compactas com nome acessível (`P-129`)**: no celular, o rótulo das abas não selecionadas
   deixa de usar `display: none` e passa a ser escondido só visualmente, ficando na árvore de
   acessibilidade. Nenhuma mudança visual.

## Critérios de Aceite

1. Testes do vocabulário (os quatro tipos), da condução (Perseguição mostra "Iniciar perseguição"),
   do título da Iniciativa, do palco e da contagem passam; `npm run test --workspace=frontend`,
   lint e build passam.
2. Ao vivo, com a cena de teste em Perseguição e em Combate (1920×1080 e 360×800), título, coluna e
   condução usam o vocabulário do tipo; Investigação com documento em foco mostra o título no palco;
   a contagem aparece com rótulo. Em 360×800, as abas Criaturas e NPCs não selecionadas são
   encontradas por papel `tab` e nome, e a tela fica igual à de antes. Capturas em
   `.artifacts/ui-44-mestre-defeitos-pequenos/`.
3. `npm run impacto` no primitivo de abas e na condução, com os consumidores conferidos.

## Fora de Escopo

- Os mockups do redesenho (visão da campanha, barra, cenas, Biblioteca, celular).
- Rótulos visíveis nas ações do modal de Membros: já têm nome acessível e tooltip, é desenho.
- A visão do jogador das cenas com iniciativa (só a do mestre tinha o defeito registrado).

## Dependências

`docs/specs/done/ui-43-mestre-defeitos-navegacao.spec.md`, `docs/design/DESIGN.md`, `P-129` e `P-142`
em `docs/context/PROBLEMS.md`.
