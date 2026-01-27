/* eslint-disable arrow-parens */
import React, { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  Button,
  DropdownItem,
} from "@heroui/react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Formation menu items
const formationItems = [
  { key: "spiral", label: "Spiral Galaxy" },
  { key: "helix", label: "Helix Lattice" },
  { key: "fractal", label: "Fractal Web" },
];

// Color palette menu items
const paletteItems = [
  { key: "nebula", label: "Deep Space Nebula" },
  { key: "orion", label: "Orion Belt" },
  { key: "supernova", label: "Supernova" },
];

// Galactic color palettes - nebula and cosmic themes
const colorPalettes = [
  // Deep Space Nebula - purples, magentas, cosmic dust
  [
    new THREE.Color(0x9b59b6), // Amethyst nebula
    new THREE.Color(0x8e44ad), // Deep purple
    new THREE.Color(0xe056fd), // Hot pink nebula
    new THREE.Color(0xbe2edd), // Vivid magenta
    new THREE.Color(0x5f27cd), // Indigo void
  ],
  // Orion Belt - cyan, teal, stellar blue
  [
    new THREE.Color(0x00d4ff), // Stellar cyan
    new THREE.Color(0x0abde3), // Cosmic teal
    new THREE.Color(0x48dbfb), // Ice blue star
    new THREE.Color(0x0097e6), // Deep space blue
    new THREE.Color(0x74b9ff), // Pale starlight
  ],
  // Supernova - warm cosmic explosion
  [
    new THREE.Color(0xff6b6b), // Red giant
    new THREE.Color(0xfeca57), // Solar flare
    new THREE.Color(0xff9ff3), // Pink supernova
    new THREE.Color(0xf368e0), // Magenta burst
    new THREE.Color(0xffeaa7), // Stardust gold
  ],
];

// GLSL noise functions
const noiseFunctions = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

// Node shader
const nodeShader = {
  vertexShader: `${noiseFunctions}
  attribute float nodeSize;
  attribute float nodeType;
  attribute vec3 nodeColor;
  attribute float distanceFromRoot;
  
  uniform float uTime;
  uniform vec3 uPulsePositions[3];
  uniform float uPulseTimes[3];
  uniform float uPulseSpeed;
  uniform float uBaseNodeSize;
  
  varying vec3 vColor;
  varying float vNodeType;
  varying vec3 vPosition;
  varying float vPulseIntensity;
  varying float vDistanceFromRoot;
  varying float vGlow;
  float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 3.0;
      float waveProximity = abs(distToClick - pulseRadius);
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
  }
  void main() {
      vNodeType = nodeType;
      vColor = nodeColor;
      vDistanceFromRoot = distanceFromRoot;
      vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vPosition = worldPos;
      float totalPulseIntensity = 0.0;
      for (int i = 0; i < 3; i++) {
          totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }
      vPulseIntensity = min(totalPulseIntensity, 1.0);
      float breathe = sin(uTime * 0.7 + distanceFromRoot * 0.15) * 0.15 + 0.85;
      float baseSize = nodeSize * breathe;
      float pulseSize = baseSize * (1.0 + vPulseIntensity * 2.5);
      vGlow = 0.5 + 0.5 * sin(uTime * 0.5 + distanceFromRoot * 0.2);
      vec3 modifiedPosition = position;
      if (nodeType > 0.5) {
          float noise = snoise(position * 0.08 + uTime * 0.08);
          modifiedPosition += normal * noise * 0.15;
      }
      vec4 mvPosition = modelViewMatrix * vec4(modifiedPosition, 1.0);
      gl_PointSize = pulseSize * uBaseNodeSize * (1000.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
  }`,
  fragmentShader: `
  uniform float uTime;
  uniform vec3 uPulseColors[3];
  
  varying vec3 vColor;
  varying float vNodeType;
  varying vec3 vPosition;
  varying float vPulseIntensity;
  varying float vDistanceFromRoot;
  varying float vGlow;
  void main() {
      vec2 center = 2.0 * gl_PointCoord - 1.0;
      float dist = length(center);
      if (dist > 1.0) discard;
      float glow1 = 1.0 - smoothstep(0.0, 0.5, dist);
      float glow2 = 1.0 - smoothstep(0.0, 1.0, dist);
      float glowStrength = pow(glow1, 1.2) + glow2 * 0.3;
      float breatheColor = 0.9 + 0.1 * sin(uTime * 0.6 + vDistanceFromRoot * 0.25);
      vec3 baseColor = vColor * breatheColor;
      vec3 finalColor = baseColor;
      if (vPulseIntensity > 0.0) {
          vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.4);
          finalColor = mix(baseColor, pulseColor, vPulseIntensity * 0.8);
          finalColor *= (1.0 + vPulseIntensity * 1.2);
          glowStrength *= (1.0 + vPulseIntensity);
      }
      float coreBrightness = smoothstep(0.4, 0.0, dist);
      finalColor += vec3(1.0) * coreBrightness * 0.3;
      float alpha = glowStrength * (0.95 - 0.3 * dist);
      float camDistance = length(vPosition - cameraPosition);
      float distanceFade = smoothstep(100.0, 15.0, camDistance);
      if (vNodeType > 0.5) {
          finalColor *= 1.1;
          alpha *= 0.9;
      }
      finalColor *= (1.0 + vGlow * 0.1);
      gl_FragColor = vec4(finalColor, alpha * distanceFade);
  }`,
};

