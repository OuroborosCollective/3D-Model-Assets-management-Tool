import {Component, EventEmitter, Output, inject} from '@angular/core';
import {CatalogService, ModelAsset} from '../catalog.service';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-catalog-view',
  template: `
    <div class="p-4">
      <h2 class="text-xl font-bold mb-4">Katalog</h2>
      <div class="grid grid-cols-2 gap-4">
        @for (model of models; track model.id) {
          <div (click)="selectModel.emit(model)" (keyup.enter)="selectModel.emit(model)" tabindex="0" class="p-2 border rounded cursor-pointer hover:bg-gray-100">
            <div class="flex gap-1 overflow-x-auto mb-2">
              @for (screenshot of model.screenshots; track screenshot) {
                <img [src]="screenshot" [alt]="model.name" class="w-16 h-16 object-cover rounded" />
              }
            </div>
            <p class="font-semibold">{{model.name}}</p>
            <p class="text-sm text-gray-600 truncate">{{model.description}}</p>
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
  @Output() selectModel = new EventEmitter<ModelAsset>();
  private catalog = inject(CatalogService);

  constructor() {
    this.catalog.getModels().then(models => this.models = models);
  }
}
