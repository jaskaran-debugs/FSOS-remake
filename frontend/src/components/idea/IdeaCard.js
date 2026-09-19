import React, { useState, useMemo } from "react";
import * as Icons from "lucide-react";
import { useDemo } from "../../domain/store";
import { versionsOf, ideaById, ipById, userById, ideaDerivedState, ideaProgress, activePlacementOf, publicationOf, snapshotOf, targetFor, classify } from "../../domain/selectors";
import { StreamBadge, StatusBadge, FormatBadge, IPBadge, VersionBadge, PerfBadge, Avatar } from "../common/badges";
import { nowIso, istDateTimeLabel, fmtDate } from "../../domain/dates";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

function canApprove(user, stream, settings) {
  if (user.roles.includes("Founder/Admin")) return true;
  if (stream === "BO") return user.id === settings.approverBoId || user.id === settings.shortFormLeadId;
  return user.id === settings.shortFormLeadId || user.roles.includes("Short-form Lead");
}

export default function IdeaCard({ ideaId, onClose, onOpenIdea }) {
  const { db, actions, actingUser } = useDemo();
  const idea = ideaId ? ideaById(db, ideaId) : null;
  const [tab, setTab] = useState("brief");
  const [highlightAnchor, setHighlightAnchor] = useState(null);

  if (!idea) return null;
  const versions = versionsOf(db, idea.id);
  const state = ideaDerivedState(db, idea);
  const progress = ideaProgress(db, idea);
  const owner = userById(db, idea.productionOwnerId);
  const reviewer = userById(db, idea.reviewerId);
  const creator = userById(db, idea.creatorId);
  const batch = db.batches.find((b) => b.id === idea.batchId);
  const comments = db.comments.filter((c) => c.ideaId === idea.id);

  const jumpTo = (anchor) => { setHighlightAnchor(anchor); if (anchor?.type === "slide") setTab("brief"); else if (anchor?.type === "asset" || anchor?.versionId) setTab("versions"); };

  return (
    <Dialog open={!!ideaId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col" data-testid="idea-card-modal">
        <DialogTitle className="sr-only">{idea.title}</DialogTitle>
        {/* Header */}
        <div className="border-b border-stone-200 px-6 py-4 bg-[#FAF8F5]">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] text-stone-400">{idea.code}</span>
                <StreamBadge stream={idea.stream} />
                <FormatBadge format={idea.format} />
                <StatusBadge state={state} />
                {idea.bypassUsed && <span className="inline-flex items-center gap-1 rounded-md border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-800"><Icons.Zap className="h-3 w-3" /> Pre-approval bypass</span>}
              </div>
              <h2 className="font-serif text-2xl text-stone-900 leading-snug pr-8">{idea.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1"><Icons.Tag className="h-3 w-3" /> {idea.category}</span>
                <span className="inline-flex items-center gap-1"><Icons.User className="h-3 w-3" /> Added by {creator?.name}</span>
                <span className="inline-flex items-center gap-1"><Icons.Clock className="h-3 w-3" /> {istDateTimeLabel(idea.createdAt)}</span>
                {batch && <span className="inline-flex items-center gap-1"><Icons.Layers className="h-3 w-3" /> {batch.name}</span>}
              </div>
            </div>
            <button onClick={onClose} data-testid="idea-card-close" className="rounded-md p-1.5 hover:bg-stone-200 transition-colors"><Icons.X className="h-4 w-4" /></button>
          </div>

          {/* destinations + progress + approve */}
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-stone-500 mr-1">Destinations:</span>
              {idea.destinations.map((ipId) => <IPBadge key={ipId} ip={ipById(db, ipId)} />)}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-stone-500">{progress.ready}/{progress.total} ready · {progress.published} live</span>
              {idea.approval.state === "pending" && !idea.bypassUsed && canApprove(actingUser, idea.stream, db.settings) && (
                <Button size="sm" data-testid="approve-idea-btn" onClick={() => { actions.approveIdea(idea.id); toast.success("Idea approved"); }} className="h-8 bg-emerald-700 hover:bg-emerald-800">
                  <Icons.Check className="h-4 w-4 mr-1" /> Approve idea
                </Button>
              )}
              {idea.approval.state === "approved" && <span className="text-[11px] text-emerald-700 inline-flex items-center gap-1"><Icons.CheckCircle2 className="h-3.5 w-3.5" /> Approved by {userById(db, idea.approval.by)?.name}</span>}
            </div>
          </div>
        </div>

        {/* Body */}
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-stone-200 px-6 bg-white">
            <TabsList className="h-11 bg-transparent gap-1 p-0">
              {[["brief", "Brief"], ["versions", "Page Versions"], ["production", "Production & Review"], ["distribution", "Distribution"], ["performance", "Performance"], ["activity", "Activity"]].map(([v, l]) => (
                <TabsTrigger key={v} value={v} data-testid={`idea-tab-${v}`} className="data-[state=active]:bg-stone-100 data-[state=active]:shadow-none rounded-md px-3 text-sm">{l}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto fsos-scroll p-6 bg-[#FAF8F5]">
            <TabsContent value="brief" className="mt-0"><BriefTab idea={idea} highlight={highlightAnchor} /></TabsContent>
            <TabsContent value="versions" className="mt-0"><VersionsTab idea={idea} versions={versions} /></TabsContent>
            <TabsContent value="production" className="mt-0"><ProductionTab idea={idea} versions={versions} /></TabsContent>
            <TabsContent value="distribution" className="mt-0"><DistributionTab idea={idea} versions={versions} /></TabsContent>
            <TabsContent value="performance" className="mt-0"><PerformanceTab idea={idea} versions={versions} /></TabsContent>
            <TabsContent value="activity" className="mt-0"><ActivityTab idea={idea} comments={comments} onJump={jumpTo} /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, right }) {
  return (
    <div className="rounded-lg border border-[#E6E1D8] bg-white p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 font-mono">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function CommentAnchorBtn({ idea, anchor }) {
  const { actions, actingUser } = useDemo();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <>
      <button data-testid="add-anchor-comment" onClick={() => setOpen(!open)} className="text-stone-400 hover:text-[#C0512F] transition-colors"><Icons.MessageSquarePlus className="h-3.5 w-3.5" /></button>
      {open && (
        <div className="mt-2 flex gap-2">
          <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={`Comment on ${anchor.type}…`} className="h-8 text-xs" />
          <Button size="sm" className="h-8" onClick={() => { if (text.trim()) { actions.addComment(idea.id, { anchor, text }); toast.success("Comment added"); setText(""); setOpen(false); } }}>Post</Button>
        </div>
      )}
    </>
  );
}

function BriefTab({ idea, highlight }) {
  const { db, actions } = useDemo();
  const slides = idea.brief.slides || [];
  return (
    <div>
      <Section title="Shared hook / angle">
        <p className="text-sm text-stone-800 leading-relaxed">{idea.brief.sharedHook || "—"}</p>
      </Section>

      <Section title="Sources">
        <div className="space-y-2">
          {idea.sources.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <Icons.Link2 className="h-3.5 w-3.5 text-stone-400" />
              <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{s.label}</a>
              {(s.start || s.end) && <span className="font-mono text-[11px] text-stone-500">{s.start}–{s.end}</span>}
            </div>
          ))}
        </div>
      </Section>

      {idea.format === "Reel" && (
        <Section title="Reel direction">
          <div className="space-y-2 text-sm text-stone-800">
            <div><span className="text-stone-500">Editing:</span> {idea.brief.editingDirection}</div>
            <div className="flex items-center gap-2"><span className="text-stone-500">Music:</span> {idea.brief.musicNotes} {idea.brief.musicLink && <a className="text-blue-700 hover:underline" href={idea.brief.musicLink}>ref</a>}
              <CommentAnchorBtn idea={idea} anchor={{ type: "music" }} />
            </div>
          </div>
        </Section>
      )}

      {idea.format === "Carousel" && (
        <Section title={`Carousel slides (${slides.length})`} right={
          <Button size="sm" variant="outline" className="h-7 text-xs" data-testid="add-slide-btn" onClick={() => actions.updateIdea(idea.id, { brief: { ...idea.brief, slides: [...slides, { id: "sl-" + Math.random().toString(36).slice(2, 7), body: "" }] } })}><Icons.Plus className="h-3 w-3 mr-1" /> Add slide</Button>
        }>
          <div className="space-y-2">
            {slides.map((sl, idx) => (
              <div key={sl.id} className={cn("rounded-md border p-2", highlight?.type === "slide" && highlight?.slideId === sl.id ? "border-[#C0512F] bg-orange-50/40" : "border-stone-200")}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-stone-400 w-8">S{idx + 1}</span>
                  <Input value={sl.body} onChange={(e) => { const ns = slides.map((x) => x.id === sl.id ? { ...x, body: e.target.value } : x); actions.updateIdea(idea.id, { brief: { ...idea.brief, slides: ns } }); }} className="h-8 text-sm" />
                  <button title="Move up" disabled={idx === 0} onClick={() => { const ns = [...slides]; [ns[idx - 1], ns[idx]] = [ns[idx], ns[idx - 1]]; actions.updateIdea(idea.id, { brief: { ...idea.brief, slides: ns } }); }} className="text-stone-400 hover:text-stone-700 disabled:opacity-30"><Icons.ArrowUp className="h-3.5 w-3.5" /></button>
                  <button title="Remove" onClick={() => actions.updateIdea(idea.id, { brief: { ...idea.brief, slides: slides.filter((x) => x.id !== sl.id) } })} className="text-stone-400 hover:text-rose-600"><Icons.Trash2 className="h-3.5 w-3.5" /></button>
                  <CommentAnchorBtn idea={idea} anchor={{ type: "slide", slideId: sl.id }} />
                </div>
              </div>
            ))}
          </div>
          {idea.brief.visualHook && <p className="mt-3 text-xs text-stone-500"><span className="font-semibold">Visual hook:</span> {idea.brief.visualHook}</p>}
        </Section>
      )}

      {idea.format === "Static" && (
        <Section title="Static copy & visual">
          <p className="text-sm text-stone-800">{idea.brief.bodyCopy}</p>
          {idea.brief.visualHook && <p className="mt-2 text-xs text-stone-500"><span className="font-semibold">Visual hook:</span> {idea.brief.visualHook}</p>}
        </Section>
      )}
    </div>
  );
}

function VersionRow({ idea, v }) {
  const { db, actions, actingUser } = useDemo();
  const ip = ipById(db, v.ipId);
  const pub = publicationOf(db, v.id);
  const [linkType, setLinkType] = useState("canva");
  const isOwner = idea.productionOwnerId === actingUser.id;
  const canReview = actingUser.id === idea.reviewerId || actingUser.roles.includes("Founder/Admin") || actingUser.roles.includes("CS") || actingUser.roles.includes("Short-form Lead");

  return (
    <div className="rounded-lg border border-[#E6E1D8] bg-white p-4" data-testid={`version-row-${v.id}`}>
      <div className="flex items-center justify-between mb-2">
        <IPBadge ip={ip} showName />
        {pub ? <PerfBadge tier="unrated" className="hidden" /> : null}
        {pub ? <StatusBadge state="published" /> : <VersionBadge status={v.reviewStatus} />}
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-stone-400">Hook variation</label>
          <Input value={v.hookOverride} placeholder={idea.brief.sharedHook} onChange={(e) => updateVersion(actions, v.id, { hookOverride: e.target.value })} className="h-8 text-sm mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-stone-400">Caption</label>
          <Textarea value={v.caption} onChange={(e) => updateVersion(actions, v.id, { caption: e.target.value })} className="text-xs mt-0.5 min-h-[48px]" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-stone-400">Deliverable links</label>
          <div className="mt-1 space-y-1">
            {v.assetLinks.map((l) => (
              <div key={l.id} className="flex items-center gap-2 text-xs">
                <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", l.type === "canva" ? "bg-purple-100 text-purple-800" : "bg-sky-100 text-sky-800")}>{l.type}</span>
                <a href={l.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline truncate">{l.label || l.url}</a>
              </div>
            ))}
            {!v.assetLinks.length && <span className="text-[11px] text-stone-400">No links yet — placeholder Canva/Drive links only.</span>}
          </div>
          {!pub && (
            <div className="mt-2 flex items-center gap-2">
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="canva">Canva</SelectItem><SelectItem value="drive">Drive</SelectItem></SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7 text-xs" data-testid={`add-link-${v.id}`} onClick={() => { actions.addVersionLink(v.id, { type: linkType, url: linkType === "canva" ? "https://canva.com/design/DEMO" : "https://drive.google.com/DEMO", label: linkType === "canva" ? "Canva design" : "Edited cut" }); toast.success("Link added"); }}><Icons.Plus className="h-3 w-3 mr-1" /> Add {linkType} link</Button>
            </div>
          )}
        </div>
      </div>

      {/* actions */}
      {!pub && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
          {(v.reviewStatus === "in_production" || v.reviewStatus === "changes_requested") && v.assetLinks.length > 0 && (isOwner || actingUser.roles.some((r) => ["Designer", "Editor", "COA"].includes(r))) && (
            <Button size="sm" className="h-7 text-xs" data-testid={`submit-review-${v.id}`} onClick={() => { actions.submitForReview(v.id); toast.success("Submitted for review"); }}><Icons.Send className="h-3 w-3 mr-1" /> Submit for review</Button>
          )}
          {v.reviewStatus === "awaiting_review" && canReview && (
            <>
              <Button size="sm" className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800" data-testid={`approve-version-${v.id}`} onClick={() => { actions.approveVersion(v.id); toast.success("Version approved — Ready"); }}><Icons.Check className="h-3 w-3 mr-1" /> Approve</Button>
              <RequestChangesBtn versionId={v.id} />
            </>
          )}
          {v.reviewStatus === "ready" && (
            <ReplaceAssetBtn versionId={v.id} />
          )}
        </div>
      )}
    </div>
  );
}

function updateVersion(actions, versionId, patch) {
  actions.updateVersion(versionId, patch);
}

function RequestChangesBtn({ versionId }) {
  const { actions } = useDemo();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  if (!open) return <Button size="sm" variant="outline" className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50" data-testid={`request-changes-${versionId}`} onClick={() => setOpen(true)}><Icons.RotateCcw className="h-3 w-3 mr-1" /> Request changes</Button>;
  return (
    <div className="flex items-center gap-2 w-full">
      <Input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="What needs changing?" className="h-7 text-xs" />
      <Button size="sm" className="h-7 text-xs" onClick={() => { actions.requestChanges(versionId, note); toast("Changes requested"); setOpen(false); }}>Send</Button>
    </div>
  );
}

function ReplaceAssetBtn({ versionId }) {
  const { actions } = useDemo();
  return <Button size="sm" variant="outline" className="h-7 text-xs" data-testid={`replace-asset-${versionId}`} onClick={() => { actions.replaceAsset(versionId, { type: "drive", url: "https://drive.google.com/DEMO-v2", label: "Revised cut" }); toast("Asset replaced — returned to review"); }}><Icons.RefreshCw className="h-3 w-3 mr-1" /> Replace approved asset</Button>;
}

function VersionsTab({ idea, versions }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {versions.map((v) => <VersionRow key={v.id} idea={idea} v={v} />)}
      {!versions.length && <p className="text-sm text-stone-500">No page versions yet. Add destinations in Production & Review.</p>}
    </div>
  );
}

function ProductionTab({ idea, versions }) {
  const { db, actions, actingUser } = useDemo();
  const isCoa = actingUser.roles.includes("COA") || actingUser.roles.includes("Founder/Admin");
  const producers = db.users.filter((u) => u.active && u.roles.some((r) => ["Designer", "Editor"].includes(r)));
  const reviewers = db.users.filter((u) => u.active && u.roles.some((r) => ["CS", "Founder/Admin", "Short-form Lead"].includes(r)));
  const [owner, setOwner] = useState(idea.productionOwnerId || "");
  const [deadline, setDeadline] = useState(idea.deadline || "");
  const [reviewer, setReviewer] = useState(idea.reviewerId || "");

  return (
    <div>
      <Section title="Assignment (one owner per idea)">
        {idea.approval.state !== "approved" && !idea.bypassUsed && <p className="text-xs text-amber-700 mb-3 inline-flex items-center gap-1"><Icons.AlertTriangle className="h-3.5 w-3.5" /> Idea not yet approved — BO cannot bypass required approval.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-stone-400">Production owner</label>
            <Select value={owner} onValueChange={setOwner} disabled={!isCoa}>
              <SelectTrigger className="h-9 mt-1" data-testid="assign-owner-select"><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>{producers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.roles[0]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-stone-400">Deadline</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={!isCoa} className="h-9 mt-1" data-testid="assign-deadline" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-stone-400">Reviewer</label>
            <Select value={reviewer} onValueChange={setReviewer} disabled={!isCoa}>
              <SelectTrigger className="h-9 mt-1" data-testid="assign-reviewer-select"><SelectValue placeholder="Select reviewer" /></SelectTrigger>
              <SelectContent>{reviewers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.roles[0]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {isCoa && <Button size="sm" className="mt-3 h-8" data-testid="save-assignment-btn" onClick={() => { actions.assignProduction([idea.id], owner, deadline, reviewer); toast.success("Assignment saved — all versions keep one owner"); }}><Icons.Save className="h-3.5 w-3.5 mr-1" /> Save assignment</Button>}
        <div className="mt-3 text-xs text-stone-500 flex flex-wrap gap-4">
          {idea.productionOwnerId && <span>Owner: <b>{userById(db, idea.productionOwnerId)?.name}</b></span>}
          {idea.reviewerId && <span>Reviewer: <b>{userById(db, idea.reviewerId)?.name}</b></span>}
          {idea.deadline && <span>Due: <b>{fmtDate(idea.deadline)}</b></span>}
          {idea.previousOwners?.length ? <span className="text-stone-400">Prev owners retained: {idea.previousOwners.length}</span> : null}
        </div>
      </Section>

      <Section title="Review requests" right={
        <Button size="sm" variant="outline" className="h-7 text-xs" data-testid="request-review-btn" onClick={() => { actions.requestReview(idea.id, idea.reviewerId || reviewer); toast.success("Review requested (in-app)"); }}><Icons.Send className="h-3 w-3 mr-1" /> Request review from reviewer</Button>
      }>
        <p className="text-xs text-stone-500">COA sends an in-app review request to the assigned reviewer. Individual versions are approved separately in the Page Versions tab.</p>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {versions.map((v) => <VersionRow key={v.id} idea={idea} v={v} />)}
      </div>
    </div>
  );
}

function DistributionTab({ idea, versions }) {
  const { db, actions, actingUser } = useDemo();
  const isCoc = actingUser.roles.includes("COC") || actingUser.roles.includes("Founder/Admin");
  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">Placement is separate from production and approval. A version can be scheduled while still awaiting approval; moving it does not change its production state.</p>
      {versions.map((v) => {
        const ip = ipById(db, v.ipId);
        const pl = activePlacementOf(db, v.id);
        const pub = publicationOf(db, v.id);
        return (
          <div key={v.id} className="rounded-lg border border-[#E6E1D8] bg-white p-3 flex items-center gap-4 flex-wrap" data-testid={`dist-row-${v.id}`}>
            <IPBadge ip={ip} />
            {pub ? <StatusBadge state="published" /> : <VersionBadge status={v.reviewStatus} />}
            <div className="flex items-center gap-2 text-sm">
              <Icons.Calendar className="h-3.5 w-3.5 text-stone-400" />
              <Input type="date" value={pl?.date || ""} disabled={!isCoc || !!pub} onChange={(e) => { const c = actions.placeVersion(v.id, e.target.value); if (c === "same_day_repetition") toast.warning("Same idea already placed on another IP that date — needs authorised exception"); else toast.success("Placed"); }} className="h-8 w-40 text-sm" />
              {pl?.time && <span className="font-mono text-[11px] text-stone-500">{pl.time} IST</span>}
              {pl && <span className="text-[10px] rounded px-1.5 py-0.5 border border-stone-200 text-stone-500">{pl.state}</span>}
            </div>
            {pub && <a href={pub.url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1"><Icons.ExternalLink className="h-3 w-3" /> Live link</a>}
            {!pub && v.reviewStatus === "ready" && isCoc && pl && (
              <PublishBtn versionId={v.id} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PublishBtn({ versionId }) {
  const { actions } = useDemo();
  return <Button size="sm" className="h-7 text-xs ml-auto bg-stone-900" data-testid={`publish-${versionId}`} onClick={() => { const r = actions.confirmPublication(versionId, "https://instagram.com/reel/" + Math.random().toString(36).slice(2, 8), nowIso()); if (r.dupUrl) toast.warning("URL already used — consider collaboration linkage"); else toast.success("Publication confirmed — 24h capture task created"); }}><Icons.Upload className="h-3 w-3 mr-1" /> Confirm publication</Button>;
}

function PerformanceTab({ idea, versions }) {
  const { db } = useDemo();
  return (
    <div className="space-y-3">
      {versions.map((v) => {
        const ip = ipById(db, v.ipId);
        const pub = publicationOf(db, v.id);
        const snap = pub && snapshotOf(db, pub.id);
        const t = targetFor(db, v.ipId, idea.format);
        const tier = snap && snap.views != null ? classify(snap.views, t, db.settings.thresholds) : "unrated";
        return (
          <div key={v.id} className="rounded-lg border border-[#E6E1D8] bg-white p-3 flex items-center gap-4 flex-wrap">
            <IPBadge ip={ip} />
            {!pub && <span className="text-xs text-stone-400">Not published — remaining destination</span>}
            {pub && (
              <>
                <span className="text-xs text-stone-500">Published {istDateTimeLabel(pub.publishedAt)}</span>
                <span className="text-sm font-semibold text-stone-900">{snap?.views == null ? "— (missing)" : snap.views.toLocaleString() + " views"}</span>
                {snap?.ageHours && snap.ageHours !== 24 && <span className="text-[10px] text-amber-700">captured at {snap.ageHours}h</span>}
                <span className="text-[11px] text-stone-400">target {t ? t.toLocaleString() : "—"}</span>
                <PerfBadge tier={tier} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActivityTab({ idea, comments, onJump }) {
  const { db, actions } = useDemo();
  const events = db.activity.filter((a) => a.ideaId === idea.id).slice().reverse();
  const [reply, setReply] = useState({});
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title={`Comments (${comments.length})`}>
        {!comments.length && <p className="text-xs text-stone-400">No comments yet. Anchor comments to slides, music notes or assets from the Brief and Versions tabs.</p>}
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className={cn("rounded-md border p-2.5", c.resolved ? "border-stone-200 bg-stone-50 opacity-70" : "border-stone-200")} data-testid={`comment-${c.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar user={userById(db, c.authorId)} size={20} />
                  <span className="text-xs font-medium text-stone-800">{userById(db, c.authorId)?.name}</span>
                  <button onClick={() => onJump(c.anchor.versionId ? { ...c.anchor, versionId: c.versionId } : c.anchor)} className="text-[10px] rounded bg-stone-100 px-1.5 py-0.5 text-stone-500 hover:text-[#C0512F]">@{c.anchor?.type || "general"}</button>
                </div>
                <button onClick={() => actions.resolveComment(c.id, !c.resolved)} className="text-[10px] text-stone-400 hover:text-emerald-600">{c.resolved ? "Reopen" : "Resolve"}</button>
              </div>
              <p className="mt-1 text-sm text-stone-700">{c.text}</p>
              {c.replies.map((r) => (
                <div key={r.id} className="mt-2 ml-6 border-l-2 border-stone-200 pl-2">
                  <span className="text-[11px] font-medium text-stone-700">{userById(db, r.authorId)?.name}: </span>
                  <span className="text-[11px] text-stone-600">{r.text}</span>
                </div>
              ))}
              <div className="mt-2 flex gap-2">
                <Input value={reply[c.id] || ""} onChange={(e) => setReply({ ...reply, [c.id]: e.target.value })} placeholder="Reply…" className="h-7 text-xs" />
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { if (reply[c.id]?.trim()) { actions.replyComment(c.id, reply[c.id]); setReply({ ...reply, [c.id]: "" }); } }}>Reply</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3"><GeneralComment idea={idea} /></div>
      </Section>

      <Section title="Activity & history">
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-2 text-xs">
              <Icons.Dot className="h-4 w-4 text-stone-300 mt-0.5" />
              <div>
                <span className="text-stone-800">{e.text}</span>
                <span className="block text-[10px] text-stone-400">{istDateTimeLabel(e.at)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function GeneralComment({ idea }) {
  const { actions } = useDemo();
  const [text, setText] = useState("");
  return (
    <div className="flex gap-2">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a general comment…" className="h-8 text-sm" data-testid="general-comment-input" />
      <Button size="sm" className="h-8" onClick={() => { if (text.trim()) { actions.addComment(idea.id, { anchor: { type: "general" }, text }); setText(""); toast.success("Comment added"); } }}>Post</Button>
    </div>
  );
}
