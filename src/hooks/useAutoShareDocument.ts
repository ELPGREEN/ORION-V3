import { supabase } from "@/integrations/supabase/client";

/**
 * Automatically shares a document with the client linked to its folder.
 * Call this after inserting/updating a document with a folder_id.
 */
export async function autoShareDocumentWithFolderClient(
  documentId: string,
  folderId: string | null,
  userId: string
): Promise<void> {
  if (!folderId || !documentId) return;

  try {
    // Check if folder is linked to a client
    const { data: folder } = await supabase
      .from("document_folders")
      .select("client_profile_id")
      .eq("id", folderId)
      .maybeSingle();

    if (!folder?.client_profile_id) return;

    // Get client's user_id from profile
    const { data: clientProfile } = await supabase
      .from("client_profiles")
      .select("user_id")
      .eq("id", folder.client_profile_id)
      .maybeSingle();

    if (!clientProfile?.user_id) return;

    // Check if already shared
    const { data: existing } = await supabase
      .from("shared_documents")
      .select("id")
      .eq("document_id", documentId)
      .eq("shared_with", clientProfile.user_id)
      .maybeSingle();

    if (existing) return; // Already shared

    // Share the document
    await supabase.from("shared_documents").insert({
      document_id: documentId,
      shared_by: userId,
      shared_with: clientProfile.user_id,
    });

    // Record in neural learning data
    try {
      await supabase.from("neural_learning_data").insert({
        user_id: userId,
        interaction_type: "document_shared",
        input_text: `Documento compartilhado automaticamente com cliente`,
        output_text: `Document ${documentId} compartilhado via pasta ${folderId} com cliente ${clientProfile.user_id}`,
        quality_score: 0.9,
        metadata: {
          document_id: documentId,
          folder_id: folderId,
          client_profile_id: folder.client_profile_id,
          shared_with_user_id: clientProfile.user_id,
          auto_shared: true,
        },
      });
    } catch (neuralErr) {
    }

  } catch (error) {
  }
}
