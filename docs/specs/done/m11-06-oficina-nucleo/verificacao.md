# m11-06 — Oficina núcleo: verificação e decisões

> Relatório da [m11-06](../m11-06-oficina-nucleo.spec.md). Entregue em dois cortes: **corte 1** (API de
> edição, commit `9d1e7479`) e **corte 2** (UI da Oficina, esta entrega). Capturas e roteiros ficam em
> `.artifacts/m11-06/` (ignorada pelo Git); o veredito abaixo não depende delas.

## O que foi entregue

- **Interruptor Leitura / Oficina** no leitor (`?modo=oficina` na URL, preservado ao navegar e recarregar).
  Só aparece para `ADMIN`, na página (não no painel flutuante) e quando o livro veio da API (`situacao`
  presente); quem não é `ADMIN` não vê o interruptor, não chama a API de edição e o parâmetro da URL é ignorado.
  No celular o interruptor fica na gaveta do sumário.
- **Edição no lugar** (`oficina/oficina-texto.component.ts`, um `contenteditable`): título de seção,
  parágrafo, exemplo, nota, fórmula, nome e efeito da habilidade e citação de classe/subclasse. Custo de
  Energia pelo selo (`app-valor-editavel` + campo; número de 0 a 99 ou `X`, Enter confirma, Esc cancela,
  inválido avisa e mantém o campo). Enter pula ao próximo campo; Enter no fim do parágrafo cria outro; Enter
  no meio o divide; Backspace em parágrafo vazio o remove (foco vai ao campo anterior); Ctrl+B / Ctrl+I;
  `NA0`…`NA7` + espaço vira o selo `NA <Nome> [n]`. Colar vira texto simples.
- **Ferramentas da peça** (`app-barra-ferramentas`, primitivo novo aprovado pelo autor): REAÇÃO
  (habilidade), subir/descer entre irmãs, duplicar, remover com aviso e "Desfazer". Só aparece na peça
  selecionada.
- **Salvamento automático por peça**, **Desfazer**, **pendências** (na peça e contador na barra, que leva à
  próxima) e **Ir para peça** (Ctrl+K, `app-paleta` com o nome e o caminho dos títulos).
- **API**: além da `m11-06` corte 1 (alterar `dados`, mover, duplicar, excluir, restaurar), este corte
  acrescentou `POST /livros/:codigo/pecas` (criar peça, para o Enter) com a mesma validação de forma e de
  aninhamento (`exigirDadosValidos`, `LIVRO_FILHOS_PERMITIDOS`).
- **Projeção com identificadores**: `projetarPecasEmRegras(conteudo, { incluirPecas: true })` põe `peca`
  (o `identificador`) em cada bloco; é como a Oficina liga o que vê à peça que edita. Sem a opção, a saída é
  a de antes.

## Decisões registradas (exigidas pela spec)

- **Granularidade do salvamento**: o campo entrega ao store 300 ms depois da última tecla; o store salva
  800 ms depois da última alteração da peça; perder o foco, confirmar o custo, REAÇÃO e qualquer ação
  estrutural (mover, duplicar, remover, criar) salvam na hora e esperam o que estiver em voo. Cada peça tem
  no máximo uma requisição em voo; uma edição durante o voo reenvia com a `revisao` devolvida e a resposta
  tardia só atualiza a `revisao` — nunca o texto local. Falha de rede mantém o texto, mostra "Não salvo" e
  repete a cada 5 s. Sair da página com alteração pendente aciona o aviso do navegador; trocar de livro ou
  de modo grava o pendente antes de limpar.
- **Conflito de revisão (409)** e recusa de forma (400): a peça é recarregada do servidor, a edição local é
  descartada, os passos do Desfazer dessa peça saem da pilha e o aviso diz que a edição não foi gravada.
- **Desfazer**: pilha de **100 passos**, **só da sessão** (recarregar, trocar de livro ou sair da Oficina a
  zera). Edições seguidas do mesmo campo dentro de 2 s formam um passo. Desfaz edição de texto/custo/REAÇÃO,
  mover, duplicar (exclui a cópia), remover (restaura), criar e dividir parágrafo. Ctrl+Z vale para o leitor
  inteiro e substitui o desfazer nativo do campo; **não há refazer** (Ctrl+Y e Ctrl+Shift+Z são engolidos
  para o navegador não desfigurar o DOM do campo).
- **Duplicar**: a cópia não leva âncora e os links que apontavam para a original continuam nela (nenhum link
  é remapeado).
- **O que a tela mostra**: na Oficina, a cópia de trabalho (`GET /livros/:codigo/pecas`); em Leitura, a
  fotografia publicada/rascunho. As edições só chegam à Leitura quando a `m11-09` publicar.
- **Busca do leitor** fica oculta na Oficina (as marcações da pesquisa conflitam com o campo editável).
- **Reaproveitamento**: `app-valor-editavel` serve ao custo; `editor-markdown` não serve (edita Markdown em
  `textarea`, não o `RegrasTrecho` inline). `app-paleta` já existia (a spec o dava como ausente); só a barra
  de ferramentas foi criada.
