import {Component, ElementRef, ViewChild, AfterViewInit, signal, inject, Output, EventEmitter, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {FormsModule} from '@angular/forms';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {DescriptionGeneratorService} from '../description-generator.service';
import {ModelAsset} from '../catalog.service';

@Component({
  selector: 'app-model-viewer',
  template: `
    <div class="p-4">
      <h2 class="text-xl font-bold mb-4">3D Modell Viewer</h2>
      <input type="text" [(ngModel)]="modelName" placeholder="Modellname" class="mb-2 block w-full p-2 border rounded" />
      <input type="file" (change)="onFileSelected($event)" class="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept=".glb,.gltf,.fbx" />
      @if (errorMessage()) {
        <p class="text-red-600 mb-4">{{ errorMessage() }}</p>
      }
      
      <div #viewerContainer class="w-full h-96 bg-gray-100 rounded-lg overflow-hidden relative">
        @if (isLoading()) {
          <div class="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      </div>
      @if (selectedScreenshot()) {
        <img [src]="selectedScreenshot()" alt="Preview" class="w-full h-96 object-contain mt-4 rounded-lg border cursor-pointer" (click)="openLargePreview(selectedScreenshot()!)" (keydown.enter)="openLargePreview(selectedScreenshot()!)" tabindex="0" role="button" />
      }
      
      @if (largePreviewUrl()) {
        <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" (click)="closeLargePreview()" (keydown.escape)="closeLargePreview()" tabindex="0" role="button">
          <img [src]="largePreviewUrl()" alt="Large Preview" class="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      }
      
      <div class="mt-4 p-4 bg-white shadow rounded-lg">
        <h3 class="font-semibold">Technische Daten:</h3>
        <p>Dreiecke: {{ triangleCount() }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button (click)="captureCurrentScreenshot()" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">Aktuell</button>
          <button (click)="captureAngle(0, 0, 5)" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">Front</button>
          <button (click)="captureAngle(0, 5, 0)" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">Oben</button>
          <button (click)="captureAngle(5, 0, 0)" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">Seite</button>
          <button (click)="captureScreenshots()" class="bg-green-600 text-white px-3 py-1 rounded text-sm">360°</button>
        </div>
        <button (click)="generateDescription()" class="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg">KI-Beschreibung generieren</button>
        <button (click)="onSave()" class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg">In Katalog speichern</button>
        <p class="mt-2 text-sm text-gray-700">{{ description() }}</p>
        
        <div class="mt-4 flex gap-2">
          <a href="https://sketchfab.com/upload" target="_blank" class="bg-black text-white px-4 py-2 rounded-lg">Zu Sketchfab</a>
          <a href="https://www.etsy.com/sell" target="_blank" class="bg-orange-600 text-white px-4 py-2 rounded-lg">Zu Etsy</a>
        </div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [FormsModule]
})
export class ModelViewer implements AfterViewInit {
  @ViewChild('viewerContainer') viewerContainer!: ElementRef;
  @Output() saveModel = new EventEmitter<{name: string, triangleCount: number, description: string, screenshots: string[]}>();
  
  modelName = '';
  triangleCount = signal(0);
  description = signal('');
  errorMessage = signal('');
  private descService = inject(DescriptionGeneratorService);
  private platformId = inject(PLATFORM_ID);
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private  model: THREE.Object3D | null = null;
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
    this.modelName = model.name;
    this.triangleCount.set(model.polygonCount);
    this.description.set(model.description);
    this.capturedScreenshots.set(model.screenshots);
    this.selectedScreenshot.set(model.screenshots[screenshotIndex] || model.screenshots[0] || null);
    
    const arrayBuffer = await model.fileData.arrayBuffer();
    
    if (this.model) this.scene.remove(this.model);
    
    const loader = model.fileName.endsWith('.fbx') ? new FBXLoader() : new GLTFLoader();
    
    if (model.fileName.endsWith('.fbx')) {
      const fbxLoader = loader as FBXLoader;
      this.model = fbxLoader.parse(arrayBuffer, '');
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
      }, (error) => {
        this.errorMessage.set('Fehler beim Parsen des Modells: ' + error.message);
        this.isLoading.set(false);
      });
    }
  }

  onSave() {
    this.saveModel.emit({
      name: this.modelName,
      triangleCount: this.triangleCount(),
      description: this.description(),
      screenshots: this.capturedScreenshots()
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
    this.viewerContainer.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0x404040));

    this.camera.position.z = 5;
    this.animate();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.errorMessage.set('');
    if (!file) return;

    if (!file.name.match(/\.(glb|gltf|fbx)$/i)) {
      this.errorMessage.set('Ungültiges Dateiformat. Bitte wählen Sie eine .glb, .gltf oder .fbx Datei.');
      return;
    }

    this.isLoading.set(true);
    if (this.model) this.scene.remove(this.model);

    const reader = new FileReader();
    reader.onerror = () => {
      this.errorMessage.set('Fehler beim Lesen der Datei.');
      this.isLoading.set(false);
    };
    reader.onload = (e) => {
      try {
        const loader = file.name.endsWith('.fbx') ? new FBXLoader() : new GLTFLoader();
        
        if (file.name.endsWith('.fbx')) {
          const fbxLoader = loader as FBXLoader;
          this.model = fbxLoader.parse(e.target?.result as ArrayBuffer, '');
          this.scene.add(this.model);
          this.fitModelToView(this.model);
          this.isLoading.set(false);
        } else {
          const gltfLoader = loader as GLTFLoader;
          gltfLoader.parse(e.target?.result as ArrayBuffer, '', (gltf) => {
            this.model = gltf.scene;
            this.scene.add(this.model);
            this.fitModelToView(this.model);
            this.isLoading.set(false);
          }, (error) => {
            this.errorMessage.set('Fehler beim Parsen des Modells: ' + error.message);
            this.isLoading.set(false);
          });
        }
        
        if (this.model) {
          this.triangleCount.set(this.calculateTriangleCount(this.model));
          this.captureCurrentScreenshot();
          this.selectedScreenshot.set(this.capturedScreenshots()[0]);
        }
      } catch {
        this.errorMessage.set('Fehler beim Verarbeiten des Modells.');
        this.isLoading.set(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private fitModelToView(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

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
    if (!this.modelName || this.triangleCount() === 0) {
      this.errorMessage.set('Bitte laden Sie zuerst ein Modell und geben Sie einen Namen ein.');
      return;
    }
    
    this.description.set('Generiere Beschreibung...');
    const desc = await this.descService.generateDescription(this.modelName, this.triangleCount());
    this.description.set(desc);
  }
}
