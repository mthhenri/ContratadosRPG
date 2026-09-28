# m9-11-biblioteca-painel-flutuante.spec.md

> **Task avulsa pós-M9 (pedido direto do autor, 2026-09-28).** Posterior a `m9-07` (desselecionar),
> `m9-08` (importar Markdown) e `m9-09`/`m9-10` (quem está lendo — backend e frontend), que tocam
> os mesmos componentes da Biblioteca; integrar depois delas e herdar o que já tiverem entregado (ver
> "Dependências").

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` — seções "Painel flutuante, modal e painel
> lateral (`ui-17`)", "Biblioteca de documentos (`m9-04`)" e "Breakpoints" — e o handoff em
> `docs/design/tema/`. Todo controle usa o primitivo de `shared/ui/` com a API completa; se faltar
> variante, glifo ou primitivo, **parar e perguntar ao autor**.

## Objetivo

A Biblioteca de documentos da campanha passa a abrir **também como painel flutuante**
(`app-painel-flutuante`), do mesmo jeito que Caderno e Calculadora: uma ferramenta de apoio que fica
aberta enquanto a pessoa joga. O painel fica disponível em três lugares:

1. **Cenas:** nos painéis de cena com e sem iniciativa, tanto do mestre quanto do jogador.
2. **Ficha completa** (`/fichas/:id` com campanha): ao lado de Histórico, Anotações, Calculadora e
   Caderno.
3. **Tela da campanha** (detalhe do mestre e do jogador): o item "Biblioteca" deixa de navegar e
   passa a abrir o painel. A página `/campanhas/:id/documentos` continua existindo e é aberta por um
   botão no próprio painel.

No painel dá para **ler e buscar**. O mestre também vê os ocultos e pode **Revelar/Ocultar**. Criar,
editar, reordenar, remover e trocar imagem continuam **só na página**.

## Análogo aprovado (registrar no fecho da task)

- **Casca flutuante:** `CadernoFlutuante` (`modules/pagina-caderno/caderno-flutuante.component.*`).
  Ele já faz o que o painel novo precisa: gatilho escondido (`mostrarGatilho=false`) e abertura por
  item de `app-coluna-acoes`, posição inicial fora da coluna (`{ x: 280, y: 72 }`), maximizar,
  redimensionar pelo canto, folha cheia no mobile e `painelAcoesExtras` no cabeçalho. O
  `LeitorDocumentos` (`shared/leitor-documentos/`) serve de segunda referência, porque é um painel
  flutuante que também é um leitor de documentos.
- **Conteúdo:** a própria Biblioteca da `m9-04`/`m9-05`/`m9-06`, com a composição lista | documento,
  `ListaDocumentos`, `DocumentoCartao`, `BuscaDocumentos`, `LeitorDocumento` e as duas vistas do
  celular (lista ↔ documento). O painel **não** inventa outra lista nem outro leitor.
- **Item na coluna:** os itens Calculadora/Caderno de cada tela listada abaixo, com `[pressionado]`
  refletindo o painel aberto (memória: painéis flutuantes vão na coluna, nunca com gatilho próprio).

## Estado atual

- **Página:** `BibliotecaDocumentos` (`modules/documento/paginas/biblioteca/`) bifurca por papel
  entre `BibliotecaMestre` (566 linhas, com toda a gestão: edição com rascunho e 409, upload,
  reordenar, remover e revelar) e `BibliotecaJogador`. O espectador tem rota própria
  (`BibliotecaEspectador`).
- **`BibliotecaLayout`** junta duas coisas: a **casca da página** (cabeçalho com voltar, `//`,
  "Biblioteca", nome da campanha, régua e a ação) e o **corpo** (seção da lista com busca + seção do
  documento aberto). Hoje não tem como usar só o corpo.
- **`BibliotecaLeituraStore`** é o estado da leitura (jogador e espectador): lista, aberto, tempo
  real por `documentoAlterado$`/`reconexao$`, fechamento com aviso em `OCULTADO`/`REMOVIDO` e
  recarga silenciosa em `ALTERADO`. É provida por página e **pressupõe que quem lê não é mestre**:
  fecharia o documento quando o próprio mestre o oculta.
- **Revelar/Ocultar** existe só em `BibliotecaMestre.alternarRevelacao` (`:302`), com a trava
  `podeRevelar` (imagem sem `imagemUrl` não se revela), a versão (`aplicarNoAberto`) e o toast
  "Revelado para a mesa" / "Oculto".
