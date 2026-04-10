import json

input_path = r'c:\AIDev\AiDev_LLM\villaggio-terrace\src\entities\rooms\roomMetadata.json'

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Core valid classes allowed on the main menu
VALID_CLASSES = ['Residential', 'Office', 'Commercial', 'Services', 'Lobby', 'FootTraffic', 'Unknown']

for r in data['rooms']:
    current_class = r.get('class', 'Unknown')
    text = (r.get('name', '') + " " + r.get('specificDescription', '') + " " + current_class).lower()
    
    if 'metadata' not in r:
        r['metadata'] = {}

    # Condense Residential variants
    if current_class == 'Apartment':
        r['class'] = 'Residential'
        r['metadata']['type'] = 'Apartment'
        continue

    # Condense Commercial variants
    if current_class in ['Restaurant', 'Store']:
        r['class'] = 'Commercial'
        r['metadata']['type'] = current_class
        continue

    # If it's not a valid primary class, it's either a Service or Unknown
    if current_class not in VALID_CLASSES:
        # Determine if it's a service
        service_keywords = ['service', 'plumber', 'laundromat', 'daycare', 'clean', 'floral', 'tailoring', 'club', 'charter', 'yoga']
        if 'club' in text or 'charter' in text or 'yoga' in text or any(k in text for k in service_keywords):
            r['class'] = 'Services'
            r['metadata']['type'] = current_class # Keep the old specific string as its Type!
            
            # Domain sorting
            if 'office' in text or 'copy' in text or 'courier' in text or 'print' in text or 'audit' in text or 'staffing' in text or 'corporate' in text:
                r['metadata']['serviceDomain'] = 'Office Service'
            elif 'resid' in text or 'laundry' in text or 'yoga' in text or 'dog' in text or 'plumber' in text or 'daycare' in text or 'floral' in text or 'decor' in text or 'clean' in text:
                r['metadata']['serviceDomain'] = 'Residential Service'
            elif 'hotel' in text or 'maid' in text:
                r['metadata']['serviceDomain'] = 'Hotel Service'
            else:
                r['metadata']['serviceDomain'] = 'General Service'
        else:
            r['class'] = 'Unknown'
            r['metadata']['type'] = current_class

# Clean Class Library
new_lib = {}
for vc in VALID_CLASSES:
    if vc in data['classLibrary']:
        new_lib[vc] = data['classLibrary'][vc]
    else:
        new_lib[vc] = {"description": f"{vc} properties", "masterTraitList": {}}

data['classLibrary'] = new_lib

with open(input_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Globally consolidated classes.")
