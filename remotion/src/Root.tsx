import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { OrionLogoVideo } from "./OrionLogoVideo";
import { TutorialVideo } from "./tutorial/TutorialVideo";
import { PromoVideo } from "./promo/PromoVideo";
import { InvestorVideo } from "./investor/InvestorVideo";
import { FuturisticVideo } from "./FuturisticVideo";

export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={1050}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="orion-logo"
      component={OrionLogoVideo}
      durationInFrames={660}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="orion-tutorial"
      component={TutorialVideo}
      durationInFrames={3280}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="orion-promo"
      component={PromoVideo}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="orion-investor"
      component={InvestorVideo}
      durationInFrames={830}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="orion-futuristic"
      component={FuturisticVideo}
      durationInFrames={890}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
