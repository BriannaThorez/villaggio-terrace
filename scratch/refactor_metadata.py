import json
import os

# Categories for traits
PREFERENCES = [
    "Likes Art", "Preferred Floor", "Preferred Traffic", "Preferred Elevator Distance",
    "Hates Noise", "Hates Smell"
]
UTILITIES = [
    "Electricity", "Phone", "Cable TV", "Water", "Gas", "Trash Bins", "Recycling Bins"
]
OFFICE_SERVICES = [
    "Courier Services", "Office Supply Services", "Bottled Water Services",
    "Janitorial Services", "Copy Services", "Computer and IT Services",
    "Commercial Printing Services", "File Storage Services", "Catering Services",
    "Professional Auditing Services", "Corporate Communication Services",
    "Temporary Staffing Services", "Security Services", "Fitness & Health Services",
    "Executive Club", "Helicopter Charters", "Limousine Services"
]
APARTMENT_SERVICES = [
    "Handyman Services", "Plumber", "Laundromat", "Dog Walking Services",
    "Housekeeping Services", "Dry Cleaning Services", "Floral Arrangement Services",
    "Tailoring Services", "Daycare Center", "Dog Sitting Services",
    "Personal Training Services", "Yoga Services", "Home Decor Services",
    "Wealth Adviser Services"
]

def to_key(s):
    if not s: return ""
    return str(s).lower().replace(" ", "_").replace("&", "and").replace("/", "_")

SCHEMA = {
    "preferences": [to_key(k) for k in PREFERENCES],
    "utilities": [to_key(k) for k in UTILITIES],
    "services": {
        "Apartment": [to_key(k) for k in APARTMENT_SERVICES],
        "Office": [to_key(k) for k in OFFICE_SERVICES]
    }
}

TRAIT_DATA = {
    "utilities": {
        "electricity": {"label": "Electricity", "icon": "FlashIcon"},
        "phone": {"label": "Phone", "icon": "PhoneIcon"},
        "cable_tv": {"label": "Cable TV", "icon": "Tv01Icon"},
        "water": {"label": "Water", "icon": "DropletIcon"},
        "gas": {"label": "Gas", "icon": "FireIcon"},
        "trash_bins": {"label": "Trash Bins", "icon": "Delete01Icon"},
        "recycling_bins": {"label": "Recycling", "icon": "RecycleIcon"}
    }
}

def classify_room(room_type):
    rt = str(room_type).lower()
    if rt == "office": return "Office"
    if rt == "apartment": return "Apartment"
    if rt == "restaurant": return "Restaurant"
    if rt == "store": return "Store"
    # Everything else is a Service
    return "Services"

DATA_PATH = r"scratch\cheatsheet_data.json"
ORIGINAL_METADATA_PATH = r"src\entities\rooms\roomMetadata.json"
OUTPUT_PATH = r"src\entities\rooms\roomMetadata.json"

# Read as bytes and decode safely
with open(DATA_PATH, 'rb') as f:
    raw_bytes = f.read()
    if raw_bytes.startswith(b'\xff\xfe'):
        content = raw_bytes.decode('utf-16')
    else:
        content = raw_bytes.decode('utf-8')
    raw_xlsx = json.loads(content)

sheet_data = raw_xlsx.get("Ark1", [])
headers = sheet_data[0]
rows = sheet_data[1:]

def get_col_idx(name):
    try:
        return headers.index(name)
    except ValueError:
        return -1

key_to_idx = {to_key(h): i for i, h in enumerate(headers) if h}

