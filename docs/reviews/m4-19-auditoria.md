# m4-19 — Auditoria de testes de atributo do NPC

> **Atualização posterior em 2026-10-06:** Sistema do Jogador v4.1.3 publicado pelo
> autor; a hipótese de +2 por crítico do pool foi superada por +2 uma vez no teste.
> O exemplo `[20,20,9] + PROF 9` passa a ter total 31, e não 33. A análise e tabelas
> abaixo são evidências datadas da versão anterior, não contrato vigente de crítico.
> [Revisão e contrato novo](p-097-sistema-v4.1.3.md). Guia v4.2.0 recebido e confrontado
> em [revisão posterior](m4-19-revisao-guia-v4.2.0.md): Nível + Competências definidos.
> m4-19 reespecificada, sem implementação; a análise abaixo preserva sua data e fonte original.

Data da auditoria: 2026-10-05. **Resposta do autor registrada em 2026-10-06;
implementação aguarda o documento revisado.**
Spec em [active](../specs/active/m4-19-npc-testes-de-atributo-regra-e-rolagem.spec.md).
Nenhuma mudança em código de aplicação, contrato JSONB ou documento canônico de regras.

## Resposta do autor — 2026-10-06

Este relatório preserva a análise e as propostas de 05/10 como evidência datada.
As recomendações seguintes **não são decisões aprovadas**. A resposta posterior é:

- Nova versão de testes/atributos de NPC será fornecida pelo autor; aguardar a fonte
  antes de implementar fórmula, campos/validação ou alterar o Guia. O diff da seção 6
  não foi aprovado para aplicação.
- Deve haver dadinho para rolar cada atributo do NPC; requisito mantido na m4-19.
- Civil é considerado pelo autor de Nível 0 (“em tese não” soma Nível); não forçar zero
  no código existente nem aprovar automaticamente a exceção para outros Níveis.
- Leitor com acesso vê os ajustes e modificadores apresentados, sem editar. Anotações
  permanecem privadas. A recomendação anterior de esconder os dois mapas foi substituída.
- Item “Ocultar rolagens” aprovado; autor declarou rolagens **sempre ocultas**, como nas
  Criaturas. Não interpretar como autorização de publicação. O detalhe da alternância
  do análogo será resolvido antes de implementá-la se necessário.
- Crítico permanece em revisão: conferir abrangência, ataque e contagem de múltiplos
  críticos em relação ao descarte. P-097 virou uma revisão antes de qualquer correção;
  resultado 33 e contagem de todo o pool seguem como interpretação auditada, não contrato novo.
- **Somente specs nesta rodada:** nenhuma correção imediata, inclusive P-095/P-096.
  Specs desses dois defeitos de fixture e da revisão P-097 estão em `backlog/`.

## Conclusão para decisão

Recomendo **B: atributo + ajuste de dados no pool; Nível + modificador manual no resultado**,
inclusive para NPC Civil. A soma de Nível é a leitura mais direta do Guia; o modificador
manual atende ao pedido de representar, por exemplo, uma passiva de +10, sem automatizar
habilidades. Ajuste de dados e modificador começam em zero e são independentes.

Há um defeito anterior que impede prometer fidelidade integral ao Sistema: **o motor atual
não soma +2 por crítico em testes e conta críticos apenas nos dados mantidos**. A spec assume
que essa regra já existe no motor, mas a reprodução determinística mostra o contrário.
Essa divergência afeta Jogador e Criatura também. Recomendo registrá-la e corrigir em tarefa
própria, sem aplicar uma compensação exclusiva ao NPC. As tabelas abaixo distinguem regra
escrita e comportamento atual; a escolha da fórmula não resolve esse defeito sozinha.

## 1. O que as fontes dizem

Referências de linha conferidas nesta sessão:

