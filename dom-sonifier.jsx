const { useState, useRef, useCallback, useEffect } = React;

// --- Musical constants ---
const PENTATONIC = [0, 2, 4, 7, 9]; // semitone offsets
const BASE_NOTE = 36; // C2 MIDI
const OCTAVE_RANGE = 5;
const NOTE_DURATION = "16n";
const CHORD_DURATION = "2n";
const TEMPO = 200; // BPM — fast enough to be interesting

// Element type -> instrument + visual config
const VOICE_MAP = {
  structural: { instrument: "fm-pad", color: "#5b8a72" },   // warm FM pad for chords
  text:       { instrument: "pluck", color: "#c9a227" },     // plucked string melody
  media:      { instrument: "am-bell", color: "#b04a5a" },   // bell-like AM tones
  interactive:{ instrument: "membrane", color: "#4a7ab0" },  // percussive punch
  meta:       { instrument: "fm-eerie", color: "#7a6b8a" },  // eerie digital
};

function classifyElement(tagName) {
  const t = (tagName || "").toLowerCase();
  if (["html","body","div","section","main","article","aside","header","footer","nav","ul","ol","dl","table","thead","tbody","tr","td","th"].includes(t)) return "structural";
  if (["p","span","h1","h2","h3","h4","h5","h6","a","em","strong","b","i","li","label","blockquote","pre","code","small","sub","sup","abbr","cite","dd","dt","figcaption","mark","s","u","time","data"].includes(t)) return "text";
  if (["img","video","audio","canvas","svg","picture","figure","source","track","embed","object","iframe"].includes(t)) return "media";
  if (["button","input","select","textarea","form","details","summary","dialog","fieldset","legend","meter","output","progress","datalist","option","optgroup"].includes(t)) return "interactive";
  return "meta";
}

// Build a two-track arrangement: melody (leaf/content) + chords (structural parents)
function domToArrangement(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const allNodes = []; // full sequence for visualizer
  const melody = [];
  const chordChanges = []; // { atMelodyIndex, midis: [midi...] }
  let pendingChordMidis = [];

  function walk(node, depth) {
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    const cat = classifyElement(tag);
    const childCount = node.children.length;
    const sibIndex = node.parentElement
      ? Array.from(node.parentElement.children).indexOf(node)
      : 0;
    const noteIndex = sibIndex % PENTATONIC.length;
    const octave = Math.min(depth, OCTAVE_RANGE - 1);
    const midi = BASE_NOTE + octave * 12 + PENTATONIC[noteIndex];
    const velocity = Math.min(0.3 + childCount * 0.1, 1.0);

    // Structural nodes with children are accompaniment; everything else is melody
    const isChord = cat === "structural" && childCount > 0;

    const nodeData = { tag, cat, depth, midi, childCount, sibIndex, velocity, role: isChord ? "chord" : "melody" };
    allNodes.push(nodeData);

    if (isChord) {
      pendingChordMidis.push(midi);
    } else {
      // Flush any pending chord notes at this melody position
      if (pendingChordMidis.length > 0) {
        chordChanges.push({ atMelodyIndex: melody.length, midis: [...pendingChordMidis] });
        pendingChordMidis = [];
      }
      melody.push(nodeData);
    }

    for (const child of node.children) {
      walk(child, depth + 1);
    }
  }

  walk(doc.documentElement, 0);

  // Trailing chord notes with no melody after them
  if (pendingChordMidis.length > 0) {
    chordChanges.push({ atMelodyIndex: melody.length, midis: [...pendingChordMidis] });
  }

  return { allNodes, melody, chordChanges };
}

