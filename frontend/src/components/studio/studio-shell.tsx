"use client";

import { useState, useMemo, useEffect, useCallback, FormEvent } from "react";
import { Copy, Code2, FolderOpen, History, Wrench, Menu, PanelLeftClose, PanelLeftOpen, Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useProjects } from "@/hooks/use-projects";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { useGenerationVersions } from "@/hooks/use-generation-versions";
import { useGeneration } from "@/components/app/generation-provider";

import { DeviceKey } from "@/lib/constants/device-options";
import {
  fetchDesignSystems,
  designSystemBySlug,
  DEFAULT_DESIGN_SYSTEM,
  type DesignSystem,
} from "@/lib/generation/design-systems";
import {
  generationService,
  downloadProjectZip,
  GeneratedPage,
} from "@/lib/services/generation-service";

import { StudioHeader } from "./studio-header";
import { PromptExamples } from "./prompt-examples";
import { PromptInputBox } from "./prompt-input-box";
import { DeviceSwitcher } from "./device-switcher";
import { ScreensCanvas, type ScreenCard } from "./screens-canvas";
import { InterfaceTokenSync } from "@/components/app/interface-token-sync";
import { EmptyPreview } from "./empty-preview";
import { GenerationConfirmDialog } from "./generation-confirm-dialog";
import { ThemePickerSheet } from "./theme-picker-sheet";
import { CodeViewerDialog } from "./code-viewer-dialog";
import { ProjectFilesSheet } from "./project-files-sheet";
import { VersionHistoryPanel } from "./version-history-panel";
import { RefineSectionPanel } from "./refine-section-panel";
import { StudioBottomThemeBar } from "./studio-bottom-theme-bar";
import { renderPreview } from "@/lib/generation/preview-compiler";

