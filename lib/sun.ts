// Where the sun stands over the Golden Gate at the visitor's time of day (Andrew 2026-10-25: "my
// image on the resume should change depending on the time of day of the user ... the sun should
// reflect where it would actually be"). Used by the résumé photo's dialog (resume.client.tsx).
//
// The visitor's clock needs no permission: `new Date()` is their local time. Their position would
// (navigator.geolocation asks first), so the sun is worked out for the bridge itself, at the
// visitor's hour and minute on today's date: "if it were 6:40 pm at the Golden Gate right now".
// That keeps the season honest (dusk comes earlier in December) without asking for anything.
//
// The maths is the usual low-precision solar position (declination from the day of the year,
// hour angle from local solar time), good to about a degree, which is plenty for a glow.

const BRIDGE = { lat: 37.8199, lon: -122.4783 };
const rad = Math.PI / 180;

export type SunPhase = 'dawn' | 'day' | 'dusk' | 'night';
export type Sun = {
  /** Degrees above the horizon (negative below it). */
  elevation: number;
  /** Degrees clockwise from north. */
  azimuth: number;
  phase: SunPhase;
};

/** Is this date inside US daylight saving (second Sunday of March to first Sunday of November)? */
function pacificDst(d: Date) {
  const y = d.getFullYear();
  const nthSunday = (month: number, n: number) => {
    const first = new Date(y, month, 1).getDay();
    return 1 + ((7 - first) % 7) + (n - 1) * 7;
  };
  const start = new Date(y, 2, nthSunday(2, 2), 2);
  const end = new Date(y, 10, nthSunday(10, 1), 2);
  return d >= start && d < end;
}

export function sunAt(now: Date = new Date()): Sun {
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  const g = (2 * Math.PI / 365) * (day - 1);
  // Equation of time (minutes) and declination (radians), NOAA's series.
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  // The visitor's clock read as the bridge's clock (Pacific, UTC-8, or -7 in summer time).
  const zone = pacificDst(now) ? -7 : -8;
  const clock = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const solar = clock + eot + 4 * BRIDGE.lon - 60 * zone;
  const hourAngle = (solar / 4 - 180) * rad;
  const lat = BRIDGE.lat * rad;
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith)));
  const elevation = 90 - zenith / rad;
  const az = Math.acos(Math.min(1, Math.max(-1, (Math.sin(decl) - Math.sin(lat) * cosZenith) / (Math.cos(lat) * Math.sin(zenith)))));
  const azimuth = hourAngle > 0 ? 360 - az / rad : az / rad;
  // Civil twilight (down to 6 degrees below) through the first 6 degrees up reads as dawn or dusk.
  const phase: SunPhase = elevation < -6 ? 'night' : elevation < 6 ? (hourAngle < 0 ? 'dawn' : 'dusk') : 'day';
  return { elevation, azimuth, phase };
}

// The photo looks roughly west from the bay, under the south tower toward the Marin headlands, so
// a setting sun is in frame and a rising one is behind the camera, lighting Andrew's face. These
// place the sun on the picture: the horizon (the waterline) sits 56% down, the top of the frame
// is about 30 degrees up, and the frame spans about 70 degrees side to side.
const VIEW = { heading: 280, width: 70, horizon: 56, top: 30 };

/** The sun's spot on the photo, in percent of its width and height (may fall outside 0 to 100). */
export function sunOnPhoto(sun: Sun) {
  let off = sun.azimuth - VIEW.heading;
  off = ((off + 540) % 360) - 180; // -180 to 180, negative is left of centre
  return {
    x: 50 + (off / VIEW.width) * 100,
    y: VIEW.horizon - (sun.elevation / VIEW.top) * VIEW.horizon,
    /** Behind the camera: the light falls on Andrew instead of glowing in the sky. */
    behind: Math.abs(off) > 90,
  };
}
