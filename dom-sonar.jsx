const { useState, useRef, useCallback, useEffect } = React;

const SONAR_SAMPLES = {
  "Clean blog": `<html><body style="max-width:640px;margin:40px auto;font-family:Georgia,serif;color:#333;line-height:1.7;background:#fafaf8">
    <header style="margin-bottom:60px"><h1 style="font-size:28px;margin-bottom:8px">A Quiet Blog</h1><p style="color:#999;font-size:14px">Thoughts on design</p></header>
    <main><article style="margin-bottom:48px"><h2 style="font-size:20px;margin-bottom:12px">On Whitespace</h2><p>Space is not empty. It is full of intention.</p><p>Every margin is a breath. Every gap, a pause for thought.</p></article>
    <article style="margin-bottom:48px"><h2 style="font-size:20px;margin-bottom:12px">On Hierarchy</h2><p>The eye needs guidance. Size, weight, and position create a path.</p></article></main>
    <footer style="margin-top:80px;padding-top:20px;border-top:1px solid #eee"><p style="font-size:12px;color:#999">2026</p></footer>
  </body></html>`,

  "Cluttered mess": `<html><body style="margin:0;padding:5px;font-family:Comic Sans MS,cursive;background:#ff6;color:#f0f">
    <div style="background:#0ff;padding:2px"><b style="font-size:28px;color:red">WELCOME!!!</b><img src="x"><img src="y"><img src="z"></div>
    <div style="background:#f0f;color:#ff0;font-size:10px"><p>click here</p><p>click there</p><a href="#">BUY NOW</a><a href="#">FREE</a><a href="#">DEALS</a>
    <table><tr><td style="background:red">A</td><td style="background:green">B</td><td style="background:blue">C</td><td style="background:yellow">D</td></tr></table></div>
    <div style="background:lime"><input><input><input><button>GO</button><button>STOP</button><button>WAIT</button><select><option>1</option><option>2</option></select></div>
    <div style="font-size:8px;color:#888;background:#000"><p>footer</p><p>more footer</p><p>even more</p><p>why</p></div>
  </body></html>`,

  "Grid dashboard": `<html><body style="margin:0;padding:24px;font-family:system-ui;background:#f8f9fa;color:#1a1a2e">
    <nav style="display:flex;gap:24px;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid #e0e0e0"><a style="font-size:14px;font-weight:600">Dashboard</a><a style="font-size:14px;color:#666">Analytics</a><a style="font-size:14px;color:#666">Settings</a></nav>
    <main><h1 style="font-size:24px;margin-bottom:24px">Overview</h1>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px">
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e0e0e0"><h3 style="font-size:12px;color:#666;margin-bottom:8px">Revenue</h3><p style="font-size:28px;font-weight:700">$42,389</p></div>
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e0e0e0"><h3 style="font-size:12px;color:#666;margin-bottom:8px">Users</h3><p style="font-size:28px;font-weight:700">12,847</p></div>
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e0e0e0"><h3 style="font-size:12px;color:#666;margin-bottom:8px">Growth</h3><p style="font-size:28px;font-weight:700">+18.3%</p></div>
    </div>
    <section><h2 style="font-size:18px;margin-bottom:16px">Recent Activity</h2>
    <table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:2px solid #e0e0e0"><th style="text-align:left;padding:8px;font-size:12px;color:#666">User</th><th style="text-align:left;padding:8px;font-size:12px;color:#666">Action</th></tr></thead>
    <tbody><tr style="border-bottom:1px solid #f0f0f0"><td style="padding:8px">Alice</td><td style="padding:8px">Deployed v2.1</td></tr><tr style="border-bottom:1px solid #f0f0f0"><td style="padding:8px">Bob</td><td style="padding:8px">Merged PR</td></tr></tbody></table>
    </section></main>
  </body></html>`,

  "Minimal landing": `<html><body style="margin:0;font-family:system-ui;background:#fff;color:#111">
    <header style="padding:80px 40px;text-align:center"><h1 style="font-size:48px;font-weight:300;letter-spacing:-1px;margin-bottom:16px">Less is more.</h1><p style="font-size:18px;color:#666;max-width:480px;margin:0 auto">A single idea, clearly expressed, is worth a thousand features.</p></header>
    <main style="max-width:640px;margin:0 auto;padding:60px 40px"><section style="margin-bottom:60px"><h2 style="font-size:20px;margin-bottom:16px">Focus</h2><p style="line-height:1.8;color:#444">Design is not about adding. It is about finding what matters and letting everything else fall away.</p></section>
    <section style="margin-bottom:60px"><h2 style="font-size:20px;margin-bottom:16px">Breathe</h2><p style="line-height:1.8;color:#444">Every element needs room. Crowded interfaces create anxiety. Space creates calm.</p></section></main>
    <footer style="padding:40px;text-align:center;border-top:1px solid #f0f0f0"><p style="font-size:12px;color:#999">That's it. That's the whole page.</p></footer>
  </body></html>`,
};

