# 🏛️ LawPal Backend - AI Legal Assistant

An AI-powered legal assistant API using **RAG (Retrieval-Augmented Generation)** for Indian legal queries. Built with Flask, ChromaDB, and Groq LLM.

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Features

- 🔍 **Hybrid Search**: Combines vector similarity (embeddings) with BM25 keyword search
- ⚖️ **Legal Reranking**: Domain-specific reranking for accurate legal document retrieval
- 🔄 **API Key Rotation**: Automatic failover between multiple Groq API keys
- 📊 **Health Monitoring**: Built-in health check and statistics endpoints
- ⚡ **CORS Enabled**: Ready for frontend integration
- 📝 **Structured Logging**: Professional logging for debugging and monitoring

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Web Framework** | Flask + CORS |
| **Vector Database** | ChromaDB |
| **Embeddings** | Sentence Transformers (BAAI/bge-large-en-v1.5) |
| **Keyword Search** | BM25 (rank_bm25) |
| **LLM Provider** | Groq (llama-3.3-70b-versatile) |
| **Tokenizer** | tiktoken |

## 📦 Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd LawPal-Backend
```

### 2. Create virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

Create a `.env` file:

```env
GROQ_API_KEYS=your_key_1,your_key_2,your_key_3
PORT=7860
DEBUG=false
```

### 5. Build database (one-time)

```bash
python build_db.py
```

### 6. Run the server

```bash
python app.py
```

## 🌐 API Endpoints

### Health Check

```http
GET /
```

**Response:**
```json
{
  "status": "healthy",
  "service": "LawPal AI Legal Assistant",
  "version": "2.0.0",
  "endpoints": {
    "POST /ask": "Submit a legal query",
    "GET /health": "Detailed health status",
    "GET /stats": "Service statistics"
  }
}
```

### Detailed Health

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "components": {
    "embedding_model": "loaded",
    "vector_db": "connected",
    "bm25_index": "loaded",
    "legal_data": "1234 chunks",
    "api_keys": "3 keys configured"
  }
}
```

### Statistics

```http
GET /stats
```

**Response:**
```json
{
  "total_documents": 1234,
  "api_keys_count": 3,
  "current_key_index": 0,
  "embedding_model": "BAAI/bge-large-en-v1.5",
  "llm_model": "llama-3.3-70b-versatile"
}
```

### Legal Query

```http
POST /ask
Content-Type: application/json

{
  "query": "What is Section 302 IPC?"
}
```

**Response:**
```json
{
  "answer": "Section 302 of the Indian Penal Code deals with punishment for murder...",
  "processing_time_ms": 3456
}
```


## 🧪 Testing

### Using cURL

```bash
# Health check
curl http://localhost:7860/

# Legal query
curl -X POST http://localhost:7860/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Section 302 IPC?"}'
```

### Using PowerShell

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:7860/"

# Legal query
Invoke-RestMethod -Uri "http://localhost:7860/ask" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"query": "What is Section 302 IPC?"}'
```

## 📁 Project Structure

```
LawPal-Backend/
├── app.py                    # Main application (Flask server)
├── build_db.py               # Database builder script
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables
├── .gitignore                # Git ignore rules
├── Dockerfile                # Docker configuration
├── README.md                 # This file
├── api_key_tracker.json      # API key rotation state
├── bm25_index.pkl            # BM25 search index
├── chunk_ids.json            # Document chunk IDs
├── processed_legal_data.json # Pre-processed legal documents
└── chroma_db/                # ChromaDB vector database
```

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 7860 | Server port |
| `DEBUG` | false | Enable debug mode |
| `GROQ_API_KEYS` | *required* | Comma-separated API keys |

## 🔧 Advanced Configuration

Edit the `Config` class in `app.py`:

```python
class Config:
    TOP_K_RETRIEVAL = 20      # Number of documents to retrieve
    TOKEN_BUDGET = 8000       # Max tokens for context
  LLM_MODEL = "llama-3.3-70b-versatile"
```

## 🚀 Deployment

### Production (Gunicorn)

```bash
gunicorn -w 4 -b 0.0.0.0:7860 app:app
```

### Docker

```bash
docker build -t lawpal-backend .
docker run -p 7860:7860 --env-file .env lawpal-backend
```


## 📈 Performance

- **Response Time**: ~3-5 seconds per query
- **Accuracy**: Optimized for Indian legal documents
- **Scalability**: Supports multiple API keys with automatic failover

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built with ❤️ for the Indian legal community.