import React, { useEffect, useState } from "react";
import PodcastPlayer from "../components/PodcastPlayer";

const BASE = import.meta.env.BASE_URL || "/";

export default function Podcasts() {
  const [demoTranscript, setDemoTranscript] = useState([]);

  useEffect(() => {
    fetch(`${BASE}podcasts/demo-transcript.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setDemoTranscript(
        data.map((line) => ({ time: line.start || line.time, speaker: line.speaker, text: line.text }))
      ))
      .catch(() => {
        setDemoTranscript([
          { time: "00:00", speaker: "Host", text: "Welcome to our demo episode." },
          { time: "00:05", speaker: "Host", text: "We are testing transcript sync." },
        ]);
      });
  }, []);

  return (
    <section>
      <h1>Podcasts</h1>
      <PodcastPlayer
        src={`${BASE}podcasts/demo.mp3`}
        title="Working It — Feedback (extract)"
        transcript={demoTranscript}
      />
    </section>
  );
}