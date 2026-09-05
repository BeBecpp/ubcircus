// Builds the canonical sample content used by the API seeder and the web demo mode.
// Everything here is clearly labelled sample content. No real history, people, prices,
// addresses or ticket links are asserted. Output:
//   apps/api/app/seed/content.json   (API seed — source of truth)
//   apps/web/lib/content/demo.json   (identical copy for CONTENT_MODE=demo)
import { mkdirSync, writeFileSync } from 'node:fs';

const tr = (mn, en, trk) => ({ mn, en, tr: trk });
const uuid = (block, n) => `${String(block).padStart(2, '0')}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const at = (date, time) => `${date}T${time}:00+08:00`;
const NOW = '2026-09-05T09:00:00+08:00';

/* ---------- media ---------- */
const mediaDefs = [
  ['poster-01', 600, 800, 'posters', tr('«Тойрог» тоглолтын постер — тайзны судалбар', 'Poster study for The Ring — concentric stage geometry', '«Çember» afiş etüdü — sahne geometrisi')],
  ['poster-02', 600, 800, 'posters', tr('«Таталцал» тоглолтын постер — агаарын шугамууд', 'Poster study for Gravity — aerial line field', '«Yerçekimi» afiş etüdü — hava çizgileri')],
  ['poster-03', 600, 800, 'posters', tr('«Улаан утас» тоглолтын постер', 'Poster study for Red Thread — rotating ellipses', '«Kırmızı İplik» afiş etüdü')],
  ['poster-04', 600, 800, 'posters', tr('«Завсар» тоглолтын постер', 'Poster study for Interlude — motion paths', '«Ara» afiş etüdü')],
  ['poster-05', 600, 800, 'posters', tr('«Тэнцвэр» тоглолтын постер', 'Poster study for Balance — wire tension', '«Denge» afiş etüdü')],
  ['poster-06', 600, 800, 'posters', tr('«Шөнийн судалбар» постер', 'Poster study for Night Study — dust field', '«Gece Etüdü» afiş etüdü')],
  ['stage-01', 1600, 900, 'performances', tr('Тойргийн шал — тайзны судалбар', 'Ring floor — stage study', 'Çember zemini — sahne etüdü')],
  ['stage-02', 1600, 900, 'behind-the-scenes', tr('Олсны хурцадмал байдал — судалбар', 'Rope tension — stage study', 'İp gerilimi — sahne etüdü')],
  ['stage-03', 1600, 900, 'performances', tr('Хөдөлгөөний зам — судалбар', 'Motion path — stage study', 'Hareket yolu — sahne etüdü')],
  ['stage-04', 1600, 900, 'photography', tr('Прожекторын гэрэл — судалбар', 'Spotlight — stage study', 'Spot ışığı — sahne etüdü')],
  ['archive-02', 1600, 900, 'behind-the-scenes', tr('Архивын хэлтэрхий — судалбар', 'Archive fragment — study', 'Arşiv parçası — etüt')],
  ['video-poster', 1600, 900, 'videos', tr('Тоглолтын киноны постер', 'Performance film poster', 'Gösteri filmi afişi')],
];
const media = mediaDefs.map(([file, width, height, category, alt], i) => ({
  id: uuid(5, i + 1),
  kind: 'image',
  url: `/placeholders/${file}.svg`,
  object_key: null,
  file_name: `${file}.svg`,
  mime_type: 'image/svg+xml',
  size: 4000,
  width,
  height,
  alt,
  caption: tr('Загвар зураг · Бодит гэрэл зураг биш', 'Sample artwork · Not a photograph', 'Örnek görsel · Fotoğraf değildir'),
  credit: 'UB Circus studio · sample',
  photographer: '',
  focal_x: 0.5,
  focal_y: 0.45,
  category,
  tags: [category, 'sample'],
  created_at: NOW,
  updated_at: NOW,
}));
const m = Object.fromEntries(media.map((asset, i) => [mediaDefs[i][0], asset.id]));

/* ---------- categories ---------- */
const eventCategories = [
  ['contemporary', tr('Орчин үеийн цирк', 'Contemporary circus', 'Çağdaş sirk')],
  ['aerial', tr('Агаарын урлаг', 'Aerial', 'Hava akrobasisi')],
  ['family', tr('Гэр бүлд зориулсан', 'Family', 'Aile')],
  ['acrobatics', tr('Акробат', 'Acrobatics', 'Akrobasi')],
].map(([slug, labels], i) => ({ id: uuid(2, i + 1), slug, kind: 'event', labels, display_order: i }));
const articleCategories = [
  ['studio-notes', tr('Тайзны тэмдэглэл', 'Studio notes', 'Stüdyo notları')],
  ['interviews', tr('Ярилцлага', 'Interviews', 'Söyleşiler')],
  ['archive', tr('Архив', 'Archive', 'Arşiv')],
].map(([slug, labels], i) => ({ id: uuid(3, i + 1), slug, kind: 'article', labels, display_order: i }));
const cat = (slug) => [...eventCategories, ...articleCategories].find((c) => c.slug === slug).id;

/* ---------- venue ---------- */
const venues = [{
  id: uuid(4, 1),
  slug: 'main-arena',
  name: tr('Үндсэн танхим · загвар', 'Main arena · sample', 'Ana salon · örnek'),
  address: tr('Хаяг баталгаажаагүй. Редакц баталгаажуулсны дараа нийтэлнэ.', 'Address not yet verified. The editorial team will publish it once confirmed.', 'Adres henüz doğrulanmadı. Editörler onayladıktan sonra yayınlanacaktır.'),
  directions: tr('Нийтийн тээвэр, автомашины зогсоолын мэдээллийг баталгаажуулж байна.', 'Public transport and parking directions are being confirmed.', 'Toplu taşıma ve otopark bilgileri doğrulanıyor.'),
  accessibility: tr('Хүртээмжийн мэдээлэл (тэргэнцэр, сонсголын дэмжлэг, туслах) удахгүй нийтлэгдэнэ.', 'Accessibility information (step-free access, hearing support, companions) will be published soon.', 'Erişilebilirlik bilgileri yakında yayınlanacaktır.'),
  hours: tr('Кассын цагийг баталгаажуулж байна.', 'Box office hours are being confirmed.', 'Gişe saatleri doğrulanıyor.'),
  notes: tr('Тоглолт эхлэхээс 45 минутын өмнө ирэхийг зөвлөж байна.', 'We recommend arriving 45 minutes before the performance begins.', 'Gösteriden 45 dakika önce gelmenizi öneririz.'),
  map_url: null,
  latitude: null,
  longitude: null,
  phone: '',
  email: '',
  verified: false,
  created_at: NOW,
  updated_at: NOW,
}];

/* ---------- events ---------- */
const ticket = (n) => ({ id: uuid(7, n), label: 'Тасалбар', url: 'https://example.com/tickets/sample', price: null, currency: 'MNT', note: 'Sample session · booking disabled' });
let sessionN = 0;
const session = (date, time, status = 'scheduled', withTicket = true) => {
  sessionN += 1;
  return { id: uuid(6, sessionN), starts_at: at(date, time), ends_at: null, status, ticket: withTicket ? ticket(sessionN) : null };
};
const eventDefs = [
  { slug: 'the-ring', cat: 'contemporary', poster: 'poster-01', hero: 'stage-01', duration: 75, names: tr('Тойрог', 'The Ring', 'Çember'), sub: tr('Тойргийн геометр дээрх хөдөлгөөний судалбар', 'A study of movement on the geometry of the ring', 'Çember geometrisi üzerine bir hareket etüdü'),
    excerpt: tr('Тайзны тойрог өөрөө гол дүр болно. Дугуй орон зайд хүний бие, олс, гэрэл хэрхэн харилцахыг судална.', 'The ring itself becomes the protagonist: bodies, rope and light negotiate a circular space.', 'Çemberin kendisi başrole geçer: bedenler, ip ve ışık dairesel bir alanda buluşur.'),
    sessions: [session('2026-09-09', '19:00'), session('2026-09-12', '15:00', 'sold_out'), session('2026-09-12', '19:00'), session('2026-09-13', '15:00'), session('2026-09-13', '19:00')], gallery: ['stage-01', 'stage-03', 'poster-01'], video: 1 },
  { slug: 'gravity', cat: 'aerial', poster: 'poster-02', hero: 'stage-02', duration: 60, names: tr('Таталцал', 'Gravity', 'Yerçekimi'), sub: tr('Агаарын урлагийн судалбар', 'An aerial study', 'Bir hava etüdü'),
    excerpt: tr('Дээшээ. Доошоо. Хооронд нь — амьсгал. Агаарын шугамууд дээрх хүндийн хүчний тухай.', 'Up. Down. Between them, a breath. A production about weight on aerial lines.', 'Yukarı. Aşağı. Arada bir nefes. Hava çizgileri üzerinde ağırlığa dair bir yapım.'),
    sessions: [session('2026-09-18', '19:00'), session('2026-09-19', '19:00'), session('2026-09-20', '15:00', 'cancelled', false)], gallery: ['stage-02', 'poster-02', 'stage-04'], video: 2 },
  { slug: 'red-thread', cat: 'family', poster: 'poster-03', hero: 'stage-04', duration: 80, names: tr('Улаан утас', 'Red Thread', 'Kırmızı İplik'), sub: tr('Гэр бүлд зориулсан тоглолт', 'A performance for families', 'Aileler için bir gösteri'),
    excerpt: tr('Нэг улаан утас тайзыг тойрон, дүрүүдийг холбоно. Бүх насныханд.', 'A single red thread crosses the ring and ties the characters together. For all ages.', 'Tek bir kırmızı iplik sahneyi dolaşır ve karakterleri birbirine bağlar. Her yaş için.'),
    sessions: [session('2026-09-26', '12:00'), session('2026-09-26', '15:00'), session('2026-09-27', '12:00'), session('2026-09-27', '15:00', 'sold_out')], gallery: ['poster-03', 'stage-03', 'archive-02'], video: null },
  { slug: 'interlude', cat: 'contemporary', poster: 'poster-04', hero: 'stage-03', duration: 50, names: tr('Завсар', 'Interlude', 'Ara'), sub: tr('Хоёр тоглолтын хоорондох чимээгүй байдал', 'The silence between two acts', 'İki perde arasındaki sessizlik'),
    excerpt: tr('Завсарлагааны үеэр тайз юу хийдэг вэ? Хөдөлгөөний замуудын тухай богино бүтээл.', 'What does a stage do during the interval? A short work about motion paths.', 'Sahne ara sırasında ne yapar? Hareket yolları üzerine kısa bir eser.'),
    sessions: [session('2026-10-03', '19:00'), session('2026-10-04', '19:00'), session('2026-10-10', '19:00')], gallery: ['stage-03', 'poster-04'], video: 3 },
  { slug: 'balance', cat: 'acrobatics', poster: 'poster-05', hero: 'stage-02', duration: 70, names: tr('Тэнцвэр', 'Balance', 'Denge'), sub: tr('Утас, хүндийн төв, итгэл', 'Wire, centre of mass, trust', 'Tel, ağırlık merkezi, güven'),
    excerpt: tr('Нэг утас. Нэг алхам. Тэнцвэрийн тухай акробат судалбар.', 'One wire. One step. An acrobatic study of balance.', 'Tek tel. Tek adım. Denge üzerine bir akrobasi etüdü.'),
    sessions: [session('2026-10-17', '19:00'), session('2026-10-18', '15:00'), session('2026-10-24', '19:00'), session('2026-11-07', '19:00')], gallery: ['poster-05', 'stage-02', 'stage-01'], video: null },
  { slug: 'night-study', cat: 'contemporary', poster: 'poster-06', hero: 'stage-04', duration: 65, names: tr('Шөнийн судалбар', 'Night Study', 'Gece Etüdü'), sub: tr('Улирлын нээлтийн судалбар', 'A season-opening study', 'Sezon açılış etüdü'),
    excerpt: tr('Харанхуй тайзан дээрх тоосонцор, гэрэл, хөдөлгөөн. Улирлыг нээсэн судалбар.', 'Dust, light and movement on a dark stage. The study that opened the season.', 'Karanlık sahnede toz, ışık ve hareket. Sezonu açan etüt.'),
    sessions: [session('2026-08-21', '19:00', 'scheduled', false), session('2026-08-22', '19:00', 'scheduled', false)], gallery: ['poster-06', 'stage-04'], video: null },
];
const descr = (names) => tr(
  `<p>Энэ бол шинэ хөтөлбөрийн боломжуудыг харуулах <strong>загвар тоглолт</strong> юм. «${names.mn}» нь бодит тоглолтын зар биш.</p><p>Бодит тоглолтын мэдээлэл, уран бүтээлчдийн нэрс, үргэлжлэх хугацаа болон тасалбарын холбоосыг редакц баталгаажуулсны дараа нийтэлнэ.</p><p>Тоглолт бүр олон удаагийн үзүүлбэртэй байж болно. Үзүүлбэр бүр тусдаа огноо, цаг, төлөвтэй.</p>`,
  `<p>This is a clearly labelled <strong>sample production</strong> demonstrating the new programme. “${names.en}” is not a real performance announcement.</p><p>Confirmed production information, artist credits, running time and ticket links will be published by the editorial team once verified.</p><p>A production can have many sessions. Every session carries its own date, time and status.</p>`,
  `<p>Bu, yeni programı göstermek için hazırlanmış <strong>örnek bir yapımdır</strong>. “${names.tr}” gerçek bir gösteri duyurusu değildir.</p><p>Doğrulanmış yapım bilgileri, sanatçı künyesi, süre ve bilet bağlantıları editörler tarafından yayınlanacaktır.</p><p>Bir yapımın birden fazla seansı olabilir. Her seansın kendi tarihi, saati ve durumu vardır.</p>`,
);
const credits = tr(
  '<p><em>Уран бүтээлчдийн нэрс баталгаажаагүй.</em> Найруулагч, хөгжим, гэрэл, хувцасны дизайн — редакц нэмнэ.</p>',
  '<p><em>Credits not yet confirmed.</em> Direction, music, lighting and costume design will be added by the editorial team.</p>',
  '<p><em>Künye henüz doğrulanmadı.</em> Yönetim, müzik, ışık ve kostüm tasarımı editörler tarafından eklenecektir.</p>',
);
const events = eventDefs.map((e, i) => ({
  id: uuid(1, i + 1),
  slug: e.slug,
  status: 'published',
  category_id: cat(e.cat),
  venue_id: venues[0].id,
  duration_minutes: e.duration,
  poster_id: m[e.poster],
  hero_id: m[e.hero],
  video_id: e.video ? uuid(8, e.video) : null,
  gallery_ids: e.gallery.map((g) => m[g]),
  sample: true,
  published_at: '2026-08-15T10:00:00+08:00',
  created_at: NOW,
  updated_at: NOW,
  credits,
  translations: {
    mn: { title: e.names.mn, subtitle: e.sub.mn, excerpt: e.excerpt.mn, description: descr(e.names).mn, audience: '6+ нас · Загвар', seo_title: `${e.names.mn} · UB CIRCUS`, seo_description: e.excerpt.mn },
    en: { title: e.names.en, subtitle: e.sub.en, excerpt: e.excerpt.en, description: descr(e.names).en, audience: 'Ages 6+ · Sample', seo_title: `${e.names.en} · UB CIRCUS`, seo_description: e.excerpt.en },
    tr: { title: e.names.tr, subtitle: e.sub.tr, excerpt: e.excerpt.tr, description: descr(e.names).tr, audience: '6+ yaş · Örnek', seo_title: `${e.names.tr} · UB CIRCUS`, seo_description: e.excerpt.tr },
  },
  sessions: e.sessions,
}));

/* ---------- videos ---------- */
const videos = [
  { n: 1, poster: 'video-poster', featured: true, title: tr('Тойрог · тоглолтын кино', 'The Ring · performance film', 'Çember · gösteri filmi') },
  { n: 2, poster: 'stage-02', featured: false, title: tr('Таталцал · трейлер', 'Gravity · trailer', 'Yerçekimi · fragman') },
  { n: 3, poster: 'stage-03', featured: false, title: tr('Завсар · тайзны ард', 'Interlude · behind the stage', 'Ara · sahne arkası') },
].map((v, i) => ({
  id: uuid(8, v.n),
  youtube_id: null,
  poster_id: m[v.poster],
  featured: v.featured,
  display_order: i,
  status: 'published',
  sample: true,
  created_at: NOW,
  updated_at: NOW,
  translations: {
    mn: { title: v.title.mn, subtitle: 'Загвар видео · YouTube холбоос хараахан нэмэгдээгүй', description: 'Редактор баталгаажсан YouTube холбоосыг нэмсний дараа тоглуулагч энд идэвхжинэ.' },
    en: { title: v.title.en, subtitle: 'Sample video · YouTube link not yet added', description: 'The player activates here once an editor adds a verified YouTube link.' },
    tr: { title: v.title.tr, subtitle: 'Örnek video · YouTube bağlantısı henüz eklenmedi', description: 'Editör doğrulanmış bir YouTube bağlantısı ekledikten sonra oynatıcı burada etkinleşir.' },
  },
}));

/* ---------- galleries ---------- */
const galleries = [
  ['season-studies', 'performances', tr('Улирлын судалбарууд', 'Season studies', 'Sezon etütleri'), ['stage-01', 'stage-03', 'poster-01', 'poster-02', 'stage-02']],
  ['behind-the-curtain', 'behind-the-scenes', tr('Хөшигний ард', 'Behind the curtain', 'Perde arkası'), ['archive-02', 'stage-02', 'poster-04']],
  ['posters-2026', 'posters', tr('2026 оны постерууд', 'Posters 2026', '2026 afişleri'), ['poster-01', 'poster-02', 'poster-03', 'poster-04', 'poster-05', 'poster-06']],
  ['stage-light', 'photography', tr('Тайзны гэрэл', 'Stage light', 'Sahne ışığı'), ['stage-04', 'stage-01', 'poster-06']],
].map(([slug, category, title, items], i) => ({
  id: uuid(9, i + 1),
  slug,
  status: 'published',
  category,
  sample: true,
  created_at: NOW,
  updated_at: NOW,
  translations: {
    mn: { title: title.mn, description: 'Загвар цуглуулга. Бодит гэрэл зургийг редакц нэмнэ.' },
    en: { title: title.en, description: 'Sample collection. Verified photography will be added by the editorial team.' },
    tr: { title: title.tr, description: 'Örnek koleksiyon. Doğrulanmış fotoğraflar editörler tarafından eklenecektir.' },
  },
  items: items.map((file, j) => ({ id: uuid(10, i * 10 + j + 1), media_id: m[file], display_order: j, caption: null })),
}));

/* ---------- articles ---------- */
const articleDefs = [
  ['the-space-between', 'studio-notes', 'archive-02', '2026-09-01', tr('Хөдөлгөөний хооронд', 'The space between', 'Hareketin arasında'), tr('Тайзны цаадах ертөнцийг нээх редакцын шинэ орон зай.', 'An editorial space for the world behind the curtain.', 'Perde arkasındaki dünyaya açılan bir alan.')],
  ['a-study-in-light', 'studio-notes', 'stage-04', '2026-08-26', tr('Гэрлийн судалбар', 'A study in light', 'Işık üzerine'), tr('Прожектор хэрхэн орон зайг зохион байгуулдаг тухай.', 'How a single spotlight organises a space.', 'Tek bir spot ışığının mekânı nasıl düzenlediği üzerine.')],
  ['before-the-curtain', 'interviews', 'stage-02', '2026-08-19', tr('Хөшиг нээгдэхийн өмнө', 'Before the curtain', 'Perdeden önce'), tr('Тоглолтын өмнөх 45 минутын тухай ярилцлага (загвар).', 'A conversation about the 45 minutes before a performance (sample).', 'Gösteriden önceki 45 dakika üzerine bir söyleşi (örnek).')],
  ['rope-and-breath', 'studio-notes', 'stage-03', '2026-08-12', tr('Олс ба амьсгал', 'Rope and breath', 'İp ve nefes'), tr('Агаарын урлагийн бэлтгэлийн тэмдэглэл.', 'Notes from an aerial rehearsal.', 'Bir hava akrobasisi provasından notlar.')],
  ['the-archive-room', 'archive', 'stage-01', '2026-08-05', tr('Архивын өрөө', 'The archive room', 'Arşiv odası'), tr('Архивыг хэрхэн дижитал болгох тухай.', 'On turning an archive into a living digital stage.', 'Bir arşivi yaşayan dijital bir sahneye dönüştürmek üzerine.')],
];
const body = (title, img) => ({
  mn: `<p class="lede">Энэ бол <strong>загвар нийтлэл</strong>. Баталгаажсан эх сурвалж, ярилцлага, дүрс материалыг нийтлэлийн редактор энд оруулна.</p><p>«${title.mn}» гэдэг гарчиг нь редакцын хэв маяг, олон хэлний бүтэц, зураг бүхий нийтлэлийн хуудсыг харуулах зорилготой.</p><figure data-media="${img}"><figcaption>Загвар зураг · тайзны судалбар</figcaption></figure><blockquote><p>Тайз бол хоосон орон зай биш — хүлээлт юм.</p><cite>Тайзны тэмдэглэл · загвар ишлэл</cite></blockquote><p>Дараагийн догол мөрүүд редакцын бодит агуулгаар солигдоно. Ишлэл, зураг, видео зэрэг элементүүдийг дэмжинэ.</p>`,
  en: `<p class="lede">This is a <strong>sample story</strong>. Verified interviews, original reporting and approved archive material will be added here by the editorial team.</p><p>The title “${title.en}” exists only to demonstrate the editorial voice, the multilingual structure and an image-led article page.</p><figure data-media="${img}"><figcaption>Sample artwork · stage study</figcaption></figure><blockquote><p>A stage is not an empty space. It is an expectation.</p><cite>Studio notes · sample quotation</cite></blockquote><p>The following paragraphs will be replaced by real editorial content. Quotes, images and video embeds are supported.</p>`,
  tr: `<p class="lede">Bu bir <strong>örnek yazıdır</strong>. Doğrulanmış söyleşiler ve arşiv materyalleri editörler tarafından eklenecektir.</p><p>“${title.tr}” başlığı yalnızca editoryal sesi, çok dilli yapıyı ve görsel odaklı makale sayfasını göstermek için vardır.</p><figure data-media="${img}"><figcaption>Örnek görsel · sahne etüdü</figcaption></figure><blockquote><p>Sahne boş bir alan değil, bir beklentidir.</p><cite>Stüdyo notları · örnek alıntı</cite></blockquote><p>Sonraki paragraflar gerçek editoryal içerikle değiştirilecektir.</p>`,
});
const articles = articleDefs.map(([slug, category, img, date, title, excerpt], i) => ({
  id: uuid(11, i + 1),
  slug,
  status: 'published',
  category_id: cat(category),
  lead_image_id: m[img],
  published_at: at(date, '09:00'),
  sample: true,
  reading_minutes: 3 + i,
  created_at: NOW,
  updated_at: NOW,
  translations: {
    mn: { title: title.mn, subtitle: 'Тайзны тэмдэглэл · Загвар нийтлэл', excerpt: excerpt.mn, body: body(title, m[img]).mn, seo_title: `${title.mn} · UB CIRCUS`, seo_description: excerpt.mn },
    en: { title: title.en, subtitle: 'Studio notes · Sample story', excerpt: excerpt.en, body: body(title, m[img]).en, seo_title: `${title.en} · UB CIRCUS`, seo_description: excerpt.en },
    tr: { title: title.tr, subtitle: 'Stüdyo notları · Örnek yazı', excerpt: excerpt.tr, body: body(title, m[img]).tr, seo_title: `${title.tr} · UB CIRCUS`, seo_description: excerpt.tr },
  },
}));

/* ---------- pages ---------- */
const pages = [
  ['about', tr('Бидний тухай', 'About', 'Hakkımızda'), tr('Улаанбаатарын цирк — хөдөлгөөний байшин', 'Ulaanbaatar Circus — a house of movement', 'Ulanbatur Sirki — bir hareket evi'),
    tr('<p class="lede">Энэ хуудасны түүхэн мэдээлэл хараахан баталгаажаагүй. Байгуулагдсан он, барилга, уран бүтээлчдийн тухай баталгаатай мэдээллийг редакц нийтэлнэ.</p><p>Одоогоор энэ орон зай нь байгууллагын хуудасны бүтэц — том зураг, он цагийн тэмдэглэгээ, богино текст, архивын хэлтэрхий — хэрхэн ажиллахыг харуулж байна.</p>',
      '<p class="lede">The history on this page has not yet been verified. Founding dates, the building and the people behind the circus will be published by the editorial team once confirmed.</p><p>For now this space demonstrates how the institutional page works: a large image, an oversized year marker, a short text and archive fragments.</p>',
      '<p class="lede">Bu sayfadaki tarihçe henüz doğrulanmadı. Kuruluş tarihleri, bina ve sirkin arkasındaki insanlar doğrulandıktan sonra yayınlanacaktır.</p><p>Şimdilik bu alan kurumsal sayfanın nasıl çalıştığını gösterir.</p>')],
  ['visit', tr('Зочлох', 'Visit', 'Ziyaret'), tr('Айлчлалаа төлөвлөх', 'Plan your visit', 'Ziyaretinizi planlayın'),
    tr('<p class="lede">Хаяг, чиглэл, хүртээмж, кассын цаг зэрэг мэдээллийг баталгаажуулж байна.</p>', '<p class="lede">Address, directions, accessibility and box-office hours are being confirmed.</p>', '<p class="lede">Adres, ulaşım, erişilebilirlik ve gişe saatleri doğrulanıyor.</p>')],
  ['contact', tr('Холбоо барих', 'Contact', 'İletişim'), tr('Бидэнтэй холбогдох', 'Get in touch', 'Bize ulaşın'),
    tr('<p class="lede">Асуулт, хамтын ажиллагаа, хэвлэлийн хүсэлтээ илгээнэ үү.</p>', '<p class="lede">Send us a question, a partnership idea or a press request.</p>', '<p class="lede">Sorularınızı, iş birliği fikirlerinizi veya basın taleplerinizi gönderin.</p>')],
].map(([slug, title, subtitle, html], i) => ({
  id: uuid(12, i + 1),
  slug,
  status: 'published',
  settings: {},
  created_at: NOW,
  updated_at: NOW,
  translations: {
    mn: { title: title.mn, subtitle: subtitle.mn, body: html.mn, seo_title: `${title.mn} · UB CIRCUS`, seo_description: subtitle.mn },
    en: { title: title.en, subtitle: subtitle.en, body: html.en, seo_title: `${title.en} · UB CIRCUS`, seo_description: subtitle.en },
    tr: { title: title.tr, subtitle: subtitle.tr, body: html.tr, seo_title: `${title.tr} · UB CIRCUS`, seo_description: subtitle.tr },
  },
}));

/* ---------- homepage ---------- */
const ev = (slug) => events.find((e) => e.slug === slug).id;
const art = (slug) => articles.find((a) => a.slug === slug).id;
let itemN = 0;
const items = (resource, ids) => ids.map((resource_id, i) => { itemN += 1; return { id: uuid(14, itemN), resource, resource_id, display_order: i }; });
const homepage_sections = [
  { kind: 'hero_orbit', settings: { caption: tr('ТАЙЗНЫ СУДАЛБАР / 2026', 'STAGE STUDIES / 2026', 'SAHNE ETÜTLERİ / 2026') }, items: items('event', ['the-ring', 'gravity', 'red-thread', 'interlude', 'balance', 'night-study'].map(ev)) },
  { kind: 'next_on_stage', settings: { limit: 4, mode: 'auto' }, items: [] },
  { kind: 'featured_performances', settings: {}, items: items('event', ['the-ring', 'gravity', 'red-thread', 'interlude', 'balance'].map(ev)) },
  { kind: 'whats_on', settings: { limit: 8 }, items: [] },
  { kind: 'featured_video', settings: {}, items: items('video', [videos[0].id]) },
  { kind: 'in_motion', settings: {}, items: items('media', ['stage-02', 'poster-03', 'stage-03', 'poster-05', 'stage-04', 'archive-02', 'poster-06'].map((f) => m[f])) },
  { kind: 'stories', settings: {}, items: items('article', ['the-space-between', 'a-study-in-light', 'before-the-curtain', 'rope-and-breath'].map(art)) },
  { kind: 'about_feature', settings: { year_label: '2026', year_caption: tr('Улирал', 'Season', 'Sezon'), title: tr('Хөдөлгөөний байшин', 'A house of movement', 'Bir hareket evi'), body: tr('Байгууллагын баталгаажсан түүхийг редакц нийтлэх хүртэл энэ хэсэг загвар текстээр дүүрсэн байна.', 'Until the editorial team publishes the verified history of the institution, this feature carries sample text.', 'Kurumun doğrulanmış tarihçesi yayınlanana kadar bu alan örnek metin taşır.'), image_id: m['archive-02'], href: '/about' }, items: [] },
  { kind: 'plan_your_visit', settings: { venue_id: venues[0].id }, items: [] },
].map((s, i) => ({ id: uuid(13, i + 1), enabled: true, display_order: i, ...s }));

/* ---------- navigation ---------- */
const navigation_items = [
  ['header', '/events', tr('Тоглолтууд', 'Performances', 'Gösteriler')],
  ['header', '/calendar', tr('Хуанли', 'Calendar', 'Takvim')],
  ['header', '/stories', tr('Нийтлэл', 'Stories', 'Hikâyeler')],
  ['header', '/media', tr('Архив', 'Media', 'Arşiv')],
  ['header', '/about', tr('Бидний тухай', 'About', 'Hakkımızda')],
  ['header', '/visit', tr('Зочлох', 'Visit', 'Ziyaret')],
  ['footer', '/events', tr('Тоглолтууд', 'Performances', 'Gösteriler')],
  ['footer', '/stories', tr('Нийтлэл', 'Stories', 'Hikâyeler')],
  ['footer', '/media', tr('Архив', 'Media', 'Arşiv')],
  ['footer', '/about', tr('Бидний тухай', 'About', 'Hakkımızda')],
  ['footer', '/visit', tr('Зочлох', 'Visit', 'Ziyaret')],
  ['footer', '/contact', tr('Холбоо барих', 'Contact', 'İletişim')],
].map(([group, href, label], i) => ({ id: uuid(15, i + 1), group, href, label, display_order: i, parent_id: null, external: false }));

/* ---------- settings ---------- */
const site_settings = [
  { key: 'site', value: { name: 'UB CIRCUS', wordmark_sub: 'УЛААНБААТАР', tagline: tr('Хөдөлгөөн. Гайхамшиг. Нэг тайз.', 'Movement. Wonder. One ring.', 'Hareket. Hayranlık. Tek sahne.'), description: tr('Улаанбаатар цирк. Тоглолт, хөдөлгөөн, тайзны ертөнц.', 'Ulaanbaatar Circus. Performances, movement and the world of the ring.', 'Ulanbatur Sirki. Gösteriler, hareket ve sahne dünyası.'), contact_email: '', phone: '', social: {} } },
  { key: 'locales', value: { enabled: ['mn', 'en', 'tr'], default: 'mn' } },
  { key: 'seo', value: { title_template: '%s · UB CIRCUS', og_image_id: m['stage-01'], index: false } },
  { key: 'contact', value: { categories: ['general', 'tickets', 'partnership', 'press', 'venue'] } },
];

const content = { version: 1, generated_at: NOW, sample: true, media, event_categories: eventCategories, article_categories: articleCategories, venues, events, videos, galleries, articles, pages, homepage_sections, navigation_items, site_settings };
const json = JSON.stringify(content, null, 1);
for (const target of ['apps/api/app/seed', 'apps/web/lib/content']) mkdirSync(target, { recursive: true });
writeFileSync('apps/api/app/seed/content.json', json);
writeFileSync('apps/web/lib/content/demo.json', json);
console.log(`content written: ${events.length} events, ${sessionN} sessions, ${articles.length} articles, ${media.length} media`);
