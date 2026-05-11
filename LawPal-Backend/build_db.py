# --- build_db.py ---
# Run this LOCALLY to build your database.

import ssl
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

import json
import chromadb
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
import pickle
import os
import shutil

print("--- Starting Database Build Process ---")

# --- 1. Load Data ---
data_filename = 'processed_legal_data.json'
try:
    with open(data_filename, 'r', encoding='utf-8') as f:
        all_chunks = json.load(f)
except FileNotFoundError:
    print(f"❌ Error: '{data_filename}' not found. Please make sure the JSON file is in the same folder.")
    exit(1)

# --- 2. Setup ChromaDB (Clean Start) ---
db_path = "chroma_db"

# Force cleanup of old DB to ensure new changes (like BM25) are applied
if os.path.exists(db_path):
    print(f"⚠️  Removing old database at '{db_path}' to rebuild...")
    try:
        shutil.rmtree(db_path)  # Delete the folder
    except Exception as e:
        print(f"❌ Error deleting old DB: {e}. Please delete the 'chroma_db' folder manually.")
        exit(1)

print("Initializing persistent ChromaDB...")
client = chromadb.PersistentClient(path=db_path)
collection_name = "indian_legal_docs_final"
collection = client.create_collection(name=collection_name)

# --- 3. Embedding & Indexing ---
print("Initializing embedding model (BAAI/bge-large-en-v1.5)...")
embedding_model = SentenceTransformer('BAAI/bge-large-en-v1.5')

print(f"Embedding and indexing all {len(all_chunks)} chunks. This will take a while...")

documents = [chunk['chunk_text'] for chunk in all_chunks]
metadatas = [{'source': chunk['source_document'], 'section': chunk['section_id']} for chunk in all_chunks]
ids = [chunk['chunk_id'] for chunk in all_chunks]

# Batch processing
batch_size = 32
total_batches = len(documents) // batch_size + (1 if len(documents) % batch_size > 0 else 0)

for i in range(0, len(documents), batch_size):
    batch_num = i // batch_size + 1
    print(f"  - Processing batch {batch_num}/{total_batches}...", end="\r")
    
    batch_docs = documents[i:i+batch_size]
    batch_metas = metadatas[i:i+batch_size]
    batch_ids = ids[i:i+batch_size]
    batch_embeddings = embedding_model.encode(batch_docs).tolist()
    
    collection.add(
        ids=batch_ids,
        documents=batch_docs,
        metadatas=batch_metas,
        embeddings=batch_embeddings
    )

print(f"\n✅ Vector Database created at '{db_path}'.")

# --- 4. Build and Save BM25 (The Fix) ---
print("\nInitializing and saving BM25 Index...")
tokenized_corpus = [doc.split(" ") for doc in documents]
bm25 = BM25Okapi(tokenized_corpus)

# A. Save the Index
with open('bm25_index.pkl', 'wb') as f:
    pickle.dump(bm25, f)

# B. Save the Corpus (THIS WAS MISSING)
with open('bm25_corpus.pkl', 'wb') as f:
    pickle.dump(documents, f)

# C. Save IDs (Optional, but good for linking)
with open('chunk_ids.json', 'w') as f:
    json.dump(ids, f)
    
print("✅ BM25 Index (bm25_index.pkl) and Corpus (bm25_corpus.pkl) saved.")
print("\n--- DATABASE BUILD COMPLETE ---")