# Guia de criação — habilidades iniciais, progressão avulsa e resumo de identidade

## Objetivo

Corrigir quatro incoerências do fluxo de criação e da apresentação compacta da ficha:

1. o resumo de Identidade quebra visualmente quando a Origem foi substituída por Peculiaridade;
2. subclasses são exibidas sem a classe-base, ocultando parte importante da identidade mecânica;
3. o guia considera somente habilidades concedidas pela progressão de Nível e ignora o pacote obrigatório da criação;
4. uma ficha avulsa força Nível e Prestígio a zero, embora esses valores devam poder ser informados diretamente.

As fontes de verdade são `docs/core/sistema-v4.1.0.md`, especialmente as seções de Habilidades,
Habilidades de Civil e criação de agente, e as decisões visuais de `docs/design/`.

## 1. Resumo de Origem substituída por Peculiaridade

No resumo compacto da ficha, Peculiaridade não será apresentada como um complemento espremido ao
lado de “Não definida”. Quando `experimentoComPeculiaridade` for verdadeiro, a Origem terá um único
estado semântico: **Substituída pela Peculiaridade**.

O bloco deve preservar a grade, densidade e hierarquia do resumo atual, mas permitir que o texto do
estado ocupe uma linha legível. O ícone de edição não aparece nesse estado. A implementação reutiliza
tokens e padrões existentes; não cria cores, raios ou tipografia próprios.

Componente análogo aprovado: os estados e chips dos mini-resumos da própria ficha, mantendo o mesmo
shell, espaçamento, contraste e tratamento responsivo.

## 2. Apresentação de classe e subclasse

Sempre que o valor selecionado representar uma subclasse ou arquétipo, a interface exibirá a
classe-base e a subclasse como informações distintas e consecutivas. Exemplos:

- `Especialista` + `Experimento Artificial`;
- a classe-base correspondente + sua subclasse selecionada.

Uma classe sem subclasse continua exibindo somente um rótulo. A relação entre enum e classe-base deve
vir de uma fonte compartilhada já existente ou de uma nova função pura em `shared/regras`; ela não será
repetida em templates e componentes.

O ajuste cobre ao menos o resumo mostrado na ficha e os resumos/revisão do guia que hoje apresentam
somente o valor final de `ClasseEnum`. A redação não concatena os dois conceitos em uma string ambígua:
cada um mantém seu rótulo semântico.

## 3. Pacote obrigatório de habilidades da criação

### Agente convencional

O passo **Habilidades** sempre existe para agentes convencionais, inclusive no Nível 0, e exige que o
usuário escolha exatamente um dos pacotes iniciais definidos no sistema:

1. **4 Gerais**;
2. **2 Gerais + 1 de Classe/Arquétipo**;
3. **2 de Classe/Arquétipo**.

Depois da escolha do pacote, as vagas concedidas pela progressão do Nível inicial são somadas por tipo.
O guia deve distinguir visualmente o pacote de criação das vagas de progressão, mas ambos usam o mesmo
catálogo e as mesmas restrições de seleção.

### Experimento

As subclasses de Experimento também escolhem um dos três pacotes iniciais. A vaga garantida de
Classe/Arquétipo introduzida para permitir a escolha de Peculiaridade permanece **adicional** ao pacote
inicial e às vagas de progressão. Escolher Peculiaridade continua substituindo a Origem conforme a regra
já existente.

### Civil

Civil não recebe os três pacotes de agente convencional. Na criação, escolhe exatamente **3 habilidades
civis**, além de qualquer benefício posterior da progressão de Treinamento. Essa diferença deve estar
modelada na mesma fonte de regra e refletida pelo mesmo passo Habilidades.

### Motor compartilhado

A composição das vagas iniciais será uma regra pura em `shared/regras/agente`, coberta por testes. O
frontend consumirá o resultado tipado e ficará responsável somente por apresentar opções, registrar a
escolha e impedir avanço enquanto as vagas obrigatórias não estiverem completas.

