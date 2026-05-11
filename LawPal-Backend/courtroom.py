# --- courtroom.py ---
import json
import re  # Added re to clean markdown
from groq import Groq, RateLimitError

def simulate_trial_logic(case_description, api_keys, start_key_index):
    """
    Runs the Digital Courtroom simulation.
    """
    print(f"⚖️ COURTROOM: Convening session for case: {case_description[:30]}...")

    prompt = f"""
    You are the 'Digital Courtroom' Simulator for the Indian Judicial System.
    Conduct a preliminary hearing based on the USER'S STORY below.
    
    USER'S STORY: "{case_description}"
    
    INSTRUCTIONS:
    Act as three distinct legal entities. Do not mix their voices.
    
    1. PETITIONER'S COUNSEL (The User's Advocate):
       - Argue aggressively FOR the user.
       - Cite specific sections of Indian Acts (IPC, CrPC, Contract Act, etc.).
       
    2. RESPONDENT'S COUNSEL (The Opposition):
       - Argue ruthlessly AGAINST the user.
       - Point out missing evidence, vague facts, or legal loopholes.
       
    3. THE PRESIDING JUDGE:
       - Weigh both sides logically.
       - Deliver a 'Preliminary Opinion' (e.g., "Case has merit" or "Likely to be dismissed").
       - Provide a 'Win Probability' (0-100%).
    
    OUTPUT FORMAT:
    Return ONLY a raw JSON object with these keys:
    {{
        "petitioner_argument": "...",
        "respondent_argument": "...",
        "judge_verdict": "...",
        "win_probability": (integer),
        "critical_warning": "One sentence warning about the biggest risk in this case."
    }}
    """

    num_keys = len(api_keys)
    current_index = start_key_index

    for i in range(num_keys):
        idx = (current_index + i) % num_keys
        key = api_keys[idx]
        
        try:
            client = Groq(api_key=key)
            resp = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"} 
            )
            
            content = resp.choices[0].message.content
            
            # --- SAFETY FIX: CLEAN MARKDOWN ---
            # Sometimes AI returns ```json ... ```. We remove that here.
            clean_content = re.sub(r"```json\s*|\s*```", "", content).strip()
            
            result = json.loads(clean_content)
            result['status'] = 'Success'
            return result
            
        except RateLimitError:
            print(f"⚠️ Courtroom: Key {idx} limit reached. Switching...")
            continue
        except Exception as e:
            return {"status": "Error", "message": str(e)}

    return {"status": "Error", "message": "All API keys are busy. Court adjourned."}