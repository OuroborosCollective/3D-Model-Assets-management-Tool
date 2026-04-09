import {Injectable, PLATFORM_ID, inject} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

export interface ModelAsset {
  id: string;
  name: string;
  polygonCount: number;
  screenshots: string[];
  description: string;
  fileData: Blob;
  fileName: string;
}

@Injectable({providedIn: 'root'})
export class CatalogService {
  private platformId = inject(PLATFORM_ID);
  private dbName = 'ModelCatalog';
  private storeName = 'models';

  async saveModel(model: ModelAsset) {
    if (!isPlatformBrowser(this.platformId)) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.put(model);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getModels(): Promise<ModelAsset[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(this.storeName, {keyPath: 'id'});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
