import {Component, EventEmitter, Output, inject} from '@angular/core';
import {CatalogService, ModelAsset} from '../catalog.service';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-catalog-view',
  template: `
    <div class="p-6 bg-slate-950 text-slate-100 min-h-screen">
      <h2 class="font-serif text-3xl text-amber-500 mb-8 tracking-tight">Katalog</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (model of models; track model.id) {
          <div class="bg-slate-900/50 border border-amber-900/30 backdrop-blur-sm rounded-xl p-4 transition hover:border-amber-500/50 cursor-pointer">
            <div class="flex gap-2 overflow-x-auto mb-4 pb-2">
              @for (screenshot of model.screenshots; track screenshot; let i = $index) {
                <div class="relative w-20 h-20 flex-shrink-0">
                  <button (click)="selectModel.emit({model, screenshotIndex: i})" class="w-full h-full p-0 border-0 rounded-lg overflow-hidden">
                    <img [src]="screenshot" [alt]="model.name" loading="lazy" class="w-full h-full object-cover" />
                  </button>
                  <button (click)="previewScreenshot.emit(screenshot)" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/80">
                    <span class="material-icons text-xs">zoom_in</span>
                  </button>
                </div>
              }
            </div>
            <button (click)="selectModel.emit({model, screenshotIndex: 0})" class="block w-full text-left font-serif text-xl text-amber-100 mb-1">{{model.name}}</button>
            <button (click)="selectModel.emit({model, screenshotIndex: 0})" class="block w-full text-left font-mono text-xs text-slate-400 truncate">{{model.description}}</button>
          </div>
        }
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class CatalogView {
  models: ModelAsset[] = [];
  @Output() selectModel = new EventEmitter<{model: ModelAsset, screenshotIndex: number}>();
  @Output() previewScreenshot = new EventEmitter<string>();
  private catalog = inject(CatalogService);

  constructor() {
    this.catalog.getModels().then(models => this.models = models);
  }
}
