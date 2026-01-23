# LawPal - Setup & Execution Guide

Follow these steps to get the legal assistant running on your local machine.

## 📂 Project Structure
- **/frontend**: React + Vite + Tailwind UI
- **/server**: Node.js + Express + MongoDB (Main Backend)
- **/LawPal-Backend**: Python + Flask + ChromaDB (AI RAG Pipeline)

---

## 🛠 Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (3.10 or higher)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account or a local MongoDB instance.

---

## 🔥 Step 1: AI Backend (Python)
This part handles the law document retrieval and AI generation.

1. Open a terminal and navigate to:
   ```bash
   cd LawPal-Backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # On Windows
   source venv/bin/activate # On Mac/Linux
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `LawPal-Backend` folder:
   ```env
   # Add your Groq API Keys (separated by commas)
   GROQ_API_KEYS=your_groq_api_key_here
   PORT=7860
   ```
5. Run the AI server:
   ```bash
   python app.py
   ```
   *The server will start at `http://localhost:7860`*

---

## 🖥️ Step 2: Main Server (Node.js)
This part handles users, sessions, and databases.

1. Open a **new** terminal and navigate to:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` folder:
   ```env
   PORT=3007
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   FLASK_BACKEND_URL=http://localhost:7860
   ```
4. Run the server:
   ```bash
   node server.js
   ```
   *The server will start at `http://localhost:3007`*

---

## 🎨 Step 3: Frontend (React)
The user interface.

1. Open a **third** terminal and navigate to:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` folder:
   ```env
   VITE_API_BASE_URL=http://localhost:3007/api
   VITE_SOCKET_URL=http://localhost:3007
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and go to `http://localhost:5173`.

---

## 🚀 Summary of Paths
| Component | Folder Path | URL |
| :--- | :--- | :--- |
| **Frontend** | `/frontend` | `http://localhost:5173` |
| **Node Server** | `/server` | `http://localhost:3007` |
| **AI Backend** | `/LawPal-Backend` | `http://localhost:7860` |

---

## 📝 Troubleshooting
- **Database Error**: Ensure your IP is whitelisted in MongoDB Atlas.
- **AI Error**: Check if your Groq API key is valid and has not reached its limit.
- **Port Conflict**: If 3007 or 7860 is used by another app, change it in the respective `.env` files.
