export function HQMiniMap(props: any) {
  return (
    <div className="w-full h-48 bg-muted border border-border rounded-lg flex items-center justify-center">
      <p className="text-muted-foreground text-sm">{props.title || "HQ Location"}</p>
    </div>
  );
}
