# Verificação — janela flutuante de Regras

## Resultado e comparação visual pessoal

Prévia aprovada implementada: Sumário e Sistema/Guia alinhados com respiro;
campo “Pesquisar no livro…” em linha própria. Campo, Botao, BotaoIcone e Segmentado
canônicos, sem ampliar primitivos. Pesquisa/destaques/contador e lista no sumário
continuam no controller existente; não há campo duplicado na gaveta compacta.

Alça e moldura seguem o Caderno. Arraste confinado à área livre, mínimo 360×360
subordinado ao viewport, captura/cancelamento do ponteiro. Tamanho normal preservado
ao maximizar/restaurar; celular continua folha cheia. A revisão identificou um limite
antigo ao reduzir o viewport durante a maximização: teste vermelho reproduziu a
restauração fora da tela; a casca agora confina também essa posição.

Agente principal observou pessoalmente Angular/Nest/Postgres reais em **1920×1080,
1366×768, 960×1080 e 360×800**. Conferidos: painel inicial, Sistema/Guia carregados,
sumário, busca “Fundação”, Enter para próxima ocorrência, Escape limpando sem fechar,
ausência de resultados, fechamento e página completa. Nos três desktops: 760×680 →
620×580 por arraste, maximização e restauração exata a 620×580. No mobile: sem alça
ou maximização; campo com altura 44px e fonte 16px, medidos após ajuste visual.
Reduzindo a tela de 1920×1080 para 800×700 enquanto maximizado, restaurou em
x=40/y=52, 760×648, inteiramente na tela.

Comparação pessoal com prévia aprovada e Caderno: mesma identidade, densidade e
hierarquia; controles/ícones canônicos, foco visível e sem overflow horizontal.
Página e Oficina mantêm os defaults, cobertos também pelos testes do leitor.
Não houve nova responsabilidade de domínio: geometria permanece na casca.

Capturas/JSONs/roteiros em `.artifacts/regras-flutuante-layout-e-redimensionamento/`
são evidência **local e ignorada**, ausente do clone.

## Gates e limites

| Gate | Resultado |
|---|---|
| Focados finais das duas tasks | 4 arquivos, **52/52** |
| Suíte frontend, antes dos últimos ajustes de apresentação/posição | 290 arquivos, **3608** testes; normalizadores **89/89** |
| Shared | 77 arquivos, **1340** testes |
| Backend | **1339** aprovados, **100** pulados; quatro HTTP inicialmente impedidos de conectar passaram na repetição autorizada |
| Lint integrado dos três workspaces e frontend final | **zero erros**; avisos antigos de convenções, linha longa nova corrigida |
| Build produção final | aprovado; aviso conhecido de budget inicial, 603,33kB contra 450kB |
| Prettier dos HTML/SCSS e diff | aprovados |

Testes Angular usaram TEMP/TMP em `.artifacts/` após EPERM no temporário restrito.
Build usou `CI=true` e dois workers (contorno documentado do cache); a primeira
tentativa não obteve Google Fonts e a repetição autorizada passou. Nenhuma
configuração do produto foi alterada para esses contornos.

Revisão manual e independente contra spec/convenções/mapa de impacto: sem nova
regressão, DTO/enum, regra duplicada ou hardcode visual. Depois do achado de posição,
teste focado e inspeção real confirmaram a correção. `npm run repo:verificar`
aprovou organização/espelhos e `npm run repo:test` passou 14/14, após liberar o
Git temporário do teste. Sem commit ou deploy; sem pendência obrigatória deste recorte.
