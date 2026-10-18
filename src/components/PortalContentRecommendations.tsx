'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Video, FileText, Newspaper, ExternalLink, PlusCircle, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import WhatsAppIcon from './WhatsAppIcon';

/** שיתוף ידני בוואטספ — פותח את וואטספ עם טקסט מוכן; השולח שולח בעצמו */
const waShareHref = (title: string, url: string) =>
  `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

const TYPE_META: Record<string, { label: string; badge: string }> = {
  video: { label: '🎬 סרטון', badge: 'song-card-type-direct' },
  post: { label: '💬 פוסט', badge: 'song-card-type-stream' },
  article: { label: '📖 מאמר', badge: '' }
};

interface RecommendedItem {
  id: string;
  type: string;
  title: string;
  url: string;
  description?: string;
  sourceName?: string;
  thumbnailUrl?: string;
}

interface RecommendedCategory {
  id: string;
  name: string;
  items: RecommendedItem[];
}

interface PortalContentRecommendationsProps {
  portalCode: string;
  /** ה-URL-ים שכבר קיימים בספרייה האישית — לזיהוי "כבר נוסף" */
  myContentUrls: Set<string>;
  /** קריאה חוזרת לאחר הוספה — מרעננת את הספרייה בכרטיסיית התוכן */
  onAdopted?: () => void;
}

/**
 * "המלצות הצוות" בכרטיסיית התוכן של המטופל:
 * קטגוריות התוכן שהצוות שיתף, עם כפתור "+" להעתקה לספרייה האישית.
 * הפריטים המוסתרים בסופראדמין לא מגיעים לכאן כלל (סינון בשרת).
 */
export default function PortalContentRecommendations({ portalCode, myContentUrls, onAdopted }: PortalContentRecommendationsProps) {
  const [categories, setCategories] = useState<RecommendedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getPortalContentRecommendations(portalCode);
      setCategories(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת ההמלצות');
    } finally {
      setLoading(false);
    }
  }, [portalCode]);

  useEffect(() => { load(); }, [load]);

  const addToMyContent = async (item: RecommendedItem) => {
    if (addingId) return;
    try {
      setAddingId(item.id);
      await api.addPortalSelfContent(portalCode, {
        title: item.title,
        url: item.url,
        type: item.type,
        description: item.description || '',
        sourceName: item.sourceName || ''
      });
      onAdopted?.();
    } catch (err: any) {
      setError(err.message || 'שגיאה בהוספה לספרייה');
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return <div className="song-empty">טוען המלצות...</div>;
  }

  const available = categories.filter((c) => c.items.length > 0);
  if (available.length === 0) {
    return (
      <div className="song-empty">
        <Gift size={36} />
        <p>עדיין אין המלצות צוות — תוכן שהצוות ישתף יופיע כאן 🎁</p>
      </div>
    );
  }

  const active = available.find((c) => c.id === selectedCat) || available[0];

  return (
    <div>
      {/* ניווט קטגוריות המלצות */}
      <div className="song-cat-bar" role="tablist" aria-label="קטגוריות ההמלצות">
        {available.map((cat) => (
          <button
            type="button"
            key={cat.id}
            className={`song-cat-tab${active.id === cat.id ? ' song-cat-tab-active' : ''}`}
            onClick={() => setSelectedCat(cat.id)}
            role="tab"
            aria-selected={active.id === cat.id}
          >
            <Gift size={14} /> {cat.name} <span className="song-cat-count">{cat.items.length}</span>
          </button>
        ))}
      </div>

      <div className="content-rec-heading">
        <h3>
          🎁 {active.name}
          <span className="content-rec-count"> ({active.items.length} פריטים)</span>
        </h3>
        <p>נבחר במיוחד על ידי הצוות — לחצ/י על + כדי לשמור לספרייה שלך</p>
      </div>

      {error && <div className="song-form-error" style={{ marginBottom: '12px' }}>{error}</div>}

      <div className="song-grid">
        {active.items.map((item) => {
          const typeMeta = TYPE_META[item.type] || TYPE_META.video;
          const inMyContent = myContentUrls.has(item.url);
          return (
            <div key={item.id} className="song-card">
              <a
                className="song-thumb-link"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`פתיחת "${item.title}"`}
              >
                {item.thumbnailUrl ? (
                  <div className="song-card-thumb">
                    <img src={item.thumbnailUrl} alt={item.title} loading="lazy" />
                  </div>
                ) : (
                  <div className="song-card-icon"><Video size={19} /></div>
                )}
              </a>
              <div className="song-card-body">
                <div className="song-card-title" title={item.title}>{item.title}</div>
                {item.description && <div className="song-card-note" title={item.description}>{item.description}</div>}
                <div className="song-card-meta-row">
                  <div className={`song-card-type${typeMeta.badge ? ` ${typeMeta.badge}` : ''}`}>
                    {typeMeta.label}
                  </div>
                  {item.sourceName && <span className="content-rec-source">{item.sourceName}</span>}
                </div>
              </div>
              <div className="song-card-actions">
                <a
                  className="song-play-btn song-play-btn-ext"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="פתיחה באפליאציה/בטאב חדש"
                  aria-label={`פתיחת ${item.title}`}
                >
                  {item.type === 'article' ? <Newspaper size={16} /> : item.type === 'post' ? <FileText size={16} /> : <ExternalLink size={16} />}
                </a>
                <a
                  className="song-icon-btn song-share-btn"
                  href={waShareHref(item.title, item.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="שיתוף בוואטספ"
                  aria-label={`שיתוף "${item.title}" בוואטספ`}
                >
                  <WhatsAppIcon size={15} />
                </a>
                <button
                  type="button"
                  className="song-icon-btn song-add-btn"
                  onClick={() => addToMyContent(item)}
                  disabled={Boolean(addingId)}
                  title={inMyContent ? 'כבר בספרייה שלך' : 'שמירה לספרייה שלי'}
                  aria-label={inMyContent ? `${item.title} כבר בספרייה` : `שמירת ${item.title} לספרייה`}
                >
                  <PlusCircle size={15} className={inMyContent ? 'song-added-check' : ''} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="content-rec-back-hint" tabIndex={-1} aria-hidden="true">
        <ChevronRight size={13} /> לחזרה לספרייה שלך — כפתור "הספרייה שלי" למעלה
      </button>
    </div>
  );
}
