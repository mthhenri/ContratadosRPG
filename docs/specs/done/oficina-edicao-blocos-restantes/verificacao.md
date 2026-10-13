# Verificação — oficina-edicao-blocos-restantes (fatias 1 a 5; fechada)

> Relatório textual de [`oficina-edicao-blocos-restantes.spec.md`](../oficina-edicao-blocos-restantes.spec.md). Capturas
> locais em `.artifacts/oficina-edicao-blocos-restantes/` (ignoradas pelo Git); este texto não depende delas.
> **Tarefa concluída.** A verificação ao vivo das fatias 3 e 5 e a reauditoria (fatia 6) estão em [`reauditoria.md`](reauditoria.md).

## O que foi entregue

- **Abertura** (`regras-abertura.component.ts`): com a peça, título e selo da capa viram campo de texto simples
  (selo opcional: esvaziado, some do `dados`) e o corpo é **um** campo sobre os `trechos` originais — o itálico externo,
  as pausas (`\n\n`), negritos e tarjas voltam intactos. Novo `[quebras]` em `OficinaTexto`: Enter grava uma linha em
  branco, Shift+Enter uma quebra simples (sem criar peça); as quebras do fim são aparadas
  (`apararQuebrasFinais`), porque o navegador mantém uma quebra "de enchimento" depois do cursor. Na edição o itálico
  externo não aparece no desenho (continua no dado). Fora da Oficina o desenho não mudou.
- **Módulos** (`regras-modulos.component.*`): nível em `app-oficina-texto` (`["modulos", i, "nivel"]`), Energia Máxima em
  `app-step-input` `mini` (`["modulos", i, "energiaMaxima"]`, mínimo 0, recusa fracionário/negativo), com o bloco
  selecionado "Remover módulo" (`app-botao-icone` perigo) e "+ Módulo" (`app-botao` secundário contorno pequeno), que
  pede o foco no nível novo. No celular, em edição, a grade passa a 2 colunas.
- **Genérico** (`regras-generico.component.*`): `trechos` editáveis no lugar; o `motivo` aparece como nota somente leitura.
- **Validador** (`validar-arvore-livro.ts`): `ABERTURA` pede título e texto; `MODULOS` pede nível preenchido e Energia Máxima
  inteira ≥ 0 (pendências de conteúdo, impedem só publicar versão).

## Testes e lint (2026-10-13)

- `shared`: 75 arquivos, 1273 testes (3 novos: abertura/módulos completos, abertura sem título/texto, módulo sem nível e
  Energia Máxima −1 / 1,5 / "2"). Lint: 0 erros.
- `frontend`: 269 arquivos, 3438 testes (novos: abertura na Oficina, módulos na Oficina — campos, stepper, adicionar,
  remover —, genérico, ida e volta da abertura pela ponte DOM↔trechos, `apararQuebrasFinais`, Enter/Shift+Enter com
  `quebras`). Lint: 0 erros (warnings preexistentes).
- `backend` filtrado em `livro`: 99 passaram, 11 ignorados (já ignorados antes).

## Ao vivo (Oficina real, Sistema, ADMIN de teste; rascunho conferido pela API)

Análogo: o próprio bloco no leitor e `RegrasFaixasRender`/`RegrasLista` (padrão de edição). `1920×1080` e `360×800`.

- Abertura: três campos (`titulo`, `trechos`, `selo`) com a peça selecionada; digitar no fim do corpo e Enter
  gravou `…prioridade.XYZ\n\nNovo paragrafo` dentro do mesmo itálico, sem lixo no fim; `selo` e título intactos. Sem overflow
  horizontal nos dois viewports.
- Módulos: nível e stepper por cartão, "Remover módulo" (26×26 no desktop, 44×44 no celular) e "+ Módulo" (92×35);
  "+ Módulo" criou `{nivel:"", energiaMaxima:0}` no banco, o foco foi para `modulos.5.nivel`; digitar "VI" e sair gravou;
  remover pelo botão voltou a 5 módulos. Fora da Oficina: 0 controles no bloco.
- Os dados de teste foram restaurados pela API (abertura e módulos conferidos iguais ao original) e o usuário de teste foi
  desativado.

## Achados da verificação

- No celular os cinco cartões não cabem com os botões de passo de 44 px (a captura mostrava o stepper por cima dos vizinhos):
  em edição a grade passa a 2 colunas e o "−" decorativo some.
