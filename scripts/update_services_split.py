import json

input_path = r'c:\AIDev\AiDev_LLM\villaggio-terrace\src\entities\rooms\roomMetadata.json'

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Ensure Services and Unknown are in classLibrary
if 'Services' not in data['classLibrary']:
    data['classLibrary']['Services'] = {
        "description": "Essential facilities catering to the needs of specific tenant classes.",
        "masterTraitList": {}
    }
if 'Unknown' not in data['classLibrary']:
    data['classLibrary']['Unknown'] = {
        "description": "Uncategorized anomalous elements.",
        "masterTraitList": {}
    }

service_keywords = ['laundry', 'laundromat', 'daycare', 'courier', 'printing', 'concierge', 'maid', 'grocery', 'service', 'dry clean', 'valet']

for r in data['rooms']:
    if r.get('class') == 'Services' or r.get('class') == 'Unknown':
        text = (r.get('name', '') + " " + r.get('specificDescription', '')).lower()
        is_service = any(k in text for k in service_keywords)
        
        if is_service:
            r['class'] = 'Services'
            if 'office' in text or 'copy' in text or 'courier' in text or 'printing' in text:
                stype = 'Office Service'
            elif 'resid' in text or 'laundry' in text or 'laundromat' in text or 'dry clean' in text or 'daycare' in text or 'grocery' in text:
                stype = 'Residential Service'
            elif 'hotel' in text or 'maid' in text or 'room service' in text or 'concierge' in text:
                stype = 'Hotel Service'
            else:
                stype = 'General Service'
                
            if 'metadata' not in r: r['metadata'] = {}
            r['metadata']['type'] = stype
        else:
            r['class'] = 'Unknown'
            if 'metadata' not in r: r['metadata'] = {}
            r['metadata']['type'] = 'Unclassified'

with open(input_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Split Unknown into Services and Unknown.")
