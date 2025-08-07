import React from 'react';
import { SubScores } from '../types';
import { HiStar, HiKey, HiBriefcase, HiWrenchScrewdriver, HiChartBar } from 'react-icons/hi2/';

interface SubScoreBarsProps {
    subScores: SubScores;
}

interface MetricConfig {
    id: keyof SubScores;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const METRICS_CONFIG: MetricConfig[] = [
    { id: 'keyword_match', label: 'Keyword Match', icon: HiKey },
    { id: 'experience_fit', label: 'Experience Fit', icon: HiBriefcase },
    { id: 'skill_coverage', label: 'Skill Coverage', icon: HiWrenchScrewdriver },
    { id: 'quantification', label: 'Quantification', icon: HiChartBar },
];

const getScoreStyling = (score: number) => {
    if (score < 50) return { bar: 'bg-gradient-to-r from-red-400 to-red-500', text: 'text-red-600' };
    if (score < 80) return { bar: 'bg-gradient-to-r from-amber-400 to-amber-500', text: 'text-amber-600' };
    return { bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500', text: 'text-emerald-600' };
};

const SubScoreItem: React.FC<{ metric: MetricConfig; score: number }> = ({ metric, score }) => {
    const isHighScorer = score >= 90;
    const { bar, text } = getScoreStyling(score);
    
    return (
        <div>
            <div className="flex justify-between items-center mb-1 text-sm">
                <div className="flex items-center gap-2 font-medium text-gray-700">
                    <metric.icon className="w-5 h-5 text-gray-500" />
                    <span>{metric.label}</span>
                </div>
                <div className={`font-numeric flex items-center gap-1 font-bold ${text}`}>
                    <span>{score}%</span>
                    {isHighScorer && <HiStar className="w-4 h-4 text-amber-500" />}
                </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 shadow-inner">
                <div
                    className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${bar}`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
};

const SubScoreBars: React.FC<SubScoreBarsProps> = ({ subScores }) => {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200/30 space-y-6">
             <h3 className="text-xl font-bold text-gray-800 font-headline">Detailed Analysis</h3>
            {METRICS_CONFIG.map(metric => {
                const data = subScores[metric.id];
                if (!data) return null;
                return <SubScoreItem key={metric.id} metric={metric} score={data.score} />;
            })}
        </div>
    );
};

export default SubScoreBars;