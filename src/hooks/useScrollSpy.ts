import { useState, useEffect } from 'react';

export const useScrollSpy = (ids: string[], offset: number = 0) => {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      let currentId = '';
      
      // Find the element that is currently in view
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Check if the element is near the top of the viewport (considering offset)
          if (rect.top <= offset + 100 && rect.bottom >= offset) {
            currentId = id;
          }
        }
      }

      if (currentId !== activeId) {
        setActiveId(currentId);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, [ids, offset, activeId]);

  return activeId;
};
