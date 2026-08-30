# Auditoria da Biblioteca Visual — UI-06

> Estado: **concluída** · responsável: Codex · 2026-08-30.
> Fonte de verdade: DESIGN.md, docs/design/tema/, shared/ui/, AGENTS.md e UI-01…UI-05.
> Este diagnóstico não autoriza refactor: cada correção ficou em sua spec filha.

## Método e limites

A leitura mecânica é reproduzível; ela seleciona candidatos e não substitui template, SCSS ou
navegador.

    Get-ChildItem frontend/src/app -Recurse -Filter '*.html' | ForEach-Object {
        $conteudo = Get-Content -Raw $_.FullName
        [PSCustomObject]@{
            Arquivo=$_.FullName
            Botao=([regex]::Matches($conteudo,'<button\b')).Count
            Campo=([regex]::Matches($conteudo,'<(input|select|textarea)\b')).Count
            BotaoUi=([regex]::Matches($conteudo,'\bapp-botao\b')).Count
            CampoUi=([regex]::Matches($conteudo,'\bapp-campo\b')).Count
            Cartao=([regex]::Matches($conteudo,'<app-cartao\b')).Count
            Stat=([regex]::Matches($conteudo,'<app-stat\b')).Count
            Stepper=([regex]::Matches($conteudo,'<app-step-input\b')).Count
            Chip=([regex]::Matches($conteudo,'<app-chip\b')).Count
            Modal=([regex]::Matches($conteudo,'<app-modal\b')).Count
            Abas=([regex]::Matches($conteudo,'<app-abas\b')).Count
            Tooltip=([regex]::Matches($conteudo,'\bappTooltip\b')).Count
            Inline=([regex]::Matches($conteudo,'\sstyle=')).Count
        }
    } | ConvertTo-Csv -NoTypeInformation

    rg -n --glob '*.scss' 'border-radius:\s*(2px|3px|4px|50%)' frontend/src/app
    rg -n --glob '*.html' 'style=' frontend/src/app
    rg -n -i 'primeng|primeuix|p-dialog|p-toast|MessageService' frontend package.json frontend/tailwind.config.ts
    rg -n --glob '*.scss' -P '^\s*\.(botao|campo|card|stat|stepper|chip-classificacao|abas)\s*[{,:]' frontend/src/app

Resultado: 68 templates, 719 botões, 28 links, 320 campos nativos, 165 app-botao, 93 app-campo,
42 cartões, 18 stats, 26 steppers, 3 chips, 15 modais, 1 app-abas, 224 tooltips e um estilo
inline. Os seletores-base dos primitivos existem somente em shared/ui/. Ocorrências aninhadas de
.botao nos guias são classes companheiras de dimensão, não cópias do bloco-base.

Falsos positivos: #000 em mask-image é máscara, não cor de tema; border-radius: 50% é geometria
de avatar/launcher; Milkdown/ProseMirror e PDF viewer são DOM de terceiro. Raios literais 2/3/4px
permanecem candidatos até UI-11 decidir token ou exceção.

## Contrato de decisão

1. Reutilizar primitivo quando mudar apenas conteúdo, severidade, estilo ou tamanho já suportado.
2. Evoluir primitivo quando comportamento/estado pertence ao controle e há dois consumidores reais.
3. Criar componente apenas para papel visual/interativo próprio.
4. CSS local só compõe domínio; não replica identidade de botão, campo, cartão ou stat.

## Matriz de primitives e acabamento

