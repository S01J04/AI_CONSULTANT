import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MessageSquare, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["amazing", "new", "wonderful", "beautiful", "smart"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTitleNumber((prev) => (prev === titles.length - 1 ? 0 : prev + 1));
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="relative w-full bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b-2 border-gray-200">
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[50vh] py-20 lg:py-10">
        {/* <div>
          <Button variant="secondary" size="sm" className="gap-4">
            Read our launch article <MoveRight className="w-4 h-4" />
          </Button>
        </div> */}

        <div className="flex flex-col gap-4 text-center mt-6">
          <h1 className="text-5xl md:text-7xl max-w-3xl tracking-tighter font-regular">
            <span className="text-spektr-cyan-50">This is something</span>
            <span className="relative flex w-full justify-center overflow-hidden">
              &nbsp;
              {titles.map((title, index) => (
                <motion.span
                  key={index}
                  className="absolute font-semibold"
                  initial={{ opacity: 0, y: "-100%" }}
                  transition={{ type: "spring", stiffness: 50 }}
                  animate={
                    titleNumber === index
                      ? { y: 0, opacity: 1 }
                      : { y: titleNumber > index ? -150 : 150, opacity: 0 }
                  }
                >
                  {title}
                </motion.span>
              ))}
            </span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl">
            An AI-powered consultation platform for smarter business decisions, professional growth, and personal clarity—all in a secure, supportive space. Whether you’re navigating complex business challenges, planning your next career move, or seeking personal growth, get tailored insights from advanced AI and expert human support to unlock your path to success.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-6">
          <Link
            to="/chat"
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50"
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Ask an AI Expert
          </Link>
          <Link
            to="/appointments"
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Calendar className="h-5 w-5 mr-2" />
            {/* Schedule a Call */}
            Appointment-Comming soon
          </Link>
        </div>
      </div>
    </div>
  );
}

export { Hero };