| Fonte / linhas | Trecho literal e consequência |
|---|---|
| Sistema, 1782–1784, Testes | “O resultado do teste é determinado pelo **maior** dado”. A quantidade de D20 é o valor do atributo. |
| Sistema, 1796–1804, DT | “valor alvo mínimo a ser atingido”. Sucesso é resultado **≥ DT**, inclusive empate; DT 5/10/15/20/25/30 são Muito Fácil/Fácil/Moderada/Difícil/Muito Difícil/Épica. |
| Sistema, 1806–1812, Crítico | Margem natural no 20; “para ‘cada crítico’, você aumenta o resultado do seu teste em +2” (escapes do Markdown omitidos). A leitura é contar os críticos de todo o pool de teste, antes do descarte. |
| Sistema, 331–333, Atributos | “um atributo zerado implica em **rodar dois dados** e escolher o **menor valor**”. |
| Sistema, 1030–1032, Progressão | Agente inicia no Nível 0 sem Proficiência; cada nível concede “+1 de Proficiência em todos os testes”. |
| Sistema, 1274–1284 e 1418–1432, Civil | Civil tem progressão própria por Treinamentos, iniciando sem Treinamento, com cinco etapas; não recebe a progressão por Nível do agente. O texto não contém uma frase literal “Civil não tem Proficiência”; essa conclusão vem da progressão distinta e é confirmada pelo motor existente. |
| Guia de Mestre, 897–905, Categoria | Níveis sugeridos: Civil 1–4, Operativo 3–8, Veterano 6–12, Elite 10–16, Lendário 14–20. “O Nível do NPC **não é restrito** pela Categoria”. |
| Guia de Mestre, 924–926, Nível | “O Nível do NPC funciona como **Proficiência** em todos os contextos, seja para testes de ataque, cálculo de Defesa e DT.” Nível permitido 0–20. Não há exceção para Categoria Civil. |
| Guia de Mestre, 928–940, Atributos | Dez atributos partem de 1; tetos Civil/Operativo/Veterano/Elite/Lendário = 2/3/4/5/6. Luta/Pontaria do Civil iniciam em zero, desbloqueáveis pelo mestre. |
| Guia de Mestre, 968–978, Defesa/DT | Defesa Base = 10 + Nível; Bloquear = Defesa Base + VIG; Esquivar = Defesa Base + DES; DT = 10 + Nível + Atributo × 2. |
| Guia de Mestre, 1092, 1123, 1126, 1135, Habilidades | Exemplos: “+1 dado em todos os testes”; mínimo de 2 dados quando o pool cai a zero; “+2 em todos os testes”; ataque com “pool completo de dados + Proficiência”. São efeitos específicos, não regras gerais de montagem do teste. |

Fontes: [Sistema](../core/sistema-v4.1.0.md) e [Guia de Mestre](../core/guia_de_mestre-v4.0.0.md).
A omissão é uma **fórmula explícita de teste de atributo do NPC**. A equivalência
Nível = Proficiência já está escrita. NPC Civil e classe Civil de jogador são contratos
distintos; importar a exceção de Proficiência do jogador para o NPC não tem apoio no Guia.

## 2. Conferência do comportamento existente

- `shared/src/regras/agente/defesa.ts:33`: `calcularProficiencia` retorna Nível,
  exceto classe Civil, para a qual retorna `null`.
- Jogador, `ficha-visualizacao.component.ts:1268,1355,1433`: soma ajustes manuais,
  equipamento e Formação ao pool/bônus apropriado; rola `<chave>d20kh1cm1 + PROF ± bônus`.
  Para comparação limpa, as tabelas fixam lesão, Formação, equipamento e modificadores em zero;
  sem Maestria de Intelecto. Usam o mesmo valor de atributo do NPC, para isolar a Proficiência.
- Criatura, `criatura-rolagem.ts:32`: `<chave>d20kh1 ± modificador do VD`, sem Proficiência
  e sem `cm1` nesse caminho. Não acrescenta bônus de crítico.
- `shared/src/regras/rolagem/rolagem.ts:644–660,751–775`: `cm1` é informativo; contabiliza
  críticos entre `mantidos`, e o total não recebe `2 × críticos`. O parâmetro `critico: true`
  dobra a fórmula de **dano**; não é a implementação do crítico de teste e não deve substituí-la.
