# Auditoria da Biblioteca Visual — UI-06

> Estado: **em andamento** · responsável: Codex · início: 2026-08-30.
> Fonte de verdade: `DESIGN.md`, `docs/design/tema/`, `shared/ui/`, `AGENTS.md` e as specs
> `ui-01`…`ui-05` concluídas. Este arquivo é a matriz de evidências da UI-06; ele não substitui
> uma spec de correção nem autoriza um refactor fora do recorte dela.

## Método e limites

O inventário foi executado sobre 68 templates e 74 arquivos SCSS de `frontend/src/app/`.
Ele encontrou 719 elementos `<button>` em 200 classes-família, dos quais 155 já usam
`app-botao`. A diferença não é tratada como falha automática: uma tecla de calculadora, um
controle interno do `app-step-input`, uma aba, um botão de fundo de diálogo e uma ação de domínio
não possuem necessariamente a mesma semântica nem a mesma apresentação.

As buscas abaixo são reproduzíveis e servem apenas para selecionar candidatos. O veredito depende
da leitura de template/SCSS e da observação no app:

```powershell
rg -n -i 'primeng|primeuix|p-dialog|messageservice|p-toast' frontend/src/app frontend/package.json
rg -l '^\s*\.(botao|campo|card|stat|stepper|chip-classificacao|abas)\s*[,{]' frontend/src/app --glob '*.scss'
rg -n 'title=|style=' frontend/src/app --glob '*.html'
rg -n 'dialogo__fundo|dialogo__fechar' frontend/src/app --glob '*.html'
```

Resultado da base: não há referência a PrimeNG/API removida nem `title` nativo; as fontes usam
`var(--font-mono)` ou `var(--font-sans)`. Os 84 resultados de hex são `#000` em `mask-image` de
`appOverflowFade`: preto é a máscara alfa da imagem, não uma cor renderizada, portanto é
**EXCEÇÃO JUSTIFICADA**. Há um `style="margin-top: 16px"` real, registrado em `P-042`.

## Matriz de primitives e acabamento

| Recorte | Evidência atual | Veredito | Encaminhamento |
|---|---|---|---|
| Ações rotuladas | 155 usos de `app-botao`; login, campanhas vazias e ações primárias observadas ao vivo | CONFORME no recorte observado | manter; a adoção dos botões locais restantes é `ui-09` |
| Campo rotulado | `app-campo` em autenticação e formulários; controle projetado permanece filho direto do rótulo | CONFORME no recorte observado | preservar contrato; não converter em CVA |
| Cartão/stat/chip | 42/18/3 ocorrências dos componentes próprios; campanhas e simulação usam os padrões | CONFORME no recorte observado | revisar módulos ainda não percorridos ao vivo |
| Stepper | 26 ocorrências de `app-step-input`; simulação Agente validada em desktop/mobile | CONFORME | controles de valor derivado e compactos permanecem exceções documentadas (`I-025`/`I-026`) |
| Abas | `app-abas` é usado para troca de painel; navegação por rota da simulação não é tabpanel | EXCEÇÃO JUSTIFICADA | não trocar navegação por rota por abas ARIA |
| Modal | 32 ocorrências de `dialogo__fundo`/`dialogo__fechar` em oito templates ainda compõem overlay próprio | CORRIGIR | `ui-07-adocao-modal-nativo.spec.md` |
| Ações somente por ícone | olhos de senha, cópia, lápis, fechar e controles compactos repetem identidade local | EVOLUIR PRIMITIVO | `ui-08-primitivo-botao-icone.spec.md` |
| Botões de ação locais | famílias `ficha-inv__btn` (36), `ficha-inv__mini-btn` (19), `compras-btn` (20) e similares ainda desenham ações fora da biblioteca | CORRIGIR | `ui-09-adocao-botoes-dominio.spec.md` |
| Tokens de cor/fonte | nenhuma fonte fora dos dois tokens; `#000` só em máscara alfa | CONFORME com exceção documentada | manter a busca como detector de regressão |
| Raio/forma | há `3px`, `0` e `50%` além dos tokens; `0`/`50%` são formas estruturais, mas os `3px` precisam de classificação por papel | PENDENTE | concluir leitura por módulo antes de criar token ou corrigir |
| Estilo inline | `criar-criatura.page.html:450` fixa `margin-top: 16px` | CORRIGIR | `P-042`; não corrigir dentro da UI-06 |

