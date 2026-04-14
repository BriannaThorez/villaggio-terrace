import json
import os

metadata_path = "src/entities/rooms/roomMetadata.json"

with open(metadata_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Task 1.1: Extend schema to support textures
# We'll inject default properties into all Apartment class rooms for now,
# or create a generic 'residence' key if the user meant a generic template.
# Let's add them to all Apartment objects.
for room in data.get('rooms', []):
    if room.get('class') == 'Apartment':
        if 'metadata' not in room:
            room['metadata'] = {}
        # Assign defaults based on the new architecture
        room['metadata']['wallTexture'] = "beige_wall_1"
        room['metadata']['floorTexture'] = "wood_floor_1"
        room['metadata']['ceilingTexture'] = "beige_wall_1"

# The user explicitly asked to "Migrate the studio1 definition within roomMetadata.json to a generalized residence key"
# Since there is no studio1, we will add a generic 'residence' definitions block in the root or classLibrary
if 'residence' not in data:
    data['residence'] = {
        "wallTexture": "beige_wall_1",
        "floorTexture": "wood_floor_1",
        "ceilingTexture": "beige_wall_1"
    }

with open(metadata_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Updated roomMetadata.json with generic residence definitions and texture schema.")