- O teste existente `rolagem.spec.ts:397–402` exige **um** crítico para `[20,20,9]` com `kh1`.
  A divergência está codificada também na expectativa de teste, não só na implementação.
- Reprodução no **fonte atual** (transpilação em memória, sem usar `shared/dist`):
  `luta=3`, `PROF=9`, dados `[20,20,9]` → total **29**, críticos **1**.
  Pela regra escrita, seriam **33** e **2** críticos.
- Pool 0 no mesmo caminho → 2D20, mantém o menor; `[20,3] + 9` → **12**.
  Pool −1 → 3D20, mantém o menor; `[20,3,2] + 9` → **11**.
  O motor generaliza o caso negativo como `2 + |pool|` dados; o Sistema só explicita zero.
  O NPC deve reutilizar o caminho do Jogador, sem inventar mínimo de 1 ou 2 dados com `kh1`.

**Correção do ponto de partida da spec:** com os críticos da regra escrita, um Lendário
de atributo 6 **pode** alcançar DT 25 sem bônus: precisa de pelo menos três resultados 20.
Chance exata **0,222984375%**. O máximo é **32**, não 20. DT 30 exige cinco críticos:
**0,0001796875%**. Sem bônus, DT 20 continua em **26,4908109375%**, pois já exige um 20.
O diagnóstico de baixa chance é válido; “nunca passa DT 25” só descreve o motor atual.

## 3. Probabilidades exatas

Sem simulação. Dados uniformes e independentes; margem natural 20; atributo positivo.
Para cada categoria: atributo 1, ponto médio inteiro inferior de `[1,teto]`, e teto.
Níveis típicos = ponto médio inteiro inferior das faixas sugeridas: **2, 5, 9, 13, 17**.
Civil e Operativo têm centro fracionário de Nível (2,5 e 5,5); arredondamento para baixo
explicitado apenas para escolher exemplos válidos, sem criar regra nova de progressão.

Sejam `n` o pool, `b` o bônus fixo, `d` a DT, `t=d−b`, `M` o maior dado e `C` o número de 20:

- Regra escrita: `R = M + 2C + b`.
- Se `t ≤ 1`, probabilidade = 1.
- Se `2 ≤ t ≤ 20`, probabilidade = `1 − ((t−1)/20)^n`.
- Se `t > 20`, `q = ceil((t−20)/2)` e probabilidade =
  `Σ[k=q..n] binomial(n,k) × (1/20)^k × (19/20)^(n−k)`; `q>n` implica zero.
- Motor atual: `R = M+b`; mesmas duas primeiras faixas, e zero para `t>20`.

As frações usam denominador `20^n` e numeradores inteiros. As porcentagens exibidas são
arredondadas a seis casas; arredondamento visual não transforma probabilidade rara em impossível.
Conferência independente: contagem dinâmica das combinações por `(maior dado, número de 20)`.

### 3.1 Regra escrita: sem Nível

