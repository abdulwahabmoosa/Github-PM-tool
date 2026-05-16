import { useState, useEffect } from 'react';
import PublicNav from '../components/PublicNav.jsx';
import StateMachineDiagram from '../components/docs/StateMachineDiagram.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

/* ── Sidebar nav structure ─────────────────────────────────────────────── */

const NAV = [
  {
    group: 'GETTING STARTED',
    items: [
      { id: 'what-is-taskmaster', label: 'What is TaskMaster' },
      { id: 'how-it-works',       label: 'How it works' },
      { id: 'connecting-a-repo',  label: 'Connecting a repo' },
      { id: 'creating-a-task',    label: 'Creating a task' },
    ],
  },
  {
    group: 'WORKFLOW',
    items: [
      { id: 'tag-verbs',        label: 'The 5 tag verbs' },
      { id: 'state-machine',    label: 'State machine' },
      { id: 'multi-user',       label: 'Multi-user collaboration' },
      { id: 'manual-overrides', label: 'Manual overrides' },
    ],
  },
  {
    group: 'REFERENCE',
    items: [
      { id: 'tag-syntax',         label: 'Tag syntax' },
      { id: 'activity-tracking',  label: 'Activity tracking' },
      { id: 'polling-behavior',   label: 'Polling behavior' },
      { id: 'permissions',        label: 'Permissions & access' },
    ],
  },
  {
    group: 'FAQ',
    items: [{ id: 'faq', label: 'FAQ' }],
  },
];

/* ── Shared prose helpers ───────────────────────────────────────────────── */

const H2 = ({ id, children }) => (
  <h2 id={id} className="text-2xl font-medium text-slate-900 dark:text-slate-50 mb-3 scroll-mt-20">
    {children}
  </h2>
);

const H3 = ({ children }) => (
  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mt-6 mb-2">
    {children}
  </h3>
);

const P = ({ children }) => (
  <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
    {children}
  </p>
);

const C = ({ children }) => (
  <code className="font-mono text-[13px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
    {children}
  </code>
);

const Pre = ({ children }) => (
  <pre className="rounded-lg bg-slate-100 dark:bg-slate-800 p-4 text-sm font-mono text-slate-700 dark:text-slate-300 overflow-x-auto mb-4 leading-relaxed">
    {children}
  </pre>
);

const UL = ({ items }) => (
  <ul className="list-disc list-inside text-base text-slate-700 dark:text-slate-300 mb-4 space-y-1 leading-relaxed">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);

