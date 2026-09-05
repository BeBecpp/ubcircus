export const locales = ['mn', 'en', 'tr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'mn';
export function localeOf(value?: string): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}
export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
export function href(locale: Locale, path = '') {
  return `/${locale}${path}`;
}
export const localeNames: Record<Locale, string> = { mn: 'Монгол', en: 'English', tr: 'Türkçe' };

const mn = {
  performances: 'Тоглолтууд', calendar: 'Хуанли', stories: 'Нийтлэл', media: 'Архив', about: 'Бидний тухай', visit: 'Зочлох', contact: 'Холбоо барих', tickets: 'Тасалбар',
  city: 'УЛААНБААТАР', circus: 'ЦИРК', tagline: 'Хөдөлгөөн. Гайхамшиг. Нэг тайз.', season: 'ТАЙЗНЫ СУДАЛБАР / 2026',
  programme: 'Хөтөлбөр үзэх', scroll: 'Доош гүйлгэх', menu: 'Цэс', close: 'Хаах', view: 'Дэлгэрэнгүй', all: 'Бүгдийг үзэх', explore: 'Тайзны ертөнцөөр',
  next: 'Дараагийн тоглолт', upcoming: 'Удахгүй тайзнаа', featured: 'Онцлох тоглолтууд', whatsOn: 'Юу болж байна', film: 'Тоглолтын кино', inMotion: 'Цирк хөдөлгөөнд', storiesTitle: 'Хөшигний ард', aboutTitle: 'Бидний тухай', planVisit: 'Айлчлалаа төлөвлөх',
  sample: 'Загвар хөтөлбөр · Бодит тоглолтын зар биш', sampleShort: 'Загвар', quiet: 'Одоогоор тоглолт товлогдоогүй байна.', quietStories: 'Нийтлэл хараахан нийтлэгдээгүй байна.',
  filterAll: 'Бүгд', thisWeek: 'Энэ долоо хоног', thisMonth: 'Энэ сар', past: 'Өнгөрсөн', upcomingFilter: 'Удахгүй', category: 'Төрөл', date: 'Огноо', time: 'Цаг', venue: 'Танхим', duration: 'Үргэлжлэх хугацаа', minutes: 'мин', status: 'Төлөв', sessions: 'Үзүүлбэрүүд', session: 'Үзүүлбэр',
  scheduled: 'Тасалбар байна', soldOut: 'Дууссан', cancelled: 'Цуцлагдсан', book: 'Тасалбар захиалах', bookingSoon: 'Тасалбар удахгүй', sampleBooking: 'Загвар үзүүлбэр · захиалга идэвхгүй', pastSession: 'Болсон',
  introduction: 'Танилцуулга', description: 'Тайлбар', trailer: 'Трейлер', gallery: 'Зургийн цомог', credits: 'Уран бүтээлчид', visitInfo: 'Зочдод зориулсан мэдээлэл', related: 'Холбоотой тоглолтууд', audience: 'Үзэгчид', share: 'Хуваалцах', backToEvents: 'Бүх тоглолт',
  play: 'Тоглуулах', watch: 'Үзэх', noVideo: 'Видео удахгүй нэмэгдэнэ', loadPlayer: 'Тоглуулагч ачаалж байна', poster: 'Постер', photographer: 'Гэрэл зурагчин', credit: 'Эх сурвалж',
  readStory: 'Нийтлэл унших', readingTime: 'мин унших', relatedStories: 'Холбоотой нийтлэлүүд', allStories: 'Бүх нийтлэл', published: 'Нийтэлсэн',
  mediaTitle: 'Амьд архив', mediaIntro: 'Гэрэл зураг, тоглолт, тайзны ард, постер, видео.', photography: 'Гэрэл зураг', performancesCat: 'Тоглолтууд', behindScenes: 'Тайзны ард', posters: 'Постерууд', videos: 'Видео', openViewer: 'Томруулж үзэх', previous: 'Өмнөх', nextItem: 'Дараах',
  address: 'Хаяг', directions: 'Чиглэл', accessibility: 'Хүртээмж', hours: 'Кассын цаг', notes: 'Тэмдэглэл', map: 'Газрын зураг', mapSoon: 'Байршил баталгаажсаны дараа газрын зураг энд гарна.', unverified: 'Баталгаажаагүй мэдээлэл', phone: 'Утас', email: 'И-мэйл', contactSoon: 'Холбоо барих мэдээлэл удахгүй',
  contactIntro: 'Асуулт, хамтын ажиллагаа, хэвлэлийн хүсэлт.', name: 'Нэр', message: 'Мессеж', send: 'Илгээх', sending: 'Илгээж байна', sent: 'Таны мессеж хүлээн авагдлаа. Баярлалаа.', sendError: 'Илгээхэд алдаа гарлаа. Дахин оролдоно уу.', required: 'Заавал бөглөнө', invalidEmail: 'И-мэйл буруу байна', tooShort: 'Хэт богино байна', contactCategory: 'Асуудлын төрөл',
  general: 'Ерөнхий', ticketsCat: 'Тасалбар', partnership: 'Хамтын ажиллагаа', press: 'Хэвлэл', venueEvents: 'Танхим / Арга хэмжээ', demoContact: 'Загвар горимд мессеж илгээх боломжгүй.',
  year: 'Он', institution: 'Байгууллага', history: 'Түүх', historyPending: 'Түүхэн мэдээлэл баталгаажсаны дараа нийтлэгдэнэ.', archiveFragments: 'Архивын хэлтэрхийнүүд',
  footerLine: 'Хөдөлгөөн. Гайхамшиг. Нэг тайз.', backstage: 'Тайзны ард', rights: 'Бүх эрх хуулиар хамгаалагдсан', language: 'Хэл', skip: 'Агуулга руу шилжих', home: 'Нүүр',
  calendarTitle: 'Хуанли', month: 'Сар', week: 'Долоо хоног', today: 'Өнөөдөр', noPerformances: 'Энэ хугацаанд тоглолт байхгүй.', clearFilters: 'Шүүлтүүр цэвэрлэх', results: 'үр дүн', loading: 'Ачаалж байна', errorTitle: 'Агуулга ачаалагдсангүй', errorBody: 'Түр зуурын алдаа гарлаа. Дахин оролдоно уу.', retry: 'Дахин оролдох', notFound: 'Хуудас олдсонгүй', notFoundBody: 'Таны хайсан хуудас байхгүй эсвэл шилжсэн байна.',
  dragHint: 'Чирж эсвэл сумаар гүйлгэнэ', programmeKicker: 'Хөтөлбөр', selected: 'Сонгосон', of: '/', ringAfterDark: 'ХАРАНХУЙ ДАХЬ ТОЙРОГ', next7: 'Дараагийн 7 хоног', seeCalendar: 'Хуанли үзэх', more: 'Цааш', at: '',
};
type Copy = typeof mn;
const en: Copy = {
  performances: 'Performances', calendar: 'Calendar', stories: 'Stories', media: 'Media', about: 'About', visit: 'Visit', contact: 'Contact', tickets: 'Tickets',
  city: 'ULAANBAATAR', circus: 'CIRCUS', tagline: 'Movement. Wonder. One ring.', season: 'STAGE STUDIES / 2026',
  programme: 'Explore the programme', scroll: 'Scroll to discover', menu: 'Menu', close: 'Close', view: 'View', all: 'View all', explore: 'Enter the world of performance',
  next: 'Next on stage', upcoming: 'Upcoming performances', featured: 'Featured performances', whatsOn: "What's on", film: 'Performance film', inMotion: 'The circus in motion', storiesTitle: 'Stories from behind the curtain', aboutTitle: 'About', planVisit: 'Plan your visit',
  sample: 'Sample programme · Not real performance announcements', sampleShort: 'Sample', quiet: 'The ring is quiet for now. New dates will appear here.', quietStories: 'No stories have been published yet.',
  filterAll: 'All', thisWeek: 'This week', thisMonth: 'This month', past: 'Past', upcomingFilter: 'Upcoming', category: 'Category', date: 'Date', time: 'Time', venue: 'Venue', duration: 'Running time', minutes: 'min', status: 'Status', sessions: 'Sessions', session: 'Session',
  scheduled: 'Available', soldOut: 'Sold out', cancelled: 'Cancelled', book: 'Book tickets', bookingSoon: 'Tickets soon', sampleBooking: 'Sample session · booking disabled', pastSession: 'Past',
  introduction: 'Introduction', description: 'About the production', trailer: 'Trailer', gallery: 'Gallery', credits: 'Credits', visitInfo: 'Visitor information', related: 'Related performances', audience: 'Audience', share: 'Share', backToEvents: 'All performances',
  play: 'Play', watch: 'Watch', noVideo: 'Video coming soon', loadPlayer: 'Loading player', poster: 'Poster', photographer: 'Photographer', credit: 'Credit',
  readStory: 'Read the story', readingTime: 'min read', relatedStories: 'Related stories', allStories: 'All stories', published: 'Published',
  mediaTitle: 'Living archive', mediaIntro: 'Photography, performances, behind the scenes, posters and film.', photography: 'Photography', performancesCat: 'Performances', behindScenes: 'Behind the scenes', posters: 'Posters', videos: 'Videos', openViewer: 'Open full screen', previous: 'Previous', nextItem: 'Next',
  address: 'Address', directions: 'Directions', accessibility: 'Accessibility', hours: 'Box office hours', notes: 'Visitor notes', map: 'Map', mapSoon: 'A map appears here once the location is verified.', unverified: 'Unverified information', phone: 'Phone', email: 'Email', contactSoon: 'Contact details coming soon',
  contactIntro: 'Questions, partnerships and press requests.', name: 'Name', message: 'Message', send: 'Send', sending: 'Sending', sent: 'Your message has been received. Thank you.', sendError: 'Something went wrong. Please try again.', required: 'Required', invalidEmail: 'Enter a valid email address', tooShort: 'Too short', contactCategory: 'Topic',
  general: 'General', ticketsCat: 'Tickets', partnership: 'Partnership', press: 'Media / Press', venueEvents: 'Venue / Events', demoContact: 'Messages cannot be sent in demo mode.',
  year: 'Year', institution: 'Institution', history: 'History', historyPending: 'Historical information will be published once verified.', archiveFragments: 'Archive fragments',
  footerLine: 'Movement. Wonder. One ring.', backstage: 'Backstage', rights: 'All rights reserved', language: 'Language', skip: 'Skip to content', home: 'Home',
  calendarTitle: 'Calendar', month: 'Month', week: 'Week', today: 'Today', noPerformances: 'No performances in this period.', clearFilters: 'Clear filters', results: 'results', loading: 'Loading', errorTitle: 'Content could not be loaded', errorBody: 'A temporary error occurred. Please try again.', retry: 'Retry', notFound: 'Page not found', notFoundBody: 'The page you are looking for does not exist or has moved.',
  dragHint: 'Drag or use arrow keys', programmeKicker: 'Programme', selected: 'Selected', of: 'of', ringAfterDark: 'THE RING AFTER DARK', next7: 'Next 7 days', seeCalendar: 'See the calendar', more: 'More', at: 'at',
};
const tr: Copy = {
  performances: 'Gösteriler', calendar: 'Takvim', stories: 'Hikâyeler', media: 'Arşiv', about: 'Hakkımızda', visit: 'Ziyaret', contact: 'İletişim', tickets: 'Biletler',
  city: 'ULANBATUR', circus: 'SİRK', tagline: 'Hareket. Hayranlık. Tek sahne.', season: 'SAHNE ETÜTLERİ / 2026',
  programme: 'Programı keşfet', scroll: 'Keşfetmek için kaydır', menu: 'Menü', close: 'Kapat', view: 'İncele', all: 'Tümünü gör', explore: 'Performans dünyasına adım at',
  next: 'Sıradaki gösteri', upcoming: 'Yaklaşan gösteriler', featured: 'Öne çıkan gösteriler', whatsOn: 'Neler var', film: 'Gösteri filmi', inMotion: 'Hareket hâlinde sirk', storiesTitle: 'Perde arkasından hikâyeler', aboutTitle: 'Hakkımızda', planVisit: 'Ziyaretinizi planlayın',
  sample: 'Örnek program · Gerçek gösteri duyurusu değildir', sampleShort: 'Örnek', quiet: 'Henüz planlanmış gösteri yok.', quietStories: 'Henüz yayınlanmış hikâye yok.',
  filterAll: 'Tümü', thisWeek: 'Bu hafta', thisMonth: 'Bu ay', past: 'Geçmiş', upcomingFilter: 'Yaklaşan', category: 'Kategori', date: 'Tarih', time: 'Saat', venue: 'Mekân', duration: 'Süre', minutes: 'dk', status: 'Durum', sessions: 'Seanslar', session: 'Seans',
  scheduled: 'Bilet var', soldOut: 'Tükendi', cancelled: 'İptal', book: 'Bilet al', bookingSoon: 'Biletler yakında', sampleBooking: 'Örnek seans · satış kapalı', pastSession: 'Geçti',
  introduction: 'Giriş', description: 'Yapım hakkında', trailer: 'Fragman', gallery: 'Galeri', credits: 'Künye', visitInfo: 'Ziyaretçi bilgileri', related: 'İlgili gösteriler', audience: 'İzleyici', share: 'Paylaş', backToEvents: 'Tüm gösteriler',
  play: 'Oynat', watch: 'İzle', noVideo: 'Video yakında', loadPlayer: 'Oynatıcı yükleniyor', poster: 'Afiş', photographer: 'Fotoğrafçı', credit: 'Kaynak',
  readStory: 'Hikâyeyi oku', readingTime: 'dk okuma', relatedStories: 'İlgili hikâyeler', allStories: 'Tüm hikâyeler', published: 'Yayın',
  mediaTitle: 'Yaşayan arşiv', mediaIntro: 'Fotoğraf, gösteriler, sahne arkası, afişler ve film.', photography: 'Fotoğraf', performancesCat: 'Gösteriler', behindScenes: 'Sahne arkası', posters: 'Afişler', videos: 'Videolar', openViewer: 'Tam ekran aç', previous: 'Önceki', nextItem: 'Sonraki',
  address: 'Adres', directions: 'Ulaşım', accessibility: 'Erişilebilirlik', hours: 'Gişe saatleri', notes: 'Ziyaretçi notları', map: 'Harita', mapSoon: 'Konum doğrulandığında harita burada görünür.', unverified: 'Doğrulanmamış bilgi', phone: 'Telefon', email: 'E-posta', contactSoon: 'İletişim bilgileri yakında',
  contactIntro: 'Sorular, iş birlikleri ve basın talepleri.', name: 'Ad', message: 'Mesaj', send: 'Gönder', sending: 'Gönderiliyor', sent: 'Mesajınız alındı. Teşekkürler.', sendError: 'Bir sorun oluştu. Lütfen tekrar deneyin.', required: 'Zorunlu', invalidEmail: 'Geçerli bir e-posta girin', tooShort: 'Çok kısa', contactCategory: 'Konu',
  general: 'Genel', ticketsCat: 'Biletler', partnership: 'İş birliği', press: 'Basın', venueEvents: 'Mekân / Etkinlik', demoContact: 'Demo modunda mesaj gönderilemez.',
  year: 'Yıl', institution: 'Kurum', history: 'Tarihçe', historyPending: 'Tarihçe doğrulandıktan sonra yayınlanacaktır.', archiveFragments: 'Arşiv parçaları',
  footerLine: 'Hareket. Hayranlık. Tek sahne.', backstage: 'Sahne arkası', rights: 'Tüm hakları saklıdır', language: 'Dil', skip: 'İçeriğe geç', home: 'Ana sayfa',
  calendarTitle: 'Takvim', month: 'Ay', week: 'Hafta', today: 'Bugün', noPerformances: 'Bu dönemde gösteri yok.', clearFilters: 'Filtreleri temizle', results: 'sonuç', loading: 'Yükleniyor', errorTitle: 'İçerik yüklenemedi', errorBody: 'Geçici bir hata oluştu. Lütfen tekrar deneyin.', retry: 'Tekrar dene', notFound: 'Sayfa bulunamadı', notFoundBody: 'Aradığınız sayfa yok veya taşınmış.',
  dragHint: 'Sürükleyin veya ok tuşlarını kullanın', programmeKicker: 'Program', selected: 'Seçili', of: '/', ringAfterDark: 'KARANLIKTA ÇEMBER', next7: 'Sonraki 7 gün', seeCalendar: 'Takvime bak', more: 'Daha fazla', at: '',
};
export const copy: Record<Locale, Copy> = { mn, en, tr };
export type { Copy };

export const monthShort: Record<Locale, string[]> = {
  mn: ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  tr: ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'],
};
export const monthLong: Record<Locale, string[]> = {
  mn: ['Нэгдүгээр сар', 'Хоёрдугаар сар', 'Гуравдугаар сар', 'Дөрөвдүгээр сар', 'Тавдугаар сар', 'Зургаадугаар сар', 'Долоодугаар сар', 'Наймдугаар сар', 'Есдүгээр сар', 'Аравдугаар сар', 'Арван нэгдүгээр сар', 'Арван хоёрдугаар сар'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
};
export const weekdayShort: Record<Locale, string[]> = {
  mn: ['НЯ', 'ДА', 'МЯ', 'ЛХ', 'ПҮ', 'БА', 'БЯ'],
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  tr: ['PAZ', 'PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT'],
};
