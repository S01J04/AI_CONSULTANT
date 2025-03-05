import { motion } from "framer-motion";
import { Brain, Users, Lightbulb, ShieldCheck } from "lucide-react";
import { Faq3 } from "../components/faq3";
import ContactUs from "./ContactUs";

const faqData = {
    heading: "Frequently Asked Questions",
    description:
      "Everything you need to know about our AI consulting services. Can't find the answer you're looking for? Feel free to contact our support team.",
    items: [
      {
        id: "faq-1",
        question: "What services do you offer?",
        answer:
          "We provide AI-powered consulting, automation solutions, predictive analytics, and AI strategy development tailored to your business needs.",
      },
      {
        id: "faq-2",
        question: "How can AI help my business?",
        answer:
          "AI can streamline operations, enhance customer experiences, automate repetitive tasks, and provide valuable insights for better decision-making.",
      },
      {
        id: "faq-3",
        question: "Do I need technical expertise to use your services?",
        answer:
          "No, our team handles everything! We provide end-to-end AI solutions, ensuring a smooth integration with your existing systems.",
      },
      {
        id: "faq-4",
        question: "Is AI consulting expensive?",
        answer:
          "Our pricing is flexible based on your business needs. We offer scalable solutions for startups, small businesses, and enterprises.",
      },
      {
        id: "faq-5",
        question: "How do I get started?",
        answer:
          "Simply book a consultation with our AI experts. We'll assess your needs and create a customized AI roadmap for your business.",
      },
    ],
    supportHeading: "Still have questions?",
    supportDescription:
      "Can't find the answer you're looking for? Our AI consultants are here to help with any technical questions or project discussions.",
    supportButtonText: "Contact Us",
    supportButtonUrl: "/contact",
  };


  
function AboutUs() {
  const features = [
    {
      icon: <Brain className="w-10 h-10 text-indigo-600" />,
      title: "AI-Powered Insights",
      description: "Leverage cutting-edge AI to gain deep business insights and make data-driven decisions.",
    },
    {
      icon: <Users className="w-10 h-10 text-indigo-600" />,
      title: "Expert AI Consultants",
      description: "Our team of AI specialists helps you integrate intelligent solutions tailored to your business needs.",
    },
    {
      icon: <Lightbulb className="w-10 h-10 text-indigo-600" />,
      title: "Innovative Solutions",
      description: "We develop AI-driven automation and predictive analytics to drive efficiency and growth.",
    },
    {
      icon: <ShieldCheck className="w-10 h-10 text-indigo-600" />,
      title: "Secure & Scalable",
      description: "We prioritize security and scalability, ensuring your AI solutions are reliable and future-proof.",
    },
  ];

  return (
    <div className="">
     <div className="sm:w-[100%] md:w-[70%] mx-auto my-20 p-10 shadow-md  rounded-3xl text-center">
     <motion.h2
        className="text-5xl font-extrabold text-gray-900 dark:text-white"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        About <span className="text-indigo-600">Us</span>
      </motion.h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mt-4">
        We empower businesses with AI-driven strategies, transforming data into actionable insights.
        Our team specializes in automation, predictive analytics, and intelligent decision-making.
      </p>

      <div className="grid mx-auto md:grid-cols-2 gap-8 mt-10">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="md:p-6  bg-white  rounded-xl shadow-lg flex flex-col items-center gap-4 text-left"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <div className=" w-full">{feature.icon}</div>
            <div>
              <h3 className="text-xl  font-semibold text-gray-800">{feature.title}</h3>
              <p className="text-gray-600 ">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
     </div>
     <div className="mx-auto  w-[70%]">
     <Faq3 {...faqData} />
     </div>
     <ContactUs/>
    </div>
  );
}

export { AboutUs };
