# Verificação — adoção de VD e Tenacidade

Data: 2026-10-20. Glifos votados em 18/10 (**VD A — Patamares de nível**, **Tenacidade B — Coração reforçado**,
rodada 2), alcance aprovado em todos os locais, card do mestre mantido como está.

## O que foi entregue

- `app-icone`: `valor-desafio` e `tenacidade` (`IconeNome` + `@case`), desenhos originais Codex (OpenAI), crédito no
  comentário do componente; `icone.component.spec.ts` cobre os dois nomes (contorno, distintos de Vida/Defesa/Patente/DT).
- Adoção com `appTooltip` ("Valor de Desafio", "Tenacidade"), texto preservado:
  `criatura-visualizacao` (VD e Tenacidade; a página `visualizar-criatura` e a ficha flutuante reutilizam o componente),
  `criar-criatura` (rótulos dos campos e os dois resumos), `cartao-ficha-acervo` (linha "NA … · VD …") e o seletor de
  combatentes (`metaAmeaca` + ícone do VD; o texto "Ameaça · Média · VD 37" não muda). `criatura-esquadrao-card` intacto.

## Verificado

- Testes: suíte do frontend inteira verde (3579); ESLint do frontend sem erro; `repo:verificar` ok.
- Ao vivo (Playwright, app real, dados descartáveis): criatura em `1920×1080` e `360×800` — VD, Defesa e Tenacidade lado
  a lado, os dois glifos novos legíveis e distintos do escudo de Defesa; Acervo com a criatura "NA Média · VD 30"; tema
  escuro e **claro** (criatura). Sem overflow horizontal nem erro de console.

## Limites

- Sem captura ao vivo do seletor de combatentes, do formulário/resumos de `criar-criatura` e da janela flutuante
  (mesmos componentes e mesmo padrão `icone--texto`, cobertos por teste de componente).
