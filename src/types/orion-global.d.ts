/**
 * ═══ Orion Global Type Extensions ═══
 * Declarações globais para extensões do window e tipos customizados
 */

import type { Database } from "@/integrations/supabase/types";

// ═══ Window Extensions ═══
declare global {
  interface Window {
    // Audio context
    webkitAudioContext: typeof AudioContext;
    
    // Persistent mic state
    __orion_persistent_mic__: {
      stream: MediaStream | null;
      granted: boolean;
      checking: boolean;
    };
    __orion_shared_audio_ctx__: AudioContext | null;
    __orionMicRec: React.RefObject<any> | null;
    
    // Identity
    __orionIdentityStatus: any;
    __orionUserName: string | null;
    __orionInputSource: "text" | "voice";
    
    // Cognitive mode
    __cognitiveMode: "fast" | "quality" | "extended";
    __cognitiveMaxTokens: number;
    __cognitiveReasoningInstructions: string;
    
    // Vision state
    __orionVisionServiceState: any;
    
    // Face detector
    FaceDetector: any;
    
    // Idle callback
    requestIdleCallback: (callback: IdleRequestCallback, options?: { timeout?: number }) => number;
  }
  
  // Navigator extensions
  interface Navigator {
    permissions?: {
      query: (options: { name: "microphone" | "camera" | "geolocation" }) => Promise<PermissionStatus>;
    };
  }
  
  // PermissionStatus
  interface PermissionStatus {
    state: "granted" | "denied" | "prompt";
  }
}

// ═══ Supabase Table Names ═══
declare global {
  type SupabaseTableName = 
    | "environmental_context"
    | "face_auth_enrollments"
    | "neural_agent_config"
    | "processos"
    | "orion_threat_log"
    | "neural_knowledge_base"
    | "neural_evolution_proposals"
    | "user_roles"
    | "profiles"
    | "documents"
    | "payments"
    | "sessions";
}

// ═══ Re-export for use ═══
export {};