// Connection shader
const connectionShader = {
  vertexShader: `${noiseFunctions}
  attribute vec3 startPoint;
  attribute vec3 endPoint;
  attribute float connectionStrength;
  attribute float pathIndex;
  attribute vec3 connectionColor;
  
  uniform float uTime;
  uniform vec3 uPulsePositions[3];
  uniform float uPulseTimes[3];
  uniform float uPulseSpeed;
  
  varying vec3 vColor;
  varying float vConnectionStrength;
  varying float vPulseIntensity;
  varying float vPathPosition;
  varying float vDistanceFromCamera;
  float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
      
      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 3.0;
      float waveProximity = abs(distToClick - pulseRadius);
      
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
  }
  void main() {
      float t = position.x;
      vPathPosition = t;
      vec3 midPoint = mix(startPoint, endPoint, 0.5);
      float pathOffset = sin(t * 3.14159) * 0.15;
      vec3 perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(0.0, 1.0, 0.0)));
      if (length(perpendicular) < 0.1) perpendicular = vec3(1.0, 0.0, 0.0);
      midPoint += perpendicular * pathOffset;
      vec3 p0 = mix(startPoint, midPoint, t);
      vec3 p1 = mix(midPoint, endPoint, t);
      vec3 finalPos = mix(p0, p1, t);
      float noiseTime = uTime * 0.15;
      float noise = snoise(vec3(pathIndex * 0.08, t * 0.6, noiseTime));
      finalPos += perpendicular * noise * 0.12;
      vec3 worldPos = (modelMatrix * vec4(finalPos, 1.0)).xyz;
      float totalPulseIntensity = 0.0;
      for (int i = 0; i < 3; i++) {
          totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }
      vPulseIntensity = min(totalPulseIntensity, 1.0);
      vColor = connectionColor;
      vConnectionStrength = connectionStrength;
      
      vDistanceFromCamera = length(worldPos - cameraPosition);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }`,
  fragmentShader: `
  uniform float uTime;
  uniform vec3 uPulseColors[3];
  
  varying vec3 vColor;
  varying float vConnectionStrength;
  varying float vPulseIntensity;
  varying float vPathPosition;
  varying float vDistanceFromCamera;
  void main() {
      float flowPattern1 = sin(vPathPosition * 25.0 - uTime * 4.0) * 0.5 + 0.5;
      float flowPattern2 = sin(vPathPosition * 15.0 - uTime * 2.5 + 1.57) * 0.5 + 0.5;
      float combinedFlow = (flowPattern1 + flowPattern2 * 0.5) / 1.5;
      
      vec3 baseColor = vColor * (0.8 + 0.2 * sin(uTime * 0.6 + vPathPosition * 12.0));
      float flowIntensity = 0.4 * combinedFlow * vConnectionStrength;
      vec3 finalColor = baseColor;
      if (vPulseIntensity > 0.0) {
          vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3);
          finalColor = mix(baseColor, pulseColor * 1.2, vPulseIntensity * 0.7);
          flowIntensity += vPulseIntensity * 0.8;
      }
      finalColor *= (0.7 + flowIntensity + vConnectionStrength * 0.5);
      float baseAlpha = 0.7 * vConnectionStrength;
      float flowAlpha = combinedFlow * 0.3;
      float alpha = baseAlpha + flowAlpha;
      alpha = mix(alpha, min(1.0, alpha * 2.5), vPulseIntensity);
      float distanceFade = smoothstep(100.0, 15.0, vDistanceFromCamera);
      gl_FragColor = vec4(finalColor, alpha * distanceFade);
  }`,
};

// Node class for network generation
interface Connection {
  node: Node;
  strength: number;
}

class Node {
  position: THREE.Vector3;
  connections: Connection[];
  level: number;
  type: number;
  size: number;
  distanceFromRoot: number;
  armIndex?: number;
  armT?: number;
  helixIndex?: number;
  helixT?: number;

  constructor(position: THREE.Vector3, level = 0, type = 0) {
    this.position = position;
    this.connections = [];
    this.level = level;
    this.type = type;
    this.size =
      type === 0
        ? THREE.MathUtils.randFloat(0.8, 1.4)
        : THREE.MathUtils.randFloat(0.5, 1.0);
    this.distanceFromRoot = 0;
  }

  addConnection(node: Node, strength = 1.0): void {
    if (!this.isConnectedTo(node)) {
      this.connections.push({ node, strength });
      node.connections.push({ node: this, strength });
    }
  }

  isConnectedTo(node: Node): boolean {
    return this.connections.some((conn) => conn.node === node);
  }
}

