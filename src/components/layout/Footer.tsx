import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Mail, Phone } from 'lucide-react';

const Footer: React.FC = () => {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="mb-8 md:mb-0">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-indigo-400" />
              <span className="ml-2 text-xl font-bold">Rewire</span>
            </div>
            <p className="mt-4 text-gray-300 text-sm">
              Providing AI-powered consultations and expert advice for your health and wellness needs.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Services</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/" onClick={handleScrollToTop} className="text-base text-gray-300 hover:text-white">
                  Rewire
                </Link>
              </li>
              <li>
                <Link to="/appointments" onClick={handleScrollToTop} className="text-base text-gray-300 hover:text-white">
                  Expert Calls
                </Link>
              </li>
              <li>
                <Link to="/pricing" onClick={handleScrollToTop} className="text-base text-gray-300 hover:text-white">
                  Subscription Plans
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Company</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/aboutus" onClick={handleScrollToTop} className="text-base text-gray-300 hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/cancellationandnorefundpolicy" onClick={handleScrollToTop} className="text-base text-gray-300 hover:text-white">
                  Cancellation & No Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/privacypolicy" onClick={handleScrollToTop} className="text-base text-gray-300 hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/termsandcondtions" onClick={handleScrollToTop} className="text-base text-gray-300 hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Contact</h3>
            <ul className="mt-4 space-y-4">
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-indigo-400 mr-2" />
                <a href="mailto:info@rewiree.com" className="text-base text-gray-300 hover:text-white">
                  info@rewiree.com
                </a>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-indigo-400 mr-2" />
                <a href="tel:+919004782037" className="text-base text-gray-300 hover:text-white">
                  +91 9004782037
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex items-center border-t border-gray-700 pt-8 flex-col sm:flex-row justify-between">
          <p className="text-base text-gray-400">
            This website is managed by Sashakt Enterprises Pvt Ltd.
          </p>
          <p className="text-base text-gray-400 text-center">
            &copy; {new Date().getFullYear()} Rewire. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
