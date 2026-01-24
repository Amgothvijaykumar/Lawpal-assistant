"""app.py - AI Legal Assistant Backend with optional Redis chat memory."""

import os
import re
import json
import pickle
import numpy as np
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from groq import Groq, RateLimitError
import tiktoken
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim
import chromadb
from rank_bm25 import BM25Okapi

try:
    from redis_chat_memory import RedisChatMemory
except Exception:
    RedisChatMemory = None  # type: ignore


load_dotenv()

print("--- Initializing AI Legal Assistant Backend ---")

# --- 1. Load Groq API Keys & Rotation State ---
print("Loading Groq API keys...")
GROQ_API_KEYS = os.environ.get("GROQ_API_KEYS", "").split(',')
GROQ_API_KEYS = [key.strip() for key in GROQ_API_KEYS if key.strip()]
if not GROQ_API_KEYS:
    print("❌ FATAL ERROR: GROQ_API_KEYS not found in .env file.")
    exit()
print(f"✅ Loaded {len(GROQ_API_KEYS)} Groq API keys.")

API_KEY_STATE_FILE = "api_key_tracker.json"

def load_key_index():
    try:
        with open(API_KEY_STATE_FILE, 'r') as f:
            data = json.load(f)
            return data.get("next_key_index", 0) % len(GROQ_API_KEYS)
    except (FileNotFoundError, json.JSONDecodeError):
        return 0

def save_key_index(index):
    with open(API_KEY_STATE_FILE, 'w') as f:
        json.dump({"next_key_index": index}, f)


# 2. Load Embedding Model
print("Loading embedding model (BAAI/bge-large-en-v1.5)...")
embedding_model = SentenceTransformer('BAAI/bge-large-en-v1.5')
print("✅ Embedding model loaded.")

# 3. Load Persistent Vector Database
print("Loading persistent Vector Database (ChromaDB)...")
client_db = chromadb.PersistentClient(path="chroma_db")
collection = client_db.get_collection(name="indian_legal_docs_final")
print("✅ Vector Database loaded.")

# 4. Load BM25 Index
print("Loading BM25 Index...")
with open('bm25_index.pkl', 'rb') as f:
    bm25 = pickle.load(f)
with open('chunk_ids.json', 'r') as f:
    ids = json.load(f)
print("✅ BM25 Index loaded.")

# 5. Load all chunk data for final retrieval
print("Loading all chunk data...")
with open('processed_legal_data.json', 'r', encoding='utf-8') as f:
    all_chunks = {chunk['chunk_id']: chunk for chunk in json.load(f)}
print("✅ All data loaded.")

# 6. Load Tokenizer
tokenizer = tiktoken.get_encoding("cl100k_base")


def hybrid_search(query, top_k=20):
    print(f"\n   - Executing hybrid search for query: '{query}'")
    vector_results = collection.query(
        query_embeddings=embedding_model.encode([query]).tolist(),
        n_results=top_k
    )
    vector_ids = vector_results['ids'][0]
    print(f"     - Vector search found {len(vector_ids)} results.")

    tokenized_query = query.split(" ")
    bm25_scores = bm25.get_scores(tokenized_query)
    top_n_indices = np.argsort(bm25_scores)[::-1][:top_k]
    bm25_ids = [ids[i] for i in top_n_indices]
    print(f"     - BM25 search found {len(bm25_ids)} results.")

    fused_ids = list(dict.fromkeys(vector_ids + bm25_ids))
    print(f"     - Fused results to {len(fused_ids)} unique chunks.")

    fused_results_data = [all_chunks[chunk_id] for chunk_id in fused_ids if chunk_id in all_chunks]
    return fused_results_data