// Network generation functions
function generateSpiralGalaxy(densityFactor: number): {
  nodes: Node[];
  rootNode: Node;
} {
  const nodes: Node[] = [];

  // Central supermassive core
  const rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0);
  rootNode.size = 2.5;
  nodes.push(rootNode);

  const numArms = 4;
  const armTightness = 0.35;
  const maxRadius = 22;
  const nodesPerArm = Math.floor(45 * densityFactor);
  const diskThickness = 1.2;

  // Create dense central bulge
  const bulgeNodes = Math.floor(35 * densityFactor);
  const bulgeRadius = 5;
  for (let i = 0; i < bulgeNodes; i++) {
    const r = bulgeRadius * Math.pow(Math.random(), 0.6);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const theta = Math.random() * Math.PI * 2;

    const pos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * 0.6,
      r * Math.cos(phi)
    );

    const level = Math.floor((r / bulgeRadius) * 2);
    const node = new Node(pos, level, 0);
    node.distanceFromRoot = r;
    nodes.push(node);

    if (r < bulgeRadius * 0.4) {
      rootNode.addConnection(node, 0.95);
    }
  }

  // Create spiral arms
  const armArrays: Node[][] = [];
  for (let arm = 0; arm < numArms; arm++) {
    const armPhase = (arm / numArms) * Math.PI * 2;
    const armNodes: Node[] = [];

    for (let i = 0; i < nodesPerArm; i++) {
      const t = i / (nodesPerArm - 1);
      const radius = bulgeRadius + t * (maxRadius - bulgeRadius);

      const spiralAngle =
        armPhase + armTightness * Math.log(radius / bulgeRadius + 1) * 8;

      const armWidth = 1.5 + t * 2.5;
      const offsetAngle = THREE.MathUtils.randFloatSpread(0.3);
      const offsetRadius = THREE.MathUtils.randFloatSpread(armWidth);

      const finalAngle = spiralAngle + offsetAngle;
      const finalRadius = radius + offsetRadius;

      const verticalOffset = THREE.MathUtils.randFloatSpread(
        diskThickness * (1 - t * 0.5)
      );

      const pos = new THREE.Vector3(
        finalRadius * Math.cos(finalAngle),
        verticalOffset,
        finalRadius * Math.sin(finalAngle)
      );

      const level = Math.min(Math.floor(t * 5) + 1, 4);
      const isLeaf = t > 0.8 || Math.random() < 0.25;
      const node = new Node(pos, level, isLeaf ? 1 : 0);
      node.distanceFromRoot = finalRadius;
      node.armIndex = arm;
      node.armT = t;
      nodes.push(node);
      armNodes.push(node);
    }

    armArrays.push(armNodes);

    // Connect nodes along the arm
    for (let i = 0; i < armNodes.length - 1; i++) {
      armNodes[i].addConnection(armNodes[i + 1], 0.85);
      if (i + 2 < armNodes.length && Math.random() < 0.4) {
        armNodes[i].addConnection(armNodes[i + 2], 0.5);
      }
    }
  }

  // Connect bulge to inner arm nodes
  const bulgeNodeList = nodes.filter(
    (n) => n !== rootNode && n.distanceFromRoot < bulgeRadius
  );
  for (const armNodes of armArrays) {
    const innerArmNodes = armNodes.slice(0, 5);
    for (const innerNode of innerArmNodes) {
      const nearestBulge = bulgeNodeList
        .sort(
          (a, b) =>
            innerNode.position.distanceTo(a.position) -
            innerNode.position.distanceTo(b.position)
        )
        .slice(0, 2);
      for (const bulgeNode of nearestBulge) {
        if (!innerNode.isConnectedTo(bulgeNode)) {
          innerNode.addConnection(bulgeNode, 0.7);
        }
      }
    }
  }

  // Connect between adjacent spiral arms
  for (let arm = 0; arm < numArms; arm++) {
    const currentArm = armArrays[arm];
    const nextArm = armArrays[(arm + 1) % numArms];

    for (let i = 5; i < currentArm.length; i += 4) {
      const node = currentArm[i];
      const nearby = nextArm.filter((n) => {
        const dist = node.position.distanceTo(n.position);
        return dist < 8 && Math.abs((n.armT || 0) - (node.armT || 0)) < 0.3;
      });
      if (nearby.length > 0) {
        const closest = nearby.sort(
          (a, b) =>
            node.position.distanceTo(a.position) -
            node.position.distanceTo(b.position)
        )[0];
        if (!node.isConnectedTo(closest)) {
          node.addConnection(closest, 0.5);
        }
      }
    }
  }

  // Add galactic halo
  const haloNodeCount = Math.floor(20 * densityFactor);
  for (let i = 0; i < haloNodeCount; i++) {
    const r = THREE.MathUtils.randFloat(maxRadius * 0.7, maxRadius * 1.3);
    const theta = Math.random() * Math.PI * 2;
    const phi = THREE.MathUtils.randFloatSpread(0.8);

    const pos = new THREE.Vector3(
      r * Math.cos(theta),
      Math.sin(phi) * 4,
      r * Math.sin(theta)
    );

    const node = new Node(pos, 4, 1);
    node.distanceFromRoot = r;
    nodes.push(node);

    const allArmNodes = armArrays.flat();
    const nearest = allArmNodes
      .filter((n) => n.position.distanceTo(pos) < 12)
      .sort(
        (a, b) => pos.distanceTo(a.position) - pos.distanceTo(b.position)
      )
      .slice(0, 2);
    for (const nearNode of nearest) {
      node.addConnection(nearNode, 0.35);
    }
  }

  // Connect within bulge
  for (const bulgeNode of bulgeNodeList) {
    const nearby = bulgeNodeList
      .filter((n) => n !== bulgeNode && !bulgeNode.isConnectedTo(n))
      .sort(
        (a, b) =>
          bulgeNode.position.distanceTo(a.position) -
          bulgeNode.position.distanceTo(b.position)
      )
      .slice(0, 3);
    for (const nearNode of nearby) {
      if (bulgeNode.position.distanceTo(nearNode.position) < 4) {
        bulgeNode.addConnection(nearNode, 0.7);
      }
    }
  }

  return { nodes, rootNode };
}

