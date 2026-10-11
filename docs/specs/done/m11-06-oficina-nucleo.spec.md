# m11-06-oficina-nucleo.spec.md

> Task 6/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Primeira UI da
> Oficina. Fonte visual: [`m11-oficina-regras/m11-oficina-exemplao.html`](m11-oficina-regras/m11-oficina-exemplao.html)
> (visual apenas; nunca mecânica nem texto).

## Objetivo

Adicionar ao leitor de Regras o modo **Oficina** (só `ADMIN`), com edição no lugar dos campos de
texto e do custo de Energia, ferramentas da peça, salvamento automático por peça com `revisao`,
desfazer, pendências e "Ir para peça" (Ctrl+K).

## Entregáveis

1. **Interruptor Leitura / Oficina** no leitor, visível só para `ADMIN`; o livro mantém o desenho
   do leitor. Rota/estado do modo preservado ao navegar e recarregar.
2. **Edição no lugar** de nome, efeito, citação, fórmula e parágrafo; custo de Energia pelo selo
   (número ou `X`, Enter confirma); Enter em campo curto pula ao próximo; Enter no fim de parágrafo
   cria outro; Backspace em parágrafo vazio remove; Ctrl+B/Ctrl+I; `NA0`…`NA7` + espaço vira o selo
   de nível de ameaça. Reaproveitar `editor-markdown`/`valor-editavel` quando servirem; o texto rico
   continua o `RegrasTrecho` (`m11-01`).
3. **Ferramentas da peça** (peça selecionada, só na Oficina): REAÇÃO (habilidade), mover ↑↓ entre
   irmãs, duplicar, remover com aviso e "Desfazer".
4. **Salvamento automático por peça** com indicador "Salvando…"/"Salvo", usando `revisao`; conflito
   de revisão mostra aviso claro e recarrega a peça, sem sobrescrever. Granularidade (ao sair do
   campo ou debounce) decidida e registrada nesta task.
5. **Desfazer**: Ctrl+Z e botão para a sessão; tamanho da pilha e se sobrevive a recarregar
   decididos aqui e registrados.
6. **Pendências**: habilidade sem nome/custo/efeito e link para peça inexistente aparecem na peça e
   num contador (usa o validador da `m11-01`); não bloqueiam.
7. **Ir para peça (Ctrl+K)**: busca por nome no livro e leva à peça já em edição.
8. **API de edição** no backend (service + controller fina, só `ADMIN`): alterar `dados`, mover,
   duplicar, excluir (soft) peça com `revisao`; reaproveita os repositórios da `m11-02`.
9. **Primitivos novos** — barra de ferramentas da peça e paleta Ctrl+K **não existem** em
   `shared/ui/`. **Parar e perguntar ao autor** (opções e trade-offs) antes de criá-los ou
   contorná-los.

## Critérios de Aceite

- Testes de service (permissão `ADMIN`, `revisao` desatualizada, duplicar/mover/excluir) e de
  componentes/composables (atalhos de teclado, pilha de desfazer, conversão `NA`).
- **Gate visual** com `verify`, em `1920×1080` e `360×800`, claro/escuro: análogo aprovado
  registrado (leitor de Regras + `m11-oficina-exemplao.html` para a Oficina); estados percorridos
  (campo em edição, custo, peça selecionada com ferramentas, salvando/salvo, conflito de revisão,
  pendência, remover/desfazer, Ctrl+K); comparação lado a lado com o exemplão; todos os controles
  pelos primitivos de `shared/ui/` com a API completa; sem overflow; foco, contraste e alvos de
  toque corretos. No celular: editar o que existe funciona.
- Fora do modo Oficina, o leitor é idêntico ao de antes (regressão visual conferida).
- `npm run lint` e testes dos três workspaces verdes.

## Fora de Escopo

Inserir peças (`+`, `/`) e esqueletos (`m11-07`); arrastar no sumário (`m11-07`); blocos ricos
além dos desta lista (`m11-08`); marcas de mudança, "O que mudou" e Publicar (`m11-09`); edição por
não-admin (`I-060`); edição pesada no celular.

## Resultado

Concluída em dois cortes (API de edição; UI da Oficina). Decisões, verificação, revisão independente e
limites em [`m11-06-oficina-nucleo/verificacao.md`](m11-06-oficina-nucleo/verificacao.md).

## Dependências

`m11-04` em `done/` (e API de leitura em uso pelo leitor). `docs/design/DESIGN.md` e
`docs/design/tema/`. Decisão do autor sobre os primitivos (item 9).

## Riscos e Mitigação

- **Componente do leitor já extenso.** Edição entra por composable/serviço próprio (estado, salvar,
  desfazer), não dentro do leitor; registrar no fecho a avaliação de extração.
- **Eco/ordem de respostas no salvamento por peça** (resposta tardia sobrescrevendo edição nova):
  usar contador de requisições em voo por peça; testar.
- **Parecer HTML genérico.** O exemplão é o parâmetro de densidade e hierarquia.
