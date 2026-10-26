# POC do montador — prévia de 2026-10-25

## Guia de uso do montador

Autor aprovou o terceiro modelo e pediu um guia operacional complementar ao guia de expressões. Incluído botão “Guia” no cabeçalho, acessível nos três modelos, abrindo `Como usar o montador` com três assuntos: Começar, Editar termos e Exemplos. Conteúdo em `prototipo/guia.html`; comportamento e layout em `guia.ts`/`guia.scss`. Fonte única do texto de interface, sem duplicação em outro manual.

O guia cobre escolha dos modelos, termos, adição de dados/fontes/números, seleção/brilho, quantidade versus multiplicador, sinal, tipo e divisão independentes, opções exclusivas de dados, repetição, remoção/Desfazer/Restaurar/Limpar e exemplos reproduzíveis. Um exemplo usa Força ×2 e Proficiência em Físico, com d8/Nível em Balístico. Outro diferencia expressão de bônus de quantidade. O rodapé identifica o caráter local da POC. O acesso ao guia de expressões reutiliza `GuiaFormula` real, sem copiar/revisar sua gramática.

Análogo: guia de fórmulas existente e primitivo `Modal`, com tipografia, superfícies e densidade canônicas; segmentados/botões reais com API e receitas explícitas. O modal foi mantido fora do painel flutuante para evitar disputa de foco; o guia de expressões abre como modal nativo aninhado, padrão já suportado pelo primitivo. Nenhuma alteração nos primitivos nem em seus consumidores da aplicação.

Build isolado aprovado. Chromium em 1920×1080, 1366×768, 960×1080 e 360×800: acesso ao guia pelos três modelos, três assuntos, guia de expressões existente, fechamento por botão/Escape, retorno ao guia após fechar o modal aninhado, retorno ao montador com fórmula intacta e foco devolvido ao gatilho. Sem exceções/overflow horizontal; modal inteiramente dentro da viewport; controles mobile ao menos 44×44px. Leitura pessoal de `guia-comecar-1920.png`, `guia-editar-1920.png` e `guia-exemplos-360.png`: hierarquia legível e comportamento responsivo coerente; conteúdo extenso rola no modal. Capturas e `guia-verificacao.json` são evidências locais em `.artifacts/montador-atributos-poc/` e não acompanham o clone.

Passe final proporcional ao recorte: fontes novas da POC revisadas contra os rótulos e comportamentos já verificados, sem regra de jogo duplicada, DTO/SQL, cores/fontes/raios hardcoded ou novos controles locais. Modal, seleção de assuntos e ações usam a biblioteca real; `GuiaFormula` preservado. `npm run repo:verificar` aprovado. Continua sem integração à aplicação; conteúdo e apresentação do guia aguardam avaliação do autor.

## Próximo modelo: Dados livres

Autor aprovou o dano (“ta maneiro assim”) e solicitou Dados livres. Terceiro modelo adicionado com estado próprio, reaproveitando lista/edição aprovadas. Começa vazio e acrescenta termos sem tipo pré-selecionado; Rolar desabilitado até haver conteúdo. Vazio usa `EstadoVazio` real compacto. Limpar pode ser desfeito e não altera os outros modelos. No mobile, o rótulo visual “Teste” conserva o nome acessível completo para acomodar os três botões.

Expressão pode ser bônus ou quantidade de dados, validada por `avaliarExpressaoMontador`/`normalizarExpressao`, sem nova gramática. Faces permanecem visíveis/desabilitadas quando inaplicáveis. Contas têm edição/aplicação próprias e área reservada; conta inválida não substitui a fórmula válida. Tipos, sinal, divisão e opções seguem independentes. Atalhos e edição textual da fórmula inteira ficam fora do recorte.

Build isolado aprovado. Chromium em 1920×1080, 1366×768, 960×1080 e 360×800: vazio, d6/d8 sem tipo, bônus `(FOR+VIG)*2`, edição inválida `FOR+` preservando a fórmula, edição válida `FOR*3`, quantidade `(FOR+1)d6`, rolagem, Limpar/Desfazer e alternância entre três modelos preservando suas fórmulas. Sem exceções ou overflow horizontal; rodapé dentro da viewport; botões/selects/inputs editáveis mobile atendem 44×44px. Novos campos de expressão receberam altura mínima de toque.

