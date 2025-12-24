// src/hooks/useQiniuPhotos.ts
import { useState, useEffect } from 'react';
import { qiniuService, type Photo } from '../services/qiniuService';

export function useQiniuPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    qiniuService.getPhotos()
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, []);

  return { photos, loading };
}
