"use client";
import { useState, useEffect, useRef, Fragment } from 'react';
import s from "../app/atolio-partnership2/style.module.css";

function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${s.reveal} ${visible ? s.revealVisible : ''} ${className}`}>
      {children}
    </div>
  );
}

/* Auto-trims empty (transparent / white) margins around a logo so every logo
   fills the hero pill. If the image host blocks canvas access (no CORS header)
   it silently falls back to the original image. */
function TrimmedLogo({ src, alt }) {
  const [out, setOut] = useState(src);

  useEffect(() => {
    setOut(src);
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = img.naturalWidth, H = img.naturalHeight;
        if (!W || !H) return;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, W, H); // throws if tainted
        let x0 = W, y0 = H, x1 = -1, y1 = -1;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const a = data[i + 3];
            const nearWhite = data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245;
            if (a > 20 && !nearWhite) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        if (x1 < 0) return;
        const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
        if (cw >= W - 2 && ch >= H - 2) return; // nothing to trim
        const t = document.createElement('canvas');
        t.width = cw; t.height = ch;
        t.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
        if (!cancelled) setOut(t.toDataURL('image/png'));
      } catch (e) {
        /* tainted canvas or decode problem: keep original */
      }
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);

  return <img src={out} alt={alt} />;
}

const BODY_TYPES = ['article', 'intro_section', 'content_section', 'outcomes', 'market_focus', 'about_companies', 'media_contact'];

// Turn the ACF layouts into page sections, keeping the order added in WordPress.
// Consecutive body layouts are grouped into one white article card.
function buildSections(layouts) {
  const sections = [];
  const spotlight = layouts.find((l) => l.acf_fc_layout === 'spotlight_');
  let spotlightUsed = false;

  layouts.forEach((l) => {
    const t = l.acf_fc_layout;
    if (t === 'hero_section') {
      sections.push({ kind: 'hero', hero: l, spotlight });
      spotlightUsed = true;
    } else if (t === 'press_meta') {
      sections.push({ kind: 'pressMeta', data: l });
    } else if (BODY_TYPES.includes(t)) {
      const last = sections[sections.length - 1];
      if (last && last.kind === 'body') last.items.push(l);
      else sections.push({ kind: 'body', items: [l] });
    } else if (t === 'related_news') {
      sections.push({ kind: 'related', data: l });
    } else if (t === 'cta') {
      sections.push({ kind: 'cta', data: l });
    }
  });

  // Spotlight added without a Hero row: still show it on its own
  if (spotlight && !spotlightUsed) {
    const idx = layouts.indexOf(spotlight);
    sections.splice(Math.min(idx, sections.length), 0, { kind: 'hero', hero: null, spotlight });
  }
  return sections;
}

function formatInline(input) {
  let out = input;
  out = out
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  out = out.replace(
    /(^|[\s(>])(https?:\/\/[^\s<)]+)/g,
    (m, pre, url) => {
      if (pre === '>') return m;
      const trail = (url.match(/[.,;:!?]+$/) || [''])[0];
      const clean = url.slice(0, url.length - trail.length);
      return `${pre}<a href="${clean}" target="_blank" rel="noreferrer">${clean}</a>${trail}`;
    }
  );
  return out;
}

// Content fields: works with HTML (WYSIWYG) OR plain text.
// Plain-text shortcuts (no HTML tags needed):
//   blank line        -> new paragraph
//   ## Heading        -> sub-heading
//   - item            -> bullet list (one "- " per line)
//   **bold**          -> bold
//   [text](https://x) -> link
//   https://x         -> clickable link
function formatRich(html) {
  let out = (html || '').trim();
  if (!out) return '';
  if (!/<(p|ul|ol|h[1-6]|div|table|blockquote)[\s>]/i.test(out)) {
    out = out
      .split(/\n\s*\n/)
      .map((para) => {
        const txt = para.trim();
        if (/^#{1,4}\s+/.test(txt)) return `<h3>${txt.replace(/^#{1,4}\s+/, '')}</h3>`;
        // "- item" lines -> bullet list (mixed text + bullets in one block is fine)
        if (/^[-•]\s+/m.test(txt)) {
          const parts = [];
          let list = [];
          let text = [];
          const flushText = () => { if (text.length) { parts.push(`<p>${text.join('<br />')}</p>`); text = []; } };
          const flushList = () => { if (list.length) { parts.push(`<ul>${list.map((li) => `<li>${li}</li>`).join('')}</ul>`); list = []; } };
          txt.split('\n').forEach((line) => {
            const m = line.match(/^\s*[-•]\s+(.*)$/);
            if (m) { flushText(); list.push(m[1]); }
            else if (line.trim()) { flushList(); text.push(line.trim()); }
          });
          flushText(); flushList();
          return parts.join('');
        }
        return `<p>${txt.replace(/\n/g, '<br />')}</p>`;
      })
      .join('');
  }
  out = formatInline(out);
  return out;
}

