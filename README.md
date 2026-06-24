# PrecoBOT — Análise de Preços para Marketplaces Brasileiros

Sistema completo de scraping e inteligência de preços para marketplaces brasileiros. Coleta produtos automaticamente, filtra por relevância, calcula métricas de precificação, analisa avaliações de clientes e gera conteúdo com IA.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades](#funcionalidades)
3. [Arquitetura do Sistema](#arquitetura-do-sistema)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Tecnologias Utilizadas](#tecnologias-utilizadas)
6. [Instalação e Configuração](#instalação-e-configuração)
7. [Como Executar](#como-executar)
8. [Como Funciona — Fluxo Completo](#como-funciona--fluxo-completo)
9. [Páginas e Funcionalidades](#páginas-e-funcionalidades)
10. [Motor de Análise de Preços](#motor-de-análise-de-preços)

---

## Visão Geral

O PrecoBOT é dividido em três processos independentes que se comunicam via HTTP:

```
Navegador (React) → FastAPI (porta 8000) → Servidor de Scraping (porta 8001)
```

Essa separação existe porque o Playwright (biblioteca usada para automação do Chrome), não consegue compartilhar o event loop assíncrono com o FastAPI no Windows. Rodando como processos separados, cada um tem seu próprio loop sem conflitos.

---

## Funcionalidades

### Página de Pesquisa
- Busca em múltiplos marketplaces simultaneamente
- **Filtro estrito**: a busca continua recursivamente até encontrar a quantidade solicitada de produtos que contenham **todas** as palavras da query
- Remoção individual de produtos com o botão ✕
- Preço de compra configurável (usado na análise de viabilidade)
- Análise de preços em tempo real: mínimo, máximo, média, mediana, média IQR

### Produto Perfeito
- Análise separada por marketplace com logos oficiais
- Visão geral consolidada de todos os marketplaces
- **Configuração de custos** por marketplace (comissão, impostos, taxa fixa, frete, outros) — salva automaticamente no navegador
- Indicador de viabilidade (verde/vermelho) baseado no preço de compra
- Margem líquida estimada após todos os custos
- Preço mínimo viável calculado automaticamente
- **Descrição profissional** gerada por IA a partir das 5 primeiras descrições coletadas
- **Avaliações por estrela** (1★ a 5★) coletadas automaticamente do Mercado Livre
- **Sugestões de melhoria** geradas por IA com base nas avaliações reais
- **Geração de imagem** 720×720 sob demanda com botão de download

### Motor de Preços
- Filtro IQR para remoção de outliers antes de calcular a média
- Piso competitivo (preço abaixo dos 20% mais baratos do mercado)
- Cálculo de preço mínimo viável considerando todos os custos em comparação com concorrentes

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────┐
│  Navegador — React + Vite (porta 5173)              │
│  SearchPage · PerfectProductPage · AccountPage      │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP (proxy Vite em dev)
                    ▼
┌─────────────────────────────────────────────────────┐
│  Backend — FastAPI (porta 8000)                     │
│  /api/v1/search/                                    │
│  /api/v1/produto-perfeito/                          │
│  /api/v1/produto-perfeito/gerar-imagem              │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP interno (porta 8001)
                    ▼
┌─────────────────────────────────────────────────────┐
│  Servidor de Scraping — FastAPI (porta 8001)        │
│  /scrape          → coleta produtos                 │
│  /scrape-reviews  → coleta avaliações por estrela   │
└───────────────────┬─────────────────────────────────┘
                    │ subprocess + Playwright CDP
                    ▼
┌─────────────────────────────────────────────────────┐
│  Chrome (modo debug remoto, porta 9222)             │
│  Lançado automaticamente pelo scraper               │
└─────────────────────────────────────────────────────┘
```

---

## Estrutura de Arquivos

```
Product_Pricing_Project/
│
├── src/
│   └── scraper.py                  
│
├── scraper_server.py               ← Servidor de scraping independente (porta 8001)
│
├── backend/
│   ├── app/
│   │   ├── main.py                 ← Entry point do FastAPI
│   │   │
│   │   ├── api/routes/
│   │   │   ├── search.py           ← POST /search/ (busca + filtro recursivo)
│   │   │   ├── perfect_product.py  ← POST /produto-perfeito/ e /gerar-imagem
│   │   │   └── auth.py             ← Rotas de autenticação (preparadas, não ativas)
│   │   │
│   │   ├── core/
│   │   │   ├── config.py           ← Lê variáveis do .env via pydantic-settings
│   │   │   ├── security.py         ← JWT, hash de senha (preparado para auth)
│   │   │   └── constants.py        ← CONFIGURAÇÕES GLOBAIS (limites, chave de IA)
│   │   │
│   │   ├── db/
│   │   │   └── session.py          ← Engine async do SQLAlchemy (para quando o DB for ativado)
│   │   │
│   │   ├── models/
│   │   │   └── models.py           ← Tabelas: User, Search, Result, PriceSnapshot
│   │   │
│   │   ├── schemas/
│   │   │   └── schemas.py          ← Validação Pydantic de request/response
│   │   │
│   │   └── services/
│   │       ├── analytics.py        ← Motor de preços (IQR, viabilidade, custos)
│   │       ├── scraper_bridge.py   ← Chama o servidor de scraping via HTTP
│   │       ├── review_scraper.py   ← Chama /scrape-reviews no servidor
│   │       └── ai_service.py       ← Integração com IA (descrição, melhorias, imagem)
│   │
│   ├── alembic/                    ← Migrações de banco de dados
│   ├── tests/
│   │   └── test_analytics.py       ← Testes unitários do motor de preços
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic.ini
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 ← Roteamento das páginas
│   │   ├── main.tsx                ← Entry point React
│   │   │
│   │   ├── pages/
│   │   │   ├── SearchPage.tsx      ← Página principal de busca
│   │   │   ├── PerfectProductPage.tsx ← Análise completa do produto
│   │   │   └── AccountPage.tsx     ← Placeholder para conta/login
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── AppLayout.tsx   ← Header (desktop) + nav inferior (mobile)
│   │   │   └── ui/
│   │   │       ├── MarketplaceBadge.tsx ← Logo do marketplace com fallback
│   │   │       └── CostsPanel.tsx  ← Painel colapsável de custos por marketplace
│   │   │
│   │   ├── store/
│   │   │   ├── searchStore.ts      ← Estado global da busca (Zustand)
│   │   │   └── costsStore.ts       ← Custos por marketplace (persiste no localStorage)
│   │   │
│   │   └── lib/
│   │       ├── api.ts              ← Cliente Axios com injeção automática de JWT
│   │       └── types.ts            ← Interfaces TypeScript + dados dos marketplaces
│   │
│   ├── vite.config.ts              
│   ├── tailwind.config.js
│   └── package.json
│
├── infra/
│   └── nginx.conf                  ← Config Nginx para produção
│
├── docker-compose.yml              ← Sobe tudo com Docker (para deploy)
├── .env.example                    ← Template de variáveis de ambiente
└── .gitignore
```

---

## Instalação e Configuração

### Pré-requisitos
- Python 3.12+
- Node.js 22+
- Google Chrome instalado em `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Git

### 1. Clone o repositório

```bash
git clone <url-do-seu-repositorio>
cd Product_Pricing_Project
```

### 2. Configure o ambiente do backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure o arquivo .env

Copie o template e preencha:

```bash
cp .env.example .env
```

Conteúdo mínimo para rodar sem banco de dados:

```env
DATABASE_URL=not_configured
SECRET_KEY=not_configured
ENVIRONMENT=development
ALLOWED_ORIGINS=["http://localhost:5173"]
```

### 4. Configure o frontend

```bash
cd frontend
npm install
```

### 5. Corrija o proxy do Vite para desenvolvimento local

Abra `frontend/vite.config.ts` e certifique-se que o proxy aponta para:

```typescript
target: 'http://127.0.0.1:8000',
```

---

## Como Executar

Você precisa de **3 terminais** rodando simultaneamente:

### Terminal 1 — Servidor de Scraping

```bash
python scraper_server.py
```

Verifique em: http://localhost:8001/health
Resposta esperada: `{"status":"ok","servico":"scraper"}`

### Terminal 2 — Backend FastAPI

```bash
cd backend
set PYTHONPATH=.                    # Windows
# export PYTHONPATH=.              # Mac/Linux

uvicorn app.main:app --reload --port 8000
```

Verifique em: http://localhost:8000/health
Documentação da API: http://localhost:8000/docs

### Terminal 3 — Frontend React

```bash
cd frontend
npm run dev
```

Acesse: http://localhost:5173

---

## Como Funciona — Fluxo Completo

### Busca de produtos

```
1. Usuário digita "Samsung Galaxy A15 128GB" e clica Buscar
2. SearchPage.tsx → api.post('/search/') via Axios
3. Vite intercepta e redireciona para http://127.0.0.1:8000/api/v1/search/
4. FastAPI recebe em routes/search.py → run_search()
5. scraper_bridge.py faz POST http://localhost:8001/scrape
6. scraper_server.py importa seu scraper.py e chama run_scraper()
7. scraper.py lança Chrome via subprocess, conecta via Playwright CDP
8. Chrome navega no marketplace, BeautifulSoup extrai os dados
9. Resultados sobem de volta: scraper → scraper_server → bridge → route
10. Se filtro estrito ativo: repete até ter produtos suficientes (máx. 5 tentativas)
11. analytics.py filtra outliers (IQR) e calcula todas as métricas
12. JSON retorna ao frontend → Zustand (searchStore) guarda em memória
13. React re-renderiza os cards de resultado
```

### Produto Perfeito

```
1. Usuário clica "Gerar Produto Perfeito"
2. PerfectProductPage lê resultados do Zustand (sem nova busca)
3. Lê configuração de custos do costsStore (localStorage)
4. POST /api/v1/produto-perfeito/ com resultados + custos + preço de compra
5. perfect_product.py agrupa por marketplace e calcula viabilidade
6. review_scraper.py pede ao scraper_server para coletar avaliações
7. scraper_server abre o produto mais bem avaliado, navega pela página
8. Para cada estrela (5→1): abre dropdown, filtra, coleta N comentários
9. ai_service.py chama a IA (se configurada) para descrição e melhorias
10. PerfectProductResponse retorna com tudo consolidado
11. Frontend exibe cards por marketplace com indicadores visuais
```

### Geração de imagem (sob demanda)

```
1. Usuário clica "Gerar imagem do produto"
2. POST /api/v1/produto-perfeito/gerar-imagem
3. ai_service.generate_image_prompt() chama sua API de imagem
4. URL da imagem retorna e é exibida + botão de download
```

---

## Motor de Análise de Preços

Localizado em `backend/app/services/analytics.py`.

### Métricas calculadas

| Métrica | Fórmula / Descrição |
|---|---|
| `min_price` | Menor preço entre todos os resultados |
| `max_price` | Maior preço |
| `mean_price` | Média simples (inclui outliers) |
| `median_price` | Valor do meio quando ordenados |
| `iqr_mean` | Média após remover outliers via filtro IQR — mais confiável |
| `competitive_floor` | Preço 1% abaixo do percentil 20 dos menores preços |
| `suggested_price_*` | `iqr_mean × (1 + markup%)` para 10%, 20% e 30% |
| `minimum_viable_price` | Menor preço de venda onde o vendedor não tem prejuízo |
| `is_viable` | `true` se `iqr_mean >= minimum_viable_price` |

### Filtro IQR (remoção de outliers)

```
1. Ordena os preços
2. Calcula Q1 (25%) e Q3 (75%)
3. IQR = Q3 - Q1
4. Remove preços abaixo de Q1 - 1.5×IQR ou acima de Q3 + 1.5×IQR
5. Calcula a média dos preços restantes
```

Isso evita que listagens falsas (R$1,00) ou absurdamente caras distorçam a análise.

### Cálculo de viabilidade

```
Preço mínimo viável = (preço_compra + taxa_fixa + frete + outros)
                      ÷ (1 - comissão% - impostos%)

Se iqr_mean >= preço_mínimo_viável → VIÁVEL (verde)
Se iqr_mean <  preço_mínimo_viável → INVIÁVEL (vermelho)
```
---

### Nota metodológica das avaliações

> A análise é gerada com base nas avaliações reais de clientes, agrupadas por nota (1 a 5 estrelas). A IA identifica padrões de satisfação e insatisfação para sugerir melhorias objetivas.

---

## Licença

Projeto privado. Todos os direitos reservados.