Inspeção pessoal de `livre-exemplo-1920.png`, `livre-vazio-360.png`, `livre-exemplo-360.png` e `livre-editor-360.png`: identidade, brilho/seleção e densidade preservados; expressão editável legível; grupos alcançáveis pelo scroll. Capturas e `livre-verificacao.json` são evidências locais em `.artifacts/montador-atributos-poc/`, ausentes do clone. Nenhum código da aplicação alterado; Dados livres aguarda avaliação.

## Revisão atual: todos os termos independentes e seleção da linha

O autor rejeitou o tipo comum de atributo/bônus e pediu multiplicador de atributo, independência de Proficiência/Nível/números e destaque da linha inteira. A POC de dano agora guarda uma lista de peças reais (`DADO`, `FONTE`, `NUMERO`), sem campos agregados de bônus que propaguem um tipo aos demais. Cada peça tem sinal, tipo e divisão próprios; as fontes têm multiplicador. Dados mantêm suas próprias opções. É possível acrescentar várias ocorrências da mesma fonte com destinos diferentes.

Modelo visual: termos primeiro, cada um com nome, tipo por extenso, valor escalar efetivo (calculado pelo auxiliar existente), controle rápido e remoção. A seleção envolve a linha inteira com borda/brilho `--accent-border`/`--accent-dim`, preservando a faixa de cor do tipo da `FichaTermo` real. O autor autorizou expressamente esse destaque; ele foi feito num invólucro local da POC sem modificar o primitivo. Foco ou interação no controle rápido também seleciona a linha, exceto no botão de remover.

No desktop, a janela de dano usa 760px e separa montagem e edição em colunas com rolagem própria; em janela estreita, as colunas viram fluxo vertical, com lista limitada/rolável no mobile. Cabeçalho da edição repete o termo, o índice, o tipo e o valor. O mesmo editor apresenta os controles de valor, sinal, tipo e divisão para todos os termos; opções exclusivas de dados ficam desabilitadas para fontes/números e preservam sua posição. Teste de atributo mantém seu desenho aprovado e largura de 520px.

`Exemplo misto` carrega `2d6 + FOR*2 [F] + 1d8 [B] + PROF [F] + NIV [B]`, selecionando Força ×2. Motor existente conferido com todos os dados em 1, Força 3, Proficiência 2 e Nível 5: total 16, Físico 10 e Balístico 6. Portanto Força e Proficiência não vazam para o grupo Balístico.

Build isolado aprovado; verificação Chromium em 1920×1080, 1366×768, 960×1080 e 360×800. Exemplo misto, multiplicador ×2→×3, mudança de Nível para Químico sem alterar Proficiência Físico ou d8 Balístico, adição independente de fontes/número, número em Explosão, Desfazer e rolagem local exercitados. Uma única linha selecionada com brilho confirmado; editor mantém a posição ao alternar fonte/dado no desktop. Sem exceções ou overflow horizontal; rodapé dentro da viewport; controles mobile com pelo menos 44×44px. Durante a inspeção foi corrigida a largura mínima do botão de seleção de dados curtos.

Inspeção pessoal de `dano-independente-1920.png`, `dano-independente-360.png` e `dano-independente-editor-360.png`. Capturas e `dano-independente-verificacao.json` são evidências locais em `.artifacts/montador-atributos-poc/`; não acompanham o clone. Esta revisão substitui as limitações de tipo comum descritas no histórico abaixo. Continua sendo POC isolada, sem alterações no código do produto; aguarda avaliação do autor.

## Revisão do dano: botões e múltiplos termos

O autor pediu maior proximidade com o montador atual: botões por dado, botões para tipo/divisão e vários dados na mesma fórmula. A restrição de um conjunto foi removida. O teclado usa os sete dados e ícones canônicos; `adicionarDadoMontador` decide quando somar a um termo existente e quando acrescentar outro, exatamente como no editor do produto. Lista em `FichaTermo` real, com seleção, quantidade, remoção e faixas de tipo simples/composto. Nenhum primitivo foi modificado.

O termo selecionado é editado numa área estável com botões de tipo/divisão e opções próprias (manter, dado extra, margem). A divisão conserva os mesmos botões ao trocar o tipo e desabilita combinações impossíveis. Seleção não acrescenta/retira controles. Crescimento/remoção da lista acontece apenas ao acrescentar/remover termos, ações explícitas do usuário. Atributo e bônus têm um tipo comum próprio, independente dos termos de dados, configurável por botões. Expressões e atalhos permanecem fora desta POC.

