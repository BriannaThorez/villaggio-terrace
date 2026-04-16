import json
import os

def migrate_metadata():
    path = r'c:\AIDev\AiDev_LLM\villaggio-terrace\src\entities\rooms\roomMetadata.json'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    count = 0
    for room in data.get('rooms', []):
        if room.get('class') == 'Store':
            metadata = room.get('metadata', {})
            # Determine size from name or ID if missing
            if 'size' not in metadata:
                name = room.get('name', '').lower()
                id_str = room.get('id', '').lower()
                
                if 'small' in name or 'small' in id_str:
                    metadata['size'] = 'Small'
                elif 'medium' in name or 'medium' in id_str:
                    metadata['size'] = 'Medium'
                elif 'large' in name or 'large' in id_str:
                    metadata['size'] = 'Large'
                else:
                    # Default based on dimensions if possible
                    w = room.get('dimensions', {}).get('width', 0)
                    if w <= 1: metadata['size'] = 'Small'
                    elif w <= 3: metadata['size'] = 'Medium'
                    else: metadata['size'] = 'Large'
                
                room['metadata'] = metadata
                count += 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    print(f"Migrated {count} Store entries.")

if __name__ == "__main__":
    migrate_metadata()
