import json

filepath = r"src\entities\rooms\roomMetadata.json"

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

services_schema = data.get("masterTraitSchema", {}).get("services", {})
all_services = []
for k, v in services_schema.items():
    all_services.extend(v)

modified_count = 0
for room in data.get("rooms", []):
    if room.get("class") == "Services":
        rid = room.get("id", "")
        # Find matching service
        matched_services = []
        for svc in all_services:
            if svc.replace("_", "-") in rid or svc in rid.replace("-", "_"):
                matched_services.append(svc)
        
        # fallback matching
        if not matched_services:
            for svc in all_services:
                if svc.split("_")[0] in rid:
                    matched_services.append(svc)
                    break
        
        if "metadata" not in room:
            room["metadata"] = {}
            
        room["metadata"]["upkeep_cost"] = 1500
        # de-duplicate matched services
        matched = list(set(matched_services))
        if matched:
            # get the longest match to avoid substring issues (e.g. "dog_walking" vs "dog_walking_services")
            longest_match = max(matched, key=len)
            room["metadata"]["services_provided"] = [longest_match]
        else:
            print(f"Warning: No service matched for {rid}")
            room["metadata"]["services_provided"] = []
            
        modified_count += 1

print(f"Modified {modified_count} service rooms.")

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Saved.")