function generateHelixLattice(densityFactor: number): {
  nodes: Node[];
  rootNode: Node;
} {
  const nodes: Node[] = [];

  const rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0);
  rootNode.size = 1.8;
  nodes.push(rootNode);

  const numHelices = 4;
  const height = 30;
  const maxRadius = 12;
  const nodesPerHelix = Math.floor(50 * densityFactor);
  const helixArrays: Node[][] = [];

  for (let h = 0; h < numHelices; h++) {
    const helixPhase = (h / numHelices) * Math.PI * 2;
    const helixNodes: Node[] = [];

    for (let i = 0; i < nodesPerHelix; i++) {
      const t = i / (nodesPerHelix - 1);
      const y = (t - 0.5) * height;
      const radiusScale = Math.sin(t * Math.PI) * 0.7 + 0.3;
      const radius = maxRadius * radiusScale;
      const angle = helixPhase + t * Math.PI * 6;

      const pos = new THREE.Vector3(
        radius * Math.cos(angle),
        y,
        radius * Math.sin(angle)
      );

      const level = Math.ceil(t * 5);
      const isLeaf = i > nodesPerHelix - 5 || Math.random() < 0.25;
      const node = new Node(pos, level, isLeaf ? 1 : 0);
      node.distanceFromRoot = Math.sqrt(radius * radius + y * y);
      node.helixIndex = h;
      node.helixT = t;
      nodes.push(node);
      helixNodes.push(node);
    }

    helixArrays.push(helixNodes);
    rootNode.addConnection(helixNodes[0], 1.0);

    for (let i = 0; i < helixNodes.length - 1; i++) {
      helixNodes[i].addConnection(helixNodes[i + 1], 0.85);
    }
  }

  for (let h = 0; h < numHelices; h++) {
    const currentHelix = helixArrays[h];
    const nextHelix = helixArrays[(h + 1) % numHelices];

    for (let i = 0; i < currentHelix.length; i += 5) {
      const t = currentHelix[i].helixT || 0;
      const targetIdx = Math.round(t * (nextHelix.length - 1));
      if (targetIdx < nextHelix.length) {
        currentHelix[i].addConnection(nextHelix[targetIdx], 0.7);
      }
    }
  }

  for (const helix of helixArrays) {
    for (let i = 0; i < helix.length; i += 8) {
      const node = helix[i];
      const innerNodes = nodes.filter(
        (n) =>
          n !== node &&
          n !== rootNode &&
          n.distanceFromRoot < node.distanceFromRoot * 0.5
      );
      if (innerNodes.length > 0) {
        const nearest = innerNodes.sort(
          (a, b) =>
            node.position.distanceTo(a.position) -
            node.position.distanceTo(b.position)
        )[0];
        node.addConnection(nearest, 0.5);
      }
    }
  }

  const allHelixNodes = nodes.filter((n) => n !== rootNode);
  for (let i = 0; i < Math.floor(30 * densityFactor); i++) {
    const n1 = allHelixNodes[Math.floor(Math.random() * allHelixNodes.length)];
    const nearby = allHelixNodes.filter((n) => {
      const dist = n.position.distanceTo(n1.position);
      return n !== n1 && dist < 8 && dist > 3 && !n1.isConnectedTo(n);
    });
    if (nearby.length > 0) {
      const n2 = nearby[Math.floor(Math.random() * nearby.length)];
      n1.addConnection(n2, 0.45);
    }
  }

  return { nodes, rootNode };
}

