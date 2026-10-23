"""
Validation and serialization schemas for PropDesk Property Matcher.

Enforces all domain validation rules with clear field-level messages for HTTP 422:
- phone must be a 10-digit Indian mobile number (starts with 6, 7, 8 or 9)
- price and budget_max must be whole numbers greater than 0
- localities must not be empty
- bhk is required for flats and houses, and must be empty (null) for plots and shops
- a rejected status needs a reason
- assigned_to must be an agent
"""
import re
from typing import Any, Dict, List, Optional, Tuple

VALID_DEALS = {"sale", "rent"}
VALID_TYPES = {"flat", "house", "plot", "shop"}
TYPES_REQUIRING_BHK = {"flat", "house"}
TYPES_FORBIDDING_BHK = {"plot", "shop"}
VALID_MATCH_STATUSES = {"shared", "rejected"}
INDIAN_PHONE_REGEX = re.compile(r"^[6-9]\d{9}$")


def parse_strict_int(val: Any, field_name: str) -> Tuple[Optional[int], Optional[str]]:
    """Parses a whole number strictly (rejecting booleans, floats with decimals, and non-numeric strings)."""
    if val is None or (isinstance(val, str) and val.strip() == ""):
        return None, None
    if isinstance(val, bool):
        return None, f"{field_name} must be a whole number"
    if isinstance(val, int):
        return val, None
    if isinstance(val, float):
        if val.is_integer():
            return int(val), None
        return None, f"{field_name} must be a whole number"
    if isinstance(val, str):
        s = val.strip()
        if re.match(r"^[+-]?\d+$", s):
            return int(s), None
        return None, f"{field_name} must be a whole number"
    return None, f"{field_name} must be a whole number"


def validate_property_payload(data: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, str]]]:
    """
    Validates property input (used by both POST /properties and POST /properties/import).
    Returns (cleaned_dict, list_of_field_errors).
    """
    errors: List[Dict[str, str]] = []

    raw_title = data.get("title")
    title = str(raw_title).strip() if raw_title is not None else ""
    if not title:
        errors.append({"field": "title", "message": "title is required and must not be empty"})

    raw_locality = data.get("locality")
    locality = str(raw_locality).strip() if raw_locality is not None else ""
    if not locality:
        errors.append({"field": "locality", "message": "locality is required and must not be empty"})

    raw_deal = data.get("deal")
    deal = str(raw_deal).strip().lower() if raw_deal is not None else ""
    if deal not in VALID_DEALS:
        errors.append({"field": "deal", "message": "deal must be either 'sale' or 'rent'"})

    raw_type = data.get("type")
    prop_type = str(raw_type).strip().lower() if raw_type is not None else ""
    if prop_type not in VALID_TYPES:
        errors.append({"field": "type", "message": "type must be one of: flat, house, plot, shop"})

    bhk_val, bhk_err = parse_strict_int(data.get("bhk"), "bhk")
    if bhk_err:
        errors.append({"field": "bhk", "message": bhk_err})
    else:
        if prop_type in TYPES_REQUIRING_BHK:
            if bhk_val is None:
                errors.append({"field": "bhk", "message": "bhk is required for flats and houses"})
            elif bhk_val <= 0:
                errors.append({"field": "bhk", "message": "bhk must be greater than 0"})
        elif prop_type in TYPES_FORBIDDING_BHK:
            if bhk_val is not None:
                errors.append({"field": "bhk", "message": "bhk must be empty for plots and shops"})

    price_val, price_err = parse_strict_int(data.get("price"), "price")
    if price_err:
        errors.append({"field": "price", "message": price_err})
    elif price_val is None:
        errors.append({"field": "price", "message": "price is required"})
    elif price_val <= 0:
        errors.append({"field": "price", "message": "price must be greater than 0"})

    if errors:
        return None, errors

    return {
        "title": title,
        "locality": locality,
        "deal": deal,
        "type": prop_type,
        "bhk": bhk_val,
        "price": price_val,
    }, []


