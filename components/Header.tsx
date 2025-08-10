import React from 'react';
import { HiSparkles } from 'react-icons/hi2';
import LottieAnimation from './LottieAnimation';

const Header: React.FC = () => {
  return (
    <header className="relative bg-gradient-to-br from-emerald-400 to-teal-500 text-white overflow-hidden shadow-lg">
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-16 pb-24">
        
        <div className="relative inline-flex items-center gap-4 animate__animated animate__fadeInDown">
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm border border-white/30 shadow-md">
            <HiSparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-shadow">
            AI-Powered CV Optimizer
          </h1>
        </div>

        <p className="mt-4 text-base sm:text-lg text-white/95 max-w-2xl mx-auto animate__animated animate__fadeInDown" style={{ animationDelay: '200ms' }}>
          Transform your CV with smart analysis and guided editing.
        </p>

        <div className="mt-6 animate__animated animate__fadeInDown" style={{ animationDelay: '400ms' }}>
          <span className="group relative overflow-hidden inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 ring-1 ring-inset ring-white/20 backdrop-blur-sm hover:bg-white/20 hover:shadow-md hover:scale-105 transition-all duration-200 cursor-default">
            <LottieAnimation
                animationPath="/animations/sparkles-loop-loader.json"
                className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-20 transition-opacity"
            />
            <span className="relative z-10 flex items-center gap-2">
                <HiSparkles className="w-4 h-4" />
                AI-Agent-powered
            </span>
          </span>
        </div>
      </div>
      
      {/* Curved SVG divider */}
      <div className="absolute bottom-0 left-0 w-full h-[100px]" style={{ zIndex: 10 }}>
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0 100C0 100 360 20 720 20C1080 20 1440 100 1440 100V101H0V100Z" fill="#f1f5f9"/>
        </svg>
      </div>

       <style>{`
        .text-shadow {
            text-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
       `}</style>
    </header>
  );
};

export default Header;