function SonarSlot({ label, html, onHtmlChange, descriptor, musicalDesc, player, isPlaying, stepData }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 11, color: "#4a4740", marginBottom: 8, fontWeight: 700,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          background: label === "A" ? "#5b8a72" : "#4a7ab0",
          color: "#0d0f12", borderRadius: 3, padding: "1px 6px", fontSize: 10,
        }}>{label}</span>
        {musicalDesc && (
          <span style={{ fontWeight: 400 }}>
            {musicalDesc.mode.length} notes · {musicalDesc.tempo} BPM · {musicalDesc.meter.join("/")}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {Object.keys(SONAR_SAMPLES).map(name => (
          <button key={name} onClick={() => onHtmlChange(SONAR_SAMPLES[name])} style={{
            background: html === SONAR_SAMPLES[name] ? "#2a2d33" : "transparent",
            border: "1px solid #2a2d33",
            color: html === SONAR_SAMPLES[name] ? "#e8e4dc" : "#4a4740",
            borderRadius: 3, padding: "2px 8px", fontSize: 10,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {name}
          </button>
        ))}
      </div>

      <textarea
        value={html}
        onChange={e => onHtmlChange(e.target.value)}
        spellCheck={false}
        style={{
          width: "100%", height: 80, background: "#15171c",
          border: "1px solid #2a2d33", borderRadius: 4,
          color: "#6b6860", fontFamily: "inherit", fontSize: 10,
          padding: 8, resize: "vertical", outline: "none", boxSizing: "border-box",
        }}
      />

      {musicalDesc && (
        <div style={{
          marginTop: 8, fontSize: 10, color: "#4a4740",
          display: "flex", gap: 12, flexWrap: "wrap",
        }}>
          <span>{musicalDesc.totalElements} elements</span>
          <span>{musicalDesc.notes.filter(n => n.rest).length} rests</span>
          <span>{musicalDesc.notes.filter(n => n.role === "chord").length} chords</span>
          <span>key: {Tone.Frequency(musicalDesc.key, "midi").toNote()}</span>
        </div>
      )}

      {isPlaying && stepData && (
        <div style={{
          marginTop: 8, fontSize: 11, color: "#6b6860",
          background: "#15171c", borderRadius: 4, padding: "6px 10px",
          display: "flex", gap: 12,
        }}>
          <span style={{ color: label === "A" ? "#5b8a72" : "#4a7ab0" }}>
            {"<"}{stepData.tag}{">"}
          </span>
          <span>midi {stepData.midi}</span>
          <span>{stepData.category}</span>
          {stepData.chordMidis && (
            <span style={{ color: "#5b8a72" }}>
              chord: {stepData.chordMidis.map(m => Tone.Frequency(m, "midi").toNote()).join(" ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function DOMSonar() {
  const [htmlA, setHtmlA] = useState(SONAR_SAMPLES["Clean blog"]);
  const [htmlB, setHtmlB] = useState(SONAR_SAMPLES["Cluttered mess"]);
  const [descA, setDescA] = useState(null);
  const [descB, setDescB] = useState(null);
  const [musicalA, setMusicalA] = useState(null);
  const [musicalB, setMusicalB] = useState(null);
  const [playingSlot, setPlayingSlot] = useState(null);
  const [stepData, setStepData] = useState(null);
  const playerRef = useRef(null);
  const toneStarted = useRef(false);

  const analyze = useCallback(async (html, setDesc, setMusical) => {
    const desc = await extractDesignDescriptor(html);
    setDesc(desc);
    const musical = mapToMusical(desc);
    setMusical(musical);
    return musical;
  }, []);

  useEffect(() => { analyze(htmlA, setDescA, setMusicalA); }, [htmlA]);
  useEffect(() => { analyze(htmlB, setDescB, setMusicalB); }, [htmlB]);

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }
    setPlayingSlot(null);
    setStepData(null);
  }, []);

  const playSlot = useCallback(async (slot) => {
    if (!toneStarted.current) {
      await Tone.start();
      toneStarted.current = true;
    }
    stop();

    const musical = slot === "A" ? musicalA : musicalB;
    if (!musical || musical.notes.length === 0) return;

    const player = createSonarPlayer(musical);
    player.onStep((data) => setStepData(data));
    playerRef.current = player;
    player.play();
    setPlayingSlot(slot);
  }, [musicalA, musicalB, stop]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0d0f12", color: "#d4d0c8",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace", padding: "24px",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e8e4dc", margin: 0, letterSpacing: "-0.5px" }}>
            DOM Sonar
          </h1>
          <p style={{ fontSize: 12, color: "#6b6860", margin: "4px 0 0 0" }}>
            Does good design have a sound? Compare and find out.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => playingSlot === "A" ? stop() : playSlot("A")} style={{
            background: playingSlot === "A" ? "#b04a5a" : "#5b8a72",
            border: "none", color: "#0d0f12", borderRadius: 5,
            padding: "8px 18px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {playingSlot === "A" ? "■ STOP A" : "▶ PLAY A"}
          </button>
          <button onClick={() => playingSlot === "B" ? stop() : playSlot("B")} style={{
            background: playingSlot === "B" ? "#b04a5a" : "#4a7ab0",
            border: "none", color: "#0d0f12", borderRadius: 5,
            padding: "8px 18px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {playingSlot === "B" ? "■ STOP B" : "▶ PLAY B"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <SonarSlot
            label="A" html={htmlA} onHtmlChange={setHtmlA}
            descriptor={descA} musicalDesc={musicalA}
            player={playerRef.current}
            isPlaying={playingSlot === "A"} stepData={playingSlot === "A" ? stepData : null}
          />
          <SonarSlot
            label="B" html={htmlB} onHtmlChange={setHtmlB}
            descriptor={descB} musicalDesc={musicalB}
            player={playerRef.current}
            isPlaying={playingSlot === "B"} stepData={playingSlot === "B" ? stepData : null}
          />
        </div>

        <div style={{
          marginTop: 24, padding: "12px 16px", background: "#15171c",
          borderRadius: 6, fontSize: 10, color: "#4a4740", lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: "#6b6860" }}>How design maps to sound:</div>
          <div>whitespace → rests · color count → scale complexity · color temperature → key</div>
          <div>font size/weight → pitch · grid structure → meter · element density → tempo</div>
          <div>structural depth → octave · visual weight → volume · repeated patterns → motifs</div>
        </div>
      </div>
    </div>
  );
}