def advanced_legal_reranker(query, search_results, embedding_model):
    print("\n   - Applying Final Legal Reranker...")
    priority_docs = ["Constitution of India.json", "Indian Penal Code, 1860.json"]
    query_embedding = embedding_model.encode(query)
    chunk_texts = [res['chunk_text'] for res in search_results]
    chunk_embeddings = embedding_model.encode(chunk_texts)
    similarities = cos_sim(query_embedding, chunk_embeddings)[0]

    query_doc_match = re.search(r'(indian evidence act|indian penal code|code of criminal procedure|code of civil procedure|constitution of india|motor vehicles act)', query, re.IGNORECASE)
    query_sec_match = re.search(r'(section|article) (\d+\w*)', query, re.IGNORECASE)
    query_doc = query_doc_match.group(0).lower() if query_doc_match else None
    query_sec_num_str = query_sec_match.group(2) if query_sec_match else None

    keywords = ["insurance", "penalty", "offense", "fine", "imprisonment", "uninsured", "expired", "alcohol", "blood"]
    query_keywords = [word for word in query.lower().split() if word in keywords]

    final_results = []
    for i, chunk in enumerate(search_results):
        heuristic_score, semantic_score, exact_match_boost, keyword_boost = 1.0, 0.0, 0.0, 0.0
        if chunk['source_document'] in priority_docs: heuristic_score = 1.5
        semantic_score = similarities[i].item()

        try:
            chunk_doc = chunk['source_document'].lower()
            match = re.search(r'\d+', chunk['section_id'])
            if match:
                chunk_sec_num = int(match.group())
                if query_doc and query_sec_num_str and query_doc in chunk_doc and str(chunk_sec_num) == query_sec_num_str:
                    exact_match_boost = 10.0
        except:
            pass

        chunk_text_lower = chunk['chunk_text'].lower()
        for keyword in query_keywords:
            if keyword in chunk_text_lower:
                keyword_boost += 0.1

        weight_heuristic, weight_semantic, weight_keyword = 0.1, 0.7, 0.2
        base_score = (heuristic_score * weight_heuristic) + (semantic_score * weight_semantic) + (keyword_boost * weight_keyword)
        final_score = base_score + exact_match_boost

        final_results.append({"final_score": round(final_score, 4), "chunk_data": chunk})

    final_results.sort(key=lambda x: x['final_score'], reverse=True)
    print("   - Reranking complete.")
    return final_results


def count_tokens(text):
    return len(tokenizer.encode(text))


def build_polished_prompt(query, reranked_chunks, token_budget, conversation_context: str = ""):
    system_prompt = (
        "You are LawPal AI, a professional and authoritative Indian Legal Assistant. "
        "Your responses MUST be premium, structured, and easy to read. Follow these rules strictly:\n"
        "1) STRUCTURE: Always start with a 1-2 line intro. Break the body into clear sections with descriptive headings (e.g., ### Key Provisions, ### Legal Implications).\n"
        "2) READABILITY: Use short paragraphs (2-3 sentences max). Use bullet points for lists or multi-part explanations.\n"
        "3) STYLE: Highlight key legal terms, sections, and acts using **bold text**. Avoid long, unstructured walls of text.\n"
        "4) FIDELITY: Answer strictly based on the provided legal sources. Do not invent sections. If facts are ambiguous, ask 1-2 targeted clarifying questions.\n"
        "5) INSUFFICIENCY: If sources are insufficient, state: \"The available legal documents do not contain sufficient information to answer this question.\"\n"
        "6) CONCLUSION: Provide a brief summary or next steps at the end if applicable.\n"
        "7) EMOJIS: MANDATORY. Integrate meaningful emojis generously throughout the response. Use them in headers, bullet points, and to emphasize key takeaways (e.g., ⚖️, 📜, 🚨, ✅). Make the response visually alive.\n"
    )
    convo_block = f"Conversation so far (oldest → newest):\n{conversation_context}\n\n" if conversation_context else ""
    header = f"{system_prompt}\n---\n{convo_block}"

    prompt_header_tokens = count_tokens(header + query)
    current_tokens = prompt_header_tokens
    context_str = ""
    source_count = 0
    print("   - Packing context within token budget...")
    for item in reranked_chunks:
        chunk_data = item['chunk_data']
        next_chunk_str = (
            f"Source {source_count + 1}:\n"
            f"  Document: {chunk_data['source_document']}\n"
            f"  Section: {chunk_data['section_id']}\n"
            f"  Text: {chunk_data['chunk_text']}\n\n"
        )
        chunk_tokens = count_tokens(next_chunk_str)
        if current_tokens + chunk_tokens <= token_budget:
            context_str += next_chunk_str
            current_tokens += chunk_tokens
            source_count += 1
        else:
            print(f"   - Token budget reached. Packed {source_count} sources.")
            break
    final_prompt = f"{header}Sources:\n{context_str}---\nUser's Question:\n{query}"
    return final_prompt, current_tokens


