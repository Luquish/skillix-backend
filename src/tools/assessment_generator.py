from typing import List
from pydantic import BaseModel
from schemas.course import (
    QuizMCQBlock, 
    QuizTFBlock,
    SentenceShuffleBlock,
    MatchingPairsBlock,
    ImageMCQBlock,
    ClozeMCQBlock,
    ScenarioMCQBlock
)
from tools.search_web import search_web
import random
from nltk.tokenize import sent_tokenize, word_tokenize
import nltk

try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

def _extract_key_concepts(context: str) -> List[str]:
    """Extrae conceptos clave del contexto."""
    sentences = sent_tokenize(context)
    # Selecciona oraciones que contengan definiciones o conceptos importantes
    key_sentences = [s for s in sentences if any(marker in s.lower() for marker in 
                    ["es", "son", "significa", "se define", "se refiere", "consiste"])]
    return key_sentences

def generate_mcq(context: str) -> QuizMCQBlock:
    """Genera una pregunta de opción múltiple basada en el contexto."""
    key_concepts = _extract_key_concepts(context)
    if not key_concepts:
        return QuizMCQBlock(
            type="quiz_mcq",
            question="¿Cuál es el concepto principal del texto?",
            options=[
                context[:50] + "...",
                "Ninguna de las anteriores",
                "No hay suficiente información",
                "El texto no menciona un concepto principal"
            ],
            answer=0,
            xp=10
        )
    
    selected_concept = random.choice(key_concepts)
    question = f"¿Cuál de las siguientes afirmaciones es correcta sobre {selected_concept.split()[0]}?"
    
    # Genera opciones basadas en el contexto y búsqueda web
    search_results = search_web(selected_concept)
    options = [
        selected_concept,  # Respuesta correcta
        search_results[0] if search_results else "Una afirmación incorrecta",
        search_results[1] if len(search_results) > 1 else "Otra afirmación incorrecta",
        "Ninguna de las anteriores"
    ]
    
    random.shuffle(options)
    correct_index = options.index(selected_concept)
    
    return QuizMCQBlock(
        type="quiz_mcq",
        question=question,
        options=options,
        answer=correct_index,
        xp=10
    )

def generate_tf(context: str) -> QuizTFBlock:
    """Genera una pregunta de verdadero/falso basada en el contexto."""
    key_concepts = _extract_key_concepts(context)
    if not key_concepts:
        return QuizTFBlock(
            type="quiz_tf",
            statement=f"La siguiente afirmación es correcta: {context[:100]}...",
            answer=True,
            xp=5
        )
    
    selected_concept = random.choice(key_concepts)
    is_true = random.choice([True, False])
    
    if is_true:
        statement = selected_concept
    else:
        # Modifica el concepto para hacerlo falso
        negation_words = ["no", "nunca", "jamás"]
        statement = f"{random.choice(negation_words)} {selected_concept.lower()}"
    
    return QuizTFBlock(
        type="quiz_tf",
        statement=statement,
        answer=is_true,
        xp=5
    )

def generate_sentence_shuffle(context: str) -> SentenceShuffleBlock:
    """Genera un ejercicio de ordenar palabras/frases basado en el contexto."""
    sentences = sent_tokenize(context)
    if not sentences:
        return SentenceShuffleBlock(
            type="sentence_shuffle",
            tokens=["No", "hay", "suficiente", "contenido"],
            answer=["No", "hay", "suficiente", "contenido"],
            xp=15
        )
    
    selected_sentence = random.choice(sentences)
    tokens = word_tokenize(selected_sentence)
    
    # Asegura que la oración tenga suficientes tokens
    if len(tokens) < 4:
        tokens.extend([".", "para", "completar", "la", "oración"])
    
    shuffled_tokens = tokens.copy()
    while shuffled_tokens == tokens:
        random.shuffle(shuffled_tokens)
    
    return SentenceShuffleBlock(
        type="sentence_shuffle",
        tokens=shuffled_tokens,
        answer=tokens,
        xp=15
    )

