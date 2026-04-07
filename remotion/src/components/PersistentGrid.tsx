import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const PersistentGrid = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 600], [0, -60]);

  return (
    <AbsoluteFill style={{ opacity: 0.06 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.4) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          transform: `translateY(${drift}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
