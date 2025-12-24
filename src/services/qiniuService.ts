// src/services/qiniuService.ts

export interface QiniuPhoto {
  id: string;
  key: string;
  url: string;
}

// 替换为你的 Worker 地址
const API_URL = 'https://photo-uploader.yue181105.workers.dev';

class QiniuService {
  async getPhotos(): Promise<QiniuPhoto[]> {
    try {
      const res = await fetch(`${API_URL}/api/photos?folder=christmas-tree&t=${Date.now()}`);
      const data = await res.json();
      return data.photos || [];
    } catch (e) {
      console.error('Failed to fetch photos:', e);
      return [];
    }
  }
}

export const qiniuService = new QiniuService();
