from datetime import datetime
from typing import Dict, Any, Optional

# --- EXPANDED PROTOTYPE DATABASE (Top Common Indian Crimes) ---
# This acts as a "Cache" for instant results.
PUNISHMENT_MAP = {
    # Property Crimes
    "379": {"crime": "Theft", "max_years": 3, "excluded": False},
    "380": {"crime": "Theft in Dwelling", "max_years": 7, "excluded": False},
    "392": {"crime": "Robbery", "max_years": 10, "excluded": False},
    "411": {"crime": "Dishonestly receiving stolen property", "max_years": 3, "excluded": False},
    "420": {"crime": "Cheating / Fraud", "max_years": 7, "excluded": False},
    
    # Body Crimes
    "302": {"crime": "Murder", "max_years": None, "excluded": True}, # Life/Death
    "304": {"crime": "Culpable Homicide not amounting to murder", "max_years": 10, "excluded": False}, # Varies, but treating as 10 for logic
    "307": {"crime": "Attempt to Murder", "max_years": 10, "excluded": False},
    "323": {"crime": "Voluntarily causing hurt", "max_years": 1, "excluded": False},
    "324": {"crime": "Voluntarily causing hurt by dangerous weapons", "max_years": 3, "excluded": False},
    "325": {"crime": "Voluntarily causing grievous hurt", "max_years": 7, "excluded": False},
    "326": {"crime": "Grievous hurt by dangerous weapons", "max_years": None, "excluded": True}, # Life
    
    # Women/Family Crimes
    "498A": {"crime": "Cruelty by Husband/Relatives", "max_years": 3, "excluded": False},
    "376": {"crime": "Rape", "max_years": None, "excluded": True}, # Life (Strict rules apply)
    "354": {"crime": "Assault on woman with intent to outrage modesty", "max_years": 5, "excluded": False},
    
    # Public Order
    "506": {"crime": "Criminal Intimidation", "max_years": 2, "excluded": False},
    "124A": {"crime": "Sedition", "max_years": None, "excluded": True}, # Life
}

def calculate_bail_eligibility(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Revised logic that accepts 'manual_max_years' if the section is not in the DB.
    """
    try:
        # 1. Inputs
        section = str(data.get("section", "")).strip()
        arrest_date_str = data.get("arrest_date")
        is_first_offender = bool(data.get("is_first_offender", False))
        
        # New Input: Allow frontend to pass this if backend doesn't know the section
        manual_max_years = data.get("manual_max_years") 

        if not arrest_date_str:
            return {"error": "Arrest date is required."}

        # 2. Determine Max Punishment & Crime Name
        max_years = 0
        crime_name = "Unknown Offense"
        is_excluded = False

        # Check Internal DB first
        db_record = PUNISHMENT_MAP.get(section)
        
        if db_record:
            # Case A: We found it in our Map
            crime_name = db_record['crime']
            is_excluded = db_record.get('excluded', False)
            if not is_excluded:
                max_years = db_record['max_years']
        elif manual_max_years:
            # Case B: Not in Map, but User provided the number manually
            crime_name = f"Section {section} (User Defined)"
            try:
                max_years = float(manual_max_years)
                # Basic sanity check: If user enters 99 or 0, flag it
                if max_years > 20: 
                     return {"status": "Manual Check Required", "reason": "The punishment years entered seem essentially like a Life Sentence."}
            except:
                return {"error": "Manual max years must be a number."}
        else:
            # Case C: Not in Map AND No manual input provided
            return {
                "status": "Missing Data",
                "missing_info": True,
                "message": f"Section {section} is not in our database. Please ask the user to enter the 'Maximum Punishment Years' for this offense."
            }

        # 3. Check Exclusions (Murder, Rape, etc.)
        if is_excluded:
             return {
                "status": "Not Eligible (Statutory Exclusion)",
                "eligible": False,
                "crime": crime_name,
                "reason": "Offenses punishable by Death or Life Imprisonment are excluded from automatic statutory bail (Sec 436A CrPC / 479 BNSS)."
            }

        # 4. Calculate Time
        try:
            arrest_date = datetime.strptime(arrest_date_str, "%Y-%m-%d")
        except ValueError:
            return {"error": "Invalid date format. Use YYYY-MM-DD."}
            
        current_date = datetime.now()
        if arrest_date > current_date:
             return {"error": "Arrest date cannot be in the future."}

        days_served = (current_date - arrest_date).days
        days_in_year = 365.25

        # 5. Logic
        days_required_half = int((max_years * days_in_year) / 2)
        days_required_third = int((max_years * days_in_year) / 3)
        
        eligible = False
        reason = ""
        citation = ""

        # BNSS 479 (First Timer)
        if is_first_offender:
            if days_served >= days_required_third:
                eligible = True
                citation = "Section 479 BNSS"
                reason = f"First-time offender served > 1/3rd of sentence ({days_served} / {days_required_third} days)."
            else:
                shortage = days_required_third - days_served
                reason = f"First-time offender needs 1/3rd. Short by {shortage} days."

        # CrPC 436A (General)
        elif not eligible: 
            if days_served >= days_required_half:
                eligible = True
                citation = "Section 436A CrPC"
                reason = f"served > 1/2 of sentence ({days_served} / {days_required_half} days)."
            else:
                shortage = days_required_half - days_served
                reason = f"Needs 1/2. Short by {shortage} days."

        return {
            "status": "Eligible" if eligible else "Not Yet Eligible",
            "eligible": eligible,
            "crime": crime_name,
            "max_sentence_years": max_years,
            "days_served": days_served,
            "required_days": days_required_third if (is_first_offender) else days_required_half,
            "citation": citation,
            "legal_reason": reason
        }

    except Exception as e:
        return {"error": str(e)}