import json

input_path = r'c:\AIDev\AiDev_LLM\villaggio-terrace\src\entities\rooms\roomMetadata.json'

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Ensure Services is in classLibrary
if 'Services' not in data['classLibrary']:
    data['classLibrary']['Services'] = {
        "description": "Essential facilities catering to the needs of specific tenant classes.",
        "masterTraitList": {}
    }

def categorize_service(name, desc):
    text = (name + " " + desc).lower()
    if 'office' in text or 'copy' in text or 'courier' in text or 'printing' in text:
        return 'Office Service'
    if 'resid' in text or 'laundry' in text or 'laundromat' in text or 'dry clean' in text or 'daycare' in text or 'grocery' in text:
        return 'Residential Service'
    if 'hotel' in text or 'maid' in text or 'room service' in text or 'concierge' in text:
        return 'Hotel Service'
    
    return 'General Service'

for r in data['rooms']:
    if r.get('class') == 'Unknown' or r.get('class') == 'Service':
        r['class'] = 'Services'
        service_type = categorize_service(r.get('name', ''), r.get('specificDescription', ''))
        
        if 'metadata' not in r:
            r['metadata'] = {}
            
        r['metadata']['type'] = service_type

with open(input_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Consolidated Unknown into Services class with respective types.")
