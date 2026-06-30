FROM python:3.12-slim

WORKDIR /app

# 1. Instala dependências básicas do sistema necessárias para o Chrome/SeleniumBase
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc wget curl gnupg unzip libgconf-2-4 libxi6 xvfb \
    && rm -rf /var/lib/apt/lists/*

# 2. Copia e instala as dependências do Python (onde devem estar o playwright e o seleniumbase)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Instala os binários do Playwright E as dependências de sistema do navegador (crucial no Linux)
RUN playwright install chromium
RUN playwright install-deps chromium

# 4. Configuração extra para o SeleniumBase (Undetected ChromeDriver) rodar liso no Docker
# Baixa e instala o Google Chrome estável oficial do Linux
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/default/google-compose-chrome \
    && apt-get update && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Evita que o SeleniumBase tente baixar o driver toda vez ou dê erro de Sandbox
ENV SB_HEADLESS=True
ENV PYTHONUNBUFFERED=1

COPY . .

# Expõe a porta interna do servidor do scraper
EXPOSE 8001

# Comando para iniciar o scraper_server.py
CMD ["uvicorn", "scraper_server:app", "--host", "0.0.0.0", "--port", "8001", "--loop", "asyncio"]