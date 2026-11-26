# Verificação — gerador de PDF das Regras

> Anexo de [`revisao-formatacao-pdf-regras.spec.md`](../revisao-formatacao-pdf-regras.spec.md). 25–26/11/2026.
> Evidências brutas (PDFs, folhas de páginas, capturas, roteiros) em `.artifacts/revisao-formatacao-pdf-regras/`,
> locais e fora do Git.

## Aprovação do autor

Livros completos aprovados em 25/11/2026 ("Aprovo, ligue o botão"), depois dos ajustes de justificado, parágrafo
inteiro, arquétipos, ícones e tema. A reativação do Sistema entrou nessa aprovação.

## Gates

| Gate | Resultado |
|---|---|
| Testes do frontend | 301 arquivos, 3.723 testes (com `NODE_OPTIONS=--no-experimental-webstorage`, P-138) |
| Testes do backend / `shared` | 1.361 passando (100 pulados, de integração) / 1.348 passando |
| `tsc` (app e spec) e build | ok; o aviso de orçamento do pacote inicial (603 kB de 450 kB) é anterior e não mudou |
| Lint | 0 erros; os arquivos novos sem nenhum aviso (os avisos do repositório são anteriores) |

O gerador (com o jsPDF) fica num pedaço carregado só no clique (`gerar-livro`, cerca de 450 kB, 125 kB comprimido).

## Aplicação real

Servidores de desenvolvimento locais, publicação local **Sistema 4.1.4** e **Guia 4.2.0**, sem login, Playwright.

| Cenário | Resultado |
|---|---|
| Chromium, Edge e Firefox em `1920×1080` e `360×800` (Sistema) | baixou `Contratados RPG - Sistema - v4.1.4.pdf`, 59 páginas, em 1,4–1,8 s; botão desabilitado e aviso "Gerando o PDF…" durante; reabilitado depois; sem erro no console |
| Guia no tema claro com destaque azul | 26 páginas, com o destaque azul em capa, títulos e ícones |
| Painel flutuante, nos dois tamanhos | mesmo download e estados do botão; no celular os avisos ficam ocultos (P-139) |
| Servidor respondendo 500 | aviso "Não foi possível exportar", nada baixado, botão liberado |

**Achado na verificação:** no celular, a gaveta do sumário (camada 70) cobria os avisos (camada 50), e o estado
"gerando" não aparecia. O clique em exportar passou a fechar a gaveta; conferido de novo (aviso no topo da pilha).
O mesmo encobrimento continua para outros avisos disparados com a gaveta aberta (P-139).

**Pendente:** no celular, com as Regras na **janela flutuante** (tela cheia), os avisos ficam atrás dela, inclusive o
de falha da exportação. O download acontece normalmente. Registrado em P-139.

**Comparação visual:** o análogo é o próprio botão anterior (`app-botao-icone` compacto ao lado do título, com
`appTooltip`); posição, tamanho e estados não mudaram. Não há controle novo; o estado de geração usa o desabilitado do
primitivo e `app-notificacoes`. O botão de ícone não tem estado "carregando": um giro nele exigiria ampliar o
primitivo, decisão do autor.

## Páginas

Todas as 85 páginas dos arquivos gerados **pelo app** (Sistema escuro, Guia claro azul) olhadas em folhas de contato,
mais páginas ampliadas nos temas claro, escuro e escuro roxo. Não foram olhadas todas as páginas nos três temas.

**Nenhum texto some:** além do teste de palavras, os 2.130 trechos de texto dos dois livros foram procurados inteiros e
na ordem no que foi desenhado. Ficam de fora só as duas linhas de ataque da ficha de exemplo do Guia, que o leitor do
site também troca pelos cartões de ataque. O teste `palavrasPerdidas` sozinho é fraco (basta a palavra existir em
qualquer lugar) e não vale como prova.

## Revisão independente

Subagente somente leitura. Nenhum defeito nos livros atuais; riscos para edições futuras, todos corrigidos com teste:

1. título órfão quando o bloco seguinte força página nova;
2. conteúdo antes do primeiro capítulo (e um segundo registro) sumia;
3. título solto quando título e parágrafo juntos passavam de uma página;
4. nível de ameaça `compacto` saía como selo, e o leitor só o colore;
5. ficha de criatura podia omitir um valor curto só porque a palavra aparecia noutro assunto (a primeira correção
   repetiu "Fraquezas"; ajustada e olhada de novo).

## Limites

- Conteúdo **4.1.5** (`docs/core/`) não conferido: o banco local publica a 4.1.4. Tipo de bloco desconhecido faz a
  exportação avisar falha, não gerar arquivo incompleto.
- Navegadores do Playwright e Edge instalado; nenhum aparelho real. Tempo de geração medido só nesta máquina.
- Tema escuro gasta muita tinta se impresso: segue o pedido de acompanhar o tema.
- **Fonte Backrooms sem licença** no arquivo e nenhuma encontrada. O autor, avisado de que o repositório é público,
  decidiu incluí-la (26/11/2026).
