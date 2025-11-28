import { useEffect, useState } from 'react';

const features = [
  "Configure rounds",
  "Craft your memo",
  "Manage versions",
  "Tailor per investor",
  "Publish on subdomain",
  "Create share links",
  "Control access keys",
  "Track investor views",
  "Send dockets",
  "Capture commitments",
  "Generate SAFE agreements",
  "Execute contracts",
  "Provide wire instructions",
  "Receive funding",
  "Sync with captable",
  "Leverage invisible AI",
];

export function FeatureStream() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Start with first item
    setVisibleItems([0]);
    setCurrentIndex(1);

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        setVisibleItems((items) => {
          const newItems = [...items, prev];
          // Keep only the last 6 visible items
          if (newItems.length > 6) {
            return newItems.slice(-6);
          }
          return newItems;
        });
        
        return (prev + 1) % features.length;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-40 overflow-hidden relative">
      {/* Top fade gradient */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent z-10" />
      
      <div className="flex flex-col items-center justify-end h-full pb-2">
        {visibleItems.map((index, i) => {
          const isNewest = i === visibleItems.length - 1;
          const opacity = isNewest ? 1 : Math.max(0.15, 1 - (visibleItems.length - 1 - i) * 0.2);
          
          return (
            <div
              key={`${index}-${i}`}
              className="text-sm text-muted-foreground transition-all duration-500 ease-out py-0.5"
              style={{ 
                opacity,
                animation: isNewest ? 'fade-in 0.5s ease-out' : undefined
              }}
            >
              {features[index]}
            </div>
          );
        })}
      </div>
      
      {/* Bottom fade gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent z-10" />
    </div>
  );
}

