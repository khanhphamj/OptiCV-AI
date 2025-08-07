import React, { useEffect, useRef } from 'react';
import { useLottieAnimation } from '../hooks/useLottieAnimation';

declare const lottie: any;

interface LottieAnimationProps {
  animationPath: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

const LottieAnimation: React.FC<LottieAnimationProps> = ({ animationPath, className, loop = true, autoplay = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationData = useLottieAnimation(animationPath);

  useEffect(() => {
    let anim: any;
    if (containerRef.current && animationData && typeof lottie !== 'undefined') {
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop,
        autoplay,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice',
        }
      });
    }
    return () => {
      if (anim) {
        anim.destroy();
      }
    };
  }, [animationData, loop, autoplay]);

  if (!animationData) {
    return <div className={className} />;
  }

  return <div ref={containerRef} className={className} />;
};

export default LottieAnimation;
