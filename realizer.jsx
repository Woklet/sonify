// realizer.jsx — Layer 3: MusicalDescriptor → Tone.js playback

function createSonarPlayer(musicalDesc) {
  const md = musicalDesc;
  let playing = false;
  let stepCallback = null;
  let transport = null;
  let disposables = [];

  // Count audible notes
  const audibleNotes = md.notes.filter(n => !n.rest);

  // Split notes into melody and chord tracks
  const melodyNotes = [];
  const chordGroups = []; // { atMelodyIndex, midis[] }
  let pendingChordMidis = [];

  let lastWasRest = null; // hold rests until we know what follows
  for (const note of md.notes) {
    if (note.rest) {
      lastWasRest = note;
      continue;
    } else if (note.role === "chord") {
      // Discard rests before chords — chords play over melody, don't add silence
      lastWasRest = null;
      pendingChordMidis.push(note.midi);
    } else {
      // Flush held rest only before melody notes
      if (lastWasRest) {
        melodyNotes.push(lastWasRest);
        lastWasRest = null;
      }
      // Flush pending chords at this melody position
      if (pendingChordMidis.length > 0) {
        const melodyIndex = melodyNotes.filter(n => !n.rest).length;
        chordGroups.push({ atMelodyIndex: melodyIndex, midis: [...pendingChordMidis] });
        pendingChordMidis = [];
      }
      melodyNotes.push(note);
    }
  }
  if (pendingChordMidis.length > 0) {
    const melodyIndex = melodyNotes.filter(n => !n.rest).length;
    chordGroups.push({ atMelodyIndex: melodyIndex, midis: [...pendingChordMidis] });
  }

  // Build chord lookup
  const chordAt = {};
  for (const cg of chordGroups) {
    chordAt[cg.atMelodyIndex] = cg.midis;
  }

  function play() {
    if (playing) stop();

    const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).toDestination();
    disposables.push(reverb);

    // Melody synths by category
    const synths = {};

    synths.text = new Tone.PluckSynth({
      attackNoise: 1.2, dampening: 3000, resonance: 0.98, volume: -8,
    }).connect(reverb);
    disposables.push(synths.text);

    synths.media = new Tone.AMSynth({
      harmonicity: 2.5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.15, release: 0.5 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.3 },
      volume: -12,
    }).connect(reverb);
    disposables.push(synths.media);

    synths.interactive = new Tone.MembraneSynth({
      pitchDecay: 0.03, octaves: 4,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0.01, release: 0.3 },
      volume: -10,
    }).connect(reverb);
    disposables.push(synths.interactive);

    synths.meta = new Tone.FMSynth({
      modulationIndex: 8, harmonicity: 3.01,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.4 },
      modulation: { type: "triangle" },
      modulationEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.2 },
      volume: -16,
    }).connect(reverb);
    disposables.push(synths.meta);

    // Chord pad
    const chordSynth = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 6,
      modulationIndex: 1.5, harmonicity: 1,
      oscillator: { type: "sine" },
      envelope: { attack: 0.1, decay: 0.4, sustain: 0.5, release: 1.0 },
      modulation: { type: "triangle" },
      modulationEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.5 },
      volume: -22,
    }).connect(reverb);
    disposables.push(chordSynth);

    Tone.getTransport().bpm.value = md.tempo;

    // Schedule all melody notes with their actual durations
    let timeOffset = 0;
    let audibleIndex = 0;
    const events = [];

    for (const note of melodyNotes) {
      if (note.rest) {
        events.push({ time: timeOffset, type: "rest", duration: note.duration });
        timeOffset += Tone.Time(note.duration).toSeconds();
      } else {
        events.push({
          time: timeOffset,
          type: "note",
          midi: note.midi,
          duration: note.duration,
          velocity: note.velocity,
          category: note.category,
          tag: note.tag,
          audibleIndex,
          chordMidis: chordAt[audibleIndex] || null,
        });
        timeOffset += Tone.Time(note.duration).toSeconds();
        audibleIndex++;
      }
    }

    const part = new Tone.Part((time, event) => {
      if (event.type === "rest") return;

      // Chord
      if (event.chordMidis) {
        const freqs = event.chordMidis.map(m => Tone.Frequency(m, "midi").toFrequency());
        chordSynth.triggerAttackRelease(freqs, "2n", time, 0.5);
      }

      // Melody
      const synth = synths[event.category];
      if (synth) {
        const freq = Tone.Frequency(event.midi, "midi").toFrequency();
        if (synth instanceof Tone.PluckSynth) {
          synth.triggerAttack(freq, time);
        } else {
          synth.triggerAttackRelease(freq, event.duration, time, event.velocity);
        }
      }

      // Step callback for UI
      if (stepCallback) {
        Tone.getDraw().schedule(() => {
          stepCallback({
            index: event.audibleIndex,
            tag: event.tag,
            category: event.category,
            midi: event.midi,
            chordMidis: event.chordMidis,
          });
        }, time);
      }
    }, events.map(e => [e.time, e]));

    disposables.push(part);
    part.start(0);
    Tone.getTransport().start();
    playing = true;
  }

  function stop() {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    for (const d of disposables) {
      if (d.dispose) d.dispose();
    }
    disposables = [];
    playing = false;
  }

  return {
    play,
    stop,
    onStep(cb) { stepCallback = cb; },
    get noteCount() { return audibleNotes.length; },
    get isPlaying() { return playing; },
    get musicalDescriptor() { return md; },
  };
}
