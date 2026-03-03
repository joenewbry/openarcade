import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InputManager } from './input-manager.js';
import { PlayerController } from './player-controller.js';
import { AKWeapon } from './weapon-ak';
import { createBulletSystem } from './bullet-system.ts';
import { WarehouseArena } from './arena-warehouse.js';
import { ContainerYardArena } from './arena-containers.js';

// Character definitions with unique looks and feels
const CHARACTERS = [
  // Hazmat variants
  { id: 'hazmat-yellow', name: 'Toxin', model: 'Character_Hazmat.gltf', color: '#FFD700', description: 'Chemical Specialist' },
  { id: 'hazmat-green', name: 'Poison', model: 'Character_Hazmat.gltf', color: '#32CD32', description: 'Bio Warfare Expert' },
  { id: 'hazmat-orange', name: 'Reactor', model: 'Character_Hazmat.gltf', color: '#FF4500', description: 'Nuclear Engineer' },
  { id: 'hazmat-purple', name: 'Venom', model: 'Character_Hazmat.gltf', color: '#9370DB', description: 'Toxic Avenger' },
  
  // Soldier variants  
  { id: 'soldier-red', name: 'Crimson', model: 'Character_Soldier.gltf', color: '#DC143C', description: 'Assault Specialist' },
  { id: 'soldier-blue', name: 'Storm', model: 'Character_Soldier.gltf', color: '#4169E1', description: 'Tactical Leader' },
  { id: 'soldier-black', name: 'Shadow', model: 'Character_Soldier.gltf', color: '#2F2F2F', description: 'Stealth Operative' },
  { id: 'soldier-white', name: 'Ghost', model: 'Character_Soldier.gltf', color: '#F5F5F5', description: 'Arctic Commando' },
  
  // Enemy variants (using as third character type)
  { id: 'rebel-brown', name: 'Desert', model: 'Character_Enemy.gltf', color: '#CD853F', description: 'Wasteland Warrior' },
  { id: 'rebel-pink', name: 'Neon', model: 'Character_Enemy.gltf', color: '#FF1493', description: 'Cyber Punk' },
  { id: 'rebel-teal', name: 'Ocean', model: 'Character_Enemy.gltf', color: '#20B2AA', description: 'Sea Raider' },
  { id: 'rebel-gold', name: 'Midas', model: 'Character_Enemy.gltf', color: '#FFD700', description: 'Treasure Hunter' }
];

class RicochetGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private selectedCharacter: string | null = null;
  private gameState: 'menu' | 'loading' | 'playing' = 'menu';
  private loader: GLTFLoader;
  private characterModels: Map<string, THREE.Group> = new Map();
  private inputManager: InputManager;
  private playerController: PlayerController;
  private weapon: AKWeapon | null = null;
  private bulletSystem: any | null = null;
  private warehouseArena: WarehouseArena;
  private containerYardArena: ContainerYardArena;
  private currentArena: 'warehouse' | 'container' = 'warehouse';

  constructor() {
    this.init();
    this.setupCharacterSelection();
    this.setupWeapon();
    this.inputManager = new InputManager();
    this.playerController = new PlayerController(this.camera, this.scene, this.inputManager);
  }

  private init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
    
    // Create renderer
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    // Initialize loader
    this.loader = new GLTFLoader();
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Start render loop
    this.animate();
  }

  private setupWeapon(): void {
    this.weapon = new AKWeapon(this.scene, this.camera);
    
    // Load weapon model
    this.weapon.loadModel().then(() => {
      console.log('AK weapon loaded successfully');
    }).catch((error) => {
      console.error('Failed to load AK weapon:', error);
    });
    
    // Set up mouse click to fire
    document.addEventListener('mousedown', (event) => {
      if (event.button === 0 && this.gameState === 'playing' && this.weapon) {
        this.weapon.fire();
      }
    });
    
    // Set up reload with 'r' key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'r' && this.gameState === 'playing' && this.weapon) {
        this.weapon.triggerReload();
      }
    });
  }

  private setupCharacterSelection() {
    const characterGrid = document.getElementById('character-grid');
    const quickPlayBtn = document.getElementById('quick-play') as HTMLButtonElement;
    const inviteFriendBtn = document.getElementById('invite-friend') as HTMLButtonElement;
    
    // Populate character grid
    CHARACTERS.forEach(char => {
      const card = document.createElement('div');
      card.className = 'character-card';
      card.innerHTML = `
        <div class="character-name">${char.name}</div>
        <div class="character-preview" style="background-color: ${char.color};">
          ${char.description}
        </div>
      `;
      
      card.addEventListener('click', () => {
        // Remove previous selection
        document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
        // Add selection to this card
        card.classList.add('selected');
        this.selectedCharacter = char.id;
        
        // Enable play buttons
        quickPlayBtn.disabled = false;
        inviteFriendBtn.disabled = false;
      });
      
      characterGrid?.appendChild(card);
    });
    
    // Initially disable play buttons
    quickPlayBtn.disabled = true;
    inviteFriendBtn.disabled = true;
    
    // Handle quick play
    quickPlayBtn.addEventListener('click', () => {
      this.startQuickPlay();
    });
    
    // Handle invite friend
    inviteFriendBtn.addEventListener('click', () => {
      this.createInviteLink();
    });
  }

  private async startQuickPlay() {
    if (!this.selectedCharacter) return;
    
    const menuOverlay = document.getElementById('menu-overlay');
    const hud = document.getElementById('hud');
    
    // Hide menu, show HUD
    if (menuOverlay) menuOverlay.style.display = 'none';
    if (hud) hud.style.display = 'block';
    
    this.gameState = 'loading';
    
    // Load the selected character
    await this.loadCharacter(this.selectedCharacter);
    
    // Create a simple arena
    this.createSimpleArena();
    
    // Initialize bullet system
    this.bulletSystem = createBulletSystem(this.scene);
    
    // Enable player controller
    this.playerController.enable();
    
    this.gameState = 'playing';
    
    console.log(`Starting quick play with character: ${this.selectedCharacter}`);
  }

  private createInviteLink() {
    if (!this.selectedCharacter) return;
    
    // Create a simple invite link
    const baseUrl = window.location.origin + window.location.pathname;
    const inviteUrl = `${baseUrl}?invite=${Date.now()}&character=${this.selectedCharacter}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(inviteUrl).then(() => {
      alert(`Invite link copied to clipboard!\n\nShare this link: ${inviteUrl}`);
    });
  }

  private async loadCharacter(characterId: string) {
    const character = CHARACTERS.find(c => c.id === characterId);
    if (!character) return;
    
    const modelPath = `./assets/Toon Shooter Game Kit - Dec 2022/Characters/glTF/${character.model}`;
    
    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        this.loader.load(modelPath, resolve, undefined, reject);
      });
      
      const model = gltf.scene;
      model.position.set(0, 0, 0);
      model.scale.setScalar(1);
      
      // Apply character color tint
      model.traverse((child: any) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color.multiply(new THREE.Color(character.color));
        }
      });
      
      this.scene.add(model);
      this.characterModels.set(characterId, model);
      
      console.log(`Loaded character: ${character.name}`);
      
    } catch (error) {
      console.error(`Error loading character ${character.name}:`, error);
    }
  }

  private createSimpleArena() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 }); // Light green
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.scene.add(ground);
    
    // Create some walls for ricochet testing
    const wallGeometry = new THREE.BoxGeometry(0.2, 3, 4);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
    
    // Left wall
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-8, 1.5, 0);
    leftWall.castShadow = true;
    leftWall.userData.isWall = true;
    this.scene.add(leftWall);
    
    // Right wall  
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(8, 1.5, 0);
    rightWall.castShadow = true;
    rightWall.userData.isWall = true;
    this.scene.add(rightWall);
    
    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(16, 3, 0.2);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 1.5, -8);
    backWall.castShadow = true;
    backWall.userData.isWall = true;
    this.scene.add(backWall);
    
    // Front wall (optional)
    const frontWallGeometry = new THREE.BoxGeometry(16, 3, 0.2);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, 1.5, 8);
    frontWall.castShadow = true;
    frontWall.userData.isWall = true;
    this.scene.add(frontWall);
    
    console.log('Simple arena created with walls tagged for collision');
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(deltaTime: number = 0.016) {
    requestAnimationFrame(() => this.animate());
    
    // Rotate character if loaded
    this.characterModels.forEach(model => {
      model.rotation.y += 0.01;
    });
    
    // Update bullet system if active
    if (this.bulletSystem) {
      this.bulletSystem.update(deltaTime);
    }
    
    // Update weapon system
    if (this.weapon) {
      this.weapon.update(deltaTime * 1000);
    }
    
    // Update player controller
    if (this.gameState === 'playing') {
      this.playerController.update(deltaTime);
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RicochetGame();
});

// Check for invite links
const urlParams = new URLSearchParams(window.location.search);
const inviteId = urlParams.get('invite');
const characterId = urlParams.get('character');

if (inviteId && characterId) {
  console.log(`Joining game via invite: ${inviteId} with character: ${characterId}`);
  // TODO: Implement invite join logic
}