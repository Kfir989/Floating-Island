import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import gsap from 'gsap';

// ──────────────────────────────────────────────
// Raycaster & pointer
// ──────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// ──────────────────────────────────────────────
// Scene & canvas
// ──────────────────────────────────────────────
const scene = new THREE.Scene();
const canvas = document.querySelector('.exp-canvas');

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

// ──────────────────────────────────────────────
// Page modals
// ──────────────────────────────────────────────
const modals = {
  overview: document.querySelector('.page.overview'),
  about: document.querySelector('.page.aboutme'),
  projects: document.querySelector('.page.projects')
};

const showPage = (page) => {
  if (page.style.display !== 'block') {     
    page.style.display = 'block';
    gsap.fromTo(page, { opacity: 0 }, { opacity: 1, duration: 0.5 });
  }
};

const hidePage = (page) => {
  gsap.to(page, {
    opacity: 0,
    duration: 0.5,
    onComplete: () => { page.style.display = 'none'; }
  });
};

// ──────────────────────────────────────────────
// Mouse events
// ──────────────────────────────────────────────

window.addEventListener("load", () => {
  const loader = document.getElementById("loading-screen");
  if (!loader) return;

  // Load EXR environment
  new EXRLoader().load(
    "/environment/sky.exr",
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;

      // Fade out loader after EXR is ready
      gsap.to(loader, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          loader.style.display = "none";
          document.body.classList.remove("loading"); // <-- show the page
        }
      });
    },
    undefined,
    (error) => {
      console.error("Error loading EXR:", error);
      gsap.to(loader, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          loader.style.display = "none";
          document.body.classList.remove("loading"); // <-- show the page even on error
        }
      });
    }
  );
});

function updatePointer(event) {
  if (event.type.startsWith('touch')) {
    const touch = event.touches[0];
    pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
  } else {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
}

function handlePick() {
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    if (obj.name.includes('Box001_Material_#25_0002')) {
      showPage(modals.overview);
    } else if (obj.name.includes('Box001_Material_#25_0001')) {
      showPage(modals.projects);
    } else if (obj.name.includes('Box001_Material_#25_0')) {
      showPage(modals.about);
    }
  }
}

// Pointer updates
window.addEventListener('mousemove', updatePointer);
window.addEventListener('touchmove', updatePointer);
window.addEventListener('touchstart', updatePointer);

// Picking
window.addEventListener('click', handlePick);      // desktop
window.addEventListener('touchend', handlePick);  // mobile

document.querySelectorAll('.page .exit-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const page = e.target.closest('.page');
    hidePage(page);
  }); 
});

// ──────────────────────────────────────────────
// Loaders
// ──────────────────────────────────────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

let windmill = null;
const RayObjects = [];  

gltfLoader.load(
  '/model/myIsland6-v1.glb',
  (gltf) => {
    gltf.scene.scale.set(0.4, 0.4, 0.4);
    gltf.scene.position.set(0, -1, 0);
    scene.add(gltf.scene);

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name.includes('motor_2_Mat_0')) {
          windmill = child;
        }
        if (child.name.includes('Box001_Material_#25_0')) {
          RayObjects.push(child);
        }
      }
    });
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  (error) => {
    console.error('An error happened', error);
  }
);

new EXRLoader().load('/environment/sky.exr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = texture;
});

// ──────────────────────────────────────────────
// Camera, light & renderer
// ──────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1000
);

camera.position.set(-10.63521213976237, 3.88540793534024, -2.13580940284623);

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ──────────────────────────────────────────────
// Controls
// ──────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.screenSpacePanning = false;
controls.enableZoom = true;
controls.minDistance = 10;
controls.maxDistance = 12;
delete controls.mouseButtons.RIGHT; 

const radius = camera.position.distanceTo(controls.target);
controls.minPolarAngle = Math.asin(Math.min(1, 2 / radius)); 
controls.maxPolarAngle = Math.PI / 2.2;
controls.update();

// ──────────────────────────────────────────────
// Resize
// ──────────────────────────────────────────────
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ──────────────────────────────────────────────
// Render loop
// ──────────────────────────────────────────────
let intersects = [];

function render() {
  if (windmill) {
    windmill.rotation.z -= 0.01;
  }

  raycaster.setFromCamera(pointer, camera);

  intersects = raycaster.intersectObjects(RayObjects);

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();