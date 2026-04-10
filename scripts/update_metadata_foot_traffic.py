import json

input_path = r'c:\AIDev\AiDev_LLM\villaggio-terrace\src\entities\rooms\roomMetadata.json'

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Ensure FootTraffic and Lobby and Structure are in classLibrary
classes_to_add = {
    "Lobby": "Grand entrance halls and transit hubs for high-volume ingress.",
    "FootTraffic": "Vertical and horizontal traversal structures bridging simulation levels.",
    "Structure": "Core physical modules that provide the fundamental framework."
}

for cls_name, desc in classes_to_add.items():
    if cls_name not in data['classLibrary']:
        data['classLibrary'][cls_name] = {
            "description": desc,
            "masterTraitList": {}
        }

# Inject the standard structural items if they don't exist
# Lobby, Stairs, Elevators
standard_rooms = [
    {
        "id": "util_lobby",
        "class": "Lobby",
        "name": "Grand Lobby",
        "price": 50000,
        "dimensions": {"width": 3, "height": 1},
        "metadata": {"type": "Lobby"},
        "specificDescription": "A spacious transit hub connecting the ground floor to the global simulation."
    },
    {
        "id": "util_stairs",
        "class": "FootTraffic",
        "name": "Service Stairs",
        "price": 5000,
        "dimensions": {"width": 1, "height": 1},
        "metadata": {"type": "Stairs"},
        "specificDescription": "Standard emergency and service transit steps."
    },
    {
        "id": "util_ele",
        "class": "FootTraffic",
        "name": "Standard Elevator",
        "price": 25000,
        "dimensions": {"width": 1, "height": 1},
        "metadata": {"type": "Elevator"},
        "specificDescription": "High-speed vertical transit for primary occupant movement."
    }
]

existing_ids = {r['id'] for r in data['rooms']}

for r in standard_rooms:
    if r['id'] not in existing_ids:
        data['rooms'].append(r)

with open(input_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Updated roomMetadata.json with FootTraffic, Lobby, and structural standard rooms.")
