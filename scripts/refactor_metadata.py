import json
import os

input_path = r'c:\AIDev\AiDev_LLM\villaggio-terrace\src\entities\rooms\roomMetadata.json'
output_path = r'c:\AIDev\AiDev_LLM\villaggio-terrace\src\entities\rooms\roomMetadata.json'

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

class_library = {}
rooms = []

# Collect all potential metadata keys
all_metadata_keys = set()
for item in data:
    if 'metadata' in item:
        all_metadata_keys.update(item['metadata'].keys())

if 'class' in all_metadata_keys:
    all_metadata_keys.remove('class')
master_keys = sorted(list(all_metadata_keys))

for item in data:
    raw_cat = item.get('category', 'Unknown')
    
    if raw_cat not in class_library:
        class_library[raw_cat] = {
            "description": item.get('categoryDescription', 'Standard architectural implementation.'),
            "masterTraitList": {key: None for key in master_keys}
        }
    
    # Build clean variant
    clean_metadata = item.get('metadata', {}).copy()
    if 'class' in clean_metadata:
        del clean_metadata['class']
        
    new_item = {
        "id": item['id'],
        "class": raw_cat,
        "name": item['name'],
        "price": item['price'],
        "dimensions": item['dimensions'],
        "metadata": clean_metadata,
        "specificDescription": item.get('specificDescription', '')
    }
    rooms.append(new_item)

final_data = {
    "classLibrary": class_library,
    "rooms": rooms
}

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(final_data, f, indent=2)

print(f"Successfully refactored {len(rooms)} rooms across {len(class_library)} classes.")
