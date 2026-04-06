import { useState, useRef } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfilePhotoUploadProps {
  currentUrl?: string | null;
  onUpload?: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

export function ProfilePhotoUpload({ currentUrl, onUpload, size = "md" }: ProfilePhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentUrl || "");
  const fileRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      setPhotoUrl(publicUrl);

      // Update profile table
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      onUpload?.(publicUrl);
      toast.success("Foto atualizada!");
    } catch (err: any) {
      console.error("[PhotoUpload]", err);
      toast.error("Erro ao enviar foto: " + (err.message || "tente novamente"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center`}>
          {photoUrl ? (
            <img src={photoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <User className="h-1/2 w-1/2 text-muted-foreground" />
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Enviando..." : "Alterar foto"}
      </Button>
    </div>
  );
}