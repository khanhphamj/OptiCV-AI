import React from 'react';
import { Course, CourseRecommendation } from '../types';
import { HiBookOpen, HiArrowTopRightOnSquare } from 'react-icons/hi2';

interface CourseSuggestionCardProps {
  recommendation: CourseRecommendation;
}

// Generates a reliable search URL instead of relying on the AI to provide a direct link.
const generateCourseUrl = (course: Course): string => {
  const encodedTitle = encodeURIComponent(course.title);
  switch (course.platform) {
    case 'Udemy':
      return `https://www.udemy.com/courses/search/?q=${encodedTitle}`;
    case 'Coursera':
      return `https://www.coursera.org/search?query=${encodedTitle}`;
    case 'DeepLearning.com': // This maps to DeepLearning.AI
      return `https://www.deeplearning.ai/?s=${encodedTitle}`;
    default:
      // A sensible fallback to Google search for any other platform
      return `https://www.google.com/search?q=${encodedTitle}+${encodeURIComponent(course.platform)}+course`;
  }
};


const CourseSuggestionCard: React.FC<CourseSuggestionCardProps> = ({ recommendation }) => {
    return (
        <div className="bg-white border border-blue-200/80 rounded-lg p-3 my-2 shadow-lg shadow-blue-500/10">
            <div className="flex items-center gap-2 mb-3">
                <HiBookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"/>
                <p className="text-xs-consistent font-semibold text-blue-600 uppercase">Learning Suggestion</p>
            </div>
            <div className="space-y-3">
                <p className="text-gray-700 text-sm-consistent">To bridge the gap in <strong className="font-semibold text-gray-900">{recommendation.missing_skill}</strong>, consider one of these top-rated courses:</p>
                <ul className="space-y-2">
                    {recommendation.courses.map((course, index) => {
                        const url = generateCourseUrl(course);
                        return (
                            <li key={index}>
                                <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50/70 hover:shadow-sm hover:ring-1 hover:ring-blue-200 transition-all duration-200 group"
                                >
                                    <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-100 rounded-full">
                                         <HiBookOpen className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 truncate group-hover:text-blue-700 text-sm-consistent">{course.title}</p>
                                        <p className="text-xs-consistent text-gray-500">{course.platform}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <HiArrowTopRightOnSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                </a>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    );
}

export default CourseSuggestionCard;