// The eight résumé landmarks on the 3D island, by name only. Kept apart from island-scene.tsx
// (which pulls in three.js) so the stage, which ships with the page, can label the buildings
// without importing the scene. The order is the scene's order: index i here is building i there.
// The names are the résumé's own (Andrew 2026-11-11: "use names from my actual resume"), each the
// title of that building's zone in the game (island/src/data/zones.js); they were the buildings'
// game names (Blueberry Lab, Greenhouse, Studio, Dock, Schoolhouse, UMD, Clinic, Chapel).
export const LANDMARKS = [
  { id: 'blueberry', name: 'Blueberry' },
  { id: 'brain', name: 'Second Brain' },
  { id: 'studio', name: 'Chemistry Animation' },
  { id: 'dock', name: 'Minnodi LLC' },
  { id: 'school', name: 'Education One' },
  { id: 'umd', name: 'University of Maryland' },
  { id: 'clinic', name: 'Pre-Dental' },
  { id: 'chapel', name: 'Kharis Campus Ministry' },
] as const;
