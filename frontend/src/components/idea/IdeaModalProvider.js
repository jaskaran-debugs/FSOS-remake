import React, { createContext, useContext, useState, useCallback } from "react";
import IdeaCard from "./IdeaCard";
import CreateIdeaDialog from "./CreateIdeaDialog";

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [openIdeaId, setOpenIdeaId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStream, setCreateStream] = useState("BO");
  const [streamFilter, setStreamFilter] = useState("All");

  const openIdea = useCallback((id) => setOpenIdeaId(id), []);
  const closeIdea = useCallback(() => setOpenIdeaId(null), []);
  const openCreate = useCallback((stream = "BO") => { setCreateStream(stream); setCreateOpen(true); }, []);

  return (
    <UIContext.Provider value={{ openIdea, closeIdea, openIdeaId, openCreate, streamFilter, setStreamFilter }}>
      {children}
      <IdeaCard ideaId={openIdeaId} onClose={closeIdea} onOpenIdea={openIdea} />
      <CreateIdeaDialog open={createOpen} onOpenChange={setCreateOpen} stream={createStream} onCreated={(id) => { setCreateOpen(false); setOpenIdeaId(id); }} />
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
