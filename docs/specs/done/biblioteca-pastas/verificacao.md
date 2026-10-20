# biblioteca-pastas — verificação (2026-10-20)

Spec: [biblioteca-pastas.spec.md](../biblioteca-pastas.spec.md). Capturas e scripts brutos ficam em
`.artifacts/biblioteca-pastas/` (local, ignorada pelo Git); este relatório não depende delas.

## Ambiente

PostgreSQL 16 em Docker, migrations até a `0040`, backend (3100) e SPA (4300) reais. O Docker Desktop
estava travado por sockets Unix antigos no perfil do usuário (`dockerInference`, `engine.sock`),
removidos pelo WSL; não é defeito do projeto.

## Gates automáticos

- Backend: 1344 testes (99 ignorados preexistentes), ESLint e `tsc` sem erros.
- Frontend: testes de documento, ícones, primitivo e Caderno verdes; `tsc` (app e spec) e ESLint
  sem erros. Os testes pegaram um bug (menu contextual abria antes de os itens chegarem pelo binding).
- `npm run repo:verificar` aprovado.

## Banco e API reais (33 verificações, todas aprovadas)

- Cada cargo lê só a sua organização: mestre `MESTRE` editável; jogador `JOGADOR` editável; espectador
  `JOGADOR` não editável; fora da campanha, 403.
- Espectador criar/renomear/mover: 403. Mestre mexendo em pasta dos jogadores e jogador mexendo em pasta
  do mestre: 404. O mestre não vê pastas dos jogadores e vice-versa.
- Teto de 5 níveis (6º recusado), ciclo recusado (400), documento oculto na organização dos jogadores
  (404), ordem de vínculo e reposicionamento, mestre organiza documento oculto só na própria árvore.
- Ocultar remove o vínculo dos jogadores (volta à raiz ao revelar); excluir pasta devolve tudo à raiz;
  excluir documento limpa o vínculo do mestre.
- Tempo real por sockets reais: a mutação dos jogadores chega a outro jogador e ao espectador e **não**
  ao mestre; a do mestre chega só ao mestre; ocultar emite a organização dos jogadores sem emitir ao mestre.

## UI real (Playwright, dois usuários)

- Sem recarregar a página: a pasta criada por um jogador aparece para outro jogador e para o espectador;
  o mestre não a vê. Arrastar um documento para a pasta (HTML5 drag and drop) grava o vínculo e o
  espectador vê a pasta com 1 item; o mestre ocultar o documento zera a contagem da pasta ao vivo.
- Sem erros de console em nenhuma das visões.

## Gate visual (análogo: `.documento-cartao` da própria Biblioteca)

`1920×1080` e `360×800`, jogador, espectador e mestre; estados: inicial, expandido, Organizar, menu
da pasta, "Mover para…", "Nova pasta", busca com caminho. Conferido pelo agente principal:

- A linha de pasta usa a receita do cartão de documento (superfície, borda, raio, hover), mais baixa,
  com chevron, ícone de pasta, nome em mono e contagem; recuo por nível; mesma família visual.
- O espectador só navega (sem barra, sem ações); controles por item só no modo Organizar; alvos de
  toque de 44px no mobile; sem overflow horizontal.
- Corrigido na verificação: o gatilho de ações usava o ícone `mais` ("+", sugere adicionar) e virou
  `opcoes` (três pontos); a faixa "Soltar na raiz" aparecia acima da lista e empurrava os alvos durante
  o arrasto (o drop falhava) — agora fica depois da lista.

## Limites

- Arrastar e soltar foi exercitado em Chromium; toque usa o menu "Mover para…" (testado por DOM e visto
  nos viewports, sem gesto de toque real).
- Navegadores Firefox/Edge não foram executados (sem CSS dependente de navegador nesta mudança).
- No mestre mobile, em modo Organizar, o título de documentos dentro de pasta trunca (três controles ao lado).
- O seletor de documento do Caderno continua plano, por decisão de escopo.
