import chromadb
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
import pickle
import os

print("--- ⏳ Initializing Models & Database... ---")

# 1. Load Embedding Model
embedding_model = SentenceTransformer('BAAI/bge-large-en-v1.5')

# 2. Load ChromaDB
db_path = "chroma_db"
client = chromadb.PersistentClient(path=db_path)
collection = client.get_collection(name="indian_legal_docs_final")

# 3. Load BM25 Data
try:
    with open("bm25_index.pkl", "rb") as f:
        bm25 = pickle.load(f)
    with open("bm25_corpus.pkl", "rb") as f:
        bm25_corpus = pickle.load(f)
    print("✅ Models & Database Loaded Successfully.")
except FileNotFoundError:
    print("⚠️ Warning: BM25 files not found. Keyword search may fail.")
    bm25 = None
    bm25_corpus = []

def get_embedding(text):
    return embedding_model.encode(text).tolist()