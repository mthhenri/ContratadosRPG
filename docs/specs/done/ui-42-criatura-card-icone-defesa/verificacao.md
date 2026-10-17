# UI-42 — verificação em 2026-10-17

O card da criatura na campanha do mestre agora usa `app-icone nome="defesa"`,
classes `icone--texto icone--defesa` e `appTooltip="Defesa"`, exatamente como o
análogo aprovado `EspectadorFichaCard`. Nenhuma outra reação ou glifo foi acrescentado.

Impacto: `npm run impacto -- --icone defesa` listou 22 referências produtivas e
sete testes. O glifo não foi alterado: só há um consumidor novo, no mesmo sentido
de domínio. Conferidos `criatura-visualizacao` (já tem o ícone), ficha flutuante
(reutiliza essa visualização) e encontro (`iconeDefesa`, já cobre a Defesa).
Nenhuma extensão adicional foi necessária ou aplicada; VD/Tenacidade ficam fora.

Teste do componente confirma glifo e classes, preservando a condição de renderizar
somente quando há Defesa. Nove testes do card passaram na rodada focada; suíte
integrada com UI-40: 3.494 testes frontend mais 89 do normalizador passaram.
Build passou; lint sem erros, avisos antigos preservados. Prettier, revisão do
diff e `npm run repo:verificar` passaram. Logs compartilhados da integração têm
como proprietário a UI-40: `.artifacts/ui-40-preview-avatar-investigacao-mestre/`.

Aplicação real com `verify`: **1920×1080** e **360×800**, campanha do mestre com
agente e criatura. Inspeção pessoal das capturas dos dois cards lado a lado:
mesmo glifo, alinhamento e tamanho, junto a `Def` e ao valor. Densidade, hierarquia,
cores, controles e estados preservados; sem overflow horizontal. Nenhum controle
novo ou estilo local foi criado. Capturas próprias em
`.artifacts/ui-42-criatura-card-icone-defesa/` (locais, ignoradas pelo Git).

Achado preexistente fora do escopo: abas não selecionadas da campanha perdem nome
acessível no mobile quando o texto é oculto; registrado como P-129, sem corrigir
o primitivo nesta tarefa. UI-42 concluída; sem commit/deploy.
