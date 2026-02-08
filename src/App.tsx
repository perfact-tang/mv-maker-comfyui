import { useState, useEffect, useRef } from 'react';
import { FileUploader } from './components/FileUploader';
import { Header } from './components/Header';
import { BasicsSection } from './components/BasicsSection';
import { NavigationBar } from './components/NavigationBar';
import { StoryboardTimeline, StoryboardTimelineHandle } from './components/StoryboardTimeline';
import { MVScriptData } from './types/mv-data';
import { useScrollSpy } from './hooks/useScrollSpy';
import { useGlobalSettings } from './stores/useGlobalSettings';

function App() {
  const { mvData, setMvData } = useGlobalSettings();
  const timelineRef = useRef<StoryboardTimelineHandle>(null);

  // Generate segment IDs for scrollspy
  const segmentIds = mvData?.storyboard.map(s => `segment-${s.segment_id}`) || [];
  const activeSegmentIdString = useScrollSpy(segmentIds, 150);
  
  // Extract number from "segment-1" -> 1
  const activeSegmentId = activeSegmentIdString 
    ? parseInt(activeSegmentIdString.replace('segment-', '')) 
    : undefined;

  // Handle data loading
  const handleDataLoaded = (data: MVScriptData) => {
    setMvData(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGlobalGenerate = () => {
    timelineRef.current?.generateAllSegments();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      {!mvData ? (
        <FileUploader onDataLoaded={handleDataLoaded} />
      ) : (
        <div className="animate-in fade-in duration-700 slide-in-from-bottom-4">
          <Header 
            title={mvData.direction_name} 
            proposalId={mvData.proposal_id} 
            onGenerateAll={handleGlobalGenerate}
          />
          
          <BasicsSection basics={mvData.basics} />
          
          <NavigationBar 
            segments={mvData.storyboard} 
            activeSegmentId={activeSegmentId} 
          />
          
          <StoryboardTimeline 
            ref={timelineRef}
            storyboard={mvData.storyboard} 
            basics={mvData.basics}
          />
          
          <footer className="mt-20 py-10 border-t border-white/5 text-center text-gray-600 text-xs">
            <p>MV AI Prompt可视化工具 &copy; {new Date().getFullYear()}</p>
          </footer>
        </div>
      )}
    </div>
  );
}

export default App;
