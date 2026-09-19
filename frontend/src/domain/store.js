import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { buildSeed } from "./seed";
import { nowIso, addDays } from "./dates";

const KEY = "fsos_db_v1";
const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.meta && parsed.meta.version === 2) return parsed;
    }
  } catch (e) { /* ignore */ }
  const seed = buildSeed();
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [db, setDb] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
  }, [db]);

  // generic patch helper
  const update = useCallback((fn) => setDb((prev) => fn(structuredClone(prev))), []);

  const actingUser = db.users.find((u) => u.id === db.actingUserId) || db.users[0];
  const today = db.meta.anchor;

  const logActivity = (d, ideaId, type, text) =>
    d.activity.push({ id: uid("act"), ideaId, type, text, actorId: d.actingUserId, at: nowIso() });

  const actions = {
    resetDemo() {
      localStorage.removeItem(KEY);
      const seed = buildSeed();
      localStorage.setItem(KEY, JSON.stringify(seed));
      setDb(seed);
    },
    setActingUser(id) { update((d) => { d.actingUserId = id; return d; }); },

    addIdea(payload) {
      const newId = `idea-live-${uid("i")}`;
      update((d) => {
        const n = d.ideas.length + d.publications.length + 1;
        const id = newId;
        const idea = {
          id, code: `${payload.stream}-N${n}`, stream: payload.stream, title: payload.title,
          topic: (payload.title || "").split(" ").slice(0, 4).join(" ").toLowerCase(),
          format: payload.format, category: payload.category, creatorId: d.actingUserId,
          createdAt: nowIso(), sources: payload.sources || [], brief: payload.brief || {},
          destinations: payload.destinations || [], approval: { state: "pending", by: null, at: null },
          productionOwnerId: null, reviewerId: null, batchId: payload.batchId || null,
          deadline: null, bypassUsed: null, dropped: [],
        };
        d.ideas.push(idea);
        (payload.destinations || []).forEach((ipId) => {
          d.versions.push({ id: uid("ver"), ideaId: id, ipId, hookOverride: "", caption: payload.brief?.defaultCaption || "", notesOverride: "", assetLinks: [], reviewStatus: "not_started", revisions: [] });
        });
        logActivity(d, id, "created", `Idea created by ${actingUser.name}`);
        return d;
      });
      return newId;
    },

    updateIdea(ideaId, patch) {
      update((d) => {
        const idea = d.ideas.find((i) => i.id === ideaId);
        if (idea) Object.assign(idea, patch);
        return d;
      });
    },

    setDestinations(ideaId, ipIds) {
      update((d) => {
        const idea = d.ideas.find((i) => i.id === ideaId);
        if (!idea) return d;
        const existing = d.versions.filter((v) => v.ideaId === ideaId);
        // add new
        ipIds.forEach((ipId) => {
          if (!existing.some((v) => v.ipId === ipId)) {
            d.versions.push({ id: uid("ver"), ideaId, ipId, hookOverride: "", caption: "", notesOverride: "", assetLinks: [], reviewStatus: "not_started", revisions: [] });
            logActivity(d, ideaId, "destination_added", `Destination added: ${d.ips.find((i) => i.id === ipId)?.code}`);
          }
        });
        idea.destinations = ipIds;
        return d;
      });
    },

    approveIdea(ideaId) {
      update((d) => {
        const idea = d.ideas.find((i) => i.id === ideaId);
        if (idea) { idea.approval = { state: "approved", by: d.actingUserId, at: nowIso() }; logActivity(d, ideaId, "approved", `Idea approved by ${actingUser.name}`); }
        return d;
      });
    },

    approveBatch(batchId, ideaIds) {
      update((d) => {
        const batch = d.batches.find((b) => b.id === batchId);
        (ideaIds || batch?.ideaIds || []).forEach((id) => {
          const idea = d.ideas.find((i) => i.id === id);
          if (idea && idea.approval.state !== "approved") { idea.approval = { state: "approved", by: d.actingUserId, at: nowIso() }; logActivity(d, id, "approved", `Approved in batch by ${actingUser.name}`); }
        });
        return d;
      });
    },

    assignProduction(ideaIds, ownerId, deadline, reviewerId) {
      update((d) => {
        ideaIds.forEach((id) => {
          const idea = d.ideas.find((i) => i.id === id);
          if (!idea) return;
          if (idea.productionOwnerId && idea.productionOwnerId !== ownerId) {
            idea.previousOwners = idea.previousOwners || [];
            idea.previousOwners.push({ ownerId: idea.productionOwnerId, until: nowIso() });
          }
          idea.productionOwnerId = ownerId;
          if (deadline) idea.deadline = deadline;
          if (reviewerId) idea.reviewerId = reviewerId;
          d.versions.filter((v) => v.ideaId === id && v.reviewStatus === "not_started").forEach((v) => (v.reviewStatus = "in_production"));
          logActivity(d, id, "assigned", `Assigned to ${d.users.find((u) => u.id === ownerId)?.name}${deadline ? ", due " + deadline : ""}`);
        });
        return d;
      });
    },

    updateVersion(versionId, patch) {
      update((d) => { const v = d.versions.find((x) => x.id === versionId); if (v) Object.assign(v, patch); return d; });
    },

    addVersionLink(versionId, link) {
      update((d) => {
        const v = d.versions.find((x) => x.id === versionId);
        if (v) {
          v.assetLinks.push({ id: uid("lnk"), ...link });
          if (v.reviewStatus === "not_started") v.reviewStatus = "in_production";
          logActivity(d, v.ideaId, "link_added", `${link.type} link added`);
        }
        return d;
      });
    },

    submitForReview(versionId) {
      update((d) => {
        const v = d.versions.find((x) => x.id === versionId);
        if (v) { v.reviewStatus = "awaiting_review"; logActivity(d, v.ideaId, "submitted", `Version submitted for review`); }
        return d;
      });
    },

    submitIdeaForReview(ideaId) {
      update((d) => {
        d.versions.filter((v) => v.ideaId === ideaId && (v.reviewStatus === "in_production" || v.reviewStatus === "changes_requested") && v.assetLinks.length).forEach((v) => (v.reviewStatus = "awaiting_review"));
        logActivity(d, ideaId, "submitted", `All ready versions submitted for review`);
        return d;
      });
    },

    requestReview(ideaId, reviewerId) {
      update((d) => {
        const idea = d.ideas.find((i) => i.id === ideaId);
        if (idea && reviewerId) idea.reviewerId = reviewerId;
        d.notifications.unshift({ id: uid("nt"), type: "review_request", text: `Review requested: ${idea?.title}`, ideaId, at: nowIso(), read: false });
        logActivity(d, ideaId, "review_requested", `Review requested from ${d.users.find((u) => u.id === reviewerId)?.name}`);
        return d;
      });
    },

    approveVersion(versionId) {
      update((d) => {
        const v = d.versions.find((x) => x.id === versionId);
        if (v) { v.reviewStatus = "ready"; logActivity(d, v.ideaId, "version_approved", `Version approved (Ready)`); }
        return d;
      });
    },

    requestChanges(versionId, note) {
      update((d) => {
        const v = d.versions.find((x) => x.id === versionId);
        if (v) {
          v.reviewStatus = "changes_requested";
          d.comments.push({ id: uid("cm"), ideaId: v.ideaId, versionId, anchor: { type: "asset" }, text: note || "Changes requested.", authorId: d.actingUserId, at: nowIso(), resolved: false, replies: [] });
          logActivity(d, v.ideaId, "changes_requested", `Changes requested`);
        }
        return d;
      });
    },

    replaceAsset(versionId, link) {
      update((d) => {
        const v = d.versions.find((x) => x.id === versionId);
        if (!v) return d;
        v.revisions.push({ id: uid("rev"), at: nowIso(), by: d.actingUserId, note: "Asset replaced — returned to review" });
        if (link) v.assetLinks.push({ id: uid("lnk"), ...link });
        // returning approved asset to review; unrelated versions untouched
        if (v.reviewStatus === "ready") v.reviewStatus = "awaiting_review";
        logActivity(d, v.ideaId, "asset_replaced", `Approved asset replaced → back to review`);
        return d;
      });
    },

    // --- comments ---
    addComment(ideaId, { versionId = null, anchor = { type: "general" }, text }) {
      update((d) => {
        d.comments.push({ id: uid("cm"), ideaId, versionId, anchor, text, authorId: d.actingUserId, at: nowIso(), resolved: false, replies: [] });
        return d;
      });
    },
    replyComment(commentId, text) {
      update((d) => {
        const c = d.comments.find((x) => x.id === commentId);
        if (c) c.replies.push({ id: uid("rp"), authorId: d.actingUserId, at: nowIso(), text });
        return d;
      });
    },
    resolveComment(commentId, resolved = true) {
      update((d) => { const c = d.comments.find((x) => x.id === commentId); if (c) c.resolved = resolved; return d; });
    },

    // --- placements ---
    placeVersion(versionId, date, time = null, opts = {}) {
      // compute conflict from current db (synchronously) before mutating
      const curV = db.versions.find((x) => x.id === versionId);
      let conflict = null;
      if (curV) {
        const sameDayNow = db.placements.filter((p) => p.state !== "cancelled" && p.date === date && db.versions.find((vv) => vv.id === p.versionId)?.ideaId === curV.ideaId && p.versionId !== versionId);
        if (sameDayNow.length && !opts.exception) conflict = "same_day_repetition";
      }
      if (conflict && !opts.force && !opts.exception) return conflict;
      update((d) => {
        const v = d.versions.find((x) => x.id === versionId);
        if (!v) return d;
        const idea = d.ideas.find((i) => i.id === v.ideaId);
        // prevent duplicate active placement of same version
        const dup = d.placements.find((p) => p.versionId === versionId && p.state !== "cancelled");
        if (dup) { dup.date = date; dup.time = time; dup.history.push({ at: nowIso(), by: d.actingUserId, action: `Moved to ${date}` }); }
        else d.placements.push({ id: uid("pl"), versionId, ipId: v.ipId, date, time, order: opts.order || 1, state: "pending", history: [{ at: nowIso(), by: d.actingUserId, action: "Placed" }], exceptionReason: opts.exception ? opts.reason || "Authorised exception" : null });
        logActivity(d, idea.id, "placed", `Placed on ${d.ips.find((i) => i.id === v.ipId)?.code} — ${date}`);
        return d;
      });
      return conflict;
    },

    bulkPlace(proposals) {
      // proposals: [{versionId, date, time}]
      update((d) => {
        proposals.forEach((p) => {
          const v = d.versions.find((x) => x.id === p.versionId);
          if (!v) return;
          const existing = d.placements.find((pl) => pl.versionId === p.versionId && pl.state !== "cancelled");
          if (existing) { existing.date = p.date; existing.time = p.time || null; existing.history.push({ at: nowIso(), by: d.actingUserId, action: `Bulk moved to ${p.date}` }); }
          else d.placements.push({ id: uid("pl"), versionId: p.versionId, ipId: v.ipId, date: p.date, time: p.time || null, order: 1, state: "pending", history: [{ at: nowIso(), by: d.actingUserId, action: "Bulk placed" }], exceptionReason: null });
        });
        return d;
      });
    },

    movePlacement(placementId, date) {
      update((d) => { const p = d.placements.find((x) => x.id === placementId); if (p) { p.history.push({ at: nowIso(), by: d.actingUserId, action: `Moved ${p.date} → ${date}` }); p.date = date; } return d; });
    },
    cancelPlacement(placementId, reason) {
      update((d) => { const p = d.placements.find((x) => x.id === placementId); if (p) { p.state = "cancelled"; p.exceptionReason = reason || p.exceptionReason; p.history.push({ at: nowIso(), by: d.actingUserId, action: `Cancelled: ${reason || ""}` }); } return d; });
    },
    unallocateVersion(versionId, reason) {
      update((d) => {
        d.placements.filter((p) => p.versionId === versionId && p.state !== "cancelled").forEach((p) => { p.state = "cancelled"; p.exceptionReason = reason || "Returned to unallocated"; p.history.push({ at: nowIso(), by: d.actingUserId, action: "Returned to bank" }); });
        return d;
      });
    },

    authorizeException(placementId, reason) {
      update((d) => {
        const p = d.placements.find((x) => x.id === placementId);
        if (p) {
          p.exceptionReason = reason || "Authorised exception";
          p.exceptionBy = d.actingUserId;
          p.exceptionAt = nowIso();
          p.history.push({ at: nowIso(), by: d.actingUserId, action: `Authorised same-day exception: ${reason || ""}` });
          const v = d.versions.find((x) => x.id === p.versionId);
          if (v) logActivity(d, v.ideaId, "exception", `Same-day repetition exception authorised by ${actingUser.name}`);
        }
        return d;
      });
    },

    // HPN takes a BO placement: place HPN, and reschedule OR return the BO version — never lose it
    replaceBOWithHPN({ boVersionId, hpnVersionId, ipId, date, boAction, newDate, reason }) {
      update((d) => {
        // place HPN version on the slot
        const hv = d.versions.find((x) => x.id === hpnVersionId);
        if (hv) {
          let hpl = d.placements.find((p) => p.versionId === hpnVersionId && p.state !== "cancelled");
          if (hpl) { hpl.date = date; hpl.ipId = ipId; hpl.history.push({ at: nowIso(), by: d.actingUserId, action: `Moved into displaced BO slot ${date}` }); }
          else d.placements.push({ id: uid("pl"), versionId: hpnVersionId, ipId, date, time: null, order: 1, state: "pending", history: [{ at: nowIso(), by: d.actingUserId, action: "Placed (HPN displacement)" }], exceptionReason: null });
          logActivity(d, hv.ideaId, "placed", `HPN placed into BO slot on ${date}`);
        }
        // handle displaced BO version
        const bpl = d.placements.find((p) => p.versionId === boVersionId && p.state !== "cancelled");
        const bv = d.versions.find((x) => x.id === boVersionId);
        if (bpl) {
          if (boAction === "reschedule" && newDate) {
            bpl.history.push({ at: nowIso(), by: d.actingUserId, action: `Displaced by HPN: rescheduled ${bpl.date} → ${newDate}` });
            bpl.date = newDate;
            if (bv) logActivity(d, bv.ideaId, "displaced", `Displaced by HPN — rescheduled to ${newDate}`);
          } else {
            bpl.state = "cancelled";
            bpl.exceptionReason = reason || "Displaced by HPN — returned to unallocated bank";
            bpl.history.push({ at: nowIso(), by: d.actingUserId, action: "Displaced by HPN → returned to bank (age & approval intact)" });
            if (bv) logActivity(d, bv.ideaId, "displaced", `Displaced by HPN — returned to unallocated bank`);
          }
        }
        return d;
      });
    },

    // --- publication ---
    confirmPublication(versionId, url, publishedAtIso) {
      const dupUrl = !!(url && db.publications.some((p) => p.url === url));
      update((d) => {
        const v = d.versions.find((x) => x.id === versionId);
        if (!v) return d;
        let pl = d.placements.find((p) => p.versionId === versionId && p.state !== "cancelled");
        if (pl) pl.state = "confirmed"; 
        const pub = { id: uid("pub"), versionIds: [versionId], ipIds: [v.ipId], url, publishedAt: publishedAtIso, placementIds: pl ? [pl.id] : [], isCollab: false };
        d.publications.push(pub);
        const dueAt = new Date(new Date(publishedAtIso).getTime() + 24 * 3600000).toISOString();
        d.snapshots.push({ id: uid("snap"), publicationId: pub.id, views: null, measuredAt: null, ageHours: null, recordedBy: null, dueAt });
        logActivity(d, v.ideaId, "published", `Published to ${d.ips.find((i) => i.id === v.ipId)?.code}`);
        return d;
      });
      return { dupUrl };
    },

    linkCollaboration(publicationId, versionId) {
      update((d) => {
        const pub = d.publications.find((p) => p.id === publicationId);
        const v = d.versions.find((x) => x.id === versionId);
        if (pub && v && !pub.versionIds.includes(versionId)) { pub.versionIds.push(versionId); pub.ipIds.push(v.ipId); pub.isCollab = true; logActivity(d, v.ideaId, "collab", `Linked as collaboration`); }
        return d;
      });
    },

    reportLivePending(versionId) {
      update((d) => {
        const pl = d.placements.find((p) => p.versionId === versionId && p.state !== "cancelled");
        if (pl) { pl.reportedPending = true; pl.history.push({ at: nowIso(), by: d.actingUserId, action: "Reported live, link pending" }); }
        return d;
      });
    },

    recordSnapshot(publicationId, views, measuredAtIso) {
      update((d) => {
        const snap = d.snapshots.find((s) => s.publicationId === publicationId);
        const pub = d.publications.find((p) => p.id === publicationId);
        const ageHours = pub ? Math.round((new Date(measuredAtIso).getTime() - new Date(pub.publishedAt).getTime()) / 3600000) : 24;
        if (snap) { snap.views = views === "" || views === null || views === undefined ? null : Number(views); snap.measuredAt = measuredAtIso; snap.ageHours = ageHours; snap.recordedBy = d.actingUserId; }
        return d;
      });
    },

    // --- HPN quick drawer: record owner, assets, review outcome in one go ---
    hpnQuickRecord(ideaId, { ownerId, links, reviewerId, outcome }) {
      update((d) => {
        const idea = d.ideas.find((i) => i.id === ideaId);
        if (!idea) return d;
        if (ownerId) idea.productionOwnerId = ownerId;
        if (reviewerId) idea.reviewerId = reviewerId;
        const vs = d.versions.filter((v) => v.ideaId === ideaId);
        vs.forEach((v) => {
          if (links) v.assetLinks.push({ id: uid("lnk"), type: "drive", url: "https://drive.google.com/DEMO", label: "HPN cut" });
          v.reviewStatus = outcome === "approved" ? "ready" : "changes_requested";
        });
        logActivity(d, ideaId, "hpn_record", `HPN outcome recorded by ${actingUser.name}: ${outcome}`);
        return d;
      });
    },

    // --- settings CRUD ---
    addIP(ip) { update((d) => { d.ips.push({ id: uid("ip"), active: true, floors: { posts: 0, reels: 0 }, ranges: {}, menu: [], boTarget: null, perfTarget: { reel: null, post: null, note: "" }, spacingMinutes: null, ...ip }); return d; }); },
    updateIP(id, patch) { update((d) => { const ip = d.ips.find((x) => x.id === id); if (ip) Object.assign(ip, patch); return d; }); },
    addUser(u) { update((d) => { d.users.push({ id: uid("u"), active: true, initials: (u.name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase(), color: "#57534E", skills: [], streams: [], roles: [], ...u }); return d; }); },
    updateUser(id, patch) { update((d) => { const u = d.users.find((x) => x.id === id); if (u) Object.assign(u, patch); return d; }); },
    addCategory(c) { update((d) => { d.categories.push({ id: uid("cat"), ...c }); return d; }); },
    updateSettings(patch) { update((d) => { Object.assign(d.settings, patch); return d; }); },
    updateBatch(id, patch) { update((d) => { const b = d.batches.find((x) => x.id === id); if (b) Object.assign(b, patch); return d; }); },

    markNotificationsRead() { update((d) => { d.notifications.forEach((n) => (n.read = true)); return d; }); },
  };

  return <DemoContext.Provider value={{ db, actions, actingUser, today }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