# --- FLASK SERVER LOGIC ---
app = Flask(__name__)

# Clarifier prompt for thin evidence cases
def build_clarifier_prompt(user_query: str, conversation_context: str = "") -> str:
    guidance = (
        "The provided legal sources are insufficient to provide a definitive answer. "
        "Your task is to ask 1–2 short, targeted clarifying questions to collect missing facts. "
        "Keep the response structured: a brief intro explaining why more info is needed, followed by the questions in a clear list, and a polite closing. "
        "Maintain a professional and helpful tone. MANDATORY: Use frequent and meaningful emojis to make the interaction friendly and engaging (e.g., 🤔, 📝, 💡)."
    )
    convo = f"Conversation so far (oldest → newest):\n{conversation_context}\n\n" if conversation_context else ""
    return f"{guidance}\n---\n{convo}User's latest message:\n{user_query}"

# ---- Lightweight Guardrails: detect irrelevant citations ----
def _extract_section_numbers(text: str):
    try:
        secs = set(re.findall(r"\bSection\s+(\d+[A-Za-z]?)", text, flags=re.IGNORECASE))
        arts = set(re.findall(r"\bArticle\s+(\d+[A-Za-z]?)", text, flags=re.IGNORECASE))
        return {s.lower() for s in secs | arts}
    except Exception:
        return set()

def _normalize_act(name: str) -> str:
    return re.sub(r"\s+", " ", name or "").strip().lower()

def _allowed_from_sources(reranked_chunks):
    allowed_sections = set()
    allowed_acts = set()
    try:
        for item in reranked_chunks:
            chunk = item.get("chunk_data", {})
            sec = chunk.get("section_id", "")
            # extract first integer-like token
            m = re.search(r"(\d+[A-Za-z]?)", str(sec))
            if m:
                allowed_sections.add(m.group(1).lower())
            act_raw = chunk.get("source_document", "")
            act = _normalize_act(act_raw)
            if act:
                allowed_acts.add(act)
                # simple synonyms for IPC
                if "indian penal code" in act:
                    allowed_acts.update({"ipc", "i.p.c.", "indian penal code, 1860"})
    except Exception:
        pass
    return allowed_sections, allowed_acts

def guardrail_review(answer_text: str, reranked_chunks):
    """Return (final_text, flagged_info) with a small notice if unrelated citations found."""
    try:
        cited_sections = _extract_section_numbers(answer_text)
        allowed_sections, allowed_acts = _allowed_from_sources(reranked_chunks)

        # collect act mentions in answer
        act_mentions = set()
        for m in re.finditer(r"\b([A-Z][A-Za-z0-9 ,\-()]*?(?:Act|Code|Constitution of India)(?:,\s*\d{4})?)\b", answer_text):
            act_mentions.add(_normalize_act(m.group(1)))

        bad_sections = sorted([s for s in cited_sections if s not in allowed_sections])
        bad_acts = sorted([a for a in act_mentions if not any(a in allowed for allowed in allowed_acts)])

        if bad_sections or bad_acts:
            note_bits = []
            if bad_sections:
                note_bits.append(f"sections: {', '.join(bad_sections)}")
            if bad_acts:
                note_bits.append(f"acts: {', '.join(bad_acts)}")
            note = (
                "Note: Some cited items may be unrelated to the provided sources ("
                + "; ".join(note_bits)
                + "). They were ignored."
            )
            return f"{note}\n\n{answer_text}", {"bad_sections": bad_sections, "bad_acts": bad_acts}
    except Exception:
        pass
    return answer_text, None

# Optional Redis chat memory initialization
chat_memory = None
try:
    if RedisChatMemory is not None and os.environ.get("REDIS_URL"):
        chat_memory = RedisChatMemory(
            os.environ.get("REDIS_URL"),
            max_messages=20,
            context_messages=12,
        )
        print("✅ Redis chat memory initialized.")
    else:
        print("ℹ️ Redis chat memory not configured (set REDIS_URL to enable).")
