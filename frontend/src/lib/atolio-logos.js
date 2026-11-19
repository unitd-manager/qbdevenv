// Shared helpers for Atolio-designed pages (used by /blog/[slug]).
// Fetches a WordPress *post* with ACF in "standard" format (image fields as objects with .url)
// and trims empty margins around the hero logos on the server so they fill the pill.

const WP_API = process.env.NEXT_PUBLIC_WP_API_URL;

export async function fetchAtolioPost(slug) {
  try {
    const res = await fetch(
      `${WP_API}/wp/v2/posts?slug=${slug}&status=publish&acf_format=standard&_embed=wp:featuredmedia`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const post = data?.[0] || null;
    if (!post?.acf?.atolio?.length) return null;
    // If Spotlight Image is empty, fall back to the post's Featured Image (thumbnail)
    const spot = post.acf.atolio.find((l) => l.acf_fc_layout === 'spotlight_');
    const feat = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    if (spot && !spot.spotlight_image && feat) spot.spotlight_image = { url: feat };
    return post;
  } catch (error) {
    console.error('Error fetching Atolio post:', error);
    return null;
  }
}

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

export async function attachTrimmedLogos(post) {
  const hero = post?.acf?.atolio?.find((l) => l.acf_fc_layout === 'hero_section');
  if (!hero) return;
  hero.partner_1_logo_src = await trimLogo(
    hero.partner_1_logo?.url || '/assets/images/logo-front.webp'
  );
  if (hero.partner_2_logo?.url) {
    hero.partner_2_logo_src = await trimLogo(hero.partner_2_logo.url);
  }
}