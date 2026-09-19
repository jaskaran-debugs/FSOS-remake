import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { useDemo } from "../../domain/store";
import { FORMATS } from "../../domain/constants";
import { StreamBadge, IPBadge } from "../common/badges";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

export default function CreateIdeaDialog({ open, onOpenChange, stream, onCreated }) {
  const { db, actions } = useDemo();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("Reel");
  const [category, setCategory] = useState("");
  const [hook, setHook] = useState("");
  const [dests, setDests] = useState([]);
  const [srcUrl, setSrcUrl] = useState("");
  const [srcStart, setSrcStart] = useState("");
  const [srcEnd, setSrcEnd] = useState("");
  const [batchId, setBatchId] = useState("");
  const [slides, setSlides] = useState(["", "", ""]);

  useEffect(() => {
    if (open) { setTitle(""); setFormat("Reel"); setCategory(""); setHook(""); setDests([]); setSrcUrl(""); setSrcStart(""); setSrcEnd(""); setBatchId(""); setSlides(["", "", ""]); }
  }, [open, stream]);

  const cats = db.categories;
  const isVideoSource = format === "Reel";

  const toggle = (id) => setDests((d) => d.includes(id) ? d.filter((x) => x !== id) : [...d, id]);

  const submit = () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!dests.length) { toast.error("Select at least one destination IP"); return; }
    const brief = { sharedHook: hook };
    if (format === "Carousel") brief.slides = slides.filter((s) => s.trim() !== "").map((body) => ({ id: "sl-" + Math.random().toString(36).slice(2, 7), body }));
    if (format === "Reel") { brief.editingDirection = ""; brief.musicNotes = ""; }
    if (format === "Static") brief.bodyCopy = "";
    const sources = srcUrl ? [{ id: "src-" + Math.random().toString(36).slice(2, 7), url: srcUrl, label: "Source", start: isVideoSource ? srcStart : "", end: isVideoSource ? srcEnd : "" }] : [];
    const id = actions.addIdea({ stream, title, format, category: category || cats[0]?.name, brief, destinations: dests, sources, batchId: batchId || null });
    toast.success("Idea created — creator & timestamp captured automatically");
    onCreated(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="create-idea-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">Create idea <StreamBadge stream={stream} /></DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-auto fsos-scroll pr-1">
          <div>
            <label className="text-xs font-medium text-stone-600">Idea name</label>
            <Input data-testid="create-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How Zerodha built a ₹30,000 Cr business…" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-600">Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="mt-1" data-testid="create-format"><SelectValue /></SelectTrigger>
                <SelectContent>{FORMATS.map((f) => <SelectItem key={f} value={f}>{f}{f !== "Reel" ? " (Post)" : " (Reel)"}</SelectItem>)}</SelectContent>
              </Select>
              <p className="mt-1 text-[10px] text-stone-400">Carousel & Static count toward Posts. Reel counts toward Reels.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600">Editorial category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1" data-testid="create-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.name}>{c.name} · {c.stream}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Shared hook / angle</label>
            <Textarea data-testid="create-hook" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="One strong line that works across pages…" className="mt-1 min-h-[60px]" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Source link</label>
            <div className="mt-1 flex gap-2">
              <Input value={srcUrl} onChange={(e) => setSrcUrl(e.target.value)} placeholder="YouTube / article URL" className="flex-1" />
              {isVideoSource && <>
                <Input value={srcStart} onChange={(e) => setSrcStart(e.target.value)} placeholder="start" className="w-20" />
                <Input value={srcEnd} onChange={(e) => setSrcEnd(e.target.value)} placeholder="end" className="w-20" />
              </>}
            </div>
            {isVideoSource && <p className="mt-1 text-[10px] text-stone-400">Timestamps optional — only relevant for video/YouTube sources.</p>}
          </div>

          {format === "Carousel" && (
            <div>
              <label className="text-xs font-medium text-stone-600">Slides (add/remove/reorder later in the card)</label>
              <div className="mt-1 space-y-1.5">
                {slides.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-stone-400 w-6">S{i + 1}</span>
                    <Input value={s} onChange={(e) => setSlides(slides.map((x, idx) => idx === i ? e.target.value : x))} className="h-8 text-sm" />
                    <button onClick={() => setSlides(slides.filter((_, idx) => idx !== i))} className="text-stone-400 hover:text-rose-600"><Icons.X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSlides([...slides, ""])}><Icons.Plus className="h-3 w-3 mr-1" /> Add slide</Button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-stone-600">Intended IPs (multi-select) — one owner will produce all versions</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {db.ips.filter((i) => i.active).map((ip) => (
                <button key={ip.id} type="button" data-testid={`create-dest-${ip.id}`} onClick={() => toggle(ip.id)}
                  className={cn("rounded-md border px-2 py-1 transition-colors", dests.includes(ip.id) ? "border-stone-800 bg-stone-100" : "border-stone-200 hover:border-stone-400")}>
                  <IPBadge ip={ip} />
                </button>
              ))}
            </div>
          </div>

          {stream === "BO" && (
            <div>
              <label className="text-xs font-medium text-stone-600">Add to batch (optional)</label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No batch" /></SelectTrigger>
                <SelectContent>{db.batches.filter((b) => b.stream === "BO").map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-testid="create-submit" onClick={submit} className="bg-stone-900 hover:bg-stone-800">Create idea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