| Categoria | Nível | Atributo (recorte) | DT 5 | DT 10 | DT 15 | DT 20 | DT 25 | DT 30 |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| Civil | 2 | 1 (base) | 80,000000% | 55,000000% | 30,000000% | 5,000000% | 0,000000% | 0,000000% |
| Civil | 2 | 1 (meio) | 80,000000% | 55,000000% | 30,000000% | 5,000000% | 0,000000% | 0,000000% |
| Civil | 2 | 2 (teto) | 96,000000% | 79,750000% | 51,000000% | 9,750000% | 0,000000% | 0,000000% |
| Operativo | 5 | 1 (base) | 80,000000% | 55,000000% | 30,000000% | 5,000000% | 0,000000% | 0,000000% |
| Operativo | 5 | 2 (meio) | 96,000000% | 79,750000% | 51,000000% | 9,750000% | 0,000000% | 0,000000% |
| Operativo | 5 | 3 (teto) | 99,200000% | 90,887500% | 65,700000% | 14,262500% | 0,012500% | 0,000000% |
| Veterano | 9 | 1 (base) | 80,000000% | 55,000000% | 30,000000% | 5,000000% | 0,000000% | 0,000000% |
| Veterano | 9 | 2 (meio) | 96,000000% | 79,750000% | 51,000000% | 9,750000% | 0,000000% | 0,000000% |
| Veterano | 9 | 4 (teto) | 99,840000% | 95,899375% | 75,990000% | 18,549375% | 0,048125% | 0,000000% |
| Elite | 13 | 1 (base) | 80,000000% | 55,000000% | 30,000000% | 5,000000% | 0,000000% | 0,000000% |
| Elite | 13 | 3 (meio) | 99,200000% | 90,887500% | 65,700000% | 14,262500% | 0,012500% | 0,000000% |
| Elite | 13 | 5 (teto) | 99,968000% | 98,154719% | 83,193000% | 22,621906% | 0,115812% | 0,000031% |
| Lendário | 17 | 1 (base) | 80,000000% | 55,000000% | 30,000000% | 5,000000% | 0,000000% | 0,000000% |
| Lendário | 17 | 3 (meio) | 99,200000% | 90,887500% | 65,700000% | 14,262500% | 0,012500% | 0,000000% |
| Lendário | 17 | 6 (teto) | 99,993600% | 99,169623% | 88,235100% | 26,490811% | 0,222984% | 0,000180% |

### 3.2 Regra escrita: com Nível (A; B com modificador zero)

| Categoria | Nível | Atributo (recorte) | DT 5 | DT 10 | DT 15 | DT 20 | DT 25 | DT 30 |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| Civil | 2 | 1 (base) | 90,000000% | 65,000000% | 40,000000% | 15,000000% | 0,000000% | 0,000000% |
| Civil | 2 | 1 (meio) | 90,000000% | 65,000000% | 40,000000% | 15,000000% | 0,000000% | 0,000000% |
| Civil | 2 | 2 (teto) | 99,000000% | 87,750000% | 64,000000% | 27,750000% | 0,250000% | 0,000000% |
| Operativo | 5 | 1 (base) | 100,000000% | 80,000000% | 55,000000% | 30,000000% | 5,000000% | 0,000000% |
| Operativo | 5 | 2 (meio) | 100,000000% | 96,000000% | 79,750000% | 51,000000% | 9,750000% | 0,000000% |
| Operativo | 5 | 3 (teto) | 100,000000% | 99,200000% | 90,887500% | 65,700000% | 14,262500% | 0,012500% |
| Veterano | 9 | 1 (base) | 100,000000% | 100,000000% | 75,000000% | 50,000000% | 25,000000% | 5,000000% |
| Veterano | 9 | 2 (meio) | 100,000000% | 100,000000% | 93,750000% | 75,000000% | 43,750000% | 9,750000% |
| Veterano | 9 | 4 (teto) | 100,000000% | 100,000000% | 99,609375% | 93,750000% | 68,359375% | 18,549375% |
| Elite | 13 | 1 (base) | 100,000000% | 100,000000% | 95,000000% | 70,000000% | 45,000000% | 20,000000% |
| Elite | 13 | 3 (meio) | 100,000000% | 100,000000% | 99,987500% | 97,300000% | 83,362500% | 48,800000% |
| Elite | 13 | 5 (teto) | 100,000000% | 100,000000% | 99,999969% | 99,757000% | 94,967156% | 67,232000% |
| Lendário | 17 | 1 (base) | 100,000000% | 100,000000% | 100,000000% | 90,000000% | 65,000000% | 40,000000% |
| Lendário | 17 | 3 (meio) | 100,000000% | 100,000000% | 100,000000% | 99,900000% | 95,712500% | 78,400000% |
| Lendário | 17 | 6 (teto) | 100,000000% | 100,000000% | 100,000000% | 99,999900% | 99,816173% | 95,334400% |

