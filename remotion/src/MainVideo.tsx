import { AbsoluteFill, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Hero } from "./scenes/Scene1Hero";
import { Scene2Architecture } from "./scenes/Scene2Architecture";
import { Scene3Features } from "./scenes/Scene3Features";
import { Scene4Innovation } from "./scenes/Scene4Innovation";
import { Scene5Product } from "./scenes/Scene5Product";
import { Scene6Closing } from "./scenes/Scene6Closing";

export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene1Hero />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={210}>
          <Scene2Architecture />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene3Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene4Innovation />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene5Product />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={180}>
          <Scene6Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
