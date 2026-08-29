# Visibilidade da ficha com confirmação e tempo real

## Objetivo

Simplificar o controle de ocultar ou exibir a ficha na visualização completa, sem quebrar o cabeçalho em desktop ou mobile, exigir confirmação explícita antes da mudança e refletir a nova visibilidade imediatamente nos painéis abertos da campanha.

## Controle visual

O checkbox com o texto longo "Ocultar ficha de outros jogadores" será substituído por uma ação compacta. No desktop, ela fica como botão na coluna do avatar; no mobile, entra no menu de ações da página para preservar a largura e a altura úteis da ficha. As duas posições abrem a mesma confirmação e o item do menu mantém alvo de toque mínimo de 44×44 px.

- Quando a ficha estiver visível: ícone de olho fechado e label `Ocultar`.
- Quando a ficha estiver oculta: ícone de olho aberto e label `Exibir`.
- O nome acessível e o tooltip descreverão a ação futura, não apenas o estado atual.
- A ação continuará disponível somente quando `ajustavelAmplo()` permitir editar a identidade da ficha.

O análogo visual do controle será o toggle compacto "Rolagem oculta". O análogo da confirmação será a dialog de confirmação já usada na visualização da ficha, reaproveitando shell, densidade, hierarquia, botões e comportamento responsivo.

## Confirmações

Clicar no botão não altera o estado imediatamente. A ação abre um modal nativo com foco gerenciado, opção de cancelar e uma ação primária coerente com o estado.

### Ocultar

- Título: `Ocultar ficha?`
- Aviso: `Outros jogadores deixarão de ver esta ficha. Você e o mestre da campanha continuarão com acesso.`
- Ações: `Cancelar` e `Ocultar ficha`.

### Exibir

- Título: `Exibir ficha?`
- Aviso: `Esta ficha voltará a aparecer para os outros jogadores da campanha.`
- Ações: `Cancelar` e `Exibir ficha`.

Cancelar ou fechar a dialog não emite `ajusteOculta` e não persiste nenhuma mudança. Confirmar fecha a dialog e emite o novo valor para o fluxo existente de edição e persistência.

## Tempo real

O backend continuará sendo a autoridade sobre edição e visibilidade. Depois de persistir com sucesso uma alteração que inclua mudança em `oculta`, `FichaService` emitirá um evento dedicado `ficha:visibilidade-alterada` para a sala `campanha:<campanhaId>`.

O payload conterá somente os identificadores necessários para invalidar a listagem:

```ts
interface FichaVisibilidadeAlteradaDto {
  readonly fichaId: number;
  readonly campanhaId: number;
}
```

O evento não transportará nome, visibilidade final nem `dados` da ficha. Isso evita expor informação sobre uma ficha que acabou de ficar oculta e mantém a listagem REST como fonte autorizada.

O frontend adicionará `fichaVisibilidadeAlterada$` ao `TempoRealService`. A página de detalhe da campanha escutará esse stream junto aos demais eventos que invalidam membros e fichas e executará `recarregarMembrosEFichas()`. O novo fetch fará a ficha desaparecer para jogadores quando ocultada e aparecer quando exibida, sem F5. Dono e mestre continuarão vendo a ficha conforme o recorte retornado pelo backend.

O evento será emitido apenas quando o valor persistido de `oculta` realmente mudar. Alterações comuns da ficha continuarão usando `ficha:alterada` na sala individual e não provocarão refetch adicional da campanha.

## Testes e verificação

Os testes automatizados cobrirão:

- botão com ícone, label e nome acessível corretos nos estados visível e oculto;
- abertura das dialogs de ocultar e exibir com suas respectivas mensagens;
- cancelar/fechar sem emitir mudança;
- confirmar emitindo exatamente o valor oposto;
- service emitindo `ficha:visibilidade-alterada` apenas quando `oculta` mudar;
- gateway publicando apenas o payload mínimo na sala da campanha;
- `TempoRealService` expondo o evento;
- detalhe da campanha refazendo a listagem ao recebê-lo.

A verificação manual será feita na aplicação real em `1920×1080` e `360×800`, percorrendo os dois estados e as duas dialogs. Com mestre e jogador conectados, será confirmado que ocultar remove a ficha do painel do jogador sem recarregar a página e que exibir a recoloca automaticamente. Também serão verificados ausência de overflow, foco visível, contraste, alvo de toque e coerência com os análogos escolhidos.
