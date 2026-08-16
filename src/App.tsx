import { useState, useRef } from 'react';
import { FileUploader } from './components/FileUploader';
import { Header } from './components/Header';
import { BasicsSection } from './components/BasicsSection';
import { NavigationBar } from './components/NavigationBar';
import { StoryboardTimeline, StoryboardTimelineHandle } from './components/StoryboardTimeline';
import { useScrollSpy } from './hooks/useScrollSpy';
import { useGlobalSettings } from './stores/useGlobalSettings';
import { CharactersPage } from './components/CharactersPage';
import { ProjectNavigation, ProjectPage } from './components/ProjectNavigation';
import { ParsedProjectFile } from './utils/projectArchive';
import { AudioProductionPage } from './components/AudioProductionPage';

function App() {
  const { mvData, loadProject } = useGlobalSettings();
  const timelineRef = useRef<StoryboardTimelineHandle>(null);
  const [activePage, setActivePage] = useState<ProjectPage>('storyboard');

  // Generate segment IDs for scrollspy
  const segmentIds = mvData?.storyboard.map(s => `segment-${s.segment_id}`) || [];
  const activeSegmentIdString = useScrollSpy(segmentIds, 150);
  
  // Extract number from "segment-1" -> 1
  const activeSegmentId = activeSegmentIdString 
    ? parseInt(activeSegmentIdString.replace('segment-', '')) 
    : undefined;

  // Handle data loading
  const handleDataLoaded = ({ project, generationSettings }: ParsedProjectFile) => {
    loadProject(project, generationSettings);
    const loadedProject = useGlobalSettings.getState().mvData;
    setActivePage(loadedProject?.director_plan?.audio_plan && loadedProject.director_plan.audio_plan.mode !== 'disabled' ? 'audio' : 'storyboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGlobalGenerate = () => {
    timelineRef.current?.generateAllSegments();
  };

  const handleGlobalFrameGenerate = () => {
    timelineRef.current?.generateAllFrames();
  };

  return (
    <div className="min-h-screen">
      {!mvData ? (
        <div className="mx-auto max-w-6xl p-4 md:p-8">
          <FileUploader onDataLoaded={handleDataLoaded} />
        </div>
      ) : (
        <div className="animate-in fade-in duration-700">
          <ProjectNavigation
            activePage={activePage}
            characterCount={mvData.characters.length}
            onPageChange={(page) => {
              setActivePage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          <div className="mx-auto max-w-6xl p-4 pt-8 md:p-8 md:pt-10">
            {activePage === 'audio' ? (
              <AudioProductionPage />
            ) : activePage === 'characters' ? (
              <CharactersPage
                characters={mvData.characters}
                directionName={mvData.direction_name}
                proposalId={mvData.proposal_id}
              />
            ) : (
              <>
                <Header
                  title={mvData.direction_name}
                  proposalId={mvData.proposal_id}
                  onGenerateAll={handleGlobalGenerate}
                  onGenerateAllFrames={handleGlobalFrameGenerate}
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
              </>
            )}

            <footer className="mt-20 border-t border-white/5 py-10 text-center text-xs text-gray-600">
              <p>MV AI Prompt可视化工具 &copy; {new Date().getFullYear()}</p>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