O pacote inicial não será incorporado silenciosamente a `calcularProgressaoAcumulada`: criação e
progressão são conceitos diferentes e precisam continuar identificáveis. A ficha final, porém, reúne as
habilidades escolhidas nos dois conjuntos sem duplicatas.

## 4. Nível e Prestígio de ficha avulsa

### Em campanha

O comportamento atual permanece: Nível inicial e Prestígio inicial são calculados a partir das médias
da campanha. O controle existente de sobrescrita permite abandonar o cálculo e informar manualmente os
valores finais.

### Fora de campanha

Sem campanha não existe média a calcular. O guia nasce em modo manual e apresenta campos para:

- **Nível inicial exato**;
- **Prestígio inicial exato**.

Esses valores alimentam diretamente a ficha, os derivados iniciais e as vagas de progressão. A interface
não pede uma “média simulada” nem aplica `média − 1` ao valor digitado. Os limites e validações seguem os
mesmos limites finais já aceitos pelo domínio para Nível e Prestígio.

Ao alternar entre cálculo e sobrescrita dentro de campanha, o estado deve preservar coerência: o resumo,
a Revisão e o payload final sempre exibem e enviam o valor efetivamente selecionado.

## 5. Fluxo e estado

O passo de progressão produz valores finais de Nível e Prestígio. O passo Habilidades consome o Nível
final e combina:

1. pacote obrigatório de criação;
2. vaga adicional de Experimento, quando aplicável;
3. vagas acumuladas de progressão.

O passo Identidade vem depois de Habilidades, preservando a capacidade de esconder Origem quando
Peculiaridade foi escolhida. A Revisão e os resumos laterais derivam os índices pelo nome dos passos,
sem posições numéricas fixas.

## 6. Validação e erros

- Não é possível avançar em Habilidades sem selecionar um pacote e preencher todas as suas vagas.
- Não é possível selecionar a mesma habilidade duas vezes entre pacote inicial, vaga de Experimento e
  progressão.
- Mudanças de classe, pacote, Nível ou modo de cálculo removem somente escolhas que se tornaram
  incompatíveis; não deixam habilidades invisíveis no payload.
- Valores manuais inválidos de Nível ou Prestígio bloqueiam o avanço e exibem ajuda no próprio campo.
- A validação autoritativa do backend e as regras de Origem/Peculiaridade permanecem intactas.

## 7. Verificação obrigatória

### Testes automatizados

- `shared`: três pacotes convencionais, pacote de Civil e composição separada da progressão;
- guia: passo Habilidades no Nível 0, preenchimento e troca dos três pacotes, Experimento com vaga
  adicional, Civil com três vagas, prevenção de duplicatas e reconstrução do payload;
- guia avulso: Nível e Prestígio exatos, inclusive Nível alto, refletidos em derivados, vagas, resumo e
  payload;
- apresentação: classe-base + subclasse e estado único de Origem substituída.

### Aplicação real

Usar a skill `verify` e observar pessoalmente `1920×1080` e `360×800`:

- ficha com Peculiaridade no resumo compacto, sem quebra, overflow ou “Não definida” concorrente;
- `Especialista` + `Experimento Artificial` na ficha e no guia;
- cada pacote inicial de habilidades, inclusive Nível 0;
- Experimento com pacote inicial + vaga adicional e substituição da Origem;
- Civil com três habilidades civis;
- ficha avulsa com Nível e Prestígio altos informados diretamente;
- campanha usando médias e campanha usando sobrescrita manual.

A comparação visual deve confirmar densidade, hierarquia, controles, estados, foco, contraste e alvos de
toque coerentes com o componente análogo. Build, testes e lint complementam, mas não substituem essa
inspeção.

## Fora de escopo

- alterar os três pacotes definidos pelo documento do sistema;
- mudar a mecânica de Peculiaridade ou os bônus/penalidades definidos pelo Mestre;
- recalcular fichas já existentes ou conceder retroativamente habilidades;
- alterar fórmulas de progressão por Nível ou Treinamento;
- redesenhar outras áreas da ficha que não exibem Classe/Subclasse ou Origem.
