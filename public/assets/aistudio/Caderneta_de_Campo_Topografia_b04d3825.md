# Caderneta de Campo — Topografia

**Guia completo do aplicativo, dos métodos e das fórmulas — documento de trabalho para o aluno e para qualquer agente que colabore no projeto.**

Este arquivo é a fonte de contexto compartilhada. Ele descreve **o que o app faz**, **como o app calcula e corrige**, **como resolver cada tipo de exercício** e **como investigar dificuldades de aprendizagem sem inventar causas**. Sempre que este documento divergir do código, **o código é a fonte de verdade** (as referências de arquivo estão indicadas em cada seção).

- Público-alvo: o aluno (uso individual) e agentes de IA que forem ajudar a estudar, revisar cálculos ou evoluir o app.
- Idioma: português do Brasil, com a nomenclatura usada na disciplina (IFRO · Campus Colorado do Oeste · Engenharia Agronômica).
- Última revisão: novembro de 2026.

---

## 0. Sumário

1. [O que o app é — e o que ele não é](#1-o-que-o-app-é--e-o-que-ele-não-é)
2. [Arquitetura: onde está cada coisa](#2-arquitetura-onde-está-cada-coisa)
3. [Como o progresso é registrado (XP, sequência, patentes)](#3-como-o-progresso-é-registrado)
4. [As 14 abas](#4-as-14-abas)
5. [Como o app corrige cada tipo de resposta](#5-como-o-app-corrige-cada-tipo-de-resposta)
6. [Blocos 1 a 9 — conteúdo, métodos e resoluções](#6-blocos-1-a-9)
7. [Dinâmicas visuais (abas 10 a 12)](#7-dinâmicas-visuais-abas-10-a-12)
8. [Aba 13 — Poligonal de campo (motor de cálculo)](#8-aba-13--poligonal-de-campo)
9. [Aba 14 — Biblioteca de fórmulas](#9-aba-14--biblioteca-de-fórmulas)
10. [Convenções que evitam a maioria dos erros](#10-convenções-que-evitam-a-maioria-dos-erros)
11. [Modo Prova (planejado — ainda não implementado)](#11-modo-prova-planejado--ainda-não-implementado)
12. [Protocolo de diagnóstico de aprendizagem](#12-protocolo-de-diagnóstico-de-aprendizagem)
13. [Dados a conferir e pendências conhecidas](#13-dados-a-conferir-e-pendências-conhecidas)
14. [Glossário](#14-glossário)
15. [Checklist para quem for editar o app](#15-checklist-para-quem-for-editar-o-app)
16. [Histórico de decisões do projeto](#16-histórico-de-decisões-do-projeto)

---

## 1. O que o app é — e o que ele não é

**É** uma ferramenta de estudo individual que transforma a lista de exercícios de Topografia em uma jornada gamificada com estética de caderneta de campo: papel envelhecido, tons terrosos, HUD com visor de LCD. Cada questão funciona como uma "estação" da poligonal; o progresso aparece em XP, patente e sequência de acertos.

**Não é**:

- um app multiusuário, com ranking ou login próprio (o progresso fica no navegador, em `localStorage`);
- um substituto do material do professor: as resoluções foram escritas a partir da lista e da apostila, e alguns dados de campo precisam ser conferidos (ver §13);
- um corretor de texto dissertativo: respostas escritas são **autoavaliadas** pelo próprio aluno;
- um sistema com banco de dados: não há backend, entidades ou funções — é uma aplicação React de página única.

---

## 2. Arquitetura: onde está cada coisa

| Arquivo / pasta | Papel |
|---|---|
| `src/pages/Home.jsx` | Página única do app. Monta a lista de abas (`BLOCOS` + `VISUAL_BLOCOS` + aba Poligonal + aba Fórmulas), o cabeçalho, o HUD, o painel de resultados e o rodapé. |
| `src/data/blocos.js` | **Conteúdo dos 9 blocos (Q1–Q28)**. Cada item de cálculo traz `answer`, `tol`, `unit` e `sol` (resolução passo a passo). |
| `src/data/visual.js` | **Conteúdo das dinâmicas visuais** (equipamentos, teodolito, nivelamento) + URLs das figuras. |
| `src/lib/caderneta.js` | Helpers: conversão DMS ↔ decimal, tolerância `DMS_TOL`, comparação `within`, patentes, exibição de resposta/gabarito. |
| `src/lib/poligonal.js` | **Motor da poligonal fechada**: fechamento angular, azimutes, projeções, regra do compasso, coordenadas, área de Gauss e a resolução expandida em 7 etapas. |
| `src/hooks/useProgress.js` | Persistência do progresso em `localStorage` (chave `caderneta_topografia_v2`). |
| `src/components/caderneta/` | Componentes da caderneta: `HUD`, `TabNav`, `QuestionCard`, `ResultsPanel`, `FormulasPanel`, `ThemeToggle`, `ItemRow`. |
| `src/components/caderneta/rows/` | Um componente por tipo de resposta (`CalcRow`, `DmsRow`, `XyRow`, `RumoRow`, `ChoiceRow`, `DissertativaRow`) + `Feedback` e `ToggleBox` (mostrar/ocultar resolução). |
| `src/components/caderneta/diagrams/` | Diagramas SVG: `TheodoliteDiagram` (partes numeradas) e `ProfileDiagram` (nivelamento). |
| `src/components/caderneta/poligonal/` | `PoligonalPanel` (estado + botão de PDF), `PoligonalInputs` (tabela de campo), `PoligonalResults` (resumo, quadro e etapas), `Etapa` (acordeão), `pdfExport.jsx`. |
| `src/index.css` | Toda a identidade visual "caderneta" (variáveis CSS, HUD, tabelas, selo "RESOLVIDO", tema escuro). |

### Fluxo de dados (resumo)

1. `Home` mantém `tab` (aba atual) e lê `state` do `useProgress`.
2. Cada `QuestionCard` recebe `answers` e `onCheck`. O item, ao ser conferido, chama `registerAttempt(id, correct, pontos, extra)`.
3. `registerAttempt` grava no estado **e** o `useEffect` serializa tudo em `localStorage`.
4. `HUD`, `TabNav` (marcas ✓) e `ResultsPanel` apenas **leem** esse estado.

---

## 3. Como o progresso é registrado

Arquivo: `src/hooks/useProgress.js`. Chave: `caderneta_topografia_v2`.

Estado persistido:

```json
{
  "answers": {
    "q4a": { "attempts": 2, "correct": true, "value": 3250, "xp": 6, "xpGiven": true }
  },
  "xp": 6,
  "streak": 1,
  "best": 1
}
```

Regras exatas:

- **XP só na primeira resposta correta** do item (`xpGiven` impede farmar XP repetindo acerto).
- **Sequência (`streak`) aumenta** a cada item acertado pela primeira vez e **zera a cada erro**.
- **Melhor sequência (`best`)** guarda o recorde.
- **`attempts`** conta todas as conferidas, certas ou erradas.
- O registro guarda **apenas a última** resposta digitada (`value`, `v`, `text` ou `choice`), não o histórico completo.
- "Reiniciar progresso" (rodapé) apaga tudo, com confirmação.

### Patentes (limiares de XP)

| XP | Patente |
|---|---|
| < 50 | Aprendiz de Campo |
| < 150 | Auxiliar de Topógrafo |
| < 300 | Topógrafo de Poligonal |
| < 450 | Mestre da Estação Total |
| ≥ 450 | Engenheiro Geodesista |

### Tamanho real do percurso

| Aba | Itens | XP máximo |
|---|---|---|
| Bloco 1 — Fundamentos | 11 | 56 |
| Bloco 2 — Conversões de unidades | 12 | 72 |
| Bloco 3 — Áreas de figuras simples | 5 | 30 |
| Bloco 4 — Sistema angular | 6 | 42 |
| Bloco 5 — Fórmula de Heron | 2 | 16 |
| Bloco 6 — Trigonometria | 5 | 30 |
| Bloco 7 — Rumo e Azimute | 12 | 104 |
| Bloco 8 — Distâncias, azimutes e coordenadas | 7 | 66 |
| Bloco 9 — Poligonais fechadas | 21 | 514 |
| Dinâmica — Equipamentos | 6 | 36 |
| Dinâmica — Partes do teodolito | 7 | 56 |
| Dinâmica — Perfil de nivelamento | 3 | 24 |
| **Total** | **97** | **1.046** |

---

## 4. As 14 abas

A ordem é a de `Home.jsx`:

| # | Aba | Conteúdo |
|---|---|---|
| 1–9 | Blocos 1 a 9 | Questões Q1–Q28 da lista do professor |
| 10 | Equipamentos de Campo | 6 figuras para identificar |
| 11 | Partes do Teodolito | 7 partes numeradas em esquema SVG |
| 12 | Perfil de Nivelamento | 1 conceito + 2 cálculos de desnível/cota |
| 13 | Poligonal de Campo | Quadro interativo do levantamento + PDF |
| 14 | Fórmulas | Biblioteca de referência |

As abas 10–14 são "extras": não têm questões numeradas da lista, mas a aba 13 é o **mesmo tipo de problema da Q28** — resolvida de forma completa e auditável.

---

## 5. Como o app corrige cada tipo de resposta

A correção é **local e determinística** — não há IA avaliando respostas.

| `tipo` | Componente | Como valida | Tolerância |
|---|---|---|---|
| `calc` / `num` | `CalcRow` | `\|resposta − answer\| ≤ tol` (aceita vírgula decimal) | a do item (`tol`), geralmente 0,01–20 conforme a grandeza |
| `dms` / `dms3` | `DmsRow` | Converte ° ' " para decimal e compara | `DMS_TOL = 0,06°` (≈ 3,6′) |
| `rumo` | `RumoRow` | Quadrantes exatos (`q1`, `q2`) **e** graus dentro de 0,5° | ±0,5° |
| `xy` | `XyRow` | X **e** Y dentro da tolerância | a do item (0,5–0,6) |
| `mc` | `ChoiceRow` | Índice da opção escolhida | exata |
| `dissertativa` | `DissertativaRow` | Aluno escreve e marca "concluído" (mín. 3 caracteres) | — (autoavaliação) |

Detalhes que importam ao revisar:

- O item fica **bloqueado** (`disabled`) depois de acertado; errado, pode tentar de novo.
- A resolução (`sol`) fica **oculta** atrás do botão "Ver resolução" (`ToggleBox`) — errar não abre a solução automaticamente.
- O gabarito completo fica em `src/data/blocos.js`; o `ResultsPanel` mostra "sua resposta × gabarito × status × XP" de tudo o que foi respondido.
- Tolerância larga **não** significa conta aproximada: ela existe porque ângulos são digitados em ° ' " e o arredondamento decimal varia.

---

## 6. Blocos 1 a 9

> Em cada bloco: objetivo → método/fórmula → resoluções conferidas → erros comuns.
> As resoluções completas de cada item estão no campo `sol` em `src/data/blocos.js` e aparecem no app ao clicar em "Ver resolução".

### 6.1 Bloco 1 — Fundamentos (Q1–Q3, 11 itens, 56 XP)

Questões conceituais (dissertativas). Não há cálculo; o app apresenta uma **referência** para comparar com o que você escreveu.

- **Q1 — definições.** Topografia (representação de porção limitada, sem curvatura), levantamento topográfico (operações de campo), planta (representação gráfica em escala), memorial descritivo (documento com limites, coordenadas, área, confrontantes), escala (E = d : D).
- **Q2 — três aplicações na Agronomia.** Ex.: irrigação/drenagem pela declividade; georreferenciamento e divisão de imóveis rurais; terraceamento e curvas de nível; agricultura de precisão com GNSS.
- **Q3 — equipamentos.** Trena (distância direta), nível óptico (plano horizontal → desníveis), teodolito (ângulos H e V), estação total (ângulos + distância + cálculo de coordenadas), receptor GNSS (coordenadas por satélite).

**Erro comum:** trocar teodolito por estação total. Regra prática: **só a estação total mede distância eletronicamente** e calcula coordenadas em campo.

### 6.2 Bloco 2 — Conversões de unidades (Q4–Q6, 12 itens, 72 XP)

Base: **1 km = 1.000 m · 1 m = 100 cm · 1 ha = 10.000 m² · 1 km² = 100 ha = 1.000.000 m²**.

Resoluções conferidas:

| Item | Conta | Resposta |
|---|---|---|
| Q4a | 3,25 × 1.000 | 3.250 m |
| Q4b | 8.500 ÷ 1.000 | 8,5 km |
| Q4c | 125 ÷ 100 | 1,25 m |
| Q4d | 2,75 × 100 | 275 cm |
| Q4e | 0,45 × 1.000 | 450 m |
| Q5a | 5 × 10.000 | 50.000 m² |
| Q5b | 12.500 ÷ 10.000 | 1,25 ha |
| Q5c | 2,3 × 10.000 | 23.000 m² |
| Q5d | 45.000 ÷ 10.000 | 4,5 ha |
| Q5e | 0,75 × 10.000 | 7.500 m² |
| Q6a | 18,75 × 10.000 | 187.500 m² |
| Q6b | 18,75 ÷ 100 | 0,1875 km² |

**Erro comum:** confundir área com comprimento — em área o fator é **ao quadrado** (1 km² = 10⁶ m², não 10³).

### 6.3 Bloco 3 — Áreas de figuras simples (Q7–Q8, 5 itens, 30 XP)

- Retângulo: **A = base × altura**; **P = 2 × (base + altura)**.
- Q7a: 50 × 80 = **4.000 m²** · Q7b: 120 × 45 = **5.400 m²** · Q7c: 250 × 180 = **45.000 m²**.
- Q8: 150 × 80 = **12.000 m²**; P = 2 × (150 + 80) = **460 m**.

**Erro comum:** responder área quando se pede perímetro (Q8 tem os dois itens).

### 6.4 Bloco 4 — Sistema angular (Q9–Q10, 6 itens, 42 XP)

- Sexagesimal → decimal: **G = g + m/60 + s/3600**.
- Decimal → sexagesimal: parte inteira = graus; **resto × 60** = minutos; **parte inteira** dos minutos; **resto × 60** = segundos.

| Item | Conta | Resposta |
|---|---|---|
| Q9a | 45 + 30/60 | 45,5° |
| Q9b | 32 + 15/60 + 36/3600 | 32,26° |
| Q9c | 120 + 45/60 + 18/3600 | 120,755° |
| Q10a | 28,75° | 28°45′00″ |
| Q10b | 95,625° | 95°37′30″ |
| Q10c | 135,125° | 135°07′30″ |

**Erro comum:** ao voltar para sexagesimal, multiplicar o **resto inteiro** em vez do resto fracionário. O passo correto é sempre "guarda a parte inteira, multiplica **só o que sobrou** por 60".

### 6.5 Bloco 5 — Fórmula de Heron (Q11–Q12, 2 itens, 16 XP)

**s = (a + b + c)/2** e **A = √[s(s−a)(s−b)(s−c)]**.

- Q11 (50, 60, 70): s = 90 → A = √(90·40·30·20) = √2.160.000 ≈ **1.469,69 m²**.
- Q12 (90, 120, 150): s = 180 → A = √(180·90·60·30) = √29.160.000 = **5.400 m²**. Conferência: é um 3-4-5 multiplicado por 30 → triângulo retângulo, A = (90 × 120)/2 = 5.400.

**Erro comum:** esquecer a raiz no final, ou usar s em vez de (s−a), (s−b), (s−c).

### 6.6 Bloco 6 — Trigonometria (Q13, 5 itens, 30 XP)

Ângulos notáveis (decore a tabela, ela reaparece em todas as projeções):

| Ângulo | sen | cos | tg |
|---|---|---|---|
| 30° | 0,5 | 0,8660 | 0,5774 |
| 45° | 0,7071 | 0,7071 | 1 |
| 60° | 0,8660 | 0,5 | 1,7321 |

Respostas: Q13a **0,5** · Q13b **0,7071** · Q13c **1,7321** · Q13d **0,8660** · Q13e **0,8660**.

### 6.7 Bloco 7 — Rumo e Azimute (Q14–Q16, 12 itens, 104 XP)

**Rumo (R)** é o ângulo agudo com a linha Norte–Sul, sempre com quadrante (N/S + E/W). **Azimute (Az)** é contado a partir do **Norte, no sentido horário**, de 0° a 360°.

Conversões (as quatro que o app cobra):

| Quadrante | R → Az | Az → R |
|---|---|---|
| NE | Az = R | R = Az |
| SE | Az = 180° − R | R = 180° − Az |
| SW | Az = 180° + R | R = Az − 180° |
| NW | Az = 360° − R | R = 360° − Az |

- **Q14** rumo → azimute: N25°E → **25°**; S40°E → **140°**; S15°W → **195°**; N70°W → **290°**.
- **Q15** azimute → rumo: 35° → **N35°E**; 120° → **S60°E**; 210° → **S30°W**; 315° → **N45°W**.
- **Q16** azimute de ré: `Az < 180° → +180°`; `Az ≥ 180° → −180°`. Resultados: **225°, 300°, 45°, 150°**.

**Erro comum nº 1 do bloco:** escolher o quadrante pelos valores do enunciado em vez dos sinais de ΔX/ΔY (ΔX = leste/oeste, ΔY = norte/sul). ΔX(+) e ΔY(+) é NE; ΔX(+) e ΔY(−) é SE; ambos negativos é SW; ΔX(−) e ΔY(+) é NW.

### 6.8 Bloco 8 — Distâncias, azimutes e coordenadas (Q17–Q23, 7 itens, 66 XP)

Fórmulas centrais (note a ordem: **ΔX usa seno, ΔY usa cosseno** — porque o azimute é contado do Norte):

```text
ΔX = XB − XA        ΔY = YB − YA
d  = √(ΔX² + ΔY²)
R  = arctg(|ΔX| / |ΔY|)      → quadrante pelos sinais
ΔX = d × sen(Az)            ΔY = d × cos(Az)
Xn = Xn−1 + ΔX              Yn = Yn−1 + ΔY
```

- **Q17:** perímetro = 120 + 95 + 140 + 100 + 110 = **565 m**.
- **Q18:** A(100,200), B(180,260) → √(80² + 60²) = √10.000 = **100 m**.
- **Q19:** C(250,150), D(400,350) → √(150² + 200²) = √62.500 = **250 m**.
- **Q20:** A(100,100), B(180,220) → ΔX = 80, ΔY = 120 → arctg(80/120) = **33,69°** (NE).
- **Q21:** C(350,450), D(180,320) → ΔX = −170, ΔY = −130 → arctg(170/130) = 52,59° → SW → Az = 180 + 52,59 = **232,59°**.
- **Q22:** A(1000,1000), Az 35°, d 120 → ΔX = 120·sen35° = 68,83; ΔY = 120·cos35° = 98,30 → **B(1068,83; 1098,30)**.
- **Q23:** B(1250,950), Az 120°, d 85 → ΔX = 85·sen120° = 73,61; ΔY = 85·cos120° = −42,50 → **C(1323,61; 907,50)**.

**Erro comum:** trocar seno e cosseno. Teste rápido: azimute 0° deve dar ΔX = 0 e ΔY = +d (norte puro) — se sua fórmula não faz isso, está invertida.

### 6.9 Bloco 9 — Poligonais fechadas (Q24–Q28, 21 itens, 514 XP)

Este é o bloco mais pesado e o que mais cai em prova. A sequência de resolução é **sempre a mesma** (é a mesma da aba 13):

1. **Fechamento angular** → 2. **Azimutes** → 3. **Projeções** → 4. **Erro linear** → 5. **Correção (compasso)** → 6. **Coordenadas** → 7. **Área (Gauss)**.

#### Q24 — perímetro por coordenadas (12 XP)

A(100,100) B(250,100) C(300,220) D(180,300) E(80,200):

```text
AB = 150,00
BC = √(50² + 120²) = 130,00
CD = √(120² + 80²) ≈ 144,22
DE = √(100² + 100²) ≈ 141,42
EA = √(20² + 100²)  ≈ 101,98
P  ≈ 667,62 m
```

#### Q25 — área de Gauss (14 XP)

**2A = Σ Yn × (Xn−1 − Xn+1)**, vértice por vértice (vizinho anterior menos vizinho seguinte):

```text
A: 100 × (150 − 300) = −15.000
B: 100 × (100 − 350) = −25.000
C: 250 × (300 − 150) = +37.500
D: 300 × (350 − 100) = +75.000
2A = 72.500  →  A = 36.250 m²
```

#### Q26 — fechamento angular (16 XP)

Ângulos: A 110°15′20″, B 98°20′40″, C 125°10′30″, D 112°05′10″, E 94°08′20″.

- Soma teórica: (5−2) × 180° = **540°**.
- Soma observada: somar **graus, minutos e segundos separadamente** e transportar: 539° + 58′ + 120″ → 120″ = 2′ → 60′ = 1° → **540°00′00″**.
- Erro angular = **0°00′00″** (a poligonal fecha exata).

**Erro comum:** somar 110,15 + 98,20 como decimais. Graus, minutos e segundos **não** são decimais — 58′ + 2′ = 60′ = 1° é o transporte que se esquece.

#### Q27 — azimutes em caminhamento (20 XP)

**Az(seguinte) = Az(anterior) + Ai(no vértice de partida do alinhamento seguinte) + 180°** — subtraindo 360° quando passar.

```text
Az.AB = 40°00′00″ (dado)
Az.BC = 40 + 115°20′ + 180 = 335°20′      = 335,333°
Az.CD = 335°20′ + 92°40′ + 180 = 608°00′ − 360° = 248°00′  = 248,000°
Az.DE = 248 + 118°10′ + 180 = 546°10′ − 360° = 186°10′     = 186,167°
Az.EA = 186°10′ + 104°50′ + 180 = 471°00′ − 360° = 111°00′ = 111,000°
```

#### Q28 — poligonal fechada completa (30 XP)

Dados: AB 120, BC 95, CD 130, DE 110, EA 100 (m); ângulos A 108°15′20″, B 115°42′10″, C 95°18′40″, D 121°24′30″, E 99°19′20″; Az.AB = 45°; A = (1000, 1000).

Respostas conferidas:

| Etapa | Resultado |
|---|---|
| Erro angular | ∑Am = 540°00′00″ → erro **0** |
| Az.BC | **340,703°** |
| Az.CD | **256,014°** |
| Az.DE | **197,422°** |
| Az.EA | **116,744°** |
| B | **(1084,85; 1084,85)** |
| C | **(1053,46; 1174,52)** |
| D | **(927,31; 1143,10)** |
| E | **(894,38; 1038,14)** |
| Perímetro | **555 m** |
| Erro linear | ≈ **17,70 m** |
| Área (Gauss) | ≈ **21.474,30 m²** |

> ⚠️ As coordenadas e o erro linear foram calculados com azimutes arredondados ao milésimo de grau; por isso as tolerâncias são de 0,6 m. Ao refazer à mão com ° ′ ″, diferenças de poucos centímetros são esperadas.

---

## 7. Dinâmicas visuais (abas 10 a 12)

### 7.1 Equipamentos de Campo (6 itens, 36 XP)

Seis figuras geradas a partir do material; o aluno escolhe entre quatro opções. Gabarito:

| Figura | Resposta | Por que |
|---|---|---|
| 1 | **Trena** | fita graduada enrolada, medição direta |
| 2 | **Nível óptico** | só linha horizontal; não mede ângulo horizontal |
| 3 | **Teodolito** | ângulos H e V, sem EDM |
| 4 | **Estação total** | teodolito + distanciômetro + processador |
| 5 | **Receptor GNSS (GPS)** | antena/satélites |
| 6 | **Mira estadimétrica** | régua graduada vertical sobre o ponto |

**Critério de discriminação:** presença de luneta + círculos graduados (teodolito), presença de teclado/visor e EDM (estação total), ausência de qualquer círculo horizontal (nível).

### 7.2 Partes do Teodolito (7 itens, 56 XP)

Esquema SVG com 7 chamadas numeradas (`TheodoliteDiagram`):

1. **Luneta de visada** · 2. **Círculo vertical** · 3. **Nível de bolha** · 4. **Círculo horizontal** · 5. **Parafusos calantes** · 6. **Tripé** · 7. **Fio de prumo**.

**Erro comum:** trocar círculo horizontal por vertical. Horizontal = plano da planta (ângulos entre alinhamentos); vertical = plano da visada (inclinação, distância vertical).

### 7.3 Perfil de Nivelamento (3 itens, 24 XP)

Diagrama de perfil (`ProfileDiagram`) com o nível entre A e B.

- A linha tracejada do instrumento às miras é a **linha de visada (eixo de colimação)**, considerada horizontal.
- **Δh = L(ré) − L(vante)** → 2,15 − 0,95 = **+1,20 m** (B está acima de A).
- **Cota B = cota A + Δh = 101,20 m**; conferência por **HI = cota A + L(ré) = 102,15 m** e **cota B = HI − L(vante) = 101,20 m**.

**Erro comum:** somar as duas leituras. Em nivelamento geométrico, **subtrai-se**; e quanto mais alto o ponto, **menor** a leitura na mira.

---

## 8. Aba 13 — Poligonal de campo

Arquivos: `src/components/caderneta/poligonal/*` e `src/lib/poligonal.js`.

### 8.1 O que o painel faz

- Tabela editável com **ponto, alinhamento, ângulo interno (° ′ ″) e distância (m)**; botões **+ vértice / − vértice** (mínimo 3); campos de **azimute inicial (1-2)** e **coordenadas do ponto 1**.
- Cada tecla digitada recalcula **tudo em tempo real** (`useMemo` sobre `computePoligonal`).
- Resultado em três camadas: **chips de resumo**, **quadro calculado e corrigido** e **resolução expandida em 7 etapas** (acordeões).
- Botão **Exportar PDF** gera `poligonal-de-campo.pdf` (A4) com resumo, quadro e **todas as etapas já expandidas**.

### 8.2 O motor, etapa por etapa (`computePoligonal`)

Sejam `n` vértices, `Ai` o ângulo interno de cada vértice e `d` a distância do alinhamento.

**Etapa 1 — Fechamento angular**

```text
∑(Ai) teórica = (n − 2) × 180°
e  = ∑(Am) − ∑(Ai)          (erro angular)
c  = −e / n                 (correção por vértice, distribuída igualmente)
Ai_corrigido = Ai + c
```

O app avisa quando |e| > 1′ por vértice (limite didático de conferência).

**Etapa 2 — Azimutes**

```text
Az(1-2) = azimute inicial (dado de campo)
Az(seguinte) = Az(anterior) + Ai_corrigido(do vértice de partida) + 180°   (mód 360)
```

No motor, `az[i] = az[i-1] + aiCorr[i] + 180` — isto é, o ângulo usado é o **do vértice onde o alinhamento seguinte começa**. A conferência fecha quando `Az(último) + Ai(ponto 1) + 180°` devolve `Az(1-2)`.

**Etapa 3 — Projeções**

```text
ΔX = d × sen(Az)        ΔY = d × cos(Az)
```

**Etapa 4 — Erros de fechamento**

```text
∑ΔX, ∑ΔY  →  erro linear El = √(∑ΔX² + ∑ΔY²)
P = Σd      →  precisão = P / El   (exibida como 1 : P/El)
```

**Etapa 5 — Correção pela regra do compasso**

Distribui o erro **proporcionalmente ao comprimento de cada alinhamento**:

```text
c(ΔX) = −∑ΔX × (d / P)
c(ΔY) = −∑ΔY × (d / P)
ΔXc = ΔX + c(ΔX)     ΔYc = ΔY + c(ΔY)
```

**Etapa 6 — Coordenadas**

```text
X1, Y1 = ponto de partida (informado)
Xn+1 = Xn + ΔXc      Yn+1 = Yn + ΔYc
```

**Etapa 7 — Área pelo método de Gauss**

```text
2A = Σ Yn × (Xn−1 − Xn+1)
A  = |2A| / 2      (m²)      A/10.000 = ha
```

### 8.3 Valores pré-preenchidos (levantamento do Grupo 1)

O preset veio de uma **foto borrada do quadro**. O app avisa isso na descrição da aba. **Nada aqui deve ser tratado como verdade absoluta** — conferir cada ângulo e distância com a caderneta de campo original é o primeiro passo antes de usar o resultado (ver §13).

### 8.4 Exportação em PDF (`pdfExport.jsx`)

- Renderiza uma cópia do quadro e das etapas **fora da tela** (`PoligonalResults` com `expanded`), força a paleta clara (legível mesmo no tema escuro) e captura com `html2canvas`.
- Fatiamento em A4 com `jsPDF`, **quebrando páginas somente entre blocos** (resumo, quadro, cada etapa) — nenhuma etapa é cortada no meio.
- Nome do arquivo: `poligonal-de-campo.pdf`.
- **Arquivamento no Google Drive (conector compartilhado, conta do dono do app):** depois de gerar o PDF, o painel envia o arquivo em base64 para a função `salvarPdfPoligonalDrive`, que grava na pasta **“Caderneta Topografia”** (criada na primeira vez) com data e hora no nome — `poligonal-de-campo-AAAA-MM-DD-HHMM.pdf`. O resultado (sucesso ou falha) aparece abaixo do cabeçalho do quadro; o download local continua acontecendo em qualquer caso. Escopo OAuth: `drive.file` (só arquivos criados pelo app).

---

## 9. Aba 14 — Biblioteca de fórmulas

`src/components/caderneta/FormulasPanel.jsx`, em 8 grupos:

1. **Escala · comprimento · área** — E = d : D; 1 km = 1.000 m; 1 ha = 10.000 m².
2. **Áreas de figuras simples** — retângulo, triângulo, Heron.
3. **Sistema angular** — conversões nos dois sentidos.
4. **Ângulos notáveis** — 30°, 45°, 60°.
5. **Rumo ⇄ azimute** — quatro quadrantes + azimute de ré.
6. **Distâncias, azimutes e coordenadas** — d, R, projeções, coordenadas.
7. **Poligonal fechada** — fechamento, azimutes, erros, compasso, Gauss.
8. **Nivelamento geométrico** — Δh, HI, cotas.

É a referência que o **Modo Prova** deveria usar como base (ver §11).

---

## 10. Convenções que evitam a maioria dos erros

1. **Azimute nasce no Norte e cresce em sentido horário.** Consequência direta: **ΔX = d·sen(Az)** e **ΔY = d·cos(Az)**.
2. **X é leste, Y é norte.** Rumo = arctg(|ΔX|/|ΔY|) — ΔX em cima.
3. **Quadrante pelos sinais**, nunca pelo texto do enunciado.
4. **Ângulos internos somam (n−2)·180°** em poligonal fechada; o transporte de minutos e segundos é obrigatório.
5. **Correção do erro angular é distribuída por igual** (−e/n); **correção de projeções é proporcional à distância** (compasso).
6. **Erro linear ≠ erro angular**: um é ângulo, o outro é metro.
7. **Precisão = P/El** — quanto maior o número, melhor o levantamento.
8. **Área de Gauss** usa vizinho anterior menos vizinho seguinte, e o resultado final é metade do somatório em módulo.
9. **ha** é área (10.000 m²); **km** é comprimento. Nunca converter um no outro sem quadrado.
10. **Nivelamento:** Δh = ré − vante; ponto mais alto lê **menos** na mira.
11. **Tolerância do app não é licença para arredondar cedo.** Arredonde só na resposta final.
12. **Sempre confira pelo caminho inverso** quando possível (ex.: azimute de ré, soma dos ângulos, área por dois métodos).

---

## 11. Modo Prova (planejado — ainda não implementado)

O projeto registrou a intenção de criar um **modo Prova** que sorteia exercícios das abas 1–13 usando a biblioteca de fórmulas da aba 14 (revisão dirigida, cronômetro, correção item a item e relatório de pontos fracos).

**Status real hoje:** não existe. Em `src/pages/Home.jsx` só há as 14 abas descritas; não há tela, rota ou lógica de sorteio. Qualquer agente que for implementar isso deve:

- sortear **itens** (não blocos) respeitando `tipo` e `tol` já existentes;
- **não alterar** o formato de `registerAttempt` sem migrar a chave `caderneta_topografia_v2`;
- exibir a resolução **depois** da correção, como no modo estudo;
- manter a aba 14 como fonte única das fórmulas (sem duplicar texto).

Até lá, o "simulado" é feito manualmente: percorrer as abas, responder sem abrir a resolução e conferir no **painel de resultados**.

---

## 12. Protocolo de diagnóstico de aprendizagem

> Objetivo: descobrir **onde** o erro acontece — não presumir **por que** o aluno vai mal. A última prova não está registrada no app; portanto, **o app não sabe o motivo da queda de rendimento** e nenhum agente deve afirmá-lo.

### 12.1 Dados que o app realmente fornece

- Para cada item respondido: `attempts` (quantas tentativas), `correct`, `xp`, `xpGiven` e **a última resposta digitada**.
- `ResultsPanel`: tabela "questão · item · sua resposta · gabarito · status · XP".
- `HUD`: XP, sequência atual, melhor sequência, itens fechados.

Limitações honestas: **não há histórico de todas as tentativas**, **não há tempo por questão**, **não há registro da prova** e os dados vivem **apenas neste navegador** (limpar dados do site apaga tudo).

### 12.2 Como usar esses dados

1. Abra o painel de resultados e liste os itens com status **revisar**.
2. Classifique cada erro em uma destas categorias (são mutuamente exclusivas e verificáveis):

| Categoria | Como reconhecer no app |
|---|---|
| **Unidade / escala** | resposta com fator 10, 100, 1.000 ou 10.000 fora (blocos 2 e 3) |
| **Conversão angular** | erro só nos itens `dms`/`dms3` (blocos 4 e 9) |
| **Escolha de fórmula** | acerta o método em um contexto e erra no vizinho (ex.: Heron × retângulo) |
| **Convenção de azimute** | rumos certos, azimutes com 180°/360° trocados (bloco 7) |
| **sen × cos** | coordenadas com ΔX e ΔY invertidos (Q22, Q23, Q28) |
| **Transporte de 60** | somas de ângulos que "quase" fecham (Q26, Q28) |
| **Aritmética** | método correto, conta final errada por pouco |
| **Leitura do enunciado** | responde perímetro quando se pede área, etc. |

3. Para cada categoria com erro, peça ao aluno que **narre os passos em voz alta** (ou por escrito) em um item novo do mesmo tipo. O erro aparece na narração antes de aparecer no número.
4. Só depois de identificar a categoria proponha um treino específico (ex.: 5 conversões de azimute, 3 fechamentos angulares).

### 12.3 Perguntas que um agente deve fazer (e não responder por conta própria)

- "Na prova, o enunciado pedia área, perímetro, azimute ou coordenadas?"
- "Você chegou a desenhar o croqui com Norte para cima?"
- "Somou os ângulos em graus decimais ou em ° ′ ″?"
- "Conferiu o sinal de ΔX e ΔY antes de escolher o quadrante?"
- "Quanto tempo você teve e quantas questões eram?"

Sem essas respostas, qualquer explicação sobre "por que a curva de aprendizado está baixa" é **especulação**.

---

## 13. Dados a conferir e pendências conhecidas

1. **Preset da aba 13** — ângulos e distâncias foram lidos de uma **foto borrada do quadro branco**. Conferir contra a caderneta original antes de confiar nos resultados. A extração automática por visão falhou e foi abandonada de propósito (entrada manual).
2. **Q28** — coordenadas, erro linear (17,70 m) e área (21.474,30 m²) usam azimutes arredondados; tolerâncias de 0,6 m / 80 m² existem por isso.
3. **Tolerâncias** — calibradas para digitação em ° ′ ″ e vírgula decimal; se um item novo for criado, defina `tol` coerente com a grandeza (metros: 0,5; ângulos: 0,1–0,3°; áreas: 1–80 m²).
4. **Modo Prova** — descrito como decisão, **não implementado** (§11).
5. **Sem backend** — não há entidades, funções ou sincronização entre dispositivos. Se isso for necessário, é uma decisão nova, não uma correção.

---

## 14. Glossário

- **Azimute** — ângulo desde o Norte, horário, 0–360°.
- **Rumo** — ângulo agudo com N–S, com quadrante.
- **Azimute de ré** — azimute do sentido contrário (±180°).
- **Ângulo interno** — ângulo entre dois alinhamentos consecutivos, medido no vértice.
- **Caminhamento** — percurso pelos vértices; o azimute seguinte depende do ângulo no vértice de partida.
- **Projeção (ΔX, ΔY)** — componentes leste e norte de um alinhamento.
- **Erro angular** — diferença entre soma observada e teórica.
- **Erro linear** — distância entre o ponto final calculado e o inicial.
- **Regra do compasso** — distribui o erro linear proporcionalmente às distâncias.
- **Método de Gauss** — área por somatório de coordenadas.
- **Fechamento** — verificação de que a poligonal volta ao ponto de partida.
- **HI (altura do instrumento)** — cota do eixo óptico do nível.
- **Ré / vante** — leitura de costas (ponto conhecido) e de frente (ponto novo).
- **Estação total** — teodolito + distanciômetro + processador.
- **GNSS** — posicionamento por satélites (GPS é um deles).

---

## 15. Checklist para quem for editar o app

**Novo exercício num bloco** (`src/data/blocos.js`):

1. `id` único e estável (o progresso salvo depende dele).
2. Escolha o `tipo`: `calc`, `num`, `dms`, `dms3`, `rumo`, `xy`, `mc` ou `dissertativa`.
3. Preencha os campos exigidos pelo tipo:
   - `calc`/`num`: `answer`, `tol`, `unit`;
   - `dms`/`dms3`: `d`, `m`, `s`;
   - `rumo`: `q1`, `deg`, `q2`;
   - `xy`: `ansX`, `ansY`, `tol`;
   - `mc`: `options`, `answer` (índice), opcional `img`;
   - `dissertativa`: `ref`.
4. Escreva `sol` passo a passo, uma linha por operação, com unidades — é o material de estudo real.
5. Recalcule **à mão** e confira com a tolerância antes de publicar.

**Novo bloco/aba:** adicione o objeto em `BLOCOS`/`VISUAL_BLOCOS`; `Home` e `TabNav` se ajustam sozinhos. Não crie rota nova — o app tem uma página só.

**Novo diagrama:** crie um componente em `diagrams/` e registre em `Diagram.jsx` (mapa `diagramId → componente`).

**Poligonal:** mudanças de fórmula vão em `src/lib/poligonal.js`; a UI só exibe. Ao alterar etapas, confira também `PoligonalResults` e o PDF (`expanded`).

**Regra de ouro:** não mude `useProgress` (chave, formato) sem migração; não duplique fórmulas fora de `poligonal.js` e `FormulasPanel.jsx`; mantenha o texto das resoluções em português e com as unidades.

---

## 16. Histórico de decisões do projeto

- **Uso individual**, sem login próprio, sem ranking coletivo; progresso em `localStorage`.
- **Identidade "Caderneta de Campo"**: papel antigo, tons terrosos, HUD de LCD, selo "RESOLVIDO" animado.
- **Correção local e determinística** por tipo de item, com tolerância explícita.
- **Extração automática da foto do quadro abandonada** (visão não conseguiu ler os números) → entrada manual + aviso na aba.
- **Diagramas SVG interativos** para equipamentos e nivelamento.
- **Poligonal de campo com resolução expandida** em 7 etapas, quadro dinâmico e exportação em PDF com quebra de página entre blocos.
- **Aba de fórmulas** como referência única da disciplina.
- **Modo Prova** aprovado como ideia, ainda não construído.

---

*Este guia deve ser atualizado sempre que um bloco, fórmula, tolerância ou tela mudar. Ao colaborar, comece lendo §5, §6 e §10 — são as seções que evitam a maior parte dos erros de cálculo e de interpretação.*