# RV-03 — Verificação

## Referência e decisão antes da alteração

Análogos: níveis curtos das próprias tabelas de NA, referência rica de ameaça e
ficha de exemplo A Estátua. Mantidos shell do leitor, densidade, hierarquia,
padding de células, indicador IBM Plex Mono, ícone Contratados, cores/fundos,
tooltip, foco e rolagem local. Nenhum controle ou variante novo.

Reprodução pessoal no app real, 360×800: primeira coluna de 120px com padding
horizontal de 24px. Catastrófica/Apocalíptica ultrapassavam sua área útil e o ícone
perdia largura na composição. Ajuste no layout da tabela: coluna mínima
de 160px (oito unidades do token space-20) quando houver app-regras-ameaca na
primeira coluna. No mobile a coluna continua fixa. Demais tabelas conservam
coluna fixa de 120px e mínimo de 160px nas colunas seguintes.

Durante a inspeção, ampliar apenas a coluna fixa deixava parte da última coluna
inacessível: coluna de dados de 160px excedia o restante do viewport. Nas duas
tabelas afetadas, cada coluna seguinte passou a usar a largura disponível menos
160px; no fim da rolagem a última coluna fica integralmente à direita da fixa.
A tela dividida também revelou compressão dos indicadores pela tabela automática;
o mínimo de 160px na primeira coluna vale em todas as larguras.

Primitivo, contrato, normalização, fontes e textos preservados. Não há alteração
de semântica/renderização que exija teste novo; o defeito depende do layout real.

## Matriz visual — skill verify

Aplicação real em localhost:4300, navegador integrado Chromium. Inspeção pessoal
das duas tabelas e dos sete níveis, em 22 configurações:

| Viewport | Página | Painel normal | Painel maximizado | Bases |
|---|---|---|---|---|
| 1920×1080 | aprovado | aprovado | aprovado | clara/escura |
| 1366×768 | aprovado | aprovado | aprovado | clara/escura |
| 960×1080 | aprovado | aprovado | aprovado | clara/escura |
| 360×800 | aprovado | aprovado | não disponível | clara/escura |

Nos desktops todas as colunas cabem; no mobile percorridos início, meio e fim.
Busca pelos termos Catastrófica e Apocalíptica exercitada nas duas tabelas,
página/painel, duas bases: 48 estados adicionais medidos e capturados. Na página
NA: scrollLeft 0/119/238; VD: 0/69/137. No painel NA: 0/120/240; VD: 0/69/138.
Última coluna integralmente acessível no fim, rótulo e conteúdo interno dentro
da célula em todos esses estados. Catastrófica/Apocalíptica: 133,41px, ícone
23px, área útil de 136px na coluna de 160px. Texto/destaque não alteram essa largura.
Escala consultável por inteiro no meio da tabela de NA; VD/nível alvo consultáveis.

Comparação: mesma identidade, densidade dos indicadores, hierarquia e controles
dos análogos. Dados longos ganham mais linhas no celular para permanecerem
consultáveis. Fundos contrastantes de Extrema/Catastrófica e fundo escuro de
Apocalíptica preservados nas duas bases. A Estátua/NA 3 mantém a mesma marca e
dimensões; tabelas sem NA na primeira coluna conservam 120px no mobile.
Foco por teclado do indicador Nula observado, outline de 2px na cor do tema;
controles do shell preservados. Sem overflow da página ou invasão das células
pelos indicadores. Rolagem vertical permite percorrer tabelas mais altas.

Evidências locais em `.artifacts/regras-visual-03-rotulos-ameaca-tabelas/`:
capturas `<base>-<modo>-<largura>-<tabela>-<posição>.png`, buscas
`<base>[-painel]-busca-<termo>-final*.png/json`, `resultado-mobile.png` e logs.
Tabela 0 = referência de NA; tabela 1 = VD típico. Capturas iniciais anteriores
às correções de inspeção não constituem aprovação; os JSONs `*-final.json`
registram a composição final e o acesso à última coluna.

## Achado fora do escopo

P-124 registrado em PROBLEMS.md: destaque **não selecionado** de Catastrófica
na base escura assume o texto claro global sobre fundo claro; Apocalíptica na
base clara assume texto escuro sobre fundo escuro. O estilo preexistente de
`regras-leitor.component.scss` aplica `--text` a qualquer marca de pesquisa.
Marca selecionada permanece legível e navegar até a ocorrência ou limpar a
busca contorna o problema. Não é corte/overflow nem regressão de largura;
contraste da busca permanece aberto, sem alteração oportunista nesta spec.

## Gates e revisão

- `npm run test --workspace=frontend -- --watch=false`: 86 testes de scripts e
  3216 Angular, 243 arquivos, aprovados. Mensagens jsdom de navegação não
  implementada permanecem preexistentes, sem teste falho.
- `npm run build --workspace=frontend`: aprovado após ajustes finais; JSONs
  publicados fiéis ao Markdown. Aviso preexistente: bundle inicial 594,01kB
  contra orçamento de 450kB.
- `npm run lint`: sem erros; 5891/4479/27350 avisos em shared/backend/frontend,
  preexistentes e fora deste diff somente SCSS.
- Prettier no SCSS: aprovado. Revisão manual do diff contra spec/convenções:
  somente layout, tokens existentes, sem nova API/primitivo, sem mudança de
  domínio, normalizador, fontes ou controles. Seletores limitam o ajuste às
  tabelas com indicador de ameaça na primeira coluna; sem responsabilidade nova
  no componente. Shared/backend sem mudança: suites aprovadas na RV-01
  (1157/995, um teste ignorado) não repetidas neste ajuste CSS.
- `npm run repo:verificar`: organização e espelhos aprovados; diff sem erros de
  whitespace. Buscas mecânicas de cores/fontes/raios nas linhas SCSS adicionadas
  sem violações. JSONs de evidência final: 48 estados, 336 rótulos contidos,
  nenhuma falha de geometria, 16 estados finais com última coluna integralmente
  acessível. Gate `--staged` executado antes do commit local.

RV-03 aprovada para contenção e consulta das tabelas. P-124 permanece aberto;
esta task não certifica o leitor inteiro nem o contraste de todos os destaques.
