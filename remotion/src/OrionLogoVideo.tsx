import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { LogoScene1Reveal } from "./scenes/LogoScene1Reveal";
import { LogoScene2Neural } from "./scenes/LogoScene2Neural";
import { LogoScene3Capabilities } from "./scenes/LogoScene3Capabilities";
import { LogoScene4Closing } from "./scenes/LogoScene4Closing";

// Total: 180+180+180+210 = 750 frames, minus 3*30 transitions = 660 effective
export const OrionLogoVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180}>
          <LogoScene1Reveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <LogoScene2Neural />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <LogoScene3Capabilities />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={210}>
          <LogoScene4Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
