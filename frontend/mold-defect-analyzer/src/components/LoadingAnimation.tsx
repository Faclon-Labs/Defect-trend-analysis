
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export const LoadingAnimation = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    "Initializing production data analysis...",
    "Loading machine configuration data...",
    "Processing mould specifications...",
    "Analyzing defect patterns and trends...",
    "Calculating performance metrics...",
    "Generating dashboard insights...",
    "Finalizing data visualization..."
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length);
    }, 300);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + 3;
      });
    }, 60);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="p-8 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          {/* AI Analysis Text */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Loading Dashboard
            </h2>
            <div className="h-6 overflow-hidden">
              <p className="text-gray-600 animate-pulse transition-all duration-300">
                {steps[currentStep]}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Pulsing Dots */}
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </Card>
    </div>
  );
};
