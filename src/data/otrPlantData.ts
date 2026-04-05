import { Bot, Cpu, Zap, Settings, Factory, Truck } from "lucide-react";

export const getOtrMachines = (t?: any) => [
  {
    name: "Primary Cutter", description: "Initial tire segmentation", icon: Settings,
    src: "/placeholder.svg", title: "Primary Cutter", model: "ELP-PC-2000",
    examples: ["57'' OTR", "63'' OTR"],
    power: "200kW", capacity: "4/hr", dimensions: "6m x 4m x 3m",
    maxDiameter: "63''", bladeSize: "1200mm", bladeLife: "5000 hrs", process: "Hydraulic",
    features: ["Auto-feed", "Safety guards", "Remote monitoring"],
    link: "/solutions", image: "/placeholder.svg",
  },
  {
    name: "Robotic Arm System", description: "Automated material separation", icon: Bot,
    src: "/placeholder.svg", title: "Robotic Arm", model: "ELP-RA-3000",
    examples: ["Steel extraction", "Rubber granulation"],
    power: "150kW", capacity: "Continuous", dimensions: "3m reach",
    maxDiameter: "N/A", bladeSize: "N/A", bladeLife: "N/A", process: "6-axis robotic",
    features: ["AI vision", "Precision grip", "Self-calibrating"],
    link: "/solutions", image: "/placeholder.svg",
  },
  {
    name: "Granulation Unit", description: "Fine rubber processing", icon: Factory,
    src: "/placeholder.svg", title: "Granulation", model: "ELP-GU-1500",
    examples: ["Crumb rubber", "Powder"],
    power: "100kW", capacity: "2 tons/hr", dimensions: "4m x 3m x 2m",
    maxDiameter: "N/A", bladeSize: "800mm", bladeLife: "3000 hrs", process: "Mechanical",
    features: ["Multi-size output", "Dust collection", "Auto-sorting"],
    link: "/solutions", image: "/placeholder.svg",
  },
];

export const getOtrApplications = (t?: any) => [
  { name: "Mining Haul Trucks", description: "CAT 797F, Komatsu 980E", icon: Truck, examples: ["Open pit", "Underground"] },
  { name: "Wheel Loaders", description: "CAT 994K, L-2350", icon: Settings, examples: ["Loading", "Material handling"] },
];

export const getEquipmentSpecs = (t?: any) => [
  { label: "Power", value: "500kW", name: "Power Supply", model: "ELP-PS", power: "500kW", capacity: "Continuous", dimensions: "2m x 1m", maxDiameter: "N/A", bladeSize: "N/A", bladeLife: "N/A", process: "Electrical", features: ["Redundant", "Eco-mode"], link: "/solutions", image: "/placeholder.svg" },
  { label: "Throughput", value: "4 tires/hour", name: "Main Line", model: "ELP-ML", power: "500kW", capacity: "4/hr", dimensions: "20m x 8m", maxDiameter: "63''", bladeSize: "1200mm", bladeLife: "5000 hrs", process: "Robotic", features: ["Full auto"], link: "/solutions", image: "/placeholder.svg" },
  { label: "Automation", value: "100%", name: "Control System", model: "ELP-CS", power: "5kW", capacity: "N/A", dimensions: "1m x 0.5m", maxDiameter: "N/A", bladeSize: "N/A", bladeLife: "N/A", process: "Digital", features: ["AI", "IoT"], link: "/solutions", image: "/placeholder.svg" },
  { label: "Recovery", value: "99.8%", name: "Recovery Rate", model: "N/A", power: "N/A", capacity: "N/A", dimensions: "N/A", maxDiameter: "N/A", bladeSize: "N/A", bladeLife: "N/A", process: "N/A", features: ["Verified"], link: "/solutions", image: "/placeholder.svg" },
];

export const getOutputProducts = (t?: any) => [
  { name: "Rubber Granulate", percentage: 65, color: "hsl(var(--primary))", price: "€800/ton", applications: ["Sports surfaces", "Road asphalt", "Industrial products"] },
  { name: "Steel Wire", percentage: 25, color: "hsl(var(--muted-foreground))", price: "€400/ton", applications: ["Steel mills", "Construction"] },
  { name: "Textile Fiber", percentage: 10, color: "hsl(var(--accent))", price: "€200/ton", applications: ["Insulation", "Composite materials"] },
];

export const getKeySpecs = (t?: any) => [
  { label: "Capacity", value: "4 tires/hr" },
  { label: "Size Range", value: "57-63''" },
  { label: "Recovery Rate", value: "99.8%" },
];

export const otrTirePartnershipImg = "/placeholder.svg";

export default { getOtrMachines, getOtrApplications, getEquipmentSpecs, getOutputProducts, getKeySpecs, otrTirePartnershipImg };
