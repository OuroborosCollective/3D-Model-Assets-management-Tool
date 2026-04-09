import {Component, ElementRef, ViewChild, AfterViewInit, signal, inject, Output, EventEmitter, PLATFORM_ID, computed} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DomSanitizer} from '@angular/platform-browser';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {DescriptionGeneratorService} from '../description-generator.service';
import {ModelAsset} from '../catalog.service';
import {marked} from 'marked';

@Component({
  selector: 'app-model-viewer',
  template: `
    <div class="p-4">
      <h2 class="text-xl font-bold mb-4">3D Modell Viewer</h2>
      
      <div class="mb-4">
        <label for="model-name" class="block text-sm font-medium text-gray-700 mb-1">Modellname</label>
        <div class="relative">
          <input 
            id="model-name"
            type="text" 
            [ngModel]="modelName()" 
            (ngModelChange)="modelName.set($event)" 
            placeholder="Geben Sie einen aussagekräftigen Namen ein..." 
            class="block w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            maxlength="100"
          />
          <div class="absolute right-2 bottom-2 text-[10px] text-gray-400">
            {{ modelName().length }}/100
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">Ein guter Name hilft bei der Suche und Kategorisierung.</p>
      </div>

      <input type="file" (change)="onFileSelected($event)" class="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept=".glb,.gltf,.fbx" />
      @if (errorMessage()) {
        <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-start gap-3">
            <span class="material-icons text-red-600">error_outline</span>
            <div>
              <p class="text-red-700 font-medium">{{ errorMessage() }}</p>
              @if (errorSuggestion()) {
                <p class="text-red-600 text-xs mt-1"><strong>Vorschlag:</strong> {{ errorSuggestion() }}</p>
              }
            </div>
          </div>
        </div>
      }
      
      <div #viewerContainer class="w-full h-96 bg-gray-100 rounded-lg overflow-hidden relative">
        @if (isLoading()) {
          <div class="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/80 z-10">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p class="text-sm font-medium text-blue-600">Lade Modell... {{ loadingProgress() }}%</p>
            <div class="w-48 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div class="h-full bg-blue-600 transition-all duration-300" [style.width.%]="loadingProgress()"></div>
            </div>
          </div>
        }
      </div>
      @if (selectedScreenshot()) {
        <div class="mt-4">
          <h3 class="text-sm font-semibold mb-2 text-gray-700">Vorschau-Screenshot:</h3>
          <img [src]="selectedScreenshot()" alt="Preview" class="w-full h-96 object-contain rounded-lg border bg-black cursor-pointer shadow-inner" (click)="openLargePreview(selectedScreenshot()!)" (keydown.enter)="openLargePreview(selectedScreenshot()!)" tabindex="0" role="button" />
          <p class="text-[10px] text-gray-400 mt-1 text-center italic">Klicken zum Vergrößern</p>
        </div>
      }
      
      @if (largePreviewUrl()) {
        <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" (click)="closeLargePreview()" (keydown.escape)="closeLargePreview()" tabindex="0" role="button">
          <img [src]="largePreviewUrl()" alt="Large Preview" class="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      }
      
      <div class="mt-4 p-4 bg-white shadow rounded-lg">
        <h3 class="font-semibold mb-2">Technische Daten & Screenshots:</h3>
        <p class="text-sm text-gray-600 mb-2">Dreiecke: {{ triangleCount() }}</p>
        
        <div class="flex flex-wrap gap-2 mb-4">
          <button (click)="captureCurrentScreenshot()" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">Erfassen</button>
          <button (click)="captureAngle(0, 0, 5)" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">Front</button>
          <button (click)="captureAngle(0, 5, 0)" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">Oben</button>
          <button (click)="captureAngle(5, 0, 0)" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">Seite</button>
          <button (click)="captureScreenshots()" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition">360°</button>
        </div>

        <div class="border-t pt-4 mb-4">
          <h4 class="text-sm font-bold mb-2">High-Res Download (1920x1080):</h4>
          <div class="flex gap-2">
            <button (click)="downloadScreenshot('png')" class="bg-slate-800 text-white px-3 py-1 rounded text-sm hover:bg-slate-900 transition flex items-center gap-1">
              <span class="material-icons text-xs">download</span> PNG
            </button>
            <button (click)="downloadScreenshot('jpeg')" class="bg-slate-800 text-white px-3 py-1 rounded text-sm hover:bg-slate-900 transition flex items-center gap-1">
              <span class="material-icons text-xs">download</span> JPEG
            </button>
          </div>
        </div>

        <div class="border-t pt-4 mb-4">
          <h4 class="text-sm font-bold mb-2">Beleuchtung & Ausleuchtung:</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="ambient-intensity" class="block text-xs text-gray-500 mb-1">Umgebungslicht (Ambient)</label>
              <input id="ambient-intensity" type="range" min="0" max="2" step="0.1" [ngModel]="ambientIntensity()" (ngModelChange)="ambientIntensity.set($event)" class="w-full" />
            </div>
            <div>
              <label for="directional-intensity" class="block text-xs text-gray-500 mb-1">Direktes Licht (Directional)</label>
              <input id="directional-intensity" type="range" min="0" max="3" step="0.1" [ngModel]="directionalIntensity()" (ngModelChange)="directionalIntensity.set($event)" class="w-full" />
            </div>
            <div>
              <label for="directional-color" class="block text-xs text-gray-500 mb-1">Lichtfarbe</label>
              <input id="directional-color" type="color" [ngModel]="directionalColor()" (ngModelChange)="directionalColor.set($event)" class="w-full h-8 rounded border-0 p-0" />
            </div>
            <div>
              <label for="point-intensity" class="block text-xs text-gray-500 mb-1">Punktlicht (Spotlight)</label>
              <input id="point-intensity" type="range" min="0" max="5" step="0.1" [ngModel]="pointLightIntensity()" (ngModelChange)="pointLightIntensity.set($event)" class="w-full" />
            </div>
          </div>

          <div class="mt-4 border-t pt-4">
            <h4 class="text-sm font-bold mb-2">Spotlight Einstellungen:</h4>
            <div class="flex items-center gap-2 mb-2">
              <input id="spotlight-toggle" type="checkbox" [ngModel]="spotLightEnabled()" (ngModelChange)="spotLightEnabled.set($event)" />
              <label for="spotlight-toggle" class="text-xs text-gray-500">Spotlight aktivieren</label>
            </div>
            @if (spotLightEnabled()) {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="spot-intensity" class="block text-xs text-gray-500 mb-1">Intensität</label>
                  <input id="spot-intensity" type="range" min="0" max="10" step="0.1" [ngModel]="spotLightIntensity()" (ngModelChange)="spotLightIntensity.set($event)" class="w-full" />
                </div>
                <div>
                  <label for="spot-angle" class="block text-xs text-gray-500 mb-1">Winkel</label>
                  <input id="spot-angle" type="range" min="0" [max]="Math.PI/2" step="0.01" [ngModel]="spotLightAngle()" (ngModelChange)="spotLightAngle.set($event)" class="w-full" />
                </div>
                <div>
                  <label for="spot-color" class="block text-xs text-gray-500 mb-1">Farbe</label>
                  <input id="spot-color" type="color" [ngModel]="spotLightColor()" (ngModelChange)="spotLightColor.set($event)" class="w-full h-8 rounded border-0 p-0" />
                </div>
                <div class="flex flex-col gap-1">
                  <span class="block text-xs text-gray-500">Position (X, Y, Z)</span>
                  <div class="flex gap-1">
                    <input aria-label="X Position" type="number" [ngModel]="spotLightPosX()" (ngModelChange)="spotLightPosX.set($event)" class="w-full p-1 border rounded text-xs" />
                    <input aria-label="Y Position" type="number" [ngModel]="spotLightPosY()" (ngModelChange)="spotLightPosY.set($event)" class="w-full p-1 border rounded text-xs" />
                    <input aria-label="Z Position" type="number" [ngModel]="spotLightPosZ()" (ngModelChange)="spotLightPosZ.set($event)" class="w-full p-1 border rounded text-xs" />
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="mt-4 border-t pt-4">
            <h4 class="text-sm font-bold mb-2">Schatten Einstellungen:</h4>
            <div class="flex items-center gap-2 mb-2">
              <input id="shadow-toggle" type="checkbox" [ngModel]="shadowsEnabled()" (ngModelChange)="shadowsEnabled.set($event)" />
              <label for="shadow-toggle" class="text-xs text-gray-500">Schatten aktivieren</label>
            </div>
            @if (shadowsEnabled()) {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="shadow-bias" class="block text-xs text-gray-500 mb-1">Bias (Korrektur)</label>
                  <input id="shadow-bias" type="range" min="-0.01" max="0.01" step="0.0001" [ngModel]="shadowBias()" (ngModelChange)="shadowBias.set($event)" class="w-full" />
                </div>
                <div>
                  <label for="shadow-res" class="block text-xs text-gray-500 mb-1">Schatten-Auflösung (Directional Light)</label>
                  <select id="shadow-res" [ngModel]="shadowResolution()" (ngModelChange)="shadowResolution.set(+$event)" class="w-full p-1 border rounded text-xs bg-white">
                    <option [value]="512">512 (Schnell)</option>
                    <option [value]="1024">1024 (Standard)</option>
                    <option [value]="2048">2048 (Hoch)</option>
                    <option [value]="4096">4096 (Ultra)</option>
                  </select>
                </div>
              </div>
            }
          </div>
          
          <div class="mt-4">
            <label for="lighting-preset" class="block text-xs text-gray-500 mb-1">Licht-Presets</label>
            <select id="lighting-preset" (change)="applyLightingPreset($any($event.target).value)" class="w-full p-2 border rounded text-sm bg-white">
              <option value="standard">Standard</option>
              <option value="studio">Studio (Hell & Weich)</option>
              <option value="outdoor">Outdoor (Natürlich)</option>
              <option value="dramatic">Dramatisch (Kontrastreich)</option>
            </select>
          </div>
        </div>

        <div class="border-t pt-4 mb-4">
          <h4 class="text-sm font-bold mb-2">Umgebung (HDRI):</h4>
          <input type="file" (change)="onHdriSelected($event)" class="block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" accept="image/*" />
          <p class="text-[10px] text-gray-400 mt-1">Laden Sie ein Panorama-Bild (.jpg, .png) für Reflexionen hoch.</p>
        </div>

        <div class="border-t pt-4">
          <button (click)="generateDescription()" [disabled]="isLoading() || !modelName()" class="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition mb-2 disabled:bg-gray-400 disabled:cursor-not-allowed">KI-Beschreibung generieren</button>
          <button (click)="onSave()" [disabled]="isLoading() || !currentFileBlob" class="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed">In Katalog speichern</button>
        </div>
        
        @if (description()) {
          <div class="mt-4 p-4 bg-slate-50 rounded-lg border text-sm prose prose-slate max-w-none shadow-inner overflow-auto max-h-96">
            <div [innerHTML]="parsedDescription()"></div>
          </div>
        }
        
        <div class="mt-4 flex gap-2">
          <a href="https://sketchfab.com/upload" target="_blank" class="flex-1 text-center bg-black text-white px-4 py-2 rounded-lg hover:opacity-90 transition">Zu Sketchfab</a>
          <a href="https://www.etsy.com/sell" target="_blank" class="flex-1 text-center bg-orange-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition">Zu Etsy</a>
        </div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [FormsModule]
})
export class ModelViewer implements AfterViewInit {
  @ViewChild('viewerContainer') viewerContainer!: ElementRef;
  @Output() saveModel = new EventEmitter<{name: string, triangleCount: number, description: string, screenshots: string[], fileData: Blob, fileName: string}>();
  
  protected readonly Math = Math;
  modelName = signal('');
  triangleCount = signal(0);
  description = signal('');
  
  parsedDescription = computed(() => {
    const raw = this.description();
    if (!raw) return '';
    const html = marked.parse(raw) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  errorMessage = signal('');
  errorSuggestion = signal('');
  loadingProgress = signal(0);
  
  // Lighting signals
  ambientIntensity = signal(0.5);
  directionalIntensity = signal(1.0);
  directionalColor = signal('#ffffff');
  pointLightIntensity = signal(0);
  
  // Shadow signals
  shadowsEnabled = signal(true);
  shadowBias = signal(-0.001);
  shadowResolution = signal(1024);
  
  // Spotlight signals
  spotLightEnabled = signal(false);
  spotLightIntensity = signal(2.0);
  spotLightColor = signal('#ffffff');
  spotLightAngle = signal(Math.PI / 6);
  spotLightPosX = signal(0);
  spotLightPosY = signal(5);
  spotLightPosZ = signal(0);
  
  private textureLoader = new THREE.TextureLoader();
  private descService = inject(DescriptionGeneratorService);
  private platformId = inject(PLATFORM_ID);
  private sanitizer = inject(DomSanitizer);
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private model: THREE.Object3D | null = null;
  protected currentFileBlob: Blob | null = null;
  private currentFileName = '';
  
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private pointLight!: THREE.PointLight;
  private spotLight!: THREE.SpotLight;
  private ground!: THREE.Mesh;

  capturedScreenshots = signal<string[]>([]);
  selectedScreenshot = signal<string | null>(null);
  largePreviewUrl = signal<string | null>(null);
  isLoading = signal(false);

  openLargePreview(url: string) {
    this.largePreviewUrl.set(url);
  }

  closeLargePreview() {
    this.largePreviewUrl.set(null);
  }

  async loadModel(model: ModelAsset, screenshotIndex = 0) {
    this.isLoading.set(true);
    this.loadingProgress.set(0);
    this.errorMessage.set('');
    this.errorSuggestion.set('');
    
    this.modelName.set(model.name);
    this.triangleCount.set(model.polygonCount);
    this.description.set(model.description);
    this.capturedScreenshots.set(model.screenshots);
    this.selectedScreenshot.set(model.screenshots[screenshotIndex] || model.screenshots[0] || null);
    this.currentFileBlob = model.fileData;
    this.currentFileName = model.fileName;
    
    try {
      const arrayBuffer = await model.fileData.arrayBuffer();
      
      if (this.model) {
        this.scene.remove(this.model);
        this.model = null;
      }
      
      const loader = model.fileName.endsWith('.fbx') ? new FBXLoader() : new GLTFLoader();
      
      if (model.fileName.endsWith('.fbx')) {
        const fbxLoader = loader as FBXLoader;
        const fbxModel = fbxLoader.parse(arrayBuffer, '');
        this.model = fbxModel;
        this.scene.add(this.model);
        this.fitModelToView(this.model);
        this.isLoading.set(false);
      } else {
        const gltfLoader = loader as GLTFLoader;
        gltfLoader.parse(arrayBuffer, '', (gltf) => {
          this.model = gltf.scene;
          this.scene.add(this.model);
          this.fitModelToView(this.model);
          this.isLoading.set(false);
          this.loadingProgress.set(100);
        }, (error) => {
          this.handleLoadError(error);
        });
      }
    } catch (err) {
      this.handleLoadError(err);
    }
  }

  onSave() {
    if (!this.currentFileBlob) {
      this.errorMessage.set('Kein Modell zum Speichern vorhanden.');
      return;
    }
    this.saveModel.emit({
      name: this.modelName(),
      triangleCount: this.triangleCount(),
      description: this.description(),
      screenshots: this.capturedScreenshots(),
      fileData: this.currentFileBlob,
      fileName: this.currentFileName
    });
  }

  ngAfterViewInit() {
    this.initThree();
  }

  private initThree() {
    if (!isPlatformBrowser(this.platformId)) return;
    const width = this.viewerContainer.nativeElement.clientWidth;
    const height = this.viewerContainer.nativeElement.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.viewerContainer.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = this.shadowResolution();
    this.directionalLight.shadow.mapSize.height = this.shadowResolution();
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.bias = this.shadowBias();
    this.scene.add(this.directionalLight);
    
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(this.ambientLight);
    
    this.pointLight = new THREE.PointLight(0xffffff, 0);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);

    this.spotLight = new THREE.SpotLight(0xffffff, 0);
    this.spotLight.position.set(0, 5, 0);
    this.spotLight.castShadow = true;
    this.scene.add(this.spotLight);

    // Ground plane for shadows
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.camera.position.z = 5;
    this.animate();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update lights from signals
    if (this.ambientLight) this.ambientLight.intensity = this.ambientIntensity();
    if (this.directionalLight) {
      this.directionalLight.intensity = this.directionalIntensity();
      this.directionalLight.color.set(this.directionalColor());
      this.directionalLight.castShadow = this.shadowsEnabled();
      this.directionalLight.shadow.bias = this.shadowBias();
      if (this.directionalLight.shadow.mapSize.width !== this.shadowResolution()) {
        this.directionalLight.shadow.mapSize.set(this.shadowResolution(), this.shadowResolution());
        this.directionalLight.shadow.map?.dispose();
        this.directionalLight.shadow.map = null;
      }
    }
    if (this.pointLight) {
      this.pointLight.intensity = this.pointLightIntensity();
    }
    if (this.spotLight) {
      this.spotLight.intensity = this.spotLightEnabled() ? this.spotLightIntensity() : 0;
      this.spotLight.color.set(this.spotLightColor());
      this.spotLight.angle = this.spotLightAngle();
      this.spotLight.position.set(this.spotLightPosX(), this.spotLightPosY(), this.spotLightPosZ());
      this.spotLight.castShadow = this.shadowsEnabled();
    }
    if (this.ground) {
      this.ground.visible = this.shadowsEnabled();
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.errorMessage.set('');
    this.errorSuggestion.set('');
    this.loadingProgress.set(0);
    
    if (!file) return;

    if (!file.name.match(/\.(glb|gltf|fbx)$/i)) {
      this.errorMessage.set('Ungültiges Dateiformat.');
      this.errorSuggestion.set('Bitte wählen Sie eine .glb, .gltf oder .fbx Datei.');
      return;
    }

    this.isLoading.set(true);
    this.loadingProgress.set(0);
    this.errorMessage.set('');
    this.errorSuggestion.set('');
    this.triangleCount.set(0);
    this.currentFileBlob = null;
    this.currentFileName = '';
    this.capturedScreenshots.set([]);
    this.selectedScreenshot.set(null);
    
    this.currentFileBlob = file;
    this.currentFileName = file.name;
    
    // Auto-set name if empty
    if (!this.modelName()) {
      this.modelName.set(file.name.replace(/\.[^/.]+$/, ""));
    }

    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
    }

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 50); // First 50% is reading
        this.loadingProgress.set(progress);
      }
    };
    reader.onerror = () => {
      this.errorMessage.set('Fehler beim Lesen der Datei.');
      this.errorSuggestion.set('Die Datei könnte beschädigt sein oder von einem anderen Programm blockiert werden.');
      this.isLoading.set(false);
    };
    reader.onload = (e) => {
      try {
        const loader = file.name.endsWith('.fbx') ? new FBXLoader() : new GLTFLoader();
        
        if (file.name.endsWith('.fbx')) {
          const fbxLoader = loader as FBXLoader;
          const fbxModel = fbxLoader.parse(e.target?.result as ArrayBuffer, '');
          this.model = fbxModel;
          this.scene.add(this.model);
          this.fitModelToView(this.model);
          this.onModelReady();
        } else {
          const gltfLoader = loader as GLTFLoader;
          gltfLoader.parse(e.target?.result as ArrayBuffer, '', (gltf) => {
            this.model = gltf.scene;
            this.scene.add(this.model);
            this.fitModelToView(this.model);
            this.onModelReady();
          }, (error) => {
            this.handleLoadError(error);
          });
        }
      } catch (err) {
        this.handleLoadError(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private onModelReady() {
    this.isLoading.set(false);
    this.loadingProgress.set(100);
    if (this.model) {
      this.triangleCount.set(this.calculateTriangleCount(this.model));
      // Small delay to ensure rendering is updated before capture
      setTimeout(() => {
        this.capturedScreenshots.set([]); // Reset for new upload
        this.captureCurrentScreenshot();
        this.selectedScreenshot.set(this.capturedScreenshots()[0]);
      }, 100);
    }
  }

  private handleLoadError(error: unknown) {
    console.error('Model load error:', error);
    this.isLoading.set(false);
    this.loadingProgress.set(0);
    
    const msg = error instanceof Error ? error.message : String(error);
    
    if (msg.includes('JSON')) {
      this.errorMessage.set('Ungültige JSON-Struktur im Modell.');
      this.errorSuggestion.set('Stellen Sie sicher, dass die .gltf Datei valide ist. Versuchen Sie, sie in Blender neu zu exportieren.');
    } else if (msg.includes('buffer')) {
      this.errorMessage.set('Fehler beim Verarbeiten der Binärdaten.');
      this.errorSuggestion.set('Die Datei ist möglicherweise unvollständig oder beschädigt.');
    } else if (msg.includes('version')) {
      this.errorMessage.set('Nicht unterstützte Version des Dateiformats.');
      this.errorSuggestion.set('Aktualisieren Sie Ihren Exporter auf die neueste Version (z.B. glTF 2.0).');
    } else {
      this.errorMessage.set('Fehler beim Laden des Modells.');
      this.errorSuggestion.set('Versuchen Sie das Modell als .glb (Binary glTF) zu exportieren, da dies am stabilsten ist.');
    }
  }

  onHdriSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      this.textureLoader.load(url, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture;
        this.scene.background = texture;
        this.scene.backgroundBlurriness = 0.5;
      });
    };
    reader.readAsDataURL(file);
  }

  applyLightingPreset(preset: string) {
    switch (preset) {
      case 'studio':
        this.ambientIntensity.set(0.8);
        this.directionalIntensity.set(1.5);
        this.directionalColor.set('#ffffff');
        this.pointLightIntensity.set(0.5);
        break;
      case 'outdoor':
        this.ambientIntensity.set(1.2);
        this.directionalIntensity.set(2.0);
        this.directionalColor.set('#fff4e5');
        this.pointLightIntensity.set(0);
        break;
      case 'dramatic':
        this.ambientIntensity.set(0.2);
        this.directionalIntensity.set(2.5);
        this.directionalColor.set('#ffccaa');
        this.pointLightIntensity.set(2.0);
        break;
      default:
        this.ambientIntensity.set(0.5);
        this.directionalIntensity.set(1.0);
        this.directionalColor.set('#ffffff');
        this.pointLightIntensity.set(0);
        break;
    }
  }

  private fitModelToView(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Enable shadows for model
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Update ground position to be just below the model
    if (this.ground) {
      this.ground.position.y = box.min.y - 0.01;
    }

    // Update controls target
    this.controls.target.copy(center);

    // Calculate distance to fit the model
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2));
    
    // Add some padding
    cameraDistance *= 1.5;

    // Position camera
    this.camera.position.set(center.x, center.y, center.z + cameraDistance);
    this.camera.lookAt(center);
    this.controls.update();
  }

  private calculateTriangleCount(object: THREE.Object3D): number {
    let count = 0;
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geometry = mesh.geometry;
        if (geometry.index) {
          count += geometry.index.count / 3;
        } else if (geometry.attributes['position']) {
          count += (geometry.attributes['position'] as THREE.BufferAttribute).count / 3;
        }
      }
    });
    return count;
  }

  captureCurrentScreenshot() {
    this.renderer.render(this.scene, this.camera);
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    this.capturedScreenshots.update(list => [...list, dataURL]);
    if (!this.selectedScreenshot()) this.selectedScreenshot.set(dataURL);
  }

  async downloadScreenshot(format: 'png' | 'jpeg' = 'png') {
    const width = 1920;
    const height = 1080;
    
    // Resize for high-res
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.render(this.scene, this.camera);
    
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataURL = this.renderer.domElement.toDataURL(mimeType, 0.9); // 0.9 quality for jpeg
    
    const link = document.createElement('a');
    link.download = `screenshot-${Date.now()}.${format}`;
    link.href = dataURL;
    link.click();
    
    // Restore size
    const containerWidth = this.viewerContainer.nativeElement.clientWidth;
    const containerHeight = this.viewerContainer.nativeElement.clientHeight;
    this.renderer.setSize(containerWidth, containerHeight);
    this.camera.aspect = containerWidth / containerHeight;
    this.camera.updateProjectionMatrix();
  }

  captureAngle(x: number, y: number, z: number) {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    this.capturedScreenshots.update(list => [...list, dataURL]);
    if (!this.selectedScreenshot()) this.selectedScreenshot.set(dataURL);
  }

  captureScreenshots() {
    const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    const screenshots: string[] = [];
    angles.forEach((angle) => {
      this.camera.position.x = 5 * Math.sin(angle);
      this.camera.position.z = 5 * Math.cos(angle);
      this.camera.lookAt(0, 0, 0);
      this.renderer.render(this.scene, this.camera);
      screenshots.push(this.renderer.domElement.toDataURL('image/png'));
    });
    this.capturedScreenshots.set(screenshots);
  }
  
  async generateDescription() {
    if (!this.modelName() || this.triangleCount() === 0) {
      this.errorMessage.set('Bitte laden Sie zuerst ein Modell und geben Sie einen Namen ein.');
      return;
    }
    
    this.isLoading.set(true);
    this.description.set('Generiere Beschreibung...');
    try {
      const desc = await this.descService.generateDescription(this.modelName(), this.triangleCount());
      this.description.set(desc);
    } catch (_err) {
      this.errorMessage.set('Fehler beim Generieren der Beschreibung.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
