import React from 'react';
import { SubScores } from '../types';
import { HiStar, HiKey, HiBriefcase, HiWrenchScrewdriver, HiChartBar, HiIdentification, HiClock } from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';
import type { TranslationKey } from '../i18n/translations';

interface SubScoreBarsProps {
    subScores: SubScores;
}

interface MetricConfig {
    id: keyof SubScores;
    labelKey: TranslationKey;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

// Order matches how a real HR scans: title-fit → required skills → experience
// → recency → impact → keywords. Top of the list = highest decision weight.
const METRICS_CONFIG: MetricConfig[] = [
    { id: 'role_alignment', labelKey: 'metric.role_alignment', icon: HiIdentification },
    { id: 'skill_coverage', labelKey: 'metric.skill_coverage', icon: HiWrenchScrewdriver },
    { id: 'experience_fit', labelKey: 'metric.experience_fit', icon: HiBriefcase },
    { id: 'recency',        labelKey: 'metric.recency',        icon: HiClock },
    { id: 'quantification', labelKey: 'metric.quantification', icon: HiChartBar },
    { id: 'keyword_match',  labelKey: 'metric.keyword_match',  icon: HiKey },
];

const getScoreStyling = (score: number) => {
    if (score < 50) return { bar: 'bg-gradient-to-r from-red-400 to-red-500', text: 'text-red-600' };
    if (score < 80) return { bar: 'bg-gradient-to-r from-amber-400 to-amber-500', text: 'text-amber-600' };
    return { bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500', text: 'text-emerald-600' };
};

const SubScoreItem: React.FC<{ metric: MetricConfig; score: number; label: string }> = ({ metric, score, label }) => {
    const isHighScorer = score >= 90;
    const { bar, text } = getScoreStyling(score);

    return (
        <div className="flex items-center gap-2 sm:gap-3 py-1">
            {/* Icon + label — fixed width so bars align */}
            <div className="flex items-center gap-1.5 w-32 sm:w-36 shrink-0 font-medium text-gray-700">
                <metric.icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">{label}</span>
            </div>

            {/* Progress bar — fills remaining */}
            <div className="flex-1 min-w-0 bg-slate-200 rounded-full h-1.5 sm:h-2 shadow-inner overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${bar}`}
                    style={{ width: `${score}%` }}
                />
            </div>

            {/* Score — fixed width so column stays aligned */}
            <div className={`font-numeric tabular-nums flex items-center gap-0.5 font-bold w-12 justify-end shrink-0 ${text}`}>
                <span className="text-xs sm:text-sm">{score}%</span>
                {isHighScorer && <HiStar className="w-3 h-3 text-amber-500" />}
            </div>
        </div>
    );
};

const SubScoreBars: React.FC<SubScoreBarsProps> = ({ subScores }) => {
    const { t } = useLang();
    return (
        <div className="liquid-glass-soft rounded-lg sm:rounded-xl lg:rounded-2xl p-2 sm:p-2.5 lg:p-3 divide-y divide-slate-200/60">
            {METRICS_CONFIG.map(metric => {
                const data = subScores[metric.id];
                if (!data) return null;
                return <SubScoreItem key={metric.id} metric={metric} score={data.score} label={t(metric.labelKey)} />;
            })}
        </div>
    );
};

export default SubScoreBars;