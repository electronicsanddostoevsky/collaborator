'use client';
import Updates from '@/components/collaboration/updates';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  useWorkspace,
  ContributionForm,
  Contributions,
} from '@/components/collaboration/workspace';
import {
  ArrowUpRight,
  ArrowRight,
  GitBranch,
  Sparkles,
  BookOpen,
  Clock3,
  Layers,
  Compass,
  Heart,
  Check,
  ChevronRight,
  FileText,
  Users,
  Cpu,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
const tasks = [
  {
    id: 'lore',
    icon: BookOpen,
    kind: 'LORE & RESEARCH',
    title: 'What makes Gandiva extraordinary?',
    time: '15–30 min',
    description:
      'Help define how Arjuna’s mastery should feel. Bring a passage, a reference, or your interpretation.',
    deliverable:
      'A short note with a source reference, your interpretation, and one idea for expressing it through play.',
    criteria:
      'Distinguish the source from your interpretation. Focus on mastery, precision, and the experience of playing.',
  },
  {
    id: 'direction',
    icon: Sparkles,
    kind: 'CREATIVE DIRECTION',
    title: 'Shape the world of Day 14',
    time: '20–40 min',
    description:
      'Describe the atmosphere, color, and scale of the battlefield as sunset approaches.',
    deliverable:
      'A visual brief or reference collection explaining the mood and why it fits this moment.',
    criteria:
      'Label modern adaptations. Separate visual inspiration from textual evidence.',
  },
  {
    id: 'mechanic',
    icon: Layers,
    kind: 'PROTOTYPING',
    title: 'Explore an arrow volley mechanic',
    time: 'An open experiment',
    description:
      'Sketch or build a tiny experiment. How might exceptional archery feel in the player’s hands?',
    deliverable:
      'A sketch, recorded prototype, or source files with controls and reproduction instructions.',
    criteria:
      'Keep it small and testable. State which tools and resources you used.',
  },
];
const principles = [
  [
    '01',
    'Respect the source',
    'Ground interpretations in the Mahabharata. Keep sources visible and preserve the characters’ moral complexity.',
  ],
  [
    '02',
    'Make mastery tangible',
    'Arjuna should feel extraordinary through precision, timing, and control. Astras should feel rare and frightening.',
  ],
  [
    '03',
    'Build a small thing well',
    'Work toward a playable moment of Day 14 before expanding to an entire game.',
  ],
  [
    '04',
    'Keep it shared',
    'Create for the community. Our intent is shared, noncommercial work. Contribution terms must be settled before public submissions.',
  ],
];
export default function Home() {
  const [tab, setTab] = useState('overview');
  const [selected, setSelected] = useState<string | null>(null);
  const workspace = useWorkspace();
  const following = workspace.data?.following || false;
  const task = tasks.find((t) => t.id === selected);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'open_contribution_brief',
            description:
              'Open an existing contribution brief in the mission preview. Does not claim work, submit anything, or run an agent.',
            inputSchema: {
              type: 'object',
              properties: {
                taskId: {
                  type: 'string',
                  enum: ['lore', 'direction', 'mechanic'],
                },
              },
              required: ['taskId'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== 'object' ||
                Object.keys(input).length !== 1 ||
                !('taskId' in input) ||
                typeof input.taskId !== 'string' ||
                !tasks.some((t) => t.id === input.taskId)
              )
                throw new Error('Choose lore, direction, or mechanic.');
              const id = input.taskId;
              flushSync(() => setSelected(id));
              return { opened: id, status: 'brief_only' };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional browser capability. */
    }
    return () => lifecycle.abort();
  }, []);
  return (
    <div>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-symbol">c↗</span>collaborator
          <span className="alpha">EARLY PREVIEW</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="/my-missions">My missions</a>
          <a href="/missions/mahabharata/history">Mission history</a>
          <a href="/missions/mahabharata/workspace">Working files</a>
          <a href="/">
            <Compass size={17} />
            Explore missions
          </a>
          <a href="#principles" onClick={() => setTab('vision')}>
            Our shared vision
            <ArrowUpRight size={16} />
          </a>
        </nav>
        <span className="preview-indicator">
          <i />
          Private prototype
        </span>
      </header>
      <main id="mission">
        <div className="breadcrumb">
          <Compass size={15} />
          Missions
          <ChevronRight size={14} />
          <span>Mahabharata</span>
        </div>
        <div className="mission-heading">
          <div>
            <div className="eyebrow">
              <i />
              THE FIRST MISSION <span>/</span> GAMES & INTERACTIVE WORLDS
            </div>
            <h1>Make the epic playable.</h1>
            <p>
              A community-built Mahabharata game. Starting with one
              unforgettable moment.
            </p>
          </div>
          <button
            className={following ? 'secondary' : 'primary'}
            disabled={workspace.busy || !workspace.data?.user}
            onClick={() =>
              workspace.act({ action: 'follow', following: !following })
            }
          >
            {following ? <Check size={18} /> : <Heart size={18} />}{' '}
            {following ? 'Following mission' : 'I want this to exist'}
          </button>
        </div>
        <p className="workspace-status" role="status">
          {workspace.error ||
            (workspace.data
              ? `${workspace.data.supporters} following · ${workspace.data.user?.isMaintainer ? 'Maintainer access' : 'Contributor access'}`
              : 'Connecting to the shared workspace…')}
        </p>
        <div className="mission-layout">
          <section>
            <div className="art-panel">
              <img
                src="/mission-concept.png"
                alt="Imaginative concept art of an archer and chariot on a battlefield beneath a copper sunset"
              />
              <div className="art-shade" />
              <span className="art-label">
                VISUAL DIRECTION · AI CONCEPT ART
              </span>
              <div className="art-caption">
                <span>MAHABHARATA</span>
                <h2>Before the sun sets.</h2>
                <p>Day 14 · Kurukshetra</p>
              </div>
              <span className="art-index">EXPLORATION 001</span>
            </div>
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(String(v))}
              className="mission-tabs"
            >
              <TabsList variant="line" className="tab-list">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="vision">Shared vision</TabsTrigger>
                <TabsTrigger value="contribute">
                  Ways to help <span className="count">3</span>
                </TabsTrigger>
                <TabsTrigger value="artifacts">What exists</TabsTrigger>
                <TabsTrigger value="updates">Updates</TabsTrigger>
                <TabsTrigger value="reviews">Contributions</TabsTrigger>
              </TabsList>
              <div className="aside-card">
                <h2>Make something with an agent</h2>
                <p>
                  Describe a rough 3D asset, let your local model and Blender
                  make a draft, and direct the next iteration.
                </p>
                <a className="text-button" href="/missions/mahabharata/team">
                  Community and leads ↗
                </a>
                <a className="primary" href="/missions/mahabharata/plan">
                  Plan the next milestone ↗
                </a>
                <a className="primary" href="/workshop">
                  Open the Blender workshop ↗
                </a>
              </div>
              <TabsContent value="updates">
                <Updates mission="mahabharata" />
              </TabsContent>
              <TabsContent value="overview">
                <div className="section-heading">
                  <h2>A world worth building together.</h2>
                  <span className="small-label">THE AMBITION</span>
                </div>
                <p className="intro">
                  What if the stories we care about could become worlds we step
                  into? We want to bring the Mahabharata to life with the scale,
                  depth, and moral complexity it deserves.
                </p>
                <p className="body-copy">
                  The full game is the ambition. Our first step is a small
                  playable interpretation of Day 14: Arjuna, Gandiva, and the
                  urgency of a setting sun. Bring your knowledge, your taste, or
                  a little time. Help shape what comes next.
                </p>
                <div className="next-strip">
                  <span className="icon-tile">
                    <GitBranch size={21} />
                  </span>
                  <div>
                    <span className="small-label">FIRST IMPLEMENTATION</span>
                    <h3>Day 14 · The first playable moment</h3>
                    <p>Planning · No playable build yet</p>
                  </div>
                  <button
                    aria-label="View implementation artifacts"
                    onClick={() => setTab('artifacts')}
                  >
                    <ArrowUpRight size={22} />
                  </button>
                </div>
                <div className="section-heading">
                  <h2>A little time can move this forward.</h2>
                  <button
                    className="text-button"
                    onClick={() => setTab('contribute')}
                  >
                    Explore contributions
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="opportunity-preview">
                  {tasks.slice(0, 2).map((t) => (
                    <button key={t.id} onClick={() => setSelected(t.id)}>
                      <t.icon size={22} />
                      <span className="small-label">{t.kind}</span>
                      <h3>{t.title}</h3>
                      <span className="task-time">
                        <Clock3 size={14} />
                        {t.time}
                        <ArrowUpRight size={18} />
                      </span>
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="vision" id="principles">
                <div className="section-heading">
                  <h2>The vision we build from.</h2>
                  <span className="small-label">DRAFT 0.1</span>
                </div>
                <p className="intro">
                  A shared direction, with room for different interpretations.
                  Each implementation can develop its own approach.
                </p>
                <div className="principles">
                  {principles.map(([n, title, body]) => (
                    <article key={n}>
                      <span>{n}</span>
                      <div>
                        <h3>{title}</h3>
                        <p>{body}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="contribute">
                <div className="section-heading">
                  <h2>Find your part in it.</h2>
                  <span className="small-label">START SMALL</span>
                </div>
                <p className="intro">
                  Claim a starting point, work in your own tools, and submit
                  what you make. The maintainer reviews contributions before
                  they join the shared history.
                </p>
                <div className="task-list">
                  {tasks.map((t) => (
                    <button key={t.id} onClick={() => setSelected(t.id)}>
                      <span className="icon-tile">
                        <t.icon size={22} />
                      </span>
                      <div>
                        <span className="small-label">
                          {t.kind} · {t.time}
                        </span>
                        <h3>{t.title}</h3>
                        <p>{t.description}</p>
                      </div>
                      <ArrowUpRight size={20} />
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="artifacts">
                <div className="section-heading">
                  <h2>From an idea to something real.</h2>
                  <span className="small-label">CURRENT STATE</span>
                </div>
                <p className="intro">
                  This mission starts here. There is no game build yet. The
                  first foundation is a shared brief and a visual exploration.
                </p>
                <div className="artifact-row">
                  <FileText size={25} />
                  <div>
                    <h3>Day 14 · Mission brief</h3>
                    <p>Draft 0.1 · Creative direction and first milestone</p>
                  </div>
                  <a className="secondary" href="/mission-brief.md" download>
                    Download
                    <ArrowUpRight size={16} />
                  </a>
                </div>
                <div className="artifact-row">
                  <Layers size={25} />
                  <div>
                    <h3>Battlefield atmosphere</h3>
                    <p>
                      AI concept art · Visual inspiration, not historical
                      evidence
                    </p>
                  </div>
                  <a
                    className="text-button"
                    href="/mission-concept.png"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open art
                    <ArrowUpRight size={16} />
                  </a>
                </div>
                <div className="empty-build">
                  <GitBranch size={28} />
                  <h3>The first playable build is ahead of us.</h3>
                  <p>
                    Start with one mechanic, one moment, and a clear way to test
                    it.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setSelected('mechanic')}
                  >
                    Explore the prototype brief
                    <ArrowRight size={16} />
                  </button>
                </div>
                <Contributions workspace={workspace} acceptedOnly />
              </TabsContent>
              <TabsContent value="reviews">
                <Contributions workspace={workspace} />
              </TabsContent>
            </Tabs>
          </section>
          <aside>
            <div className="aside-card">
              <span className="small-label">HELP MAKE THIS EXIST</span>
              <h2>
                You don’t have to
                <br />
                build it alone.
              </h2>
              <p>
                A good reference. A thoughtful review. A small experiment.
                <br />
                There’s a place to begin.
              </p>
              <button className="primary" onClick={() => setTab('contribute')}>
                Find a way to help
                <ArrowRight size={17} />
              </button>
              <span className="quiet">
                No specialist background required to join in.
              </span>
            </div>
            <div className="aside-section">
              <span className="small-label">THE NEXT MILESTONE</span>
              <h3>Define our first playable moment</h3>
              <ol className="milestones">
                <li className="current">
                  <span>1</span>
                  <div>
                    Agree on a shared brief<small>Starting here</small>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    Explore one archery mechanic<small>Up next</small>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    Play, review, improve<small>Then build together</small>
                  </div>
                </li>
              </ol>
            </div>
            <div className="aside-section resource-note">
              <Cpu size={20} />
              <div>
                <h3>Your resources, your choice.</h3>
                <p>
                  Experiments use your own tools. This preview does not run
                  agents or spend compute.
                </p>
              </div>
            </div>
            <div className="aside-section community-note">
              <Users size={20} />
              <p>
                Built for shared passion projects.
                <br />
                <span>Community-first. Noncommercial intent.</span>
              </p>
            </div>
          </aside>
        </div>
      </main>
      <footer>
        <a className="brand" href="/">
          collaborator ↗
        </a>
        <span>Small contributions. Something that now exists.</span>
        <span>Increment 1 · Build together</span>
      </footer>
      <Dialog
        open={!!task}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="task-dialog">
          <span className="eyebrow">CONTRIBUTION BRIEF</span>
          <DialogTitle>{task?.title}</DialogTitle>
          <DialogDescription>{task?.description}</DialogDescription>
          <div className="brief-section">
            <h3>What to bring back</h3>
            <p>{task?.deliverable}</p>
          </div>
          <div className="brief-section">
            <h3>What makes it useful</h3>
            <p>{task?.criteria}</p>
          </div>
          <div className="dialog-note">
            <Clock3 size={17} />
            {task?.time} · Work in your own tools
          </div>
          <ContributionForm
            key={task?.id}
            taskId={task?.id || ''}
            workspace={workspace}
          />
          <a href="/mission-brief.md" download className="primary">
            Download mission context
            <ArrowUpRight size={17} />
          </a>
        </DialogContent>
      </Dialog>
    </div>
  );
}
