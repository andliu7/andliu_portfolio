// Shared mutable state. Modules read and write it; core never replaces the objects, only fields.
export function createState(THREE){
  return {
    started: false,
    mode: 'drive',          // 'drive' | 'walk' | 'interior'
    prevMode: 'drive',      // island mode to return to when leaving an interior
    interior: null,         // the active room object while mode === 'interior'
    // Whatever the player currently is (car or character). The active mode's owner writes it every frame.
    player: { x: 0, z: 6, heading: Math.PI, speed: 0, pushRadius: 2.4 },
    focus: new THREE.Vector3(),   // camera look-at point on the island; the sun's shadow box follows it
    activeZone: null,       // zone object whose card is showing
    zoom: 1,                // mouse-wheel zoom, 0.6..1.7
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}