function generateFractalWeb(densityFactor: number): {
  nodes: Node[];
  rootNode: Node;
} {
  const nodes: Node[] = [];

  const rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0);
  rootNode.size = 1.6;
  nodes.push(rootNode);

  const branches = 6;
  const maxDepth = 4;

  function createBranch(
    startNode: Node,
    direction: THREE.Vector3,
    depth: number,
    strength: number,
    scale: number
  ): void {
    if (depth > maxDepth) return;

    const branchLength = 5 * scale;
    const endPos = new THREE.Vector3()
      .copy(startNode.position)
      .add(direction.clone().multiplyScalar(branchLength));

    const isLeaf = depth === maxDepth || Math.random() < 0.3;
    const newNode = new Node(endPos, depth, isLeaf ? 1 : 0);
    newNode.distanceFromRoot = rootNode.position.distanceTo(endPos);
    nodes.push(newNode);
    startNode.addConnection(newNode, strength);

    if (depth < maxDepth) {
      const subBranches = 3;
      for (let i = 0; i < subBranches; i++) {
        const angle = (i / subBranches) * Math.PI * 2;
        const perpDir1 = new THREE.Vector3(
          -direction.y,
          direction.x,
          0
        ).normalize();
        const perpDir2 = direction.clone().cross(perpDir1).normalize();

        const newDir = new THREE.Vector3()
          .copy(direction)
          .add(perpDir1.clone().multiplyScalar(Math.cos(angle) * 0.7))
          .add(perpDir2.clone().multiplyScalar(Math.sin(angle) * 0.7))
          .normalize();

        createBranch(newNode, newDir, depth + 1, strength * 0.7, scale * 0.75);
      }
    }
  }

  for (let i = 0; i < branches; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / branches);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const direction = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    ).normalize();

    createBranch(rootNode, direction, 1, 0.9, 1.0);
  }

  const leafNodes = nodes.filter((n) => n.level >= 2);
  for (let i = 0; i < leafNodes.length; i++) {
    const node = leafNodes[i];
    const nearby = leafNodes
      .filter((n) => {
        const dist = n.position.distanceTo(node.position);
        return n !== node && dist < 10 && !node.isConnectedTo(n);
      })
      .sort(
        (a, b) =>
          node.position.distanceTo(a.position) -
          node.position.distanceTo(b.position)
      )
      .slice(0, 3);

    for (const nearNode of nearby) {
      if (Math.random() < 0.5 * densityFactor) {
        node.addConnection(nearNode, 0.5);
      }
    }
  }

  const midLevelNodes = nodes.filter((n) => n.level >= 2 && n.level <= 3);
  for (const node of midLevelNodes) {
    if (Math.random() < 0.3) {
      const innerNodes = nodes.filter(
        (n) => n !== node && n.distanceFromRoot < node.distanceFromRoot * 0.6
      );
      if (innerNodes.length > 0) {
        const target =
          innerNodes[Math.floor(Math.random() * innerNodes.length)];
        if (!node.isConnectedTo(target)) {
          node.addConnection(target, 0.4);
        }
      }
    }
  }

  return { nodes, rootNode };
}

function generateNeuralNetwork(
  formationIndex: number,
  densityFactor = 1.0
): { nodes: Node[]; rootNode: Node } {
  let result: { nodes: Node[]; rootNode: Node };

  switch (formationIndex % 3) {
    case 0:
      result = generateSpiralGalaxy(densityFactor);
      break;
    case 1:
      result = generateHelixLattice(densityFactor);
      break;
    case 2:
      result = generateFractalWeb(densityFactor);
      break;
    default:
      result = generateSpiralGalaxy(densityFactor);
  }

  let { nodes } = result;
  const { rootNode } = result;

  if (densityFactor < 1.0) {
    const targetCount = Math.ceil(
      nodes.length * Math.max(0.3, densityFactor)
    );
    const toKeep = new Set([rootNode]);

    const sortedNodes = nodes
      .filter((n) => n !== rootNode)
      .sort((a, b) => {
        const scoreA =
          a.connections.length * (1 / (a.distanceFromRoot + 1));
        const scoreB =
          b.connections.length * (1 / (b.distanceFromRoot + 1));
        return scoreB - scoreA;
      });

    for (let i = 0; i < Math.min(targetCount - 1, sortedNodes.length); i++) {
      toKeep.add(sortedNodes[i]);
    }

    nodes = nodes.filter((n) => toKeep.has(n));
    nodes.forEach((node) => {
      node.connections = node.connections.filter((conn) =>
        toKeep.has(conn.node)
      );
    });
  }

  return { nodes, rootNode };
}

// Starfield creation function
function createStarfield(): THREE.Points {
  const count = 12000;
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];

  const starColors = [
    { r: 1.0, g: 1.0, b: 1.0, weight: 0.35 },
    { r: 0.7, g: 0.85, b: 1.0, weight: 0.2 },
    { r: 0.95, g: 0.95, b: 1.0, weight: 0.15 },
    { r: 1.0, g: 0.98, b: 0.9, weight: 0.1 },
    { r: 1.0, g: 0.8, b: 0.6, weight: 0.08 },
    { r: 1.0, g: 0.6, b: 0.5, weight: 0.05 },
    { r: 0.8, g: 0.6, b: 1.0, weight: 0.04 },
    { r: 0.6, g: 0.9, b: 1.0, weight: 0.03 },
  ];

  for (let i = 0; i < count; i++) {
    const r = THREE.MathUtils.randFloat(40, 180);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const flattenFactor = Math.random() < 0.3 ? 0.3 : 1.0;

    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * flattenFactor,
      r * Math.cos(phi)
    );

    const rand = Math.random();
    let cumWeight = 0;
    let selectedColor = starColors[0];
    for (const starColor of starColors) {
      cumWeight += starColor.weight;
      if (rand < cumWeight) {
        selectedColor = starColor;
        break;
      }
    }

    colors.push(
      selectedColor.r + THREE.MathUtils.randFloatSpread(0.1),
      selectedColor.g + THREE.MathUtils.randFloatSpread(0.1),
      selectedColor.b + THREE.MathUtils.randFloatSpread(0.1)
    );

    sizes.push(THREE.MathUtils.randFloat(0.08, 0.45));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;
      void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          float twinkle1 = sin(uTime * 2.5 + position.x * 80.0) * 0.25;
          float twinkle2 = sin(uTime * 1.8 + position.y * 60.0 + position.z * 40.0) * 0.15;
          float twinkle = 0.65 + twinkle1 + twinkle2;
          vTwinkle = twinkle;
          
          gl_PointSize = size * twinkle * (350.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = core * 0.9 + glow * 0.4;
          
          vec3 finalColor = vColor * (0.9 + vTwinkle * 0.3);
          
          gl_FragColor = vec4(finalColor, alpha * 0.85);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geo, mat);
}