Build isolado aprovado. Navegador Chromium nos quatro viewports: d8 acrescentado a 2d6, segundo clique soma a 2d8; divisão Químico/Balístico só no segundo termo; mudança para Geral desabilita divisão sem deslocar a linha de leitura; Desfazer recupera a divisão; seleção de 2d6 preserva seu tipo Físico. Rolagem local funciona com a fórmula mista. Remoção de todos os dados, estado vazio, inclusão posterior de d20 e Restaurar exercitados. Sem exceções, sem overflow horizontal, rodapé dentro da viewport; no mobile, botões e selects visíveis atendem 44×44px.

Inspeção pessoal das capturas `dano-multiplos-1920.png`, `dano-multiplos-360.png` e `dano-tipos-360.png`: identidade do montador preservada, dados com ícones reais e cartões canônicos, distinção entre seleção e cor de dano, faixa composta correta, campos sem cortes horizontais e scroll interno para alcançar as opções. JSON e capturas locais em `.artifacts/montador-atributos-poc/`. Estado atual substitui o primeiro recorte de dano descrito abaixo. Continua sem alteração em frontend/backend/shared; prévia aguarda avaliação.

## Próximo modelo: dano de arma

O autor aprovou a organização do teste de atributo (“Perfeito”) e autorizou preparar a próxima prévia. A POC agora abre em Dano de arma; o seletor superior permite voltar ao teste aprovado. Ambos permanecem montados e preservam os valores ao alternar, sem persistência ou integração à aplicação.

Primeiro recorte de dano: um conjunto de dados (quantidade e faces), tipo e segundo tipo, atributo opcional com sinal, proficiência/nível, bônus fixo, manter todos/maior/menor, dado extra, margem e repetição. Atributo e bônus seguem o tipo escolhido, informação explícita na tela. Fórmulas com múltiplos conjuntos, bônus com tipos independentes, atalhos e expressões não estão representadas nesta etapa; a POC avalia a organização dos controles e não promete paridade funcional completa com o produto.

Análogo mantido: montador Completo e os mesmos primitivos reais. O segundo tipo permanece no layout e fica desabilitado em Geral; a seleção Nenhum no atributo desabilita os sinais sem remover o grupo. Reutilizados `aplicarTipoPeca`, `alterarOpcoesDado`, `novaPecaFonte`, `novaPecaNumero`, `montarFormula`, `resumirFormula` e `rolarFormula`; o motor continua calculando e validando a fórmula.

Build isolado aprovado. Conferência Chromium em `1920×1080`, `1366×768`, `960×1080` e `360×800`: sem exceções nem overflow horizontal; rodapé dentro do viewport; seção Atributos e bônus não muda de posição ao escolher Geral; divisão meio a meio, atributo Nenhum, Desfazer, quantidade, faces, proficiência, rolagem, dado extra, margem e repetição exercitados. Alternância entre modelos mantém o dano editado e permite editar o teste. Restaurar retorna a 2d6 + FOR físico. Controles visíveis de dano conferidos em mobile: nenhum botão/select abaixo de 44×44px.

Inspeção pessoal de `dano-1920-inicial.png`, `dano-360-inicial.png` e `dano-360-opcoes.png`: mesma identidade, densidade e hierarquia do montador; campos agrupados e posições estáveis; opções inferiores acessíveis pelo scroll interno. Ajustados alinhamento dos pares de campos e altura mínima de selects mobile. Evidências locais em `.artifacts/montador-atributos-poc/`, inclusive `dano-verificacao.json`; não são incluídas no clone. Nenhum arquivo de frontend/backend/shared foi alterado. A prévia do dano aguarda avaliação do autor.

## Ajuste solicitado após a primeira prévia

Autor pediu os seletores de atributo antes do segmentado Só um/Soma/Média e, em Ajustes, a ordem Proficiência/Nível → dados a mais ou a menos → bônus fixo. Aplicado somente ao template da POC; opções Manter, margem de crítico e repetição preservadas. Build isolado aprovado novamente. Prévia aberta no navegador do autor foi recarregada e inspecionada, incluindo a alternância para Média. Refeita a inspeção em desktop e mobile: ordem correta, Desfazer/Restaurar e rolagem local funcionais, opções inferiores acessíveis por scroll e alvos móveis sem botões menores que 44×44px. Capturas locais `previa-desktop.png` e `previa-mobile.png` atualizadas. Aguarda confirmação do autor antes de iniciar o modelo de dano de arma.

