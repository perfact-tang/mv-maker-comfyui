import { saveAs } from 'file-saver';
import type { MVScriptData, ProjectGenerationSettings } from '../types/mv-data';
import { createProjectArchive } from './projectArchive';

export const downloadProjectArchive = (
  project: MVScriptData,
  generationSettings: ProjectGenerationSettings,
) => {
  const archive = createProjectArchive(project, generationSettings);
  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
  saveAs(
    blob,
    `mv_project_${String(project.proposal_id).padStart(3, '0')}_full_${new Date().toISOString().slice(0, 10)}.json`,
  );
};
