import asyncio
import httpx

# Configure suas credenciais diretamente aqui para o teste acelerado
AI_API_KEY = ""

# ENDPOINT CORRETO E ATUALIZADO (Usando gemini-1.5-flash explicitamente)
AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

async def test_api():
    headers = {
        "x-goog-api-key": AI_API_KEY,
        "Content-Type": "application/json",
    }
    
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "Você é um assistente de e-commerce. Responda apenas: 'API Funcionando!'"
                    }
                ]
            }
        ]
    }
    
    print("Enviando requisição para o Gemini...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{AI_BASE_URL}",
                headers=headers,
                json=payload,
            )
            
            # Se der 404 ou qualquer outro erro, vai estourar aqui
            response.raise_for_status() 
            
            data = response.json()
            resultado = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"\n[SUCESSO] Resposta da IA: {resultado}")
            
    except httpx.HTTPStatusError as e:
        print(f"\n[ERRO DE STATUS] Código: {e.response.status_code}")
        print(f"Detalhes do servidor: {e.response.text}")
    except Exception as e:
        print(f"\n[ERRO INESPERADO]: {e}")

if __name__ == "__main__":
    asyncio.run(test_api())