| Recorte | Veredito | Encaminhamento |
|---|---|---|
| Ações rotuladas e links de ação | CONFORME | app-botao preservado; ação de domínio local segue UI-09. |
| Campo rotulado | CONFORME | app-campo preserva controle projetado no rótulo; não virar CVA. |
| Cartão, stat, chip e stepper | CONFORME | 42/18/3/26 usos; stepper observado em hover/foco. Raios literais seguem UI-11. |
| Abas | EXCEÇÃO JUSTIFICADA | app-abas é tabpanel; a simulação usa navegação de rota, não tabpanel. |
| Modal | CORRIGIR | 32 composições dialogo__fundo/dialogo__fechar em oito templates: UI-07. |
| Ações somente por ícone | EVOLUIR PRIMITIVO | olhos, cópia, lápis, fechar e chrome recorrente: UI-08. |
| Ações locais de inventário e Loja/Vendas | CORRIGIR | famílias ficha-inv__btn, ficha-inv__mini-btn e compras-btn: UI-09. |
| Cor/fonte | CONFORME | fontes usam tokens; #000 é só máscara alfa. |
| Raio/forma | CORRIGIR | 2/3/4px fora dos tokens: UI-11; 0/50% somente forma estrutural. |
| Estilo inline | CORRIGIR | criar-criatura.page.html:450 é P-042 e UI-11. |
| API de UI removida | CONFORME | só comentário residual sobre PrimeNG no tailwind.config.ts: UI-11. |

## Matriz por módulo

| Módulo | Análogo/evidência | Veredito | Destino |
|---|---|---|---|
| autenticacao | login.html e cadastro.html; normal, foco e validação observados | CONFORME + EVOLUIR | UI-08 para olhos de senha. |
| acesso-negado | padrão de formulário/auth e retorno real nos dois viewports | CONFORME | UI-11 só para raio literal. |
| simulacao | calculadora-de-atributos; Agente, Novo Agente e Compras observados | CONFORME + EXCEÇÃO | Keypad é widget; Loja/Vendas: UI-09; raios: UI-11. |
| campanha | campanhas/lobby; lista, detalhe cheio, modal e mobile observados | CORRIGIR / EVOLUIR | UI-07, UI-08, UI-09 e UI-11. |
| encontro | iniciativa desktop/mobile; mestre, turno e conteúdo cheio observados | CORRIGIR / EVOLUIR | UI-07, UI-08 e UI-11. |
| ficha | fichas, guia e acervo; jogador, criatura e dois guias observados | CORRIGIR / EVOLUIR | UI-07, UI-08, UI-09, UI-11 e P-042. |
| pagina-caderno | utilitário flutuante; editor é DOM de terceiro | EXCEÇÃO / EVOLUIR | preservar editor; UI-08 e UI-11. |
| usuario | perfil.html; perfil preenchido observado | CONFORME + EVOLUIR | UI-08 para ações compactas e UI-11 para raios. |
| shared | layout, notificações, leitor, calculadora e bandejas em rotas reais | EXCEÇÃO / CORRIGIR / EVOLUIR | widget composto preservado; UI-07, UI-08 e UI-11. |

## Revisão visual ao vivo

Foram comparados os análogos login/cadastro, campanhas/lobby, fichas, guia, acervo, calculadora e
iniciativa de docs/design/examples/. Shell, densidade, hierarquia, controles e responsividade foram
inspecionados no cenário real: Postgres, backend e frontend locais, conta codex.dev.

Em 1920×1080 e 360×800 foram abertas login, registro, acesso-negado, simulação (agente/novo
agente/compras), campanhas (lista/detalhe), acervo, ficha de jogador, criatura, dois guias,
iniciativa e perfil. Estados observados: normal/carregado, foco/validação do login, hover/foco de
stepper, modal, conteúdo longo, vazio, rascunho e iniciativa ativa/encerrada.

Nenhuma rota teve overflow horizontal (scrollWidth === clientWidth). Não houve erro da aplicação;
a única falha foi Google Fonts remoto bloqueado pelo ambiente isolado
(net::ERR_NETWORK_ACCESS_DENIED), sem impacto sobre a fonte renderizada. Voz visual, densidade,
controles/ícones, ausência de HTML genérico, corte/overflow, foco, contraste e alvo móvel foram
aprovados. As capturas da sessão são ui06-*.png.

## Fila priorizada

| Prioridade | Achado | Destino |
|---|---|---|
| P1 | Overlays/diálogos locais duplicam app-modal | UI-07 |
| P1 | Ações icon-only repetem identidade fora da biblioteca | UI-08 |
| P1 | Inventário e Loja/Vendas exigem classificação de domínio | UI-09 |
| P1 | Margem inline em criar criatura | P-042 e UI-11 |
| P2 | Raios 2/3/4px e comentário residual PrimeNG | UI-11 |
