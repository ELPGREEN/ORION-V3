import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

export interface CollaborationUser {
  name: string;
  color: string;
}

interface UseCollaborationOptions {
  documentId: string | null;
  user: CollaborationUser;
  enabled?: boolean;
}

export function useCollaboration({
  documentId,
  user,
  enabled = true,
}: UseCollaborationOptions) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const idbRef = useRef<IndexeddbPersistence | null>(null);
  const [connectedPeers] = useState(0);
  const [isConnected] = useState(false);

  const ydoc = useMemo(() => {
    if (!enabled || !documentId) return null;
    const doc = new Y.Doc();
    ydocRef.current = doc;
    return doc;
  }, [documentId, enabled]);

  useEffect(() => {
    if (!ydoc || !documentId || !enabled) return;

    const roomName = `lexai-doc-${documentId}`;
    const idb = new IndexeddbPersistence(roomName, ydoc);
    idbRef.current = idb;

    return () => {
      idb.destroy();
      idbRef.current = null;
    };
  }, [ydoc, documentId, enabled, user.name, user.color]);

  return {
    ydoc,
    provider: null,
    connectedPeers,
    isConnected,
  };
}
