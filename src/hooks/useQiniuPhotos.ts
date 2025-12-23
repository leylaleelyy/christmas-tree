// src/hooks/useQiniuPhotos.ts
import { useState, useEffect } from 'react';
import { qiniuService, type QiniuPhoto } from '../services/qiniuService';

export function useQiniuPhotos() {
  const [photos, setPhotos] = useState<QiniuPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    qiniuService.getPhotos()
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, []);

  return { photos, loading };
}