- O Enter com `quebras` gravava uma só quebra: o Chrome põe o cursor antes de uma quebra final num campo `pre-wrap`; um
  `​` depois da quebra inserida resolve, e as quebras finais são aparadas na entrega.
- Clicar no centro do primeiro cartão de Módulos acerta o "−" do stepper e altera a Energia Máxima: a verificação mudou V de
  3 para 2 sem querer; restaurado. (O controle é só do bloco selecionado, igual aos demais steppers.)

## Limites (o que ficou aberto)

- Nenhum bloco `GENERICO` existe nos livros: a edição do Genérico só foi exercitada em teste de componente.
- Cenário de pendência (módulo sem nível, abertura sem texto) só em teste de validador; ao vivo a pendência "Há um
  módulo sem nível" não foi conferida na barra.
- Tema claro e estados de erro de salvamento não foram exercitados; Guia só pela mesma peça `ABERTURA` (não aberto).
- Fatias 3 (níveis de ameaça), 5 (campos estruturais) e 6 (reauditoria) pendentes; a 3 espera a resposta sobre
  `referenciaImagem`.

## Segunda rodada — fatias 3 e 5 (2026-10-13)

Decisões do autor: `referenciaImagem` é **identificador interno** (valor da importação, ex.: `image1`, nunca desenhado) e a
fatia 5 vale como está na spec.

- **Níveis de ameaça** (`regras-niveis-ameaca.component.*`): na Oficina cada cartão ganha um `app-step-input` 0–7 para o
  número (o selo `NA n` acompanha), "Remover nível de ameaça" e "+ Nível" com o bloco selecionado (nasce com o menor número
  livre, descrição vazia e imagem vazia; desabilitado com os oito em uso). A `referenciaImagem` não é campo: a edição a
  preserva. Validador: nível fora de 0–7/fracionário e nível repetido são pendências de conteúdo.
- **Fatia 5 — propriedades estruturais.** Um componente único, `app-oficina-propriedades` (faixa sob a peça selecionada;
  descritores puros em `oficina-propriedades.ts`): `SECAO` nível 1–4 e glifo; `HABILIDADE` glifo, "Geral melhorada" (só em
  arquétipo) e "Habilidade inicial" (move a marca: a projeção do livro exige exatamente uma por arquétipo/subclasse); `TERMOS`
  variante; `GRADE` saúde↔cartões; `TABELA` em pares (só com quatro colunas); `LISTA` marcadores/numerada e número inicial,
  na raiz e nas sublistas, mais "+ Sublista" por item e "Remover sublista"; item de grade de saúde: título, nota e
  Vida/Energia; `FICHA_CRIATURA` nome dos campos de identidade (menos "Conceito", que o cabeçalho procura por nome) e nome
  dos atributos.
- **Já editável antes:** `EQUIPAMENTO.danos[].rotulo` (a etiqueta de dano já se troca desde a `m11-08`).
- **Decisões (não editar):** `GRADE.colunas` das grades de saúde/cartões não tem efeito no desenho (grade fixa em 2), e a da
  grade genérica já acompanha a tabela (`alterarMatriz`); a grade genérica não vira saúde/cartões (converteria células em itens).
- **Validador** (`conferirPropriedades`): uma só habilidade inicial por arquétipo/subclasse (estrutural), glifo de seção e
  habilidade, variante de termos e início de lista inteiro ≥ 0. Fixtures antigas sem habilidade inicial foram corrigidas.
- **Barra de seleção da peça** (pedido do autor): a barra vermelha era um `box-shadow` com spread negativo (encurtava nas pontas
  e colava no texto); agora é um `::before` de altura total, a 12 px do texto (8 px no celular).
- **Defeito achado nos testes:** o `$index` dentro do `@for` interno de recursos da grade de saúde era o do laço interno.
- Testes: `shared` 1276, `frontend` 270 arquivos (todos verdes; novos: propriedades, níveis, lista/sublista, saúde, identidade),
  `backend` filtrado em `livro` 99. Lint: 0 erros novos (2 erros `no-irregular-whitespace` preexistentes em
  `core/interceptors/error-handler.interceptor.ts`).

### Limites desta rodada

- O gate ao vivo das fatias 3 e 5 foi feito depois, com um usuário ADMIN de teste na base de desenvolvimento: ver
  [`reauditoria.md`](reauditoria.md). Tema claro e `GENERICO` real (não existe nos livros) seguem sem exercício ao vivo.
