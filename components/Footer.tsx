
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center items-center space-x-6 text-sm text-gray-500">
                <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
                <span className="text-gray-300">|</span>
                <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
                 <span className="text-gray-300">|</span>
                <a href="mailto:phukhanh1903@gmail.com" className="hover:text-gray-900 transition-colors">Support</a>
            </div>
            <p className="mt-6 text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Phạm Phú Khánh. All rights reserved.
            </p>
        </div>
    </footer>
  );
};

export default Footer;