// CTA title: highlight part of it in the orange gradient (like "Agentic AI?").
// Wrap the words in *stars* in WordPress to choose them, e.g. Ready to explore *Agentic AI?*
// If no stars are used, the last two words are highlighted automatically.
function renderCtaTitle(title) {
  const text = String(title || '').replace(/<\/?em>/gi, '*').trim();
  if (!text) return null;
  const m = text.match(/^(.*?)\*(.+?)\*(.*)$/);
  if (m) {
    return (<>{m[1]}<em>{m[2]}</em>{m[3]}</>);
  }
  const words = text.split(/\s+/);
  if (words.length < 3) return text;
  return (<>{words.slice(0, -2).join(' ')} <em>{words.slice(-2).join(' ')}</em></>);
}

export default function AtolioPartnershipClient({ data }) {
  const layouts = data?.acf?.atolio || [];
  const sections = buildSections(layouts);

  const [openItem, setOpenItem] = useState('a0');
  const toggle = (key) => setOpenItem((prev) => (prev === key ? null : key));

  // Spotlight: if an image is set in the "Spotlight Image" field (blog pages) show
  // the image on the right; otherwise show the dark card (press-release / recognition pages).
  const renderSpotlight = (spotlight) => {
    if (!spotlight) return null;
    const spotImg =
      typeof spotlight.spotlight_image === 'string'
        ? { url: spotlight.spotlight_image }
        : spotlight.spotlight_image;
    if (spotImg?.url) {
      return (
        <aside className={s.spotlightImage}>
          <img src={spotImg.url} alt={spotImg.alt || spotlight.spotlight_title || ''} />
        </aside>
      );
    }
    return (
      <aside className={s.spotlightCard}>
        <div>
          <h3>{spotlight.spotlight_title}</h3>
          <p>{spotlight.spotlight_description}</p>
          <div className={s.checkList}>
            {(spotlight.spotlight_checklist_ || []).map((item, i) => (
              <div key={i} className={s.check}>
                <div className={s.checkIcon}>&#10003;</div>
                {item.checklist_item}
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  };

  const renderHero = (hero, spotlight, key) => {
    const heroImg =
      typeof spotlight?.spotlight_image === 'string'
        ? { url: spotlight.spotlight_image }
        : spotlight?.spotlight_image;
    const hasImg = !!heroImg?.url;
    return (
    <section key={key} className={`${s.hero} ${hasImg ? s.heroHasImage : ''}`}>
      {hasImg && (
        <div
          className={s.heroBgImage}
          style={{ backgroundImage: `linear-gradient(rgba(11,17,32,.62), rgba(11,17,32,.62)), url("${heroImg.url}")` }}
          role="img"
          aria-label={heroImg.alt || hero?.hero_headline || ''}
        >
          <div className={s.heroBgBlur} style={{ backgroundImage: `url("${heroImg.url}")` }} />
          <div className={s.heroBgFull} style={{ backgroundImage: `url("${heroImg.url}")` }} />
        </div>
      )}
      <div className={s.heroInner}>
        {hero ? (
          <div>
            {hero._hero_kicker && (
              <div className={s.kicker}>
                <span className={s.kickerDot} /> {hero._hero_kicker}
              </div>
            )}

            <div className={s.heroPartnerRow}>
              <div className={s.heroPartnerPill}>
                <TrimmedLogo
                  src={hero.partner_1_logo_src || hero.partner_1_logo?.url || '/assets/images/logo-front.webp'}
                  alt="qBotica"
                />
              </div>
              {hero.partner_2_logo?.url && (
                <>
                  <span className={s.heroX}>&times;</span>
                  <div className={s.heroPartnerPill}>
                    <TrimmedLogo
                      src={hero.partner_2_logo_src || hero.partner_2_logo.url}
                      alt={hero.partner_2_logo.alt || 'Partner'}
                    />
                  </div>
                </>
              )}
            </div>

            <h1>
              {hero.headline_before} <em>{hero.hero_headline}</em> {hero.headline_after}
            </h1>
            <p className={s.heroSummary}>{hero.hero_summary}</p>

            <div className={s.metaRow}>
              {(hero.hero_tags || []).map((tag, i) => (
                <div key={i} className={s.metaPill}>{tag.tag_label}</div>
              ))}
            </div>
          </div>
        ) : (
          <div />
        )}
        {!hasImg && renderSpotlight(spotlight)}
      </div>
    </section>
    );
  };

  const renderPressMeta = (m, key) => (
    <section key={key} className={s.pressMeta}>
      <Reveal className={s.pressMetaGrid}>
        {m.published_date && <div className={s.pmi}><span>Published</span><strong>{m.published_date}</strong></div>}
        {m.location && <div className={s.pmi}><span>Location</span><strong>{m.location}</strong></div>}
        {m.category && <div className={s.pmi}><span>Category</span><strong>{m.category}</strong></div>}
        {m.focus && <div className={s.pmi}><span>Focus</span><strong>{m.focus}</strong></div>}
      </Reveal>
    </section>
  );

  const renderAccordions = (items) => {
    const abouts = items.filter((l) => l.acf_fc_layout === 'about_companies');
    const contacts = items.filter((l) => l.acf_fc_layout === 'media_contact');
    let n = 0;
    return (
      <section className={s.articleSection}>
        <h2 className={s.sectionTitle}>About the Companies</h2>
        <div className={s.accordionWrap}>
          {abouts.flatMap((a) => a.accordion_items || []).map((item, i) => {
            const key = `a${n++}`;
            return (
              <div key={`about-${i}`} className={`${s.accordion} ${openItem === key ? s.accordionActive : ''}`}>
                <button type="button" className={s.accordionHeader} onClick={() => toggle(key)}>
                  <div className={s.accordionHeaderLeft}>
                    {item.accordion_icon?.url && (
                      <img
                        src={item.accordion_icon.url}
                        alt={item.accordion_title}
                        style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
                      />
                    )}
                    {item.accordion_title}
                  </div>
                  <div className={s.accordionIcon}>+</div>
                </button>
                <div className={s.accordionContent}>
                  <div dangerouslySetInnerHTML={{ __html: formatRich(item.accordion_content) }} />
                  {item.accordion_link_url && (
                    <a href={item.accordion_link_url} target="_blank" rel="noreferrer" className={s.acLink}>
                      {item.accordion_link_text}
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {contacts.map((mc, ci) => {
            const key = `a${n++}`;
            return (
              <div key={`contact-${ci}`} className={`${s.accordion} ${openItem === key ? s.accordionActive : ''}`}>
                <button type="button" className={s.accordionHeader} onClick={() => toggle(key)}>
                  <div className={s.accordionHeaderLeft}>
                    <div className={s.accordionLogoMark} style={{ background: '#6B7280' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                      </svg>
                    </div>
                    Media Contact
                  </div>
                  <div className={s.accordionIcon}>+</div>
                </button>
                <div className={s.accordionContent}>
                  <div className={s.contactGrid}>
                    {(mc.contacts || []).map((c, i) => (
                      <div key={i} className={s.contactCard}>
                        <div className={s.contactCardLabel}>{c.contact_label}</div>
                        <div className={s.contactCardName}>{c.contact_name}</div>
                        <div className={s.contactCardDetail}>
                          {c.contact_email && <a href={`mailto:${c.contact_email}`}>{c.contact_email}</a>}
                          <br />
                          {c.contact_detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderBlock = (block, idx) => {
    const type = block.acf_fc_layout;

    if (type === 'article') {
      return (
        <Fragment key={idx}>
          <section className={`${s.articleSection} ${s.intro}`}>
            {(() => {
              const paras = String(block.intro_content || '').split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean);
              const dateline = (block.article_dateline || '').replace(/[\s|]+$/, '');
              return paras.map((para, pi) => (
                <p key={pi}>
                  {pi === 0 && dateline && (
                    <>
                      <span className={s.dateline}>{dateline}</span>
                      {' '}&mdash;{' '}
                    </>
                  )}
                  <span dangerouslySetInnerHTML={{ __html: formatInline(para) }} />
                </p>
              ));
            })()}
            {block.intro_content2 && String(block.intro_content2).split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean).map((para, pi) => (
              <p key={`b${pi}`} dangerouslySetInnerHTML={{ __html: formatInline(para) }} />
            ))}
          </section>

          {block.tech_section_content && block.tech_section_content.trim() && (
            <section
              className={`${s.articleSection} ${s.techSection}`}
              dangerouslySetInnerHTML={{ __html: formatRich(block.tech_section_content) }}
            />
          )}

          {(block.quotes || []).map((q, i) => (
            <section key={i} className={`${s.articleSection} ${s.quote}`}>
              <div className={s.quoteHead}>
                <div className={s.quoteAvatar} style={{ background: q.quote_avatar_color }}>
                  {q.quote_initials}
                </div>
                <div>
                  <div className={s.quoteCiteName}>{q.quote_name}</div>
                  <div className={s.quoteCiteRole}>{q.quote_role}</div>
                </div>
              </div>
              <blockquote>&ldquo;{q.quote_text}&rdquo;</blockquote>
            </section>
          ))}
        </Fragment>
      );
    }

    if (type === 'intro_section' || type === 'content_section') {
      if (!block.section_content || !block.section_content.trim()) return null; // skip empty rows
      return (
        <section key={idx} className={s.articleSection}>
          {block.section_heading && <h2 className={s.sectionTitle}>{block.section_heading}</h2>}
          {block.section_logo?.url && (() => {
            const logoImg = (
              <img
                src={block.section_logo.url}
                alt={block.section_logo.alt || block.section_heading || ''}
                className={s.qubiLogo}
              />
            );
            // Link source (first match wins):
            // 1) optional ACF field `section_logo_url`
            // 2) the image's Media Library "Description" or "Caption" if it is a URL
            const isUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v.trim());
            const fieldUrl =
              typeof block.section_logo_url === 'string'
                ? block.section_logo_url
                : block.section_logo_url?.url || '';
            const logoHref = [fieldUrl, block.section_logo.description, block.section_logo.caption]
              .map((v) => (typeof v === 'string' ? v.trim() : ''))
              .find(isUrl) || '';
            return logoHref ? (
              <a href={logoHref} target="_blank" rel="noreferrer" className={s.qubiLogoLink}>
                {logoImg}
              </a>
            ) : (
              <div className={s.qubiLogoLink}>{logoImg}</div>
            );
          })()}
          <div className={s.sectionBody} dangerouslySetInnerHTML={{ __html: formatRich(block.section_content) }} />
        </section>
      );
    }

    if (type === 'outcomes') {
      return (
        <section key={idx} className={s.articleSection}>
          <h2 className={s.sectionTitle}>{block.outcomes_title}</h2>
          <div className={s.outcomeGrid}>
            {(block.outcomes_list || []).map((o, i) => (
              <div key={i} className={s.outcomeCard}>
                <div className={s.outcomeNumber}>{o.outcome_number}</div>
                <h3>{o.outcome_title}</h3>
                <p>{o.outcome_description}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (type === 'market_focus') {
      return (
        <section key={idx} className={s.articleSection}>
          <h2 className={s.sectionTitle}>{block.market_focus_title}</h2>
          <div className={s.marketTags}>
            {(block.market_tags || []).map((tag, i) => (
              <span key={i} className={`${s.marketTag} ${tag.is_active ? s.marketTagActive : ''}`}>
                {tag.tag_name}
              </span>
            ))}
          </div>
          <p>{block.market_focus_description}</p>
          {block.market_focus_link_1_url && (
            <p>
              {block.market_focus_links_text}{' '}
              <a href={block.market_focus_link_1_url} target="_blank" rel="noreferrer">
                {block.market_focus_link_1_text}
              </a>
              {block.market_focus_link_2_url && (
                <>
                  {' '}and{' '}
                  <a href={block.market_focus_link_2_url} target="_blank" rel="noreferrer">
                    {block.market_focus_link_2_text}
                  </a>
                </>
              )}.
            </p>
          )}
        </section>
      );
    }

    return null;
  };

  const renderBody = (items, key) => {
    let accordionsDone = false;
    return (
      <main key={key} className={s.articleWrap}>
        <Reveal className={s.article}>
          <article>
            {items.map((block, idx) => {
              const t = block.acf_fc_layout;
              if (t === 'about_companies' || t === 'media_contact') {
                if (accordionsDone) return null;
                accordionsDone = true;
                return <Fragment key={idx}>{renderAccordions(items)}</Fragment>;
              }
              return renderBlock(block, idx);
            })}
          </article>
        </Reveal>
      </main>
    );
  };

  const renderRelated = (r, key) => (
    <Reveal key={key}>
      <section className={s.related}>
        <div className={s.relatedInner}>
          <div className={s.relatedHeader}>
            <h2>{r.related_news_title || 'Related News'}</h2>
            <p>{r.related_news_description}</p>
          </div>
          <div className={s.relatedGrid}>
            {(r.related_articles || []).map((a, i) => {
              const bgStyle = {
                backgroundImage: `linear-gradient(to bottom, rgba(11,17,32,.08), rgba(11,17,32,.88)), url('${a.article_image?.url || ''}')`,
              };
              return (
                <a key={i} href={a.article_url || '#'} target="_blank" rel="noreferrer" className={s.relatedCard} style={bgStyle}>
                  <span>{a.article_tag}</span>
                  <h3>{a.article_title}</h3>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </Reveal>
  );

  const renderCta = (c, key) => (
    <section key={key} className={s.cta}>
      <div className={s.ctaInner}>
        <h2>{renderCtaTitle(c.cta_title)}</h2>
        <p>{c.cta_description}</p>
        <div className={s.ctaActions}>
          <a href={c.cta_primary_url || '#'} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnPrimary}`}>
            {c.cta_primary_text}
          </a>
          <a href={c.cta_secondary_url || '#'} className={`${s.btn} ${s.btnSecondary}`}>
            {c.cta_secondary_text}
          </a>
        </div>
      </div>
    </section>
  );

  return (
    <div className={s.apPage}>
      {sections.map((sec, i) => {
        switch (sec.kind) {
          case 'hero': return renderHero(sec.hero, sec.spotlight, i);
          case 'pressMeta': return renderPressMeta(sec.data, i);
          case 'body': return renderBody(sec.items, i);
          case 'related': return renderRelated(sec.data, i);
          case 'cta': return renderCta(sec.data, i);
          default: return null;
        }
      })}
    </div>
  );
}