import { Object3DNode } from '@react-three/fiber';
import { ShaderMaterial } from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      shapeSDFMaterial: Object3DNode<ShaderMaterial, typeof ShaderMaterial>;
    }
  }
}

declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.webp";
declare module "*.avif";
declare module "*.gif";
declare module "*.bmp";
declare module "*.svg";