**Agente jogador convencional**, com o mesmo Nível, atributo e bônus zero, tem exatamente
as probabilidades desta tabela **pela regra escrita**. Isso é igualdade algébrica, não uma
hipótese sobre a distribuição de atributos de uma ficha real. Categoria não existe no jogador.
**Jogador Civil** no Treinamento 2, atributo 1 ou 2, usa as respectivas linhas Civil da tabela
3.1, pois não soma Proficiência. Não comparar Civil jogador em “Nível 9/13/17”: essas etapas
não existem no seu contrato. NPC Civil de Nível 2 soma +2 na proposta B.

### 3.3 Motor atual: com Nível (comparação com o Jogador que roda hoje)

| Categoria | Nível | Atributo (recorte) | DT 5 | DT 10 | DT 15 | DT 20 | DT 25 | DT 30 |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| Civil | 2 | 1 (base) | 90,000000% | 65,000000% | 40,000000% | 15,000000% | 0,000000% | 0,000000% |
| Civil | 2 | 1 (meio) | 90,000000% | 65,000000% | 40,000000% | 15,000000% | 0,000000% | 0,000000% |
| Civil | 2 | 2 (teto) | 99,000000% | 87,750000% | 64,000000% | 27,750000% | 0,000000% | 0,000000% |
| Operativo | 5 | 1 (base) | 100,000000% | 80,000000% | 55,000000% | 30,000000% | 5,000000% | 0,000000% |
| Operativo | 5 | 2 (meio) | 100,000000% | 96,000000% | 79,750000% | 51,000000% | 9,750000% | 0,000000% |
| Operativo | 5 | 3 (teto) | 100,000000% | 99,200000% | 90,887500% | 65,700000% | 14,262500% | 0,000000% |
| Veterano | 9 | 1 (base) | 100,000000% | 100,000000% | 75,000000% | 50,000000% | 25,000000% | 0,000000% |
| Veterano | 9 | 2 (meio) | 100,000000% | 100,000000% | 93,750000% | 75,000000% | 43,750000% | 0,000000% |
| Veterano | 9 | 4 (teto) | 100,000000% | 100,000000% | 99,609375% | 93,750000% | 68,359375% | 0,000000% |
| Elite | 13 | 1 (base) | 100,000000% | 100,000000% | 95,000000% | 70,000000% | 45,000000% | 20,000000% |
| Elite | 13 | 3 (meio) | 100,000000% | 100,000000% | 99,987500% | 97,300000% | 83,362500% | 48,800000% |
| Elite | 13 | 5 (teto) | 100,000000% | 100,000000% | 99,999969% | 99,757000% | 94,967156% | 67,232000% |
| Lendário | 17 | 1 (base) | 100,000000% | 100,000000% | 100,000000% | 90,000000% | 65,000000% | 40,000000% |
| Lendário | 17 | 3 (meio) | 100,000000% | 100,000000% | 100,000000% | 99,900000% | 95,712500% | 78,400000% |
| Lendário | 17 | 6 (teto) | 100,000000% | 100,000000% | 100,000000% | 99,999900% | 99,816173% | 95,334400% |

Jogador convencional atual = esta tabela. Para o motor sem Nível, DT 5–20 são idênticas
às de 3.1 e DT 25/30 são **zero em todas as linhas**. Jogador Civil atual segue essa variante
sem Nível. Essas diferenças quantificam o defeito dos críticos, sem alterar regra do agente.

### 3.4 Efeito de B: exemplo de modificador manual +10

Ajuste de dados zero, atributos no teto; probabilidades pela regra escrita.
Cada ponto de modificador reduz a DT efetiva em 1; dados extras mudam `n`, não o bônus.

| Categoria | Nível | Atributo | DT 5 | DT 10 | DT 15 | DT 20 | DT 25 | DT 30 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Civil | 2 | 2 | 100,000000% | 100,000000% | 99,000000% | 87,750000% | 64,000000% | 27,750000% |
| Operativo | 5 | 3 | 100,000000% | 100,000000% | 100,000000% | 99,200000% | 90,887500% | 65,700000% |
| Veterano | 9 | 4 | 100,000000% | 100,000000% | 100,000000% | 100,000000% | 99,609375% | 93,750000% |
| Elite | 13 | 5 | 100,000000% | 100,000000% | 100,000000% | 100,000000% | 99,999969% | 99,757000% |
| Lendário | 17 | 6 | 100,000000% | 100,000000% | 100,000000% | 100,000000% | 100,000000% | 99,999900% |

