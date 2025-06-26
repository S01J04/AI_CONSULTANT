import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, PhoneCall, User } from "lucide-react";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });

    // Here, you can send data to the backend API
  };

  return (
    <motion.div 
      className="max-w-3xl mx-auto my-10 p-6 bg-white shadow-lg rounded-xl"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">
        Get in Touch with Our AI Experts
      </h2>
      <p className="text-gray-600 text-center mb-6">
        Need help or have questions? Fill out the form and our AI consultant will reach out to you!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <User className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your Name"
            className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring focus:ring-indigo-300"
            required
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-500" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Your Email"
            className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring focus:ring-indigo-300"
            required
          />
        </div>

        <div className="relative">
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Your Message"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring focus:ring-indigo-300"
            rows={4}
            required
          />
        </div>

        <motion.button
          type="submit"
          className="w-full p-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          whileTap={{ scale: 0.95 }}
        >
          Send Message
        </motion.button>
      </form>

      {submitted && (
        <motion.p 
          className="text-green-600 mt-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          ✅ Your message has been sent! Our team will get back to you soon.
        </motion.p>
      )}

      <div className="mt-8 text-center">
        <p className="text-gray-600">Or reach us at:</p>
        <p className="text-indigo-600 font-medium flex items-center justify-center gap-2">
          <PhoneCall className="w-4 h-4" /> +91 9004782037
        </p>
      </div>
    </motion.div>
  );
};

export default ContactUs;
