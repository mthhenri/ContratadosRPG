# Verificação — regras-visual-06 (notas e formações em texto contínuo)

## Decisão do autor

O dado vive no banco e chegou **achatado** da exportação do Docs (o Markdown de origem já tem as três passagens numa célula só).
Só parte das fronteiras é demonstrável; o autor decidiu (15/10/2026): **código só para o demonstrável** e inventário editorial
para o resto, a aplicar na Oficina pelo próprio autor.

## Entregue (só leitura; a Oficina segue com o campo único editável)

- **Formação** (`regras-origens`): `separarBonusDeFormacao` parte o texto em cada `+N` precedido de espaço, sem partir depois de
  "e"/"ou"/vírgula/dois-pontos; vira lista de um bônus por linha. Bombeiro: `+3 de resistência a dano Químico` / `+1 dado em testes
  de Vigor`. Alpinista: `+1m de Deslocamento` / `+1 dado em ambos os testes de Corrida`. Um bônus só segue texto corrido.
- **Amaldiçoado pelo Passado** (`regras-nota`): `estruturarNotaComMarcadores` reconhece a nota com dois ou mais `▢` no mesmo trecho
  de texto: introdução (descrição + "Você recebe:"), um item por `▢` (marcador do próprio livro, `aria-hidden`), e a ressalva da
  Peculiaridade como parágrafo associado ao conjunto. Nenhuma palavra foi alterada ou removida. As demais notas, e as com campo
  diferente de `trechos` (nota de Modificações), não mudam.
- As funções são puras, em `regras-texto.ts`, sem regra de domínio no renderer; nenhum dado nem normalizador alterado.

## Pendências editoriais (não resolvidas por código)

1. **Título × descrição de Amaldiçoado pelo Passado.** O texto é um único itálico: `⬦ Amaldiçoado pelo Passado Você é a sucessão
   de uma besta…`. Não há delimitador entre o nome da condição e a descrição. Edição proposta na Oficina: quebra de linha (ou peça
   própria de título) depois de `Amaldiçoado pelo Passado`.
2. **Nota de Armazenamento** (Equipamentos → Armazenamento → Modificações): `Estas modificações não agregam nenhum peso ao item
   Modificações de Armazenamento custam 300 $ ao invés do valor padrão`. As duas afirmações estão coladas sem pontuação (o limite
   provável é depois de "item"). Edição proposta: inserir ponto final (ou quebra) ali — texto e custo ficam como estão.

## Testes

- Funções puras (`regras-texto.spec`): separação da Formação das duas origens, não partir "e/ou/vírgula", preservar negrito;
  estrutura da nota com os três itens e a ressalva, e `null` fora do padrão.
- Componentes: Origens (itens separados; bônus único sem lista) e Nota (lista e ressalva; nota comum inalterada).
- `ng test` Regras 313/313; `eslint` dos blocos limpo; `tsc` do app limpo.

## Ao vivo (Sistema, app real)

1920×1080, 1366×768, 960×1080 e 360×800: os dois cartões exibem os dois bônus em itens separados; a nota mostra introdução, três
itens `▢` e a ressalva; sem overflow de página nem de caixa (cartões 442/265/286px de largura útil; nota 915/560/301px). A pesquisa
`Traumas Suportados` destaca dentro do item novo e navega à nota.

## Limites

- Painel flutuante (normal e maximizado) e base clara não foram observados à parte; os componentes são os mesmos da página.
- Capturas de tela do painel do navegador saíram corrompidas: verificação por DOM e geometria; a comparação com o análogo
  (cartões de Origem, listas do leitor) foi estrutural.
- O texto copiado do item sai como `▢+1 dado…` (o espaço entre marcador e texto é só visual, via `gap`).
- Os dois itens editoriais acima continuam como estavam na tela até o autor editar o livro.
