import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Calendar, Shield, Zap, Users, Award } from 'lucide-react';
import {motion} from "framer-motion"
import { ContainerScroll } from "../components/ui/container-scroll-animation";
import { Hero } from '../components/ui/animated-hero';
import { Logos3 } from '../components/logos3';


const logoData = {
  heading: "Trusted by these companies",
  logos: [
    {
      id: "logo-1",
      description: "Astro",
      image: "https://www.shadcnblocks.com/images/block/logos/astro.svg",
      className: "h-7 w-auto",
    },
    {
      id: "logo-2",
      description: "Figma",
      image: "https://www.shadcnblocks.com/images/block/logos/figma.svg",
      className: "h-7 w-auto",
    },
    {
      id: "logo-3",
      description: "Next.js",
      image: "https://www.shadcnblocks.com/images/block/logos/nextjs.svg",
      className: "h-7 w-auto",
    },
    {
      id: "logo-4",
      description: "React",
      image: "https://www.shadcnblocks.com/images/block/logos/react.png",
      className: "h-7 w-auto",
    },
    {
      id: "logo-5",
      description: "shadcn/ui",
      image: "https://www.shadcnblocks.com/images/block/logos/shadcn-ui.svg",
      className: "h-7 w-auto",
    },
    {
      id: "logo-6",
      description: "Supabase",
      image: "https://www.shadcnblocks.com/images/block/logos/supabase.svg",
      className: "h-7 w-auto",
    },
    {
      id: "logo-7",
      description: "Tailwind CSS",
      image: "https://www.shadcnblocks.com/images/block/logos/tailwind.svg",
      className: "h-4 w-auto",
    },
    {
      id: "logo-8",
      description: "Vercel",
      image: "https://www.shadcnblocks.com/images/block/logos/vercel.svg",
      className: "h-7 w-auto",
    },
  ],
};  
const HomePage: React.FC = () => {
  useEffect(() => {
    // Scroll to the top when the component mounts
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="bg-white overflow-x-hidden dark:bg-gray-900">
      {/* Hero Section */}

    <Hero />
    <div className="flex flex-col  border-b-2 border-gray-200 dark:border-gray-700 overflow-hidden ">
      <ContainerScroll
     titleComponent={
      <h1 className="text-4xl font-semibold text-black dark:text-white">
        Unlock the Future of AI Consulting <br />
        <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-indigo-600">
          Smart AI Solutions
        </span>
      </h1>
    }
    
      >
        <img
          src={`https://images-cdn.openxcell.com/wp-content/uploads/2025/01/27141222/Banner-5-scaled.webp`}
          alt="hero"
          height={720}
          width={1400}
          className="mx-auto rounded-2xl object-cover h-full object-left-top"
          draggable={false}
        />
      </ContainerScroll>
    </div>
      {/* Features Section */}
      <div className=" bg-gray-50  dark:bg-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
              Features
            </h2>
            <p className="mt-1 text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight">
              Why Choose Rewiree
            </p>
            <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500 dark:text-gray-300">
              Our platform combines cutting-edge AI technology with human expertise to provide you with the best health consultation experience.
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="pt-6">
                <div className="flow-root bg-white dark:bg-gray-900 rounded-lg shadow-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-md shadow-lg">
                        <Zap className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                      Instant AI Responses
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                      Get immediate answers to your health questions from our advanced AI system, available 24/7 without waiting.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-white dark:bg-gray-900 rounded-lg shadow-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-md shadow-lg">
                        <Users className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                      Expert Human Consultations
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                      Schedule voice or video calls with qualified healthcare professionals for personalized advice and treatment options.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-white dark:bg-gray-900 rounded-lg shadow-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-md shadow-lg">
                        <Shield className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                      Secure & Private
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                      Your health data is protected with end-to-end encryption and complies with HIPAA, GDPR, and other privacy regulations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* <Logos3 {...logoData} /> */}
      {/* Testimonials */}
      {/* <div className="bg-white dark:bg-gray-900 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
              Testimonials
            </h2>
            <p className="mt-1 text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight">
              What Our Users Say
            </p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 shadow-md">
              <div className="flex items-center">
                <img
                  className="h-12 w-12 rounded-full object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="User"
                />
                <div className="ml-4">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Sarah Johnson</h4>
                  <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                "The AI consultation saved me a trip to the doctor. I got immediate answers to my questions and peace of mind. When I needed more detailed advice, the expert call was incredibly helpful."
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 shadow-md">
              <div className="flex items-center">
                <img
                  className="h-12 w-12 rounded-full object-cover"
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="User"
                />
                <div className="ml-4">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Michael Chen</h4>
                  <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                "As someone with a busy schedule, being able to get health advice at any time of day has been a game-changer. The voice feature makes it feel like I'm talking to a real person."
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 shadow-md">
              <div className="flex items-center">
                <img
                  className="h-12 w-12 rounded-full object-cover"
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="User"
                />
                <div className="ml-4">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Emily Rodriguez</h4>
                  <div className="flex items-center mt-1">
                    {[...Array(4)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                    <Star className="h-4 w-4 text-yellow-400 stroke-current fill-none" />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                "I was skeptical at first, but the AI gave me surprisingly accurate information about my symptoms. The premium plan is worth it for the expert calls alone."
              </p>
            </div>
          </div>
        </div>
      </div> */}

      {/* CTA Section */}
      <div className="bg-indigo-700">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-indigo-200">Try our AI consultation today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
              >
                Sign up for free
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                to="/chat"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Try it now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Star: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export default HomePage;