- **Onde a Biblioteca é alcançável hoje:** só por navegação, no item "Biblioteca" da coluna e do menu
  "⋯" em `detalhe-mestre.page.html` e `detalhe-jogador.page.html` (desabilitado na prévia), e na
  coluna do espectador.
- **Onde ela não existe:**
  - `painel-sem-iniciativa-mestre`/`-jogador` (`modules/cena/paginas/`) e `painel-mestre`/
    `painel-jogador` (`modules/encontro/paginas/`, a cena com iniciativa), que têm Calculadora e
    Caderno na coluna;
  - `visualizar.page` (ficha completa), cuja coluna "Ficha" tem Histórico, Anotações, Calculadora e
    Caderno (este último só com `campanhaId() !== null`, montado sob demanda por
    `cadernoHabilitado`).

## Entregáveis

1. **Separar o corpo da casca.** O miolo de `BibliotecaLayout` (lista + busca + documento aberto,
   com as duas vistas do celular) vira um componente reutilizável, que a página e o painel montam
   sem duplicar template ou SCSS. A página continua visualmente **idêntica**: a separação não pode
   mudar nenhum pixel das três visões da página. O nome e o recorte exato ficam para a
   implementação, que deve registrá-los.

2. **Estado do painel.** Um estado para a Biblioteca flutuante com duas formas:
   - **leitura** (jogador; espectador, se chegar a ele): igual a `BibliotecaLeituraStore`;
   - **mestre**: a lista inteira, com ocultos e chip Revelado/Oculto (`mostrarEstado`). Quando o
     documento aberto é ocultado, ele **não** fecha; só `REMOVIDO` fecha com o aviso. Uma versão nova
     recarrega em silêncio, como na leitura.

   Ele reusa `BibliotecaLeituraStore` parametrizado ou uma extração comum. Não pode existir uma
   terceira cópia do tratamento de `documentoAlterado$`/`reconexao$`. A sala da campanha é usada
   como hoje: a tela hospedeira já está nela, então entrar e sair precisa ser idempotente e não pode
   derrubar a sala da tela ao fechar o painel. Conferir com a skill `tempo-real`.

3. **Revelar/Ocultar no painel (só mestre).** Fica no cabeçalho do documento aberto (o slot
   `bibliotecaAcoesDocumento`), com o mesmo primitivo, rótulo, ícone e tamanho da página, a mesma
   trava `podeRevelar`, o mesmo toast e a mesma atualização da versão do aberto. A regra fica num
   lugar só: extrair de `BibliotecaMestre` para o estado/serviço comum e fazer a página consumir a
   mesma função. Se a extração não for proporcional, registrar o motivo no fecho. Editar, Remover,
   Novo documento e setas de ordem **não aparecem** no painel.

4. **Componente `BibliotecaFlutuante`** em `modules/documento/`, na casca do `CadernoFlutuante`:
   - `app-painel-flutuante` com `id="biblioteca"`, título `Biblioteca · <campanha>`, kicker no mesmo
     registro do Caderno e do Leitor (sugestão: "Arquivo da campanha", confirmar no corte visual),
     `[mobile]`, maximizar, redimensionar pelo canto com mínimo próprio e posição inicial fora da
     coluna de ações;
   - `mostrarGatilho=false` e abertura por `abrir()`/`alternar()`, chamado pelo item da coluna;
   - em `painelAcoesExtras`, o botão **"Abrir página da Biblioteca"** (`app-botao-icone` +
     `appTooltip`, nunca `title`), que navega para `/campanhas/:id/documentos`. Usar um glifo que
     não se confunda com o "Abrir em janela" do Caderno (`abrir-externo`). Se nenhum glifo existente
     servir, **perguntar ao autor**;
   - inputs mínimos: `campanhaId`, `campanhaNome` e `ehMestre`. O papel vem da tela hospedeira, que
     já o conhece; o painel não chama `listarMembros` de novo;
   - lista e documento carregam **só quando o painel abre pela primeira vez** (montagem sob demanda,
     como o `cadernoHabilitado` da ficha completa). Tela que nunca abre a Biblioteca não faz nenhuma
     requisição de documento.

