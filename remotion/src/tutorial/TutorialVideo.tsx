import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { TutIntro } from "./scenes/TutIntro";
import { TutDashboard } from "./scenes/TutDashboard";
import { TutNeuralVision } from "./scenes/TutNeuralVision";
import { TutPipeline } from "./scenes/TutPipeline";
import { TutEditor } from "./scenes/TutEditor";
import { TutCRM } from "./scenes/TutCRM";
import { TutClosing } from "./scenes/TutClosing";

// Scene durations (raw, before transition overlap):
// Intro: 300, Dashboard: 480, NeuralVision: 480, Pipeline: 600,
// Editor: 600, CRM: 500, Closing: 500
// Total raw: 3460. 6 transitions × 30f = 180 overlap. Effective: 3280 → ~109s
// Composition registered at 3600f to have safe padding

export const TutorialVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={300}>
          <TutIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={480}>
          <TutDashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={480}>
          <TutNeuralVision />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={600}>
          <TutPipeline />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={600}>
          <TutEditor />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={500}>
          <TutCRM />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={500}>
          <TutClosing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
