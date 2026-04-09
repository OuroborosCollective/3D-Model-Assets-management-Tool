import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-technical-info',
  template: `
    <div class="p-4 bg-white shadow rounded-lg">
      <h3 class="font-semibold">Technische Details</h3>
      <p>Name: {{modelName}}</p>
      <p>Dreiecke: {{triangleCount}}</p>
      <p>Format: {{fileFormat}}</p>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class TechnicalInfoPanel {
  @Input() modelName = '';
  @Input() triangleCount = 0;
  @Input() fileFormat = '';
}
