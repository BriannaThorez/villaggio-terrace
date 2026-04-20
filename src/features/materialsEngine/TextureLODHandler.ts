import * as THREE from "three";
import { createTextureCache } from "./api";
import type { TextureBundle } from "./presets/materials";
import { getTextureBundle as getOriginalBundle } from "./presets/materials";

export interface CameraMetrics {
  position: [number, number, number];
  zoom: number;
}

export interface PredictiveMetrics {
  velocity: THREE.Vector3;
  targetRect: THREE.Box2;
}

/**
 * Texture LOD System
 * - Manages progressive loading of materials.
 * - Handles predictive pre-fetching based on camera frustum and velocity.
 * - Centralizes texture caching to prevent redundant HTTP requests and VRAM spikes.
 */
class TextureLODManager {
  private memoryCache = createTextureCache<TextureBundle>();
  private activeLoads = new Map<string, Promise<TextureBundle>>();
  private lowResPlaceholders = new Map<string, TextureBundle>();
  
  // Predictive tracking state
  private lastCameraPos = new THREE.Vector3();
  private lastTime = performance.now();

  private createSolidPlaceholder(colorHex: string): TextureBundle {
    if (this.lowResPlaceholders.has(colorHex)) {
      return this.lowResPlaceholders.get(colorHex)!;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = colorHex;
      ctx.fillRect(0, 0, 8, 8);
      
      // Simulate blurred placeholder
      ctx.filter = "blur(1px)";
      ctx.drawImage(canvas, 0, 0);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    const normalData = new Uint8Array([128, 128, 255, 255]);
    const normalTex = new THREE.DataTexture(normalData, 1, 1, THREE.RGBAFormat);
    normalTex.needsUpdate = true;

    const armData = new Uint8Array([255, 128, 0, 255]); // white AO, mid rough, no metal
    const armTex = new THREE.DataTexture(armData, 1, 1, THREE.RGBAFormat);
    armTex.needsUpdate = true;

    const nullDisp = new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat);
    nullDisp.needsUpdate = true;

    const bundle: TextureBundle = {
      albedoMap: texture,
      aoMap: armTex,
      roughnessMap: armTex,
      metalnessMap: armTex,
      normalMap: normalTex,
      displacementMap: nullDisp,
      isPlaceholder: true
    };

    this.lowResPlaceholders.set(colorHex, bundle);
    return bundle;
  }

  public getBundleProgressiveSync(assetName: string, fallbackColor: string = "#808080"): { progressive: TextureBundle, promise: Promise<TextureBundle> } {
    const cached = this.memoryCache.get(assetName);
    if (cached) {
      return { progressive: cached, promise: Promise.resolve(cached) };
    }

    const placeholder = this.createSolidPlaceholder(fallbackColor);

    if (!this.activeLoads.has(assetName)) {
      const loadPromise = new Promise<TextureBundle>((resolve, reject) => {
        setTimeout(() => {
            getOriginalBundle(assetName)
              .then(bundle => {
                  this.memoryCache.set(assetName, bundle);
                  resolve(bundle);
              })
              .catch(reject);
        }, 50);
      });
      this.activeLoads.set(assetName, loadPromise);
      loadPromise.finally(() => {
        this.activeLoads.delete(assetName);
      });
    }

    return { progressive: placeholder, promise: this.activeLoads.get(assetName)! };
  }


  /**
   * Predictive Frustum Sweeping.
   * Based on camera delta and zoom, identifies regions to affirmatively pre-cache.
   */
  public updateFrustumPriority(metrics: CameraMetrics, nodeGridLocations: string[]) {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt === 0) return;

    const pos = new THREE.Vector3(metrics.position[0], metrics.position[1], metrics.position[2]);
    const velocity = new THREE.Vector3().subVectors(pos, this.lastCameraPos).divideScalar(dt);
    this.lastCameraPos.copy(pos);

    // Compute expanded frustum bounds based on velocity (anticipatory pre-fetch window)
    const viewSizeX = 100 / metrics.zoom;
    const viewSizeY = 100 / metrics.zoom;

    const paddingX = viewSizeX * 0.5 + Math.abs(velocity.x * 0.5);
    const paddingY = viewSizeY * 0.5 + Math.abs(velocity.y * 0.5);

    const targetRect = new THREE.Box2(
      new THREE.Vector2(pos.x - paddingX, pos.y - paddingY),
      new THREE.Vector2(pos.x + paddingX, pos.y + paddingY)
    );

    // Placeholder: Node-Grid overlap check algorithm would go here
    // If node intersects targetRect, initiate `getBundleProgressive` for its mapped metadata asset
  }
  
  public purgeRedundant() {
    this.memoryCache.prune(64, 300000); // Purge older than 5 mins or exceeding 64 items
  }

  /**
   * INJECTION POINT (Phase 1.5.5)
   * Hand over pre-warmed bundles from the startup preloader or hover-warming
   * to the persistent memory cache.
   */
  public injectBundle(assetName: string, bundle: TextureBundle): void {
    if (!this.memoryCache.has(assetName)) {
      console.debug(`[TextureLODHandler] memoryCache WRITE: "${assetName}" (${bundle.isPlaceholder ? 'PLACEHOLDER' : '4K-bundle'})`);
      this.memoryCache.set(assetName, bundle);
    } else {
      console.debug(`[TextureLODHandler] memoryCache HIT (dedup skip): "${assetName}"`);
    }
  }

  /**
   * PROMOTION POINT (Phase 3)
   * If a load is already in-flight (e.g. from hover-warming), 
   * returns that existing promise to the caller. Ensures the 
   * UI can prioritize the high-fidelity asset over the placeholder.
   */
  public promoteToForeground(assetName: string): Promise<TextureBundle> {
    const cached = this.memoryCache.get(assetName);
    if (cached) return Promise.resolve(cached);

    const active = this.activeLoads.get(assetName);
    if (active) {
      return active;
    }

    // Default: Return the promise from a fresh load
    return this.getBundleProgressiveSync(assetName).promise;
  }
}

export const textureLODHandler = new TextureLODManager();