## Matriz por módulo

| Módulo | Análogo e evidência | Veredito atual | Próximo recorte |
|---|---|---|---|
| `autenticacao` | `login.html`/`cadastro.html`; Login observado em 1920×1080 e 360×800, sem overflow | CONFORME + EVOLUIR PRIMITIVO | migrar os três controles de visibilidade de senha para o botão de ícone |
| `acesso-negado` | padrão de formulário/auth e ação rotulada canônica | CONFORME estático | revisar foco e retorno em execução |
| `campanha` | `campanhas.html`/`lobby-de-campanha.html`; lista vazia observada nos dois viewports, sem overflow | CORRIGIR | migrar os diálogos próprios e o controle de copiar; revisar detalhe cheio |
| `encontro` | `iniciativa-desktop.html`/`iniciativa-mobile.html` | CORRIGIR | migrar diálogo de rolagem avulsa; revisar mestre/jogador e estados de combate |
| `ficha` | `ficha-de-jogador.html`, guia e mockup de criatura | CORRIGIR | migrar diálogos; separar ações de domínio, stats editáveis e steppers derivados |
| `pagina-caderno` | padrão de utilitário flutuante; Milkdown é DOM de terceiro | EXCEÇÃO JUSTIFICADA + EVOLUIR PRIMITIVO | preservar editor de terceiro; migrar ações compactas reutilizáveis |
| `simulacao` | `calculadora-de-atributos.html`; Agente observado em 1920×1080 e 360×800, sem overflow | CONFORME parcial + CORRIGIR | manter keypad como controle próprio; adotar ação canônica na Loja/Vendas |
| `usuario` | `perfil.html` | PENDENTE | revisar perfil e gestão (vazio, erro, desabilitado e modal) |
| `shared/` | Layout, notificação, leitor, calculadora e bandejas | CONFORME parcial + EVOLUIR PRIMITIVO | revisar controles de ferramenta e fechar a API de ícone |

## Evidência ao vivo já coletada

| Tela/estado | Análogo | Viewports | Resultado |
|---|---|---|---|
| Login inicial | `examples/login.html` | 1920×1080; 360×800 | hierarquia, densidade, fonte mono/sans, campos e botão canônico coerentes; sem overflow |
| Campanhas vazio, sessão recém-criada | `examples/campanhas.html` | 1920×1080; 360×800 | `app-cartao`, ações primária/secundária e estado vazio coerentes; sem overflow |
| Criar campanha aberto | `lobby-de-campanha.html` + modal canônico | 1920×1080; 360×800 | visualmente íntegro e sem overflow, mas `document.querySelectorAll('dialog')` retornou 0: é overlay próprio, achado que confirma `ui-07` |
| Simulação — Agente inicial | `examples/calculadora-de-atributos.html` | 1920×1080; 360×800 | card, stepper, estatísticas, navegação de rotas e colapso mobile coerentes; sem overflow |

Ainda faltam as telas autenticadas cheias, modal aberto, foco, erro, desabilitado, conteúdo longo e
os fluxos de campanha, encontro, ficha, caderno e usuário. Por isso a UI-06 permanece em `active`;
esta matriz não declara o frontend aprovado por inteiro.

## Regras de decisão aplicadas

- `app-botao` permanece para ação rotulada e link de ação; não é usado para keypad, stepper,
  tab, botão de fundo ou controle de edição de domínio sem analisar a semântica.
- Uma ação compacta só de ícone tem consumidores suficientes e estados comuns (tooltip, rótulo
  acessível, foco, desabilitado e alvo de toque) para ser um primitivo novo; isso é `ui-08`.
- Um diálogo de aplicação não é uma exceção visual: a existência de `app-modal` torna backdrop e
  fechar locais uma divergência, corrigida por `ui-07`.
- Regras de domínio compostas — quantidade de compra, atributo derivado, rolagem ou edição inline
  — não são forçadas no `app-stat`/`app-step-input`; permanecem classificadas até a spec correta
  (`I-025`, `I-026` ou `ui-09`) delimitar a API.
