import json

filepath = r"src\entities\rooms\roomMetadata.json"

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

errors = 0
for room in data.get("rooms", []):
    if room.get("class") == "Services":
        meta = room.get("metadata", {})
        if "upkeep_cost" not in meta:
            print(f"Error: Room {room['id']} is missing upkeep_cost")
            errors += 1
        if "services_provided" not in meta:
            print(f"Error: Room {room['id']} is missing services_provided")
            errors += 1
        elif not isinstance(meta["services_provided"], list):
            print(f"Error: Room {room['id']} services_provided is not a list")
            errors += 1
        
if errors == 0:
    print("Validation passed. All service rooms have correct schema additions.")
else:
    print(f"Validation failed with {errors} errors.")
