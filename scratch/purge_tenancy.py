import json
import os

def purge_tenancy():
    path = r'c:\AIDev\AiDev_LLM\villaggio-terrace\src\entities\rooms\roomMetadata.json'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    count = 0
    non_tenancy_classes = ['Lobby', 'FootTraffic', 'Structure', 'Services', 'Utility']
    
    for room in data.get('rooms', []):
        if room.get('class') in non_tenancy_classes or 'empty_floor' in room.get('id', ''):
            metadata = room.get('metadata', {})
            purged = False
            
            # Purge tenancy fields
            if 'tenancy_table' in metadata:
                del metadata['tenancy_table']
                purged = True
            
            # Non-revenue generating modules (Infrastructure/Lobbies)
            if room.get('class') in ['Lobby', 'FootTraffic', 'Structure']:
                if 'average_rent' in metadata:
                    del metadata['average_rent']
                    purged = True
            
            if purged:
                room['metadata'] = metadata
                count += 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    print(f"Purged tenancy data from {count} modules.")

if __name__ == "__main__":
    purge_tenancy()