5. **Cenas.** Um item "Biblioteca" (`icone="biblioteca"`, `appTooltip="Biblioteca"`,
   `[pressionado]` = painel aberto) na coluna de ações, junto de Calculadora/Caderno, em:
   - `painel-sem-iniciativa-mestre` e `painel-sem-iniciativa-jogador`;
   - `painel-mestre` e `painel-jogador` (encontro, a cena com iniciativa).

   Onde a tela tiver menu "⋯" no mobile com Calculadora/Caderno, o item entra nele também. Na prévia
   do mestre como jogador, o item segue a regra que a tela já usa para Cenas/Biblioteca: desabilitado
   com o tooltip de indisponível.

6. **Ficha completa.** Item "Biblioteca" na categoria "Ficha" de `visualizar.page`, logo depois de
   Caderno e com a mesma condição (`campanhaId() !== null`). Também entra no menu "⋯" do mobile. O
   papel é o `ehMestre()` que a página já calcula. Ficha sem campanha não mostra o item.

7. **Tela da campanha.** Em `detalhe-mestre` e `detalhe-jogador`, o item "Biblioteca" da coluna e do
   menu "⋯" **abre o painel** em vez de navegar. Os estados desabilitados da prévia continuam como
   estão. A página segue alcançável pelo botão do entregável 4 e por URL. O espectador **não muda**
   (fora de escopo).

8. **Convívio com a página e com outros painéis.**
   - Nas telas que já têm Caderno/Calculadora, o painel empilha por z-index com eles, sem regra
     nova.
   - Posição, tamanho e minimizado persistem por `id="biblioteca"`, como os outros painéis. Aberto
     ou fechado **não** sobrevive à navegação: abrir é sempre um gesto.
   - Ao ir para a página pelo botão, o painel some com a tela hospedeira, e nada fica aberto por cima
     da página.

9. **Estados do painel.** Carregando (esqueleto do corpo), lista vazia (textos da leitura para o
   jogador e texto próprio para o mestre, que aponta para a página, onde se cria o documento),
   nenhum documento aberto, documento aberto, busca ativa, "documento não está mais disponível",
   erro de carga e minimizado. No mobile, folha cheia com as duas vistas lista ↔ documento que o
   corpo já tem.

10. **`DESIGN.md`**: na seção "Biblioteca de documentos", um parágrafo sobre a forma flutuante (o
    que aparece, o que fica só na página e o botão para a página). Na lista de consumidores de
    `app-painel-flutuante`, acrescentar a Biblioteca.

## Critérios de Aceite

- [ ] Nas quatro telas de cena (sem e com iniciativa, mestre e jogador), o item "Biblioteca" abre e
      fecha o painel, e `[pressionado]` acompanha o estado.
- [ ] Na ficha completa com campanha, o item aparece depois de Caderno e abre o painel. Sem
      campanha, o item não aparece.
- [ ] Na tela da campanha (mestre e jogador), o item da coluna e do "⋯" abre o painel. O botão
      "Abrir página da Biblioteca" leva a `/campanhas/:id/documentos`. Na prévia, o item continua
      desabilitado.
- [ ] O jogador vê só o revelado. Um documento revelado entra na lista ao vivo sem abrir sozinho, e
      o aberto que for ocultado ou removido fecha com o aviso, como na página.
- [ ] O mestre vê ocultos com chip, lê qualquer um e alterna Revelar/Ocultar pelo painel com o mesmo
      toast da página. O documento continua aberto depois de ocultado, e a mudança aparece ao vivo
      para um jogador com o painel aberto em outra tela.
- [ ] Imagem sem `imagemUrl` não pode ser revelada no painel, com a mesma trava da página.
- [ ] No painel não aparece Editar, Remover, Novo documento, upload nem setas de ordem.
- [ ] A busca funciona no painel com o mesmo recorte por papel.
- [ ] A página da Biblioteca (três visões) está visualmente idêntica antes e depois do entregável 1.
- [ ] Uma tela que nunca abre o painel não faz requisição de documento, e fechar o painel não tira a
      tela da sala da campanha (a tela continua recebendo os próprios eventos).
- [ ] Revelar/Ocultar tem uma única implementação usada pela página e pelo painel, ou há registro no
      fecho explicando por que não.
- [ ] Nenhum `title` HTML, hex, fonte ou raio solto. Todo controle usa o primitivo de `shared/ui/`
      com os inputs certos.
