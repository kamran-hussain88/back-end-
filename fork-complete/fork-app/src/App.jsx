import React, { useState, useEffect, useCallback } from 'react';
import {
  Github, Rss, BarChart3, UserCircle2, Zap, Trophy, Users, Ghost,
  Plus, RefreshCw, X, LogOut, Loader2, ChevronRight, Sparkles
} from 'lucide-react';
import { api, getToken, setToken, clearToken } from './lib/api.js';

/* ---------------- Design tokens ---------------- */
const COLORS = {
  bg: '#12151C',
  surface: '#1B1F29',
  surfaceAlt: '#222733',
  border: '#2B303B',
  gold: '#C9A227',
  goldSoft: '#E0C158',
  teal: '#4FC1B5',
  text: '#ECE8DE',
  muted: '#8A8F9C',
  danger: '#C9554F',
};

const TIERS = [
  { name: 'Bronze', min: 0, color: '#A6713B' },
  { name: 'Silver', min: 40, color: '#9FA6AE' },
  { name: 'Gold', min: 100, color: '#C9A227' },
  { name: 'Platinum', min: 200, color: '#7FD8D0' },
];

const COLLEGES = [
  'Netaji Subhas University',
  'NIT Jamshedpur',
  'XISS Jamshedpur',
  'Other Jamshedpur college',
];

const POST_TYPES = [
  { key: 'build', label: 'Build Log', icon: Zap, placeholder: "Day 12: refactored the auth flow, fixed the token refresh bug..." },
  { key: 'achievement', label: 'Achievement', icon: Trophy, placeholder: "Cracked an off-campus SDE internship at..." },
  { key: 'referral', label: 'Referral', icon: Users, placeholder: "Know someone hiring SDE interns? Looking for a referral at..." },
  { key: 'confession', label: 'Confession', icon: Ghost, placeholder: "Anything on your mind. This posts as Anonymous." },
];

/* ---------------- Helpers ---------------- */
function getTier(points) {
  let current = TIERS[0];
  for (const t of TIERS) if (points >= t.min) current = t;
  return current;
}
function nextTier(points) {
  const idx = TIERS.findIndex(t => t.name === getTier(points).name);
  return idx === TIERS.length - 1 ? null : TIERS[idx + 1];
}
function computePoints(user, posts) {
  const mine = posts.filter(p => p.authorId === user.id);
  const postPts = mine.reduce((s, p) => s + (p.type === 'confession' ? 5 : 15), 0);
  const reactionPts = mine.reduce((s, p) => s + (p.reactions || 0), 0);
  const repoPts = Math.min((user.repoCount || 0) * 2, 20);
  const githubBonus = user.github ? 10 : 0;
  return postPts + reactionPts + repoPts + githubBonus;
}
function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ---------------- Badge card (signature element) ---------------- */
function BadgeCard({ user, size = 'large' }) {
  const points = user._points ?? 0;
  const tier = getTier(points);
  const isLarge = size === 'large';
  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${COLORS.surface} 0%, ${COLORS.surfaceAlt} 100%)`,
        border: `1px solid ${tier.color}55`,
        borderRadius: 18,
        padding: isLarge ? 24 : 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, background: tier.color, color: '#12151C', fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '4px 10px', borderBottomLeftRadius: 10 }} className="mono-font">
        {tier.name.toUpperCase()} CLEARANCE
      </div>
      <div className="flex items-center" style={{ gap: 14, marginTop: isLarge ? 10 : 4 }}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" style={{ width: isLarge ? 64 : 44, height: isLarge ? 64 : 44, borderRadius: 12, border: `2px solid ${tier.color}` }} />
        ) : (
          <div style={{ width: isLarge ? 64 : 44, height: isLarge ? 64 : 44, borderRadius: 12, background: COLORS.surfaceAlt, border: `2px solid ${tier.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isLarge ? 24 : 18, color: tier.color }} className="display-font">
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display-font" style={{ fontSize: isLarge ? 19 : 15, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.college}</div>
        </div>
      </div>
      <div className="mono-font flex items-center justify-between" style={{ marginTop: 16, fontSize: 11, color: COLORS.muted }}>
        <span>MEMBER NO. {String(user.memberNo).padStart(3, '0')}</span>
        <span style={{ color: tier.color }}>{points} PTS</span>
      </div>
      {user.github && (
        <div className="flex items-center" style={{ gap: 6, marginTop: 10, fontSize: 11, color: COLORS.teal }}>
          <Github size={12} /> <span className="mono-font">{user.repoCount} repos · {user.followers} followers</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- Loading ---------------- */
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center" style={{ flex: 1, flexDirection: 'column', gap: 10 }}>
      <Loader2 size={26} color={COLORS.gold} className="animate-spin" />
      <div className="mono-font" style={{ fontSize: 12, color: COLORS.muted }}>verifying clearance...</div>
    </div>
  );
}