export default function StudioShell({ routeProjectId }: { routeProjectId?: string }) {
  const { projects, createProject } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // The studio opens CLEAN (Stitch-like) for the generic "/app/studio/demo" entry.
  // BUT when navigated to a REAL project id (e.g. "Open studio" on a saved project),
  // adopt it so its saved pages load — otherwise the project looks empty/unsaved.
  useEffect(() => {
    if (
      !activeProjectId &&
      routeProjectId &&
      routeProjectId !== "demo" &&
      projects.some((p) => p.id === routeProjectId)
    ) {
      setActiveProjectId(routeProjectId);
    }
  }, [routeProjectId, projects, activeProjectId]);

  const currentProject =
    projects.find((p) => p.id === activeProjectId) ?? { id: "", name: "Untitled project" };

  const { balance, purchaseCredits } = useCreditBalance();
  const credits = balance?.available ?? 0;

  // Versions + refine still operate at the project level.
  const {
    versions,
    restoreVersion,
    refineSection,
  } = useGenerationVersions(currentProject.id);

  // Multi-page state.
  const [pages, setPages] = useState<GeneratedPage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Global background generation (persists across /app navigation).
  const { active, lastCompleted, start, clearLastCompleted } = useGeneration();

  // True while this project's generation is running in the background.
  const isGeneratingThisProject = !!active && active.projectId === currentProject.id;
  // Drives prompt-box / empty-state busy UI. We treat any active generation as busy.
  const isGenerating = !!active;

  // Form / preview state.
  const [prompt, setPrompt] = useState("");
  const [pageCount, setPageCount] = useState(1);
  // Auto = let the AI decide how many pages / which types fit the brief (Stitch-like).
  const [auto, setAuto] = useState(true);
  const [selectedThemeSlug, setSelectedThemeSlug] = useState("shadcn");

  // Design-system catalog (single source of truth, fetched from the backend).
  const [designSystems, setDesignSystems] = useState<DesignSystem[]>([DEFAULT_DESIGN_SYSTEM]);
  useEffect(() => {
    let cancelled = false;
    fetchDesignSystems().then((list) => {
      if (!cancelled && list.length) setDesignSystems(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [device, setDevice] = useState<DeviceKey>("desktop1440");
  const [activeCodePath, setActiveCodePath] = useState("app/page.tsx");
  const [copyState, setCopyState] = useState("Copy");

  // Dialog and Sheets Toggles
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isRefineOpen, setIsRefineOpen] = useState(false);
  const [boostPrompt, setBoostPrompt] = useState(true);

  const selectedTheme = designSystemBySlug(designSystems, selectedThemeSlug);
  const themeCost = selectedTheme.cost ?? 1;
  // NOTE: the design system styles the GENERATED output (preview canvas + exported
  // code) only — NOT the studio's own chrome, which stays neutral on purpose.

  const selectedPage = useMemo(
    () => pages.find((p) => p.slug === selectedSlug) ?? pages[0] ?? null,
    [pages, selectedSlug],
  );
  const files = selectedPage?.files ?? [];
  const hasFiles = files.length > 0;

  // Load existing project pages on project load / change.
  useEffect(() => {
    let cancelled = false;
    const projectId = currentProject.id;
    if (!projectId) {
      setPages([]);
      setSelectedSlug(null);
      return;
    }
    generationService
      .getProjectPages(projectId)
      .then((loaded) => {
        if (cancelled) return;
        setPages(loaded);
        const firstWithFiles = loaded.find((p) => p.files.length > 0) ?? loaded[0];
        setSelectedSlug(firstWithFiles?.slug ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setPages([]);
          setSelectedSlug(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentProject.id]);

  // Resolve a real project id, creating a project on the fly for first-time users.
  const ensureProjectId = useCallback(async (): Promise<string> => {
    if (currentProject.id) return currentProject.id;
    const created = await createProject({
      name: prompt.trim().slice(0, 60) || "My first dashboard",
      description: "",
      domain: "General",
      status: "draft",
      defaultThemeSlug: selectedThemeSlug,
    });
    setActiveProjectId(created.id);
    return created.id;
  }, [currentProject.id, createProject, prompt, selectedThemeSlug]);

  // Fire a background generation through the global provider. The provider
  // polls the batch, toasts on completion, and the overlay below is driven by
  // its `active` state — so generation keeps running across /app navigation.
  const runGeneration = useCallback(async () => {
    if (active) return;
    const projectId = await ensureProjectId();
    try {
      await start(projectId, prompt, selectedThemeSlug, pageCount, auto);
    } catch {
      // The current project may have been deleted elsewhere. Create a fresh one
      // and retry once so generation never silently fails on a stale project.
      try {
        const created = await createProject({
          name: prompt.trim().slice(0, 60) || "My dashboard",
          description: "",
          domain: "General",
          status: "draft",
          defaultThemeSlug: selectedThemeSlug,
        });
        setActiveProjectId(created.id);
        await start(created.id, prompt, selectedThemeSlug, pageCount, auto);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Generation failed. Please try again.");
      }
    }
  }, [active, ensureProjectId, createProject, prompt, selectedThemeSlug, pageCount, auto, start]);

  // Build the multi-screen canvas (Stitch-like): every page renders as its own
  // card. While a generation is running, completed pages stream in from the live
  // batch and any not-yet-finished page shows a "Generating screen…" placeholder,
  // so progress is per-screen and real-time (one worker per page on the backend).
  const screenCards = useMemo<ScreenCard[]>(() => {
    const live = isGeneratingThisProject && active ? active.pages : pages;
    const total = isGeneratingThisProject && active ? active.total : pages.length;
    const ds = designSystemBySlug(designSystems, selectedThemeSlug);
    const cards: ScreenCard[] = live.map((p) => ({
      key: p.slug || p.id,
      name: p.name,
      pageType: p.pageType,
      quality: p.qualityScore,
      // NOTE: html depends ONLY on the page schema + design system — NOT on
      // selection — so clicking a card never re-renders iframes (no image reload /
      // flicker). The sidebar is generated per-screen (rich, domain-aware) inside
      // renderPreview, so screens are self-contained, not cross-linked.
      html: renderPreview(p.schema, {
        brand: currentProject.name || "DashboardCraft",
        designSystem: ds,
      }),
    }));
    if (isGeneratingThisProject && total === 0 && cards.length === 0) {
      // Auto mode is still deciding how many screens to build (planning phase).
      cards.push({ key: "planning", name: "Planning screens…", pageType: "auto", html: null });
    } else {
      for (let i = cards.length; i < total; i++) {
        cards.push({ key: `pending-${i}`, name: `Screen ${i + 1}`, pageType: "…", html: null });
      }
    }
    return cards;
  }, [isGeneratingThisProject, active, pages, currentProject.name, selectedThemeSlug, designSystems]);

  // Re-fetch the current project's pages (used after refine / restore).
  const refreshPages = useCallback(async () => {
    if (!currentProject.id) return;
    try {
      const loaded = await generationService.getProjectPages(currentProject.id);
      setPages(loaded);
      setSelectedSlug((prev) =>
        loaded.some((p) => p.slug === prev)
          ? prev
          : (loaded.find((p) => p.files.length > 0) ?? loaded[0])?.slug ?? null,
      );
    } catch {
      /* keep the existing pages on a refresh failure */
    }
  }, [currentProject.id]);

  // When the global provider reports a completed batch for THIS project,
  // re-fetch pages (selecting the first) and consume the signal.
  useEffect(() => {
    if (lastCompleted && lastCompleted.projectId === currentProject.id) {
      refreshPages();
      clearLastCompleted();
    }
  }, [lastCompleted, currentProject.id, refreshPages, clearLastCompleted]);

  // Keep the active code file path valid for the selected page.
  useEffect(() => {
    if (files.length > 0 && !files.find((f) => f.path === activeCodePath)) {
      setActiveCodePath(files[0].path);
    }
  }, [files, activeCodePath]);

  function handleCreateProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (!name) return;

    createProject({
      name,
      description,
      domain: "General",
      status: "draft",
      defaultThemeSlug: selectedThemeSlug,
    }).then((created) => {
      setActiveProjectId(created.id);
      setPrompt("");
      setPages([]);
      setSelectedSlug(null);
      setIsCreateProjectOpen(false);
    });
  }

  async function handleCopyCode() {
    const activeFile = files.find((f) => f.path === activeCodePath) ?? files[0];
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopyState("Copied");
    setTimeout(() => setCopyState("Copy"), 1200);
  }

  const [isZipping, setIsZipping] = useState(false);
  async function handleDownloadZip() {
    if (!currentProject.id) return;
    setIsZipping(true);
    try {
      await downloadProjectZip(currentProject.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export the project.");
    } finally {
      setIsZipping(false);
    }
  }

  return (
    <main className="app-interface flex flex-col min-h-screen bg-background text-foreground">
      <InterfaceTokenSync selector=".app-interface" />
      {/* Screen-reader live status for background generation progress. */}
      <div className="sr-only" role="status" aria-live="polite">
        {active
          ? active.total > 0
            ? `Generating ${active.completed} of ${active.total} screens`
            : "Planning screens"
          : ""}
      </div>
      <StudioHeader
        projectName={currentProject.name}
        credits={credits}
        onTopUp={() => purchaseCredits(100)}
      />

      <section className="grid flex-1 overflow-hidden lg:grid-cols-[auto_minmax(0,1fr)]">
        {/* Left prompts Sidebar */}
        <aside className={`relative z-30 flex h-[calc(100vh-3.5rem)] flex-col border-r border-border bg-card transition-all duration-300 ${isChatOpen ? "w-[284px]" : "w-[52px]"}`}>
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            {isChatOpen && (
              <div>
                <p className="text-xs font-bold text-foreground">Studio Engine</p>
                <p className="text-[10px] text-muted-foreground font-medium">Describe your layout requirements</p>
              </div>
            )}
            <Button
              className="ml-auto"
              onClick={() => setIsChatOpen((prev) => !prev)}
              size="icon"
              variant="ghost"
              aria-label={isChatOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isChatOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
          </div>

          {isChatOpen ? (
            <>
              <ScrollArea className="flex-1">
                <div className="space-y-4 p-3">
                  <Card className="border-border bg-card shadow-sm">
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold leading-5 text-card-foreground">
                        Describe what kind of product you need. I will generate a coherent set of pages — dashboard, list, detail, and form — that you can preview from the tabs.
                      </p>
                    </CardContent>
                  </Card>

                  <PromptExamples onSelectPrompt={(text) => setPrompt(text)} />
                </div>
              </ScrollArea>

              <PromptInputBox
                prompt={prompt}
                onChangePrompt={setPrompt}
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsConfirmOpen(true);
                }}
                isGenerating={isGenerating}
                selectedThemeName={selectedTheme.name}
                themeCost={themeCost}
                onOpenThemePicker={() => setIsThemeOpen(true)}
                pageCount={pageCount}
                onChangePageCount={setPageCount}
                auto={auto}
                onChangeAuto={setAuto}
              />
            </>
          ) : (
            <div className="grid gap-2 p-2">
              <Button size="icon" variant="ghost" onClick={() => setIsChatOpen(true)} aria-label="Open chat bar">
                <Menu className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsCreateProjectOpen(true)} aria-label="Create new project container">
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsThemeOpen(true)} aria-label="Choose page themes">
                <PaletteIcon />
              </Button>
            </div>
          )}
        </aside>

        {/* Right workspace Area */}
        <section className="flex h-[calc(100vh-3.5rem)] min-w-0 flex-col overflow-hidden">
          {/* Studio Actions Bar */}
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background px-3 overflow-x-auto">
            <DeviceSwitcher device={device} onChangeDevice={setDevice} />

            <div className="flex shrink-0 items-center gap-1.5">
              <Button disabled={!hasFiles} onClick={handleCopyCode} size="sm" variant="secondary" className="h-8 text-xs font-bold" aria-label="Copy active file code">
                <Copy className="h-3.5 w-3.5 mr-1" />
                {copyState}
              </Button>

              <Button disabled={!hasFiles} onClick={() => setIsCodeOpen(true)} size="sm" variant="secondary" className="h-8 text-xs font-bold" aria-label="Open code editor modal">
                <Code2 className="h-3.5 w-3.5 mr-1" />
                View Code
              </Button>

              <Button disabled={!hasFiles} onClick={() => setIsFilesOpen(true)} size="sm" variant="secondary" className="h-8 text-xs font-bold" aria-label="Open project files catalog">
                <FolderOpen className="h-3.5 w-3.5 mr-1" />
                Files
              </Button>

              <Button disabled={pages.length === 0 || isZipping} onClick={handleDownloadZip} size="sm" variant="secondary" className="h-8 text-xs font-bold" aria-label="Download all generated code as a ZIP">
                <Download className="h-3.5 w-3.5 mr-1" />
                {isZipping ? "Zipping…" : "Download ZIP"}
              </Button>

              <Button disabled={versions.length === 0} onClick={() => setIsVersionsOpen(true)} size="sm" variant="secondary" className="h-8 text-xs font-bold" aria-label="Open version history timeline">
                <History className="h-3.5 w-3.5 mr-1" />
                Versions
              </Button>

              <Button disabled={!selectedPage} onClick={() => setIsRefineOpen(true)} size="sm" variant="secondary" className="h-8 text-xs font-bold" aria-label="Open section refinement panel">
                <Wrench className="h-3.5 w-3.5 mr-1" />
                Refine
              </Button>

              <Button onClick={() => setIsCreateProjectOpen(true)} size="sm" className="h-8 text-xs font-bold" aria-label="Create new layout project">
                <Plus className="h-3.5 w-3.5" />
                New Project
              </Button>
            </div>
          </div>

          {/* Canvas Viewport — all screens on one canvas (Stitch-like). The old
              top tab strip is gone: the canvas already shows every screen. */}
          <div className="relative flex-1 overflow-hidden bg-muted/40">
            {screenCards.length > 0 ? (
              <ScreensCanvas
                screens={screenCards}
                activeKey={selectedSlug}
                onSelect={setSelectedSlug}
                onRefine={(key) => {
                  setSelectedSlug(key);
                  setIsRefineOpen(true);
                }}
              />
            ) : (
              <EmptyPreview
                isGenerating={isGenerating}
                onSelectExample={() => setPrompt("Create a professional warehouse operations product with a dashboard overview, an inventory list, an item detail page, and an intake form.")}
                selectedThemeName={selectedTheme.name}
                themeCost={themeCost}
              />
            )}

            <StudioBottomThemeBar
              selectedTheme={selectedTheme}
              onOpenThemePicker={() => setIsThemeOpen(true)}
            />
          </div>
        </section>
      </section>

      {/* Sheets and Dialogs */}
      <GenerationConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        prompt={prompt}
        themeName={selectedTheme.name}
        themeCost={themeCost}
        creditsBalance={credits}
        boostPrompt={boostPrompt}
        onBoostPromptChange={setBoostPrompt}
        pageCount={auto ? 0 : pageCount}
        auto={auto}
        onConfirm={() => {
          setIsConfirmOpen(false);
          runGeneration();
        }}
      />

      <ThemePickerSheet
        open={isThemeOpen}
        onOpenChange={setIsThemeOpen}
        systems={designSystems}
        selectedThemeSlug={selectedThemeSlug}
        onSelectTheme={setSelectedThemeSlug}
      />

      <CodeViewerDialog
        open={isCodeOpen}
        onOpenChange={setIsCodeOpen}
        files={files}
        activePath={activeCodePath}
        onActivePathChange={setActiveCodePath}
      />

      <ProjectFilesSheet
        open={isFilesOpen}
        onOpenChange={setIsFilesOpen}
        projectName={currentProject.name}
        files={files}
        onSelectFile={(path) => {
          setActiveCodePath(path);
          setIsFilesOpen(false);
          setIsCodeOpen(true);
        }}
      />

      <VersionHistoryPanel
        open={isVersionsOpen}
        onOpenChange={setIsVersionsOpen}
        versions={versions}
        activeVersionId={undefined}
        onRestore={(id) => {
          restoreVersion(id).then(() => {
            refreshPages();
          });
        }}
      />

      <RefineSectionPanel
        open={isRefineOpen}
        onOpenChange={setIsRefineOpen}
        sections={
          selectedPage?.schema?.sections?.map((section) => section.title ?? section.type) ?? [
            "Header",
            "Metrics",
            "Table",
          ]
        }
        creditsBalance={credits}
        onRefine={async (sec, inst) => {
          await refineSection(sec, inst, selectedThemeSlug);
          await refreshPages();
        }}
      />

      {/* New Project Creation dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="max-w-[420px] rounded-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Plus className="h-6 w-6" />
            </div>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription className="text-xs">
              Configure container settings before building dashboard pages.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="grid gap-4">
            <label className="grid gap-2 text-xs font-bold" htmlFor="new-project-name">
              Project Name
              <Input id="new-project-name" name="name" placeholder="Hospital Ops Dashboard" required autoFocus />
            </label>

            <label className="grid gap-2 text-xs font-bold" htmlFor="new-project-desc">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
              <Textarea id="new-project-desc" className="min-h-20 resize-none rounded-xl" name="description" placeholder="Brief description of your project..." />
            </label>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Project
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PaletteIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}