def generate_matching_pairs(context: str) -> MatchingPairsBlock:
    """Genera un ejercicio de emparejar conceptos basado en el contexto."""
    key_concepts = _extract_key_concepts(context)
    if len(key_concepts) < 2:
        # Genera pares básicos si no hay suficientes conceptos
        pairs = [
            ("concepto", "definición"),
            ("pregunta", "respuesta"),
            ("inicio", "fin")
        ]
    else:
        # Divide los conceptos en término y definición
        pairs = []
        for concept in key_concepts[:3]:  # Limita a 3 pares
            parts = concept.split(" es ")
            if len(parts) == 2:
                pairs.append((parts[0].strip(), parts[1].strip()))
            else:
                parts = concept.split(" son ")
                if len(parts) == 2:
                    pairs.append((parts[0].strip(), parts[1].strip()))
    
    return MatchingPairsBlock(
        type="matching_pairs",
        pairs=pairs[:3],  # Máximo 3 pares
        xp=20
    )

def generate_image_mcq(context: str, image_urls: List[str]) -> ImageMCQBlock:
    """Genera una pregunta de opción múltiple basada en imágenes."""
    if not image_urls:
        raise ValueError("Se requieren URLs de imágenes para generar ImageMCQBlock")
    
    key_concepts = _extract_key_concepts(context)
    question = (
        f"¿Qué imagen representa mejor el concepto de {key_concepts[0].split()[0]}"
        if key_concepts
        else "¿Qué imagen representa mejor el contenido del texto?"
    )
    
    options = [
        f"Imagen {i+1}" for i in range(len(image_urls[:4]))
    ]
    
    return ImageMCQBlock(
        type="image_mcq",
        prompt=question,
        imageUrls=image_urls[:4],  # Máximo 4 imágenes
        options=options,
        answer=0,  # La primera imagen se considera la correcta
        xp=15
    )

def generate_cloze_mcq(context: str) -> ClozeMCQBlock:
    """Genera un ejercicio de completar espacios con opciones múltiples."""
    sentences = sent_tokenize(context)
    if not sentences:
        return ClozeMCQBlock(
            type="cloze_mcq",
            sentenceParts=("El", "es importante"),
            options=["concepto", "contenido", "contexto", "tema"],
            answer=0,
            xp=10
        )
    
    selected_sentence = random.choice(sentences)
    words = word_tokenize(selected_sentence)
    
    # Selecciona una palabra clave para reemplazar
    key_word_indices = [i for i, word in enumerate(words) 
                       if len(word) > 4 and word.isalnum()]
    
    if not key_word_indices:
        return ClozeMCQBlock(
            type="cloze_mcq",
            sentenceParts=("El", "es importante"),
            options=["concepto", "contenido", "contexto", "tema"],
            answer=0,
            xp=10
        )
    
    selected_index = random.choice(key_word_indices)
    correct_word = words[selected_index]
    
    # Genera opciones similares
    similar_words = [w for w in words if len(w) > 4 and w != correct_word]
    options = [correct_word] + (similar_words[:3] if similar_words else ["opción 2", "opción 3", "opción 4"])
    
    before_parts = " ".join(words[:selected_index])
    after_parts = " ".join(words[selected_index + 1:])
    
    return ClozeMCQBlock(
        type="cloze_mcq",
        sentenceParts=(before_parts, after_parts),
        options=options,
        answer=0,
        xp=10
    )

def generate_scenario_mcq(context: str) -> ScenarioMCQBlock:
    """Genera una pregunta de opción múltiple basada en un escenario/caso."""
    key_concepts = _extract_key_concepts(context)
    
    if not key_concepts:
        scenario = "En un proyecto de desarrollo de software..."
        question = "¿Cuál sería la mejor aproximación?"
    else:
        scenario = random.choice(key_concepts)
        question = "¿Cuál sería la mejor solución en este caso?"
    
    # Genera opciones basadas en el contexto y búsqueda web
    search_results = search_web(f"solución {scenario}")
    options = [
        "Aplicar " + scenario,  # Respuesta correcta
        search_results[0] if search_results else "Una solución alternativa",
        search_results[1] if len(search_results) > 1 else "Otra posible solución",
        "Ninguna de las anteriores"
    ]
    
    return ScenarioMCQBlock(
        type="scenario_mcq",
        context=scenario,
        options=options,
        answer=0,
        xp=20
    ) 