// Pulse uniforms
function createPulseUniforms() {
  return {
    uTime: { value: 0.0 },
    uPulsePositions: {
      value: [
        new THREE.Vector3(1e3, 1e3, 1e3),
        new THREE.Vector3(1e3, 1e3, 1e3),
        new THREE.Vector3(1e3, 1e3, 1e3),
      ],
    },
    uPulseTimes: { value: [-1e3, -1e3, -1e3] },
    uPulseColors: {
      value: [
        new THREE.Color(1, 1, 1),
        new THREE.Color(1, 1, 1),
        new THREE.Color(1, 1, 1),
      ],
    },
    uPulseSpeed: { value: 18.0 },
    uBaseNodeSize: { value: 0.6 },
  };
}

// The actual Three.js component (will be dynamically imported)
function ParticlesCanvas({
  formation,
  paletteIndex,
}: {
  formation: number;
  paletteIndex: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    controls: OrbitControls;
    clock: THREE.Clock;
    starField: THREE.Points;
    nodesMesh: THREE.Points | null;
    connectionsMesh: THREE.LineSegments | null;
    animationId: number | null;
    lastPulseIndex: number;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    interactionPlane: THREE.Plane;
    interactionPoint: THREE.Vector3;
  } | null>(null);

  const formationRef = useRef(formation);
  const paletteRef = useRef(paletteIndex);

  // Create network visualization
  const createNetworkVisualization = useCallback(
    (
      scene: THREE.Scene,
      formationIndex: number,
      activePaletteIndex: number,
      existingNodesMesh: THREE.Points | null,
      existingConnectionsMesh: THREE.LineSegments | null
    ): { nodesMesh: THREE.Points; connectionsMesh: THREE.LineSegments } => {
      // Clean up existing meshes
      if (existingNodesMesh) {
        scene.remove(existingNodesMesh);
        existingNodesMesh.geometry.dispose();
        (existingNodesMesh.material as THREE.Material).dispose();
      }
      if (existingConnectionsMesh) {
        scene.remove(existingConnectionsMesh);
        existingConnectionsMesh.geometry.dispose();
        (existingConnectionsMesh.material as THREE.Material).dispose();
      }

      const neuralNetwork = generateNeuralNetwork(formationIndex, 1.0);
      const palette = colorPalettes[activePaletteIndex];

      // Create nodes geometry
      const nodesGeometry = new THREE.BufferGeometry();
      const nodePositions: number[] = [];
      const nodeTypes: number[] = [];
      const nodeSizes: number[] = [];
      const nodeColors: number[] = [];
      const distancesFromRoot: number[] = [];

      neuralNetwork.nodes.forEach((node) => {
        nodePositions.push(node.position.x, node.position.y, node.position.z);
        nodeTypes.push(node.type);
        nodeSizes.push(node.size);
        distancesFromRoot.push(node.distanceFromRoot);

        const colorIndex = Math.min(node.level, palette.length - 1);
        const baseColor = palette[colorIndex % palette.length].clone();
        baseColor.offsetHSL(
          THREE.MathUtils.randFloatSpread(0.03),
          THREE.MathUtils.randFloatSpread(0.08),
          THREE.MathUtils.randFloatSpread(0.08)
        );
        nodeColors.push(baseColor.r, baseColor.g, baseColor.b);
      });

      nodesGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(nodePositions, 3)
      );
      nodesGeometry.setAttribute(
        "nodeType",
        new THREE.Float32BufferAttribute(nodeTypes, 1)
      );
      nodesGeometry.setAttribute(
        "nodeSize",
        new THREE.Float32BufferAttribute(nodeSizes, 1)
      );
      nodesGeometry.setAttribute(
        "nodeColor",
        new THREE.Float32BufferAttribute(nodeColors, 3)
      );
      nodesGeometry.setAttribute(
        "distanceFromRoot",
        new THREE.Float32BufferAttribute(distancesFromRoot, 1)
      );

      const nodesMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(createPulseUniforms()),
        vertexShader: nodeShader.vertexShader,
        fragmentShader: nodeShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const nodesMesh = new THREE.Points(nodesGeometry, nodesMaterial);
      scene.add(nodesMesh);

      // Create connections geometry
      const connectionsGeometry = new THREE.BufferGeometry();
      const connectionColors: number[] = [];
      const connectionStrengths: number[] = [];
      const connectionPositions: number[] = [];
      const startPoints: number[] = [];
      const endPoints: number[] = [];
      const pathIndices: number[] = [];

      const processedConnections = new Set<string>();
      let pathIndex = 0;

      neuralNetwork.nodes.forEach((node, nodeIndex) => {
        node.connections.forEach((connection) => {
          const connectedNode = connection.node;
          const connectedIndex = neuralNetwork.nodes.indexOf(connectedNode);
          if (connectedIndex === -1) return;

          const key = [
            Math.min(nodeIndex, connectedIndex),
            Math.max(nodeIndex, connectedIndex),
          ].join("-");

          if (!processedConnections.has(key)) {
            processedConnections.add(key);
            const startPoint = node.position;
            const endPoint = connectedNode.position;
            const numSegments = 20;

            for (let i = 0; i < numSegments; i++) {
              const t = i / (numSegments - 1);
              connectionPositions.push(t, 0, 0);
              startPoints.push(startPoint.x, startPoint.y, startPoint.z);
              endPoints.push(endPoint.x, endPoint.y, endPoint.z);
              pathIndices.push(pathIndex);
              connectionStrengths.push(connection.strength);

              const avgLevel = Math.min(
                Math.floor((node.level + connectedNode.level) / 2),
                palette.length - 1
              );
              const baseColor = palette[avgLevel % palette.length].clone();
              baseColor.offsetHSL(
                THREE.MathUtils.randFloatSpread(0.03),
                THREE.MathUtils.randFloatSpread(0.08),
                THREE.MathUtils.randFloatSpread(0.08)
              );
              connectionColors.push(baseColor.r, baseColor.g, baseColor.b);
            }
            pathIndex++;
          }
        });
      });

      connectionsGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(connectionPositions, 3)
      );
      connectionsGeometry.setAttribute(
        "startPoint",
        new THREE.Float32BufferAttribute(startPoints, 3)
      );
      connectionsGeometry.setAttribute(
        "endPoint",
        new THREE.Float32BufferAttribute(endPoints, 3)
      );
      connectionsGeometry.setAttribute(
        "connectionStrength",
        new THREE.Float32BufferAttribute(connectionStrengths, 1)
      );
      connectionsGeometry.setAttribute(
        "connectionColor",
        new THREE.Float32BufferAttribute(connectionColors, 3)
      );
      connectionsGeometry.setAttribute(
        "pathIndex",
        new THREE.Float32BufferAttribute(pathIndices, 1)
      );

      const connectionsMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(createPulseUniforms()),
        vertexShader: connectionShader.vertexShader,
        fragmentShader: connectionShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const connectionsMesh = new THREE.LineSegments(
        connectionsGeometry,
        connectionsMaterial
      );
      scene.add(connectionsMesh);

      // Set pulse colors
      palette.forEach((color, i) => {
        if (i < 3) {
          (
            connectionsMaterial.uniforms.uPulseColors.value as THREE.Color[]
          )[i].copy(color);
          (
            nodesMaterial.uniforms.uPulseColors.value as THREE.Color[]
          )[i].copy(color);
        }
      });

      return { nodesMesh, connectionsMesh };
    },
    []
  );

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0612, 0.0018);

    // Camera setup
    const aspect = container.clientWidth / container.clientHeight || 16 / 9;
    const camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
    camera.position.set(0, 22, 32);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050208);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.6;
    controls.minDistance = 8;
    controls.maxDistance = 80;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;

    // Post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      2.2,
      0.5,
      0.6
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // Starfield
    const starField = createStarfield();
    scene.add(starField);

    // Create network
    const { nodesMesh, connectionsMesh } = createNetworkVisualization(
      scene,
      formationRef.current,
      paletteRef.current,
      null,
      null
    );

    // Clock
    const clock = new THREE.Clock();

    // Interaction setup
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const interactionPoint = new THREE.Vector3();

    // Store refs
    sceneRef.current = {
      scene,
      camera,
      renderer,
      composer,
      controls,
      clock,
      starField,
      nodesMesh,
      connectionsMesh,
      animationId: null,
      lastPulseIndex: 0,
      raycaster,
      pointer,
      interactionPlane,
      interactionPoint,
    };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;

      const t = sceneRef.current.clock.getElapsedTime();

      if (sceneRef.current.nodesMesh) {
        (
          sceneRef.current.nodesMesh.material as THREE.ShaderMaterial
        ).uniforms.uTime.value = t;
        sceneRef.current.nodesMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
      }

      if (sceneRef.current.connectionsMesh) {
        (
          sceneRef.current.connectionsMesh.material as THREE.ShaderMaterial
        ).uniforms.uTime.value = t;
        sceneRef.current.connectionsMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
      }

      sceneRef.current.starField.rotation.y += 0.0002;
      (
        sceneRef.current.starField.material as THREE.ShaderMaterial
      ).uniforms.uTime.value = t;

      sceneRef.current.controls.update();
      sceneRef.current.composer.render();

      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current || !container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      sceneRef.current.camera.aspect = width / height;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(width, height);
      sceneRef.current.composer.setSize(width, height);
    };

    // Handle click for pulse effect
    const handleClick = (event: MouseEvent) => {
      if (!sceneRef.current || !container) return;

      const rect = container.getBoundingClientRect();
      sceneRef.current.pointer.x =
        ((event.clientX - rect.left) / rect.width) * 2 - 1;
      sceneRef.current.pointer.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;

      sceneRef.current.raycaster.setFromCamera(
        sceneRef.current.pointer,
        sceneRef.current.camera
      );

      sceneRef.current.interactionPlane.normal
        .copy(sceneRef.current.camera.position)
        .normalize();
      sceneRef.current.interactionPlane.constant =
        -sceneRef.current.interactionPlane.normal.dot(
          sceneRef.current.camera.position
        ) +
        sceneRef.current.camera.position.length() * 0.5;

      if (
        sceneRef.current.raycaster.ray.intersectPlane(
          sceneRef.current.interactionPlane,
          sceneRef.current.interactionPoint
        )
      ) {
        const time = sceneRef.current.clock.getElapsedTime();

        if (sceneRef.current.nodesMesh && sceneRef.current.connectionsMesh) {
          sceneRef.current.lastPulseIndex =
            (sceneRef.current.lastPulseIndex + 1) % 3;

          const nodeUniforms = (
            sceneRef.current.nodesMesh.material as THREE.ShaderMaterial
          ).uniforms;
          const connUniforms = (
            sceneRef.current.connectionsMesh.material as THREE.ShaderMaterial
          ).uniforms;

          (nodeUniforms.uPulsePositions.value as THREE.Vector3[])[
            sceneRef.current.lastPulseIndex
          ].copy(sceneRef.current.interactionPoint);
          (nodeUniforms.uPulseTimes.value as number[])[
            sceneRef.current.lastPulseIndex
          ] = time;

          (connUniforms.uPulsePositions.value as THREE.Vector3[])[
            sceneRef.current.lastPulseIndex
          ].copy(sceneRef.current.interactionPoint);
          (connUniforms.uPulseTimes.value as number[])[
            sceneRef.current.lastPulseIndex
          ] = time;

          const palette = colorPalettes[paletteRef.current];
          const randomColor =
            palette[Math.floor(Math.random() * palette.length)];

          (nodeUniforms.uPulseColors.value as THREE.Color[])[
            sceneRef.current.lastPulseIndex
          ].copy(randomColor);
          (connUniforms.uPulseColors.value as THREE.Color[])[
            sceneRef.current.lastPulseIndex
          ].copy(randomColor);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    container.addEventListener("click", handleClick);

    // Start animation
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("click", handleClick);

      if (sceneRef.current) {
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }

        // Dispose geometries and materials
        if (sceneRef.current.nodesMesh) {
          sceneRef.current.nodesMesh.geometry.dispose();
          (sceneRef.current.nodesMesh.material as THREE.Material).dispose();
        }
        if (sceneRef.current.connectionsMesh) {
          sceneRef.current.connectionsMesh.geometry.dispose();
          (sceneRef.current.connectionsMesh.material as THREE.Material).dispose();
        }
        sceneRef.current.starField.geometry.dispose();
        (sceneRef.current.starField.material as THREE.Material).dispose();

        sceneRef.current.controls.dispose();
        sceneRef.current.renderer.dispose();
        sceneRef.current.composer.dispose();
      }

      sceneRef.current = null;
    };
  }, [createNetworkVisualization]);

  // Handle formation/palette changes
  useEffect(() => {
    if (!sceneRef.current) return;

    if (
      formationRef.current !== formation ||
      paletteRef.current !== paletteIndex
    ) {
      formationRef.current = formation;
      paletteRef.current = paletteIndex;

      const { nodesMesh, connectionsMesh } = createNetworkVisualization(
        sceneRef.current.scene,
        formation,
        paletteIndex,
        sceneRef.current.nodesMesh,
        sceneRef.current.connectionsMesh
      );

      sceneRef.current.nodesMesh = nodesMesh;
      sceneRef.current.connectionsMesh = connectionsMesh;
    }
  }, [formation, paletteIndex, createNetworkVisualization]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

// Dynamically import the canvas component to avoid SSR issues
const DynamicParticlesCanvas = dynamic(
  () => Promise.resolve(ParticlesCanvas),
  { ssr: false }
);

export default function Particles() {
  const [formation, setFormation] = useState(0);
  const [paletteIndex, setPaletteIndex] = useState(0);

  const handleFormationChange = (key: string) => {
    const index = formationItems.findIndex((item) => item.key === key);
    if (index !== -1) {
      setFormation(index);
    }
  };

  const handlePaletteChange = (key: string) => {
    const index = paletteItems.findIndex((item) => item.key === key);
    if (index !== -1) {
      setPaletteIndex(index);
    }
  };

  return (
    <div>
      <DynamicParticlesCanvas formation={formation} paletteIndex={paletteIndex} />
      <div id="animationButton">
        <Dropdown>
          <DropdownTrigger>
            <Button variant="bordered">Animations</Button>
          </DropdownTrigger>
          <DropdownMenu aria-label="Animation Settings">
            <DropdownSection title="Formation" showDivider>
              {formationItems.map((item) => (
                <DropdownItem
                  key={item.key}
                  onPress={() => handleFormationChange(item.key)}
                >
                  {item.label}
                </DropdownItem>
              ))}
            </DropdownSection>
            <DropdownSection title="Color Palette">
              {paletteItems.map((item) => (
                <DropdownItem
                  key={item.key}
                  onPress={() => handlePaletteChange(item.key)}
                >
                  {item.label}
                </DropdownItem>
              ))}
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
}