except Exception as e:
    chat_memory = None
    print(f"⚠️ Redis chat memory disabled due to error: {e}")


@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def home():
    return jsonify({"message": "AI Legal Backend is running!", "status": "online"})


@app.route("/query", methods=["POST"])
def process_query():
    """API endpoint to run the full RAG pipeline."""
    try:
        data = request.get_json(silent=True) or {}
        query = data.get("query") or data.get("message")
        user_id = data.get("userId") or data.get("user_id")
        if not query:
            return jsonify({"error": "No query provided"}), 400

        print(f"\n--- Received Query --- \nQuery: '{query}'")
        if user_id:
            print(f"   - For user: {user_id}")

        # 1. Run Retrieval & Reranking (Use only the current message)
        print("1. Retrieving and reranking context...")
        fused_results = hybrid_search(query=query, top_k=20)
        final_reranked_chunks = advanced_legal_reranker(
            query=query,
            search_results=fused_results,
            embedding_model=embedding_model
        )

        # 2. Build Prompt (Include chat history if available)
        print("2. Building prompt...")
        history_for_prompt = ""
        if chat_memory is not None and user_id:
            try:
                history = chat_memory.get_recent_messages(user_id)
                if history:
                    history_for_prompt = RedisChatMemory.format_history_for_prompt(history)
            except Exception as e:
                print(f"   - ⚠️ Redis fetch history failed: {e}")

        # Decide if evidence is thin; if so, ask clarifying questions instead of forcing an answer
        top_score = final_reranked_chunks[0]['final_score'] if final_reranked_chunks else 0.0
        evidence_thin = (len(final_reranked_chunks) < 3) or (top_score < 0.2)

        TOKEN_BUDGET = 8000
        if evidence_thin:
            final_prompt = build_clarifier_prompt(query, history_for_prompt)
        else:
            final_prompt, _ = build_polished_prompt(
                query,
                final_reranked_chunks,
                TOKEN_BUDGET,
                conversation_context=history_for_prompt
            )

        # 3. Call Groq API with key rotation
        print(f"3. Calling llama-3.3-70b-versatile with key rotation...")

        start_index = load_key_index()
        num_keys = len(GROQ_API_KEYS)
        final_answer = None

        for i in range(num_keys):
            current_index = (start_index + i) % num_keys
            current_key = GROQ_API_KEYS[current_index]
            print(f"   - Attempting with API Key Index: {current_index}")
            try:
                client = Groq(api_key=current_key)
                chat_completion = client.chat.completions.create(
                    messages=[{"role": "user", "content": final_prompt}],
                    model="llama-3.3-70b-versatile",
                )
                final_answer = chat_completion.choices[0].message.content
                # Guardrail review REMOVED as per user request
                # final_answer, flagged = guardrail_review(final_answer, final_reranked_chunks)
                print("✅ Answer generated successfully.")
                save_key_index((current_index + 1) % num_keys)
                break
            except RateLimitError:
                print(f"   - ⚠️ Rate limit exceeded for Key Index {current_index}. Trying next key...")
            except Exception as e:
                print(f"❌ An unexpected error occurred with Key Index {current_index}: {e}")
                raise e

        if final_answer is None:
            print("❌ All API keys failed (all are rate-limited).")
            return jsonify({"error": "All API keys are currently rate limited. Please try again later."}), 503

        # 4. Save chat messages to Redis (best-effort)
        if chat_memory is not None and user_id:
            try:
                chat_memory.append_message(user_id, "user", query)
                chat_memory.append_message(user_id, "bot", final_answer)
            except Exception as e:
                print(f"   - ⚠️ Redis save failed: {e}")

        return jsonify({"answer": final_answer})

    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/history", methods=["GET"])
def get_history():
    """Debug/utility endpoint: return the last N messages for a user."""
    try:
        user_id = request.args.get("userId") or request.args.get("user_id")
        limit = request.args.get("limit", type=int) or 12
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400
        if chat_memory is None:
            return jsonify({"messages": []})
        messages = []
        try:
            messages = chat_memory.get_recent_messages(user_id, limit=limit)
        except Exception as e:
            print(f"   - ⚠️ Redis history fetch failed: {e}")
        return jsonify({"messages": messages})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    app.run(host="0.0.0.0", port=port)