export type PermissionName = "notifications" | "geolocation" | "microphone" | "camera" | "bluetooth";

export type PermissionStatus = "granted" | "denied" | "prompt" | "unsupported";

export interface PermissionState {
  name: PermissionName;
  label: string;
  icon: string;
  status: PermissionStatus;
  description: string;
}

export async function checkPermission(name: PermissionName): Promise<PermissionStatus> {
  try {
    switch (name) {
      case "notifications":
        if (!("Notification" in window)) return "unsupported";
        return Notification.permission === "default" ? "prompt" : Notification.permission as PermissionStatus;

      case "geolocation":
        if (!navigator.geolocation) return "unsupported";
        try {
          const result = await navigator.permissions.query({ name: "geolocation" });
          return result.state as PermissionStatus;
        } catch { return "prompt"; }

      case "microphone":
        if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
        try {
          const result = await navigator.permissions.query({ name: "microphone" as any });
          return result.state as PermissionStatus;
        } catch { return "prompt"; }

      case "camera":
        if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
        try {
          const result = await navigator.permissions.query({ name: "camera" as any });
          return result.state as PermissionStatus;
        } catch { return "prompt"; }

      case "bluetooth":
        if (!(navigator as any).bluetooth) return "unsupported";
        return "prompt";

      default:
        return "unsupported";
    }
  } catch {
    return "unsupported";
  }
}

export async function requestPermission(name: PermissionName): Promise<PermissionStatus> {
  try {
    switch (name) {
      case "notifications": {
        if (!("Notification" in window)) return "unsupported";
        const result = await Notification.requestPermission();
        return result === "default" ? "prompt" : result as PermissionStatus;
      }
      case "geolocation": {
        if (!navigator.geolocation) return "unsupported";
        return new Promise(resolve => {
          navigator.geolocation.getCurrentPosition(
            () => resolve("granted"),
            (err) => resolve(err.code === 1 ? "denied" : "prompt"),
            { timeout: 5000 }
          );
        });
      }
      case "microphone": {
        if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
          return "granted";
        } catch { return "denied"; }
      }
      case "camera": {
        if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(t => t.stop());
          return "granted";
        } catch { return "denied"; }
      }
      case "bluetooth": {
        if (!(navigator as any).bluetooth) return "unsupported";
        try {
          await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true });
          return "granted";
        } catch { return "denied"; }
      }
      default:
        return "unsupported";
    }
  } catch {
    return "denied";
  }
}

export async function getAllPermissionStates(): Promise<PermissionState[]> {
  const permissions: Omit<PermissionState, "status">[] = [
    { name: "notifications", label: "Notificações", icon: "🔔", description: "Receba alertas e atualizações em tempo real" },
    { name: "geolocation", label: "Localização", icon: "📍", description: "Permite localizar dispositivos próximos" },
    { name: "microphone", label: "Microfone", icon: "🎤", description: "Comandos de voz e comunicação com Orion" },
    { name: "camera", label: "Câmera", icon: "📷", description: "Reconhecimento facial e visão neural" },
    { name: "bluetooth", label: "Bluetooth", icon: "📶", description: "Conecte dispositivos IoT e smart home" },
  ];

  return Promise.all(
    permissions.map(async (p) => ({
      ...p,
      status: await checkPermission(p.name),
    }))
  );
}

export async function requestAllPermissions(): Promise<PermissionState[]> {
  const permissions: PermissionName[] = ["notifications", "geolocation", "microphone", "camera", "bluetooth"];
  const results: PermissionState[] = [];
  const meta: Record<PermissionName, { label: string; icon: string; description: string }> = {
    notifications: { label: "Notificações", icon: "🔔", description: "Receba alertas em tempo real" },
    geolocation: { label: "Localização", icon: "📍", description: "Localizar dispositivos próximos" },
    microphone: { label: "Microfone", icon: "🎤", description: "Comandos de voz" },
    camera: { label: "Câmera", icon: "📷", description: "Visão neural" },
    bluetooth: { label: "Bluetooth", icon: "📶", description: "Dispositivos IoT" },
  };

  for (const name of permissions) {
    const status = await requestPermission(name);
    results.push({ name, ...meta[name], status });
  }

  return results;
}
