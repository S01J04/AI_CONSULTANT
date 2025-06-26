import { motion } from "framer-motion";
import { Faq3 } from "../components/faq3";
import ContactUs from "./ContactUs";

const faqData = {
  heading: "Frequently Asked Questions",
  description:
    "Learn more about Rewiree, our approach, and how we support your journey. If you have more questions, feel free to reach out!",
  items: [
    {
      id: "faq-1",
      question: "What is Rewiree?",
      answer:
        "Rewiree is an AI-powered consultation platform that combines expert guidance, tailored insights, and genuine human connection to help you with personal and professional challenges.",
    },
    {
      id: "faq-2",
      question: "How does Rewiree ensure my privacy?",
      answer:
        "Your privacy is our top priority. All consultations are secure, confidential, and judgment-free. We use industry-standard security practices to protect your data.",
    },
    {
      id: "faq-3",
      question: "Can I talk to a human consultant?",
      answer:
        "Absolutely! You can connect with our expert consultants on a call for deeper, real-time support whenever you need it.",
    },
    {
      id: "faq-4",
      question: "Is Rewiree suitable for both personal and professional concerns?",
      answer:
        "Yes, our platform is designed to support you with both personal crossroads and professional challenges, offering personalized AI consultations for any situation.",
    },
    {
      id: "faq-5",
      question: "How do I get started?",
      answer:
        "Simply sign up on our platform and start your journey. Our AI and human consultants are ready to help you move forward with clarity and confidence.",
    },
  ],
  supportHeading: "Still have questions?",
  supportDescription:
    "Can't find the answer you're looking for? Our team is here to help.",
  supportButtonText: "Contact Us",
  supportButtonUrl: "/contact",
};

function AboutUs() {
  return (
    <div>
      <div className="sm:w-[100%] md:w-[70%] mx-auto my-20 p-10 shadow-md rounded-3xl text-center bg-white dark:bg-gray-900">
        <motion.h2
          className="text-5xl font-extrabold text-gray-900 dark:text-white"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          About <span className="text-indigo-600">Us</span>
        </motion.h2>
        <div className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mt-8 space-y-6 text-left">
          <p>
            At Rewiree, we believe everyone deserves clarity, confidence, and support—whether you’re facing personal crossroads or professional challenges. Our AI-powered consultation platform is designed to empower you with expert guidance, tailored insights, and genuine human connection, all in one seamless experience.
          </p>
          <h3 className="text-2xl font-bold mt-6 mb-2 text-gray-900 dark:text-white">Who We Are</h3>
          <p>
            Rewiree brings together cutting-edge artificial intelligence and compassionate consultation to help you navigate life’s complexities. We understand that every journey is unique, so our platform is built to listen, learn, and respond to your individual needs—no matter how big or small.
          </p>
          <h3 className="text-2xl font-bold mt-6 mb-2 text-gray-900 dark:text-white">What We Offer</h3>
          <ul className="list-disc list-inside ml-4 text-gray-700 dark:text-gray-300">
            <li>Personalized AI consultations for both personal and professional concerns</li>
            <li>Secure, confidential, and judgment-free environment</li>
            <li>The option to connect with our expert consultants on a call for deeper, real-time support</li>
          </ul>
          <h3 className="text-2xl font-bold mt-6 mb-2 text-gray-900 dark:text-white">Why Choose Rewiree?</h3>
          <p>
            We know that reaching out for help can be a big step. That’s why we’ve made it as easy and welcoming as possible. Our AI is always ready to listen, offering thoughtful recommendations and practical solutions, while our human consultants are just a call away—ready to guide you with empathy and expertise.
          </p>
          <h3 className="text-2xl font-bold mt-6 mb-2 text-gray-900 dark:text-white">Our Promise</h3>
          <p>
            At Rewiree, your well-being is at the heart of everything we do. We’re here to help you rewire your perspective, rediscover your strengths, and move forward with renewed optimism. Let’s build a brighter future together—one conversation at a time.
          </p>
        </div>
      </div>
      <div className="mx-auto w-[70%]">
        <Faq3 {...faqData} />
      </div>
      <ContactUs />
    </div>
  );
}

export { AboutUs };