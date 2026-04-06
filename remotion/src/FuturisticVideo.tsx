import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { FScene1Intro } from "./scenes-futuristic/FScene1Intro";
import { FScene2Neural } from "./scenes-futuristic/FScene2Neural";
import { FScene3HUD } from "./scenes-futuristic/FScene3HUD";
import { FScene4Modules } from "./scenes-futuristic/FScene4Modules";
import { FScene5Closing } from "./scenes-futuristic/FScene5Closing";

export const FuturisticVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#050510" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={200}>
          <FScene1Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={190}>
          <FScene2Neural />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={200}>
          <FScene3HUD />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={200}>
          <FScene4Modules />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={190}>
          <FScene5Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
