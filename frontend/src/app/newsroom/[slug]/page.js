import { notFound } from 'next/navigation';
import AtolioPartnershipClient from '@/components/AtolioPartnershipClient';
import { generatePageMetadatas, getStructuredData } from '@/lib/rankmath-utils';
import StructuredData from '@/components/Common/StructuredData';

// Legacy: older newsroom articles that were built as WordPress *pages*
// (acf.layouts). Kept so existing /newsroom/<page-slug> URLs keep working.
import { fetchPageBySlug } from '@/lib/wordpress';
import { DivTag, H1Tag, PTag } from '@/components/Common/HTMLTags';
import {
  DynamicComponent,
  applyPaddingToLayouts,
  processLayoutData,
} from '@/lib/page-layout-utils';

const parent_path = 'newsroom';

// Newsroom custom post type (ACF > Post Types, REST base "newsroom").
// acf_format=standard so image fields come back as objects with .url
async function fetchNewsroomPost(slug) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_WP_API_URL}/wp/v2/newsroom?slug=${slug}&status=publish&acf_format=standard`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching newsroom post:', error);
    return null;
  }
}

// Server-side logo trim: removes the empty margin around a logo so it fills the
// hero pill. Runs on the server, so no CORS problem. Falls back to the original
// image (returns null) if sharp is missing or the image can't be read.
const trimCache = new Map();
async function trimLogo(src) {
  if (!src) return null;
  if (trimCache.has(src)) return trimCache.get(src);
  let result = null;
  try {
    const sharp = (await import('sharp')).default;
    let buf;
    if (src.startsWith('/')) {
      const fs = await import('fs/promises');
      const path = await import('path');
      buf = await fs.readFile(path.join(process.cwd(), 'public', src));
    } else {
      const r = await fetch(src, { next: { revalidate: 3600 } });
      if (!r.ok) throw new Error(`logo fetch ${r.status}`);
      buf = Buffer.from(await r.arrayBuffer());
    }
    const out = await sharp(buf, { density: 144 })
      .trim({ threshold: 12 })
      .resize({ width: 600, withoutEnlargement: true })
      .png()
      .toBuffer();
    result = `data:image/png;base64,${out.toString('base64')}`;
  } catch (error) {
    console.error('Logo trim skipped:', src, error?.message);
  }
  trimCache.set(src, result);
  return result;
}

async function attachTrimmedLogos(post) {
  const hero = post?.acf?.atolio?.find((l) => l.acf_fc_layout === 'hero_section');
  if (!hero) return;
  hero.partner_1_logo_src = await trimLogo(
    hero.partner_1_logo?.url || '/assets/images/logo-front.webp'
  );
  if (hero.partner_2_logo?.url) {
    hero.partner_2_logo_src = await trimLogo(hero.partner_2_logo.url);
  }
}

function hasAtolioLayouts(post) {
  return Boolean(post?.acf?.atolio?.length);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await fetchNewsroomPost(slug);

  if (!hasAtolioLayouts(post)) {
    // Not a newsroom post: fall back to the legacy page metadata
    return generatePageMetadatas(slug, 'page', parent_path, {});
  }

  const heroSection = post.acf.atolio.find(
    (section) => section.acf_fc_layout === 'hero_section'
  );

  const pageTitle = (post?.title?.rendered || slug).replace(/<[^>]*>/g, '');
  const pageDescription =
    heroSection?.hero_summary || `Learn more about ${pageTitle}`;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://qbotica.com';
  const canonical = `${siteUrl}/${parent_path}/${slug}`;

  let metadata = {};
  try {
    metadata = await generatePageMetadatas(slug, 'page', parent_path, {
      title: pageTitle,
      description: pageDescription,
      canonical,
    });
  } catch (error) {
    console.error('Newsroom metadata error:', error);
  }

  return {
    ...metadata,
    title: pageTitle,
    description: pageDescription,
    openGraph: { ...(metadata.openGraph || {}), title: pageTitle, description: pageDescription, url: canonical },
    twitter: { ...(metadata.twitter || {}), title: pageTitle, description: pageDescription },
    alternates: { canonical },
  };
}

export default async function NewsroomEntry({ params }) {
  const { slug } = await params;
  const post = await fetchNewsroomPost(slug);

  // 1) Newsroom post type entry -> Atolio press-release design
  if (hasAtolioLayouts(post)) {
    await attachTrimmedLogos(post);
    let structuredData = null;
    try {
      const metadata = await generatePageMetadatas(slug, 'page', parent_path, {});
      structuredData = getStructuredData(metadata);
    } catch (error) {
      console.error('Newsroom structured data error:', error);
    }
    return (
      <main>
        {structuredData && <StructuredData data={structuredData} />}
        <AtolioPartnershipClient data={post} />
      </main>
    );
  }

  // 2) Legacy WordPress page under /newsroom/
  const pageData = await fetchPageBySlug(slug);
  if (!pageData) {
    notFound();
  }

  try {
    const metadata = await generatePageMetadatas(slug, 'page', parent_path, {});
    const structuredData = getStructuredData(metadata);

    if (!pageData.acf || !pageData.acf.layouts?.length) {
      return (
        <DivTag className="newsroom-single-page">
          <StructuredData data={structuredData} />
          <DivTag className="d-flex flex-column justify-content-center align-items-center text-center min-vh-100">
            <H1Tag>Welcome</H1Tag>
            <PTag>Content is being updated. Please check back soon.</PTag>
          </DivTag>
        </DivTag>
      );
    }

    const processedLayouts = applyPaddingToLayouts(pageData.acf.layouts);
    const finalLayouts = await processLayoutData(processedLayouts);
    return (
      <DivTag className="newsroom-single-page light-gray">
        <StructuredData data={structuredData} />
        {finalLayouts.map((item) => (
          <DynamicComponent
            key={`${item.layout.layout_type}-${item.index}`}
            layout={item.layout}
            data={item.data}
          />
        ))}
      </DivTag>
    );
  } catch (error) {
    console.error('Error rendering newsroom page:', error);
    return (
      <DivTag className="newsroom-single-page light-gray">
        <div className="text-center py-16">
          <h1>Something went wrong</h1>
          <p>We are experiencing technical difficulties. Please try again later.</p>
        </div>
      </DivTag>
    );
  }
}