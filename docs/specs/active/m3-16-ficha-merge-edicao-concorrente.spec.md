# m3-16-ficha-merge-edicao-concorrente.spec.md

> Task 16 do milestone `m3-ficha-jogador.spec.md`. Correção de defeito, não feature nova.

> **Origem:** verificação ao vivo da `m3-08` (stack real: Postgres + NestJS + Angular, dois
> usuários). Os três critérios de aceite da `m3-08` passaram, mas o cenário de **edição
> concorrente** perde dados em silêncio. A própria `m3-08` previu isso no bloco
> `> Impacto do m3-10` ("não sobrescrever campos que o usuário está editando... aplicar o patch
> remoto só ao sair da edição, ou sinalizar conflito") — e nenhuma das duas saídas foi implementada.

## Objetivo

Eliminar a perda de dados quando um `ficha:alterada` remoto chega enquanto há **edição local
pendente** na tela da ficha, mesclando o documento remoto com as edições locais **campo a campo**.

## O defeito (reproduzido ao vivo)

Em `visualizar.page.ts`, o evento remoto é **descartado** enquanto `edicaoPendente()` é `true`:

```ts
this.tempoRealService.fichaAlterada$
  .pipe(filter((ficha) => ficha.id === this.fichaId && !this.edicaoPendente()), ...)
  .subscribe({ next: (fichaAlterada) => this.ficha.set(fichaAlterada) });
```

Nada reaplica o evento depois. O estado local segue defasado, e o `alterarFicha` debounced envia o
**documento inteiro** — sobrescrevendo o campo que o outro usuário acabou de gravar.

Sequência observada (mestre id 50, jogador id 51, ficha 19):

1. Mestre clica `+` em Vida → `edicaoPendente = true`, debounce de 500ms.
2. Dentro da janela, o jogador renomeia a ficha por REST → `PUT` 200, persistido.
3. O `ficha:alterada` chega ao mestre e é **descartado**.
4. O `PUT` debounced do mestre parte com `nome: "Kane"` (defasado) e vence.

Resultado: `nome` persistido volta a `"Kane"` — a renomeação do jogador é destruída sem aviso. O
jogador, com a ficha aberta, recebe o broadcast do save do mestre e vê o próprio nome reverter.

## Entregáveis

1. **`frontend/src/app/modules/ficha/mesclar-ficha.ts` (novo, puro, sem Angular):**

   ```ts
   export function mesclarFicha(
     base: FichaAlteradaDto,
     local: FichaAlteradaDto,
     remoto: FichaAlteradaDto,
   ): FichaAlteradaDto;
   ```

   Merge de três vias, recursivo sobre objetos simples. Para cada **folha**:
   `local ≠ base` (o usuário editou) → prevalece o `local`; senão → entra o `remoto`.

   **Folhas** são primitivos (`string`, `number`, `boolean`, `null`) **e arrays**. As
   sub-coleções (`sequelas`, `traumas`, `lesoes`, `habilidades`, `inventario.itens`,
   `inventario.amplificadores`) são portanto **atômicas** — tudo ou nada, comparadas por
   igualdade profunda contra a base. O contrato `m3-01` não dá `id` aos itens, então merge
   item a item não teria identidade estável.

   **Chaves ausentes** (o contrato tem opcionais — `derivados`, `estado.vidaMaxima`,
   `estado.energiaMaxima` — que faltam em fichas anteriores à `m3-10`): a chave presente no
   `remoto` e ausente na `base` conta como alteração remota (entra, se o local também não a
   editou); a chave presente na `base` e ausente no `remoto` conta como remoção remota. Uma chave
   que só o `local` tem é edição local e prevalece. `undefined` nunca é gravado — chave ausente
   permanece ausente.

   Não vai para `shared/` — é política de apresentação, não regra de jogo (§6.1/§6.3).

2. **`fichaBase` em `visualizar.page.ts`:** signal com o **último documento vindo do servidor**.
   Alimentado pela carga inicial (`forkJoin`), pela resposta do `alterarFicha`, pelo refetch de
   reconexão e pelo evento remoto quando não há edição pendente.

3. **Evento remoto passa a mesclar** em vez de ser descartado. O `filter` perde a cláusula
   `!this.edicaoPendente()`:
   - sem edição pendente → `ficha.set(remoto)`
   - com edição pendente → `ficha.set(mesclarFicha(fichaBase(), ficha(), remoto))`
   - nos dois casos → `fichaBase.set(remoto)`

   Como o `PUT` debounced serializa o `ficha()` já mesclado, ele deixa de sobrescrever o campo
   remoto. **É esta consequência — e não a atualização da tela — que fecha a perda de dados.**

4. **Refetch de reconexão mescla também.** O `effect` de `reconexao()` deixa de se abster quando
   há edição pendente: o documento buscado entra como `remoto` na mesma função.

5. Os **seis pontos de edição** (codinome, classe/arquétipo, nível/prestígio, atributos, estado,
   derivados) **não mudam** — continuam `ficha.set(...)` + `agendarPersistencia()`. A sujeira de
   campo é derivada de `local ≠ base`, sem bookkeeping manual.

## Critérios de Aceite

- Mestre ajustando Vida e jogador renomeando ao mesmo tempo: **ambas as edições sobrevivem** no
  banco, e a tela do mestre mostra o nome novo sem perder o ajuste em curso.
- Campos que o usuário **não** está editando continuam atualizando ao vivo durante uma edição
  pendente (a tela não congela inteira, como congelava).
- Edição concorrente **no mesmo campo**: o local vence até salvar. Sem diálogo de conflito.
- `mesclar-ficha.ts` é puro e testado isoladamente (Vitest).
- Nenhuma escrita via WebSocket (§9, proibição #25). Nenhuma mudança de contrato, DTO ou backend.

## Fora de Escopo

- **A janela de 1 RTT.** Um `ficha:alterada` que chegue com o `PUT` já em voo continua sendo
  sobrescrito pelo servidor: o cliente construiu o payload antes do evento existir, e nenhum merge
  no cliente alcança isso. Fechar essa janela exige **escrita condicional** no backend (o `PUT`
  levaria o `updated_date` lido e o `UPDATE` guardaria `AND updated_date = :updatedDate`,
  devolvendo 409 para o cliente refazer o fetch, reaplicar o delta e repetir). Decisão consciente
  do autor: não pagar por isso agora. Candidata a task futura.
- Sinalização de conflito ao usuário (a terceira saída que a `m3-08` oferecia).
- Coluna `versao` / histórico de ficha — decisão adiada na `SYSTEM.SPEC` ("soft delete +
  `updated_date` bastam no v1").
- Merge item a item das sub-coleções — depende de identidade estável por item, que o contrato
  `m3-01` não fornece.

## Dependências

- `m3-08` (cliente de tempo real e o `ficha:alterada`).
- `m3-10` (edição no próprio lugar, `edicaoPendente` e a persistência em lote debounced).
