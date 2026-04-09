import {Injectable} from '@angular/core';
import {GoogleGenAI} from '@google/genai';

// Note: GEMINI_API_KEY is injected at runtime.
declare const GEMINI_API_KEY: string;

@Injectable({providedIn: 'root'})
export class DescriptionGeneratorService {
  private ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

  async generateDescription(modelName: string, polygonCount: number): Promise<string> {
    const prompt = `Generate a professional product description for a 3D model named "${modelName}" with ${polygonCount} polygons. Suitable for marketplaces like Etsy and Sketchfab.`;
    
    const result = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt
    });
    return result.text || '';
  }
}
