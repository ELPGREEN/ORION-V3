import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { PromoNascimento } from "./scenes/PromoNascimento";
import { PromoIntegracao } from "./scenes/PromoIntegracao";
import { PromoExpansao } from "./scenes/PromoExpansao";
import { PromoCompanheiro } from "./scenes/PromoCompanheiro";
import { PromoClosing } from "./scenes/PromoClosing";

// 5 scenes: 300 + 360 + 360 + 420 + 360 = 1800
// 4 transitions × 30f overlap = 120f
// Effective = 1800 + 120 = 1920 composition frames
// But we want ~1800 effective → adjust scene durations
// 300 + 360 + 360 + 420 + 360 = 1800, minus 4×30 = 120 overlap = 1680 effective
// Need 1800 effective → 1800 + 120 = 1920 total scene frames
// Adjust: 320 + 380 + 380 + 440 + 400 = 1920

export const PromoVideo: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={320}>
        <PromoNascimento />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-left" })}
        timing={linearTiming({ durationInFrames: 30 })}
      />

      <TransitionSeries.Sequence durationInFrames={380}>
        <PromoIntegracao />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 30 })}
      />

      <TransitionSeries.Sequence durationInFrames={380}>
        <PromoExpansao />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 30 })}
      />

      <TransitionSeries.Sequence durationInFrames={440}>
        <PromoCompanheiro />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 30 })}
      />

      <TransitionSeries.Sequence durationInFrames={400}>
        <PromoClosing />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
