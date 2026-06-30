"""
AI integration service.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TO ACTIVATE AI: add to the .env file:
    AI_API_KEY  — your API key
    AI_MODEL    — the model name (ex: "gpt-4o")
    AI_BASE_URL — the provider base URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All three functions below follow the same pattern:
  - Return a placeholder string if AI is not configured
  - Call the AI API if configured
  - Are async so they never block FastAPI
"""
from typing import Optional
import httpx

from app.core.constants import AI_API_KEY, AI_MODEL, AI_BASE_URL


def _ai_ready() -> bool:
    return bool(AI_API_KEY and AI_MODEL and AI_BASE_URL)


async def _call_ai(system_prompt: str, user_prompt: str) -> str:
    """Generic AI call — using Gemini Native API format."""
    headers = {
        "x-goog-api-key": AI_API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"{system_prompt}\n\n{user_prompt}"
                    }
                ]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 15000
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{AI_BASE_URL}",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        
        # O retorno da API nativa do Gemini vem nesta estrutura de chaves:
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()


async def generate_description(
    product_name: str,
    descriptions: list[str],
) -> Optional[str]:
    """
    Send the first N product descriptions to AI and get a professional
    Portuguese description back.
    """
    if not _ai_ready():
        return None

    descriptions_text = "\n\n".join(
        f"Descrição {i+1}:\n{d}" for i, d in enumerate(descriptions)
    )

    system = (
        "Você é um especialista em copywriting para e-commerce brasileiro. "
        "Escreva descrições profissionais, objetivas e persuasivas em português brasileiro."
        ""
    )
    user = (
        f"Produto: {product_name}\n\n"
        f"Com base nas descrições abaixo de produtos similares, crie uma descrição "
        f"profissional e completa para este produto. Destaque os principais benefícios, "
        f"especificações técnicas e diferenciais. Use linguagem clara e persuasiva."
        f"Envie somente a descrição, não adicione nenhuma informação introdutória"
        f"ou adicional como 'Irei gerar sua descrição como um profissional de copywriting'. \n\n"
        f"{descriptions_text}"
    )
    return await _call_ai(system, user)


async def generate_improvements(
    product_name: str,
    reviews: dict[str, list[str]],
) -> Optional[str]:
    """
    Send reviews grouped by star rating to AI.
    Returns improvement points in Portuguese.

    Nota metodológica exibida no frontend:
    'A análise é gerada com base nas avaliações reais de clientes,
     agrupadas por nota (1 a 5 estrelas). A IA identifica padrões
     de satisfação e insatisfação para sugerir melhorias objetivas.'
    """
    if not _ai_ready():
        return None

    reviews_text = ""
    star_labels = {"star_5": "5 estrelas", "star_4": "4 estrelas",
                   "star_3": "3 estrelas", "star_2": "2 estrelas", "star_1": "1 estrela"}
    for key, label in star_labels.items():
        texts = reviews.get(key, [])
        if texts:
            reviews_text += f"\n{label}:\n" + "\n".join(f"- {t}" for t in texts)

    system = (
        "Você é um analista de produto especialista em e-commerce brasileiro. "
        "Analise avaliações de clientes e identifique pontos de melhoria concretos."
    )
    user = (
        f"Produto: {product_name}\n\n"
        f"Avaliações de clientes por nota:\n{reviews_text}\n\n"
        f"Com base nessas avaliações reais, liste de 3 a 6 pontos de melhoria "
        f"específicos e acionáveis para este produto. Seja objetivo e prático. "
        f"Responda em português brasileiro."
        f"Envie somente a descrição, não adicione nenhuma informação introdutória"
        f"ou adicional como 'Irei gerar sua descrição como um profissional de copywriting'. \n\n"
    )
    return await _call_ai(system, user)


async def generate_image_prompt(product_name: str) -> Optional[str]:
    """
    Returns a placeholder URL for now.
    Replace this function body with your image generation API call.
    """
    if not _ai_ready():
        return None
    # Placeholder — implement image generation here
    return ""
