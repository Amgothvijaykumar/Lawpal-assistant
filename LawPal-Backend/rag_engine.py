import numpy as np
from groq import Groq, RateLimitError
import config
import database
from sentence_transformers.util import cos_sim

def hybrid_search(query, top_k=5):
    """Combines Vector Search (meaning) + BM25 (keywords)."""
    
    # 1. Vector Search
    query_emb = database.get_embedding(query)
    vector_results = database.collection.query(
        query_embeddings=[query_emb],
        n_results=top_k * 2
    )
    
    # 2. BM25 Search
    tokenized_query = query.split()
    bm25_scores = database.bm25.get_scores(tokenized_query)
    top_n_bm25 = np.argsort(bm25_scores)[::-1][:top_k * 2]
    
    # 3. Rerank & Combine (Simplified RRF)
    # For now, we return the best vector results for simplicity and speed
    # You can add complex RRF logic here if needed.
    
    seen_ids = set()
    final_results = []
    
    # Add Vector matches
    if vector_results['documents']:
        for i, doc in enumerate(vector_results['documents'][0]):
            doc_id = vector_results['ids'][0][i]
            if doc_id not in seen_ids:
                meta = vector_results['metadatas'][0][i]
                final_results.append({
                    "text": doc,
                    "source": meta.get('source', 'Unknown'),
                    "section": meta.get('section', 'Unknown')
                })
                seen_ids.add(doc_id)
                
    return final_results[:top_k]

def query_llm(user_query):
    """Handles the loop of trying API keys until one works."""
    retrieved_docs = hybrid_search(user_query)
    
    context_text = "\n\n".join(
        [f"Source ({d['source']} - {d['section']}): {d['text']}" for d in retrieved_docs]
    )
    
    system_prompt = f"""
        You are LawPal AI, a professional and authoritative Indian Legal Assistant.
        Your responses MUST be premium, structured, and easy to read. Follow these rules strictly:

        1) STRUCTURE: Always start with a 1-2 line intro. Break the body into clear sections with descriptive headings.
        2) READABILITY: Use short paragraphs (2-3 sentences max). Use bullet points for lists or multi-part explanations.
        3) STYLE: Highlight key legal terms, sections, and acts using **bold text**.
        4) FIDELITY: Answer strictly based on the provided legal sources. Do not invent sections.
        5) CONCLUSION: Provide a brief summary or next steps at the end if applicable.

        Context:
        {context_text}
    """
    
    # Try keys loop
    num_keys = len(config.GROQ_API_KEYS)
    start_index = config.load_key_index()
    
    for i in range(num_keys):
        current_index = (start_index + i) % num_keys
        api_key = config.GROQ_API_KEYS[current_index]
        
        try:
            client = Groq(api_key=api_key)
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query}
                ],
                model="llama-3.3-70b-versatile",
            )
            
            # Success! Save this key index for next time
            config.save_key_index(current_index)
            return chat_completion.choices[0].message.content
            
        except RateLimitError:
            print(f"⚠️ Key {current_index} rate limited. Switching...")
            continue
        except Exception as e:
            return f"Error: {str(e)}"
            
    return "Server Busy: All API keys are currently rate limited. Please try again later."