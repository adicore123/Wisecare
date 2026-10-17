'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain, CloudRain, CloudDrizzle, HeartCrack, Flame, Waves, Sparkles, Users, Wind,
  ChevronLeft, CheckCircle2, BookOpen, ExternalLink, AlertTriangle, Clock,
  Type, Minus, Plus, Play, BookHeart, Music
} from 'lucide-react';

import {
  KNOWLEDGE_CATEGORIES, KNOWLEDGE_ARTICLES, KNOWLEDGE_DISCLAIMER, articlesByCategory,
  type KnowledgeArticle, type EvidenceTier,
} from '@/lib/knowledgeArticles';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  CloudRain, CloudDrizzle, HeartCrack, Flame, Waves, Sparkles, Users, Wind,
};

const TIER_LABELS: Record<EvidenceTier, { label: string; cls: string }> = {
  verified: { label: '✅ מאומת מדעית', cls: 'knowledge-tier-verified' },
  promising: { label: '🔬 ממצאים מבטיחים', cls: 'knowledge-tier-promising' },
  framework: { label: '💡 מסגרת מועילה', cls: 'knowledge-tier-framework' },
};

type FontSize = 'small' | 'medium' | 'large';
const FONT_SIZES: Record<FontSize, number> = { small: 16, medium: 17.5, large: 19 };

