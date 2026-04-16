import json
import os

file_path = 'src/entities/rooms/roomMetadata.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

modified_count = 0
for room in data.get('rooms', []):
    if room.get('class') == 'Store':
        metadata = room.get('metadata', {})
        # If size is missing, try to get it from 'type'
        if 'size' not in metadata:
            if 'type' in metadata:
                metadata['size'] = metadata['type']
            else:
                # Fallback: check ID or Name for keywords
                room_id = room.get('id', '').lower()
                if 'small' in room_id:
                    metadata['size'] = 'Small'
                elif 'medium' in room_id:
                    metadata['size'] = 'Medium'
                elif 'large' in room_id:
                    metadata['size'] = 'Large'
                elif 'luxury' in room_id:
                    metadata['size'] = 'Luxury'
                else:
                    metadata['size'] = 'Standard'
            modified_count += 1

print(f"Modified {modified_count} Store rooms.")

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
