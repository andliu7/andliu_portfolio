// The eight résumé landmarks on the 3D island, by name only. Kept apart from island-scene.tsx
// (which pulls in three.js) so the stage, which ships with the page, can label the buildings
// without importing the scene. The order is the scene's order: index i here is building i there.
export const LANDMARKS = [
  { id: 'blueberry', name: 'Blueberry Lab' },
  { id: 'brain', name: 'Greenhouse' },
  { id: 'studio', name: 'Studio' },
  { id: 'dock', name: 'Dock' },
  { id: 'school', name: 'Schoolhouse' },
  { id: 'umd', name: 'UMD' },
  { id: 'clinic', name: 'Clinic' },
  { id: 'chapel', name: 'Chapel' },
] as const;
