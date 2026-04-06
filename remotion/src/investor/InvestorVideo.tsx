import React from "react";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { InvScene1Intro } from "./scenes/InvScene1Intro";
import { InvScene2Metrics } from "./scenes/InvScene2Metrics";
import { InvScene3Platform } from "./scenes/InvScene3Platform";
import { InvScene4Timeline } from "./scenes/InvScene4Timeline";
import { InvScene5CTA } from "./scenes/InvScene5CTA";

// Scene durations: 170 + 180 + 200 + 200 + 180 = 930
// 4 transitions × 25f overlap = 100
// Effective = 930 - 100 = 830 frames ≈ 27.7s at 30fps

export const InvestorVideo: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={170}>
        <InvScene1Intro />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-left" })}
        timing={linearTiming({ durationInFrames: 25 })}
      />

      <TransitionSeries.Sequence durationInFrames={180}>
        <InvScene2Metrics />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 25 })}
      />

      <TransitionSeries.Sequence durationInFrames={200}>
        <InvScene3Platform />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 25 })}
      />

      <TransitionSeries.Sequence durationInFrames={200}>
        <InvScene4Timeline />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
      />

      <TransitionSeries.Sequence durationInFrames={180}>
        <InvScene5CTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