/* ---------------- Gate / onboarding ---------------- */
function GateScreen({ onSubmit, errorMsg }) {
  const [name, setName] = useState('');
  const [college, setCollege] = useState(COLLEGES[0]);
  const [github, setGithub] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputStyle = {
    width: '100%', background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 10, padding: '11px 13px', color: COLORS.text, fontSize: 14,
  };

  async function handleClick() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    await onSubmit({ name, college, github });
    setSubmitting(false);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 24px 28px' }}>
      <Sparkles size={20} color={COLORS.gold} />
      <div className="display-font" style={{ fontSize: 38, fontWeight: 700, color: COLORS.text, marginTop: 14, letterSpacing: -1 }}>
        FORK.
      </div>
      <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 6, lineHeight: 1.5 }}>
        A members-only network for Jamshedpur's CS builders. Proof of work over CGPA. Not everyone gets in.
      </div>

      <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="mono-font" style={{ fontSize: 11, color: COLORS.muted }}>FULL NAME</label>
          <input style={{ ...inputStyle, marginTop: 6 }} value={name} onChange={e => setName(e.target.value)} placeholder="Kamran ..." />
        </div>
        <div>
          <label className="mono-font" style={{ fontSize: 11, color: COLORS.muted }}>COLLEGE</label>
          <select style={{ ...inputStyle, marginTop: 6 }} value={college} onChange={e => setCollege(e.target.value)}>
            {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mono-font" style={{ fontSize: 11, color: COLORS.muted }}>GITHUB USERNAME — OPTIONAL, BOOSTS CLEARANCE</label>
          <input style={{ ...inputStyle, marginTop: 6 }} value={github} onChange={e => setGithub(e.target.value)} placeholder="octocat" />
        </div>
        {errorMsg && <div style={{ fontSize: 12, color: COLORS.danger }}>{errorMsg}</div>}
        <button
          onClick={handleClick}
          disabled={!name.trim() || submitting}
          style={{
            marginTop: 8, background: !name.trim() || submitting ? COLORS.surfaceAlt : COLORS.gold,
            color: !name.trim() || submitting ? COLORS.muted : '#12151C', border: 'none', borderRadius: 10,
            padding: '13px 0', fontWeight: 600, fontSize: 14, cursor: !name.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? 'Verifying...' : 'Request clearance'}
        </button>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 30, fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>
        Your profile and posts are visible to every FORK. member — this is a shared network, not just your browser.
      </div>
    </div>
  );
}

/* ---------------- Reveal ---------------- */
function RevealScreen({ user, onContinue }) {
  const tier = getTier(user._points ?? 0);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 22 }}>
      <div className="mono-font" style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2 }}>CLEARANCE GRANTED</div>
      <div className="badge-reveal" style={{ width: '100%', maxWidth: 320 }}>
        <BadgeCard user={user} size="large" />
      </div>
      <div style={{ fontSize: 13, color: COLORS.muted, textAlign: 'center', maxWidth: 300 }}>
        You're in as a <span style={{ color: tier.color }}>{tier.name}</span> member. Post real work to climb tiers.
      </div>
      <button
        onClick={onContinue}
        style={{ background: COLORS.gold, color: '#12151C', border: 'none', borderRadius: 10, padding: '12px 26px', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        Enter FORK <ChevronRight size={16} />
      </button>
    </div>
  );
}

