/**
 * RoomMetadata JSON editor script.
 * Adds class-level texture defaults to classLibrary entries.
 * Run with: node scripts/add_class_textures.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '..', 'src', 'entities', 'rooms', 'roomMetadata.json');

const data = JSON.parse(readFileSync(filePath, 'utf-8'));

// Class-level texture defaults
// Each class has a canonical wall/floor/ceiling texture.
// Individual room entries override these; classes serve as the fallback.
const CLASS_TEXTURES = {
  Apartment: {
    wallTexture: "beige_wall_1",
    floorTexture: "wood_floor_1",
    ceilingTexture: "beige_wall_1"
  },
  Office: {
    wallTexture: "concrete_wall_1",
    floorTexture: "concrete_floor_1",
    ceilingTexture: "concrete_wall_1"
  },
  Restaurant: {
    wallTexture: "beige_wall_1",
    floorTexture: "wood_floor_1",
    ceilingTexture: "beige_wall_1"
  },
  Store: {
    wallTexture: "beige_wall_1",
    floorTexture: "wood_floor_1",
    ceilingTexture: "beige_wall_1"
  },
  Services: {
    wallTexture: "concrete_wall_1",
    floorTexture: "concrete_floor_1",
    ceilingTexture: "concrete_wall_1"
  },
  Lobby: {
    wallTexture: "beige_wall_1",
    floorTexture: "grey_cartago_tiles",
    ceilingTexture: "concrete_wall_1"
  },
  FootTraffic: {
    wallTexture: "concrete_wall_1",
    floorTexture: "concrete_floor_1",
    ceilingTexture: "concrete_wall_1"
  },
  Hotel: {
    wallTexture: "beige_wall_1",
    floorTexture: "wood_floor_1",
    ceilingTexture: "beige_wall_1"
  }
};

// Inject texture defaults into each classLibrary entry
for (const [className, textures] of Object.entries(CLASS_TEXTURES)) {
  if (data.classLibrary[className]) {
    data.classLibrary[className].defaultTextures = textures;
    console.log(`✅ Added defaultTextures to classLibrary.${className}`);
  } else {
    console.warn(`⚠️  classLibrary.${className} not found`);
  }
}

// Write back with 2-space indent, preserving all existing data
writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
console.log('✅ roomMetadata.json updated successfully.');
