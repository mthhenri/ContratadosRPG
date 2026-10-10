# Ações de ficha no menu do jogador (painel de campanha) — design

## Objetivo

No painel de campanha (`/painel/:id`), o menu "⋯" do jogador só tem "Criar nova ficha" e "Vincular
ficha existente". "Remover da campanha" e "Excluir ficha" já existem no kebab por mini-card do
Esquadrão (visão do mestre) — mas o jogador não tem acesso a essas ações para a própria ficha sem
sair do painel e abrir a ficha completa. "Acesso de visualização" (m3-04) também só existe lá dentro.
Este design traz as três para o mesmo menu "⋯" do jogador, agindo sobre a **ficha exibida** na coluna
principal (`fichaExibidaId`/`fichaExibidaDados`).

## Escopo

- Os três itens novos ficam **sempre visíveis, mas desabilitados** quando a ficha exibida não é sua
  (ex.: você está vendo a ficha de um colega via "Ver ficha", na coluna "Equipe").
- **Acesso de visualização**: abre uma dialog nova — conceder a um membro (`<select>` +
  "Conceder"), listar quem já tem acesso, revogar por linha. Implementada dentro do próprio
  `CampanhaDetalhe`, duplicando o padrão já usado em `visualizar.page.ts` (mesma API:
  `listarAcessos`/`concederAcesso`/`revogarAcesso`), sem extrair um componente compartilhado — o
  código já duplica esse tipo de dialog entre as duas páginas (a de exclusão de ficha é implementada
  separadamente em cada uma), então este design segue o padrão existente em vez de introduzir uma
  abstração nova.
- **Remover da campanha**: chama o `removerDaCampanha(fichaId)` que já existe (reuso direto — sem
  confirmação, mesmo padrão do mestre).
- **Excluir ficha**: chama `pedirExcluirFicha(fichaId, nome)`/`confirmarExcluirFicha()` que já
  existem (reuso direto — com a dialog de confirmação que já existe).
- Nenhum endpoint novo: tudo passa por `FichaService` (`atribuirCampanha`, `excluirFicha`,
  `listarAcessos`, `concederAcesso`, `revogarAcesso`), que já existe e já é usado em outra tela.

## Comportamento após remover/excluir

Se sobrar outra ficha sua na mesma campanha, o painel troca para ela automaticamente
(`fichaExibidaId` aponta para a próxima ficha com `usuarioId === usuarioAtivoId()`). Se não sobrar
nenhuma, cai no estado vazio já existente ("Você ainda não tem uma ficha nesta campanha" com os
botões de criar/vincular).

## Implementação

- `minhaFichaExibida` (computed): `fichaExibidaDados()` quando `usuarioId === usuarioAtivoId()`,
  senão `null` — controla o `[disabled]` dos três itens novos.
- `removerDaCampanha`/`pedirExcluirFicha` passam a fechar também `menuCampanhaAberto` (além do
  `menuFichaAberto` que já fechavam), pois agora podem ser disparados a partir do menu do cabeçalho,
  não só do kebab por-mini-card.
- `removerDaCampanha` e `confirmarExcluirFicha` passam a chamar um novo helper privado
  `avancarFichaExibidaApos(fichaId)` após remover a ficha de `fichas()`: se `fichaExibidaId()` for a
  ficha que acabou de sair, aponta para outra ficha própria restante ou limpa para `null` (e limpa
  `fichaExibidaDados` junto, já que o `effect` que busca o documento completo só dispara quando
  `fichaExibidaId` muda para um valor não nulo).
- Dialog de acesso: novos signals `dialogAcessoFicha`, `acessosFichaExibida`,
  `membroParaConcederAcesso` (`FormControl<number | null>`), `concedendoAcesso`, `revogandoAcesso`, e
  o computed `membrosElegiveisAcesso` (exclui a própria ficha, o mestre e quem já tem acesso) —
  espelhando `visualizar.page.ts`, mas escopados à `minhaFichaExibida()` em vez de `ficha()`.

## Documentação

`docs/context/IDEAS.md` ganha a entrada `I-010`: o "Acesso de Visualização" é hoje binário (vê a
ficha inteira, exceto `CAMPOS_PRIVADOS_FICHA`, ou não vê nada) — dar granularidade por seção/campo
fica registrado como ideia em aberto, não como parte deste escopo.

## Fora de escopo

- Granularidade de permissão de visualização (schema/UI/regra de negócio) — vira ideia no
  `IDEAS.md` (`I-010`), não implementação.
- Extrair um componente compartilhado de "gestão de acesso" entre `visualizar.page` e
  `campanha/detalhe.page` — mantém a duplicação já praticada no projeto entre essas duas telas.
- Qualquer mudança em `visualizar.page.ts`/`.html` (a ficha completa continua exatamente como está).
- Mudança de comportamento do menu do **mestre** (cabeçalho ou kebab por mini-card do Esquadrão).
