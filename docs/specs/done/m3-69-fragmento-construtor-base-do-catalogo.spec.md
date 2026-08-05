# m3-69-fragmento-construtor-base-do-catalogo.spec.md

> Task do milestone `m3-ficha-jogador.spec.md`. Continuação do "Fechamento de Fragmentos"
> (`m3-63`…`m3-68`) — ajuste de UX na criação do Fragmento Construtor discutido com o autor ao
> revisar o card do fragmento na ficha.

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "⬦ Construtor" (~1944-1951). **O
> documento vence** (proibição #27). Task de **frontend** — reler `docs/design/DESIGN.md` antes de
> qualquer UI nova (proibição #29). Rodar `npm run test --workspace=frontend` antes e depois.

## Objetivo

Hoje, ao criar um item custom de Fragmento Construtor (Arma ou Proteção), o jogador **digita o
dano/resistência base livremente** (`itemCustomForm`, campos "Dano"/"Resistência",
`ficha-inventario.component.html:350-368`) — o bônus fixo automático do módulo
(`listarEfeitosFixosConstrutor`, `m3-65`) entra como uma Modificação **em cima** desse texto livre.

Isso é conceitualmente errado: o doc diz "ele é a arma em si" (`sistema-v4.1.0.md` ~1945) — um
Fragmento Construtor **normalmente é uma arma/proteção real do sistema** (ex.: um Construtor
Módulo I pode ser uma Arma Corpo a Corpo "Mediana", cujo dano de catálogo é `3D4+FOR [Físico]`) **+
o bônus do módulo somado em cima** (`+4D12 de dano, +2 dados e +10 de teste` no Módulo I) — não um
dano inventado do zero pelo jogador desconectado de qualquer arma real. Discutido e confirmado com
o autor: o jogador digitar livremente continua existindo como opção **("Outra")**, mas o caminho
principal deve ser **escolher uma arma/proteção do catálogo** como base.

## Contexto (o que já existe)

- `CATEGORIAS_EMPRESTAVEIS` (`ficha-inventario.component.ts:153-158`) já lista as categorias que o
  campo "Encaixa em" (`categoriaEmprestada`) oferece: Corpo a Corpo, Explosivos, Armas de Fogo,
  Munições, Proteções. Hoje esse campo só define **qual conjunto de modificações compráveis** o
  item pode receber (`listarModificacoesCategoria`) — não escolhe um item específico do catálogo.
- `formaFixaConstrutor(categoriaEmprestada)` (`shared/src/regras/compras/fragmento.ts:311-324`) já
  resolve `'ARMA' | 'PROTECAO' | null` a partir da `categoriaEmprestada` — `null` pra Munições (fluxo
  próprio de "Recarregar", `m3-65`) e qualquer categoria fora da lista do doc.
- `listarEfeitosFixosConstrutor(modulo, forma)` (`fragmento.ts:333-361`) e
  `BONUS_FIXO_CONSTRUTOR` (`fragmento.dados.ts:167-193`) já calculam o bônus fixo por módulo/forma —
  **não mudam nesta task**, o bônus continua somando em cima da base escolhida.
- `calcularStatItem` (`shared/src/regras/compras/compras.ts:400-517`) já funde efeitos
  `DANO_DADOS`/`DANO_DADOS_BASE`/`RESISTENCIA` de qualquer modificação (incluindo a automática do
  Construtor) com o `dano`/`resistencia` **base** do item — contanto que o texto base bata no padrão
  `NdM+ATRIBUTO [Tipo]` (dano) ou `N [Tipo]` (resistência). Todo item do catálogo já vem nesse
  padrão; texto livre ("Outra") depende do jogador digitar certo — sem mudança de validação aqui.
- `CATALOGO_ITENS` (`shared/src/regras/compras/catalogo.dados.ts`) já tem as listas completas de
  Corpo a Corpo/Armas de Fogo/Exóticos/Proteções com `dano`/`resistencia`/`custo`/`peso`/`descricao`
  prontos — fonte dos itens a listar no novo seletor.

## Entregáveis

1. **Seletor "Base"** no form de item custom: quando a categoria é `FRAGMENTO_CONSTRUTOR` e
   `categoriaEmprestada` tem uma forma (`formaFixaConstrutor` ≠ `null` — ou seja, Corpo a Corpo,
   Armas de Fogo, Exóticos ou Proteções; **Munições fica de fora**, sem base a herdar, usa
   "Recarregar"), mostrar um novo `<select>` "Base" listando `CATALOGO_ITENS[categoriaEmprestada]`
   (nome + resumo do dano/resistência) **+ uma opção final "Outra (digitar)"**.
2. **Escolher um item do catálogo** preenche automaticamente e **trava** (read-only) os campos
   "Dano"/"Informação" (Arma) ou "Resistência" (Proteção) com os valores daquele item — decisão
   confirmada: o jogador não reescreve por cima. Trocar a Base recalcula os campos.
3. **"Outra"** libera os campos de texto livre exatamente como hoje (mesmos placeholders
   `"Ex.: 3D6+FOR [Físico]"`/`"Ex.: 14 [Físico], 3 [Balístico]"`) — confirmado com o autor: fica
   como via de escape pra armas/proteções homebrew fora do catálogo.
4. **Peso segue a Base escolhida.** Ao escolher um item do catálogo, pré-preencher `peso` com o da
   base (o Construtor "é" aquele item, então ocupa o mesmo espaço) — `custo` continua livre/
   irrelevante (fragmentos são **achados**, não comprados, `m3-49`; o campo existe só por
   uniformidade do form de item custom).
5. **Proteção segue o mesmo padrão** (confirmado com o autor): mesmo seletor "Base", listando
   `CATALOGO_ITENS[PROTECOES]`, mesma trava de campo e mesmo "Outra".
6. `montarItemCustom` (`ficha-inventario.component.ts:1207-1235`) usa o `dano`/`informacao`/
   `resistencia` da Base escolhida (ou do texto livre, se "Outra") — sem mudança no restante do
   fluxo: `comBonusFixoConstrutorSeNecessario` continua gerando a Modificação automática do módulo
   em cima, e `calcularStatItem` já funde os dois num único `dano`/`resistencia` computado.
7. Testes de componente: escolher uma arma do catálogo como Base soma o bônus do módulo à base real
   (ex.: Mediana `3D4+FOR` + Módulo I → dano final combina os dois grupos de dado, não perde nenhum
   dos dois); escolher "Outra" mantém o texto livre como hoje; Proteção no mesmo padrão; trocar de
   Base recalcula os campos travados; peso acompanha a Base escolhida.

## Critérios de Aceite

- Criar um Fragmento Construtor Arma/Proteção oferece escolher uma base real do catálogo daquela
  categoria, com "Outra" como alternativa de texto livre — nunca obriga digitar do zero.
- O dano/resistência final do item combina a base escolhida (catálogo ou livre) **com** o bônus fixo
  do módulo, num único stat computado — nenhum dos dois desaparece nem fica invisível numa
  modificação separada e sem relação com o dano exibido.
- Peso do item acompanha a base escolhida do catálogo quando houver uma.
- Suíte `frontend` verde, com os testes novos cobrindo Arma, Proteção, "Outra" e troca de Base.

## Fora de Escopo

- Mudar `listarEfeitosFixosConstrutor`/`BONUS_FIXO_CONSTRUTOR`/o motor de fusão do `calcularStatItem`
  — já corretos, a única mudança é **de onde vem o texto base** (catálogo em vez de sempre livre).
- Munição do Construtor (`m3-65`) — sem base de catálogo a herdar, mantém "Recarregar".
- Validar/consertar texto livre sem colchete `[Tipo]` (a fusão simplesmente não ocorre e o motor
  devolve o texto cru, comportamento já existente pra qualquer item custom, não só Construtor) —
  fica como está; o placeholder já orienta o formato certo.
- Redesenhar o chip visual da Modificação automática do módulo (ex.: deixar de parecer uma
  modificação "removível" como Letal/Pesada) — não foi pedido nesta rodada; considerar em spec
  futura se o autor achar que ainda confunde depois desta correção.

## Dependências

- `m3-65` (bônus fixo do Construtor por módulo — tabela e fusão já existentes).
- `m3-63` (cardápio "em item"/restrição de alvo do Potencializador — Construtor não recebe
  Potencializador, regra já coberta, sem relação direta mas mesmo lote de auditoria).
