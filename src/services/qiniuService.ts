// src/services/qiniuService.ts

export interface QiniuPhoto {
    id: string;
    key: string;
    url: string;
  }
  
  // 你的七牛云配置
  const QINIU_CONFIG = {
    DOMAIN: 'http://t7o3kr2e3.hn-bkt.clouddn.com',
    PREFIX: 'christmas-tree',
  };
  
  class QiniuService {
    private domain = QINIU_CONFIG.DOMAIN;
    private prefix = QINIU_CONFIG.PREFIX;
  
    getUrl(key: string): string {
      return `${this.domain}/${key}`;
    }
  
    async getPhotos(): Promise<QiniuPhoto[]> {
      try {
        const jsonUrl = `${this.domain}/${this.prefix}/photos.json?t=${Date.now()}`;
        const response = await fetch(jsonUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
  
        const data = await response.json();
        
        return data.photos.map((photo: any) => ({
          ...photo,
          url: this.getUrl(photo.key),
        }));
      } catch (error) {
        console.error('Failed to fetch photos:', error);
        return [];
      }
    }
  }
  
  export const qiniuService = new QiniuService();
  