// --- Sample HTML snippets ---
const SAMPLES = {
  "Minimal blog": `<html><body><header><nav><a href="/">Home</a><a href="/about">About</a></nav><h1>My Blog</h1></header><main><article><h2>First Post</h2><p>Hello world.</p><p>This is a simple blog.</p></article><article><h2>Second Post</h2><p>More thoughts here.</p><ul><li>Point one</li><li>Point two</li><li>Point three</li></ul></article></main><footer><p>Copyright 2026</p></footer></body></html>`,
  "Dense form": `<html><body><main><h1>Application Form</h1><form><fieldset><legend>Personal</legend><label>Name<input type="text"/></label><label>Email<input type="email"/></label><label>Phone<input type="tel"/></label></fieldset><fieldset><legend>Details</legend><label>Role<select><option>Developer</option><option>Designer</option><option>Manager</option><option>Other</option></select></label><label>Bio<textarea></textarea></label><label>Resume<input type="file"/></label></fieldset><fieldset><legend>Preferences</legend><label><input type="checkbox"/>Newsletter</label><label><input type="checkbox"/>Updates</label><label><input type="checkbox"/>Promotions</label><label><input type="radio" name="freq"/>Daily</label><label><input type="radio" name="freq"/>Weekly</label><label><input type="radio" name="freq"/>Monthly</label></fieldset><button type="submit">Submit</button></form></main></body></html>`,
  "Media gallery": `<html><body><header><h1>Gallery</h1><nav><a href="#photos">Photos</a><a href="#videos">Videos</a></nav></header><main><section id="photos"><h2>Photos</h2><figure><img src="1.jpg"/><figcaption>Sunset</figcaption></figure><figure><img src="2.jpg"/><figcaption>Mountain</figcaption></figure><figure><img src="3.jpg"/><figcaption>Ocean</figcaption></figure><figure><img src="4.jpg"/><figcaption>Forest</figcaption></figure></section><section id="videos"><h2>Videos</h2><figure><video src="a.mp4"></video><figcaption>Timelapse</figcaption></figure><figure><video src="b.mp4"></video><figcaption>Documentary</figcaption></figure></section></main></body></html>`,
  "Dashboard": `<html><body><nav><a href="/">Dashboard</a><a href="/analytics">Analytics</a><a href="/settings">Settings</a></nav><main><section><h2>Overview</h2><div><div><h3>Revenue</h3><p>$42,389</p><meter value="0.73"></meter></div><div><h3>Users</h3><p>12,847</p><meter value="0.58"></meter></div><div><h3>Growth</h3><p>+18.3%</p><progress value="83" max="100"></progress></div></div></section><section><h2>Recent Activity</h2><table><thead><tr><th>User</th><th>Action</th><th>Time</th></tr></thead><tbody><tr><td>Alice</td><td>Deployed v2.1</td><td>2m ago</td></tr><tr><td>Bob</td><td>Merged PR #847</td><td>15m ago</td></tr><tr><td>Carol</td><td>Updated config</td><td>1h ago</td></tr><tr><td>Dave</td><td>Filed issue</td><td>2h ago</td></tr></tbody></table></section></main></body></html>`,
};

