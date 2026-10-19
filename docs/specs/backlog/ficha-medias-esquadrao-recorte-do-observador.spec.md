# ficha-medias-esquadrao-recorte-do-observador.spec.md

> D-02: decisão do autor em 19/10/2026, esclarecida como recorte por observador.

## Objetivo

Calcular quantidade e médias do novo agente somente sobre as fichas que o
observador pode ver, preservando os direitos diferentes de dono e mestre.

## Entregáveis

1. Alinhar a regra publicada pela Oficina: explicitar que o conjunto de
   agentes considerado depende do recorte de visibilidade do observador.
   Publicar e exportar com `regras:exportar`; nunca editar `docs/core` à mão.
   Sem esse alinhamento, não fechar implementação contra a regra do livro.
2. Usar o mesmo recorte autorizado de fichas de jogador na campanha para o
   agregado; service arbitra observador e repository só executa SQL. Não é
   simplesmente `oculta=false` global: a própria oculta continua visível ao
   dono e mestre vê todas, conforme a resposta adicional do autor.
3. Aplicar a quantidade/média personalizada a `medias-esquadrao` e aos
   consumidores de Novo Agente/guia de criação. Prévia, se consultar o agregado,
   usa alvo, sem ampliar o conjunto por quem requisita. Preservar arredondamento,
   redução e demais fórmulas não alteradas pelo autor; regra pura em `shared/`.
4. Cobrir conjunto vazio, sem oculta, oculta própria, oculta alheia com concessão
   suspensa, mestre, criatura/NPC fora da média e usuário sem permissão. Sem
   ampliar o acesso do espectador para calcular agentes.
5. Registrar testes, consumidores medidos com `impacto`, execução real e
   comparação dos valores da API com os apresentados no guia; anexos em §3.1.

## Critérios de Aceite

- A nível 10 oculta e B nível 2 visível na mesma campanha: B recebe quantidade
  1/média 2; dono A e mestre recebem quantidade 2/média 6. Concessão suspensa
  não permite incluir A na média de B. Exibir A recompõe a média de B.
- Caso sem fichas no recorte não infere a quantidade oculta e preserva o
  tratamento canônico de primeiro agente. Nome/id de ficha oculta não trafega.
- A cópia gerada do livro acompanha a política aprovada; testes focados do
  recorte e do motor, `verify` no guia em 1920×1080/360×800, build/lint e
  `repo:verificar` proporcionais aprovados.

## Fora de Escopo

Alterar progressão/fórmulas de nível ou prestígio, corrigir Civil, alterar
concessões, usar o conjunto real escondendo só o número apresentado, ou excluir
globalmente ocultas inclusive para dono/mestre.

## Dependências

- [D-02 e evidência da média atual](../done/auditoria-ficha-oculta-retomada-cobertura/verificacao.md).
- Livro publicado, **Iniciando um Novo Agente**, cópia atual em
  `docs/core/sistema-v4.1.4.md`; `docs/SYSTEM.SPEC.md` §1.1/14.
- Alinhamento/publicação do livro é pré-requisito de implementação, não
  autorização para editar dados de produção durante esta auditoria.
- Skills `regras-do-jogo`, `gerenciamento-de-impacto`, `sql-migrations` se
  alterar consulta, `dto-conventions` se alterar contrato, `verify`.
