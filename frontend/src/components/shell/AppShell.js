import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import * as Icons from "lucide-react";
import { NAV } from "../../domain/constants";
import { useDemo } from "../../domain/store";
import { useUI } from "../idea/IdeaModalProvider";
import { searchIdeas } from "../../domain/selectors";
import { Avatar } from "../common/badges";
import { cn } from "../../lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../ui/alert-dialog";

function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-[#E6E1D8] bg-[#F5F2EC] flex flex-col" data-testid="sidebar">
      <div className="h-14 flex items-center gap-2 px-5 border-b border-[#E6E1D8]">
        <div className="h-7 w-7 rounded-md bg-stone-900 text-white grid place-items-center font-serif text-sm">F</div>
        <div className="leading-tight">
          <div className="font-serif text-base text-stone-900">FSOS</div>
          <div className="text-[10px] uppercase tracking-wider text-stone-500 font-mono">Frontseat OS</div>
        </div>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto fsos-scroll">
        {NAV.map((n) => {
          const Icon = Icons[n.icon] || Icons.Circle;
          return (
            <NavLink key={n.id} to={n.path} end={n.path === "/"} data-testid={`nav-${n.id}`}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive ? "bg-[#EFEBE4] text-stone-900 font-medium border-l-[3px] border-stone-800 pl-[9px]" : "text-stone-600 hover:bg-[#EFEBE4]/60 hover:text-stone-900"
              )}>
              <Icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[#E6E1D8]">
        <NavLink to="/help" data-testid="nav-help" className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-900 transition-colors">
          <Icons.HelpCircle className="h-3.5 w-3.5" /> Walkthrough & Help
        </NavLink>
      </div>
    </aside>
  );
}

function GlobalSearch() {
  const { db } = useDemo();
  const { openIdea } = useUI();
  const [q, setQ] = useState("");
  const results = searchIdeas(db, q);
  return (
    <div className="relative w-72">
      <Icons.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
      <Input data-testid="global-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search idea, ID, IP, batch…" className="pl-8 h-9 bg-white" />
      {q && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-stone-200 bg-white shadow-lg overflow-hidden">
          {results.map((r) => (
            <button key={r.id} data-testid={`search-result-${r.id}`} onClick={() => { openIdea(r.id); setQ(""); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50">
              <span className="font-mono text-[10px] text-stone-400">{r.code}</span>
              <span className="truncate text-stone-800">{r.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const { db, actions, actingUser } = useDemo();
  const { openCreate, streamFilter, setStreamFilter, openIdea } = useUI();
  const unread = db.notifications.filter((n) => !n.read).length;

  return (
    <header className="h-14 shrink-0 border-b border-[#E6E1D8] bg-white/90 backdrop-blur-md flex items-center gap-4 px-4 sticky top-0 z-40">
      <GlobalSearch />
      <div className="inline-flex rounded-md border border-stone-200 bg-stone-50 p-0.5">
        {["All", "BO", "HPN"].map((s) => (
          <button key={s} data-testid={`stream-toggle-${s}`} onClick={() => setStreamFilter(s)}
            className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", streamFilter === s ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-800")}>
            {s}
          </button>
        ))}
      </div>
      <div className="flex-1" />

      <Button size="sm" data-testid="create-idea-btn" onClick={() => openCreate()} className="h-9 bg-stone-900 hover:bg-stone-800">
        <Icons.Plus className="h-4 w-4 mr-1" /> Create Idea
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button data-testid="notifications-btn" className="relative rounded-md p-2 hover:bg-stone-100 transition-colors">
            <Icons.Bell className="h-4.5 w-4.5 text-stone-600" />
            {unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[#C0512F] text-[9px] text-white grid place-items-center">{unread}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">In-app notifications
            <button className="text-[11px] text-stone-500 hover:text-stone-900" onClick={() => actions.markNotificationsRead()}>Mark all read</button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {db.notifications.length === 0 && <div className="px-3 py-4 text-xs text-stone-500">No notifications.</div>}
          {db.notifications.slice(0, 8).map((n) => (
            <DropdownMenuItem key={n.id} onClick={() => n.ideaId && openIdea(n.ideaId)} className="flex flex-col items-start gap-0.5">
              <span className="text-xs text-stone-800">{n.text}</span>
              <span className="text-[10px] text-stone-400">{n.read ? "read" : "new"}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <RoleSwitcher />
    </header>
  );
}

function RoleSwitcher() {
  const { db, actions, actingUser } = useDemo();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button data-testid="role-switcher" className="flex items-center gap-2 rounded-md border border-stone-200 bg-white pl-1 pr-2 py-1 hover:border-stone-300 transition-colors">
          <Avatar user={actingUser} size={26} />
          <span className="text-left leading-tight">
            <span className="block text-xs font-medium text-stone-900">{actingUser.name}</span>
            <span className="block text-[10px] text-stone-500">{actingUser.roles[0]}</span>
          </span>
          <Icons.ChevronDown className="h-3.5 w-3.5 text-stone-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Demo — act as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {db.users.filter((u) => u.active).map((u) => (
          <DropdownMenuItem key={u.id} data-testid={`act-as-${u.id}`} onClick={() => actions.setActingUser(u.id)} className="gap-2">
            <Avatar user={u} size={24} />
            <span className="flex-1">
              <span className="block text-xs">{u.name}</span>
              <span className="block text-[10px] text-stone-500">{u.roles.join(", ")}</span>
            </span>
            {u.id === db.actingUserId && <Icons.Check className="h-3.5 w-3.5 text-emerald-600" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-stone-400">Role switching demonstrates workflows — not production authentication.</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppShell() {
  const { actions } = useDemo();
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF8F5]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto fsos-scroll" data-testid="main-content">
          <Outlet />
        </main>
      </div>
      <DemoClock onReset={actions.resetDemo} />
    </div>
  );
}

function DemoClock({ onReset }) {
  const { today } = useDemo();
  return (
    <div className="fixed bottom-3 right-3 z-30 flex items-center gap-2 rounded-full border border-stone-200 bg-white/90 backdrop-blur px-3 py-1.5 shadow-sm text-[11px] text-stone-600" data-testid="demo-clock">
      <Icons.Clock className="h-3.5 w-3.5 text-stone-400" />
      <span>Demo today (IST): <span className="font-mono text-stone-800">{today}</span></span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button data-testid="reset-demo-btn" className="ml-1 rounded-full p-1 hover:bg-stone-100"><Icons.RotateCcw className="h-3.5 w-3.5" /></button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
            <AlertDialogDescription>This clears all local edits, assignments, comments, placements and metrics, and regenerates fresh seed data with today's date.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="reset-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="reset-confirm" onClick={onReset} className="bg-[#C0512F] hover:bg-[#a8432593]">Reset demo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