O +10 representa uma habilidade aplicável ao teste escolhida pelo mestre; não é aumento
automático por categoria nem bônus concedido a todo NPC. No motor atual usa-se `M + Nível + 10`;
para esta amostra, todas as DTs efetivas são ≤20, então os números também coincidem com o motor.

## 4. Opções e impacto

| Opção | Montagem | Probabilidade / efeito | Avaliação |
|---|---|---|---|
| A | Pool = atributo + ajuste; bônus = Nível | Tabela 3.2 (ou 3.3 no motor atual) | Leitura literal do Guia, mas sozinha não representa a passiva de +10 pedida pelo autor. |
| **B — recomendada** | Pool = atributo + ajuste; bônus = Nível + modificador manual, inclusive Civil | Igual a A com bônus zero; +10 exemplificado em 3.4 | Atende ao Guia e ao pedido, com uma regra única e bônus lançados à mão. |
| C | Igual a B, mas NPC Civil não soma Nível | Civil fica nas linhas sem Nível de 3.1; demais mantêm 3.2 | Aproxima Civil jogador, mas cria exceção à expressão “em todos os contextos” do Guia. Exige decisão de regra e mudança explícita no documento. |

Nenhuma dessas opções altera Defesa, Bloquear, Esquivar, DT, Vida ou Energia: permanecem
os cálculos de `shared/regras/npc/{defesa,dt,saude,energia}.ts` e seus snapshots editáveis.
Não somar Proficiência uma segunda vez à Defesa/DT: Nível já está nas fórmulas.
Habilidades como “Determinação Absoluta” (Guia, 1123) continuam descritivas; mínimo de dois
dados dessa habilidade não se torna um mínimo geral. “Ataque Definitivo” (1135) confirma
a soma de Proficiência; ataque/dano de NPC permanecem fora desta task.
A decisão de não fundir efeitos automaticamente está registrada em `HISTORY.md:21797–21810`.

## 5. Preparação da implementação — sem executá-la

- Contrato: reutilizar os tipos de `FichaJogadorDadosDto["modificadoresTeste"]` e
  `["dadosTeste"]` no NPC, opcionais, ausência = 0, sem migration nem DTO de API novo.
- **Faixas presumidas na spec não existem no Jogador:** não há função `validarFicha` de
  jogador no shared atual; `FichaService.validarDadosContraRegras:1735` verifica Maestria,
  Identidade e Munição, sem validar esses dois mapas. Steppers de ambos os ajustes não têm
  min/max ou clamp (`ficha-visualizacao.component.ts:1394–1409`). Proposta: inteiros finitos,
  negativos permitidos, só as dez chaves, **sem faixa artificial**. O motor limita pools
  físicos a 100 dados (`rolagem.dados.ts:36`), o que é proteção de execução, não faixa do campo.
- `validarFichaNpc` concentra a validação nova; backend já delega a ela. Testar mapa inválido,
  decimal, infinito, chave desconhecida e documentos antigos, sem inventar validação de jogador.
- **Leitura privada:** hoje `omitirCamposPrivados` remove somente `historia`/`anotacoes`,
  no REST de leitor e no broadcast. `condutaCombate` do NPC permanece visível. Não tratá-la
  como privada só porque a spec menciona “anotações/conduta”. Proposta: esconder os dois
  mapas novos somente no recorte **NPC**, mantendo leitura já existente de Jogador/Conduta.
  O broadcast da ficha omite os mapas para todos; dono/mestre precisam preservar/refazer
  os dados privados na absorção de eventos, como já acontece com Anotações.