- **Extração (risco da spec)**: a lógica da Oficina não entrou no leitor — vive em `modules/regras/oficina/`
  (`OficinaStore`, `OficinaApi`, `oficina-trechos.ts` puro, componentes). O leitor ganhou só o
  interruptor, a barra, Ctrl+Z/Ctrl+K, o aviso de saída e a escolha entre o livro publicado e o da Oficina;
  extrair isso além seria desproporcional ao escopo.
- **Celular**: o selo de custo usa o piso de toque de 44 px do `app-valor-editavel`, então fica mais alto que
  na Leitura; foi mantido (o primitivo decidiu isso de propósito) em vez de sobrescrito localmente.

## Verificação

Detalhes dos números no fecho em `docs/context/HISTORY.md`.

- **Testes**: `oficina-trechos` (9), `oficina.store` (24: autosave, em voo, conflito, falha de rede, Desfazer,
  janela e limite da pilha, remover/restaurar, mover, criar, dividir, pendências, Ir para peça, encerrar),
  `oficina-texto.component` (13: atalhos, NA, Enter/Backspace, refazer do DOM, foco), `oficina-leitor` (5:
  papel, fallback estático, carga e ferramentas, Ctrl+Z), `barra-ferramentas`, projeção com `peca`, service
  de criar. Suítes: frontend 3278, shared 1198, backend 1080 (12 ignorados já existentes); lint dos três
  workspaces sem erros.
- **Visual (skill `verify`)**: app real (ng serve 4300) com sessão `ADMIN` e a API de livros simulada por
  interceptação de rota (fixture do importador sobre `docs/core`: Sistema, 1049 peças). Viewports `1920×1080`
  e `360×800`, claro e escuro. Análogos: leitor de Regras e `m11-oficina-exemplao.html`. Estados
  percorridos: campo em edição, custo (inválido e `X`), peça selecionada com ferramentas, REAÇÃO, salvando →
  salvo, falha de rede/conflito de revisão, pendência, mover, duplicar, remover + Desfazer, Ctrl+Z, Ctrl+K,
  NA/negrito, Enter/Backspace, gaveta com o interruptor no celular. Os roteiros automatizados (`gate`/`gate2`, 4 combinações de viewport e tema, 31 verificações cada) conferem
  também o estado do "servidor" simulado.
- **Regressão do leitor** fora da Oficina: build do commit anterior × build atual, mesma fixture, mesmo
  Chromium: Sistema e Guia × 1920×1080 e 360×800 × claro e escuro × 3 posições de rolagem = **24 pares com 0
  pixel de diferença** e texto idêntico.

## Revisão independente

Agente `revisor` (Claude), sem acesso ao diagnóstico: 12 achados, todos tratados exceto o último item
(estilo). Corrigidos:

1. **Habilidade inicial** de arquétipo/subclasse podia ser removida e derrubava a projeção: agora a barra
   desabilita duplicar/remover e o backend recusa excluir/duplicar a inicial.
2. **Filhos de ROTEIRO**: criar/remover/duplicar/mover descolocava as fatias de introdução/conclusão: o
   backend recusa essas ações e a UI não oferece (Enter e Backspace tratam como campo comum). Estruturar
   roteiro fica para quando as contagens forem ajustadas (`m11-07`).
3. **Desfazer de descendente** depois de remover e restaurar o pai: a pilha perde os passos das
   descendentes removidas e o Desfazer de dados marca a peça como pendente antes de salvar.
4. O "Desfazer" do aviso de remoção desfaz **aquela** remoção, não o topo da pilha.
5. "Ir para peça" lista só peças que a tela desenha; pendência de peça sem tela leva ao ancestral visível.
6. Subir/descer só troca com irmãs do mesmo grupo na tela (inicial, melhoradas e comuns separadas).
7. Alternar Leitura/Oficina usa a seção lembrada, não o fragmento antigo da rota.
8. Rede/5xx: um aviso só (não a cada tentativa).
9. Enter no meio: o começo fica na peça antes da requisição; o digitado durante ela não se perde.
10. A mescla de peças nunca devolve uma `revisao` menor que a local.
11. Ctrl+B/I/U barrados em campo simples e Ctrl+U em campo rico; estado morto `conflito` removido; comentário
    corrigido.

Mantido: a opção `incluirPecas` da projeção é variável de módulo (síncrona, restaurada em `finally`); passá-la
como parâmetro por todas as funções de projeção foi julgado desproporcional neste corte.

## Limites

- A API usada no gate visual é simulada; o backend foi coberto por testes de service/controller e pelo
  Postgres da `m11-02`/`m11-06` corte 1, sem teste HTTP ponta a ponta (não há supertest). O importador
  continua não executado no banco de dev do autor: sem fotografia na API o leitor cai no JSON estático e a
  Oficina não é oferecida.
- Só Chromium (Playwright). Safari/Firefox e teclado virtual do celular não foram exercitados; o
  `contenteditable` depende de `document.execCommand` para negrito/itálico (obsoleto, mas é o que o navegador
  oferece para esse caso).
- Edição de arquétipo/origem/tabela/lista e demais blocos ricos é da `m11-08`; inserir peças (`+`, `/`) e
  arrastar no sumário, da `m11-07`.