const Section = ({ children }) => (
  <div className="mb-16">{children}</div>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto mb-4">
    <table className="w-full text-sm">
      <thead>
        <tr>
          {headers.map((h) => (
            <th
              key={h}
              className="text-left py-2 px-3 font-semibold text-slate-900 dark:text-slate-50 border-b border-slate-200 dark:border-slate-800"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                className="py-2 px-3 border-b border-slate-100 dark:border-slate-900 text-slate-600 dark:text-slate-400"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Callout = ({ children }) => (
  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-4 text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
    {children}
  </div>
);

/* ── FAQ item ───────────────────────────────────────────────────────────── */

function FaqItem({ q, children }) {
  return (
    <div className="py-4 border-b border-slate-100 dark:border-slate-900 last:border-0">
      <p className="font-medium text-slate-900 dark:text-slate-50 mb-1.5">{q}</p>
      <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{children}</div>
    </div>
  );
}

/* ── Docs page ──────────────────────────────────────────────────────────── */

export default function Docs() {
  useDocumentTitle('Docs');
  const [activeId, setActiveId] = useState('what-is-taskmaster');

  useEffect(() => {
    const headings = document.querySelectorAll('h2[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1a]">
      <PublicNav />

      <div className="flex max-w-7xl mx-auto px-5">
        {/* ── Sidebar ── */}
        <nav className="w-56 flex-shrink-0 py-10 pr-6 sticky top-14 self-start max-h-[calc(100vh-3.5rem)] overflow-y-auto hidden md:block">
          {NAV.map(({ group, items }) => (
            <div key={group} className="mb-6">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                {group}
              </p>
              <ul className="space-y-0.5">
                {items.map(({ id, label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className={
                        activeId === id
                          ? 'block text-sm font-medium text-indigo-600 dark:text-indigo-400 py-1 px-2 rounded bg-indigo-50 dark:bg-indigo-950/40'
                          : 'block text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 py-1 px-2 rounded transition-colors'
                      }
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Main content ── */}
        <main className="flex-1 py-10 md:pl-8 md:border-l border-slate-200 dark:border-slate-800 min-w-0">

          {/* ───────────────── GETTING STARTED ───────────────── */}

          <Section>
            <H2 id="what-is-taskmaster">What is TaskMaster</H2>
            <P>
              TaskMaster is a GitHub-integrated project tracker for developers who hate
              updating task boards. Instead of clicking through a kanban every time you
              change focus, you push a git tag — and the task moves itself.
            </P>
            <P>
              The promise is simple: your project board reflects what's actually happening
              in your repo. No webhooks to configure, no separate tools to install, no
              special permissions. Just normal git, normal commits, normal tags.
            </P>
            <P>
              TaskMaster is built for small teams, individual developers, and any project
              where task tracking would otherwise drift away from reality.
            </P>
          </Section>

          <Section>
            <H2 id="how-it-works">How it works</H2>
            <P>Three things happen when you use TaskMaster:</P>
            <ol className="list-decimal list-inside text-base text-slate-700 dark:text-slate-300 mb-4 space-y-2 leading-relaxed">
              <li>You push a git tag with a special name like <C>task-3-claim</C></li>
              <li>TaskMaster's polling worker detects the tag (within 30 seconds)</li>
              <li>The rule engine translates the tag into a task state change</li>
            </ol>
            <P>
              Five verbs drive everything: <C>claim</C>, <C>help</C>, <C>helping</C>,{' '}
              <C>review</C>, <C>done</C>. See{' '}
              <a href="#state-machine" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                The state machine
              </a>{' '}
              for the full picture.
            </P>
          </Section>

          <Section>
            <H2 id="connecting-a-repo">Connecting a repo</H2>
            <P>
              When you log in to TaskMaster, click <strong>Manage repos</strong> to see
              your GitHub repositories. Click <strong>Connect</strong> on any repo you
              have access to.
            </P>
            <P>
              You become the <strong>owner</strong> if you're the first to connect that
              repo. The owner's GitHub token is used to poll for tags and commits. If a
              teammate has already connected this repo, you become a{' '}
              <strong>member</strong> — you can see and act on tasks, but the owner's
              token does the polling.
            </P>
            <P>
              Polling starts within 30 seconds of connecting. You can also click{' '}
              <strong>Poll now</strong> to trigger an immediate check.
            </P>
          </Section>

          <Section>
            <H2 id="creating-a-task">Creating a task</H2>
            <P>
              Click <strong>+ New task</strong> on the dashboard. The only required field
              is the title. Other fields:
            </P>
            <UL items={[
              <><strong>Description</strong> — free-form details</>,
              <><strong>Branch</strong> — optional, useful to remember where the work is happening</>,
              <><strong>Assignee</strong> — leave blank for "unclaimed," or pre-assign someone</>,
              <><strong>Linked issue</strong> — pick a GitHub issue from this repo for context</>,
            ]} />
            <P>
              Each task gets a sequential number per repo: task-1, task-2, etc. This
              number is what you reference in tags.
            </P>
          </Section>

          {/* ───────────────── WORKFLOW ───────────────── */}

          <Section>
            <H2 id="tag-verbs">The 5 tag verbs</H2>
            <P>
              Push a git tag named <C>task-N-{'{verb}'}</C> to drive a transition.
            </P>
            <Table
              headers={['Verb', 'What it does', 'Who can push it']}
              rows={[
                [<C>claim</C>,   'Claim an unassigned task, OR start work on a task already assigned to you. The task transitions from OPEN to IN_PROGRESS. If the task is assigned to someone else, the claim is rejected.',     'Anyone for unassigned tasks; assignee only for pre-assigned tasks'],
                [<C>help</C>,    'Request help on a task',      'Only the assignee'],
                [<C>helping</C>, 'Offer help on a task',        'Anyone NOT the assignee'],
                [<C>review</C>,  'Mark ready for review',       'Only the assignee'],
                [<C>done</C>,    'Mark complete',               'Only the assignee, from any state'],
              ]}
            />
            <P>
              Tags are case-sensitive and follow the exact format <C>task-N-verb</C> where
              N is the task's repo number. Extra suffixes are rejected.
            </P>
          </Section>

          <Section>
            <H2 id="state-machine">State machine</H2>
            <StateMachineDiagram />
            <P>
              A task starts in <strong>OPEN</strong>. Anyone with access to the repo can
              claim it. Once claimed, the task is <strong>IN_PROGRESS</strong> and
              assigned to the claimer.
            </P>
            <P>
              If the assignee gets stuck, they push <C>task-N-help</C> and the task
              moves to <strong>HELP_NEEDED</strong>. A teammate (not the assignee) can
              push <C>task-N-helping</C> to take over. The task returns to IN_PROGRESS
              with a recorded helper.
            </P>
            <P>
              When ready, the assignee pushes <C>task-N-review</C> to enter{' '}
              <strong>IN_REVIEW</strong>, then <C>task-N-done</C> to mark it{' '}
              <strong>DONE</strong>. Done is permissive — it works from any state, so an
              assignee can shortcut directly to done if needed.
            </P>
          </Section>

          <Section>
            <H2 id="multi-user">Multi-user collaboration</H2>
            <P>
              TaskMaster doesn't have its own team management. GitHub IS your team
              management. If two users both have GitHub access to a repo, they can both
              use TaskMaster on it.
            </P>
            <P>
              When user B connects a repo that user A already connected, B becomes a{' '}
              <strong>member</strong> — they see the same tasks A sees, can create tasks,
              can act on them. A is the <strong>owner</strong>, whose token does the
              polling.
            </P>
            <P>
              When a tag is pushed, TaskMaster uses the <strong>tagger's email</strong>{' '}
              to figure out which GitHub user pushed it. For best results: make sure your{' '}
              <C>git config user.email</C> matches your primary GitHub email.
            </P>
          </Section>

          <Section>
            <H2 id="manual-overrides">Manual overrides</H2>
            <P>
              Sometimes automation gets it wrong. Just open the task and change its status
              manually using the pill at the top. When you do this, automation is paused
              for that task for <strong>5 minutes</strong>.
            </P>
            <P>
              Any tag events that arrive during that window are logged but{' '}
              <strong>skipped</strong> — they don't undo your manual change. After 5
              minutes, automation resumes normally. The override badge on the task card
              shows the remaining time.
            </P>
            <Callout>
              <strong>⚠ Limitation:</strong> Skipped tag events are consumed permanently.
              If you push <C>task-3-done</C> during your override window, that tag won't
              re-trigger after 5 minutes. To complete the action: wait for the override to
              expire, then push a fresh tag, or manually transition the task.
            </Callout>
          </Section>

          {/* ───────────────── REFERENCE ───────────────── */}

          <Section>
            <H2 id="tag-syntax">Tag syntax</H2>
            <P>
              Tags must match the format <C>task-{'{N}'}-{'{verb}'}</C> where N is a
              positive integer and verb is one of the five recognised verbs. All lowercase,
              no extra characters.
            </P>
            <H3>Valid examples</H3>
            <Pre>{`task-1-claim\ntask-42-done\ntask-100-helping`}</Pre>
            <H3>Invalid examples</H3>
            <Pre>{`Task-1-Claim      # capitalization\ntask-1-claim-v2   # extra suffix\ntask-1-DONE       # mixed case`}</Pre>
            <P>
              Unrecognized tags are still logged with <C>eventType: UNRECOGNIZED_TAG</C>.
              This helps debug typos — check the task history timeline in the modal.
            </P>
            <P>
              Note on leading zeros: <C>task-01-claim</C> parses as task-1 because
              JavaScript's <C>parseInt</C> strips leading zeros. Stick with no leading
              zeros to keep conventions consistent.
            </P>
          </Section>

          <Section>
            <H2 id="activity-tracking">Activity tracking</H2>
            <P>
              Each claimed task shows a commit count — the number of commits by the
              assignee within the task's active window.
            </P>
            <UL items={[
              <><strong>Window start:</strong> when the task was claimed (<C>claimedAt</C>)</>,
              <><strong>Window end:</strong> when the task was marked DONE (or "now" for active tasks)</>,
            ]} />
            <P>
              Commits are attributed to the assignee by email. TaskMaster matches the
              commit author's email against known users. If multiple tasks are active for
              the same user, commits get attributed to all of them — a known limitation for
              future improvement via commit-message references (<C>#N</C>) or branch-based
              attribution.
            </P>
          </Section>

          <Section>
            <H2 id="polling-behavior">Polling behavior</H2>
            <P>
              TaskMaster polls each connected repo every 30 seconds for new tags and
              commits. Each poll uses the repo owner's GitHub OAuth token.
            </P>
            <UL items={[
              'Tags and commits are stored as events in the github_events table',
              'The rule engine ticks every 15 seconds, processing unprocessed events',
              'Manual Poll now button triggers an immediate poll for one repo',
            ]} />
            <P>
              Rate limits are not a concern at small scale — your account has 5,000
              requests per hour, and each poll uses 2–4 requests per repo.
            </P>
          </Section>

          <Section>
            <H2 id="permissions">Permissions & access</H2>
            <P>
              TaskMaster uses GitHub access as the source of truth. To connect a repo you
              must have GitHub access to it.
            </P>
            <Table
              headers={['Role', 'Can do']}
              rows={[
                ['Owner', 'Everything members can do, plus: their token is used for polling'],
                ['Member', 'View tasks, create tasks, update statuses, push action tags'],
              ]}
            />
            <P>
              Only the <strong>assignee</strong> can push action tags for their task
              (help, review, done). Only a <strong>non-assignee</strong> can push{' '}
              <C>helping</C>. When the owner disconnects, ownership auto-transfers to
              the oldest remaining member.
            </P>
          </Section>

          {/* ───────────────── FAQ ───────────────── */}

          <Section>
            <H2 id="faq">FAQ</H2>

            <FaqItem q="Why git tags and not webhooks?">
              Tags require no configuration — you just push them. Webhooks require repo
              admin access and ongoing setup. TaskMaster prioritises "works out of the box."
            </FaqItem>

            <FaqItem q="Can I undo a transition?">
              Yes — open the task and manually set the status back via the pill at the top.
              This triggers the 5-minute override window.
            </FaqItem>

            <FaqItem q="Why didn't my tag work?">
              Common causes: typo in the tag name, pushing while a manual override is
              active, or pushing as a user who isn't the task's assignee (for help/review/done
              verbs). Check the task's history timeline — skipped events appear there with
              a reason.
            </FaqItem>

            <FaqItem q="What if my commit message references a different task number than my tag?">
              Today, commits are attributed by author and time window, not by message
              content. Future work includes commit-message attribution using{' '}
              <C>#N</C> references.
            </FaqItem>

            <FaqItem q="What happens if I delete the repo on GitHub?">
              Polling will fail and the repo's sync state will be marked as an error. The
              TaskMaster data isn't auto-deleted; you can manually disconnect to clean up.
            </FaqItem>

            <FaqItem q="Why does the assignee field sometimes show an email?">
              When TaskMaster can't resolve the tag pusher's email to a known GitHub login,
              it falls back to showing the email prefixed with <C>email:</C>. Fix by
              ensuring your <C>git config user.email</C> matches your GitHub primary email.
            </FaqItem>

            <FaqItem q="What's the difference between claim and helping?">
              <C>claim</C> transitions an OPEN task to IN_PROGRESS. Anyone can claim an
              unassigned task; if the task is already assigned to you, claiming it still
              succeeds and starts your work. If the task is assigned to someone else, the
              claim is rejected — and both you AND the rightful assignee are notified so
              the conflict is visible to both sides. <C>helping</C> is for when an
              already-claimed task needs help — the helper takes over the active work.
            </FaqItem>

            <FaqItem q="Can I use TaskMaster without giving it commit access?">
              TaskMaster's OAuth scope is <C>repo</C> — required to read commits and tags
              from private repositories. It doesn't need write access and won't push to
              your repos.
            </FaqItem>

            <FaqItem q="How do I export my data?">
              Not currently implemented. Data lives in PostgreSQL. For a real export
              feature, open an issue on the project's GitHub.
            </FaqItem>
          </Section>

        </main>
      </div>
    </div>
  );
}