- [ ] Gate visual (skill `verify` + `design-fidelity`) em `1920×1080` e `360×800`, pelo menos numa
      tela de cena, na ficha completa e na tela da campanha, como mestre e como jogador: aberto,
      minimizado, maximizado, documento aberto, busca, vazio, revelar/ocultar ao vivo com dois
      usuários, e junto com o Caderno aberto (empilhamento). Comparado com o `CadernoFlutuante` e
      com a página da Biblioteca.
- [ ] Testes focados verdes: estado do painel (as duas formas, com eventos de tempo real),
      `BibliotecaFlutuante` (abrir sob demanda, botão para a página, ações por papel) e as specs
      existentes da página da Biblioteca sem regressão. Build, lint e suíte do frontend no gate de
      conclusão.

## Fora de Escopo

- Criar, editar, remover, reordenar ou enviar imagem pelo painel. Tudo isso continua na página.
- Abrir a Biblioteca em janela externa do navegador (o "Abrir em janela" do Caderno/Anotações, I-027).
- O espectador: a coluna e o painel do espectador continuam com a navegação para a página dele.
- Lembrar entre navegações qual documento estava aberto no painel.
- Palco da cena de Investigação (`m7-25`), que usa `LeitorDocumento` por outro caminho.
- Qualquer mudança de backend, contrato em `shared/` ou permissão. O recorte continua do backend.

## Dependências

- `m9-07` (desselecionar ao clicar no aberto): se já estiver integrada, o corpo extraído no
  entregável 1 carrega o comportamento e o painel o herda sem código próprio. Se não estiver, esta
  task não o implementa.
- `m9-08` (importar Markdown) é da página do mestre e não afeta o painel. Só exige integração em
  sequência, porque mexe nos mesmos arquivos.
- `m9-09`/`m9-10` (quem está lendo): se a `m9-10` já estiver integrada, decidir no início se a
  abertura de um documento pelo painel conta como leitura. O padrão esperado é que sim, igual à
  página, e isso deve ser registrado.
- Primitivos existentes: `app-painel-flutuante`, `app-coluna-acoes`/`-item`, `app-botao`,
  `app-botao-icone`, `app-chip`, `app-estado-vazio`, `app-esqueleto`, glifo `biblioteca`.

## Decisões do autor (2026-09-28)

1. **Ações do mestre no painel:** leitura + Revelar/Ocultar. O resto da gestão fica na página, que é
   aberta por um atalho no painel.
2. **Tela da campanha:** o item "Biblioteca" abre o painel, e o painel tem o botão "Abrir página da
   Biblioteca". Não há dois itens na coluna.

## Decisões assumidas ao especificar (confirmar se divergir)

- "Cenas" inclui as telas com iniciativa (`modules/encontro/paginas/painel-*`), porque são o painel
  da mesma cena. O hub de cenas não entra, porque não tem coluna de ações.
- O item na cena e na ficha completa fica junto de Calculadora/Caderno, e não em "Campanha", porque
  é uma ferramenta de apoio da sessão.
- Aberto ou fechado não persiste entre telas. Só posição, tamanho e minimizado persistem, pelo
  primitivo.

## Riscos e Mitigação

- **Regressão visual na página ao separar o corpo da casca.** Capturar as três visões antes da
  extração e comparar depois, nos quatro viewports da `m9-06`.
- **Sala de tempo real derrubada ao fechar o painel:** um `sairSalaCampanha` do painel tiraria a tela
  hospedeira da sala. Verificar com dois usuários (skill `tempo-real`/`verify`) e usar contagem de
  referência, ou não entrar nem sair quando a tela já é dona da sala.
- **Mestre com a mesma lógica da leitura:** o documento fecharia no próprio Ocultar. Coberto pelo
  critério de aceite e por teste do estado na forma mestre.
- **Duplicar Revelar/Ocultar:** coberto pelo entregável 3 e pelo critério de implementação única.
- **Telas já extensas** (`visualizar.page`, `painel-mestre`, `detalhe-*`): cada uma ganha só o item e
  a montagem do componente. Qualquer lógica além de `abrir/alternar` vai para o `BibliotecaFlutuante`.
- **Espectador pela ficha completa:** se um espectador puder abrir uma ficha completa com campanha,
  o painel roda na forma leitura (o backend libera `listar`/`buscar` para ele). Confirmar ao vivo.
  Se a tela não for alcançável por espectador, registrar isso.

## Fecho

(preencher na conclusão: análogo usado, viewports/estados observados, comparação visual, correções
durante a inspeção, comandos e resultados, pendências)
