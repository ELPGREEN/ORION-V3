import { Globe, Shield, Heart, Leaf, Factory, Award, Building2, Phone, Cpu, Zap } from "lucide-react";

export const getGalleryImages = (t?: any) => [
  { src: "/placeholder.svg", alt: "ELP Factory", caption: "Smart Robotic Line", title: "Smart Robotic Line" },
  { src: "/placeholder.svg", alt: "OTR Tires", caption: "OTR Processing", title: "OTR Processing" },
  { src: "/placeholder.svg", alt: "Mining Site", caption: "Mining Operations", title: "Mining Operations" },
];

export const getCertificates = (t?: any) => [
  { name: "ISO 14001", issuer: "Bureau Veritas", year: "2024", file: "/certs/iso14001.pdf", description: "Environmental Management System" },
  { name: "B-Corp", issuer: "B Lab", year: "2024", file: "/certs/bcorp.pdf", description: "B Corporation Certification" },
];

export const values = [
  { key: "sustainability", title: "Sustainability", description: "Environmental responsibility in every operation", color: "emerald", icon: Leaf },
  { key: "innovation", title: "Innovation", description: "Cutting-edge robotic technology", color: "blue", icon: Cpu },
  { key: "partnership", title: "Partnership", description: "Zero-investment model for mining companies", color: "amber", icon: Shield },
];

export const getLeadershipTeam = (t?: any) => [
  { name: "Ericson Piccoli", role: "CEO & Founder", image: "/placeholder.svg", location: "Valenza, Italy", bio: "Founder with 20+ years in recycling technology and sustainable innovation.", linkedin: "https://linkedin.com/in/ericsonpiccoli", email: "ericson@elpgreen.com", phone: "+39 350 102 1359" },
];

export const getHeadquarters = (t?: any) => [
  { city: "Valenza", country: "Italy", role: "Global HQ", color: "primary", icon: Building2, description: "European headquarters, R&D and innovation center", phone: "+39 350 102 1359" },
  { city: "Porto Alegre", country: "Brazil", role: "LATAM HQ", color: "primary", icon: Building2, description: "Latin America operations and business development", phone: "+55 51 99999-0000" },
];

export const getTrademarks = (t?: any) => [
  { name: "Smart Robotic Line", registration: "EU-2024-001", class: "Class 7 - Machinery", description: "Robotic tire recycling system", process: "PCT/EP2024/001", details: "International patent pending for automated OTR tire processing" },
  { name: "ELP Green Technology", registration: "EU-2024-002", class: "Class 40 - Treatment of Materials", description: "Sustainable technology brand", process: "PCT/EP2024/002", details: "Registered trademark across EU and LATAM" },
];

export const topsPartnershipImg = "/placeholder.svg";
export const factoryVisitImg = "/placeholder.svg";

export default { getGalleryImages, getCertificates, values, getLeadershipTeam, getHeadquarters, getTrademarks, topsPartnershipImg, factoryVisitImg };
