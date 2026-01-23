import os
import json
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
API_KEY_STATE_FILE = "api_key_tracker.json"
GROQ_API_KEYS = os.environ.get("GROQ_API_KEYS", "").split(',')
GROQ_API_KEYS = [key.strip() for key in GROQ_API_KEYS if key.strip()]

if not GROQ_API_KEYS:
    raise ValueError("❌ FATAL: GROQ_API_KEYS not found in .env file.")

# --- Key Rotation Logic ---
def load_key_index():
    if os.path.exists(API_KEY_STATE_FILE):
        try:
            with open(API_KEY_STATE_FILE, "r") as f:
                return json.load(f).get("current_index", 0)
        except:
            return 0
    return 0

def save_key_index(index):
    try:
        with open(API_KEY_STATE_FILE, "w") as f:
            json.dump({"current_index": index}, f)
    except Exception as e:
        print(f"⚠️ Warning: Could not save API key state: {e}")

def get_current_key():
    idx = load_key_index()
    # Safety check in case config changed
    if idx >= len(GROQ_API_KEYS):
        idx = 0
    return GROQ_API_KEYS[idx], idx