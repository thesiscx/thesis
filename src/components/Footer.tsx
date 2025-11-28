import { useEffect, useState } from "react";
import logo from "@/assets/robomart-logo.png";

export default function Footer() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <footer className="bg-footer border-t border-border h-14 px-12 flex items-center">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Robomart" className="h-5 w-5" />
          <span className="text-sm font-medium text-white font-grotesk">Robomart Compliance Center</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-mono text-white">{formatTime(currentTime)}</span>
        </div>
      </div>
    </footer>
  );
}