processed_rooms = []
for row in rows:
    room_type = row[get_col_idx("Type")]
    room_class_excel = row[get_col_idx("Class")]
    variant = row[get_col_idx("Variant")]
    
    if not room_type or str(room_type).lower() == "type": continue
    
    metadata = {}
    for key, idx in key_to_idx.items():
        if idx >= len(row): continue
        val = row[idx]
        if key in ["type", "class", "variant", "width", "height", "build_cost", "id", "average_rent", "rent_space", "rent/space"]:
            continue
            
        if val and str(val).strip().lower() not in ["null", "", "none"]:
            metadata[key] = val

    # Structural fields preserved
    metadata["type"] = str(room_class_excel) if room_class_excel else "Standard"
    metadata["variant"] = str(variant) if variant else "Basic"
    
    # Set serviceDomain for grouped services
    if room_type in ["Office", "Apartment", "Restaurant", "Store"]:
        metadata["serviceDomain"] = room_type
    else:
        # Check if it's an office service or apartment service
        type_key = to_key(room_type)
        if type_key in [to_key(k) for k in OFFICE_SERVICES]:
            metadata["serviceDomain"] = "Office"
        elif type_key in [to_key(k) for k in APARTMENT_SERVICES]:
            metadata["serviceDomain"] = "Apartment"
        else:
            metadata["serviceDomain"] = "General"

    try:
        metadata["average_rent"] = int(row[get_col_idx("Average Rent")]) if row[get_col_idx("Average Rent")] else 0
    except:
        metadata["average_rent"] = 0

    target_class = classify_room(room_type)
    
    safe_class = target_class.lower()
    safe_size = str(room_class_excel).lower().replace(" ", "-") if room_class_excel else "standard"
    safe_variant = str(variant).lower().replace(" ", "-") if variant else "basic"
    
    # For services, we need the specific type in the ID (e.g. services-janitorial-basic)
    if target_class == "Services":
        safe_domain_type = str(room_type).lower().replace(" ", "-")
        room_id = f"{safe_class}-{safe_domain_type}-{safe_variant}".replace("/", "-")
    else:
        room_id = f"{safe_class}-{safe_size}-{safe_variant}".replace("/", "-")
    
    try:
        width = int(row[get_col_idx("Width")]) if row[get_col_idx("Width")] else 1
    except:
        width = 1
    try:
        height = int(row[get_col_idx("Height")]) if row[get_col_idx("Height")] else 1
    except:
        height = 1
    try:
        price = int(row[get_col_idx("Build Cost")]) if row[get_col_idx("Build Cost")] else 0
    except:
        price = 0

    processed_rooms.append({
        "id": room_id,
        "class": target_class,
        "name": f"{room_type} {variant}" if target_class == "Services" else f"{room_class_excel} {variant}",
        "price": price,
        "dimensions": {"width": width, "height": height},
        "metadata": metadata,
        "specificDescription": f"A high-efficiency {variant.lower() if variant else 'standard'} {room_type.lower()} module."
    })

with open(ORIGINAL_METADATA_PATH, 'r') as f:
    orig_meta = json.load(f)

# Re-incorporate classLibrary
class_library = {
    "Office": {"description": "Professional administrative and corporate modules.", "masterTraitList": {}},
    "Apartment": {"description": "Residential living modules for long-term tenancy.", "masterTraitList": {}},
    "Restaurant": {"description": "Food and beverage commercial modules.", "masterTraitList": {}},
    "Store": {"description": "Retail commercial modules.", "masterTraitList": {}},
    "Services": {"description": "Essential infrastructure and support modules.", "masterTraitList": {}},
    "Lobby": {"description": "Entry and transition nodes.", "masterTraitList": {}},
    "FootTraffic": {"description": "Vertical and horizontal movement solutions.", "masterTraitList": {}}
}

final_output = {
    "masterTraitSchema": SCHEMA,
    "traitDefinitions": TRAIT_DATA,
    "classLibrary": class_library,
    "rooms": processed_rooms
}

with open(OUTPUT_PATH, 'w') as f:
    json.dump(final_output, f, indent=2)

print(f"Successfully refactored {len(processed_rooms)} rooms. Grouped {len([r for r in processed_rooms if r['class'] == 'Services'])} into Services class.")
