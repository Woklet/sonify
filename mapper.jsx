// mapper.jsx — Layer 2: DesignDescriptor → MusicalDescriptor (pure, deterministic)

// --- Mapping primitives ---

// Color palette size → scale/mode
// Few colors = simple tonality. Many = chromatic complexity.
// 1-3 colors: pentatonic (5 notes)
// 4-6 colors: diatonic (7 notes)
// 7-9 colors: 9-note scale
// 10+: chromatic (12 notes)
function paletteToMode(colorPalette) {
  const n = colorPalette.length;
  if (n <= 3) return [0, 2, 4, 7, 9];                          // pentatonic
  if (n <= 6) return [0, 2, 4, 5, 7, 9, 11];                   // major
  if (n <= 9) return [0, 1, 2, 4, 5, 7, 9, 10, 11];            // 9-note
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];              // chromatic
}

// Analyze color temperature → root key
// Warm colors (high R, low B in RGB) → major-ish keys (C, G, D)
// Cool colors (high B, low R) → minor-ish keys (A, E, B)
// Neutral → C
function paletteToKey(colorPalette) {
  if (colorPalette.length === 0) return 60; // C4

  // Parse the most-used colors to get average warmth
  let totalWarmth = 0;
  let count = 0;
  for (const c of colorPalette.slice(0, 5)) {
    const rgb = parseColor(c.hex);
    if (rgb) {
      // Warmth: positive = warm, negative = cool
      totalWarmth += (rgb.r - rgb.b) / 255;
      count++;
    }
  }
  const avgWarmth = count > 0 ? totalWarmth / count : 0;

  // Map warmth (-1..1) to key: warm→C(60), neutral→G(55), cool→A(57)
  if (avgWarmth > 0.2) return 60;      // C4 — bright, warm
  if (avgWarmth < -0.2) return 57;     // A3 — cool, minor feel
  return 55;                            // G3 — neutral
}

// Parse CSS color string to {r, g, b}
function parseColor(str) {
  const rgbMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] };
  // Hex
  const hexMatch = str.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const h = hexMatch[1];
    return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
  }
  return null;
}

// Whitespace ratio → rest before this note
// Higher whitespace = longer rest. 0 = no rest.
function whitespaceToRest(ratio) {
  if (ratio < 0.1) return null;           // negligible spacing
  if (ratio < 0.5) return "32n";          // tiny breath
  if (ratio < 1.0) return "16n";          // short rest
  if (ratio < 2.0) return "8n";           // moderate rest
  return "4n";                             // generous whitespace = quarter rest
}

// Visual hierarchy → pitch class index within mode
// Headings and large/heavy elements get higher pitches.
// Returns index into the mode array (0 = lowest, mode.length-1 = highest).
function hierarchyToPitch(element, modeLength) {
  let score = 0;

  // Heading level: h1=6, h2=5, ... h6=1
  if (element.isHeading) {
    score += (7 - element.headingLevel) * 1.5;
  }

  // Font size contribution (16px baseline)
  score += (element.fontSize / 16) * 2;

  // Visual weight
  score += element.visualWeight;

  // Clamp to mode range
  const maxIndex = modeLength - 1;
  return Math.min(Math.round(score), maxIndex);
}

// Grid columns → time signature
// 2 or 4 columns → 4/4, 3 columns → 3/4, other → 4/4
function gridToMeter(columns) {
  if (columns === 3 || columns === 6) return [3, 4];
  return [4, 4];
}

// Element density → tempo
// Sparse pages are slower, dense pages are faster.
function densityToTempo(density) {
  // density = elements per 10000px viewport area
  // Typical range: 0.5 (minimal) to 5 (dense dashboard)
  const clamped = Math.max(0.3, Math.min(density, 6));
  // Map to 80-220 BPM
  return Math.round(80 + (clamped / 6) * 140);
}

// Visual weight → velocity
function weightToVelocity(visualWeight) {
  // visualWeight typically 0-4+
  const clamped = Math.max(0, Math.min(visualWeight, 4));
  return 0.2 + (clamped / 4) * 0.8; // 0.2 to 1.0
}

// Octave from depth: shallow = mid register, deep = higher
// Depth 0-1: octave 3, depth 2-3: octave 4, depth 4+: octave 5
function depthToOctave(depth) {
  if (depth <= 1) return 3;
  if (depth <= 3) return 4;
  return 5;
}

// --- Full mapper ---

function mapToMusical(designDescriptor) {
  const dd = designDescriptor;

  // Global parameters from design properties
  const mode = paletteToMode(dd.colorPalette);
  const key = paletteToKey(dd.colorPalette);
  const tempo = densityToTempo(dd.density);

  // Find dominant meter from grid layouts
  let meter = [4, 4];
  for (const el of dd.elements) {
    if (el.gridColumns > 0) {
      meter = gridToMeter(el.gridColumns);
      break; // use first grid found
    }
  }

  // Map each element to a note
  const notes = [];
  for (const el of dd.elements) {
    const isChord = el.cat === "structural" && el.childCount > 0;

    // Rest before this note based on whitespace
    const restDuration = whitespaceToRest(el.whitespaceRatio);
    if (restDuration) {
      notes.push({
        rest: true,
        duration: restDuration,
        midi: 0,
        velocity: 0,
        tag: el.tag,
        category: el.cat,
        depth: el.depth,
        role: "rest",
      });
    }

    // Pitch: mode degree from hierarchy, octave from depth
    const pitchIndex = hierarchyToPitch(el, mode.length);
    const octave = depthToOctave(el.depth);
    const midi = (octave * 12) + mode[pitchIndex % mode.length] + (key % 12);

    // Duration: headings and structural parents get longer notes
    let duration = "16n";
    if (el.isHeading) duration = "8n";
    if (isChord) duration = "2n";
    if (el.repeatedChildStructure) duration = "4n";

    // Velocity from visual weight
    const velocity = weightToVelocity(el.visualWeight);

    notes.push({
      rest: false,
      midi,
      duration,
      velocity,
      tag: el.tag,
      category: el.cat,
      depth: el.depth,
      role: isChord ? "chord" : "melody",
      isHeading: el.isHeading,
      repeatedChildStructure: el.repeatedChildStructure,
      repeatCount: el.repeatCount,
    });
  }

  return { key, mode, tempo, meter, notes, totalElements: dd.totalElements };
}