## Estado e alcance

POC interativa em avaliação; task permanece ativa. Não houve integração ou mudança no código de `frontend/`, `backend/` ou `shared/`. O primeiro recorte foi o **teste de atributo**, motivado pelos deslocamentos ao alternar Só um/Soma/Média e aprovado visualmente pelo autor. A prévia de dano veio depois, conforme seção acima. Dados livres continuam fora do recorte.

Fonte da POC em `prototipo/`. Build separado com Angular instalado no monorepo, sem instalar dependências. Prévia local em `http://127.0.0.1:4315`. Saídas e capturas ficam em `.artifacts/montador-atributos-poc/`, ignoradas pelo Git e ausentes no clone. O servidor está na sessão local; o endereço não é uma publicação externa.

## Decisão visual

Análogo: montador Completo atual (`MontadorRolagem`, `MontadorEditorPecas`) e moldura `PainelFlutuante`. Reutilizados diretamente `PainelFlutuante`, `Campo`, `Segmentado`, `SegmentadoItem`, `StepInput`, `Botao`, `Cartao`, `Chip` e `Icone`, sem cópias de seus estilos. Tokens e base importados do tema runtime, com IBM Plex carregada e confirmada no navegador.

O bloco de atributos reúne combinação e dois seletores. O segundo seletor permanece visível e desabilitado em Só um, preserva a escolha nas alternâncias e exclui o primeiro atributo como opção válida. Uma linha com altura reservada resume a operação e o pool de dados. Ajustes e opções continuam visíveis no fluxo rolável; rodapé e fórmula permanecem fixos. A POC usa os auxiliares existentes `escreverTeste`, `montarFormula`, `contarDadosDoPool` e `rolarFormula`; não duplica regras nem grava resultados.

## Verificação executada

- Build Angular isolado: aprovado. Comando a partir de `prototipo/`: `node ../../../../../node_modules/@angular/cli/bin/ng.js build`.
- Organização e espelhos: `npm run repo:verificar`, aprovado.
- Navegador Chromium real sobre o build da POC, sem mocks de HTML: `1920×1080`, `1366×768`, `960×1080` e `360×800`.
- Nos quatro viewports: Só um → Soma → Média → Só um preserva a coordenada vertical da seção Ajustes; segundo seletor fica desabilitado em Só um; mudança do segundo atributo é preservada; sem overflow horizontal no documento ou no montador; rodapé dentro da viewport; nenhuma exceção de página.
- Desfazer restaura o modo anterior; Restaurar retorna ao exemplo inicial. Opções inferiores acessíveis por scroll no mobile; margem de crítico selecionável; Rolar mostra resultado local do motor.
- Inspeção pessoal das capturas desktop, mobile e mobile com opções inferiores. Mesmas superfícies, tipografia, densidade e controles do montador atual. Sem novos ícones ou cores. O conteúdo tem rolagem interna nas telas baixas, como no análogo; não é uma tentativa de comprimir todos os controles numa única tela.
- Correções encontradas durante a inspeção: título abreviado no mobile para evitar truncamento; receita local garante 44px de altura nos botões do rodapé e 44px de largura mínima nas opções de crítico. Conferência final: nenhum botão abaixo de 44×44px no mobile.

## Impacto e limites

`npm run impacto -- --simbolo Segmentado` levantou 16 consumidores e um teste. Não existe alteração no primitivo nem em qualquer consumidor existente; apenas uso genérico na POC. O mesmo vale para os demais componentes e auxiliares importados: nenhum contrato ou estilo compartilhado foi alterado. Não houve mudança de DTO, banco, WebSocket, regras ou persistência.

A verificação cobre a aplicação isolada da **POC**, não o stack do produto. Conforme a skill `verify`, observar a aplicação real continuará obrigatório se o autor aprovar uma implementação posterior. Não foram executadas suítes do produto porque não houve alteração em seu código. Aprovação da proposta e implementação no montador continuam pendentes.