// --- Visualizer component ---
function NodeViz({ sequence, currentIndex, currentChord }) {
  const maxDepth = Math.max(...sequence.map(n => n.depth), 1);
  const visibleWindow = 60;
  const start = Math.max(0, currentIndex - 10);
  const end = Math.min(sequence.length, start + visibleWindow);
  const slice = sequence.slice(start, end);

  return (
    <div>
      {/* Main melody visualizer */}
      <div style={{
        height: 150,
        background: "rgba(0,0,0,0.3)",
        borderRadius: "8px 8px 0 0",
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-end",
        gap: 1,
        padding: "8px 4px",
      }}>
        {slice.map((node, i) => {
          const globalI = start + i;
          const isActive = globalI === currentIndex;
          const voice = VOICE_MAP[node.cat];
          const h = 20 + (node.depth / maxDepth) * 110;
          return (
            <div key={globalI} style={{
              flex: "1 1 0",
              minWidth: 3,
              maxWidth: 14,
              height: h,
              background: isActive ? "#fff" : voice.color,
              opacity: isActive ? 1 : 0.5,
              borderRadius: "3px 3px 0 0",
              transition: "all 0.05s",
              transform: isActive ? "scaleY(1.15)" : "none",
              transformOrigin: "bottom",
            }}
              title={`<${node.tag}> depth:${node.depth}`}
            />
          );
        })}
      </div>
      {/* Chord indicator */}
      <div style={{
        height: 30,
        background: "rgba(0,0,0,0.2)",
        borderRadius: "0 0 8px 8px",
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        gap: 6,
      }}>
        <span style={{ fontSize: 9, color: "#4a4740", flexShrink: 0 }}>CHORD</span>
        {currentChord && currentChord.length > 0 ? (
          <div style={{ display: "flex", gap: 3 }}>
            {currentChord.map((midi, i) => (
              <span key={i} style={{
                fontSize: 9,
                color: VOICE_MAP.structural.color,
                background: "rgba(91,138,114,0.15)",
                borderRadius: 3,
                padding: "1px 5px",
              }}>
                {Tone.Frequency(midi, "midi").toNote()}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 9, color: "#2a2d33" }}>—</span>
        )}
      </div>
    </div>
  );
}

function DOMSonifier() {
  const [html, setHtml] = useState(SAMPLES["Minimal blog"]);
  const [arrangement, setArrangement] = useState({ allNodes: [], melody: [], chordChanges: [] });
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentChord, setCurrentChord] = useState(null);
  const [speed, setSpeed] = useState(1);
  const synthsRef = useRef({});
  const chordSynthRef = useRef(null);
  const seqRef = useRef(null);
  const toneStarted = useRef(false);

  const parse = useCallback(() => {
    const a = domToArrangement(html);
    setArrangement(a);
    setCurrentIndex(-1);
    setCurrentChord(null);
    return a;
  }, [html]);

  useEffect(() => { parse(); }, []);

  const stop = useCallback(() => {
    if (seqRef.current) {
      seqRef.current.stop();
      seqRef.current.dispose();
      seqRef.current = null;
    }
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setPlaying(false);
    setCurrentIndex(-1);
    setCurrentChord(null);
  }, []);

  const play = useCallback(async () => {
    if (!toneStarted.current) {
      await Tone.start();
      toneStarted.current = true;
    }
    stop();

    const a = parse();
    if (a.melody.length === 0) return;

    // Shared reverb
    const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).toDestination();

    // Melody synths per category
    const synths = {};

    // Text: plucked string — clear, musical melody voice
    synths.text = new Tone.PluckSynth({
      attackNoise: 1.2,
      dampening: 3000,
      resonance: 0.98,
      volume: -8,
    }).connect(reverb);

    // Media: AM synth — bell-like, stands out
    synths.media = new Tone.AMSynth({
      harmonicity: 2.5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.15, release: 0.5 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.3 },
      volume: -12,
    }).connect(reverb);

    // Interactive: membrane — percussive, punchy
    synths.interactive = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0.01, release: 0.3 },
      volume: -10,
    }).connect(reverb);

    // Meta: eerie FM — digital, alien
    synths.meta = new Tone.FMSynth({
      modulationIndex: 8,
      harmonicity: 3.01,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.4 },
      modulation: { type: "triangle" },
      modulationEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.2 },
      volume: -16,
    }).connect(reverb);

    synthsRef.current = synths;

    // Chord pad synth — warm FM pad for structural harmony
    const chordSynth = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 6,
      modulationIndex: 1.5,
      harmonicity: 1,
      oscillator: { type: "sine" },
      envelope: { attack: 0.1, decay: 0.4, sustain: 0.5, release: 1.0 },
      modulation: { type: "triangle" },
      modulationEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.5 },
      volume: -22,
    }).connect(reverb);
    chordSynthRef.current = chordSynth;

    // Build a lookup: melody index -> chord midis to trigger
    const chordAt = {};
    for (const cc of a.chordChanges) {
      chordAt[cc.atMelodyIndex] = cc.midis;
    }

    Tone.getTransport().bpm.value = TEMPO * speed;

    let i = 0;
    const part = new Tone.Sequence(
      (time) => {
        if (i >= a.melody.length) {
          stop();
          return;
        }

        // Trigger chord change if one falls at this melody index
        if (chordAt[i]) {
          const chordMidis = chordAt[i];
          Tone.getDraw().schedule(() => setCurrentChord(chordMidis), time);
          const freqs = chordMidis.map(m => Tone.Frequency(m, "midi").toFrequency());
          chordSynth.triggerAttackRelease(freqs, CHORD_DURATION, time, 0.5);
        }

        // Play melody note
        const node = a.melody[i];
        const synth = synths[node.cat];
        if (synth) {
          const freq = Tone.Frequency(node.midi, "midi").toFrequency();
          if (synth instanceof Tone.PluckSynth) {
            synth.triggerAttack(freq, time);
          } else {
            synth.triggerAttackRelease(freq, NOTE_DURATION, time, node.velocity);
          }
        }

        const idx = i;
        Tone.getDraw().schedule(() => setCurrentIndex(idx), time);
        i++;
      },
      Array.from({ length: a.melody.length }, (_, k) => k),
      NOTE_DURATION
    );

    seqRef.current = part;
    part.start(0);
    Tone.getTransport().start();
    setPlaying(true);
  }, [html, speed, parse, stop]);

  const loadSample = (name) => {
    stop();
    setHtml(SAMPLES[name]);
    setTimeout(() => {
      const a = domToArrangement(SAMPLES[name]);
      setArrangement(a);
      setCurrentIndex(-1);
      setCurrentChord(null);
    }, 0);
  };

  // Stats from full node list
  const stats = {};
  for (const node of arrangement.allNodes) {
    stats[node.cat] = (stats[node.cat] || 0) + 1;
  }

  const melodyNode = currentIndex >= 0 && currentIndex < arrangement.melody.length
    ? arrangement.melody[currentIndex] : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0f12",
      color: "#d4d0c8",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      padding: "24px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#e8e4dc",
            margin: 0,
            letterSpacing: "-0.5px",
          }}>
            DOM Sonifier
          </h1>
          <p style={{ fontSize: 12, color: "#6b6860", margin: "4px 0 0 0" }}>
            Paste HTML → hear the DOM tree as music
          </p>
        </div>

        {/* Sample selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {Object.keys(SAMPLES).map(name => (
            <button key={name} onClick={() => loadSample(name)} style={{
              background: html === SAMPLES[name] ? "#2a2d33" : "transparent",
              border: "1px solid #2a2d33",
              color: html === SAMPLES[name] ? "#e8e4dc" : "#6b6860",
              borderRadius: 4,
              padding: "4px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}>
              {name}
            </button>
          ))}
        </div>

        {/* HTML input */}
        <textarea
          value={html}
          onChange={e => { setHtml(e.target.value); }}
          onBlur={parse}
          spellCheck={false}
          style={{
            width: "100%",
            height: 120,
            background: "#15171c",
            border: "1px solid #2a2d33",
            borderRadius: 6,
            color: "#8a8680",
            fontFamily: "inherit",
            fontSize: 11,
            padding: 12,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Controls */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "14px 0",
          flexWrap: "wrap",
        }}>
          <button onClick={playing ? stop : play} style={{
            background: playing ? "#b04a5a" : "#5b8a72",
            border: "none",
            color: "#0d0f12",
            borderRadius: 5,
            padding: "8px 22px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.5px",
          }}>
            {playing ? "■ STOP" : "▶ PLAY"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 11, color: "#6b6860" }}>Speed</label>
            <input
              type="range" min={0.25} max={3} step={0.25} value={speed}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setSpeed(v);
                if (playing) Tone.getTransport().bpm.value = TEMPO * v;
              }}
              style={{ width: 80, accentColor: "#5b8a72" }}
            />
            <span style={{ fontSize: 11, color: "#6b6860", minWidth: 30 }}>{speed}x</span>
          </div>

          <span style={{ fontSize: 11, color: "#4a4740", marginLeft: "auto" }}>
            {arrangement.melody.length} melody · {arrangement.chordChanges.length} chords · {arrangement.allNodes.length} total
            {currentIndex >= 0 && ` · ${currentIndex + 1}/${arrangement.melody.length}`}
          </span>
        </div>

        {/* Visualizer */}
        {arrangement.melody.length > 0 && (
          <NodeViz
            sequence={arrangement.melody}
            currentIndex={currentIndex}
            currentChord={currentChord}
          />
        )}

        {/* Legend */}
        <div style={{
          display: "flex",
          gap: 16,
          marginTop: 14,
          flexWrap: "wrap",
        }}>
          {Object.entries(VOICE_MAP).map(([cat, cfg]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 8, height: 8, borderRadius: 2,
                background: cfg.color,
              }} />
              <span style={{ fontSize: 10, color: "#6b6860" }}>
                {cat} {stats[cat] ? `(${stats[cat]})` : ""}
              </span>
            </div>
          ))}
        </div>

        {/* Currently playing node */}
        {melodyNode && (
          <div style={{
            marginTop: 14,
            fontSize: 12,
            color: "#6b6860",
            background: "#15171c",
            borderRadius: 6,
            padding: "8px 12px",
            display: "flex",
            gap: 16,
          }}>
            <span style={{ color: VOICE_MAP[melodyNode.cat].color }}>
              {"<"}{melodyNode.tag}{">"}
            </span>
            <span>depth {melodyNode.depth}</span>
            <span>midi {melodyNode.midi}</span>
            <span>{melodyNode.cat}</span>
          </div>
        )}
      </div>
    </div>
  );
}