def validate_requirement_payload(
    data: Dict[str, Any],
    current_user: Dict[str, Any],
    db_session: Any,
) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, str]]]:
    """
    Validates requirement creation input (POST /requirements).
    Returns (cleaned_dict, list_of_field_errors).
    """
    errors: List[Dict[str, str]] = []

    raw_client = data.get("client_name")
    client_name = str(raw_client).strip() if raw_client is not None else ""
    if not client_name:
        errors.append({"field": "client_name", "message": "client_name is required and must not be empty"})

    raw_phone = data.get("phone")
    phone = str(raw_phone).strip() if raw_phone is not None else ""
    if not INDIAN_PHONE_REGEX.match(phone):
        errors.append(
            {
                "field": "phone",
                "message": "phone must be a 10-digit Indian mobile number (starts with 6, 7, 8 or 9)",
            }
        )

    raw_deal = data.get("deal")
    deal = str(raw_deal).strip().lower() if raw_deal is not None else ""
    if deal not in VALID_DEALS:
        errors.append({"field": "deal", "message": "deal must be either 'sale' or 'rent'"})

    raw_type = data.get("type")
    req_type = str(raw_type).strip().lower() if raw_type is not None else ""
    if req_type not in VALID_TYPES:
        errors.append({"field": "type", "message": "type must be one of: flat, house, plot, shop"})

    raw_localities = data.get("localities")
    cleaned_localities: List[str] = []
    if isinstance(raw_localities, list):
        for item in raw_localities:
            if isinstance(item, str) and item.strip():
                cleaned_localities.append(item.strip())
    if not cleaned_localities:
        errors.append({"field": "localities", "message": "localities must not be empty"})

    bhk_val, bhk_err = parse_strict_int(data.get("bhk"), "bhk")
    if bhk_err:
        errors.append({"field": "bhk", "message": bhk_err})
    elif bhk_val is not None:
        if req_type in TYPES_FORBIDDING_BHK:
            errors.append({"field": "bhk", "message": "bhk must be empty for plots and shops"})
        elif bhk_val <= 0:
            errors.append({"field": "bhk", "message": "bhk must be greater than 0"})

    budget_val, budget_err = parse_strict_int(data.get("budget_max"), "budget_max")
    if budget_err:
        errors.append({"field": "budget_max", "message": budget_err})
    elif budget_val is None:
        errors.append({"field": "budget_max", "message": "budget_max is required"})
    elif budget_val <= 0:
        errors.append({"field": "budget_max", "message": "budget_max must be greater than 0"})

    # Handle assigned_to:
    # - Agents creating requirements are assigned to themselves automatically (unless they pass an invalid non-agent ID).
    # - Managers must assign to a valid agent.
    raw_assigned_to = data.get("assigned_to")
    assigned_to_id: Optional[int] = None

    if current_user["role"] == "agent":
        if raw_assigned_to is None or str(raw_assigned_to).strip() == "":
            assigned_to_id = int(current_user["id"])
        else:
            parsed_agent, agent_err = parse_strict_int(raw_assigned_to, "assigned_to")
            if agent_err or parsed_agent is None:
                errors.append({"field": "assigned_to", "message": "assigned_to must be an agent"})
            else:
                agent_rows = db_session.execute(
                    "SELECT id, role FROM users WHERE id = :uid",
                    {"uid": parsed_agent},
                )
                if not agent_rows or agent_rows[0]["role"] != "agent":
                    errors.append({"field": "assigned_to", "message": "assigned_to must be an agent"})
                else:
                    # Force agent's own user id per spec: "create requirements (assigned to themselves automatically)"
                    assigned_to_id = int(current_user["id"])
    else:
        parsed_agent, agent_err = parse_strict_int(raw_assigned_to, "assigned_to")
        if agent_err or parsed_agent is None:
            errors.append({"field": "assigned_to", "message": "assigned_to must be an agent"})
        else:
            agent_rows = db_session.execute(
                "SELECT id, role FROM users WHERE id = :uid",
                {"uid": parsed_agent},
            )
            if not agent_rows or agent_rows[0]["role"] != "agent":
                errors.append({"field": "assigned_to", "message": "assigned_to must be an agent"})
            else:
                assigned_to_id = parsed_agent

    if errors:
        return None, errors

    return {
        "client_name": client_name,
        "phone": phone,
        "deal": deal,
        "type": req_type,
        "localities": cleaned_localities,
        "bhk": bhk_val,
        "budget_max": budget_val,
        "assigned_to": assigned_to_id,
    }, []


def validate_reassign_payload(data: Dict[str, Any], db_session: Any) -> Tuple[Optional[int], List[Dict[str, str]]]:
    """Validates PATCH /requirements/{id} payload ensuring assigned_to is a valid agent."""
    raw_assigned_to = data.get("assigned_to")
    parsed_agent, err = parse_strict_int(raw_assigned_to, "assigned_to")
    if err or parsed_agent is None:
        return None, [{"field": "assigned_to", "message": "assigned_to must be an agent"}]

    rows = db_session.execute(
        "SELECT id, role FROM users WHERE id = :uid",
        {"uid": parsed_agent},
    )
    if not rows or rows[0]["role"] != "agent":
        return None, [{"field": "assigned_to", "message": "assigned_to must be an agent"}]

    return parsed_agent, []


def validate_match_status_payload(data: Dict[str, Any]) -> Tuple[Optional[Dict[str, Optional[str]]], List[Dict[str, str]]]:
    """Validates PUT /requirements/{id}/matches/{pid} payload."""
    errors: List[Dict[str, str]] = []
    raw_status = data.get("status")
    status_val = str(raw_status).strip().lower() if raw_status is not None else ""
    if status_val not in VALID_MATCH_STATUSES:
        errors.append({"field": "status", "message": "status must be either 'shared' or 'rejected'"})

    raw_reason = data.get("reason")
    reason_val = str(raw_reason).strip() if raw_reason is not None else None
    if status_val == "rejected" and not reason_val:
        errors.append({"field": "reason", "message": "a rejected status needs a reason"})

    if status_val == "shared":
        reason_val = None

    if errors:
        return None, errors

    return {"status": status_val, "reason": reason_val}, []
