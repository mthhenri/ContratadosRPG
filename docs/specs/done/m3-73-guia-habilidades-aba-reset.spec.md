# m3-73-guia-habilidades-aba-reset.spec.md

> Ajuste pós-milestone do M3 — Guia de Criação de Ficha. Correção de bug reportado pelo autor.

## Objetivo

No passo "Habilidades" do guia de criação de agente, o seletor de habilidades
(`FichaHabilidadeSeletorComponent`) tem abas por grupo (Gerais, Classe, Subclasse quando existe,
Arquétipo). Hoje, ao selecionar (clicar em "+") uma habilidade da aba **Arquétipo**, a UI volta
sozinha para a aba **Classe** logo em seguida, atrapalhando quem está escolhendo várias habilidades
seguidas do mesmo grupo. A aba ativa deve permanecer a que o usuário escolheu, mudando só quando ele
clicar em outra aba ou quando o conjunto de grupos disponível mudar de fato (troca de classe/
arquétimo, mudança de vaga).

## Causa raiz

`frontend/src/app/modules/ficha/componentes/ficha-habilidade-seletor/ficha-habilidade-seletor.component.ts:62-64`
define a aba ativa como `linkedSignal`:

```ts
protected readonly abaAtiva = linkedSignal<GrupoHabilidades['id']>(
  () => this.grupos()[0]?.id ?? 'gerais',
);
```

Um `linkedSignal` reseta para o valor computado toda vez que a computação de origem reexecuta — não
só quando o **conteúdo** de `grupos` muda, mas toda vez que a referência do array de entrada muda.
`grupos` vem de `gruposVagaAberta` (`criar.page.ts:329-332`), um `computed` que lê `this.estado()`
inteiro (via `gruposParaVaga`, que internamente lê `vagaAberta()`/`estado().arquetipo`/
`classeCalculada()`) e sempre devolve um **array novo** via `.map()`/`.filter()`. Selecionar uma
habilidade dispara `adicionarMelhoria` → `atualizar({ melhorias: [...] })` → `estado.update(...)`,
criando um novo objeto `estado`. Isso reexecuta `gruposVagaAberta` (que depende de `estado()`) e
produz um array novo mesmo quando os grupos disponíveis não mudaram de fato — o que reseta
`abaAtiva` para `grupos()[0]?.id`, que é sempre `'classe'` (ordem fixa em
`shared/src/regras/agente/habilidades-catalogo.ts:265-270`: gerais, classe, subclasse, arquétipo —
para uma classe sem subclasse, `grupos()[0]` após "gerais" filtrado é `'classe'`). O mesmo padrão
afeta `subgrupoAtivo` (linhas 70-74), derivado da mesma cadeia.

## Entregáveis

1. A aba ativa do seletor de habilidades não deve resetar quando o usuário adiciona ou remove uma
   habilidade — só quando a **identidade semântica** do conjunto de grupos muda (troca de vaga
   aberta, troca de classe/arquétipo que altera quais grupos existem). A correção deve evitar
   comparação por referência de array onde o conteúdo é estável; considerar computar `grupos` com
   uma chave estável (ids dos grupos + vaga) e só deixar `linkedSignal`/`computed` dependerem dessa
   chave, ou preservar a aba corrente quando ela ainda existir no novo `grupos()`.
2. Mesma correção deve valer para `subgrupoAtivo`, que sofre do mesmo padrão.
3. Não alterar o comportamento correto existente: ao trocar de vaga de fato (ex.: fechar Habilidades
   de Nível 0 e abrir a vaga de progressão seguinte) ou trocar classe/arquétipo, a aba deve continuar
   reiniciando para o primeiro grupo disponível, como hoje.

## Critérios de Aceite

- No passo Habilidades, com uma classe que tenha ao menos Classe e Arquétipo disponíveis: abrir a
  aba Arquétipo, adicionar duas habilidades seguidas — a aba permanece em Arquétipo entre as duas
  adições, sem saltar para Classe.
- O mesmo vale para Gerais e Subclasse (quando existente).
- Remover uma habilidade já adicionada (se a UI permitir) também não altera a aba ativa.
- Trocar de classe/arquétimo durante a criação (Nível 0) continua reiniciando a aba corretamente
  para o primeiro grupo disponível do novo conjunto.
- `npm run test -w frontend` verde, incluindo um teste de regressão cobrindo a sequência descrita
  acima (`criar.page.spec.ts` ou o spec do seletor).

## Fora de Escopo

- Qualquer mudança de UX do seletor de habilidades além da correção da aba (ex.: reordenar abas,
  mudar rótulos).
- Os demais itens do guia listados junto com este (`m3-74`…`m3-78`) — cada um tem spec própria.

## Dependências

`m3-58`/`m3-64` (passo Habilidades e pacotes iniciais do guia).
