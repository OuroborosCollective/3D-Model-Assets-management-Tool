import {Injectable} from '@angular/core';
import {GoogleGenAI} from '@google/genai';

// Note: GEMINI_API_KEY is injected at runtime.
declare const GEMINI_API_KEY: string;

@Injectable({providedIn: 'root'})
export class DescriptionGeneratorService {
  private ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

  async generateDescription(modelName: string, polygonCount: number): Promise<string> {
    const prompt = `
      Act as an expert 3D artist and marketplace SEO specialist for platforms like Etsy and Sketchfab.
      Generate a highly optimized, compelling product description for a 3D model named "${modelName}" with ${polygonCount} polygons.
      
      Structure the output in Markdown:
      1. **Engaging Hook**: A punchy, benefit-driven opening sentence that immediately grabs the attention of 3D artists, game developers, or hobbyists.
      2. **Detailed Features & Use Cases**: A bulleted list highlighting:
         - Artistic style and level of detail.
         - Practical use cases (e.g., "Perfect for low-poly game environments," "Ready for high-quality 3D printing," "Optimized for architectural visualization").
      3. **Technical Specifications**: Clearly state the polygon count (${polygonCount}) and recommend compatible formats (e.g., GLB, FBX, OBJ).
      4. **Marketplace-Specific SEO Keywords**: A list of 10-15 high-intent, long-tail keywords relevant to 3D asset searches on Etsy and Sketchfab.
      5. **Call to Action (CTA)**: A strong, clear closing statement encouraging users to purchase or download the model (e.g., "Add this asset to your library today and elevate your project!").
      
      Tone: Professional, authoritative, and persuasive. Use industry-standard terminology.
    `;
    
    const result = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return result.text || '';
  }
}