export default function KnowledgeModule({ portalCode }: { portalCode: string }) {
  const [view, setView] = useState<'categories' | 'list' | 'article'>('categories');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<KnowledgeArticle | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [scrollProgress, setScrollProgress] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);

  // Load "read" state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`wisecare_knowledge_read_${portalCode}`);
      if (raw) setReadSet(new Set(JSON.parse(raw)));
    } catch {}
  }, [portalCode]);

  const markAsRead = (articleId: string) => {
    setReadSet((prev) => {
      const next = new Set(prev);
      next.add(articleId);
      try {
        localStorage.setItem(`wisecare_knowledge_read_${portalCode}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Scroll progress (article view)
  useEffect(() => {
    if (view !== 'article') return;
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const scrolled = Math.min(1, Math.max(0, -rect.top / total));
      setScrollProgress(scrolled);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [view, activeArticle]);

  const totalArticles = KNOWLEDGE_ARTICLES.length;
  const readCount = readSet.size;
  const progressPct = Math.round((readCount / totalArticles) * 100);

  const openCategory = (id: string) => { setActiveCategory(id); setView('list'); };
  const openArticle = (article: KnowledgeArticle) => {
    setActiveArticle(article);
    setView('article');
    window.scrollTo({ top: 0 });
  };
  const goBack = () => {
    if (view === 'article') { setView('list'); window.scrollTo({ top: 0 }); }
    else if (view === 'list') { setView('categories'); window.scrollTo({ top: 0 }); }
  };

  // ─── CATEGORIES VIEW ─────────────────────────────────────────
  if (view === 'categories') {
    return (
      <div className="knowledge-page">
        <div className="page-header" style={{ justifyContent: 'center', textAlign: 'center', display: 'block' }}>
          <div className="page-title-group">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              הבנת הנפש 🧠
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px' }}>
              כלים פסיכולוגיים מהמחקר — להבין ולהתמודד
            </p>
          </div>
        </div>

        <div className="knowledge-progress-wrap">
          <span className="knowledge-progress-label">📖 קראת {readCount} מתוך {totalArticles} מאמרים</span>
          <div className="knowledge-progress-bar">
            <div className="knowledge-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="knowledge-cat-grid">
          {KNOWLEDGE_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] ?? Brain;
            const count = articlesByCategory(cat.id).length;
            const readInCat = articlesByCategory(cat.id).filter((a) => readSet.has(a.id)).length;
            return (
              <button
                type="button"
                key={cat.id}
                className="knowledge-cat-card"
                onClick={() => openCategory(cat.id)}
              >
                <span className="knowledge-cat-icon"><Icon size={26} /></span>
                <span className="knowledge-cat-name">{cat.nameHe}</span>
                <span className="knowledge-cat-count">
                  {readInCat}/{count} מאמרים
                  {readInCat === count && count > 0 && <CheckCircle2 size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── ARTICLE LIST VIEW ───────────────────────────────────────
  if (view === 'list' && activeCategory) {
    const cat = KNOWLEDGE_CATEGORIES.find((c) => c.id === activeCategory);
    const articles = articlesByCategory(activeCategory);
    const Icon = cat ? CATEGORY_ICONS[cat.icon] ?? Brain : Brain;
    return (
      <div className="knowledge-page">
        <button type="button" className="knowledge-back" onClick={goBack}>
          <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          הבנת הנפש
        </button>

        <div className="knowledge-list-header">
          <span className="knowledge-cat-icon knowledge-cat-icon-lg"><Icon size={28} /></span>
          <h3>{cat?.nameHe}</h3>
          <p>{cat?.description}</p>
        </div>

        <div className="knowledge-article-list">
          {articles.map((article) => {
            const tier = TIER_LABELS[article.evidenceTier];
            const isRead = readSet.has(article.id);
            return (
              <button
                type="button"
                key={article.id}
                className={`knowledge-article-card${isRead ? ' knowledge-article-read' : ''}`}
                onClick={() => openArticle(article)}
              >
                <div className="knowledge-article-card-head">
                  <span className="knowledge-article-title">{article.titleHe}</span>
                  {isRead && <CheckCircle2 size={16} className="knowledge-read-check" aria-label="נקרא" />}
                </div>
                <div className="knowledge-article-meta">
                  <span className="knowledge-read-time"><Clock size={12} /> {article.readMinutes} דק'</span>
                  <span className={`knowledge-tier-badge ${tier.cls}`}>{tier.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── ARTICLE READING VIEW ───────────────────────────────────
  if (view === 'article' && activeArticle) {
    const article = activeArticle;
    const tier = TIER_LABELS[article.evidenceTier];
    const bodyPx = FONT_SIZES[fontSize];
    const isRead = readSet.has(article.id);

    return (
      <div className="knowledge-page knowledge-article-page" ref={articleRef}>
        {/* Sticky topbar with progress + font controls */}
        <div className="knowledge-article-topbar">
          <button type="button" className="knowledge-back knowledge-back-inline" onClick={goBack} aria-label="חזרה">
            <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span className="knowledge-article-topbar-title">הבנת הנפש</span>
          <div className="knowledge-font-controls" role="group" aria-label="גודל טקסט">
            <button type="button" className={`knowledge-font-btn${fontSize === 'small' ? ' active' : ''}`} onClick={() => setFontSize('small')} aria-label="טקסט קטן"><Minus size={13} /></button>
            <span className="knowledge-font-indicator"><Type size={13} /></span>
            <button type="button" className={`knowledge-font-btn${fontSize === 'large' ? ' active' : ''}`} onClick={() => setFontSize('large')} aria-label="טקסט גדול"><Plus size={13} /></button>
          </div>
          <div className="knowledge-scroll-progress">
            <div className="knowledge-scroll-fill" style={{ width: `${scrollProgress * 100}%` }} />
          </div>
        </div>

        <article className="knowledge-article-body" style={{ fontSize: `${bodyPx}px` }}>
          <h1>{article.titleHe}</h1>
          <div className="knowledge-article-meta-lg">
            <span><Clock size={14} /> {article.readMinutes} דק' קריאה</span>
            <span className={`knowledge-tier-badge ${tier.cls}`}>{tier.label}</span>
          </div>

          <div className="knowledge-divider" />

          {/* Body paragraphs */}
          {article.body.split('\n\n').map((para, i) => (
            <p key={i} className="knowledge-para">{para}</p>
          ))}

          {/* Research findings */}
          {article.findings.length > 0 && (
            <section className="knowledge-section">
              <h2 className="knowledge-section-title">🔬 מה המחקר אומר?</h2>
              {article.findings.map((f, i) => (
                <div key={i} className="knowledge-finding-card">
                  <p>{f.highlight}</p>
                  <span className="knowledge-finding-citation">{f.citation}</span>
                  {f.link && (
                    <a href={f.link} target="_blank" rel="noopener noreferrer" className="knowledge-finding-link">
                      <ExternalLink size={12} /> למאמר המקורי
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Practical tools */}
          {article.tools.length > 0 && (
            <section className="knowledge-section">
              <h2 className="knowledge-section-title">✨ מה אתה יכול/ה לעשות?</h2>
              {article.tools.map((tool, i) => (
                <div key={i} className="knowledge-tool-card">
                  <span className="knowledge-tool-icon">
                    {tool.icon === 'breathing' ? <Wind size={18} /> : tool.icon === 'journal' ? <BookHeart size={18} /> : tool.icon === 'songs' ? <Music size={18} /> : <Brain size={18} />}
                  </span>
                  <p>{tool.text}</p>
                  {tool.linkTo === 'breathing' && (
                    <span className="knowledge-tool-cta">→ פתח/י תרגיל נשימה</span>
                  )}
                  {tool.linkTo === 'insights' && (
                    <span className="knowledge-tool-cta">→ פתח/י יומן תובנות</span>
                  )}
                  {tool.linkTo === 'songs' && (
                    <span className="knowledge-tool-cta">→ פתח/י את השירים שלי</span>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Sources (expandable) */}
          {article.sources.length > 0 && (
            <details className="knowledge-sources">
              <summary>
                <BookOpen size={15} />
                מקורות ({article.sources.length})
                <ChevronLeft size={15} className="knowledge-sources-chevron" />
              </summary>
              <ol className="knowledge-sources-list">
                {article.sources.map((src, i) => (
                  <li key={i}>
                    {src.ref}
                    {src.link && (
                      <a href={src.link} target="_blank" rel="noopener noreferrer" className="knowledge-finding-link">
                        <ExternalLink size={11} /> קישור
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          )}

          {/* Disclaimer */}
          <div className="knowledge-disclaimer">
            <AlertTriangle size={14} />
            <span>{KNOWLEDGE_DISCLAIMER}</span>
          </div>

          {/* Mark as read */}
          <button
            type="button"
            className={`knowledge-read-btn${isRead ? ' knowledge-read-btn-done' : ''}`}
            onClick={() => markAsRead(article.id)}
            disabled={isRead}
          >
            {isRead ? <><CheckCircle2 size={18} /> קראת! 🎉</> : '✓ קראתי והבנתי'}
          </button>
        </article>
      </div>
    );
  }

  return null;
}