- Rolagem pública com fórmula e resultado pode revelar o bônus daquele teste; esconder o
  mapa da ficha não torna a fórmula pública secreta. Para teste secreto, usar `PRIVADA`.
- `RolagemService.registrarRolagem:55–71` aceita ficha recuperada independentemente do tipo,
  não recomputa fórmulas; persiste o resultado recebido. NPC é aceito por construção, mas
  ainda precisa do teste e da verificação REST/socket previstos na spec.
- A autorização desse endpoint é **leitura**, inclusive para quem tem concessão (§14).
  A task exige que o controle de atributo de NPC seja só do mestre; o leitor não terá dadinho.
  Não alterar a autorização genérica das demais fichas de passagem.
- Proposta de visibilidade: item **Ocultar rolagens**, como a Criatura, começando privado
  (`FichaRolagemRegistroService.inicializar(..., true)`); o mestre pode tornar público.
- Análogo escolhido para a etapa futura: ladrilho `app-atributo-ficha` do Jogador com
  steppers `micro`/`discreto` e ações de bloco do NPC; registro/bandeja do Jogador,
  toggle de visibilidade da Criatura. O m4-18 já extraiu o primitivo necessário. O gate
  visual ainda não começou; exige leitura do handoff e aplicação real nos dois viewports.

## 6. Diff canônico proposto — ainda não aplicado

Recomendação: explicitar B **apenas no Guia de Mestre**, após o parágrafo de Nível
e antes de Atributos. Não precisa alterar o Sistema para definir a montagem do NPC;
a regra geral de críticos já está explícita nele.

```diff
 O Nível do NPC funciona como **Proficiência** em todos os contextos, seja para testes de ataque, cálculo de Defesa e DT. Ele também é a variável principal das fórmulas de Vida e Energia. O nível do NPC possui o mesmo limite de um agente convencional: De 0 à 20\.

+Nos testes de atributo de um NPC, role uma quantidade de D20 igual ao valor do atributo mais os ajustes de dados aplicáveis, escolha o maior resultado e some o Nível do NPC e os modificadores de teste aplicáveis. O Nível é somado também para NPCs da Categoria Civil. Ajustes de dados alteram a quantidade de dados; modificadores de teste alteram o resultado final. Para atributo zerado e críticos, siga as regras gerais do Sistema. Bônus de habilidades são aplicados pelo Mestre apenas quando o texto da habilidade e a situação os permitirem.

 ### **⬥ Atributos** {#⬥-atributos}
```

Este diff esclarece a regra de mesa; **não afirma que o motor atual já aplica o crítico**.
Aplicá-lo depende de aprovação expressa. Manter os documentos como estão também é opção.

## 7. Evidência e decisões pendentes

- Dependências m4-16/17/18 confirmadas em `done/`.
- Fontes canônicas e consumidores conferidos por leitura; três reproduções determinísticas
  contra `shared/src/regras/rolagem/rolagem.ts`, transpilado em memória.
- `npm run test --workspace=shared -- rolagem.spec.ts`: **107/107** testes, um arquivo.
  A primeira execução falhou na carga de configuração por acesso negado do sandbox;
  a execução autorizada fora dele passou. Isso não é falha de teste nem correção da divergência.
- Probabilidades: **792 comparações** de fórmulas combinatórias inteiras com contagem dinâmica exata,
  inclusive os dois exemplos raros de DT 25/30. Sem amostragem aleatória.
- Build/lint/suítes completas/gates REST/socket/visual ainda **não executados para m4-19**:
  não há implementação para validar. A spec permanece **aberta em active/**.

Decisões a obter antes dos itens 2–5:

1. B inclusive Civil (recomendada), ou outra fórmula? O defeito de crítico fica registrado
   para tarefa própria ou o autor quer autorizar um recorte adicional separado nesta frente?
2. Aprovar o diff acima no Guia, ou manter `docs/core/` intacto?
3. Ocultar os mapas de bônus do leitor e incluir **Ocultar rolagens**, iniciando privado,
   como a Criatura (ambos recomendados), ou escolher políticas diferentes?
