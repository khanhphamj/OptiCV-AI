import { useState, useEffect } from 'react';

const animationCache = new Map<string, any>();

export const useLottieAnimation = (path: string) => {
    const [animationData, setAnimationData] = useState(animationCache.get(path) || null);

    useEffect(() => {
        if (animationData) return;

        let isCancelled = false;
        
        const loadAnimation = async () => {
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (!isCancelled) {
                    animationCache.set(path, data);
                    setAnimationData(data);
                }
            } catch (err) {
                 console.error(`Failed to load animation from ${path}`, err);
            }
        };

        loadAnimation();
            
        return () => {
            isCancelled = true;
        };
    }, [path, animationData]);

    return animationData;
};
