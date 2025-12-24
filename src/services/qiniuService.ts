// src/services/qiniuService.ts

const API_URL = 'https://photos.leylalee.xyz';

export interface Photo {
  id: string;
  key: string;
  url: string;
}

class QiniuService {
  async getPhotos(folder: string = 'christmas-tree'): Promise<Photo[]> {
    try {
      const res = await fetch(
        `${API_URL}/api/photos?folder=${folder}&t=${Date.now()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      return data.photos || [];
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      return [];
    }
  }
}

export const qiniuService = new QiniuService();
