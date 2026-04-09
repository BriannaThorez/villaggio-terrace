import json
import os

def update_metadata():
    json_path = 'src/entities/rooms/roomMetadata.json'
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r') as f:
        data = json.load(f)

    category_descriptions = {
        "Office": "Premium professional environments optimized for high-performance corporate operations.",
        "Residential": "High-end urban living spaces designed for elegance, comfort, and state-of-the-art amenities.",
        "Commercial": "Dynamic retail and service hubs positioned for maximum visibility and customer engagement.",
        "Lobby": "Grand entrance halls providing a world-class first impression and effortless circulation flow.",
        "Utilities": "Essential infrastructure systems ensuring peak operational efficiency for the entire tower.",
        "Service": "Specialized utility nodes tailored for the specific maintenance and support of tower tenants.",
        "Structural": "Robust architectural scaffolds providing the foundational integrity for vertical expansion.",
        "Stairs": "High-traffic circulation routes providing reliable vertical access between adjacent floors.",
        "Elevator": "Advanced vertical transit systems delivering rapid transit across the tower's height."
    }

    def generate_specific_description(item):
        name = item.get('name', 'Room')
        meta = item.get('metadata', {})
        variant = meta.get('variant', '')
        cls = meta.get('class', '')
        category = item.get('category', '').lower()
        
        if variant:
            return f"A high-efficiency {variant.lower()} module engineered for professional {variant.lower()} results."
        if cls:
            return f"An industry-leading {cls.lower()}-class {category} implementation for modern urban density."
        return f"A versatile {category} unit optimized for flexible architectural integration."

    for item in data:
        # 1. Scaling Costs (Price and Build Cost)
        p = item.get('price')
        if p is not None and isinstance(p, (int, float)):
            item['price'] = int(p * 1000)
        
        meta = item.get('metadata', {})
        bc = meta.get('build_cost')
        if bc is not None and isinstance(bc, (int, float)):
             meta['build_cost'] = int(bc * 1000)
        
        # 2. Scaling Rent
        ar = meta.get('average_rent')
        if ar is not None and isinstance(ar, (int, float)):
            meta['average_rent'] = int(ar * 100)

        # 3. Generating Descriptions
        item['categoryDescription'] = category_descriptions.get(item.get('category', ''), "A premium architectural asset.")
        item['specificDescription'] = generate_specific_description(item)

    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Successfully updated {len(data)} metadata entries.")

if __name__ == "__main__":
    update_metadata()