/* ---------------- Post card ---------------- */
function PostCard({ post, author, isMine, alreadyReacted, onReact }) {
  const ptype = POST_TYPES.find(t => t.key === post.type) || POST_TYPES[0];
  const Icon = ptype.icon;
  const displayName = post.anonymous ? `Anonymous Member` : (author?.name || 'Unknown');
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 8 }}>
          <Icon size={14} color={COLORS.teal} />
          <span className="mono-font" style={{ fontSize: 11, color: COLORS.teal, letterSpacing: 0.5 }}>{ptype.label.toUpperCase()}</span>
        </div>
        <span style={{ fontSize: 11, color: COLORS.muted }}>{timeAgo(post.createdAt)}</span>
      </div>
      <div style={{ fontSize: 14, color: COLORS.text, marginTop: 10, lineHeight: 1.5 }}>{post.content}</div>
      <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>{displayName}{author ? ` · ${author.college.split(' ')[0]}` : ''}</span>
        <button
          onClick={() => onReact(post.id)}
          disabled={isMine || alreadyReacted}
          style={{
            background: 'transparent', border: `1px solid ${alreadyReacted ? COLORS.gold : COLORS.border}`,
            color: alreadyReacted ? COLORS.gold : COLORS.muted, borderRadius: 8, padding: '5px 11px',
            fontSize: 12, cursor: isMine || alreadyReacted ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          Co-sign · {post.reactions || 0}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Composer ---------------- */
function Composer({ onPost, onClose }) {
  const [type, setType] = useState('build');
  const [content, setContent] = useState('');
  const active = POST_TYPES.find(t => t.key === type);

  function submit() {
    if (!content.trim()) return;
    onPost({ type, content });
    setContent('');
    onClose();
  }

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div className="flex items-center justify-between">
        <div className="flex" style={{ gap: 6, flexWrap: 'wrap' }}>
          {POST_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              style={{
                background: type === t.key ? COLORS.gold : COLORS.surfaceAlt,
                color: type === t.key ? '#12151C' : COLORS.muted,
                border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.muted }}>
          <X size={16} />
        </button>
      </div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={active.placeholder}
        rows={3}
        style={{ width: '100%', marginTop: 10, background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10, color: COLORS.text, fontSize: 13, resize: 'none' }}
      />
      <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
        <span style={{ fontSize: 11, color: COLORS.muted }}>{type === 'confession' ? 'Posts anonymously' : 'Posts under your name'}</span>
        <button
          onClick={submit}
          disabled={!content.trim()}
          style={{ background: content.trim() ? COLORS.gold : COLORS.surfaceAlt, color: content.trim() ? '#12151C' : COLORS.muted, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
        >
          Post
        </button>
      </div>
    </div>
  );
}

/* ---------------- Feed tab ---------------- */
function FeedTab({ posts, users, me, onPost, onReact, reactedIds }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  return (
    <div style={{ padding: 16 }}>
      {!composerOpen ? (
        <button
          onClick={() => setComposerOpen(true)}
          className="flex items-center justify-center"
          style={{ width: '100%', gap: 8, background: COLORS.surfaceAlt, border: `1px dashed ${COLORS.border}`, borderRadius: 12, padding: 12, color: COLORS.muted, fontSize: 13, marginBottom: 16 }}
        >
          <Plus size={15} /> Share a build, a win, or a referral
        </button>
      ) : (
        <Composer onPost={onPost} onClose={() => setComposerOpen(false)} />
      )}

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 10px', color: COLORS.muted, fontSize: 13 }}>
          No signals yet. Be the first to post something real.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              author={userMap[p.authorId]}
              isMine={p.authorId === me.id}
              alreadyReacted={reactedIds.has(p.id)}
              onReact={onReact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Leaderboard tab ---------------- */
function LeaderboardTab({ users, posts, me }) {
  const ranked = users
    .map(u => ({ ...u, _points: computePoints(u, posts) }))
    .sort((a, b) => b._points - a._points);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Ranked by real activity — posts, co-signs received, and verified GitHub work. No popularity contest.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ranked.map((u, i) => {
          const tier = getTier(u._points);
          const isMe = u.id === me.id;
          return (
            <div
              key={u.id}
              className="flex items-center"
              style={{
                gap: 12, background: isMe ? COLORS.surfaceAlt : COLORS.surface,
                border: `1px solid ${isMe ? COLORS.gold : COLORS.border}`, borderRadius: 12, padding: 12,
              }}
            >
              <div className="mono-font" style={{ width: 22, fontSize: 13, color: COLORS.muted }}>{i + 1}</div>
              {u.avatarUrl ? (
                <img src={u.avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8 }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: 8, background: COLORS.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tier.color, fontSize: 14 }} className="display-font">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.name}{isMe ? ' (you)' : ''}
                </div>
                <div style={{ fontSize: 11, color: tier.color }}>{tier.name}</div>
              </div>
              <div className="mono-font" style={{ fontSize: 13, color: COLORS.text }}>{u._points}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Profile tab ---------------- */
function ProfileTab({ me, posts, onRefreshGithub, onLeave }) {
  const points = computePoints(me, posts);
  const tier = getTier(points);
  const next = nextTier(points);
  const mine = posts.filter(p => p.authorId === me.id);
  const postPts = mine.reduce((s, p) => s + (p.type === 'confession' ? 5 : 15), 0);
  const reactionPts = mine.reduce((s, p) => s + (p.reactions || 0), 0);
  const repoPts = Math.min((me.repoCount || 0) * 2, 20);
  const githubBonus = me.github ? 10 : 0;
  const progressPct = next ? Math.min(100, Math.round(((points - tier.min) / (next.min - tier.min)) * 100)) : 100;
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <BadgeCard user={{ ...me, _points: points }} size="large" />

      {next && (
        <div>
          <div className="flex items-center justify-between" style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>
            <span>Progress to {next.name}</span>
            <span>{points} / {next.min}</span>
          </div>
          <div style={{ height: 6, background: COLORS.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: next.color }} />
          </div>
        </div>
      )}

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14 }}>
        <div className="mono-font" style={{ fontSize: 11, color: COLORS.muted, marginBottom: 10 }}>POINTS BREAKDOWN</div>
        {[
          ['Posts shared', postPts],
          ['Co-signs received', reactionPts],
          ['GitHub repos', repoPts],
          ['GitHub verified bonus', githubBonus],
        ].map(([label, val]) => (
          <div key={label} className="flex items-center justify-between" style={{ fontSize: 13, color: COLORS.text, padding: '5px 0' }}>
            <span style={{ color: COLORS.muted }}>{label}</span>
            <span className="mono-font">{val}</span>
          </div>
        ))}
      </div>

      {me.github ? (
        <button
          onClick={onRefreshGithub}
          className="flex items-center justify-center"
          style={{ gap: 8, background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 11, color: COLORS.teal, fontSize: 13 }}
        >
          <RefreshCw size={14} /> Refresh GitHub stats
        </button>
      ) : (
        <div style={{ fontSize: 12, color: COLORS.muted, textAlign: 'center' }}>No GitHub connected — rejoin with a username to add it.</div>
      )}

      <div style={{ marginTop: 8 }}>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center justify-center"
            style={{ gap: 8, width: '100%', background: 'transparent', border: `1px solid ${COLORS.danger}55`, borderRadius: 10, padding: 11, color: COLORS.danger, fontSize: 13 }}
          >
            <LogOut size={14} /> Leave / reset my membership
          </button>
        ) : (
          <div style={{ border: `1px solid ${COLORS.danger}55`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 10 }}>This removes your badge and your posts from this browser. Sure?</div>
            <div className="flex" style={{ gap: 8 }}>
              <button onClick={onLeave} style={{ flex: 1, background: COLORS.danger, color: '#12151C', border: 'none', borderRadius: 8, padding: 9, fontSize: 13, fontWeight: 600 }}>Yes, leave</button>
              <button onClick={() => setConfirming(false)} style={{ flex: 1, background: COLORS.surfaceAlt, color: COLORS.muted, border: 'none', borderRadius: 8, padding: 9, fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- App shell ---------------- */
function AppShell({ tab, setTab, me, users, posts, onPost, onReact, reactedIds, onRefreshGithub, onLeave }) {
  const NAV = [
    { key: 'feed', label: 'Feed', icon: Rss },
    { key: 'leaderboard', label: 'Ranks', icon: BarChart3 },
    { key: 'profile', label: 'Profile', icon: UserCircle2 },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div
        className="flex items-center justify-between"
        style={{ position: 'sticky', top: 0, zIndex: 10, background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}`, padding: '14px 16px' }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <span className="display-font" style={{ fontSize: 17, fontWeight: 700, color: COLORS.text }}>FORK.</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 70 }}>
        {tab === 'feed' && <FeedTab posts={posts} users={users} me={me} onPost={onPost} onReact={onReact} reactedIds={reactedIds} />}
        {tab === 'leaderboard' && <LeaderboardTab users={users} posts={posts} me={me} />}
        {tab === 'profile' && <ProfileTab me={me} posts={posts} onRefreshGithub={onRefreshGithub} onLeave={onLeave} />}
      </div>

      <div
        className="flex items-center"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 440, margin: '0 auto', background: COLORS.surface, borderTop: `1px solid ${COLORS.border}` }}
      >
        {NAV.map(n => {
          const Icon = n.icon;
          const activeTab = tab === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className="flex items-center justify-center"
              style={{ flex: 1, flexDirection: 'column', gap: 3, padding: '10px 0', background: 'transparent', border: 'none', color: activeTab ? COLORS.gold : COLORS.muted }}
            >
              <Icon size={18} />
              <span style={{ fontSize: 10 }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Root ---------------- */
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [tab, setTab] = useState('feed');
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reactedIds, setReactedIds] = useState(new Set());
  const [errorMsg, setErrorMsg] = useState('');

  const refreshFeed = useCallback(async () => {
    const [u, p] = await Promise.all([api.users(), api.posts()]);
    setUsers(u);
    setPosts(p);
  }, []);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) { setScreen('gate'); return; }
      try {
        const [meRes, u, p] = await Promise.all([api.me(), api.users(), api.posts()]);
        setMe(meRes);
        setUsers(u);
        setPosts(p);
        setReactedIds(new Set(meRes.reactedPostIds || []));
        setScreen('app');
      } catch (e) {
        clearToken();
        setScreen('gate');
      }
    })();
  }, []);

  async function handleOnboard({ name, college, github }) {
    setErrorMsg('');
    try {
      const res = await api.join(name.trim(), college, github ? github.trim() : null);
      if (res.warning) setErrorMsg(res.warning);
      setToken(res.access_token);
      setMe({ ...res.user, reactedPostIds: [] });
      await refreshFeed();
      setScreen('reveal');
    } catch (e) {
      setErrorMsg(e.message || "Couldn't reach FORK. right now — try again in a moment.");
    }
  }

  async function handlePost({ type, content }) {
    if (!me || !content.trim()) return;
    try {
      await api.createPost(type, content.trim());
      await refreshFeed();
    } catch (e) {
      setErrorMsg(e.message || 'Could not post right now.');
    }
  }

  async function handleReact(postId) {
    if (reactedIds.has(postId)) return;
    try {
      await api.reactToPost(postId);
      setReactedIds(prev => new Set(prev).add(postId));
      await refreshFeed();
    } catch (e) {
      // e.g. already co-signed or reacting to your own post — ignore quietly
    }
  }

  async function handleRefreshGithub() {
    if (!me || !me.github) return;
    try {
      const updated = await api.refreshGithub();
      setMe(prev => ({ ...prev, ...updated }));
      await refreshFeed();
    } catch (e) {}
  }

  async function handleLeave() {
    try {
      await api.leave();
    } catch (e) {}
    clearToken();
    setMe(null);
    setUsers([]);
    setPosts([]);
    setReactedIds(new Set());
    setScreen('gate');
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 440, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {screen === 'loading' && <LoadingScreen />}
        {screen === 'gate' && <GateScreen onSubmit={handleOnboard} errorMsg={errorMsg} />}
        {screen === 'reveal' && me && <RevealScreen user={me} onContinue={() => setScreen('app')} />}
        {screen === 'app' && me && (
          <AppShell
            tab={tab} setTab={setTab} me={me} users={users} posts={posts}
            onPost={handlePost} onReact={handleReact} reactedIds={reactedIds}
            onRefreshGithub={handleRefreshGithub} onLeave={handleLeave}
          />
        )}
      </div>
    </div>
  );
}
