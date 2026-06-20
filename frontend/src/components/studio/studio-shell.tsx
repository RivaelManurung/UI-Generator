"use client";

import { useState, useMemo, useEffect, useCallback, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Copy, Code2, FolderOpen, History, Wrench, Menu, PanelLeftClose, PanelLeftOpen, Plus, Download, Gift, Palette, ChevronDown, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useProjects } from "@/hooks/use-projects";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { useGenerationVersions } from "@/hooks/use-generation-versions";
import { useGeneration } from "@/components/app/generation-provider";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { PublishFreeTemplateDialog } from "./publish-free-template-dialog";
import { StudioStartDialog } from "./studio-start-dialog";
import { ScreenManageDialogs, type ScreenManageKind } from "./screen-manage-dialogs";

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
import { GenerationProgress } from "./generation-progress";
import { resolveLayoutKind } from "@/lib/generation/layout-kind";
import { PromptInputBox } from "./prompt-input-box";
import { DeviceSwitcher } from "./device-switcher";
import { ScreenPreview, type ScreenCard } from "./screen-preview";
import { InterfaceTokenSync } from "@/components/app/interface-token-sync";
import { EmptyPreview } from "./empty-preview";
import { GenerationConfirmDialog } from "./generation-confirm-dialog";
import { ThemePickerSheet } from "./theme-picker-sheet";
import { CodeViewerDialog } from "./code-viewer-dialog";
import { ProjectFilesSheet } from "./project-files-sheet";
import { VersionHistoryPanel } from "./version-history-panel";
import { RefineSectionPanel } from "./refine-section-panel";
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

  // On a clean entry (the generic "/app/studio/demo" with no adopted project),
  // offer to create a new project or open an existing one. Dismissible.
  useEffect(() => {
    if (!activeProjectId && (!routeProjectId || routeProjectId === "demo")) {
      setIsStartOpen(true);
    }
  }, []); // run once on mount

  const currentProject =
    projects.find((p) => p.id === activeProjectId) ?? { id: "", name: "Untitled project" };

  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { balance, refresh: refreshBalance } = useCreditBalance();
  const credits = balance?.available ?? 0;

  // Versions + refine still operate at the project level.
  const {
    versions,
    activeVersion,
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
  // `selectedThemeSlug` is the theme for the NEXT generation (the picker value).
  // `generatedThemeSlug` is the theme the CURRENT pages were generated with — the
  // preview is locked to it, so changing the picker never re-skins an existing
  // result. To apply a different theme you must regenerate.
  const [selectedThemeSlug, setSelectedThemeSlug] = useState("shadcn");
  const [generatedThemeSlug, setGeneratedThemeSlug] = useState("shadcn");
  const genThemeRef = useRef("shadcn");

  // Design-system catalog (single source of truth, fetched from the backend).
  const [designSystems, setDesignSystems] = useState<DesignSystem[]>([DEFAULT_DESIGN_SYSTEM]);
  useEffect(() => {
    let cancelled = false;
    fetchDesignSystems()
      .then((list) => {
        if (!cancelled && list.length) setDesignSystems(list);
      })
      .catch(() => {
        /* keep the default design system on failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [device, setDevice] = useState<DeviceKey>("desktop1440");
  const [activeCodePath, setActiveCodePath] = useState("app/page.tsx");
  // Per-screen management (rename / delete / regenerate) — a single piece of
  // state instead of three dialog toggles. `key` is the ScreenCard key (slug||id).
  const [manage, setManage] = useState<{ kind: ScreenManageKind; key: string } | null>(null);

  // Dialog and Sheets Toggles
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // The prompt captured at the moment generation started, shown in the progress panel.
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isRefineOpen, setIsRefineOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [boostPrompt, setBoostPrompt] = useState(true);

  const selectedTheme = designSystemBySlug(designSystems, selectedThemeSlug);
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
          toast.error("Could not load this project's pages. Try reopening it.");
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
    setSubmittedPrompt(prompt);
    // Lock the preview to the theme this generation uses, from the moment it starts.
    genThemeRef.current = selectedThemeSlug;
    setGeneratedThemeSlug(selectedThemeSlug);
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
    // Preview is locked to the GENERATED theme, never the live picker.
    const ds = designSystemBySlug(designSystems, generatedThemeSlug);
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
  }, [isGeneratingThisProject, active, pages, currentProject.name, generatedThemeSlug, designSystems]);

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

  // Adopt the project's saved theme ONCE when it loads/changes (ref-guarded). This
  // seeds BOTH the picker (next-gen theme) and the locked preview theme.
  const themedProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeProjectId) return;
    const proj = projects.find((p) => p.id === activeProjectId);
    if (proj?.defaultThemeSlug && themedProjectRef.current !== activeProjectId) {
      themedProjectRef.current = activeProjectId;
      setSelectedThemeSlug(proj.defaultThemeSlug);
      setGeneratedThemeSlug(proj.defaultThemeSlug);
      genThemeRef.current = proj.defaultThemeSlug;
    }
  }, [activeProjectId, projects]);

  // The picker only changes the theme for the NEXT generation. It MUST NOT re-skin
  // an already-generated result — the theme is locked to the generated output; to
  // change it the user regenerates.
  const handleSelectTheme = useCallback((slug: string) => {
    setSelectedThemeSlug(slug);
  }, []);

  // When the global provider reports a completed batch for THIS project,
  // re-fetch pages (selecting the first) and consume the signal.
  useEffect(() => {
    if (lastCompleted && lastCompleted.projectId === currentProject.id) {
      refreshPages();
      refreshBalance(); // credits were just spent — keep the header balance live
      clearLastCompleted();
    }
  }, [lastCompleted, currentProject.id, refreshPages, refreshBalance, clearLastCompleted]);

  // Keep the active code file path valid for the selected page.
  useEffect(() => {
    if (files.length > 0 && !files.find((f) => f.path === activeCodePath)) {
      setActiveCodePath(files[0].path);
    }
  }, [files, activeCodePath]);

  const openExistingProject = useCallback((id: string) => {
    setActiveProjectId(id);
    setPrompt("");
    setSelectedSlug(null);
    setIsStartOpen(false);
  }, []);

  function handleCreateProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (!name) return;

    createProject({
      name,
      description,
      status: "draft",
      defaultThemeSlug: selectedThemeSlug,
    })
      .then((created) => {
        setActiveProjectId(created.id);
        setPrompt("");
        setPages([]);
        setSelectedSlug(null);
        setIsCreateProjectOpen(false);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not create project");
      });
  }

  async function handleCopyCode() {
    const activeFile = files.find((f) => f.path === activeCodePath) ?? files[0];
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access.");
    }
  }

  // Resolve the page targeted by the ⋯ menu (ScreenCard key is slug||id).
  const managePage = useMemo(
    () => (manage ? pages.find((p) => (p.slug || p.id) === manage.key) ?? null : null),
    [manage, pages],
  );

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

  // Keyboard: ⌘/Ctrl+Enter submits the prompt (opens the confirm) when it is
  // long enough and nothing is mid-generation. Esc is handled natively by the
  // Radix dialogs/sheets, so only the generate shortcut is wired here.
  const overlayOpen =
    isConfirmOpen || isThemeOpen || isCodeOpen || isFilesOpen || isVersionsOpen ||
    isRefineOpen || isPublishOpen || isStartOpen || isCreateProjectOpen || manage !== null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "Enter") return;
      if (overlayOpen || isGenerating || prompt.trim().length < 40) return;
      e.preventDefault();
      setIsConfirmOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen, isGenerating, prompt]);

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
        onTopUp={() => router.push("/app/billing")}
        onSwitchProject={() => setIsStartOpen(true)}
      />

      <section className="grid flex-1 overflow-hidden lg:grid-cols-[auto_minmax(0,1fr)]">
        {/* Left prompts Sidebar */}
        <aside className={`relative z-30 flex h-[calc(100svh-3.5rem)] flex-col border-r border-border bg-card transition-all duration-300 ${isChatOpen ? "w-[284px]" : "w-[52px]"}`}>
          <div className="flex h-14 items-center justify-between border-b border-border px-3">
            {isChatOpen && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Studio Engine</p>
                <p className="truncate text-[10px] font-medium text-muted-foreground">Describe your layout requirements</p>
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
                  {isGeneratingThisProject ? (
                    <GenerationProgress
                      prompt={submittedPrompt || prompt}
                      kind={resolveLayoutKind(submittedPrompt || prompt, active?.pages?.[0]?.pageType)}
                      completed={active?.completed ?? 0}
                      total={active?.total ?? 0}
                      failed={active?.status === "failed"}
                    />
                  ) : (
                    <PromptExamples onSelectPrompt={(text) => setPrompt(text)} />
                  )}
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
                <Palette className="h-4 w-4" />
              </Button>
            </div>
          )}
        </aside>

        {/* Right workspace Area */}
        <section className="flex h-[calc(100svh-3.5rem)] min-w-0 flex-col overflow-hidden">
          {/* Studio Actions Bar */}
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background px-3 overflow-x-auto">
            <DeviceSwitcher device={device} onChangeDevice={setDevice} />

            <div className="flex shrink-0 items-center gap-1.5">
              {/* Primary creative action stays one click away. */}
              <Button disabled={!selectedPage} onClick={() => setIsRefineOpen(true)} size="sm" variant="secondary" className="h-8 text-xs font-bold" aria-label="Open section refinement panel">
                <Wrench className="h-3.5 w-3.5 mr-1" />
                Refine
              </Button>

              {/* Code: copy / view / files / export — grouped to declutter the bar. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={pages.length === 0} size="sm" variant="secondary" className="h-8 text-xs font-bold" aria-label="Code and export actions">
                    <Code2 className="h-3.5 w-3.5 mr-1" />
                    Code
                    <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem disabled={!hasFiles} onSelect={() => handleCopyCode()}>
                    <Copy className="size-3.5" aria-hidden="true" />
                    Copy active file
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!hasFiles} onSelect={() => setIsCodeOpen(true)}>
                    <Code2 className="size-3.5" aria-hidden="true" />
                    View code
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!hasFiles} onSelect={() => setIsFilesOpen(true)}>
                    <FolderOpen className="size-3.5" aria-hidden="true" />
                    Browse files
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={pages.length === 0 || isZipping} onSelect={() => handleDownloadZip()}>
                    <Download className="size-3.5" aria-hidden="true" />
                    {isZipping ? "Zipping…" : "Download ZIP"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button disabled={versions.length === 0} onClick={() => setIsVersionsOpen(true)} size="sm" variant="secondary" className="h-8 text-xs font-bold" aria-label="Open version history timeline">
                <History className="h-3.5 w-3.5 mr-1" />
                History
              </Button>

              {/* Overflow: less-used / admin actions. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More studio actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {isAdmin ? (
                    <DropdownMenuItem disabled={!selectedPage} onSelect={() => setIsPublishOpen(true)}>
                      <Gift className="size-3.5" aria-hidden="true" />
                      Publish as free template
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onSelect={() => setIsCreateProjectOpen(true)}>
                    <Plus className="size-3.5" aria-hidden="true" />
                    New project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Full-area preview of the selected generated screen (device-framed,
              fit-to-width). Switch screens via the tab strip inside ScreenPreview. */}
          <div className="relative flex-1 overflow-hidden bg-sky/30">
            {screenCards.length > 0 ? (
              <ScreenPreview
                screens={screenCards}
                activeKey={selectedSlug}
                onSelect={setSelectedSlug}
                onRefine={(key) => {
                  setSelectedSlug(key);
                  setIsRefineOpen(true);
                }}
                onRename={(key) => setManage({ kind: "rename", key })}
                onRegenerate={(key) => setManage({ kind: "regenerate", key })}
                onDelete={(key) => setManage({ kind: "delete", key })}
                device={device}
                generating={isGeneratingThisProject}
                completed={active?.completed}
                total={active?.total}
                buildKind={resolveLayoutKind(submittedPrompt || prompt, active?.pages?.[0]?.pageType)}
              />
            ) : (
              <EmptyPreview
                isGenerating={isGenerating}
                onSelectExample={() => setPrompt("Create a professional warehouse operations product with a dashboard overview, an inventory list, an item detail page, and an intake form.")}
                selectedThemeName={selectedTheme.name}
              />
            )}
          </div>
        </section>
      </section>

      {/* Sheets and Dialogs */}
      <GenerationConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        prompt={prompt}
        themeName={selectedTheme.name}
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
        onSelectTheme={handleSelectTheme}
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
        activeVersionId={activeVersion?.id}
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

      <PublishFreeTemplateDialog
        open={isPublishOpen}
        onOpenChange={setIsPublishOpen}
        pageId={selectedPage?.id ?? null}
        defaultTitle={selectedPage?.name ?? ""}
      />

      <StudioStartDialog
        open={isStartOpen}
        onOpenChange={setIsStartOpen}
        projects={projects}
        currentProjectId={activeProjectId}
        onOpen={openExistingProject}
        onCreate={() => {
          setIsStartOpen(false);
          setIsCreateProjectOpen(true);
        }}
      />

      {/* Per-screen management: rename / delete / regenerate. */}
      <ScreenManageDialogs
        kind={manage?.kind ?? null}
        page={managePage}
        themeSlug={selectedThemeSlug}
        onClose={() => setManage(null)}
        onDone={(selectSlug) => {
          refreshPages().then(() => {
            if (selectSlug) setSelectedSlug(selectSlug);
          });
          refreshBalance();
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
