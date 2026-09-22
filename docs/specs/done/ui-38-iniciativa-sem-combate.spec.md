# ui-38-iniciativa-sem-combate.spec.md

> Spec avulsa, continuação da `ui-37` (`docs/specs/done/ui-37-iniciativa-mestre-layout.spec.md`).
> Pedido do autor ao usar a tela: (1) o botão "Combate atual" do cabeçalho "não faz nada" quando
> a campanha não tem combate aberto, e (2) a tela de criar o combate precisa ser ajustada —
> "se pá transformar em dialog". Vale **somente** para o mestre; jogador/espectador não mudam.

## Problema

- Lendo um encontro encerrado do histórico, o botão **Combate atual** navega para
  `/campanhas/:id/iniciativa`. Se não existe encontro aberto, o destino é a tela "sem encontro" —
  o botão parece não fazer nada e o mestre perde o lugar em que estava.
- A tela "sem encontro" do mestre (`iniciativa-tela` + `app-cartao` com um `<input>` nativo e um
  botão em linha) ficou fora da casca da `ui-37`: sem coluna de ações, sem o cabeçalho novo, com
  os gatilhos flutuantes de calculadora/rolagens/caderno soltos no canto.

## Análogo aprovado

| Parte | Análogo | O que se herda |
|---|---|---|
| Casca | a própria `ui-37` (`.iniciativa-mestre`, `app-coluna-acoes id="iniciativa-mestre"`) | rail, cabeçalho, régua, chip, Calculadora/Caderno na coluna |
| Ausência de combate | `app-estado-vazio` (com ação projetada) | ícone, título, linha de apoio, botão |
| Criar o combate | `app-modal` + formulário curto (`entrar.page`, "Entrar por código") | `<dialog>` nativo, foco, Esc/fundo fecham, botão primário |

## Entregas

1. `modoMestre` passa a valer para o mestre **com ou sem** encontro carregado (fora do carregamento).
   Sem encontro: mesma casca — coluna de ações (Combate › **Novo combate**; Ferramentas ›
   Calculadora, Caderno), cabeçalho "Iniciativa" (sem nome nem chip) com o gatilho "N encerrados"
   quando há histórico e um `app-estado-vazio` "Nenhum combate em andamento." com a ação
   **Novo combate**.
2. **Novo combate** abre um `app-modal` "Novo combate" com um campo "Nome do encontro"
   (`app-campo`, obrigatório, até 120 caracteres), **Cancelar** e **Abrir combate**. Enter envia;
   sucesso fecha o dialog e a tela vira a montagem do encontro criado (comportamento de hoje).
3. "Combate atual" só aparece lendo um encontro do histórico **e** havendo combate aberto. Sem
   combate aberto, o mesmo lugar oferece **Novo combate** (abre o dialog).
4. Remoção do código morto: bloco do formulário inline (`.abertura__linha`/`__acao`,
   `.painel__controle` se não houver mais uso) e o ramo "mestre sem encontro" do template antigo.

## Critérios de aceite

- Mestre sem combate aberto vê a casca nova, o estado vazio e consegue criar o combate pelo dialog
  (Enter e botão), sem sair da tela; Cancelar/Esc/fundo fecham sem criar; nome vazio desabilita.
- Lendo um encerrado sem combate aberto, o cabeçalho mostra **Novo combate** e não "Combate atual";
  com combate aberto, "Combate atual" continua voltando a ele.
- Testes da página cobrem: casca sem encontro, dialog (abrir/enviar/cancelar), "Combate atual" vs
  "Novo combate". Gate visual (`verify`) em 1920×1080 e 360×800: estado vazio, dialog aberto,
  histórico de encerrado sem combate aberto.

## Fora de escopo

- Jogador/espectador (mensagem "Nenhum combate em andamento…" de hoje continua).
- Backend (a regra "um combate aberto por campanha" e a criação seguem como estão).
