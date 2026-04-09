import {ChangeDetectionStrategy, Component, inject, signal, ViewChild} from '@angular/core';
import {ModelViewer} from './model-viewer/model-viewer';
import {CatalogService, ModelAsset} from './catalog.service';
import {CatalogView} from './catalog-view/catalog-view';
import {TechnicalInfoPanel} from './technical-info-panel/technical-info-panel';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [ModelViewer, CatalogView, TechnicalInfoPanel],
  template: `
    <h1 class="text-2xl font-bold p-4">3D Asset Manager</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-2">
        <app-model-viewer (saveModel)="onSaveModel($event)" />
      </div>
      <div>
        <app-catalog-view (selectModel)="onSelectModel($event)" />
        <app-technical-info [modelName]="currentModel()?.name || ''" [triangleCount]="currentModel()?.polygonCount || 0" [fileFormat]="'GLB/FBX'" />
      </div>
    </div>
  `,
  styleUrl: './app.css',
})
export class App {
  private catalog = inject(CatalogService);
  @ViewChild(ModelViewer) modelViewer!: ModelViewer;
  currentModel = signal<ModelAsset | null>(null);

  async onSaveModel(modelData: {name: string, triangleCount: number, description: string, screenshots: string[]}) {
    const newModel: ModelAsset = {
      id: Date.now().toString(),
      name: modelData.name,
      polygonCount: modelData.triangleCount,
      description: modelData.description,
      screenshots: modelData.screenshots,
      fileData: new Blob(), // Placeholder
      fileName: 'model.glb'
    };
    await this.catalog.saveModel(newModel);
    alert('Modell gespeichert!');
  }

  onSelectModel(model: ModelAsset) {
    this.currentModel.set(model);
    this.modelViewer.loadModel(model);
  }
}
