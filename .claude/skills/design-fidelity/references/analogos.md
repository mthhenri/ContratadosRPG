# Análogos por tipo de tela — `design-fidelity`

Ponto de partida para escolher o componente análogo aprovado. Cada linha (exceto onde indicado)
tem par desktop/mobile em `docs/design/examples/` — abra os dois antes de construir. Confira
`docs/design/examples/README.md` antes de usar esta tabela: ela pode ter mudado desde que foi
escrita aqui.

| Tipo de tela | Referência em `examples/` | Componente vivo | Padrão a reaproveitar |
|---|---|---|---|
| Formulário de autenticação | `login.html` / `cadastro.html` | `autenticacao/paginas/login`, `.../registro` | painel split marca+form, campos com rótulo mono |
| Listagem de cards | `campanhas.html` / `acervo-de-fichas.html` | `campanha/paginas/lista`, `ficha/paginas/acervo` | topbar, card de stat, card de item, chip de papel |
| Detalhe de campanha (lobby) | `lobby-de-campanha.html` | `campanha/paginas/detalhe` | código de convite copiável, card de membro, barras Vida/Energia inline |
| Tela densa com abas | `ficha-de-jogador.html` | `ficha/componentes/ficha-visualizacao` | barras Vida/Energia, grid de atributos, bloco `.abas` |
| Fluxo por passos (guia) | `ficha-criacao-guia.html` | `ficha/paginas/criar` | trilha de passos numerada, resumo lateral, `.chip-classificacao` |
| Perfil / configurações empilhadas | `perfil.html` | `usuario/paginas/perfil` | banner de tipo de conta, seções empilhadas |
| Calculadora / ferramenta com abas | `calculadora-de-atributos.html` | `simulacao/paginas/agente` | abas de ferramenta, bloco `.stepper`, stat grid |
| Painel de mestre / combate | `iniciativa-desktop.html` + `iniciativa-mobile.html` | `encontro/paginas/painel/painel-encontro.page.ts` | par com nomenclatura diferente das demais (sem sufixo `--mobile`) — e não listado em `examples/README.md` nem `DESIGN.md`, achado nesta task; os arquivos existem e são válidos, só a tabela do README está incompleta |
| Ficha de criatura (exceção) | `ficha-de-criatura.html` (sem par mobile) | `ficha/componentes/criatura-visualizacao` | mockup mantido à mão — relação invertida: o arquivo guia o componente, não o contrário. Ver `examples/README.md` "Excluído de propósito" antes de tratar como captura normal |

Nenhuma linha acima é a única analogia válida — é o ponto de partida mais óbvio por tipo de tela.
Uma tela que não se encaixa em nenhuma linha ainda precisa de um análogo registrado; procure o
componente vivo mais parecido em densidade/função e registre a escolha, mesmo sem entrada aqui.
