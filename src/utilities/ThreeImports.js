// Central location for Three.js imports to avoid multiple instances

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Helper function to add axes helper and grid to visualize the 3D space
export function addDebugHelpers(scene, size = 1000) {
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(size);
    scene.add(axesHelper);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(size, 10);
    scene.add(gridHelper);
    
    console.log('Debug helpers added to scene');
    return { axesHelper, gridHelper };
}

export { THREE, GLTFLoader, OrbitControls }; 