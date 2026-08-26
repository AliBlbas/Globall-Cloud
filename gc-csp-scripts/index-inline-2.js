/* ================= SUPABASE (real backend for admin / accountant) =================
   1. Create a free project at https://supabase.com
   2. Run supabase-schema.sql in its SQL Editor
   3. Paste your Project URL + anon public key below (Project Settings → API)
   The publishable key is DESIGNED to be public / embedded in frontend code — it is safe
   to publish, since access is enforced by the Row Level Security policies in the
   schema file, not by hiding this key. Never put your "service_role" key here. */
const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
let sb = (SUPABASE_URL.startsWith('http') && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : window.gcSupabase || null;
if (sb) window.sb = sb;
window.addEventListener('gc:supabase-ready', (event) => {
  sb = event.detail?.client || window.gcSupabase || sb;
  if (sb) {
    window.sb = sb;
    if (typeof renderAdminGate === 'function') void renderAdminGate();
  }
}, { once: true });
const STEP_KEYS = ['placed','pickedUp','transit','customs','outForDelivery','delivered'];

/* ================= OWNER NOTIFICATIONS =================

   New "Request a Quote" and "Contact" form submissions are emailed here

   automatically via FormSubmit.co (no backend needed). The FIRST submission

   after deploying will trigger a one-time "confirm your email" message from

   FormSubmit to this address — it must be clicked once before notifications

   start arriving. A WhatsApp quick-confirm button also uses this number. */

const OWNER_NOTIFY_EMAIL = 'tamanblbas271@gmail.com';

const OWNER_WHATSAPP = '9647507577137';



/* Accountant (محاسب) */

const ACCOUNTANT_EMAIL = 'aliblbas697@gmail.com';

async function notifyOwner(subject, fields){
  try{
    await fetch('https://formsubmit.co/ajax/'+OWNER_NOTIFY_EMAIL, {
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(Object.assign({_subject:subject}, fields))
    });
  }catch(e){ /* silent fail — never blocks the customer's success screen */ }
}

/* ================= I18N ================= */
const I18N = {
ku:{
  brand:{tagline:'لۆجستیک'},
  topbar:{note:'ڕێڕەوەکانی چین، دوبەی، ئەمریکا و هەولێر بەبەردەوامی چالاکن',support:'پشتیوانی زیندوو ٢٤/٧'},
  nav:{home:'سەرەکی',about:'دەربارەمان',services:'خزمەتگوزارییەکان',track:'شوێنکەوتن',contact:'پەیوەندی',signIn:'چوونەژوورەوە',dashboard:'داشبۆرد',quote:'داواکردنی نرخ'},
  hero:{eyebrow:'چین  ·  ئیمارات  ·  ئەمریکا  ·  هەولێر',title:'گەیاندنی بار بە متمانە، خێرایی و بێ سنوور',subtitle:'Globall Cloud کاڵاکانت بە شێوەیەکی ئاسایشدار لە چین، دوبەی و ئەمریکا بۆ هەولێر و هەموو شارەکانی عێراق دەگەیەنێت — بە شوێنکەوتنی ڕاستەوخۆ، ڕێکاری ڕوون و پشتیوانی ٢٤/٧.',ctaTrack:'شوێنکەوتنی بار',ctaQuote:'داواکردنی نرخ',ctaWhatsApp:'پەیوەندی بە واتساپ',route:{a:'گوانگژۆ، چین',b:'دوبەی، ئیمارات',c:'هەولێر، عێراق'},badge:'LIVE CORRIDOR',liveStatus:'Shipment moving right now',liveSub:'بارەکەت لە نێوان چین، دوبەی، ئەمریکا و هەولێر بە بەڵگە و شوێنکەوتنی زیندوو بەردەوامە و هەر نوێکارییەک زوو دەردەکەوێت.',routeOrigin:'سەرەتا / Origin Hub',routeTransit:'ترانزیت / Transit Hub',routeDestination:'گەیاندن / Delivery Hub'},
  trust:{s1v:'+٢٥K',s1l:'بار گەیەنراو',s2v:'١٢+',s2l:'شوێن و بازاڕ',s3v:'٢٤/٧',s3l:'پشتیوانی زیندوو',s4v:'٩٨%',s4l:'گەیاندنی لەکاتی خۆیدا'},
  liveTrack:{heading:'شوێنکەوتنی بارەکەت لە چرکەیەکدا',sub:'ژمارەی شوێنکەوتنەکەت بنووسە و نوێترین دۆخی بارەکەت ببینە',placeholder:'وەک GC10052341',button:'شوێنکەوتن'},
  business:{eyebrow:'پەڕەکانی بازرگانی',heading:'هەموو خزمەتگوزاری و پەڕە گرنگەکان لە یەک شوێن',sub:'بە یەک کلیک بچۆ بۆ خزمەتگوزاری، خەملاندنی نرخ، داشبۆرد، کۆگاکان و پەیوەندی.',
    items:{
      services:{title:'خزمەتگوزاری',desc:'گەیشتن بە Air، Sea، Land، گومرگ و Door-to-Door.',action:'بینینی خزمەتگوزاری',icon:'i-box',route:'services'},
      quote:{title:'نرخی بار',desc:'نرخی خێرا و خەمڵێنراو بزانە پێش داواکاری.',action:'خەملاندنی نرخ',icon:'i-card',route:'services'},
      dashboard:{title:'داشبۆردی کڕیار',desc:'بارەکان، ئاگادارییەکان و هەژمارەکانت بەڕێوەببە.',action:'کردنەوەی داشبۆرد',icon:'i-user',route:'portal'},
      track:{title:'شوێنکەوتن',desc:'ژمارەی شوێنکەوتن داخڵ بکە و دۆخی بار ببینە.',action:'شوێنکەوتن بکە',icon:'i-search',route:'track'},
      warehouses:{title:'کۆگاکان',desc:'هابەکانی چین، دوبەی، ئەمریکا و هەولێر لە یەک تۆڕدا.',action:'بینینی کۆگاکان',icon:'i-warehouse',route:'contact'},
      contact:{title:'پەیوەندی',desc:'واتساپ، ئیمەیل و ڕێکخستن لە کەمترین کاتدا.',action:'پەیوەندیمان پێوە بکە',icon:'i-chat',route:'contact'}
    }},
  dashboardPreview:{heading:'پێشبینی داشبۆردی کڕیار',sub:'کڕیاران دەتوانن لێرە بارەکان، نرخ و ئاگادارییەکان بە شێوەی خێرا بەڕێوەببەن.',stats:[{v:'4',l:'بارە چالاکەکان'},{v:'29',l:'گەیشتوو'},{v:'2',l:'چاوەڕوان'},{v:'8',l:'فاکتۆرەکان'}],btnPortal:'کردنەوەی پرۆتال',btnTrack:'شوێنکەوتن بکە'},
  warehouses:{eyebrow:'کۆگاکان',heading:'تۆڕی کۆگاکانمان',sub:'هابە سەرەکییەکان لە چین، دوبەی، ئەمریکا و هەولێر بۆ جوڵاندنی خێرای بار.',
    items:{
      guangzhou:{tag:'هاب سەرەکی چین',title:'کۆگای گوانگجو',address:'گوانگجو، چین',hours:'دووشەممە - شەممە',features:['کۆکردنەوەی بار','وێنەی QC','پاکەتکردنی خێرا']},
      usa:{tag:'سەرچاوەی ئەمریکا',title:'هابەکانی ئەمریکا',address:'ئەمریکا',hours:'دووشەممە - شەممە',features:['کۆکردنەوەی کاڵا','پشکنینی بەڵگە','ئامادەکردن بۆ گواستنەوە']},
      dubai:{tag:'هاب ترانزیت',title:'کۆگای دوبەی',address:'دوبەی، ئیمارات',hours:'دووشەممە - شەممە',features:['ترانزیتی خێرا','بەڕێوەبردنی هەلومەرج','ئاسایشی باش']},
      erbil:{tag:'هابی دابەشکردن',title:'کۆگای هەولێر',address:'هەولێر، عێراق',hours:'شەممە - پێنجشەممە',features:['دابەشکردنی ناوخۆیی','پێشوازی کڕیار','گواستنەوەی خێرا']}
    }},
  ops:{eyebrow:'بەڕێوەبردنی ناوخۆ',heading:'کۆنسۆڵی ستاف و کارگێڕی',sub:'هەموو کارە سەرەکییەکان لە یەک دەشبووردا ببینە: بارەکان، دارایی، کۆگا و پشتگیری.',
    metrics:[{v:'12',l:'باری چاوەڕوان'},{v:'98%',l:'ڕێژەی سەرکەوتن'},{v:'7',l:'تیکەتی کراوە'},{v:'3',l:'ژمارەی کۆگا'}],
    cards:[
      {icon:'i-card',title:'دارایی و وەسڵەکان',desc:'داهات، وەسڵە PDF و پارەی لەبەردەست نەماوەکان بە شێوەی ڕوون ببینە.',points:['وەسڵی PDF','ڕاپۆرتی داهات','داواکاری پارەدان']},
      {icon:'i-warehouse',title:'وەسڵی کۆگا',desc:'ورودبوونی بار لە هەر هابێکدا تۆمار بکە و بەڵگەکەی بخەوە.',points:['وێنەی بار','تۆماری هاتن','لێدانی پارچە']},
      {icon:'i-chat',title:'ڕیزبەندی پشتگیری',desc:'پەیامی کڕیاران بە خێرایی وەربگرە و هەموو گفتوگۆکان لە شوێنێکدا پارێزە.',points:['هەواڵی واتساپ','تێبینی دۆخ','وەڵامی ئامادە']}
    ]},
  services:{eyebrow:'خزمەتگوزاری',heading:'خزمەتگوزارییەکانمان',sub:'چارەسەری تەواو بۆ گەیاندنی بار لە دەرەوە بۆ ناو عێراق',learnMore:'زیاتر بزانە',
    quote:{eyebrow:'تەخمینی نرخ',heading:'حساباتی نرخی گەیاندن',origin:'شوێنی سەرچاوەی بار',type:'جۆری گەیاندن',air:'ئاسمانی (Air)',sea:'دەریایی (Sea)',land:'وشکانی (Land)',
      weight:'کێش (کیلۆگرام)',weightPh:'بۆ نموونە 50',dest:'شاری مەبەست لە عێراق',btn:'حسابکردنی تەخمین',
      needWeight:'تکایە کێشی بار بنووسە.',resultLabel:'تەخمینی نرخ',cta:'داواکردنی نرخی وردتر',
      note:'* ئەمە تەخمینێکی گشتییە و نرخی کۆتایی بە origin، جۆری بار، کێش، قەبارە، گومرگ و ڕێڕەوی ڕاستەقینە لەلایەن ستافمانەوە پشتڕاست دەکرێت.'},
    items:{
      air:{title:'گەیاندنی ئاسمانی',desc:'خێراترین ڕێگا بۆ بارە پەلەیەکان.',features:['کاتی گەیشتن: ١-٣ ڕۆژ','گونجاو بۆ بارە بەنرخ و پەلەکان','شوێنکەوتنی ڕاستەوخۆ']},
      sea:{title:'گەیاندنی دەریایی',desc:'گونجاوترین تێچوون بۆ بارە قورس و گەورەکان.',features:['کاتی گەیشتن: ١٢-١٨ ڕۆژ','باشترین تێچوون بۆ بارە قورسەکان','گونجاو بۆ کۆنتەینەری تەواو یان بەشی کۆنتەینەر']},
      land:{title:'گەیاندنی وشکانی',desc:'گەیاندن بە رێگای وشکانی لە دوبەی بەرەو عێراق، بەڕێکەوتن بە سعودیە.',features:['کاتی گەیشتن: ٧-١٠ ڕۆژ','ڕێگا: دوبەی ← سعودیە ← عێراق (هەولێر)','گونجاو بۆ بارە مامناوەندەکان']},
      customs:{title:'ئاسانکاری گومرگی',desc:'کارگێڕی تەواوی مامەڵەی گومرگ لە بەندەرەکانی عێراق.',features:['کارگێڕی بەڵگەنامەکان','پارەدانی باج و تێچووەکان','ڕاوێژکاری یاسایی گومرگ']},
      warehouse:{title:'کۆگاداری',desc:'کۆگای پارێزراو و چاودێریکراو لە ئیمارات و عێراق.',features:['چاودێری ٢٤/٧','سیستەمی بەڕێوەبردنی کۆگا','بیمەی گونجاو بۆ کاڵاکان']},
      door:{title:'گەیاندن بۆ بەردەرگا',desc:'گەیاندنی کۆتایی بارەکەت ڕاستەوخۆ بۆ ماڵ یان کۆمپانیاکەت.',features:['گەیاندن بۆ هەموو شارەکانی عێراق','ڕێکخستنی کاتی گەیاندن','پشتڕاستکردنەوەی وەرگرتن']}
    },
    details:{
      air:{audience:'بارە پەلە و بەنرخەکان',timing:'١-٣ ڕۆژ',faqQ:'کەی گەیاندنی ئاسمانی باشترە؟',faqA:'کاتێک بارەکەت پەلەیە یان بەنرخە، گەیاندنی ئاسمانی ڕێگای خێراتر و گونجاوترە.'},
      sea:{audience:'بارە قورس و کۆنتەینەرەکان',timing:'١٢-١٨ ڕۆژ',faqQ:'ئایا دەریایی بۆ بارە گەورەکان گونجاوە؟',faqA:'بەڵێ، بەتایبەتی بۆ بارە قورسەکان و کۆنتەینەرە تەواو یان هاوبەشەکان.'},
      land:{audience:'بارە مامناوەندەکان',timing:'٧-١٠ ڕۆژ',faqQ:'ڕێڕەوی گەیاندنی وشکانی چییە؟',faqA:'بارەکان لە دوبەیەوە بە ڕێگەی سعودیە بەرەو عێراق و پاشان شارەکەی مەبەست دەگوازنەوە.'},
      customs:{audience:'کۆمپانیا و بازرگانەکان',timing:'بەپێی بەڵگەکان',faqQ:'ئایا بەڵگەنامەکانتان ئامادە دەکەن؟',faqA:'تیمەکەمان بەڵگەنامە سەرەکییەکان پشکنین و ڕێکدەخات و ڕێنماییی گومرگی پێشکەش دەکات.'},
      warehouse:{audience:'بارە چاوەڕوانەکان',timing:'کاتی گونجاو',faqQ:'بارەکەم لە کوێ پارێزراو دەبێت؟',faqA:'کۆگا و هابەکانمان لە ئیمارات و عێراق چاودێری کراون و بۆ کاتی چاوەڕوانی بارەکەت ئامادەن.'},
      door:{audience:'کڕیارانی کۆتایی',timing:'بەپێی شار',faqQ:'ئایا بۆ هەموو شارەکانی عێراق دەگەیەنن؟',faqA:'بەڵێ، گەیاندنی کۆتایی بۆ هەموو شارە سەرەکییەکان و زۆربەی ناوچەکانی عێراق ڕێکدەخەین.'}
    },
    faqEyebrow:'پرسیارە باوەکان',faqHeading:'پرسیار و وەڵام',faq:[
      {q:'چەند کات دەخایەنێت لە دوبەی بۆ هەولێر؟',a:'گەیاندنی ئاسمانی ١-٣ ڕۆژ، وشکانی ٧-١٠ ڕۆژ (بەڕێکەوتن بە سعودیە)، دەریایی ١٢-١٨ ڕۆژ بەپێی جۆری بار.'},
      {q:'کام جۆر بار دەگوازرێتەوە؟',a:'هەموو جۆرە بارێک لە پارچەی بچووکەوە تا کۆنتەینەری تەواو، بۆ بارگەی بازرگانی و کەسی.'},
      {q:'ئایا بیمە هەیە بۆ بارەکان؟',a:'بەڵێ، هەموو بارەکان بە پارێزگاری تەواو و بیمەی گونجاو دەگوازرێنەوە.'},
      {q:'چۆن دەتوانم شوێنکەوتنی بارەکەم بکەم؟',a:'بە بەکارهێنانی ژمارەی شوێنکەوتن لە بەشی "شوێنکەوتن" لە ماڵپەڕەکە، ڕاستەوخۆ دۆخی بارەکەت دەبینیت.'},
      {q:'ئایا کارگێڕی گومرگ ئەنجام دەدەن؟',a:'بەڵێ، تیمەکەمان هەموو کارەکانی بەڵگەنامە و پارەدانی باج لە بەندەرەکانی عێراق ئەنجام دەدات.'}
    ]},
  how:{eyebrow:'پرۆسە',heading:'چۆن کاردەکات',items:[
    {title:'داواکاری بکە',desc:'وردەکاری بارەکەت بنێرە و بە چرکەیەک نرخێک وەربگرە.'},
    {title:'وەرگرتن',desc:'تیمەکەمان بارەکەت لە چین یان ئیمارات وەردەگرێت.'},
    {title:'گواستنەوە و گومرگ',desc:'بار بە دەریا یان ئاسمان دەگوازرێتەوە و کارەکانی گومرگ ئەنجام دەدرێت.'},
    {title:'گەیاندن',desc:'بارەکەت بە سەلامەتی دەگاتە دەست تۆ لە هەر شوێنێکی عێراق.'}
  ]},
  why:{eyebrow:'هۆکار',heading:'بۆچی Globall Cloud',items:[
    {title:'شوێنکەوتنی ڕاستەوخۆ',desc:'لە هەر ساتێکدا بزانە بارەکەت لەکوێیە.',icon:'i-search'},
    {title:'پارێزراو و بیمەکراو',desc:'هەموو بارەکان بە پارێزگاری تەواو دەگوازرێنەوە.',icon:'i-shield'},
    {title:'باشترین نرخ',desc:'نرخی ڕکابەرانە بەبێ کێشەی شاراوە.',icon:'i-card'},
    {title:'پشتگیری ٢٤/٧',desc:'تیمی پشتگیریمان هەمیشە ئامادەیە بۆ یارمەتیدانت.',icon:'i-clock'}
  ]},
  about:{eyebrow:'دەربارەمان',heading:'دەربارەی Globall Cloud',sub:'هاوبەشی متمانەپێکراوت بۆ هێنانی کاڵا لە چین، ئیمارات و ئەمریکا بۆ هەولێر و عێراق.',
    missionTitle:'ئەرکمان',missionBody:'ئەرکی Globall Cloud گەیاندنی خزمەتگوزاری گەیاندنی بارە بە ستانداردی نێودەوڵەتی، بە شەفافیەت و متمانەوە، بۆ هەموو کڕیارێک لە هەرێمی کوردستان و عێراق.',
    visionTitle:'ئاواتمان',visionBody:'ئامانجمان ئەوەیە ببینە باشترین و متمانەپێکراوترین کۆمپانیای لۆجستیک لە هەرێم، بە بەکارهێنانی تەکنەلۆجیای نوێ و خزمەتگوزاریەکی کڕیار-ناوەندی.',
    valuesEyebrow:'بەهاکانمان',valuesHeading:'ئەوەی ڕێنماییمان دەکات',values:[
      {title:'ڕاستگۆیی',desc:'کارکردن بە ڕاستی و ڕوونی لەگەڵ هەموو کڕیارێک.',icon:'i-shield'},
      {title:'شەفافیەت',desc:'نرخ و پرۆسەکان ڕوون و بەبێ کێشەی شاراوە.',icon:'i-eye'},
      {title:'بەرپرسیارێتی',desc:'بەرپرسیارین لەسەر هەر بارێک تا گەیشتنی سەلامەت.',icon:'i-box'},
      {title:'ڕێزگرتن لە کڕیار',desc:'کاتی کڕیار و پێداویستیەکانی لە پێشینەن.',icon:'i-user'}
    ],
    storyTitle:'چیرۆکمان',storyBody:'Globall Cloud وەک هاوبەشێکی گەیاندنی بار دەستی کرد بۆ چارەسەرکردنی کێشەی گەیاندنی بار لەنێوان بازاڕەکانی چین و ئیمارات و شارەکانی عێراق. لە ڕێگەی کارامەیی و پابەندبوونمانەوە، بووینەتە هەڵبژاردەیەکی متمانەپێکراو بۆ کۆمپانیا و کەسانی زۆر کە پێویستیان بە گەیاندنی بارێکی ئارام و خێرایە. بەردەوامین لە پەرەپێدانی خزمەتگوزارییەکانمان بۆ باشترکردنی ئەزموونی هەر کڕیارێک.'},
  cta:{heading:'ئامادەیت بار بنێریت؟',sub:'ئەمڕۆ داواکاریەکەت بنێرە و لە کەمترین کات نرخێک وەربگرە.',b1:'داواکردنی نرخ',b2:'پەیوەندیمان پێوە بکە',whatsapp:'پەیوەندی بە واتساپ'},
  corridor:{eyebrow:'ڕێڕەوی کارەکە',heading:'لە چین، دوبەی و ئەمریکا بۆ هەولێر',sub:'چوار هەنگاوی سەرەکی بە ڕوونی و بە شێوازی کۆمپانیایەکی نێودەوڵەتی ببینە.',badge:'ڕێڕەوی زیندوو',items:[
    {flag:'🇨🇳',title:'گەیاندن لە چین',meta:'Origin Hub',desc:'بارەکەت وەردەگیرێت، QC دەکرێت و بۆ ترانزیت ئامادە دەبێت.',tags:['QC','Packing','Pickup']},
    {flag:'🇺🇸',title:'سەرچاوەی ئەمریکا',meta:'Origin Hub',desc:'کۆکردنەوەی کاڵا، پشکنینی بەڵگە و ئامادەکردنی بار بۆ گواستنەوەی نێودەوڵەتی.',tags:['Pickup','Verification','Export']},
    {flag:'🇦🇪',title:'هابەی دوبەی',meta:'Transit Hub',desc:'لە دوبەیدا ڕێکخستن و بەڕێوەبردنی ڕێگەی گواستنەوە بە شێوەی خێرا.',tags:['Transit','Air Cargo','Sea Cargo']},
    {flag:'🇮🇶',title:'گەیاندنی هەولێر',meta:'Delivery Hub',desc:'پاش گومرگ و ڕێکخستنی دوایین، بارەکەت بە سەلامەتی دەگات.',tags:['Customs','Door-to-Door','Final Mile']}
  ]},
  footer:{blurb:'Globall Cloud — گەیاندنی بار بە متمانەوە لە چین و ئیمارات بۆ هەموو عێراق.',quick:'بەستەرە خێراکان',servicesH:'خزمەتگوزارییەکان',contactH:'پەیوەندی',address:'هەولێری نوێ، پشت مەعەد گەشە، هەولێر، عێراق',rights:'هەموو مافەکان پارێزراون.',privacy:'ڕێساکانی تایبەتێتی',terms:'مەرجی بەکارهێنان'},
  testi:{
    eyebrow:'ڕاوبۆچوونی کڕیاران',
    heading:'کڕیارانمان چی دەڵێن',
    sub:'چەند وتەیەک لە کڕیارانێک کە بارەکانیان بە Globall Cloud گەیاندووە.',
    items:[
      {quote:'بارەکانم لە گوانجۆوە بۆ هەولێر بە کاتی خۆیان گەیشتن، وشوێنکەوتنەکە زۆر ڕوونبوو — هەموو هەنگاوێکی بارەکەم بە ڕوونی دەبینی.', name:'ئاراس محەمەد', role:'خاوەن فرۆشگای ئەلیکترۆنی، هەولێر', initials:'ئم', stars:5},
      {quote:'کاری ترخانکردنی گومرگ زۆر سەختە، بەڵام تیمی Globall Cloud هەموو کاغەزەکانیان بۆ ئامادەکرد و کێشەم لەگەڵ نەبوو. زۆر پیشەیین.', name:'سارا ڕەشید', role:'بازرگانی کەلوپەلی ماڵەوە', initials:'سڕ', stars:5},
      {quote:'لە یەکەم داواکارییەوە هەتا وەرگرتنی بارەکە، هەمیشە وەڵامی پەیوەندییەکانم زوو بوو. ئێستا هەموو هاوردەکانم لە ڕێگەیانەوە دەکەم.', name:'کاروان عەزیز', role:'هاوردەکەری کاڵای تەکنەلۆجیا', initials:'کع', stars:5}
    ]
  },
  legal:{
    updated:'دوایین نوێکردنەوە: ٢٠٢٦',
    privacyEyebrow:'تایبەتێتی',
    privacyTitle:'ڕێساکانی تایبەتێتی',
    termsEyebrow:'یاسایی',
    termsTitle:'مەرجی بەکارهێنان',
    privacyBody:[
      {h:'١. چ زانیارییەک کۆدەکرێتەوە', p:'کاتێک هەژمار دروست دەکەیت، داواکاری بارکردن پێشکەش دەکەیت، یان فۆرمی پەیوەندی پڕدەکەیتەوە، ئەم زانیاریانە کۆدەکرێتەوە: ناو، ژمارە مۆبایل، ئیمەیل، ناونیشانی کۆچ و گەیشتن، و وردەکاری بارەکە (کێش، جۆر، بابەت). هیچ زانیاری داراییی (وەک ژمارەی کارتی بانکی) لەلایەن ئێمەوە کۆناکرێتەوە.'},
      {h:'٢. چۆن زانیاریەکان بەکاردێت', p:'زانیاریەکانت تەنها بۆ ئەمانە بەکاردێت: جێبەجێکردن و شوێنکەوتنی بارەکەت، پەیوەندیکردن پێت سەبارەت بە دۆخی بارەکە، و باشترکردنی خزمەتگوزاریمان. ئێمە زانیاریەکانت نافرۆشین یان بە کۆمپانیای درەوە ناداین بۆ مەبەستی بازاڕگەرمکردن.'},
      {h:'٣. کۆدکردن و ئاسایشی داتا', p:'هەموو پەیوەندییەکان لەنێوان وێبگەڕەکەت و سێرڤەرەکانمان بە TLS/HTTPS کۆدەکراون. هەژمارەکەت بە Supabase Auth پارێزراوە، و داتاکانت بە سیاسەتی Row-Level Security پارێزراون — تەنها خۆت و ئەندامی مۆڵەتدراوی ستاف دەتوانن دەستیان پێبگات.'},
      {h:'٤. مافەکانت', p:'دەتوانیت داوای بینین، ڕاستکردنەوە، یان سڕینەوەی هەژمار و زانیاریە کەسیەکانت لە هەر کاتێکدا بکەیت، تەنها پەیوەندیمان پێوە بکە لە ڕێگەی ئیمەیل یان واتساپەوە کە لە لاپەڕەی پەیوەندیدا هەیە.'},
      {h:'٥. پەیوەندیکردن', p:'ئەگەر پرسیارت هەیە سەبارەت بەم ڕێساکانی تایبەتێتی، پەیوەندیمان پێوە بکە: tamanblbas271@gmail.com یان +964 750 757 7137.'}
    ],
    termsBody:[
      {h:'١. قبوڵکردنی مەرجەکان', p:'بەکارهێنانی ئەم وێبسایتە، دروستکردنی هەژمار، یان داواکردنی خزمەتگوزاری لە Globall Cloud بە واتای قبوڵکردنی ئەم مەرجانەیە.'},
      {h:'٢. خزمەتگوزارییەکان', p:'Globall Cloud خزمەتگوزاری گەیاندنی بار (ئاسمانی، دەریایی، وشکانی)، ترخانکردنی گومرگی، و گەیاندنی دەرگا-بۆ-دەرگا پێشکەش دەکات لەنێوان چین، ئیمارات، و عێراق. کاتی گەیشتن و نرخەکان لەسەر بنەمای جۆری بار و ڕووت دیاریدەکرێن.'},
      {h:'٣. ئەرکی کڕیار', p:'کڕیار بەرپرسیارە لە ڕاستی زانیاریە پێشکەشکراوەکان و پاراستنی وشەی نهێنی هەژمارەکەی. بارکردنی کاڵای ئاسایی مەمنوعە (وەک چەک، مادەی هۆشبەر، یان کاڵای قەدەغەکراو لەلایەن یاسای عێراقەوە) بە تەواوی قەدەغەیە.'},
      {h:'٤. نرخ و پارەدان', p:'نرخەکان بە دۆلاری ئەمریکی ($) دیاریدەکرێن مەگەر بەپێچەوانەوە ڕێککەوتبێت. پارەدان لەسەر بنەمای ڕێککەوتنی نێوان کڕیار و کۆمپانیا جێبەجێدەکرێت.'},
      {h:'٥. سنووری بەرپرسیارێتی', p:'Globall Cloud هەوڵی خۆی دەدات بۆ گەیاندنی سەلامەت و لەکاتی بار، بەڵام بەرپرسیار نییە لە دواکەوتنی هاوردەکراو لە هۆکاری دەرەکی (وەک تەقلیدی گومرگ یان کارەساتی سروشتی).'},
      {h:'٦. گۆڕانکاری مەرجەکان', p:'Globall Cloud مافی خۆی هەیە ئەم مەرجانە لە هەر کاتێکدا نوێ بکاتەوە. بەردەوامبوون لە بەکارهێنانی خزمەتگوزارییەکانمان دوای نوێکردنەوە بە واتای قبوڵکردنی مەرجە نوێیەکانە.'}
    ]
  },
  track:{heading:'شوێنکەوتنی بار',sub:'کۆدی کڕیاری GC-### یان shipment ID ـەکەت بنووسە بۆ زانینی دۆخی ئێستا',searchPh:'وەک GC-338 یان shipment ID',searchBtn:'بگەڕێ',
    notFoundTitle:'هیچ بارێک نەدۆزرایەوە',notFoundBody:'تکایە ژمارەی شوێنکەوتن بپشکنە، یان داواکارییەکی نوێ تۆمار بکە.',requestInstead:'داواکاری نوێ بکە',
    detailsH:'زانیاری بارکردن',timelineH:'هێڵی کات',save:'زیادکردن بۆ بارەکانم',saved:'زیادکرا ✓',signInToSave:'چوونەژوورەوە بۆ هەڵگرتن',
    status:{pending:'چاوەڕوانە',transit:'لە ڕێگادایە',delivered:'گەیشت'},
    steps:{placed:'داواکاری تۆمارکرا',pickedUp:'وەرگیرا',transit:'لە ڕێگایە',customs:'گومرگ',outForDelivery:'بەرەو گەیاندن',delivered:'گەیشت'},
    type:{air:'گەیاندنی ئاسمانی',sea:'گەیاندنی دەریایی',land:'گەیاندنی وشکانی'},
    weight:'کێش',volume:'قەبارە',items:'ژمارەی کاڵا',total:'کۆی گشتی',paid:'دراوە',due:'ماوە',eta:'خەمڵێنراو:',pendingValue:'دوای پێداچوونەوە'},
  invoice:{downloadBtn:'دابەزاندنی وەسڵ (PDF)',generating:'خەریکی ئامادەکردنە...',title:'وەسڵی گەیاندن',trackingId:'ژمارەی شوێنکەوتن',dateIssued:'بەرواری دەرکردن',billTo:'کڕیار',route:'ڕێگا',serviceType:'جۆری خزمەتگوزاری',statusLabel:'دۆخ',thanks:'سوپاس بۆ باوەڕپێکردنتان بە Globall Cloud',failMsg:'دروستکردنی وەسڵ سەرکەوتوو نەبوو، تکایە دووبارە هەوڵبدەرەوە.'},
      request:{heading:'داواکردنی نرخ / بارکردنی نوێ',sub:'وردەکاری بارەکەت پڕبکەرەوە و ژمارەی داواکارییەکەت بۆ پێداچوونەوە وەربگرە.',

    name:'ناوی تەواو',phone:'ژمارەی مۆبایل',email:'ئیمەیل (ئارەزوومەندانە)',origin:'لە کوێوە',destination:'بۆ کوێ',type:'جۆری گەیاندن',weight:'کێشی خەمڵێنراو (کیلۆگرام)',notes:'تێبینی زیاتر',
    submit:'ناردنی داواکاری',sending:'دەنێردرێت...',successTitle:'داواکاریەکەت وەرگیرا 🎉',successBody:'ژمارەی داواکارییەکەت ئەمەیە، هەڵیبگرە بۆ پێداچوونەوەی داهاتوو:',trackNow:'شوێنکەوتنی بار',backHome:'گەڕانەوە بۆ سەرەکی',waConfirm:'پشتڕاستکردنەوە بە واتساپ',waPrefix:'سڵاو، داواکارییەکم ناردووە — ژمارەی داواکاری:'},
  portal:{signInH:'چوونەژوورەوە',signInSub:'ناو و ئیمەیلت بنووسە بۆ بینینی بارەکانت',dashboardSub:'داشبۆردی هەژمارەکەت',name:'ناو',email:'ئیمەیل',phone:'ژمارەی مۆبایل (ئارەزوومەندانە)',continueBtn:'بەردەوامبە',trustNote:'زانیارییەکانت تایبەتن و لەگەڵ کەس هاوبەش ناکرێن',
    hi:'سڵاو',myShipments:'بارەکانم',emptyTitle:'هێشتا هیچ بارێکت نییە',emptyBody:'بارێک بشوێنەوە یان داواکارییەکی نوێ بکە بۆ ئەوەی لێرە دەربکەوێت.',
    qTrack:'شوێنکەوتنی بار',qRequest:'داواکاری نوێ',qEdit:'دەستکاری پرۆفایل',save:'پاشکەوتکردن',cancel:'پاشگەزبوونەوە',signOut:'چوونەدەرەوە'},
  pbn:{home:'سەرەکی',shipments:'بارەکان',services:'خزمەتگوزاری',track:'شوێنکەوتن',profile:'پرۆفایل',login:'چوونەژوورەوە'},
  contact:{heading:'پەیوەندیمان پێوە بکە',sub:'ئامادەین یارمەتیت بدەین — پەیوەندیمان پێوە بکە بە هەر ڕێگایەک کە لات باشترە.',
    phoneL:'ژمارەی مۆبایل',emailL:'ئیمەیل',whatsappL:'واتساپ',addressL:'ناونیشان',hoursL:'کاتەکانی کارکردن',hoursV:'شەممە - پێنجشەممە: ٩ی بەیانی - ٧ی ئێوارە',
    formName:'ناوت',formCompany:'کۆمپانیا (ئارەزوومەندانە)',formType:'جۆری داواکاری',typeShipping:'گەیاندنی بار',typeInfo:'زانیاری',typeSupport:'پشتگیری',formEmail:'ئیمەیلت',formMsg:'پەیامەکەت',send:'ناردنی پەیام',sending:'دەنێردرێت...',sentMsg:'پەیامەکەت پاشکەوتکرا! بەم زووانە پەیوەندیت پێوە دەکەین.',getDirections:'ڕێنیشاندن بۆ نووسینگە'},
  places:{guangzhou:'گوانگژۆ، چین',shenzhen:'شینجن، چین',dubai:'دوبەی، ئیمارات',sharjah:'شارجە، ئیمارات',erbil:'هەولێر، عێراق',sulaymaniyah:'سلێمانی، عێراق',duhok:'دهۆک، عێراق',baghdad:'بەغدا، عێراق',basra:'بەسرە، عێراق',kirkuk:'کەرکووک، عێراق',mosul:'مووسڵ، عێراق'}
},
en:{
  brand:{tagline:'LOGISTICS'},
  topbar:{note:'Active lanes across China, Dubai, and Erbil',support:'Live support 24/7'},
  nav:{home:'Home',about:'About Us',services:'Services',track:'Track',contact:'Contact',signIn:'Sign In',dashboard:'Dashboard',quote:'Get a Quote'},
  hero:{eyebrow:'CHINA  ·  UAE  ·  IRAQ',title:'Delivering Trust Across Borders',subtitle:'Globall Cloud moves your cargo safely and quickly from China and the United Arab Emirates to every city in Iraq — with live tracking, clear milestones, and 24/7 support.',ctaTrack:'Track Shipment',ctaQuote:'Get a Quote',ctaWhatsApp:'Chat on WhatsApp',route:{a:'Guangzhou, China',b:'Dubai, UAE',c:'Erbil, Iraq'},badge:'LIVE CORRIDOR',liveStatus:'Shipment moving right now',liveSub:'Your cargo is moving through our China → Dubai → Erbil network with live updates.',routeOrigin:'Origin Hub',routeTransit:'Transit Hub',routeDestination:'Delivery Hub'},
  trust:{s1v:'25K+',s1l:'Delivered shipments',s2v:'12+',s2l:'Connected markets',s3v:'24/7',s3l:'Live support',s4v:'98%',s4l:'On-time delivery'},
  liveTrack:{heading:'Track in seconds',sub:'Enter your GC customer code or exact shipment ID to see the latest status.',placeholder:'e.g. GC-338 or shipment ID',button:'Track Shipment'},
  business:{eyebrow:'BUSINESS PAGES',heading:'Everything customers need is one tap away',sub:'Jump straight to services, pricing, dashboard tools, warehouses, and support.',
    items:{
      services:{title:'Services',desc:'Air, sea, land, customs, and door-to-door delivery.',action:'View services',icon:'i-box',route:'services'},
      quote:{title:'Price Calculator',desc:'Estimate your shipping cost before you request a quote.',action:'Calculate price',icon:'i-card',route:'services'},
      dashboard:{title:'Customer Dashboard',desc:'Manage shipments, notifications, and account details.',action:'Open dashboard',icon:'i-user',route:'portal'},
      track:{title:'Tracking',desc:'Enter a tracking ID and see the latest shipment status.',action:'Track shipment',icon:'i-search',route:'track'},
      warehouses:{title:'Warehouses',desc:'China, Dubai, and Erbil hubs that keep cargo moving.',action:'View network',icon:'i-warehouse',route:'contact'},
      contact:{title:'Contact',desc:'WhatsApp, email, and quick support in one place.',action:'Get in touch',icon:'i-chat',route:'contact'}
    }},
  dashboardPreview:{heading:'Customer Dashboard Preview',sub:'A quick look at the portal customers use to manage shipments anywhere.',stats:[{v:'4',l:'Active shipments'},{v:'29',l:'Delivered'},{v:'2',l:'Pending'},{v:'8',l:'Invoices'}],btnPortal:'Open portal',btnTrack:'Track a parcel'},
  warehouses:{eyebrow:'WAREHOUSES',heading:'Our Warehouse Network',sub:'Strategic hubs in China, Dubai, and Erbil keep cargo moving smoothly.',
    items:{
      guangzhou:{tag:'Origin Hub',title:'Guangzhou Warehouse',address:'Guangzhou, China',hours:'Mon - Sat',features:['Cargo consolidation','QC photo checks','Fast packing']},
      dubai:{tag:'Transit Hub',title:'Dubai Warehouse',address:'Dubai, UAE',hours:'Mon - Sat',features:['Transit coordination','Secure handling','Status updates']},
      erbil:{tag:'Distribution Hub',title:'Erbil Warehouse',address:'Erbil, Iraq',hours:'Sat - Thu',features:['Local delivery prep','Customer pickup','Rapid dispatch']}
    }},
  ops:{eyebrow:'OPERATIONS',heading:'Staff workspace and control center',sub:'A back-office hub for shipments, finance, warehouses, and support in one clean view.',
    metrics:[{v:'12',l:'Pending loads'},{v:'98%',l:'On-time rate'},{v:'7',l:'Open tickets'},{v:'3',l:'Warehouses'}],
    cards:[
      {icon:'i-card',title:'Finance & invoices',desc:'Track revenue, export PDF receipts, and follow up on unpaid orders.',points:['PDF invoice export','Revenue overview','Unpaid orders']},
      {icon:'i-warehouse',title:'Warehouse receipts',desc:'Register inbound cargo and keep proof at every hub.',points:['Inbound scans','Photo proof','Handover logs']},
      {icon:'i-chat',title:'Support queue',desc:'Handle customer messages and resolve issues fast.',points:['WhatsApp handoff','Status notes','Saved replies']}
    ]},
  services:{eyebrow:'SERVICES',heading:'Our Services',sub:'End-to-end solutions for moving cargo into Iraq',learnMore:'Learn more',
    quote:{eyebrow:'Get an Estimate',heading:'Shipping Cost Calculator',type:'Shipping type',air:'Air Freight',sea:'Sea Freight',land:'Land Freight',
      weight:'Weight (kg)',weightPh:'e.g. 50',dest:'Destination city in Iraq',btn:'Calculate estimate',
      needWeight:'Please enter the shipment weight.',resultLabel:'Estimated price',cta:'Request a detailed quote',
      note:'* This is a rough estimate only — final pricing is confirmed by our team after reviewing your shipment.'},
    items:{
      air:{title:'Air Freight',desc:'The fastest route for urgent cargo.',features:['Transit time: 1-3 days','Ideal for urgent, high-value cargo','Real-time flight tracking']},
      sea:{title:'Sea Freight',desc:'The most cost-effective option for heavy loads.',features:['Transit time: 12-18 days','Best cost for heavy loads','Full container or shared container options']},
      land:{title:'Land Freight',desc:'Overland delivery from Dubai to Iraq via Saudi Arabia.',features:['Transit time: 7-10 days','Route: Dubai → Saudi Arabia → Iraq (Erbil)','Ideal for mid-sized shipments']},
      customs:{title:'Customs Clearance',desc:'Complete customs handling at Iraqi ports of entry.',features:['Documentation handling','Duty and tax payment','Customs legal consultation']},
      warehouse:{title:'Warehousing',desc:'Secure, monitored storage in the UAE and Iraq.',features:['24/7 monitoring','Warehouse management system','Optional cargo insurance']},
      door:{title:'Door-to-Door Delivery',desc:'Final-mile delivery straight to your home or business.',features:['Delivery to every city in Iraq','Scheduled delivery windows','Delivery confirmation']}
    },
    details:{
      air:{audience:'Urgent and high-value cargo',timing:'1–3 days',faqQ:'When is air freight the best choice?',faqA:'Choose air freight when delivery speed matters or the shipment is high-value and time-sensitive.'},
      sea:{audience:'Heavy cargo and containers',timing:'12–18 days',faqQ:'Is sea freight suitable for large shipments?',faqA:'Yes. It is designed for heavy cargo and full-container or shared-container shipments.'},
      land:{audience:'Mid-sized shipments',timing:'7–10 days',faqQ:'What is the land-freight route?',faqA:'Cargo travels from Dubai through Saudi Arabia into Iraq, then continues to the destination city.'},
      customs:{audience:'Importers and businesses',timing:'Document-dependent',faqQ:'Can you prepare the customs documents?',faqA:'Our team reviews the required documents, guides the process, and supports duty and customs handling.'},
      warehouse:{audience:'Cargo awaiting dispatch',timing:'Flexible storage',faqQ:'Where is cargo stored securely?',faqA:'Our UAE and Iraq hubs provide monitored storage while cargo waits for the next route or final delivery.'},
      door:{audience:'End customers and businesses',timing:'City-dependent',faqQ:'Do you deliver across Iraq?',faqA:'Yes. We coordinate final-mile delivery across major Iraqi cities and many surrounding areas.'}
    },
    faqEyebrow:'FAQ',faqHeading:'Frequently Asked Questions',faq:[
      {q:'How long does shipping take from Dubai to Erbil?',a:'Air freight takes 1-3 days, land freight (via Saudi Arabia) takes 7-10 days, sea freight takes 12-18 days depending on cargo type.'},
      {q:'What types of cargo do you transport?',a:'Everything from small parcels to full containers, for both commercial and personal shipments.'},
      {q:'Is my shipment insured?',a:'Yes, every shipment is handled with full protection and optional cargo insurance.'},
      {q:'How can I track my shipment?',a:'Use your tracking number on the "Track" page to see the live status of your cargo.'},
      {q:'Do you handle customs clearance?',a:'Yes, our team handles all documentation and duty payments at Iraqi ports of entry.'}
    ]},
  how:{eyebrow:'PROCESS',heading:'How It Works',items:[
    {title:'Request a Quote',desc:'Send your shipment details and get a price in seconds.'},
    {title:'Pickup',desc:'Our team collects your cargo in China or the UAE.'},
    {title:'Transit & Customs',desc:'Cargo moves by sea or air while we handle customs.'},
    {title:'Delivery',desc:'Your shipment arrives safely anywhere in Iraq.'}
  ]},
  why:{eyebrow:'WHY US',heading:'Why Globall Cloud',items:[
    {title:'Real-Time Tracking',desc:'Know exactly where your shipment is, any moment.',icon:'i-search'},
    {title:'Secure & Insured',desc:'Every shipment is handled with full protection.',icon:'i-shield'},
    {title:'Best Pricing',desc:'Competitive rates with no hidden costs.',icon:'i-card'},
    {title:'24/7 Support',desc:'Our team is always here to help.',icon:'i-clock'}
  ]},
  about:{eyebrow:'ABOUT US',heading:'About Globall Cloud',sub:'Your trusted logistics partner between China, the UAE, and Iraq.',
    missionTitle:'Our Mission',missionBody:'The mission of Globall Cloud is to deliver international-standard shipping services with full transparency and trust, for every client across the Kurdistan Region and Iraq.',
    visionTitle:'Our Vision',visionBody:'We aim to become the most trusted logistics company in the region, powered by modern technology and a customer-first approach.',
    valuesEyebrow:'OUR VALUES',valuesHeading:'What Guides Us',values:[
      {title:'Honesty',desc:'Dealing truthfully and transparently with every client.',icon:'i-shield'},
      {title:'Transparency',desc:'Clear pricing and processes with no hidden surprises.',icon:'i-eye'},
      {title:'Accountability',desc:'We own every shipment until it arrives safely.',icon:'i-box'},
      {title:'Customer Respect',desc:'Your time and needs always come first.',icon:'i-user'}
    ],
    storyTitle:'Our Story',storyBody:'Globall Cloud started as a shipping partner focused on solving cargo movement between the markets of China and the UAE and the cities of Iraq. Through efficiency and commitment, we have become a trusted choice for businesses and individuals who need reliable, fast cargo delivery. We continue to grow our services to improve the experience of every client.'},
  cta:{heading:'Ready to Ship?',sub:'Submit your request today and get a quote in minutes.',b1:'Get a Quote',b2:'Contact Us',whatsapp:'Chat on WhatsApp'},
  corridor:{eyebrow:'Operational Corridor',heading:'China → Dubai → Erbil',sub:'See the three stages of the network at a glance, presented like a premium logistics brand.',badge:'Live Corridor',items:[
    {flag:'🇨🇳',title:'China pickup',meta:'Origin Hub',desc:'Cargo is received, checked, and prepared for the next leg.',tags:['QC','Packing','Pickup']},
    {flag:'🇦🇪',title:'Dubai transit hub',meta:'Transit Hub',desc:'Fast handling and re-routing through our UAE operations center.',tags:['Transit','Air Cargo','Sea Cargo']},
    {flag:'🇮🇶',title:'Erbil delivery',meta:'Delivery Hub',desc:'After customs and final sorting, the shipment reaches your customer safely.',tags:['Customs','Door-to-Door','Final Mile']}
  ]},
  footer:{blurb:'Globall Cloud — Shipping you can trust, from China and the UAE to all of Iraq.',quick:'Quick Links',servicesH:'Services',contactH:'Contact',address:'New Erbil, behind Ma\u2019ad Gasha, Erbil, Iraq',rights:'All rights reserved.',privacy:'Privacy Policy',terms:'Terms of Service'},
  testi:{
    eyebrow:'Client Reviews',
    heading:'What Our Clients Say',
    sub:'A few words from customers who have shipped with Globall Cloud.',
    items:[
      {quote:'My shipments from Guangzhou to Erbil arrived right on schedule, and the tracking was crystal clear — I could see every step of my cargo\u2019s journey.', name:'Aras Mohammed', role:'Electronics store owner, Erbil', initials:'AM', stars:5},
      {quote:'Customs clearance is usually a headache, but the Globall Cloud team handled all the paperwork and I had zero issues. Very professional.', name:'Sara Rasheed', role:'Home goods trader', initials:'SR', stars:5},
      {quote:'From the first request to receiving my cargo, replies to my messages were always fast. Now I route all my imports through them.', name:'Karwan Aziz', role:'Tech goods importer', initials:'KA', stars:5}
    ]
  },
  legal:{
    updated:'Last updated: 2026',
    privacyEyebrow:'Privacy',
    privacyTitle:'Privacy Policy',
    termsEyebrow:'Legal',
    termsTitle:'Terms of Service',
    privacyBody:[
      {h:'1. Information We Collect', p:'When you create an account, submit a shipping request, or fill out a contact form, we collect: your name, phone number, email, origin/destination addresses, and shipment details (weight, type, item description). We never collect financial information such as bank card numbers.'},
      {h:'2. How We Use Your Information', p:'Your information is used only to: process and track your shipment, contact you about the status of your cargo, and improve our services. We do not sell your data or share it with third parties for marketing purposes.'},
      {h:'3. Data Security & Encryption', p:'All communication between your browser and our servers is encrypted via TLS/HTTPS. Your account is secured by Supabase Auth, and your data is protected by Row-Level Security policies — only you and authorized staff members can access it.'},
      {h:'4. Your Rights', p:'You may request to view, correct, or delete your account and personal data at any time. Simply contact us via the email or WhatsApp number listed on our Contact page.'},
      {h:'5. Contact Us', p:'If you have questions about this Privacy Policy, reach us at tamanblbas271@gmail.com or +964 750 757 7137.'}
    ],
    termsBody:[
      {h:'1. Acceptance of Terms', p:'By using this website, creating an account, or requesting services from Globall Cloud, you agree to these Terms of Service.'},
      {h:'2. Our Services', p:'Globall Cloud provides air, sea, and land freight, customs clearance, and door-to-door delivery between China, the UAE, and Iraq. Delivery times and rates depend on cargo type and route.'},
      {h:'3. Customer Responsibilities', p:'Customers are responsible for the accuracy of information provided and for keeping their account password secure. Shipping of prohibited items (weapons, narcotics, or goods banned under Iraqi law) is strictly forbidden.'},
      {h:'4. Pricing & Payment', p:'Prices are quoted in US Dollars ($) unless otherwise agreed. Payment terms are set according to the agreement between the customer and the company.'},
      {h:'5. Limitation of Liability', p:'Globall Cloud makes every effort to ensure safe, on-time delivery, but is not liable for delays caused by factors outside our control, such as customs procedures or natural disasters.'},
      {h:'6. Changes to These Terms', p:'Globall Cloud reserves the right to update these terms at any time. Continued use of our services after an update constitutes acceptance of the revised terms.'}
    ]
  },
  track:{heading:'Track Shipment',sub:'Enter your GC customer code or exact shipment ID to see its current status',searchPh:'e.g. GC-338 or shipment ID',searchBtn:'Track',
    notFoundTitle:'No shipment found',notFoundBody:'Please check the tracking ID, or submit a new request.',requestInstead:'Request a Shipment',
    detailsH:'Shipment Details',timelineH:'Timeline',save:'Add to My Shipments',saved:'Saved ✓',signInToSave:'Sign in to save',
    status:{pending:'Pending',transit:'In Transit',delivered:'Delivered'},
    steps:{placed:'Order Placed',pickedUp:'Picked Up',transit:'In Transit',customs:'Customs',outForDelivery:'Out for Delivery',delivered:'Delivered'},
    type:{air:'Air Freight',sea:'Sea Freight',land:'Land Freight'},
    weight:'Weight',volume:'Volume',items:'Items',total:'Total',paid:'Paid',due:'Due',eta:'Expected:',pendingValue:'To be confirmed'},
  invoice:{downloadBtn:'Download Invoice (PDF)',generating:'Generating...',title:'Shipping Invoice',trackingId:'Tracking ID',dateIssued:'Date Issued',billTo:'Bill To',route:'Route',serviceType:'Service Type',statusLabel:'Status',thanks:'Thank you for trusting Globall Cloud',failMsg:'Invoice generation failed, please try again.'},
  request:{heading:'Get a Quote / New Shipment',sub:'Fill in your shipment details and receive a request number for review.',
    name:'Full Name',phone:'Phone Number',email:'Email (optional)',origin:'Origin',destination:'Destination',type:'Shipping Type',weight:'Estimated Weight (kg)',notes:'Additional Notes',
    submit:'Submit Request',sending:'Sending...',successTitle:'Request received 🎉',successBody:'Your request number is — save it for follow-up:',trackNow:'Track Shipment',backHome:'Back to Home',waConfirm:'Confirm via WhatsApp',waPrefix:'Hi, I just submitted a request — request number:'},
  portal:{signInH:'Sign In',signInSub:'Enter your name and email to see your shipments',dashboardSub:'Your account dashboard',name:'Name',email:'Email',phone:'Phone (optional)',continueBtn:'Continue',trustNote:'Your info stays private and is never shared',
    hi:'Hi',myShipments:'My Shipments',emptyTitle:'No shipments yet',emptyBody:'Track a shipment or submit a new request to see it here.',
    qTrack:'Track Shipment',qRequest:'New Request',qEdit:'Edit Profile',save:'Save',cancel:'Cancel',signOut:'Sign Out'},
  pbn:{home:'Home',shipments:'Shipments',services:'Services',track:'Track',profile:'Profile',login:'Login'},
  contact:{heading:'Get in Touch',sub:'We are here to help - reach us however is easiest for you.',
    phoneL:'Phone',emailL:'Email',whatsappL:'WhatsApp',addressL:'Address',hoursL:'Working Hours',hoursV:'Sat - Thu: 9 AM - 7 PM',
    formName:'Your Name',formCompany:'Company (optional)',formType:'Request Type',typeShipping:'Shipping',typeInfo:'Information',typeSupport:'Support',formEmail:'Your Email',formMsg:'Your Message',send:'Send Message',sending:'Sending...',sentMsg:'Message saved! We will get back to you shortly.',getDirections:'Get Directions'},
  places:{guangzhou:'Guangzhou, China',shenzhen:'Shenzhen, China',dubai:'Dubai, UAE',sharjah:'Sharjah, UAE',erbil:'Erbil, Iraq',sulaymaniyah:'Sulaymaniyah, Iraq',duhok:'Duhok, Iraq',baghdad:'Baghdad, Iraq',basra:'Basra, Iraq',kirkuk:'Kirkuk, Iraq',mosul:'Mosul, Iraq'}
}
};

const SERVICE_ORDER = ['air','sea','land','customs','warehouse','door'];
const SERVICE_ICONS = {air:'i-plane',sea:'i-ship',land:'i-route',customs:'i-clipboard',warehouse:'i-warehouse',door:'i-truck'};
const ORIGIN_KEYS = ['guangzhou','shenzhen','dubai','sharjah'];
const DEST_KEYS = ['erbil','sulaymaniyah','duhok','baghdad','basra','kirkuk','mosul'];
const PLACE_META = {
  guangzhou:{flag:'🇨🇳', code:'CAN'}, shenzhen:{flag:'🇨🇳', code:'SZX'},
  dubai:{flag:'🇦🇪', code:'DXB'}, sharjah:{flag:'🇦🇪', code:'SHJ'},
  erbil:{flag:'🇮🇶', code:'EBL'}, sulaymaniyah:{flag:'🇮🇶', code:'ISU'},
  duhok:{flag:'🇮🇶', code:'DHK'}, baghdad:{flag:'🇮🇶', code:'BGW'}, basra:{flag:'🇮🇶', code:'BSR'},
  kirkuk:{flag:'🇮🇶', code:'KIK'}, mosul:{flag:'🇮🇶', code:'OSM'}
};
const STEP_ORDER = ['placed','pickedUp','transit','customs','outForDelivery','delivered'];
const KU_MONTHS = ['کانوونی دووەم','شوبات','ئازار','نیسان','ئایار','حوزەیران','تەمووز','ئاب','ئەیلوول','تشرینی یەکەم','تشرینی دووەم','کانوونی یەکەم'];
const EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let currentLang = 'ku';

function t(path){
  const parts = path.split('.');
  let node = I18N[currentLang];
  for(const p of parts){ if(node==null) return ''; node = node[p]; }
  return node==null ? '' : node;
}

/* Escapes text that will be inserted via innerHTML/template strings, whether it
   lands in a text node or inside a quoted HTML attribute (covers & < > " '). Any
   value that ultimately came from a customer or public form MUST pass through
   this before being placed in an innerHTML template. */
function escapeHtml(str){
  if(str===null || str===undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
/* USD → IQD dual-currency display. Rate is shared through Supabase when
   available, with localStorage kept as an offline fallback cache. */
const EXCHANGE_RATE_DEFAULT = 1500;
const EXCHANGE_RATE_STORAGE_KEY = 'gc_usd_iqd_rate';
let exchangeRateState = { value: EXCHANGE_RATE_DEFAULT, loaded: false, loading: null };

function normalizeExchangeRate(val){
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
function setExchangeRateLocal(val){
  const n = normalizeExchangeRate(val);
  if(!n) return false;
  exchangeRateState.value = n;
  try{ localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, String(n)); }catch(e){}
  return true;
}
function getExchangeRate(){
  return normalizeExchangeRate(exchangeRateState.value) || EXCHANGE_RATE_DEFAULT;
}
async function loadExchangeRate(){
  if(exchangeRateState.loading) return exchangeRateState.loading;
  exchangeRateState.loading = (async ()=>{
    // Start with any locally cached value so the UI never jumps to an empty state.
    try{
      const saved = normalizeExchangeRate(localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY));
      if(saved) exchangeRateState.value = saved;
    }catch(e){}

    if(!sb){
      exchangeRateState.loaded = true;
      return exchangeRateState.value;
    }

    const { data, error } = await sb
      .from('app_settings')
      .select('value')
      .eq('key', 'usd_iqd_rate')
      .maybeSingle();

    if(!error && data && data.value !== null && data.value !== undefined){
      const n = normalizeExchangeRate(data.value);
      if(n) setExchangeRateLocal(n);
    }

    exchangeRateState.loaded = true;
    return exchangeRateState.value;
  })().finally(()=>{ exchangeRateState.loading = null; });
  return exchangeRateState.loading;
}
async function setExchangeRate(val){
  const prev = getExchangeRate();
  if(!setExchangeRateLocal(val)) return false;

  if(sb){
    const payload = { key: 'usd_iqd_rate', value: exchangeRateState.value, updated_at: new Date().toISOString() };
    const { error } = await sb.from('app_settings').upsert(payload, { onConflict: 'key' });
    if(error){
      setExchangeRateLocal(prev);
      console.error('Failed to persist exchange rate:', error);
      return false;
    }
  }

  return true;
}
async function saveExchangeRate(){
  const val = document.getElementById('exchangeRateInput').value;
  const ok = await setExchangeRate(val);
  if(!ok){ showToast('ژمارەیەکی ڕاست بنووسە یان Supabase نەگەیشت.', 'error'); return; }
  showToast('نرخی دراو نوێکرایەوە.', 'success');
  logActivity('update_exchange_rate', null, 'rate='+val);
  const wrap = document.getElementById('adminPanel-finance');
  if(wrap) wrap.innerHTML = financeRowsHTML(currentShipmentsCache||[]);
}
function fmtUSD(amount){
  const usd = Number(amount)||0;
  const iqd = Math.round(usd * getExchangeRate());
  return `$${usd.toLocaleString()} <span class="hint" style="font-size:12px;">(≈ ${iqd.toLocaleString()} د.ع)</span>`;
}
function toArabicDigits(n){
  const map={'0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩'};
  return String(n).replace(/[0-9]/g, d=>map[d]);
}
function formatDate(iso){
  if(!iso) return '';
  const dt = new Date(iso);
  if(currentLang==='ku'){ return toArabicDigits(dt.getDate())+'ی '+KU_MONTHS[dt.getMonth()]+'ی '+toArabicDigits(dt.getFullYear()); }
  return EN_MONTHS[dt.getMonth()]+' '+dt.getDate()+', '+dt.getFullYear();
}
function formatMoney(v){ return (v===null||v===undefined) ? t('track.pendingValue') : '$'+v; }
function placeLabel(key){ return t('places.'+key) || key; }

/* ================= STORAGE HELPERS ================= */
async function safeGet(key, shared){
  try{ const r = await window.storage.get(key, shared); return r ? r.value : null; }
  catch(e){ return null; }
}
async function safeSet(key, value, shared){
  try{ return await window.storage.set(key, value, shared); }
  catch(e){ return null; }
}
async function safeDelete(key, shared){
  try{ return await window.storage.delete(key, shared); }
  catch(e){ return null; }
}
async function safeList(prefix, shared){
  try{ const r = await window.storage.list(prefix, shared); return r ? r.keys : []; }
  catch(e){ return []; }
}

function generateTrackingId(){
  // Wide random range (7 digits) + a time-based component so two requests
  // submitted in the same millisecond still can't collide in practice.
  const timePart = Date.now() % 100000;
  const randPart = Math.floor(Math.random()*900)+100;
  return 'GC'+timePart+randPart;
}
/* Generates a tracking ID and, when Supabase is configured, verifies it isn't
   already in use before returning it (protects against the old fixed-range ID
   scheme where two shipments could silently collide and overwrite each other). */
async function generateUniqueTrackingId(){
  for(let i=0;i<5;i++){
    const id = generateTrackingId();
    if(!sb) return id;
    const {data} = await sb.from('shipments').select('id').eq('id', id).maybeSingle();
    if(!data) return id;
  }
  return generateTrackingId()+Math.floor(Math.random()*9);
}

function seedShipments(){
  const now = Date.now();
  const past = n => new Date(now - n*86400000).toISOString();
  const future = n => new Date(now + n*86400000).toISOString();
  return [
    {id:'GC10052341', originKey:'dubai', destKey:'erbil', type:'sea', weightKg:1250, volumeCbm:2.5, itemsCount:8, totalAmount:1250, paidAmount:750,
      currentStepIndex:2, stepDates:{placed:past(17), pickedUp:past(13), transit:past(12)}, eta:future(4)},
    {id:'GC10052340', originKey:'sharjah', destKey:'baghdad', type:'air', weightKg:640, volumeCbm:1.1, itemsCount:5, totalAmount:980, paidAmount:980,
      currentStepIndex:5, stepDates:{placed:past(23), pickedUp:past(21), transit:past(20), customs:past(13), outForDelivery:past(9), delivered:past(8)}},
    {id:'GC10052339', originKey:'guangzhou', destKey:'erbil', type:'sea', weightKg:2100, volumeCbm:4.2, itemsCount:14, totalAmount:1890, paidAmount:0,
      currentStepIndex:0, stepDates:{placed:past(2)}, eta:future(22)}
  ];
}

async function initShipments(){
  if(sb) return; // Supabase is now the source of truth once configured (seed row is in supabase-schema.sql)
  const keys = await safeList('shipment:', true);
  if(!keys || keys.length===0){
    for(const s of seedShipments()){ await safeSet('shipment:'+s.id, JSON.stringify(s), true); }
  }
}

/* Convert between the app's shipment object shape and a Supabase row */
function shipmentToRow(s){
  const r = s.requester || {};
  return {
    id:s.id, customer_name:r.name||null, customer_phone:r.phone||null, customer_email:r.email||null, notes:r.notes||null,
    origin_key:s.originKey, dest_key:s.destKey, type:s.type, weight_kg:s.weightKg, volume_cbm:s.volumeCbm,
    items_count:s.itemsCount, total_amount:s.totalAmount||0, paid_amount:s.paidAmount||0,
    current_step_index:s.currentStepIndex||0, step_dates:s.stepDates||{}, step_photos:s.stepPhotos||{}, eta:s.eta||null,
    batch_code: s.batchCode || null,
    customer_user_id: s.customerUserId || null,
    directory_customer_id: s.directoryCustomerId || null
  };
}
function rowToShipment(row){
  return {
    id:row.id, originKey:row.origin_key, destKey:row.dest_key, type:row.type,
    weightKg:row.weight_kg, volumeCbm:row.volume_cbm, itemsCount:row.items_count,
    totalAmount:row.total_amount, paidAmount:row.paid_amount,
    currentStepIndex:row.current_step_index, stepDates:row.step_dates||{}, stepPhotos:row.step_photos||{}, eta:row.eta,
    createdAt: row.created_at,
    batchCode: row.batch_code || null,
    requester:{name:row.customer_name, phone:row.customer_phone, email:row.customer_email, notes:row.notes},
    customerUserId: row.customer_user_id || null,
    directoryCustomerId: row.directory_customer_id || null
  };
}
/* Looks up whether a phone number matches an existing Customer Directory
   entry, so a new shipment (guest, signed-in customer, or staff-created)
   gets linked automatically — this is what powers the "total shipments /
   outstanding balance" numbers shown against a directory customer.
   Safe to call as a guest: the RPC only ever returns a bare id or null. */
async function lookupDirectoryCustomerId(phone){
  if(!sb || !phone) return null;
  try{
    const {data} = await sb.rpc('find_directory_customer_by_phone', {p_phone: phone});
    return data || null;
  }catch(e){ return null; }
}

async function getShipment(id){
  if(sb){
    const {data:{session}} = await sb.auth.getSession();
    if(session){
      const {data, error} = await sb.from('shipments').select('*').eq('id', id).maybeSingle();
      if(!error && data) return rowToShipment(data);
    }
    const {data} = await sb.rpc('track_shipment', {p_id:id});
    if(data && data[0]) return rowToShipment(data[0]);
    try{
      const projectUrl = window.gcSupabaseConfig?.url || SUPABASE_URL;
      const response = await fetch(`${projectUrl}/functions/v1/public-track?id=${encodeURIComponent(id)}`, { method:'GET', headers:{Accept:'application/json',apikey:SUPABASE_PUBLISHABLE_KEY}, cache:'no-store' });
      const body = await response.json().catch(()=>({}));
      return response.ok && body?.shipment ? rowToShipment(body.shipment) : null;
    }catch(_error){ return null; }
  }
  const val = await safeGet('shipment:'+id, true);
  return val ? JSON.parse(val) : null;
}
async function saveShipment(s){
  if(sb){ const {error} = await sb.from('shipments').upsert(shipmentToRow(s)); return {error}; }
  await safeSet('shipment:'+s.id, JSON.stringify(s), true);
  return {error:null};
}
async function getAllShipments(){
  if(sb){
    // Defense-in-depth: only an authenticated staff session may request the full shipment dataset.
    // RLS remains the authoritative security boundary; this guard prevents accidental broad reads
    // from the customer-facing client and makes the intended access model explicit.
    const {data:{session}} = await sb.auth.getSession();
    if(!session) return [];
    const {data:staffRow, error:staffErr} = await sb.from('staff').select('id,role,is_active').eq('id', session.user.id).maybeSingle();
    if(staffErr || !staffRow || staffRow.is_active === false || !['admin','super_admin','accountant'].includes(staffRow.role)) return [];
    const {data, error} = await sb.from('shipments').select('*').order('created_at', {ascending:false});
    if(error) return [];
    return (data||[]).map(rowToShipment);
  }
  const keys = await safeList('shipment:', true);
  const list = [];
  for(const k of keys){ const val = await safeGet(k, true); if(val) list.push(JSON.parse(val)); }
  return list.sort((a,b)=>(b.stepDates?.placed||'').localeCompare(a.stepDates?.placed||''));
}

async function getProfile(){
  if(!sb) return null;
  const {data:{session}} = await sb.auth.getSession();
  if(!session) return null;
  const meta = session.user.user_metadata || {};
  return {name: meta.full_name || session.user.email.split('@')[0], email: session.user.email, phone: meta.phone || '', avatarUrl: meta.avatar_url || ''};
}

let pendingSignupEmail = null;
function setPortalAuthTab(tab){
  document.getElementById('portalTab-signin').classList.toggle('active', tab==='signin');
  document.getElementById('portalTab-signup').classList.toggle('active', tab==='signup');
  document.getElementById('portalSignInForm').style.display = tab==='signin' ? 'block' : 'none';
  document.getElementById('portalSignUpForm').style.display = tab==='signup' ? 'block' : 'none';
  document.getElementById('portalVerifyForm').style.display = tab==='verify' ? 'block' : 'none';
}

async function handleCustomerSignIn(e){
  e.preventDefault();
  const errEl = document.getElementById('portalSignInError');
  errEl.style.display = 'none';
  const btn = document.getElementById('portalSignInBtn');
  btn.disabled = true;
  const email = document.getElementById('siEmail').value.trim();
  const password = document.getElementById('siPassword').value;
  const {error} = await sb.auth.signInWithPassword({email, password});
  btn.disabled = false;
  if(error){
    if(error.message && error.message.toLowerCase().includes('email not confirmed')){
      errEl.textContent = 'تکایە یەکەم جار ئیمەیلەکەت پشتڕاست بکەرەوە (سەیری ئیمەیلی نوێت بکە بۆ لینکی پشتڕاستکردنەوە).';
    } else {
      errEl.textContent = 'هەڵە: ئیمەیل یان وشەی نهێنی هەڵەیە.';
    }
    errEl.style.display = 'block';
    return;
  }
  await renderPortal();
  await updateNavAuthState();
}

async function handleCustomerSignUp(e){
  e.preventDefault();
  const errEl = document.getElementById('portalSignUpError');
  const noticeEl = document.getElementById('portalSignUpNotice');
  errEl.style.display = 'none';
  noticeEl.style.display = 'none';
  const btn = document.getElementById('portalSignUpBtn');
  btn.disabled = true;
  const name = document.getElementById('suName').value.trim();
  const email = document.getElementById('suEmail').value.trim();
  const phone = document.getElementById('suPhone').value.trim();
  const password = document.getElementById('suPassword').value;
  const {data, error} = await sb.auth.signUp({email, password, options:{data:{full_name:name, phone}}});
  btn.disabled = false;
  if(error){
    errEl.textContent = error.message.includes('already') ? 'ئەم ئیمەیلە پێشتر تۆمارکراوە.' : 'هەڵەیەک ڕوویدا، تکایە دووبارە هەوڵبدەرەوە.';
    errEl.style.display = 'block';
    return;
  }
  if(data.session){
    await renderPortal();
    await updateNavAuthState();
  } else {
    pendingSignupEmail = email;
    document.getElementById('suVerifyCode').value = '';
    document.getElementById('portalVerifyError').style.display = 'none';
    setPortalAuthTab('verify');
  }
}

async function handleVerifySignupCode(e){
  e.preventDefault();
  const errEl = document.getElementById('portalVerifyError');
  errEl.style.display = 'none';
  const btn = document.getElementById('portalVerifyBtn');
  const code = document.getElementById('suVerifyCode').value.trim();
  if(!pendingSignupEmail){ errEl.textContent = 'تکایە یەکەم جار هەژمار دروستبکە.'; errEl.style.display='block'; return; }
  btn.disabled = true;
  const {data, error} = await sb.auth.verifyOtp({email: pendingSignupEmail, token: code, type: 'signup'});
  btn.disabled = false;
  if(error){
    errEl.textContent = 'کۆدەکە هەڵەیە یان کاتی بەسەرچووە. تکایە دووبارە هەوڵبدەرەوە یان داوای کۆدێکی نوێ بکە.';
    errEl.style.display = 'block';
    return;
  }
  pendingSignupEmail = null;
  if(data.session){
    await renderPortal();
    await updateNavAuthState();
  } else {
    setPortalAuthTab('signin');
  }
}

async function resendSignupCode(){
  if(!pendingSignupEmail) return;
  const errEl = document.getElementById('portalVerifyError');
  const {error} = await sb.auth.resend({type:'signup', email: pendingSignupEmail});
  errEl.style.display = 'block';
  errEl.style.color = error ? '' : 'var(--mint, #2ecc71)';
  errEl.textContent = error ? 'نەتوانرا کۆدی نوێ بنێردرێت، هەوڵبدەرەوە.' : 'کۆدێکی نوێ نێردرا بۆ ئیمەیلەکەت.';
}

async function handleSignOut(){
  if(sb) await sb.auth.signOut();
  await renderPortal();
  await updateNavAuthState();
}

function statusOf(s){ return s.currentStepIndex>=5 ? 'delivered' : (s.currentStepIndex===0 ? 'pending' : 'transit'); }

/* ================= ROUTER ================= */
// Every page this app can show, kept in sync with id="page-*" sections below.
// Used to validate incoming hashes so a stray/unknown #fragment can't leave
// the app on a blank page.
const VALID_ROUTES = ['home','about','services','track','contact','request','portal','privacy','terms','admin'];
function route(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target = document.getElementById('page-'+id);
  if(target) target.classList.add('active');
  document.querySelectorAll('.nav-links a, .mobile-menu a[data-route]').forEach(a=>a.classList.toggle('active', a.dataset.route===id));
  window.scrollTo({top:0, behavior:'auto'});
  closeMobileMenu();
  // Keep the URL shareable/bookmarkable (e.g. #services) without adding a
  // history entry per click or re-triggering the hashchange listener below
  // (replaceState is silent to 'hashchange' — only real navigation fires it).
  const hash = id==='home' ? '' : '#'+id;
  if(location.hash!==hash){
    history.replaceState(null, '', location.pathname+location.search+hash);
  }
  if(id==='portal') renderPortal();
  else updatePortalBottomNavVisibility(id);
  if(id==='services') renderServicesDetail();
  if(id==='admin') renderAdminGate();
}
/* The app-style bottom-tab bar (Home/Services/Track/Profile) is a mobile-first
   nav — most visitors are on phones, so it stays visible on every public page,
   not just once a customer is signed in. On desktop the top nav is used instead
   (see the max-width:760px media query on .portal-bottom-nav.active). */
const PBN_GUEST_TAB_FOR_PAGE = {home:'home', services:'shipments', track:'track', portal:'profile'};
async function updatePortalBottomNavVisibility(pageId){
  const nav = document.getElementById('portalBottomNav');
  if(pageId==='admin'){ nav.classList.remove('active'); return; }
  nav.classList.add('active');
  const profile = await getProfile();
  applyPbnMode(!!profile);
  if(!profile){
    const guestTab = PBN_GUEST_TAB_FOR_PAGE[pageId];
    document.querySelectorAll('.pbn-item').forEach(btn=>{
      btn.classList.toggle('active', !!guestTab && btn.dataset.tab===guestTab);
    });
  }
}
/* Swaps the "Shipments"/"Profile" tab into "Services"/"Login" (with a person
   icon) when nobody is signed in, and back to the customer-portal wording
   and gear icon once they are. */
function applyPbnMode(isAuthed){
  const nav = document.getElementById('portalBottomNav');
  if(!nav) return;
  nav.dataset.mode = isAuthed ? 'auth' : 'guest';
  const shipLabel = nav.querySelector('[data-tab="shipments"] [data-i18n]');
  const profLabel = nav.querySelector('[data-tab="profile"] [data-i18n]');
  const profIcon = nav.querySelector('[data-tab="profile"] use');
  if(shipLabel) shipLabel.setAttribute('data-i18n', isAuthed ? 'pbn.shipments' : 'pbn.services');
  if(profLabel) profLabel.setAttribute('data-i18n', isAuthed ? 'pbn.profile' : 'pbn.login');
  if(profIcon) profIcon.setAttribute('href', isAuthed ? '#i-settings' : '#i-user');
  applyI18n();
}
/* Single entry point for every bottom-nav tap. Signed-in customers get the
   in-portal dashboard tabs; guests are routed to the matching public page,
   with "Profile" opening sign-in/sign-up. */
function pbnTap(tab){
  const nav = document.getElementById('portalBottomNav');
  if(nav.dataset.mode === 'auth'){ goPortalTab(tab); return; }
  if(tab==='home') route('home');
  else if(tab==='shipments') route('services');
  else if(tab==='track') route('track');
  else if(tab==='profile') route('portal');
}
function goPortalTab(tab){
  currentPortalTab = tab;
  route('portal');
}
function toggleMobileMenu(){ document.getElementById('mobileMenu').classList.toggle('open'); }
function closeMobileMenu(){ document.getElementById('mobileMenu').classList.remove('open'); }

function goTrack(prefill){
  route('track');
  if(prefill){
    document.getElementById('trackInput').value = prefill;
    doTrackSearch();
  }
}

/* ================= RENDER: HOME BLOCKS ================= */
function renderHomeServices(){
  const wrap = document.getElementById('homeServicesGrid');
  wrap.innerHTML = SERVICE_ORDER.map(key=>{
    const item = t('services.items.'+key);
    return `<div class="service-card" data-gc-onclick="route('services')">
      <div class="service-icon"><svg class="icon-lg"><use href="#${SERVICE_ICONS[key]}"></use></svg></div>
      <h4>${item.title}</h4>
      <p>${item.desc}</p>
      <span class="learn">${t('services.learnMore')} <svg class="icon-sm"><use href="#i-arrow"></use></svg></span>
    </div>`;
  }).join('');
}
function renderBusinessHub(){
  const wrap = document.getElementById('businessHubGrid');
  if(!wrap) return;
  const order = ['services','quote','dashboard','track','warehouses','contact'];
  wrap.innerHTML = order.map(key=>{
    const item = t('business.items.'+key);
    return `<div class="hub-card" role="button" tabindex="0" data-gc-onclick="route('${item.route}')">
      <div class="hub-icon"><svg class="icon-lg"><use href="#${item.icon}"></use></svg></div>
      <h4>${item.title}</h4>
      <p>${item.desc}</p>
      <span class="hub-link">${item.action} <svg class="icon-sm"><use href="#i-arrow"></use></svg></span>
    </div>`;
  }).join('');
}
function renderDashboardPreview(){
  const wrap = document.getElementById('dashMiniGrid');
  if(!wrap) return;
  const items = t('dashboardPreview.stats') || [];
  wrap.innerHTML = items.map(it=>`<div class="mini-stat"><b>${it.v}</b><span>${it.l}</span></div>`).join('');
}
function renderCorridorStrip(){
  const wrap = document.getElementById('corridorStrip');
  if(!wrap) return;
  const items = t('corridor.items') || [];
  wrap.innerHTML = items.map(it=>`<div class="corridor-item">
    <div class="corridor-top">
      <div class="corridor-flag">${it.flag || '•'}</div>
      <div>
        <h4>${it.title}</h4>
        <div class="corridor-meta">${it.meta || ''}</div>
      </div>
    </div>
    <p>${it.desc || ''}</p>
    <div class="corridor-tags">${(it.tags||[]).map(tag=>`<span>${tag}</span>`).join('')}</div>
  </div>`).join('');
}
function renderWarehouseCards(){
  const wrap = document.getElementById('warehouseCardsGrid');
  if(!wrap) return;
  const items = t('warehouses.items');
  const order = ['guangzhou','dubai','erbil'];
  wrap.innerHTML = order.map(key=>{
    const item = items[key];
    return `<div class="warehouse-card">
      <span class="tag">${item.tag}</span>
      <h4>${item.title}</h4>
      <p>${item.address}</p>
      <div class="warehouse-meta">
        <span><svg><use href="#i-clock"></use></svg>${item.hours}</span>
        ${item.features.map(f=>`<span><svg><use href="#i-check"></use></svg>${f}</span>`).join('')}
      </div>
    </div>`;
  }).join('');
}
function renderOperationsHub(){
  const metricsWrap = document.getElementById('opsMetrics');
  const cardsWrap = document.getElementById('opsCards');
  if(metricsWrap){
    const metrics = t('ops.metrics') || [];
    metricsWrap.innerHTML = metrics.map(m=>`<div class="ops-metric"><b>${m.v}</b><span>${m.l}</span></div>`).join('');
  }
  if(cardsWrap){
    const cards = t('ops.cards') || [];
    cardsWrap.innerHTML = cards.map(card=>`<div class="ops-card">
      <div class="ops-card-top">
        <div class="service-icon"><svg class="icon-lg"><use href="#${card.icon}"></use></svg></div>
        <div>
          <h4>${card.title}</h4>
          <p>${card.desc}</p>
        </div>
      </div>
      <div class="ops-points">${(card.points||[]).map(p=>`<span>${p}</span>`).join('')}</div>
    </div>`).join('');
  }
}
function renderHow(){
  const wrap = document.getElementById('howGrid');
  const items = t('how.items');
  wrap.innerHTML = items.map((it,i)=>`<div class="step-card">
    <span class="step-num">0${i+1}</span>
    <h4>${it.title}</h4><p>${it.desc}</p>
  </div>`).join('');
}
function renderWhy(){
  const wrap = document.getElementById('whyGrid');
  const items = t('why.items');
  wrap.innerHTML = items.map(it=>`<div class="card feature-card">
    <div class="service-icon"><svg class="icon-lg"><use href="#${it.icon}"></use></svg></div>
    <h4 style="font-size:15px; font-weight:800; margin-bottom:6px;">${it.title}</h4>
    <p style="color:var(--muted); font-size:13.5px;">${it.desc}</p>
  </div>`).join('');
}
function renderTestimonials(){
  const wrap = document.getElementById('testimonialsGrid');
  if(!wrap) return;
  const items = t('testi.items');
  const star = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.4 7 .7-5.3 4.8 1.6 6.9L12 17.6l-6.2 3.7 1.6-6.9L2.1 9.6l7-.7L12 2.5z"/></svg>`;
  wrap.innerHTML = items.map(it=>`<div class="testimonial-card">
    <div class="testimonial-stars">${star.repeat(it.stars||5)}</div>
    <p class="testimonial-quote">“${it.quote}”</p>
    <div class="testimonial-person">
      <div class="testimonial-avatar">${it.initials}</div>
      <div><b>${it.name}</b><span>${it.role}</span></div>
    </div>
  </div>`).join('');
}
function renderLegalDocs(){
  const privacyWrap = document.getElementById('privacyBody');
  const termsWrap = document.getElementById('termsBody');
  if(privacyWrap){
    const sections = t('legal.privacyBody');
    privacyWrap.innerHTML = sections.map(s=>`<div class="legal-section"><h3>${s.h}</h3><p>${s.p}</p></div>`).join('');
  }
  if(termsWrap){
    const sections = t('legal.termsBody');
    termsWrap.innerHTML = sections.map(s=>`<div class="legal-section"><h3>${s.h}</h3><p>${s.p}</p></div>`).join('');
  }
}
function renderAboutValues(){
  const wrap = document.getElementById('aboutValuesGrid');
  if(!wrap) return;
  const items = t('about.values');
  wrap.innerHTML = items.map(it=>`<div class="card feature-card">
    <div class="service-icon"><svg class="icon-lg"><use href="#${it.icon}"></use></svg></div>
    <h4 style="font-size:15px; font-weight:800; margin-bottom:6px;">${it.title}</h4>
    <p style="color:var(--muted); font-size:13.5px;">${it.desc}</p>
  </div>`).join('');
}
function renderFooterServices(){
  const wrap = document.getElementById('footerServicesList');
  wrap.innerHTML = SERVICE_ORDER.map(key=>`<li><a data-gc-onclick="route('services')">${t('services.items.'+key).title}</a></li>`).join('');
}
function renderServicesDetail(){
  const wrap = document.getElementById('servicesDetailWrap');
  if(!wrap) return;
  const ku = currentLang === 'ku';
  const copy = ku ? {
    eyebrow:'خزمەتگوزاریی تایبەت',
    benefits:'سوودە سەرەکییەکان',
    trust:'ڕوونی، شوێنکەوتن و پشتگیری لە هەموو هەنگاوێکدا.',
    quote:'داواکردنی نرخ',
    track:'شوێنکەوتنی بار'
  } : {
    eyebrow:'SPECIALIZED SERVICE',
    benefits:'KEY BENEFITS',
    trust:'Clear updates, live tracking and support at every step.',
    quote:'Request a quote',
    track:'Track shipment'
  };
  const routes = ku ? {
    air:['چین / دوبەی','هەولێر و هەموو عێراق'],
    sea:['چین / دوبەی','هەولێر و هەموو عێراق'],
    land:['دوبەی','سعودیە ← عێراق'],
    customs:['بەندر و سنوور','ناوخۆی عێراق'],
    warehouse:['ئیمارات / عێراق','کۆگا و هابەکان'],
    door:['هابە سەرەکییەکان','بەردەری ماڵ یان کۆمپانیا']
  } : {
    air:['China / UAE','Erbil & Iraq'],
    sea:['China / UAE','Erbil & Iraq'],
    land:['Dubai','Saudi Arabia → Iraq'],
    customs:['Ports & borders','Iraq inland'],
    warehouse:['UAE / Iraq','Warehouses & hubs'],
    door:['Main hubs','Home or business door']
  };
  wrap.innerHTML = SERVICE_ORDER.map((key,index)=>{
    const item = t('services.items.'+key);
    const detail = t('services.details.'+key) || {};
    const lane = routes[key] || routes.air;
    const number = String(index + 1).padStart(2,'0');
    const metaAudience = ku ? 'گونجاو بۆ' : 'Best for';
    const metaTiming = ku ? 'کاتی گەیشتن' : 'Typical timing';
    return `<article class="service-detail reveal in-view" data-service="${key}">
      <div class="service-detail-main">
        <div class="service-detail-kicker"><span class="service-detail-index">${number}</span><span>${copy.eyebrow}</span></div>
        <h3>${item.title}</h3>
        <p class="desc">${item.desc}</p>
        <div class="service-detail-route" aria-label="${ku ? 'ڕێڕەوی خزمەتگوزاری' : 'Service route'}">
          <span>${lane[0]}</span><span class="route-arrow" aria-hidden="true">→</span><span>${lane[1]}</span>
        </div>
        <div class="service-detail-meta">
          <div class="service-meta-item"><small>${metaAudience}</small><b>${detail.audience || ''}</b></div>
          <div class="service-meta-item"><small>${metaTiming}</small><b>${detail.timing || ''}</b></div>
        </div>
        <div class="service-detail-benefit-title">${copy.benefits}</div>
        <ul class="feature-list">${item.features.map(f=>`<li><svg class="icon-sm"><use href="#i-check"></use></svg><span>${f}</span></li>`).join('')}</ul>
        ${detail.faqQ ? `<details class="service-inline-faq"><summary>${detail.faqQ}</summary><p>${detail.faqA || ''}</p></details>` : ''}
      </div>
      <aside class="service-detail-side">
        <div>
          <div class="service-icon"><svg class="icon-lg"><use href="#${SERVICE_ICONS[key]}"></use></svg></div>
          <p>${copy.trust}</p>
        </div>
        <div style="display:grid; gap:8px; width:100%;">
          <button class="btn btn-primary" data-gc-onclick="route('request')">${copy.quote}</button>
          <button class="btn btn-outline" data-gc-onclick="route('track')">${copy.track}</button>
        </div>
      </aside>
    </article>`;
  }).join('');
  renderServicesFaq();
}
function renderServicesFaq(){
  const wrap = document.getElementById('servicesFaqWrap');
  if(!wrap) return;
  const items = t('services.faq');
  wrap.innerHTML = items.map((it,i)=>`
    <div class="faq-item" id="faq-${i}">
      <div class="faq-q" data-gc-onclick="toggleFaq(${i})"><span>${it.q}</span><svg><use href="#i-chevron-down"></use></svg></div>
      <div class="faq-a"><p>${it.a}</p></div>
    </div>`).join('');
}
function toggleFaq(i){
  document.getElementById('faq-'+i).classList.toggle('open');
}

/* ================= RENDER: TRACK ================= */
function timelineHTML(s){
  return STEP_ORDER.map((key,i)=>{
    const status = statusOf(s);
    const done = i < s.currentStepIndex || (i===s.currentStepIndex && status==='delivered');
    const current = i===s.currentStepIndex && status!=='delivered';
    const cls = done?'done':(current?'current':'future');
    let dateStr = '';
    if(s.stepDates && s.stepDates[key]) dateStr = formatDate(s.stepDates[key]);
    else if(key==='delivered' && s.eta) dateStr = t('track.eta')+' '+formatDate(s.eta);
    const photoUrls = s.stepPhotos && s.stepPhotos[key] ? (Array.isArray(s.stepPhotos[key]) ? s.stepPhotos[key] : [s.stepPhotos[key]]) : [];
    const photoHTML = photoUrls.length ? `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">${photoUrls.map(url=>
        `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="وێنەی ئەم هەنگاوە" style="width:56px; height:56px; object-fit:cover; border-radius:10px; border:1px solid var(--line-soft);"></a>`
      ).join('')}${photoUrls.length>1 ? `<span class="hint" style="align-self:center;">(${photoUrls.length} کارتۆن)</span>` : ''}</div>` : '';
    return `<div class="tl-step ${cls}"><div class="tl-dot"></div><div class="tl-body"><b>${t('track.steps.'+key)}</b><span>${dateStr}</span>${photoHTML}</div></div>`;
  }).join('');
}

/* Copies a tracking ID to the clipboard with a toast confirmation; falls back
   gracefully (still shows the id-badge as a plain span) if the Clipboard API
   is unavailable, e.g. on very old browsers or non-HTTPS previews. */
async function copyTrackingId(id){
  try{
    await navigator.clipboard.writeText(id);
    showToast(currentLang==='ku' ? 'ژمارەی شوێنکەوتن کۆپی کرا.' : 'Tracking ID copied.', 'success');
  }catch(e){
    showToast(currentLang==='ku' ? 'کۆپیکردن سەرکەوتوو نەبوو.' : 'Copy failed.', 'error');
  }
}
async function copyRequestId(id){
  try{
    await navigator.clipboard.writeText(id);
    showToast(currentLang==='ku' ? 'ژمارەی داواکاری کۆپی کرا.' : 'Request number copied.', 'success');
  }catch(e){
    showToast(currentLang==='ku' ? 'کۆپیکردن سەرکەوتوو نەبوو.' : 'Copy failed.', 'error');
  }
}
async function shipmentCardHTML(s){
  const status = statusOf(s);
  const hasFinance = s.totalAmount !== null && s.totalAmount !== undefined;
  const dueVal = hasFinance ? formatMoney(s.totalAmount - (s.paidAmount||0)) : '';
  const financeHTML = hasFinance ? `
      <div class="kv"><span>${t('track.total')}</span><b>${formatMoney(s.totalAmount)}</b></div>
      <div class="kv"><span>${t('track.paid')}</span><b>${formatMoney(s.paidAmount)}</b></div>
      <div class="kv"><span>${t('track.due')}</span><b style="color:var(--amber);">${dueVal}</b></div>` : '';
  return `
  <div class="track-hero-card reveal in-view">
    <div class="thc-top">
      <span class="id-badge mono" data-gc-onclick="copyTrackingId('${s.id}')" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;" title="Copy">${s.id} <svg class="icon-sm" style="width:14px; height:14px;"><use href="#i-copy"></use></svg></span>
      <span class="stamp ${status}">${t('track.status.'+status)}</span>
    </div>
    <div class="route-line"><span>${placeLabel(s.originKey)}</span><span class="arrow">→</span><span>${placeLabel(s.destKey)}</span></div>
  </div>
  <div class="grid-2 reveal in-view">
    <div class="card">
      <h4>${t('track.detailsH')}</h4>
      <div class="kv"><span>${t('request.type')}</span><b>${t('track.type.'+s.type)}</b></div>
      <div class="kv"><span>${t('track.weight')}</span><b>${s.weightKg} kg</b></div>
      <div class="kv"><span>${t('track.volume')}</span><b>${s.volumeCbm} CBM</b></div>
      ${s.itemsCount!=null?`<div class="kv"><span>${t('track.items')}</span><b>${s.itemsCount}</b></div>`:''}
      ${financeHTML}
    </div>
    <div class="card">
      <h4>${t('track.timelineH')}</h4>
      <div class="timeline">${timelineHTML(s)}</div>
    </div>
  </div>
  <div class="card reveal in-view" style="margin-top:16px;">
    <h4 style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <span>${currentLang==='ku'?'نەخشەی ڕێگا (ڕاستەوخۆ)':'Live route map'}</span>
      <button class="btn btn-ghost" style="padding:6px 12px; font-size:12.5px;" data-gc-onclick="enableTrackingNotifications()">${currentLang==='ku'?'🔔 ئاگادارکردنەوەکان چالاک بکە':'🔔 Enable notifications'}</button>
    </h4>
    <div id="liveMap-${s.id}"></div>
  </div>
  ${hasFinance ? `<div style="margin-top:16px; text-align:center;">
    <button class="btn btn-outline" id="invoiceBtn-${s.id}" data-gc-onclick="generateInvoiceForId('${s.id}')"><svg class="icon-sm"><use href="#i-download"></use></svg><span>${t('invoice.downloadBtn')}</span></button>
  </div>` : ''}
  `;
}
/* Starts the live map + realtime updates for the currently-displayed shipment.
   Called after shipmentCardHTML() is inserted into the DOM (the container div
   must already exist). Safe no-op if tracking-enhanced.js failed to load. */
function startEnhancedTrackingFor(shipmentId){
  if(!window.enhancedTracking) return;
  window.enhancedTracking.initializeTracking(shipmentId, 'liveMap-'+shipmentId).catch(()=>{});
}
async function enableTrackingNotifications(){
  if(!window.enhancedTracking){ showToast(currentLang==='ku'?'ئەم تایبەتمەندییە بەردەست نییە.':'Not available.', 'error'); return; }
  const ok = await window.enhancedTracking.requestNotificationPermission();
  showToast(ok
    ? (currentLang==='ku'?'ئاگادارکردنەوەکان چالاک کران.':'Notifications enabled.')
    : (currentLang==='ku'?'مۆڵەت نەدرا بۆ ئاگادارکردنەوە.':'Notification permission denied.'),
    ok?'success':'error');
}

/* ================= INVOICE (PDF) =================
   Renders a clean, printable HTML invoice off-screen, snapshots it with
   html2canvas (so Kurdish/Arabic RTL text renders correctly — jsPDF's built-in
   fonts can't shape Arabic-script glyphs on their own), then drops that image
   into a single-page A4 jsPDF document. */
function invoiceDocumentHTML(s){
  const due = (s.totalAmount!=null) ? (s.totalAmount - (s.paidAmount||0)) : null;
  return `<div style="width:780px; background:#ffffff; color:#101820; font-family:'Vazirmatn','Noto Sans Arabic',sans-serif; padding:48px; direction:${currentLang==='ku'?'rtl':'ltr'};" dir="${currentLang==='ku'?'rtl':'ltr'}">
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #00A8BD; padding-bottom:20px; margin-bottom:28px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="logo-icon.png" alt="Globall Cloud" style="width:46px; height:46px;" crossorigin="anonymous">
        <div><div style="font-size:22px; font-weight:800;">Globall Cloud</div><div style="font-size:11.5px; color:#647FA3; letter-spacing:1px;">CHINA · UAE · IRAQ LOGISTICS</div></div>
      </div>
      <div style="text-align:end;">
        <div style="font-size:19px; font-weight:800; color:#00838f;">${t('invoice.title')}</div>
        <div style="font-family:monospace; font-size:13.5px; margin-top:4px;">${escapeHtml(s.id)}</div>
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; gap:24px; margin-bottom:26px; font-size:13.5px;">
      <div>
        <div style="color:#8496AC; font-weight:700; margin-bottom:6px;">${t('invoice.billTo')}</div>
        <div style="font-weight:700; font-size:15px;">${escapeHtml(s.requester?.name||'—')}</div>
        <div>${escapeHtml(s.requester?.phone||'')}</div>
        ${s.requester?.email?`<div>${escapeHtml(s.requester.email)}</div>`:''}
      </div>
      <div style="text-align:end;">
        <div style="color:#8496AC; font-weight:700; margin-bottom:6px;">${t('invoice.dateIssued')}</div>
        <div>${formatDate(new Date().toISOString())}</div>
      </div>
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:13.5px; margin-bottom:22px;">
      <tr style="background:#f1f6fa;"><td style="padding:10px 12px; font-weight:700; width:40%;">${t('invoice.route')}</td><td style="padding:10px 12px;">${escapeHtml(placeLabel(s.originKey))} → ${escapeHtml(placeLabel(s.destKey))}</td></tr>
      <tr><td style="padding:10px 12px; font-weight:700;">${t('invoice.serviceType')}</td><td style="padding:10px 12px;">${escapeHtml(t('track.type.'+s.type))}</td></tr>
      <tr style="background:#f1f6fa;"><td style="padding:10px 12px; font-weight:700;">${t('track.weight')}</td><td style="padding:10px 12px;">${s.weightKg||0} kg${s.volumeCbm?(' · '+s.volumeCbm+' CBM'):''}</td></tr>
      ${s.itemsCount!=null?`<tr><td style="padding:10px 12px; font-weight:700;">${t('track.items')}</td><td style="padding:10px 12px;">${s.itemsCount}</td></tr>`:''}
      <tr style="background:#f1f6fa;"><td style="padding:10px 12px; font-weight:700;">${t('invoice.statusLabel')}</td><td style="padding:10px 12px;">${escapeHtml(t('track.status.'+statusOf(s)))}</td></tr>
    </table>
    <div style="margin-inline-start:auto; width:280px;">
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #E3EAF3;"><span>${t('track.total')}</span><b>${formatMoney(s.totalAmount)}</b></div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #E3EAF3;"><span>${t('track.paid')}</span><b style="color:#1FAE6C;">${formatMoney(s.paidAmount)}</b></div>
      <div style="display:flex; justify-content:space-between; padding:10px 0; font-size:16px;"><span style="font-weight:800;">${t('track.due')}</span><b style="color:#f97316;">${due!=null?formatMoney(due):formatMoney(null)}</b></div>
    </div>
    <div style="margin-top:36px; padding-top:18px; border-top:1px solid #E3EAF3; text-align:center; font-size:12px; color:#8496AC;">
      <div style="margin-bottom:4px; font-weight:700; color:#101820;">${t('invoice.thanks')}</div>
      <div>+9647507577137 · tamanblbas271@gmail.com</div>
    </div>
  </div>`;
}
/* ================= COMMERCIAL / CUSTOMS INVOICE (PDF) =================
   A separate document from the payment receipt above — used for customs
   clearance, itemizing declared goods and value. Same html2canvas+jsPDF
   snapshot approach so Kurdish/Arabic text renders correctly. */
function commercialInvoiceDocumentHTML(s, goodsDesc){
  return `<div style="width:780px; background:#ffffff; color:#101820; font-family:'Vazirmatn','Noto Sans Arabic',sans-serif; padding:48px; direction:${currentLang==='ku'?'rtl':'ltr'};" dir="${currentLang==='ku'?'rtl':'ltr'}">
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #00A8BD; padding-bottom:20px; margin-bottom:28px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="logo-icon.png" alt="Globall Cloud" style="width:46px; height:46px;" crossorigin="anonymous">
        <div><div style="font-size:22px; font-weight:800;">Globall Cloud</div><div style="font-size:11.5px; color:#647FA3; letter-spacing:1px;">CHINA · UAE · IRAQ LOGISTICS</div></div>
      </div>
      <div style="text-align:end;">
        <div style="font-size:19px; font-weight:800; color:#00838f;">COMMERCIAL INVOICE</div>
        <div style="font-family:monospace; font-size:13.5px; margin-top:4px;">${escapeHtml(s.id)}</div>
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; gap:24px; margin-bottom:22px; font-size:13.5px;">
      <div>
        <div style="color:#8496AC; font-weight:700; margin-bottom:6px;">SHIPPER / FROM</div>
        <div style="font-weight:700;">Globall Cloud Logistics</div>
        <div>${escapeHtml(placeLabel(s.originKey))}</div>
      </div>
      <div style="text-align:end;">
        <div style="color:#8496AC; font-weight:700; margin-bottom:6px;">CONSIGNEE / TO</div>
        <div style="font-weight:700;">${escapeHtml(s.requester?.name||'—')}</div>
        <div>${escapeHtml(s.requester?.phone||'')}</div>
        <div>${escapeHtml(placeLabel(s.destKey))}, Iraq</div>
      </div>
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px;">
      <thead><tr style="background:#00A8BD; color:#fff;">
        <td style="padding:9px 12px; font-weight:700;">Description of Goods</td>
        <td style="padding:9px 12px; font-weight:700; text-align:center;">Packages</td>
        <td style="padding:9px 12px; font-weight:700; text-align:center;">Weight (kg)</td>
        <td style="padding:9px 12px; font-weight:700; text-align:end;">Declared Value (USD)</td>
      </tr></thead>
      <tbody><tr style="background:#f1f6fa;">
        <td style="padding:10px 12px;">${escapeHtml(goodsDesc||'General merchandise')}</td>
        <td style="padding:10px 12px; text-align:center;">${s.itemsCount||'—'}</td>
        <td style="padding:10px 12px; text-align:center;">${s.weightKg||0}</td>
        <td style="padding:10px 12px; text-align:end; font-weight:700;">${formatMoney(s.totalAmount)}</td>
      </tr></tbody>
    </table>
    <div style="margin-inline-start:auto; width:280px; margin-bottom:30px;">
      <div style="display:flex; justify-content:space-between; padding:10px 0; font-size:15px; border-top:2px solid #101820;"><span style="font-weight:800;">TOTAL DECLARED VALUE</span><b>${formatMoney(s.totalAmount)}</b></div>
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:50px; font-size:12px;">
      <div style="width:45%; border-top:1px solid #101820; padding-top:6px;">Shipper Signature</div>
      <div style="width:45%; border-top:1px solid #101820; padding-top:6px; text-align:end;">Authorized Signature — Globall Cloud</div>
    </div>
    <div style="margin-top:36px; padding-top:18px; border-top:1px solid #E3EAF3; text-align:center; font-size:12px; color:#8496AC;">
      <div>Date: ${formatDate(new Date().toISOString())} · Tracking ID: ${escapeHtml(s.id)}</div>
      <div>+9647507577137 · tamanblbas271@gmail.com</div>
    </div>
  </div>`;
}
async function generateCommercialInvoicePDF(shipmentId){
  const s = (currentShipmentsCache||[]).find(x=>x.id===shipmentId) || await getShipmentForStaff(shipmentId);
  if(!s){ showToast('بارکردنەکە نەدۆزرایەوە.', 'error'); return; }
  const goodsDesc = window.prompt('وەسفی کاڵاکان بۆ گومرگ (بۆ نموونە: Electronics, clothing...)', '');
  if(goodsDesc === null) return;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed; left:-9999px; top:0; pointer-events:none;';
  try{
    if(typeof html2canvas==='undefined' || typeof window.jspdf==='undefined'){ showToast('هەڵەیەک ڕوویدا.', 'error'); return; }
    holder.innerHTML = commercialInvoiceDocumentHTML(s, goodsDesc);
    document.body.appendChild(holder);
    if(document.fonts && document.fonts.ready){ try{ await document.fonts.ready; }catch(e){} }
    const canvas = await html2canvas(holder.firstElementChild, {scale:2, backgroundColor:'#ffffff', useCORS:true});
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'pt', 'a4');
    const imgW = pdf.internal.pageSize.getWidth();
    const imgH = canvas.height * (imgW / canvas.width);
    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    pdf.save('Commercial-Invoice-'+s.id+'.pdf');
    logActivity('export_commercial_invoice', s.id, goodsDesc);
  }catch(e){
    showToast('هەڵەیەک ڕوویدا لە دروستکردنی وەسڵی گومرگ.', 'error');
  }finally{
    if(holder.parentNode) holder.parentNode.removeChild(holder);
  }
}

async function generateInvoicePDF(s){
  if(!s) return;
  const btn = document.getElementById('invoiceBtn-'+s.id);
  const originalHTML = btn ? btn.innerHTML : null;
  if(btn){ btn.disabled = true; btn.innerHTML = '<span>'+t('invoice.generating')+'</span>'; }
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed; left:-9999px; top:0; pointer-events:none;';
  try{
    if(typeof html2canvas==='undefined' || typeof window.jspdf==='undefined'){
      showToast(t('invoice.failMsg'), 'error');
      return;
    }
    holder.innerHTML = invoiceDocumentHTML(s);
    document.body.appendChild(holder);
    if(document.fonts && document.fonts.ready){ try{ await document.fonts.ready; }catch(e){} }
    const canvas = await html2canvas(holder.firstElementChild, {scale:2, backgroundColor:'#ffffff', useCORS:true});
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgW = pageWidth;
    const imgH = canvas.height * (imgW / canvas.width);
    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    pdf.save('Invoice-'+s.id+'.pdf');
  }catch(e){
    showToast(t('invoice.failMsg'), 'error');
  }finally{
    if(holder.parentNode) holder.parentNode.removeChild(holder);
    if(btn){ btn.disabled = false; btn.innerHTML = originalHTML; }
  }
}
async function generateInvoiceForId(id){
  const s = await getShipment(id);
  if(s) await generateInvoicePDF(s);
  else showToast(t('invoice.failMsg'), 'error');
}
async function generateInvoiceForIdAdmin(id){
  const s = await getShipmentForStaff(id);
  if(s) await generateInvoicePDF(s);
  else showToast(t('invoice.failMsg'), 'error');
}

function notFoundHTML(){
  return `<div class="empty-state reveal in-view">
    <svg class="icon-lg"><use href="#i-search"></use></svg>
    <h3>${t('track.notFoundTitle')}</h3>
    <p>${t('track.notFoundBody')}</p>
    <button class="btn btn-primary" data-gc-onclick="route('request')">${t('track.requestInstead')}</button>
  </div>`;
}

let lastTrackedId = null;
async function doTrackSearch(){
  const val = document.getElementById('trackInput').value.trim().toUpperCase();
  if(!val) return;
  lastTrackedId = val;
  const wrap = document.getElementById('trackResult');
  wrap.innerHTML = '<p class="hint">'+ (currentLang==='ku'?'گەڕان...':'Searching...') +'</p>';
  const shipment = await getShipment(val);
  wrap.innerHTML = shipment ? await shipmentCardHTML(shipment) : notFoundHTML();
  if(shipment) startEnhancedTrackingFor(shipment.id);
}

/* ================= REQUEST FORM ================= */
function renderRoutePicker(wrapId, hiddenInputId, keys){
  const wrap = document.getElementById(wrapId);
  const hidden = document.getElementById(hiddenInputId);
  const prevVal = hidden.value;
  const selected = keys.includes(prevVal) ? prevVal : keys[0];
  hidden.value = selected;
  wrap.innerHTML = keys.map(k=>{
    const meta = PLACE_META[k] || {flag:'📍', code:''};
    return `<div class="route-card ${k===selected?'active':''}" data-key="${k}" data-gc-onclick="selectRouteCard('${wrapId}','${hiddenInputId}','${k}')">
      <span class="flag">${meta.flag}</span>
      <div class="rc-text"><span class="rc-city">${placeLabel(k).split(',')[0]}</span><span class="rc-code">${meta.code}</span></div>
    </div>`;
  }).join('');
}
function selectRouteCard(wrapId, hiddenInputId, key){
  document.getElementById(hiddenInputId).value = key;
  document.querySelectorAll('#'+wrapId+' .route-card').forEach(el=>el.classList.toggle('active', el.dataset.key===key));
}
function requestRatesForForm(){
  const origin = String(document.getElementById('reqOrigin')?.value || 'china').toLowerCase();
  const mode = document.getElementById('reqType')?.value || 'air';
  const destination = String(document.getElementById('reqDestination')?.value || 'hawler').toLowerCase();
  return quoteCatalogState.rates.filter(rate => String(rate.origin_key||'').toLowerCase() === quoteOriginKey(origin).toLowerCase() && String(rate.transport_mode||'').toLowerCase() === mode && String(rate.destination_key||'').toLowerCase() === (destination === 'hawler' ? 'erbil' : destination));
}
function syncRequestQuoteFields(){
  const type = document.getElementById('reqType')?.value || 'air';
  const productEl = document.getElementById('reqProduct');
  const weightEl = document.getElementById('reqWeight');
  const volumeEl = document.getElementById('reqVolume');
  const volumeRow = document.getElementById('reqVolumeRow');
  if(!productEl) return;
  const rows = requestRatesForForm();
  const previous = productEl.value;
  productEl.innerHTML = rows.length ? rows.map(rate => `<option value="${escapeHtml(rate.product_type)}">${escapeHtml(rate.product_type)}</option>`).join('') : `<option value="">${currentLang === 'ku' ? 'جۆری کاڵا هەڵبژێرە' : 'Select a product type'}</option>`;
  if(rows.some(row => row.product_type === previous)) productEl.value = previous;
  const sea = type === 'sea';
  if(volumeRow) volumeRow.style.display = sea ? '' : 'none';
  if(volumeEl) volumeEl.required = sea;
  if(weightEl) weightEl.required = !sea;
}
function populateRequestSelects(){
  renderRoutePicker('reqOriginPicker', 'reqOrigin', ORIGIN_KEYS);
  renderRoutePicker('reqDestPicker', 'reqDestination', DEST_KEYS);
  syncRequestQuoteFields();
  const type = document.getElementById('reqType');
  if(type && type.dataset.gcRequestWired !== '1'){
    type.dataset.gcRequestWired = '1';
    type.addEventListener('change', syncRequestQuoteFields);
  }
}

async function handleRequestSubmit(e){
  e.preventDefault();
  if(document.getElementById('reqHoneypot').value){ return; }
  const btn = document.getElementById('reqSubmitBtn');
  btn.disabled = true; const originalLabel = btn.textContent; btn.textContent = t('request.sending');

  const name = document.getElementById('reqName').value.trim();
  const phone = document.getElementById('reqPhone').value.trim();
  const email = document.getElementById('reqEmail').value.trim();
  const originKey = document.getElementById('reqOrigin').value;
  const destKey = document.getElementById('reqDestination').value;
  const type = document.getElementById('reqType').value;
  const product = document.getElementById('reqProduct')?.value || '';
  const weightRaw = Number(document.getElementById('reqWeight').value);
  const volumeRaw = Number(document.getElementById('reqVolume')?.value);
  const weightKg = Number.isFinite(weightRaw) && weightRaw > 0 ? weightRaw : null;
  const volumeCbm = Number.isFinite(volumeRaw) && volumeRaw > 0 ? volumeRaw : null;
  const notes = document.getElementById('reqNotes').value.trim();
  if(type === 'sea' && !volumeCbm){
    btn.disabled = false; btn.textContent = originalLabel;
    showToast('تکایە حەجمی CBM ـی کاڵاکە بنووسە.', 'error');
    document.getElementById('reqVolume')?.focus();
    return;
  }
  if(type !== 'sea' && !weightKg){
    btn.disabled = false; btn.textContent = originalLabel;
    showToast(t('services.quote.needWeight'), 'error');
    document.getElementById('reqWeight')?.focus();
    return;
  }
  const payload = {
    name, phone, email, origin_key: originKey, dest_key: destKey,
    transport_mode: type, product_type: product, weight_kg: weightKg,
    volume_cbm: type === 'sea' ? volumeCbm : (weightKg ? Math.round((weightKg / 500) * 10) / 10 : null),
    items_count: null, service_level: 'standard', incoterm: 'EXW', notes
  };

  let requestId = '';
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/public-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Unable to submit quote request right now.');
    requestId = String(body.request?.id || '').trim();
    if (!requestId) throw new Error('Quote request was accepted without a request number.');
  } catch (error) {
    btn.disabled = false; btn.textContent = originalLabel;
    const message = (error?.message || '').includes('Too many')
      ? 'داواکاری زۆر لە کاتێکی کورتدا نێردراوە. تکایە چەند خولەکێک چاوەڕێبە و دووبارە هەوڵبدەرەوە.'
      : 'هەڵەیەک ڕوویدا، داواکارییەکە نەنێردرا. تکایە دووبارە هەوڵبدەرەوە یان پەیوەندیمان پێوە بکە.';
    showToast(message, 'error');
    return;
  }
  btn.disabled = false; btn.textContent = originalLabel;
  notifyOwner('داواکاریی نوێی نرخ — '+requestId, {
    'ژمارەی داواکاری':requestId, 'ناو':name, 'مۆبایل':phone, 'ئیمەیل':(email||'—'),
    'لە':placeLabel(originKey), 'بۆ':placeLabel(destKey),
    'جۆر':t('track.type.'+type), 'جۆری کاڵا':(product||'—'), 'کێش (kg)':(weightKg||'—'), 'حەجم (CBM)':(volumeCbm||'—'), 'تێبینی':(notes||'—')
  });

  const safeRequestId = requestId.replace(/'/g, "\\'");
  const successWrap = document.getElementById('requestSuccessWrap');
  document.getElementById('requestFormWrap').style.display = 'none';
  successWrap.style.display = 'block';
  successWrap.innerHTML = `<div class="success-panel">
    <svg class="icon-lg"><use href="#i-check"></use></svg>
    <h3 style="font-size:19px; font-weight:800;">${t('request.successTitle')}</h3>
    <p style="color:var(--muted); margin-top:8px;">${t('request.successBody')}</p>
    <div class="success-id mono" data-gc-onclick="copyRequestId('${safeRequestId}')" style="cursor:pointer; display:inline-flex; align-items:center; gap:8px;" title="Copy">${escapeHtml(requestId)} <svg class="icon-sm" style="width:15px; height:15px;"><use href="#i-copy"></use></svg></div>
    <div class="success-actions">
      <button class="btn btn-outline" data-gc-onclick="resetRequestForm(); route('home')">${t('request.backHome')}</button>
    </div>
    <a class="btn btn-ghost btn-block" style="margin-top:12px;" target="_blank" rel="noopener" href="https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(t('request.waPrefix')+' '+requestId)}">
      <svg class="icon-sm"><use href="#i-chat"></use></svg> ${t('request.waConfirm')}
    </a>
  </div>`;
  e.target.reset();
  populateRequestSelects();
}
function resetRequestForm(){
  document.getElementById('requestFormWrap').style.display = 'block';
  document.getElementById('requestSuccessWrap').style.display = 'none';
  document.getElementById('requestSuccessWrap').innerHTML = '';
}

/* ================= PORTAL ================= */
let currentPortalTab = 'home';
function setPortalTab(tab){
  currentPortalTab = tab;
  const views = {home:'portalHomeView', shipments:'portalShipmentsView', track:'portalTrackView', profile:'portalProfileView'};
  Object.entries(views).forEach(([key,id])=>{
    const el = document.getElementById(id);
    if(el) el.style.display = (key===tab) ? 'block' : 'none';
  });
  document.querySelectorAll('.pbn-item').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.tab===tab);
  });
  if(tab==='profile') renderEditProfile();
  document.getElementById('portalDashboard').scrollIntoView({block:'start', behavior:'smooth'});
}
function portalTrackGo(){
  const v = document.getElementById('portalTrackInput').value.trim();
  if(v) goTrack(v);
}
/* Puts the customer's uploaded photo into any avatar container (dashboard
   header, profile-edit uploader), or leaves the default person icon in place
   if they haven't uploaded one. */
function renderAvatarInto(elId, avatarUrl){
  const el = document.getElementById(elId);
  if(!el) return;
  el.innerHTML = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="">`
    : `<svg class="icon"><use href="#i-user"></use></svg>`;
}
async function handleAvatarUpload(input){
  const file = input.files && input.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('تکایە وێنەیەک هەڵبژێرە.', 'error'); return; }
  if(file.size > 3*1024*1024){ showToast('قەبارەی وێنە دەبێت لە 3MB کەمتر بێت.', 'error'); return; }
  if(!sb){ showToast('هەڵەیەک ڕوویدا.', 'error'); return; }
  const {data:{session}} = await sb.auth.getSession();
  if(!session) return;
  const ext = (file.name.split('.').pop()||'jpg').toLowerCase();
  const path = `${session.user.id}/avatar.${ext}`;
  const {error:upErr} = await sb.storage.from('avatars').upload(path, file, {upsert:true, cacheControl:'3600'});
  if(upErr){ showToast('وێنەکە بارنەبوو، تکایە دووبارە هەوڵبدەرەوە.', 'error'); return; }
  const {data:pub} = sb.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = pub.publicUrl + '?t=' + Date.now();
  const {error:metaErr} = await sb.auth.updateUser({data:{avatar_url:avatarUrl}});
  if(metaErr){ showToast('هەڵەیەک ڕوویدا لە پاشەکەوتکردندا.', 'error'); return; }
  renderAvatarInto('dashAvatar', avatarUrl);
  renderAvatarInto('epAvatar', avatarUrl);
  showToast('وێنەی پرۆفایل نوێکرایەوە.', 'success');
}
async function renderEditProfile(){
  const profile = await getProfile();
  if(!profile) return;
  const wrap = document.getElementById('editProfileWrap');
  wrap.innerHTML = `<div class="card">
    <div class="admin-section-title"><svg><use href="#i-user"></use></svg><span>زانیاری کەسی</span></div>
    <label class="avatar-upload" title="گۆڕینی وێنە">
      <div class="dash-avatar" id="epAvatar"><svg class="icon"><use href="#i-user"></use></svg></div>
      <span class="avatar-upload-badge"><svg><use href="#i-camera"></use></svg></span>
      <input type="file" accept="image/*" style="display:none;" data-gc-onchange="handleAvatarUpload(this)">
    </label>
    <div class="form-row"><label class="field-label">${t('portal.name')}</label><input class="field" id="epName" value="${escapeHtml(profile.name)}"></div>
    <div class="form-row"><label class="field-label">${t('portal.email')}</label><input class="field" type="email" value="${escapeHtml(profile.email)}" disabled style="opacity:.6;"></div>
    <div class="form-row"><label class="field-label">${t('portal.phone')}</label><input class="field" type="tel" id="epPhone" value="${profile.phone||''}"></div>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-primary" data-gc-onclick="saveEditProfile()">${t('portal.save')}</button>
    </div>
    <p id="editProfileMsg" class="hint" style="display:none;"></p>
  </div>
  <div class="card" style="margin-top:14px;">
    <div class="admin-section-title"><svg><use href="#i-shield"></use></svg><span>گۆڕینی وشەی نهێنی</span></div>
    <div class="form-row"><label class="field-label">وشەی نهێنی نوێ</label><input class="field" type="password" id="epNewPassword" minlength="6" placeholder="لانی کەم ٦ پیت"></div>
    <button class="btn btn-outline" data-gc-onclick="changeCustomerPassword()">گۆڕینی وشەی نهێنی</button>
    <p id="changePasswordMsg" class="hint" style="display:none;"></p>
  </div>`;
  renderAvatarInto('epAvatar', profile.avatarUrl);
}
async function saveEditProfile(){
  const name = document.getElementById('epName').value.trim();
  const phone = document.getElementById('epPhone').value.trim();
  const {error} = await sb.auth.updateUser({data:{full_name:name, phone}});
  const msgEl = document.getElementById('editProfileMsg');
  if(error){
    msgEl.textContent = 'هەڵەیەک ڕوویدا لە پاشەکەوتکردندا.';
    msgEl.style.display = 'block';
    return;
  }
  showToast('گۆڕانکارییەکان پاشەکەوت کران.', 'success');
  document.getElementById('dashName').textContent = (name || document.getElementById('dashName').textContent).split(' ')[0];
}
async function changeCustomerPassword(){
  const pw = document.getElementById('epNewPassword').value;
  const msgEl = document.getElementById('changePasswordMsg');
  if(!pw || pw.length < 6){
    msgEl.textContent = 'وشەی نهێنی دەبێت لانی کەم ٦ پیت بێت.';
    msgEl.style.display = 'block';
    return;
  }
  const {error} = await sb.auth.updateUser({password: pw});
  msgEl.textContent = error ? 'هەڵەیەک ڕوویدا.' : 'وشەی نهێنی بە سەرکەوتوویی گۆڕدرا.';
  msgEl.style.display = 'block';
  if(!error) document.getElementById('epNewPassword').value = '';
}

function emptyShipmentsHTML(){
  return `<div class="empty-state">
    <svg class="icon-lg"><use href="#i-box"></use></svg>
    <h3>${t('portal.emptyTitle')}</h3>
    <p>${t('portal.emptyBody')}</p>
    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
      <button class="btn btn-primary" data-gc-onclick="goTrack()">${t('portal.qTrack')}</button>
      <button class="btn btn-outline" data-gc-onclick="route('request')">${t('portal.qRequest')}</button>
    </div>
  </div>`;
}
function shipmentRowHTML(s){
  const status = statusOf(s);
  const pct = Math.round((s.currentStepIndex / (STEP_KEYS.length-1)) * 100);
  const icon = SERVICE_ICONS[s.type] || 'i-box';
  return `<div class="track-row track-row-rich" data-gc-onclick="goTrack('${s.id}')">
    <div class="trow-top">
      <div class="trow-icon"><svg><use href="#${icon}"></use></svg></div>
      <div class="trow-left"><b class="mono">${s.id}</b><span>${placeLabel(s.originKey)} → ${placeLabel(s.destKey)}</span></div>
      <span class="stamp ${status}">${t('track.status.'+status)}</span>
    </div>
    <div class="trow-progress"><div class="trow-progress-fill ${status}" style="width:${pct}%"></div></div>
    <div class="trow-meta"><span>${s.weightKg||0} kg</span><span>${pct}%</span></div>
  </div>`;
}
async function renderMyShipments(profile){
  const wrap = document.getElementById('myShipmentsList');
  const wrapHome = document.getElementById('myShipmentsListHome');
  if(!sb){ wrap.innerHTML = emptyShipmentsHTML(); if(wrapHome) wrapHome.innerHTML = emptyShipmentsHTML(); updateShipmentBadge(0); return; }
  wrap.innerHTML = skeletonRows(3);
  if(wrapHome) wrapHome.innerHTML = skeletonRows(3);
  const {data:{session}} = await sb.auth.getSession();
  if(!session){ wrap.innerHTML = emptyShipmentsHTML(); if(wrapHome) wrapHome.innerHTML = emptyShipmentsHTML(); updateShipmentBadge(0); return; }
  const {data} = await sb.from('shipments').select('*').eq('customer_user_id', session.user.id).order('created_at',{ascending:false});
  const valid = (data||[]).map(rowToShipment);
  const html = valid.length ? valid.map(shipmentRowHTML).join('') : emptyShipmentsHTML();
  wrap.innerHTML = html;
  if(wrapHome) wrapHome.innerHTML = valid.length ? valid.slice(0,3).map(shipmentRowHTML).join('') : emptyShipmentsHTML();
  updateShipmentBadge(valid.filter(s=>statusOf(s)!=='delivered').length);
}
/* Shows the real count of the customer's shipments that are still pending or
   in transit, as a badge on the bottom nav's "Shipments" tab. */
function updateShipmentBadge(count){
  const badge = document.getElementById('pbnShipmentBadge');
  if(!badge) return;
  badge.textContent = count > 9 ? '9+' : String(count);
  badge.style.display = count > 0 ? 'flex' : 'none';
}
async function renderPortal(){
  const profile = await getProfile();
  document.getElementById('portalBottomNav').classList.add('active');
  applyPbnMode(!!profile);
  if(profile){
    document.getElementById('portalSignIn').style.display = 'none';
    document.getElementById('portalDashboard').style.display = 'block';
    document.getElementById('dashName').textContent = profile.name.split(' ')[0];
    renderAvatarInto('dashAvatar', profile.avatarUrl);
    await renderMyShipments(profile);
    setPortalTab(currentPortalTab);
  } else {
    document.getElementById('portalSignIn').style.display = 'block';
    document.getElementById('portalDashboard').style.display = 'none';
    document.querySelectorAll('.pbn-item').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.tab==='profile');
    });
  }
}
async function updateNavAuthState(){
  const profile = await getProfile();
  const navLabel = document.getElementById('authNavLabel');
  const mobileLabel = document.getElementById('mobileAuthLabel');
  const label = profile ? (t('nav.dashboard')+' · '+profile.name.split(' ')[0]) : t('nav.signIn');
  navLabel.textContent = label;
  mobileLabel.textContent = label;
}

/* ================= CONTACT ================= */
async function handleContactSubmit(e){
  e.preventDefault();
  if(document.getElementById('cHoneypot').value){ return; }
  const btn = e.target.querySelector('button[type=submit]');
  const original = btn.textContent; btn.disabled = true; btn.textContent = t('contact.sending');
  const name = document.getElementById('cName').value.trim();
  const company = document.getElementById('cCompany').value.trim();
  const requestType = document.getElementById('cType').value;
  const email = document.getElementById('cEmail').value.trim();
  const message = document.getElementById('cMsg').value.trim();
  let insertError = null;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/public-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ name, company, request_type: requestType, email, message })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) insertError = new Error(body.error || 'Unable to send message right now.');
  } catch (error) {
    insertError = error;
  }
  btn.disabled = false; btn.textContent = original;
  if(insertError){
    const friendly = (insertError.message||'').includes('Too many')
      ? 'پەیامی زۆر لە کاتێکی کورتدا نێردراوە. تکایە چەند خولەکێک چاوەڕێبە و دووبارە هەوڵبدەرەوە.'
      : 'هەڵەیەک ڕوویدا، پەیامەکە نەنێردرا. تکایە دووبارە هەوڵبدەرەوە.';
    showToast(friendly, 'error');
    return;
  }
  notifyOwner('پەیامی نوێ لە فۆرمی پەیوەندی — '+name, {'ناو':name, 'کۆمپانیا':company||'—', 'جۆر':requestType, 'ئیمەیل':email, 'پەیام':message});
  document.getElementById('contactFormWrap').innerHTML = `<div style="text-align:center; padding:30px 10px;">
    <svg class="icon-lg" style="color:var(--mint);"><use href="#i-check"></use></svg>
    <p style="margin-top:12px; font-weight:700;">${t('contact.sentMsg')}</p>
  </div>`;
}

/* ================= I18N APPLY ================= */
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const val = t(el.getAttribute('data-i18n'));
    if(typeof val === 'string') el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
    const val = t(el.getAttribute('data-i18n-ph'));
    if(typeof val === 'string') el.setAttribute('placeholder', val);
  });
  renderHomeServices();
  renderBusinessHub();
  renderDashboardPreview();
  renderCorridorStrip();
  renderWarehouseCards();
  renderOperationsHub();
  renderHow();
  renderWhy();
  renderAboutValues();
  renderFooterServices();
  renderLegalDocs();
  renderTestimonials();
  populateRequestSelects();
  if(document.getElementById('page-services').classList.contains('active')) renderServicesDetail();
  document.getElementById('yearNow').textContent = new Date().getFullYear();
  document.getElementById('langKuBtn').classList.toggle('active', currentLang==='ku');
  document.getElementById('langEnBtn').classList.toggle('active', currentLang==='en');
}

async function setLang(lang){
  currentLang = lang;
  document.documentElement.lang = lang==='ku' ? 'ckb' : 'en';
  document.documentElement.dir = lang==='ku' ? 'rtl' : 'ltr';
  await safeSet('lang', lang, false);
  applyI18n();
  await updateNavAuthState();
  if(lastTrackedId && document.getElementById('page-track').classList.contains('active')){
    const shipment = await getShipment(lastTrackedId);
    document.getElementById('trackResult').innerHTML = shipment ? await shipmentCardHTML(shipment) : notFoundHTML();
    if(shipment) startEnhancedTrackingFor(shipment.id);
  }
}

/* ================= THEME (light/dark) =================
   Applied instantly via the tiny inline script in <head> (avoids a flash of
   the wrong theme); this just keeps the toggle button + persistence in sync. */
function currentTheme(){
  return document.documentElement.getAttribute('data-theme')==='light' ? 'light' : 'dark';
}
function setThemeIcon(){
  const isLight = currentTheme()==='light';
  const iconHref = isLight ? '#i-sun' : '#i-moon';
  document.querySelectorAll('#themeToggleBtn use, #themeToggleBtnMobile use').forEach(el=>el.setAttribute('href', iconHref));
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if(metaTheme) metaTheme.setAttribute('content', isLight ? '#F3F7FC' : '#061428');
}
function toggleTheme(){
  const next = currentTheme()==='light' ? 'dark' : 'light';
  if(next==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  try{ localStorage.setItem('gc-theme', next); }catch(e){}
  setThemeIcon();
  if(document.getElementById('chartRevenue') && currentShipmentsCache?.length) initAdminCharts(currentShipmentsCache);
}

/* ================= STAFF CONSOLE (admin / accountant) =================
   Separate from the customer portal entirely — real Supabase Auth login,
   role read from the `staff` table. Reachable only via #admin (not linked
   in the main customer nav) plus a small link in the footer. */
const STEP_LABELS_KU = ['داواکاری تۆمارکرا','هەڵگیرا','لە ڕێگایە','گومرگ','لە ڕێی گەیاندنە','گەیشت'];

async function renderAdminGate(){
  const loginView = document.getElementById('adminLoginView');
  const dashView = document.getElementById('adminDashView');
  const notConfigured = document.getElementById('adminNotConfigured');
  if(!sb){ notConfigured.style.display = 'block'; loginView.querySelector('form').style.display = 'none'; return; }
  notConfigured.style.display = 'none'; loginView.querySelector('form').style.display = 'block';

  const {data:{session}} = await sb.auth.getSession();
  if(!session){ loginView.style.display = 'block'; dashView.style.display = 'none'; document.getElementById('adminMfaView').style.display='none'; showLockoutMessage(); return; }

  const {data: aal} = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if(aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel){
    loginView.style.display = 'none'; dashView.style.display = 'none';
    document.getElementById('adminMfaView').style.display = 'grid';
    return;
  }
  document.getElementById('adminMfaView').style.display = 'none';

  const {data:staffRow} = await sb.from('staff').select('*').eq('id', session.user.id).maybeSingle();
  if(!staffRow){
    document.getElementById('staffLoginError').style.display = 'block';
    document.getElementById('staffLoginError').textContent = 'ئەم هەژمارە هیچ ڕۆڵێکی دیاریکراوی نییە لە staff دا.';
    await sb.auth.signOut();
    loginView.style.display = 'block'; dashView.style.display = 'none';
    return;
  }
  loginView.style.display = 'none'; dashView.style.display = 'block';
  startInactivityTimer();
  const roleLabels = {admin:'ئەدمین', super_admin:'سوپەر ئەدمین', accountant:'محاسب'};
  document.getElementById('staffRoleLabel').textContent = roleLabels[staffRow.role] || 'محاسب';
  document.getElementById('staffEmailLabel').textContent = session.user.email;
  document.getElementById('staffConsoleLinkBtn').style.display = (staffRow.role==='super_admin') ? 'inline-flex' : 'none';
  const shipments = await getAllShipments();
  currentShipmentsCache = shipments;
  if(staffRow.role==='admin' || staffRow.role==='super_admin'){
    currentMessagesCache = await getRecentMessages();
    document.getElementById('adminContent').innerHTML = renderAdminMainHTML(shipments);
    setTimeout(()=>initAdminCharts(shipments), 0);
  } else {
    document.getElementById('adminContent').innerHTML = renderAccountantOpsHTML(shipments);
  }
}
async function getRecentMessages(){
  if(!sb) return [];
  const {data:{session}} = await sb.auth.getSession();
  if(!session) return [];
  const {data:staffRow} = await sb.from('staff').select('id,role,is_active').eq('id', session.user.id).maybeSingle();
  if(!staffRow || staffRow.is_active === false || !['admin','super_admin'].includes(staffRow.role)) return [];
  const {data} = await sb.from('messages').select('*').order('created_at',{ascending:false}).limit(6);
  return data||[];
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

function getStaffAttempts(){ try{ return Number(localStorage.getItem('staffFailedAttempts') || 0); }catch(e){ return 0; } }
function setStaffAttempts(n){ try{ localStorage.setItem('staffFailedAttempts', String(n)); }catch(e){} }
function getStaffLockoutUntil(){ try{ return Number(localStorage.getItem('staffLockoutUntil') || 0); }catch(e){ return 0; } }
function setStaffLockoutUntil(ts){ try{ localStorage.setItem('staffLockoutUntil', String(ts)); }catch(e){} }

function togglePwVisibility(){
  const pw = document.getElementById('staffPassword');
  const eyeIcon = document.getElementById('pwEyeIcon');
  const isHidden = pw.type === 'password';
  pw.type = isHidden ? 'text' : 'password';
  eyeIcon.innerHTML = '<use href="' + (isHidden ? '#i-eye-off' : '#i-eye') + '"></use>';
}

function checkCapsLock(e){
  const warn = document.getElementById('capsLockWarning');
  if(!warn) return;
  const isOn = e.getModifierState && e.getModifierState('CapsLock');
  warn.style.display = isOn ? 'block' : 'none';
}

function showLockoutMessage(){
  const lockEl = document.getElementById('staffLoginLockout');
  const now = Date.now();
  const until = getStaffLockoutUntil();
  if(now >= until){ lockEl.style.display = 'none'; return false; }
  const secsLeft = Math.ceil((until - now) / 1000);
  lockEl.textContent = `زۆر هەوڵی نادروست درا. تکایە ${secsLeft} چرکە چاوەڕێبە پێش هەوڵدانەوە.`;
  lockEl.style.display = 'block';
  setTimeout(()=>{ if(document.getElementById('page-admin').classList.contains('active')) showLockoutMessage(); }, 1000);
  return true;
}

async function handleStaffSignIn(e){
  e.preventDefault();
  const errEl = document.getElementById('staffLoginError');
  const lockEl = document.getElementById('staffLoginLockout');
  const attemptsHint = document.getElementById('attemptsHint');
  errEl.style.display = 'none';
  lockEl.style.display = 'none';

  if(showLockoutMessage()) return;

  const email = document.getElementById('staffEmail').value.trim();
  const password = document.getElementById('staffPassword').value;
  const btn = document.getElementById('staffLoginBtn');
  const btnText = document.getElementById('staffLoginBtnText');
  btn.disabled = true;
  btnText.innerHTML = '<span class="btn-spinner"></span>';

  const {error} = await sb.auth.signInWithPassword({email, password});

  btn.disabled = false;
  btnText.textContent = 'چوونەژوورەوە';

  if(error){
    const attempts = getStaffAttempts() + 1;
    setStaffAttempts(attempts);
    if(attempts >= MAX_LOGIN_ATTEMPTS){
      const until = Date.now() + LOCKOUT_SECONDS * 1000;
      setStaffLockoutUntil(until);
      setStaffAttempts(0);
      attemptsHint.style.display = 'none';
      showLockoutMessage();
    } else {
      errEl.textContent = 'هەڵە: ئیمەیل یان وشەی نهێنی هەڵەیە.';
      errEl.style.display = 'block';
      const remaining = MAX_LOGIN_ATTEMPTS - attempts;
      attemptsHint.textContent = `${remaining} هەوڵی تر ماوە پێش داخستنی کاتی`;
      attemptsHint.style.display = 'block';
    }
    return;
  }
  setStaffAttempts(0);
  setStaffLockoutUntil(0);
  document.getElementById('attemptsHint').style.display = 'none';
  window.location.assign('/staff-os');
}
async function handleStaffSignOut(){ await sb.auth.signOut(); await renderAdminGate(); stopInactivityTimer(); }

/* ================= AUTO SIGN-OUT ON INACTIVITY =================
   Security measure for shared/public computers: staff are signed out
   automatically after 20 minutes with no clicks/keys/touches. */
const INACTIVITY_LIMIT_MS = 20 * 60 * 1000;
let inactivityTimer = null;
function resetInactivityTimer(){
  if(inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(async ()=>{
    const {data:{session}} = await sb.auth.getSession();
    if(session){
      await sb.auth.signOut();
      await renderAdminGate();
      showToast('بەهۆی ماوەیەکی درێژی چالاک نەبوونەوە، خۆکار چوویتە دەرەوە.', 'error');
    }
  }, INACTIVITY_LIMIT_MS);
}
let inactivityListenersAttached = false;
function startInactivityTimer(){
  if(!inactivityListenersAttached){
    ['click','keydown','touchstart','mousemove'].forEach(evt=>document.addEventListener(evt, resetInactivityTimer, {passive:true}));
    inactivityListenersAttached = true;
  }
  resetInactivityTimer();
}
function stopInactivityTimer(){
  if(inactivityTimer) clearTimeout(inactivityTimer);
}

/* ================= TWO-FACTOR AUTH (2FA / TOTP) ================= */
async function mfaVerifyChallenge(e){
  e.preventDefault();
  const errEl = document.getElementById('mfaChallengeError');
  const btn = document.getElementById('mfaChallengeBtn');
  errEl.style.display = 'none';
  const code = document.getElementById('mfaChallengeCode').value.trim();
  btn.disabled = true;
  const {data: factors} = await sb.auth.mfa.listFactors();
  const factor = (factors?.totp || [])[0];
  if(!factor){ errEl.textContent = 'هیچ فاکتەرێکی 2FA نەدۆزرایەوە.'; errEl.style.display='block'; btn.disabled=false; return; }
  const {data: chData, error: chErr} = await sb.auth.mfa.challenge({factorId: factor.id});
  if(chErr){ errEl.textContent = 'هەڵەیەک ڕوویدا، دووبارە هەوڵبدە.'; errEl.style.display='block'; btn.disabled=false; return; }
  const {error: vErr} = await sb.auth.mfa.verify({factorId: factor.id, challengeId: chData.id, code});
  btn.disabled = false;
  if(vErr){ errEl.textContent = 'کۆدەکە هەڵەیە یان کۆنە، دووبارە هەوڵبدە.'; errEl.style.display='block'; return; }
  document.getElementById('mfaChallengeCode').value = '';
  await renderAdminGate();
}

async function openMfaSettings(){
  document.getElementById('mfaSettingsModal').style.display = 'flex';
  const body = document.getElementById('mfaSettingsBody');
  body.innerHTML = '<p class="hint">بارکردن...</p>';
  const {data: factors} = await sb.auth.mfa.listFactors();
  const verified = (factors?.totp || []).find(f => f.status === 'verified');
  if(verified){
    body.innerHTML = `
      <p style="color:#2ecc71; display:flex; align-items:center; gap:6px;"><svg class="icon-sm"><use href="#i-check"></use></svg> 2FA چالاکە بۆ ئەم هەژمارە.</p>
      <button class="btn btn-outline btn-block" style="margin-top:10px;" data-gc-onclick="mfaUnenroll('${verified.id}')">لابردنی 2FA</button>`;
    return;
  }
  const {data, error} = await sb.auth.mfa.enroll({factorType:'totp'});
  if(error){ body.innerHTML = `<p class="admin-error" style="display:block;">${escapeHtml(error.message)}</p>`; return; }
  pendingMfaFactorId = data.id;
  body.innerHTML = `
    <p class="hint" style="text-align:start;">١. کۆدی QR بخوێنەرەوە بە Google Authenticator (یان هاوشێوەی)</p>
    <div style="background:#fff; padding:12px; border-radius:12px; display:flex; justify-content:center; margin:10px 0;">${data.totp.qr_code}</div>
    <p class="hint" style="text-align:start; word-break:break-all;">یان کۆدی دەستی: ${escapeHtml(data.totp.secret)}</p>
    <p class="hint" style="text-align:start; margin-top:10px;">٢. کۆدی ٦ ژمارەیی بنووسە بۆ چالاککردن</p>
    <input class="field" type="text" inputmode="numeric" maxlength="6" id="mfaEnrollCode" placeholder="000000" style="text-align:center; letter-spacing:6px; font-size:20px; margin-top:6px;">
    <button class="btn btn-primary btn-block" style="margin-top:10px;" data-gc-onclick="mfaConfirmEnroll()">چالاککردن</button>
    <p id="mfaEnrollError" class="admin-error" style="display:none;"></p>`;
}
let pendingMfaFactorId = null;
async function mfaConfirmEnroll(){
  const code = document.getElementById('mfaEnrollCode').value.trim();
  const errEl = document.getElementById('mfaEnrollError');
  const {data: chData, error: chErr} = await sb.auth.mfa.challenge({factorId: pendingMfaFactorId});
  if(chErr){ errEl.textContent = 'هەڵەیەک ڕوویدا.'; errEl.style.display='block'; return; }
  const {error: vErr} = await sb.auth.mfa.verify({factorId: pendingMfaFactorId, challengeId: chData.id, code});
  if(vErr){ errEl.textContent = 'کۆدەکە هەڵەیە، دووبارە هەوڵبدە.'; errEl.style.display='block'; return; }
  showToast('2FA چالاک کرا بۆ ئەم هەژمارە.', 'success');
  logActivity('enable_2fa', null, null);
  closeMfaSettings();
}
async function mfaUnenroll(factorId){
  const {error} = await sb.auth.mfa.unenroll({factorId});
  if(error){ showToast('هەڵەیەک ڕوویدا.', 'error'); return; }
  showToast('2FA لابرا.', 'success');
  logActivity('disable_2fa', null, null);
  closeMfaSettings();
}
function closeMfaSettings(){ document.getElementById('mfaSettingsModal').style.display = 'none'; }

/* ================= WHAT'S NEW / CHANGELOG =================
   A simple staff-facing summary of platform updates, kept newest-first.
   Add a new entry at the top whenever a meaningful feature ships. */
const CHANGELOG = [
  { date:'٢٠٢٦-٠٨ (تازە)', items:[
    'وەرگرتن لە عەنبەر ئێستا خۆکار بەستراوەتەوە بە کۆگای موشتەریان — کۆدی GC-XXX دەنووسیت، خۆکار ناوی کڕیار دەردەکەوێت',
    'لای هەر موشتەرییەک لە کۆگا، دوگمەیەکی نوێ "وەرگرتنەکانی لە عەنبەر" — هەموو مێژووی وەرگرتنی ئەو کڕیارە دەبینیت'
  ]},
  { date:'٢٠٢٦-٠٨', items:[
    'وێنەی چەندین کارتۆن بۆ هەر قۆناغی بار (کاتی وەرگرتن و تەسلیمکردنەوە)',
    'حسابی نرخ بە دیناری عێراقیش، نرخی دراو ئێستا لە داشبۆردەوە دەگۆڕدرێت (پێویست بە کۆد نییە)',
    'وەسڵی گومرگ (Commercial Invoice) بۆ هەر بارێک',
    'کردارە کۆمەڵییەکان: هەڵبژاردنی چەند بار پێکەوە بۆ Export یان نیشانکردن وەک گەیشتوو',
    'چارتی ئاماری داهات و باشترین ڕووتەکان لە داشبۆرد',
    'گەڕانی گشتی و ئاگاداری خۆکاری بارە دواکەوتووەکان',
    'لەیبڵی بار بە QR کۆد بۆ چاپکردن',
    'حساباتی نرخی گەیاندن بۆ میوانان',
    'خۆکار چوونەدەرەوەی ستاف دوای ٢٠ خولەک چالاک نەبوونەوە'
  ]},
  { date:'٢٠٢٦-٠٨', items:[
    'چوونەژوورەوەی دوو هەنگاوی (2FA) بۆ هەژماری ستاف',
    'دابەزاندنی Excel ڕاستەقینە بۆ کۆگای موشتەریان و بارەکان',
    'PWA — دامەزراندنی سایتەکە وەک ئەپ لەسەر مۆبایل',
    'لۆگی چالاکی ستاف — تۆمارکردنی هەموو کردارە گرنگەکان'
  ]}
];
function openChangelog(){
  document.getElementById('changelogModal').style.display = 'flex';
  document.getElementById('changelogBody').innerHTML = CHANGELOG.map(group => `
    <div style="margin-bottom:16px;">
      <b style="color:var(--teal-l); font-size:13px;">${group.date}</b>
      <ul style="margin:8px 0 0; padding-inline-start:20px; font-size:13.5px; line-height:1.9;">
        ${group.items.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}
      </ul>
    </div>`).join('');
}
function closeChangelog(){ document.getElementById('changelogModal').style.display = 'none'; }

async function viewCustomerReceipts(directoryCustomerId, customerName){
  document.getElementById('customerReceiptsModal').style.display = 'flex';
  document.getElementById('customerReceiptsTitle').textContent = 'وەرگرتنەکانی ' + customerName;
  const body = document.getElementById('customerReceiptsBody');
  body.innerHTML = '<p class="hint">بارکردن...</p>';
  const {data, error} = await sb.from('warehouse_receipts').select('*').eq('directory_customer_id', directoryCustomerId).order('received_at', {ascending:false});
  if(error){ body.innerHTML = '<p class="hint">هەڵەیەک ڕوویدا.</p>'; return; }
  if(!data || data.length===0){ body.innerHTML = '<p class="hint">هیچ وەرگرتنێک تۆمار نەکراوە بۆ ئەم موشتەریە.</p>'; return; }
  body.innerHTML = data.map(r => `
    <div class="admin-row" style="align-items:flex-start; margin-bottom:10px;">
      <div class="admin-row-main">
        <div class="admin-row-top"><b class="mono">📦 ${escapeHtml(r.batch_code)}</b><span class="hint">${r.location==='Dubai'?'عەنبەری دوبەی':r.location==='China'?'عەنبەری چین':'عەنبەری هەولێر'}</span></div>
        ${r.notes ? `<span>${escapeHtml(r.notes)}</span>` : ''}
        ${(r.photos||[]).length ? `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">${r.photos.map(url=>
          `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="وێنەی وەرگرتن" style="width:56px; height:56px; object-fit:cover; border-radius:10px; border:1px solid var(--line-soft);"></a>`
        ).join('')}</div>` : ''}
        <span class="hint" style="text-align:start; margin-top:4px;">${escapeHtml(r.created_by_name||'ستاف')} · ${timeAgoKu(r.received_at)}</span>
      </div>
    </div>`).join('');
}
function closeCustomerReceipts(){ document.getElementById('customerReceiptsModal').style.display = 'none'; }

let currentShipmentsCache = [];
let currentMessagesCache = [];
let adminFilterStatus = 'all';
let adminSearchQuery = '';
let selectedShipmentIds = new Set();

function toggleBulkSelect(id, checked){
  if(checked) selectedShipmentIds.add(id); else selectedShipmentIds.delete(id);
  document.getElementById('bulkActionBar')?.remove();
  const wrap = document.getElementById('adminShipmentListWrap');
  if(wrap) wrap.insertAdjacentHTML('afterbegin', bulkActionBarHTML(filteredAdminShipments()));
}
function bulkActionBarHTML(list){
  const n = selectedShipmentIds.size;
  if(n===0) return '';
  return `<div id="bulkActionBar" class="admin-row" style="background:var(--surface-2); margin-bottom:10px;">
    <div class="admin-row-main"><b>${n} بار هەڵبژێردراوە</b></div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn btn-outline" style="padding:8px 14px;" data-gc-onclick="exportSelectedExcel()">Export Excel</button>
      <button class="btn btn-outline" style="padding:8px 14px;" data-gc-onclick="bulkMarkDelivered()">نیشانکردن وەک گەیشتوو</button>
      <button class="btn btn-ghost" style="padding:8px 14px;" data-gc-onclick="clearBulkSelect()">پاکردنەوە</button>
    </div>
  </div>`;
}
function clearBulkSelect(){ selectedShipmentIds.clear(); renderAdminShipmentList(); }
function exportSelectedExcel(){
  const rows = (currentShipmentsCache||[]).filter(s=>selectedShipmentIds.has(s.id));
  if(rows.length===0){ showToast('هیچ بارێک هەڵنەبژێردراوە.', 'error'); return; }
  const header = ['ژمارەی شوێنکەوتن','ناوی کڕیار','شار','دۆخ','جۆر','کێش','کۆی گشتی','دراوە','ماوە','بەروار'];
  const aoa = [header, ...rows.map(s => [
    s.id, s.requester?.name||'', placeLabel(s.destKey)||'', STEP_LABELS_KU[s.currentStepIndex]||'', s.type||'', s.weightKg||'',
    s.totalAmount||0, s.paidAmount||0, (Number(s.totalAmount||0)-Number(s.paidAmount||0)),
    s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : ''
  ])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:16},{wch:20},{wch:12},{wch:14},{wch:10},{wch:8},{wch:10},{wch:10},{wch:10},{wch:12}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'هەڵبژێردراوەکان');
  XLSX.writeFile(wb, 'selected-shipments.xlsx');
  logActivity('export_excel', null, 'selected('+rows.length+')');
}
async function bulkMarkDelivered(){
  const ids = Array.from(selectedShipmentIds);
  if(ids.length===0) return;
  if(!confirm(`دڵنیایت لە نیشانکردنی ${ids.length} بار وەک گەیشتوو؟`)) return;
  for(const id of ids){
    const s = await getShipmentForStaff(id);
    if(!s) continue;
    s.currentStepIndex = 5;
    s.stepDates = s.stepDates || {};
    if(!s.stepDates.delivered) s.stepDates.delivered = new Date().toISOString();
    await saveShipment(s);
    logActivity('update_status', id, 'status → گەیشت (bulk)');
  }
  showToast(`${ids.length} بار وەک گەیشتوو نیشانکرا.`, 'success');
  selectedShipmentIds.clear();
  currentShipmentsCache = await getAllShipments();
  renderAdminShipmentList();
}

function statusGroupForStep(stepIndex){
  if(stepIndex >= 5) return 'delivered';
  if(stepIndex <= 0) return 'pending';
  return 'transit';
}

function setAdminFilter(status){
  adminFilterStatus = status;
  renderAdminShipmentList();
}
function setAdminSearch(val){
  adminSearchQuery = val.trim().toLowerCase();
  renderAdminShipmentList();
}

function filteredAdminShipments(){
  return currentShipmentsCache.filter(s=>{
    const grp = statusGroupForStep(s.currentStepIndex);
    if(adminFilterStatus!=='all' && grp!==adminFilterStatus) return false;
    if(adminSearchQuery){
      const hay = `${s.id} ${s.requester?.name||''} ${s.requester?.phone||''}`.toLowerCase();
      if(!hay.includes(adminSearchQuery)) return false;
    }
    return true;
  });
}

function renderAdminShipmentList(){
  const wrap = document.getElementById('adminShipmentListWrap');
  if(!wrap) return;
  const list = filteredAdminShipments();
  document.querySelectorAll('.admin-tab').forEach(btn=>btn.classList.toggle('active', btn.dataset.status===adminFilterStatus));
  if(list.length===0){
    wrap.innerHTML = `<div class="admin-empty"><svg><use href="#i-box"></use></svg><p>هیچ بارێک نەدۆزرایەوە.</p></div>`;
    return;
  }
  wrap.innerHTML = bulkActionBarHTML(list) + '<div class="admin-list">' + list.map(s=>{
    const grp = statusGroupForStep(s.currentStepIndex);
    const grpLabel = grp==='delivered' ? 'گەیشتوو' : grp==='transit' ? 'لە ڕێگادا' : 'چاوەڕوان';
    return `
    <div class="admin-row status-${grp}">
      <input type="checkbox" class="bulk-select-box" value="${s.id}" data-gc-onchange="toggleBulkSelect('${s.id}', this.checked)" ${selectedShipmentIds.has(s.id)?'checked':''} style="width:18px; height:18px; margin-inline-end:6px; align-self:flex-start; margin-top:4px;">
      <div class="admin-row-main">
        <div class="admin-row-top">
          <b class="mono">${s.id}</b>
          <span class="admin-status-pill status-${grp}">${grpLabel}</span>
        </div>
        <span>${escapeHtml(s.requester?.name||'—')} · ${escapeHtml(s.requester?.phone||'—')}</span>
        <span class="hint" style="text-align:start; margin-top:0;">${placeLabel(s.originKey)} → ${placeLabel(s.destKey)} · ${s.weightKg||0}kg</span>
        <span class="hint" style="text-align:start; margin-top:2px; cursor:pointer; text-decoration:underline dotted;" data-gc-onclick="editBatchCode('${s.id}')" title="کرتە بکە بۆ گۆڕینی کۆدی باچ">
          📦 ${s.batchCode ? escapeHtml(s.batchCode) : 'کۆدی باچ دانەنراوە — کرتە بکە بۆ زیادکردن'}
        </span>
      </div>
      <div class="admin-select-wrap">
        <label>دۆخی بار</label>
        <select class="field" style="max-width:180px;" data-gc-onchange="updateShipmentStep('${s.id}', Number(this.value))">
          ${STEP_LABELS_KU.map((lbl,i)=>`<option value="${i}" ${s.currentStepIndex===i?'selected':''}>${lbl}</option>`).join('')}
        </select>
      </div>
      <div class="admin-row-actions">
        <label class="btn btn-ghost btn-icon" aria-label="بارکردنی وێنەی کارتۆنەکان بۆ ئەم قۆناغە (چەندین وێنە بەیەکەوە)" title="بارکردنی وێنەی کارتۆنەکان (چەندین وێنە بەیەکەوە)" style="cursor:pointer; position:relative;">
          <svg class="icon-sm"><use href="#i-box"></use></svg>
          ${(()=>{ const sk=STEP_KEYS[s.currentStepIndex]; const arr=s.stepPhotos && s.stepPhotos[sk] ? (Array.isArray(s.stepPhotos[sk])?s.stepPhotos[sk]:[s.stepPhotos[sk]]) : []; return arr.length ? `<span style="position:absolute; top:-6px; inset-inline-end:-6px; background:var(--teal); color:#04262b; font-size:10px; font-weight:800; border-radius:999px; min-width:16px; height:16px; display:flex; align-items:center; justify-content:center; padding:0 3px;">${arr.length}</span>` : ''; })()}
          <input type="file" accept="image/*" multiple style="display:none;" data-gc-onchange="uploadStepPhoto('${s.id}', this.files)">
        </label>
        <button class="btn btn-ghost btn-icon" data-gc-onclick="printShipmentLabel('${s.id}')" aria-label="چاپکردنی لەیبڵ" title="چاپکردنی لەیبڵ"><svg class="icon-sm"><use href="#i-box"></use></svg></button>
        <button class="btn btn-ghost btn-icon" data-gc-onclick="sendWhatsAppUpdate('${s.id}')" aria-label="ناردنی نوێکردنەوە بە واتساپ" title="ناردنی نوێکردنەوە بە واتساپ"><svg class="icon-sm"><use href="#i-whatsapp"></use></svg></button>
        <button class="btn btn-ghost btn-icon" id="invoiceBtnAdmin-${s.id}" data-gc-onclick="generateInvoiceForIdAdmin('${s.id}')" aria-label="دابەزاندنی وەسڵ" title="دابەزاندنی وەسڵ"><svg class="icon-sm"><use href="#i-download"></use></svg></button>
        <button class="btn btn-ghost btn-icon" data-gc-onclick="generateCommercialInvoicePDF('${s.id}')" aria-label="وەسڵی گومرگ (Commercial Invoice)" title="وەسڵی گومرگ (Commercial Invoice)"><svg class="icon-sm"><use href="#i-shield"></use></svg></button>
      </div>
    </div>`;
  }).join('') + '</div>';
}

function routeBreakdownHTML(shipments){
  const counts = {};
  shipments.forEach(s=>{
    const key = `${placeLabel(s.originKey)} → ${placeLabel(s.destKey)}`;
    counts[key] = (counts[key]||0) + 1;
  });
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(entries.length===0) return '<p class="hint">داتا نییە.</p>';
  const max = entries[0][1];
  return entries.map(([route,count])=>`
    <div class="route-bar-row">
      <span class="route-bar-label">${route}</span>
      <div class="route-bar-track"><div class="route-bar-fill" style="width:${Math.round(count/max*100)}%;"></div></div>
      <span class="route-bar-count">${count}</span>
    </div>`).join('');
}

function messagesPanelHTML(messages){
  if(!messages || messages.length===0) return '<p class="hint">هیچ پەیامێک نییە.</p>';
  const typeLabels = {shipping:'گەیاندنی بار', info:'زانیاری', support:'پشتگیری'};
  return '<div class="msg-list">' + messages.map(m=>`
    <div class="msg-item">
      <div class="msg-item-top"><b>${escapeHtml(m.name||'—')}${m.company?' · '+escapeHtml(m.company):''}</b><span>${new Date(m.created_at).toLocaleDateString('en-GB')}</span></div>
      <span class="email">${escapeHtml(m.email||'')}${m.request_type?' · <span style="color:var(--amber-l);">'+escapeHtml(typeLabels[m.request_type]||m.request_type)+'</span>':''}</span>
      <p>${escapeHtml((m.message||'').slice(0,140))}${(m.message||'').length>140?'…':''}</p>
    </div>`).join('') + '</div>';
}

function renderAdminMainHTML(shipments){
  const financeTotal = shipments.reduce((sum,s)=>sum+(Number(s.totalAmount)||0),0);
  const financePaid = shipments.reduce((sum,s)=>sum+(Number(s.paidAmount)||0),0);

  const tabBar = `<div class="admin-toolbar" style="margin-bottom:20px;">
    <div class="admin-tabs">
      <button class="admin-tab active" id="adminMainTab-ops" data-gc-onclick="setAdminMainTab('ops')">
        <svg class="icon-sm" style="margin-inline-end:5px;"><use href="#i-box"></use></svg>بەڕێوەبردن
      </button>
      <button class="admin-tab" id="adminMainTab-finance" data-gc-onclick="setAdminMainTab('finance')">
        <svg class="icon-sm" style="margin-inline-end:5px;"><use href="#i-card"></use></svg>دارایی
      </button>
      <button class="admin-tab" id="adminMainTab-customers" data-gc-onclick="setAdminMainTab('customers')">
        <svg class="icon-sm" style="margin-inline-end:5px;"><use href="#i-user"></use></svg>بەکارهێنەران
      </button>
      <button class="admin-tab" id="adminMainTab-directory" data-gc-onclick="setAdminMainTab('directory')">
        <svg class="icon-sm" style="margin-inline-end:5px;"><use href="#i-search"></use></svg>کۆگای موشتەریان
      </button>
      <button class="admin-tab" id="adminMainTab-activity" data-gc-onclick="setAdminMainTab('activity')">
        <svg class="icon-sm" style="margin-inline-end:5px;"><use href="#i-clock"></use></svg>چالاکی ستاف
      </button>
      <button class="admin-tab" id="adminMainTab-warehouse" data-gc-onclick="setAdminMainTab('warehouse')">
        <svg class="icon-sm" style="margin-inline-end:5px;"><use href="#i-box"></use></svg>وەرگرتن لە عەنبەر
      </button>
    </div>
    <button class="btn btn-primary" style="padding:10px 18px;" data-gc-onclick="toggleNewShipmentForm()">
      <svg class="icon-sm"><use href="#i-box"></use></svg> بارکردنی نوێ
    </button>
    <button class="btn btn-outline" style="padding:10px 18px;" data-gc-onclick="exportShipmentsExcel()">
      <svg class="icon-sm"><use href="#i-box"></use></svg> Export Excel
    </button>
  </div>`;

  const newShipmentForm = `<div id="newShipmentFormWrap" class="admin-panel" style="display:none; margin-bottom:22px;">
    <div class="admin-section-title"><svg><use href="#i-box"></use></svg><span>زیادکردنی بارکردنی نوێ</span></div>
    <div class="form-grid">
      <div class="form-row"><label class="field-label">ناوی کڕیار</label><input class="field" id="newShipName" required></div>
      <div class="form-row"><label class="field-label">مۆبایل</label><input class="field" type="tel" id="newShipPhone" required></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="field-label">لە کوێوە</label><select class="field" id="newShipOrigin">${ORIGIN_KEYS.map(k=>`<option value="${k}">${placeLabel(k)}</option>`).join('')}</select></div>
      <div class="form-row"><label class="field-label">بۆ کوێ</label><select class="field" id="newShipDest">${DEST_KEYS.map(k=>`<option value="${k}">${placeLabel(k)}</option>`).join('')}</select></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="field-label">جۆری گەیاندن</label>
        <select class="field" id="newShipType"><option value="air">گەیاندنی ئاسمانی</option><option value="sea">گەیاندنی دەریایی</option><option value="land">گەیاندنی وشکانی</option></select>
      </div>
      <div class="form-row"><label class="field-label">کێش (kg)</label><input class="field" type="number" id="newShipWeight" required></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="field-label">کۆی گشتی ($)</label><input class="field" type="number" id="newShipTotal" value="0"></div>
      <div class="form-row"><label class="field-label">پارەدراو ($)</label><input class="field" type="number" id="newShipPaid" value="0"></div>
    </div>
    <div class="form-row"><label class="field-label">کۆدی کڕیار لە کۆگا (GC-XXX)</label><input class="field" id="newShipBatch" placeholder="بۆ نموونە GC-450" data-gc-oninput="lookupBatchCode(this.value, 'newShipBatchMatch')"><span id="newShipBatchMatch" class="hint" style="text-align:start;"></span></div>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-primary" data-gc-onclick="submitNewShipment()">پاشەکەوتکردن</button>
      <button class="btn btn-outline" data-gc-onclick="toggleNewShipmentForm()">پاشگەزبوونەوە</button>
    </div>
    <p id="newShipmentMsg" class="hint" style="display:none;"></p>
  </div>`;

  const opsPanel = `<div id="adminPanel-ops">${renderAdminOpsHTML(shipments)}</div>`;
  const financePanel = `<div id="adminPanel-finance" style="display:none;">
    <div class="admin-stats">
      <div class="admin-stat-card" style="--accent-c:var(--teal);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-box"></use></svg><b>${shipments.length}</b><span>کۆی گشتی بار</span></div>
      <div class="admin-stat-card" style="--accent-c:var(--teal-l);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-card"></use></svg><b class="fin-stat-total">${financeTotal.toLocaleString()}</b><span>کۆی گشتی ($)</span></div>
      <div class="admin-stat-card" style="--accent-c:var(--mint);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-check"></use></svg><b class="fin-stat-paid">${financePaid.toLocaleString()}</b><span>پارەدراو ($)</span></div>
      <div class="admin-stat-card" style="--accent-c:var(--amber-l);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-card"></use></svg><b class="fin-stat-outstanding">${(financeTotal-financePaid).toLocaleString()}</b><span>ماوە ($)</span></div>
    </div>
    ${financeRowsHTML(shipments)}
  </div>`;

  const customersPanel = `<div id="adminPanel-customers" style="display:none;">
    <div class="admin-section-title"><svg><use href="#i-user"></use></svg><span>بەکارهێنەرانی تۆمارکراو</span></div>
    <div id="customersListWrap">${skeletonRows(4)}</div>
  </div>`;

  const directoryPanel = `<div id="adminPanel-directory" style="display:none;">
    <div class="admin-section-title" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
      <span style="display:flex; align-items:center; gap:8px;"><svg><use href="#i-search"></use></svg><span>کۆگای موشتەریانی هایپەرۆ</span></span>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-outline" style="padding:10px 16px;" data-gc-onclick="exportDirectoryCSV()"><svg class="icon-sm"><use href="#i-box"></use></svg> Export CSV</button>
        <button class="btn btn-outline" style="padding:10px 16px;" data-gc-onclick="exportDirectoryExcel()"><svg class="icon-sm"><use href="#i-box"></use></svg> Export Excel</button>
        <button class="btn btn-primary" style="padding:10px 16px;" data-gc-onclick="openDirectoryForm()"><svg class="icon-sm"><use href="#i-user"></use></svg> زیادکردنی موشتەری</button>
      </div>
    </div>
    <div class="admin-stats admin-stats-3" id="directoryStats" style="margin-bottom:18px;"></div>
    <div class="form-row" style="max-width:420px; margin-bottom:16px;">
      <div class="field-icon-wrap">
        <svg class="icon-sm field-icon"><use href="#i-search"></use></svg>
        <input class="field" id="directorySearch" placeholder="گەڕان بە ناو، مۆبایل، یان کۆد (Gc-)..." data-gc-oninput="filterDirectory()">
      </div>
    </div>
    <div id="directoryListWrap">${skeletonRows(6)}</div>
    <div id="directoryPager" style="display:flex; gap:10px; justify-content:center; margin-top:16px;"></div>
  </div>`;

  const activityPanel = `<div id="adminPanel-activity" style="display:none;">
    <div class="admin-section-title"><svg><use href="#i-clock"></use></svg><span>چالاکی ستاف — دوایین ١٠٠ کردار</span></div>
    <div id="activityListWrap">${skeletonRows(6)}</div>
  </div>`;

  const warehousePanel = `<div id="adminPanel-warehouse" style="display:none;">
    <div class="admin-section-title"><svg><use href="#i-box"></use></svg><span>وەرگرتنی باچ/کیسە لە عەنبەر</span></div>
    <div class="quote-card" style="margin-bottom:20px;">
      <div class="form-grid">
        <div class="form-row"><label class="field-label">کۆدی کڕیار لە کۆگا (GC-XXX)</label><input class="field" id="whBatchCode" placeholder="بۆ نموونە GC-450" data-gc-oninput="lookupBatchCode(this.value, 'whBatchMatch')"><span id="whBatchMatch" class="hint" style="text-align:start;"></span></div>
        <div class="form-row"><label class="field-label">شوێن</label>
          <select class="field" id="whLocation">
            <option value="Dubai">عەنبەری دوبەی</option>
            <option value="China">عەنبەری چین</option>
            <option value="Erbil">عەنبەری هەولێر</option>
          </select>
        </div>
      </div>
      <div class="form-row"><label class="field-label">تێبینی (ئارەزوومەندانە)</label><input class="field" id="whNotes" placeholder="بۆ نموونە: ٣ کارتۆن، باشە"></div>
      <div class="form-row"><label class="field-label">وێنەکان (وەسڵ/بستە — دەتوانیت چەندین وێنە هەڵبژێریت)</label>
        <input class="field" type="file" accept="image/*" multiple id="whPhotos">
      </div>
      <button class="btn btn-primary btn-block" data-gc-onclick="submitWarehouseReceipt()">تۆمارکردن</button>
      <p id="whMsg" class="hint" style="display:none;"></p>
    </div>
    <div class="admin-section-title"><span>دوایین تۆمارەکان</span></div>
    <div id="warehouseListWrap">${skeletonRows(4)}</div>
  </div>`;

  return tabBar + newShipmentForm + opsPanel + financePanel + customersPanel + directoryPanel + activityPanel + warehousePanel;
}

function setAdminMainTab(tab){
  document.getElementById('adminMainTab-ops').classList.toggle('active', tab==='ops');
  document.getElementById('adminMainTab-finance').classList.toggle('active', tab==='finance');
  document.getElementById('adminMainTab-customers').classList.toggle('active', tab==='customers');
  document.getElementById('adminMainTab-directory').classList.toggle('active', tab==='directory');
  document.getElementById('adminMainTab-activity').classList.toggle('active', tab==='activity');
  document.getElementById('adminMainTab-warehouse').classList.toggle('active', tab==='warehouse');
  document.getElementById('adminPanel-ops').style.display = tab==='ops' ? 'block' : 'none';
  document.getElementById('adminPanel-finance').style.display = tab==='finance' ? 'block' : 'none';
  document.getElementById('adminPanel-customers').style.display = tab==='customers' ? 'block' : 'none';
  document.getElementById('adminPanel-directory').style.display = tab==='directory' ? 'block' : 'none';
  document.getElementById('adminPanel-activity').style.display = tab==='activity' ? 'block' : 'none';
  document.getElementById('adminPanel-warehouse').style.display = tab==='warehouse' ? 'block' : 'none';
  if(tab==='customers') loadCustomersList();
  if(tab==='directory') loadDirectory();
  if(tab==='activity') loadActivityLog();
  if(tab==='warehouse') loadWarehouseReceipts();
}

const ACTIVITY_ACTION_LABELS = {
  create_shipment: 'دروستکردنی بارکردنی نوێ',
  update_status: 'گۆڕینی دۆخی بار',
  update_finance: 'دەستکاریکردنی دارایی',
  delete_customer: 'سڕینەوەی کڕیار',
  delete_directory_entry: 'سڕینەوەی موشتەری لە کۆگا'
};
function timeAgoKu(iso){
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs/60000);
  if(mins < 1) return 'ئێستا';
  if(mins < 60) return mins+' خولەک لەمەوبەر';
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return hrs+' کاتژمێر لەمەوبەر';
  const days = Math.floor(hrs/24);
  return days+' ڕۆژ لەمەوبەر';
}
async function loadActivityLog(){
  const wrap = document.getElementById('activityListWrap');
  const {data, error} = await sb.from('staff_activity_log').select('*').order('created_at', {ascending:false}).limit(100);
  if(error){ wrap.innerHTML = '<p class="hint">هەڵەیەک ڕوویدا لە هێنانی چالاکییەکان.</p>'; return; }
  if(!data || data.length===0){ wrap.innerHTML = `<div class="admin-empty"><svg><use href="#i-clock"></use></svg><p>هێشتا هیچ چالاکییەک تۆمار نەکراوە.</p></div>`; return; }
  wrap.innerHTML = '<div class="admin-list">' + data.map(row=>`
    <div class="admin-row">
      <div class="admin-row-main">
        <b>${escapeHtml(ACTIVITY_ACTION_LABELS[row.action] || row.action)}</b>
        <span>${escapeHtml(row.staff_name || 'ستاف')}${row.target_id ? ' · '+escapeHtml(row.target_id) : ''}</span>
        ${row.details ? `<span class="hint" style="text-align:start; margin-top:0;">${escapeHtml(row.details)}</span>` : ''}
      </div>
      <span class="hint" style="white-space:nowrap;">${timeAgoKu(row.created_at)}</span>
    </div>
  `).join('') + '</div>';
}

let directoryCache = [];
let directoryPage = 1;
const DIRECTORY_PAGE_SIZE = 40;
let directoryStatsMap = {};
async function loadDirectory(){
  const wrap = document.getElementById('directoryListWrap');
  const {data, error} = await sb.from('customer_directory').select('*').order('code');
  if(error){ wrap.innerHTML = '<p class="hint">هەڵەیەک ڕوویدا لە هێنانی کۆگا. دڵنیابەرەوە SQL ـی کۆگا ڕاکراوە.</p>'; return; }
  directoryCache = data || [];
  directoryPage = 1;
  const {data: statsRows, error: statsError} = await sb.from('customer_directory_stats').select('*');
  directoryStatsMap = {};
  if(!statsError) (statsRows||[]).forEach(r=>{ directoryStatsMap[r.directory_customer_id] = r; });
  renderDirectoryStats();
  renderDirectoryRows(directoryCache.filter(c=>c.name));
}
function renderDirectoryStats(){
  const named = directoryCache.filter(c=>c.name).length;
  const blank = directoryCache.length - named;
  const withPhone = directoryCache.filter(c=>c.name && c.phone).length;
  document.getElementById('directoryStats').innerHTML = `
    <div class="admin-stat-card" style="--accent-c:var(--teal);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-user"></use></svg><b>${named}</b><span>موشتەریی تۆمارکراو</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--mint);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-phone"></use></svg><b>${withPhone}</b><span>ژمارەی مۆبایلیان هەیە</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--amber-l);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-box"></use></svg><b>${blank}</b><span>کۆدی بەتاڵی بەردەست</span></div>`;
}
function filterDirectory(){
  directoryPage = 1;
  const q = document.getElementById('directorySearch').value.trim().toLowerCase();
  if(!q){ renderDirectoryRows(directoryCache.filter(c=>c.name)); return; }
  const filtered = directoryCache.filter(c =>
    (c.name && c.name.toLowerCase().includes(q)) ||
    (c.code && c.code.toLowerCase().includes(q)) ||
    (c.phone && c.phone.includes(q)) ||
    (c.phone2 && c.phone2.includes(q)) ||
    (c.city && c.city.toLowerCase().includes(q))
  );
  renderDirectoryRows(filtered);
}
function goDirectoryPage(list, page){
  directoryPage = page;
  renderDirectoryRows(list, true);
}
let lastDirectoryList = [];
function renderDirectoryRows(list, keepPage){
  lastDirectoryList = list;
  if(!keepPage) directoryPage = 1;
  const wrap = document.getElementById('directoryListWrap');
  const pager = document.getElementById('directoryPager');
  if(!list || list.length===0){
    wrap.innerHTML = `<div class="admin-empty"><svg><use href="#i-user"></use></svg><p>هیچ ئەنجامێک نەدۆزرایەوە.</p></div>`;
    pager.innerHTML = '';
    return;
  }
  const totalPages = Math.ceil(list.length / DIRECTORY_PAGE_SIZE);
  if(directoryPage > totalPages) directoryPage = totalPages;
  const start = (directoryPage-1) * DIRECTORY_PAGE_SIZE;
  const pageItems = list.slice(start, start + DIRECTORY_PAGE_SIZE);
  wrap.innerHTML = '<div class="admin-list">' + pageItems.map(c=>{
    if(!c.name){
      return `<div class="admin-row" style="opacity:.65;">
        <div class="admin-row-main">
          <b class="mono" style="color:var(--muted-2);">${c.code}</b>
          <span>کۆدی بەتاڵ — بۆ دیاریکردن کلیک بکە</span>
        </div>
        <button class="btn btn-outline" style="padding:10px 14px;" data-gc-onclick='openDirectoryForm(${JSON.stringify(c).replace(/'/g,"&#39;")})'><svg class="icon-sm"><use href="#i-settings"></use></svg> دیاریکردن</button>
      </div>`;
    }
    const stats = directoryStatsMap[c.id];
    const statsLine = stats && stats.shipment_count > 0
      ? `<div class="dir-stats-line">
          <span><svg class="icon-sm"><use href="#i-box"></use></svg> ${stats.shipment_count} بار</span>
          <span>کۆی: $${Number(stats.total_amount).toLocaleString()}</span>
          <span style="color:${Number(stats.outstanding)>0?'var(--amber-l)':'var(--mint)'};">ماوە: $${Number(stats.outstanding).toLocaleString()}</span>
        </div>`
      : '';
    return `<div class="admin-row">
      <div class="admin-row-main">
        <b>${escapeHtml(c.name)}${c.code ? ' <span class="hint" style=\"display:inline; margin:0; color:var(--teal-l);\">· '+escapeHtml(c.code)+'</span>' : ''}</b>
        <span>${c.city ? escapeHtml(placeCityLabel(c.city))+' · ' : ''}${escapeHtml(c.delivery_location || '')}</span>
        ${c.note ? `<span class="hint" style="text-align:start; margin-top:0;">${escapeHtml(c.note)}</span>` : ''}
        ${statsLine}
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${c.phone ? `<a class="btn btn-outline btn-icon" href="tel:${escapeHtml(c.phone)}"><svg class="icon-sm"><use href="#i-phone"></use></svg></a>` : ''}
        ${c.phone ? `<a class="btn btn-outline btn-icon" style="color:#25D366; border-color:rgba(37,211,102,.35);" target="_blank" rel="noopener" href="https://wa.me/${escapeHtml(c.phone.replace(/[^0-9]/g,''))}"><svg class="icon-sm"><use href="#i-chat"></use></svg></a>` : ''}
        <button class="btn btn-outline btn-icon" data-gc-onclick="viewCustomerReceipts('${c.id}', '${escapeHtml(c.name).replace(/'/g,"&#39;")}')" title="وەرگرتنەکانی لە عەنبەر" aria-label="وەرگرتنەکانی لە عەنبەر"><svg class="icon-sm"><use href="#i-box"></use></svg></button>
        <button class="btn btn-outline btn-icon" data-gc-onclick='openDirectoryForm(${JSON.stringify(c).replace(/'/g,"&#39;")})' aria-label="دەستکاریکردن" title="دەستکاریکردن"><svg class="icon-sm"><use href="#i-settings"></use></svg></button>
        <button class="btn btn-outline btn-icon" style="color:var(--red-l); border-color:rgba(229,83,61,.35);" data-gc-onclick="confirmDeleteDirectoryEntry('${c.id}')" aria-label="سڕینەوە" title="سڕینەوە"><svg class="icon-sm"><use href="#i-trash"></use></svg></button>
      </div>
    </div>`;
  }).join('') + '</div>';

  if(totalPages <= 1){ pager.innerHTML = ''; return; }
  pager.innerHTML = `
    <button class="btn btn-outline" style="padding:9px 16px;" ${directoryPage<=1?'disabled':''} data-gc-onclick="goDirectoryPage(lastDirectoryList, ${directoryPage-1})">‹ پێشوو</button>
    <span class="hint" style="align-self:center; margin:0;">لاپەڕەی ${directoryPage} لە ${totalPages} (${list.length} ئەنجام)</span>
    <button class="btn btn-outline" style="padding:9px 16px;" ${directoryPage>=totalPages?'disabled':''} data-gc-onclick="goDirectoryPage(lastDirectoryList, ${directoryPage+1})">دواتر ›</button>`;
}
function exportDirectoryExcel(){
  const rows = lastDirectoryList.filter(c=>c.name);
  if(rows.length===0){ showToast('هیچ داتایەک نییە بۆ ناردن.', 'error'); return; }
  const header = ['کۆد','ناو','مۆبایل ١','مۆبایل ٢','شار','شوێنی ناردن','تێبینی'];
  const aoa = [header, ...rows.map(c => [c.code,c.name,c.phone,c.phone2,c.city,c.delivery_location,c.note])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:10},{wch:22},{wch:14},{wch:14},{wch:14},{wch:18},{wch:24}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'کۆگای موشتەریان');
  XLSX.writeFile(wb, 'customer-directory.xlsx');
  logActivity('export_excel', null, 'customer-directory');
}
function exportShipmentsExcel(){
  const rows = currentShipmentsCache || [];
  if(rows.length===0){ showToast('هیچ داتایەک نییە بۆ ناردن.', 'error'); return; }
  const header = ['ژمارەی شوێنکەوتن','ناوی کڕیار','شار','دۆخ','جۆر','کێش','کۆی گشتی','دراوە','ماوە','بەروار'];
  const aoa = [header, ...rows.map(s => [
    s.id, s.customerName||'', s.city||'', STEP_LABELS_KU[s.currentStepIndex]||'', s.type||'', s.weight||'',
    s.totalAmount||0, s.paidAmount||0, (Number(s.totalAmount||0)-Number(s.paidAmount||0)),
    s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : ''
  ])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:16},{wch:20},{wch:12},{wch:14},{wch:10},{wch:8},{wch:10},{wch:10},{wch:10},{wch:12}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'بارەکان');
  XLSX.writeFile(wb, 'shipments.xlsx');
  logActivity('export_excel', null, 'shipments');
}
function exportDirectoryCSV(){
  const rows = lastDirectoryList.filter(c=>c.name);
  if(rows.length===0){ showToast('هیچ داتایەک نییە بۆ ناردن.', 'error'); return; }
  const header = ['کۆد','ناو','مۆبایل ١','مۆبایل ٢','شار','شوێنی ناردن','تێبینی'];
  const esc = v => `"${(v||'').toString().replace(/"/g,'""')}"`;
  const lines = [header.map(esc).join(',')];
  rows.forEach(c => lines.push([c.code,c.name,c.phone,c.phone2,c.city,c.delivery_location,c.note].map(esc).join(',')));
  const blob = new Blob(['\uFEFF'+lines.join('\r\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'customer-directory.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function placeCityLabel(c){
  const map = {
    hawler:'هەولێر', hawle:'هەولێر', slimani:'سلێمانی', slemani:'سلێمانی', duhok:'دهۆک', soran:'سۆران',
    kerkuk:'کەرکووک', karkuk:'کەرکووک', bakhdad:'بەغدا', zaxo:'زاخۆ', akre:'ئاکرێ', amedi:'ئامێدی',
    babl:'بابل', chamchamal:'چەمچەماڵ', duzxurmatu:'دووزخورماتوو', faluja:'فەلوجە', halabja:'هەڵەبجە',
    kalar:'کەلار', karbala:'کەربەلا', koya:'کۆیە', penjuen:'پێنجوێن', qaladze:'قەڵادزێ', qushtapa:'قوشتەپە',
    rania:'ڕانیە', rawandz:'ڕواندز', shiladze:'شێلادزێ', xabat:'خەبات', xalifan:'خەلیفان',
    bardarash:'بەردەڕەش', '7ajiawa':'حاجیاوە'
  };
  return map[(c||'').toLowerCase()] || c;
}

function nextDirectoryCode(){
  let n = 541;
  while(directoryCache.some(c => c.code === 'Gc-'+n && c.name)) n++;
  return 'Gc-'+n;
}
function openDirectoryForm(entry){
  if(!entry || !entry.id){
    // Adding a brand new customer: claim the next free/blank slot at Gc-541+
    // instead of creating a duplicate code.
    const code = nextDirectoryCode();
    entry = directoryCache.find(c => c.code === code) || null;
  }
  const isEdit = !!(entry && entry.id);
  document.getElementById('directoryFormTitle').textContent = isEdit && entry.name ? 'دەستکاریکردنی موشتەری' : 'زیادکردنی موشتەری';
  document.getElementById('dirFormId').value = isEdit ? entry.id : '';
  document.getElementById('dirFormCode').value = isEdit ? (entry.code||'') : nextDirectoryCode();
  document.getElementById('dirFormName').value = isEdit ? (entry.name||'') : '';
  document.getElementById('dirFormPhone').value = isEdit ? (entry.phone||'') : '';
  document.getElementById('dirFormPhone2').value = isEdit ? (entry.phone2||'') : '';
  document.getElementById('dirFormCity').value = isEdit ? (entry.city||'') : '';
  document.getElementById('dirFormDelivery').value = isEdit ? (entry.delivery_location||'') : '';
  document.getElementById('dirFormNote').value = isEdit ? (entry.note||'') : '';
  document.getElementById('dirFormMsg').style.display = 'none';
  document.getElementById('directoryFormModal').style.display = 'flex';
}
function closeDirectoryForm(){
  document.getElementById('directoryFormModal').style.display = 'none';
}
async function saveDirectoryEntry(){
  const msg = document.getElementById('dirFormMsg');
  const id = document.getElementById('dirFormId').value;
  const name = document.getElementById('dirFormName').value.trim();
  if(!name){ msg.textContent = 'ناو پێویستە.'; msg.style.display = 'block'; return; }
  const row = {
    code: document.getElementById('dirFormCode').value.trim() || null,
    name,
    phone: document.getElementById('dirFormPhone').value.trim() || null,
    phone2: document.getElementById('dirFormPhone2').value.trim() || null,
    city: document.getElementById('dirFormCity').value.trim() || null,
    delivery_location: document.getElementById('dirFormDelivery').value.trim() || null,
    note: document.getElementById('dirFormNote').value.trim() || null,
  };
  let error;
  if(id){
    ({error} = await sb.from('customer_directory').update(row).eq('id', id));
  } else {
    ({error} = await sb.from('customer_directory').insert(row));
  }
  if(error){
    if(error.message.includes('duplicate') && error.message.includes('code')){
      msg.textContent = 'ئەم کۆدە پێشتر بەکارهاتووە.';
    } else if(error.message.includes('duplicate')){
      msg.textContent = 'ئەم ژمارە مۆبایلە پێشتر بۆ موشتەرییەکی تر تۆمارکراوە.';
    } else {
      msg.textContent = 'هەڵەیەک ڕوویدا: ' + error.message;
    }
    msg.style.display = 'block';
    return;
  }
  closeDirectoryForm();
  showToast(id ? 'گۆڕانکارییەکان پاشەکەوت کران.' : 'موشتەری زیادکرا.', 'success');
  await loadDirectory();
}
let pendingDeleteDirectoryId = null;
function confirmDeleteDirectoryEntry(id){
  const c = directoryCache.find(x=>x.id===id);
  pendingDeleteDirectoryId = id;
  document.getElementById('deleteDirectoryName').textContent = c ? (c.name||'') : '';
  document.getElementById('deleteDirectoryModal').style.display = 'flex';
}
function cancelDeleteDirectoryEntry(){
  pendingDeleteDirectoryId = null;
  document.getElementById('deleteDirectoryModal').style.display = 'none';
}
async function doDeleteDirectoryEntry(){
  if(!pendingDeleteDirectoryId) return;
  const {error} = await sb.from('customer_directory').delete().eq('id', pendingDeleteDirectoryId);
  document.getElementById('deleteDirectoryModal').style.display = 'none';
  if(!error) logActivity('delete_directory_entry', pendingDeleteDirectoryId, null);
  pendingDeleteDirectoryId = null;
  if(error){ showToast('هەڵەیەک ڕوویدا لە سڕینەوەدا.', 'error'); return; }
  showToast('موشتەری سڕایەوە.', 'success');
  await loadDirectory();
}

let customersCache = [];
async function loadCustomersList(){
  const wrap = document.getElementById('customersListWrap');
  const {data, error} = await sb.rpc('admin_list_customers');
  if(error){ wrap.innerHTML = '<p class="hint">هەڵەیەک ڕوویدا لە هێنانی بەکارهێنەران.</p>'; return; }
  customersCache = data || [];
  if(customersCache.length===0){ wrap.innerHTML = `<div class="admin-empty"><svg><use href="#i-user"></use></svg><p>هێشتا هیچ کڕیارێک هەژماری تۆمار نەکردووە.</p></div>`; return; }
  wrap.innerHTML = '<div class="admin-list">' + customersCache.map(c=>`
    <div class="admin-row">
      <div class="admin-row-main">
        <b>${escapeHtml(c.full_name || c.email.split('@')[0])}</b>
        <span>${escapeHtml(c.email)}${c.phone ? ' · '+escapeHtml(c.phone) : ''}</span>
        <span class="hint" style="text-align:start; margin-top:0;">${c.shipment_count} بارکردن · تۆمارکراوە لە ${new Date(c.created_at).toLocaleDateString('en-GB')}</span>
      </div>
      <button class="btn btn-outline" style="padding:10px 16px; color:var(--red-l); border-color:rgba(229,83,61,.35);" data-gc-onclick="confirmDeleteCustomer('${c.id}')">
        <svg class="icon-sm"><use href="#i-trash"></use></svg> سڕینەوە
      </button>
    </div>`).join('') + '</div>';
}

let pendingDeleteCustomerId = null;
function confirmDeleteCustomer(id){
  const c = customersCache.find(x=>x.id===id);
  pendingDeleteCustomerId = id;
  document.getElementById('deleteCustomerName').textContent = c ? (c.full_name || c.email) : '';
  document.getElementById('deleteCustomerModal').style.display = 'flex';
}
function cancelDeleteCustomer(){
  pendingDeleteCustomerId = null;
  document.getElementById('deleteCustomerModal').style.display = 'none';
}
function skeletonRows(n){
  n = n || 4;
  let out = '';
  for(let i=0;i<n;i++){
    out += `<div class="skeleton-row">
      <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
        <div class="skeleton-bar" style="height:13px; width:${40+Math.random()*30}%;"></div>
        <div class="skeleton-bar" style="height:10px; width:${25+Math.random()*20}%;"></div>
      </div>
      <div class="skeleton-bar" style="height:30px; width:70px; border-radius:999px;"></div>
    </div>`;
  }
  return out;
}
function showToast(message, type){
  type = type || 'info';
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const icon = type==='success' ? 'i-check' : (type==='error' ? 'i-x' : 'i-shield');
  const el = document.createElement('div');
  el.className = 'toast '+type;
  el.innerHTML = `<svg><use href="#${icon}"></use></svg><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(()=>{
    el.classList.add('leaving');
    setTimeout(()=>el.remove(), 250);
  }, 3800);
}
/* ================= STAFF ACTIVITY LOG =================
   Records who did what, when — visible to staff in a dedicated admin tab.
   Best-effort: a logging failure never blocks the actual action. */
let currentStaffName = null;
async function logActivity(action, targetId, details){
  try{
    const { data: userData } = await sb.auth.getUser();
    const uid = userData?.user?.id;
    if(!uid) return;
    let staffName = currentStaffName;
    if(!staffName){
      const { data: staffRow } = await sb.from('staff').select('full_name').eq('id', uid).maybeSingle();
      staffName = staffRow?.full_name || '';
      currentStaffName = staffName;
    }
    await sb.from('staff_activity_log').insert({
      staff_id: uid, staff_name: staffName, action, target_id: targetId || null, details: details || null
    });
  }catch(e){ /* logging is best-effort */ }
}

async function uploadStepPhoto(shipmentId, fileList){
  const files = Array.from(fileList || []);
  if(files.length === 0) return;
  const bad = files.find(f => !f.type.startsWith('image/'));
  if(bad){ showToast('تکایە تەنها فایلی وێنە هەڵبژێرە.', 'error'); return; }
  showToast(files.length > 1 ? `بارکردنی ${files.length} وێنە...` : 'بارکردنی وێنە...', 'success');
  const s = await getShipmentForStaff(shipmentId);
  if(!s) return;
  const stepKey = STEP_KEYS[s.currentStepIndex];
  s.stepPhotos = s.stepPhotos || {};
  if(!Array.isArray(s.stepPhotos[stepKey])) s.stepPhotos[stepKey] = s.stepPhotos[stepKey] ? [s.stepPhotos[stepKey]] : [];

  let uploadedCount = 0;
  for(let i=0; i<files.length; i++){
    const file = files[i];
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${shipmentId}/${stepKey}-${Date.now()}-${i}.${ext}`;
    const {error: upErr} = await sb.storage.from('shipment-photos').upload(path, file, {upsert:true});
    if(upErr) continue;
    const {data: pub} = sb.storage.from('shipment-photos').getPublicUrl(path);
    s.stepPhotos[stepKey].push(pub.publicUrl);
    uploadedCount++;
  }
  if(uploadedCount === 0){ showToast('هەڵەیەک ڕوویدا لە بارکردنی وێنەکان.', 'error'); return; }

  const {error} = await saveShipment(s);
  if(error){ showToast('وێنەکان بارکران بەڵام پاشەکەوت نەکران.', 'error'); return; }
  logActivity('upload_photo', shipmentId, stepKey+' ('+uploadedCount+' وێنە)');
  const idx = currentShipmentsCache.findIndex(x=>x.id===shipmentId);
  if(idx>-1) currentShipmentsCache[idx] = s;
  showToast(`${uploadedCount} وێنە زیادکرا بۆ ئەم قۆناغە.`, 'success');
}

let chartRevenueInstance = null, chartRoutesInstance = null;
function initAdminCharts(shipments){
  const revCanvas = document.getElementById('chartRevenue');
  const routeCanvas = document.getElementById('chartRoutes');
  if(!revCanvas || !routeCanvas || typeof Chart === 'undefined') return;

  /* Revenue by month, last 6 months */
  const months = [];
  const now = new Date();
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({key:`${d.getFullYear()}-${d.getMonth()}`, label:d.toLocaleDateString('en-GB',{month:'short',year:'2-digit'}), total:0});
  }
  shipments.forEach(s=>{
    const dt = s.createdAt ? new Date(s.createdAt) : null;
    if(!dt) return;
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    const m = months.find(x=>x.key===key);
    if(m) m.total += Number(s.totalAmount||0);
  });
  const isLight = currentTheme()==='light';
  const tickColor = isLight ? '#4A5A72' : '#8aa3b8';
  if(chartRevenueInstance) chartRevenueInstance.destroy();
  chartRevenueInstance = new Chart(revCanvas, {
    type:'bar',
    data:{ labels: months.map(m=>m.label), datasets:[{ data: months.map(m=>m.total), backgroundColor:'#1abc9c', borderRadius:6 }] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true, ticks:{color:tickColor} }, x:{ ticks:{color:tickColor} } } }
  });

  /* Top routes by shipment count */
  const routeCounts = {};
  shipments.forEach(s=>{
    const key = `${placeLabel(s.originKey)} → ${placeLabel(s.destKey)}`;
    routeCounts[key] = (routeCounts[key]||0) + 1;
  });
  const topRoutes = Object.entries(routeCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(chartRoutesInstance) chartRoutesInstance.destroy();
  chartRoutesInstance = new Chart(routeCanvas, {
    type:'bar',
    data:{ labels: topRoutes.map(r=>r[0]), datasets:[{ data: topRoutes.map(r=>r[1]), backgroundColor:'#e8b64c', borderRadius:6 }] },
    options:{ indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{ beginAtZero:true, ticks:{color:tickColor} }, y:{ ticks:{color:tickColor} } } }
  });
}

function runGlobalSearch(query){
  const wrap = document.getElementById('globalSearchResults');
  const q = query.trim().toLowerCase();
  if(q.length < 2){ wrap.innerHTML = ''; return; }
  const shipMatches = (currentShipmentsCache||[]).filter(s =>
    (s.id||'').toLowerCase().includes(q) ||
    (s.requester?.name||'').toLowerCase().includes(q) ||
    (s.requester?.phone||'').toLowerCase().includes(q) ||
    (s.batchCode||'').toLowerCase().includes(q)
  ).slice(0,5);
  if(shipMatches.length===0){ wrap.innerHTML = '<p class="hint" style="margin-top:8px;">هیچ ئەنجامێک نەدۆزرایەوە.</p>'; return; }
  wrap.innerHTML = '<div class="admin-list" style="margin-top:8px;">' + shipMatches.map(s=>`
    <div class="admin-row">
      <div class="admin-row-main"><b class="mono">${escapeHtml(s.id)}</b><span>${escapeHtml(s.requester?.name||'—')} · ${escapeHtml(s.requester?.phone||'—')}</span></div>
      <span class="admin-status-pill status-${statusGroupForStep(s.currentStepIndex)}">${STEP_LABELS_KU[s.currentStepIndex]}</span>
    </div>`).join('') + '</div>';
}

function printShipmentLabel(shipmentId){
  const s = (currentShipmentsCache||[]).find(x=>x.id===shipmentId);
  if(!s){ showToast('بارکردنەکە نەدۆزرایەوە.', 'error'); return; }
  const area = document.getElementById('printLabelArea');
  area.innerHTML = `
    <div style="border:2px solid #111; border-radius:10px; padding:22px; max-width:420px; font-family:sans-serif; color:#111;">
      <div style="display:flex; align-items:center; gap:10px; border-bottom:2px solid #111; padding-bottom:12px; margin-bottom:14px;">
        <img src="logo-icon.png" alt="Globall Cloud" style="width:42px; height:42px;">
        <div><b style="font-size:18px;">Globall Cloud</b><br><span style="font-size:12px;">China · UAE · Iraq Logistics</span></div>
      </div>
      <div style="text-align:center; margin-bottom:14px;">
        <div id="printQrCode" style="display:inline-block;"></div>
      </div>
      <div style="text-align:center; font-size:20px; font-weight:bold; letter-spacing:1px; margin-bottom:14px;">${escapeHtml(s.id)}</div>
      <table style="width:100%; font-size:13px; border-collapse:collapse;">
        <tr><td style="padding:4px 0; color:#555;">کڕیار</td><td style="padding:4px 0; text-align:end;"><b>${escapeHtml(s.requester?.name||'—')}</b></td></tr>
        <tr><td style="padding:4px 0; color:#555;">مۆبایل</td><td style="padding:4px 0; text-align:end;">${escapeHtml(s.requester?.phone||'—')}</td></tr>
        <tr><td style="padding:4px 0; color:#555;">لە</td><td style="padding:4px 0; text-align:end;">${escapeHtml(placeLabel(s.originKey))}</td></tr>
        <tr><td style="padding:4px 0; color:#555;">بۆ</td><td style="padding:4px 0; text-align:end;"><b>${escapeHtml(placeLabel(s.destKey))}</b></td></tr>
        <tr><td style="padding:4px 0; color:#555;">جۆر</td><td style="padding:4px 0; text-align:end;">${escapeHtml(s.type||'—')}</td></tr>
        <tr><td style="padding:4px 0; color:#555;">کێش</td><td style="padding:4px 0; text-align:end;">${s.weightKg||0} kg</td></tr>
      </table>
      <p style="text-align:center; font-size:11px; color:#888; margin-top:14px;">globall-cloud.pages.dev/track</p>
    </div>`;
  new QRCode(document.getElementById('printQrCode'), { text: s.id, width:120, height:120, correctLevel: QRCode.CorrectLevel.M });
  setTimeout(()=>window.print(), 250);
}

/* ================= VERIFIED QUOTE ESTIMATOR =================
   The public calculator reads the active, staff-managed pricing catalog from
   public-quote?catalog=1. It never invents a number for an unconfigured route
   or product; customers are directed to the request/WhatsApp path instead. */
let quoteCatalogState = { rates: [], loaded: false, loading: null };
const quoteOriginKey = (value) => ({ china:'China', uae:'UAE', usa:'USA' }[value] || value);
const quoteOriginLabels = { china:'چین', uae:'دوبەی / ئیمارات', usa:'ئەمریکا' };
const quoteDestLabels = { hawler:'هەولێر', slimani:'سلێمانی', duhok:'دهۆک', bakhdad:'بەغدا', kerkuk:'کەرکووک', mosul:'موسڵ', basra:'بەسرە' };
const quoteModeLabels = { air:'ئاسمانی', sea:'دەریایی', land:'وشکانی / زمینی' };

async function loadQuoteCatalog(){
  if(quoteCatalogState.loaded) return quoteCatalogState.rates;
  if(quoteCatalogState.loading) return quoteCatalogState.loading;
  quoteCatalogState.loading = (async()=>{
    const response = await fetch(`${SUPABASE_URL}/functions/v1/public-quote?catalog=1`, { method:'GET', headers:{Accept:'application/json', apikey:SUPABASE_PUBLISHABLE_KEY}, cache:'no-store' });
    const body = await response.json().catch(()=>({}));
    if(!response.ok || !Array.isArray(body.rates)) throw new Error(body.error || 'Verified pricing is unavailable');
    quoteCatalogState.rates = body.rates.filter(row => row && row.is_active !== false);
    quoteCatalogState.loaded = true;
    syncQuoteForm();
    return quoteCatalogState.rates;
  })().finally(()=>{ quoteCatalogState.loading = null; });
  return quoteCatalogState.loading;
}

function quoteRatesForForm(){
  const origin = quoteOriginKey(document.getElementById('quoteOrigin')?.value || 'china');
  const mode = document.getElementById('quoteType')?.value || 'air';
  const destination = String(document.getElementById('quoteDest')?.value || 'hawler').toLowerCase();
  return quoteCatalogState.rates.filter(rate => String(rate.origin_key||'').toLowerCase() === origin.toLowerCase() && String(rate.transport_mode||'').toLowerCase() === mode && String(rate.destination_key||'').toLowerCase() === (destination === 'hawler' ? 'erbil' : destination));
}

function syncQuoteForm(){
  const mode = document.getElementById('quoteType')?.value || 'air';
  const productEl = document.getElementById('quoteProduct');
  const weightLabel = document.getElementById('quoteWeightLabel');
  const weightHint = document.getElementById('quoteWeightHint');
  const volumeRow = document.getElementById('quoteVolumeRow');
  const weightEl = document.getElementById('quoteWeight');
  if(!productEl) return;
  const rows = quoteRatesForForm();
  const previous = productEl.value;
  productEl.innerHTML = rows.length ? rows.map(rate => `<option value="${escapeHtml(rate.product_type)}">${escapeHtml(rate.product_type)} · $${Number(rate.amount).toLocaleString('en-US',{maximumFractionDigits:2})}/${escapeHtml(rate.unit)}</option>`).join('') : `<option value="">${currentLang === 'ku' ? 'نرخی پشتڕاستکراو بۆ ئەم ڕێگایە نییە' : 'No verified rate for this route'}</option>`;
  if(rows.some(row => row.product_type === previous)) productEl.value = previous;
  const sea = mode === 'sea';
  if(volumeRow) volumeRow.style.display = sea ? '' : 'none';
  if(weightEl) weightEl.required = !sea;
  if(weightLabel) weightLabel.textContent = sea ? 'کێشی کاڵا (kg)' : 'کێش (kg)';
  if(weightHint) weightHint.textContent = sea ? 'بۆ زانیاری؛ بڕی نرخ بە CBM ـە.' : '0.1–50,000 kg';
  const hint = document.getElementById('quoteProductHint');
  if(hint) hint.textContent = rows.length ? (currentLang === 'ku' ? 'نرخەکان لە catalog ـی چالاکی سیستەمەوە دێن.' : 'Rates are loaded from the active system catalog.') : (currentLang === 'ku' ? 'بۆ نرخی ئەم ڕێگا/جۆرە تکایە داواکاری بنێرە.' : 'Request a quote for this route or product.');
}

function quoteUnavailableHTML(origin, dest, mode){
  return `<div class="quote-result-card quote-result-card--notice"><div class="quote-route">${escapeHtml(quoteOriginLabels[origin] || origin)} → ${escapeHtml(quoteDestLabels[dest] || dest)} · ${escapeHtml(quoteModeLabels[mode] || mode)}</div><div class="quote-price">${currentLang === 'ku' ? 'نرخ بەردەست نییە' : 'Quote required'}</div><div class="hint">${currentLang === 'ku' ? 'نرخی پشتڕاستکراو بۆ ئەم route/product ـە لە catalog ـدا نییە. داواکارییەکە بنێرە یان لە WhatsApp پەیوەندی بکە.' : 'There is no verified catalog rate for this route/product. Send a quote request or contact WhatsApp.'}</div><div class="quote-result-actions"><button class="btn btn-primary" data-gc-onclick="route('request')">${t('services.quote.cta')}</button><a class="btn btn-outline" href="https://wa.me/message/4P6O3FXDR4HUA1" target="_blank" rel="noopener">WhatsApp</a></div></div>`;
}

async function calcQuote(){
  const origin = document.getElementById('quoteOrigin')?.value || 'china';
  const type = document.getElementById('quoteType')?.value || 'air';
  const product = document.getElementById('quoteProduct')?.value || '';
  const dest = document.getElementById('quoteDest')?.value || 'hawler';
  const weightEl = document.getElementById('quoteWeight');
  const volumeEl = document.getElementById('quoteVolume');
  const weight = Number(weightEl?.value);
  const volume = Number(volumeEl?.value);
  const resultEl = document.getElementById('quoteResult');
  const calcBtn = document.getElementById('quoteCalcBtn');
  if(calcBtn){ calcBtn.disabled = true; calcBtn.classList.add('is-loading'); calcBtn.setAttribute('aria-busy','true'); }
  if(resultEl) resultEl.innerHTML = `<p class="hint" style="margin-top:14px;">${currentLang === 'ku' ? 'نرخی پشتڕاستکراو لە سیستەمەوە وەردەگیرێت...' : 'Loading verified rates…'}</p>`;
  try{
    await loadQuoteCatalog();
    syncQuoteForm();
    const rows = quoteRatesForForm();
    const rate = rows.find(row => row.product_type === product) || rows[0];
    if(!rate){ if(resultEl) resultEl.innerHTML = quoteUnavailableHTML(origin,dest,type); return; }
    const units = type === 'sea' ? volume : weight;
    const max = type === 'sea' ? 100000 : 50000;
    if(!Number.isFinite(units) || units <= 0 || units > max){
      const field = type === 'sea' ? volumeEl : weightEl;
      if(field) field.focus();
      if(resultEl) resultEl.innerHTML = `<p class="admin-error" style="display:block; margin-top:12px;" role="alert">${type === 'sea' ? (currentLang === 'ku' ? 'تکایە حەجمی CBM ـی دروست بنووسە.' : 'Enter a valid CBM volume.') : t('services.quote.needWeight')}</p>`;
      return;
    }
    const total = Math.round(units * Number(rate.amount) * 100) / 100;
    const iqd = Math.round(total * getExchangeRate());
    const transit = rate.transit_min_days != null ? `${rate.transit_min_days}${rate.transit_max_days != null && rate.transit_max_days !== rate.transit_min_days ? `–${rate.transit_max_days}` : ''} ${currentLang === 'ku' ? 'ڕۆژ' : 'days'}` : '';
    if(resultEl) resultEl.innerHTML = `<div class="quote-result-card"><div class="quote-route">${escapeHtml(quoteOriginLabels[origin] || origin)} → ${escapeHtml(quoteDestLabels[dest] || dest)} · ${escapeHtml(rate.product_type)}</div><div class="quote-price">$${total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div><div class="hint">≈ ${iqd.toLocaleString()} د.ع · ${units.toLocaleString('en-US',{maximumFractionDigits:4})} ${escapeHtml(rate.unit)} × $${Number(rate.amount).toLocaleString('en-US',{maximumFractionDigits:2})}</div>${transit ? `<div class="hint">${currentLang === 'ku' ? 'ماوەی خەملێنراو' : 'Estimated transit'}: ${escapeHtml(transit)}</div>` : ''}<div class="quote-result-actions"><button class="btn btn-primary" data-gc-onclick="route('request')">${t('services.quote.cta')}</button><button class="btn btn-outline" data-gc-onclick="route('track')">${currentLang === 'ku' ? 'شوێنکەوتنی بار' : 'Track shipment'}</button></div></div>`;
  }catch(error){
    if(resultEl) resultEl.innerHTML = `<div class="quote-result-card quote-result-card--notice"><div class="quote-price">${currentLang === 'ku' ? 'نرخی کاتیی بەردەست نییە' : 'Verified rate unavailable'}</div><div class="hint">${currentLang === 'ku' ? 'سیستەمی نرخەکان ئێستا وەڵام ناداتەوە؛ داواکاری نرخ بنێرە بۆ پێداچوونەوەی ستاف.' : 'The rate catalog is temporarily unavailable; send a quote request for staff review.'}</div><div class="quote-result-actions"><button class="btn btn-primary" data-gc-onclick="route('request')">${t('services.quote.cta')}</button></div></div>`;
  }finally{
    if(calcBtn){ calcBtn.disabled = false; calcBtn.classList.remove('is-loading'); calcBtn.removeAttribute('aria-busy'); }
  }
}

function initQuotePricingUI(){
  const origin = document.getElementById('quoteOrigin');
  const type = document.getElementById('quoteType');
  const dest = document.getElementById('quoteDest');
  if(!origin || !type || !dest || origin.dataset.gcQuoteWired === '1') return;
  origin.dataset.gcQuoteWired = '1';
  [origin,type,dest].forEach(el => el.addEventListener('change', ()=>{ syncQuoteForm(); const result=document.getElementById('quoteResult'); if(result) result.innerHTML=''; }));
  syncQuoteForm();
  loadQuoteCatalog().catch(()=>syncQuoteForm());
}

let batchLookupTimer = null;
function lookupBatchCode(code, resultElId){
  clearTimeout(batchLookupTimer);
  const el = document.getElementById(resultElId);
  const val = (code||'').trim();
  if(!val){ el.textContent = ''; return; }
  el.textContent = 'گەڕان...';
  batchLookupTimer = setTimeout(async ()=>{
    const {data, error} = await sb.from('customer_directory').select('id,name,phone,city').ilike('code', val).limit(1);
    if(error || !data || data.length===0){
      el.innerHTML = `<span style="color:var(--amber-l);">⚠ ئەم کۆدە لە کۆگای موشتەریان نەدۆزرایەوە</span>`;
      return;
    }
    const c = data[0];
    el.innerHTML = `<span style="color:var(--mint);">✓ ${escapeHtml(c.name||'—')} · ${escapeHtml(c.phone||'')} ${c.city?'· '+escapeHtml(c.city):''}</span>`;
  }, 400);
}

async function editBatchCode(shipmentId){
  const s = await getShipmentForStaff(shipmentId);
  if(!s) return;
  const val = window.prompt('کۆدی کڕیار لە کۆگا (GC-XXX):', s.batchCode || '');
  if(val === null) return;
  s.batchCode = val.trim() || null;
  const {error} = await saveShipment(s);
  if(error){ showToast('هەڵەیەک ڕوویدا.', 'error'); return; }
  logActivity('update_batch_code', shipmentId, s.batchCode||'(لابرا)');
  const idx = currentShipmentsCache.findIndex(x=>x.id===shipmentId);
  if(idx>-1) currentShipmentsCache[idx] = s;
  showToast('کۆدی کڕیار نوێکرایەوە.', 'success');
  renderAdminShipmentList();
}

async function submitWarehouseReceipt(){
  const batchCode = document.getElementById('whBatchCode').value.trim();
  const location = document.getElementById('whLocation').value;
  const notes = document.getElementById('whNotes').value.trim();
  const files = Array.from(document.getElementById('whPhotos').files || []);
  const msgEl = document.getElementById('whMsg');
  msgEl.style.display = 'none';
  if(!batchCode){ msgEl.textContent = 'تکایە کۆدی کڕیار بنووسە.'; msgEl.style.display = 'block'; return; }

  const {data: dirMatch} = await sb.from('customer_directory').select('id,name,phone').ilike('code', batchCode).limit(1);
  const directoryCustomerId = dirMatch && dirMatch[0] ? dirMatch[0].id : null;
  const directoryPhone = dirMatch && dirMatch[0] ? dirMatch[0].phone : null;
  if(!directoryCustomerId && !window.confirm('ئەم کۆدە لە کۆگای موشتەریان نەدۆزرایەوە. دەتەوێت بەبێ بەستنەوە بە کڕیارێک تۆماری بکەیت؟')){
    return;
  }

  const { data: userData } = await sb.auth.getUser();
  const uid = userData?.user?.id;
  const {data: inserted, error: insErr} = await sb.from('warehouse_receipts')
    .insert({batch_code: batchCode, location, notes: notes||null, created_by: uid||null, created_by_name: currentStaffName, directory_customer_id: directoryCustomerId, directory_phone: directoryPhone||null})
    .select('id').single();
  if(insErr){ msgEl.textContent = 'هەڵەیەک ڕوویدا، تۆمار نەکرا.'; msgEl.style.display = 'block'; return; }

  let photoUrls = [];
  for(let i=0; i<files.length; i++){
    const file = files[i];
    if(!file.type.startsWith('image/')) continue;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${inserted.id}/${Date.now()}-${i}.${ext}`;
    const {error: upErr} = await sb.storage.from('warehouse-receipts').upload(path, file, {upsert:true});
    if(upErr) continue;
    const {data: pub} = sb.storage.from('warehouse-receipts').getPublicUrl(path);
    photoUrls.push(pub.publicUrl);
  }
  if(photoUrls.length){
    await sb.from('warehouse_receipts').update({photos: photoUrls}).eq('id', inserted.id);
  }

  logActivity('warehouse_receipt', batchCode, location+(photoUrls.length?' — '+photoUrls.length+' وێنە':''));
  showToast('وەرگرتنی باچ تۆمارکرا.', 'success');
  document.getElementById('whBatchCode').value = '';
  document.getElementById('whNotes').value = '';
  document.getElementById('whPhotos').value = '';
  loadWarehouseReceipts();

  // Optional: notify the customer via WhatsApp that their goods arrived at
  // the warehouse (uses shipmentEvents/whatsapp-messenger.js — opens a
  // prefilled wa.me link, staff taps Send; nothing is sent silently).
  if(directoryPhone && window.shipmentEvents && window.confirm('ئایا دەتەوێت پەیامی واتساپ بنێریت بۆ کڕیار کە بارەکەی گەیشتووەتە کۆگا؟')){
    await window.shipmentEvents.notifyWarehouseReceived(inserted.id);
  }
}

async function loadWarehouseReceipts(){
  const wrap = document.getElementById('warehouseListWrap');
  const {data, error} = await sb.from('warehouse_receipts').select('*').order('received_at', {ascending:false}).limit(50);
  if(error){ wrap.innerHTML = '<p class="hint">هەڵەیەک ڕوویدا لە هێنانی تۆمارەکان.</p>'; return; }
  if(!data || data.length===0){ wrap.innerHTML = `<div class="admin-empty"><svg><use href="#i-box"></use></svg><p>هێشتا هیچ تۆمارێک نییە.</p></div>`; return; }
  wrap.innerHTML = data.map(r => `
    <div class="admin-row" style="align-items:flex-start;">
      <div class="admin-row-main">
        <div class="admin-row-top"><b class="mono">📦 ${escapeHtml(r.batch_code)}</b><span class="hint">${r.location==='Dubai'?'عەنبەری دوبەی':r.location==='China'?'عەنبەری چین':'عەنبەری هەولێر'}</span></div>
        ${r.notes ? `<span>${escapeHtml(r.notes)}</span>` : ''}
        ${(r.photos||[]).length ? `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">${r.photos.map(url=>
          `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="وێنەی وەرگرتن" style="width:64px; height:64px; object-fit:cover; border-radius:10px; border:1px solid var(--line-soft);"></a>`
        ).join('')}</div>` : ''}
        <span class="hint" style="text-align:start; margin-top:4px;">${escapeHtml(r.created_by_name||'ستاف')} · ${timeAgoKu(r.received_at)}</span>
      </div>
      <button class="btn btn-ghost btn-icon" data-gc-onclick="deleteWarehouseReceipt(${r.id})" aria-label="سڕینەوە" title="سڕینەوە"><svg class="icon-sm"><use href="#i-trash"></use></svg></button>
    </div>`).join('');
}

async function deleteWarehouseReceipt(id){
  if(!confirm('دڵنیایت لە سڕینەوەی ئەم تۆمارە؟')) return;
  const {error} = await sb.from('warehouse_receipts').delete().eq('id', id);
  if(error){ showToast('هەڵەیەک ڕوویدا.', 'error'); return; }
  logActivity('delete_warehouse_receipt', String(id), null);
  showToast('تۆمار سڕایەوە.', 'success');
  loadWarehouseReceipts();
}

async function doDeleteCustomer(){
  if(!pendingDeleteCustomerId) return;
  const {error} = await sb.rpc('admin_delete_customer', {target_id: pendingDeleteCustomerId});
  document.getElementById('deleteCustomerModal').style.display = 'none';
  if(!error) logActivity('delete_customer', pendingDeleteCustomerId, null);
  pendingDeleteCustomerId = null;
  if(error){ showToast('هەڵەیەک ڕوویدا لە سڕینەوەدا.', 'error'); return; }
  showToast('کڕیارەکە سڕایەوە.', 'success');
  await loadCustomersList();
}

function toggleNewShipmentForm(){
  const wrap = document.getElementById('newShipmentFormWrap');
  wrap.style.display = wrap.style.display==='none' ? 'block' : 'none';
}

async function submitNewShipment(){
  const name = document.getElementById('newShipName').value.trim();
  const phone = document.getElementById('newShipPhone').value.trim();
  const weight = Number(document.getElementById('newShipWeight').value);
  const msgEl = document.getElementById('newShipmentMsg');
  if(!name || !phone || !weight){
    msgEl.textContent = 'تکایە هەموو خانە پێویستەکان پڕ بکەرەوە.';
    msgEl.style.display = 'block';
    return;
  }
  const newShipment = {
    id: await generateUniqueTrackingId(),
    originKey: document.getElementById('newShipOrigin').value,
    destKey: document.getElementById('newShipDest').value,
    type: document.getElementById('newShipType').value,
    weightKg: weight,
    volumeCbm: 0,
    itemsCount: 1,
    totalAmount: Number(document.getElementById('newShipTotal').value) || 0,
    paidAmount: Number(document.getElementById('newShipPaid').value) || 0,
    currentStepIndex: 0,
    stepDates: {placed: new Date().toISOString()},
    batchCode: document.getElementById('newShipBatch').value.trim() || null,
    requester: {name, phone, email:'', notes:''},
    directoryCustomerId: await lookupDirectoryCustomerId(phone)
  };
  const {error} = await saveShipment(newShipment);
  if(error){
    msgEl.textContent = 'هەڵەیەک ڕوویدا، بارکردنەکە پاشەکەوت نەکرا.';
    msgEl.style.display = 'block';
    return;
  }
  logActivity('create_shipment', newShipment.id, name+' — $'+newShipment.totalAmount);
  showToast('بارکردنی نوێ زیادکرا.', 'success');
  toggleNewShipmentForm();
  const shipments = await getAllShipments();
  currentShipmentsCache = shipments;
  document.getElementById('adminContent').innerHTML = renderAdminMainHTML(shipments);
  setTimeout(()=>initAdminCharts(shipments), 0);
}

function financeRowsHTML(shipments){
  const listTitle = `<div class="admin-section-title"><svg><use href="#i-card"></use></svg><span>دارایی بارەکان</span></div>
  <div class="admin-row" style="margin-bottom:16px; background:var(--surface-2);">
    <div class="admin-row-main"><b>نرخی دراوی دۆلار بۆ دینار</b><span class="hint">ئێستا: 1 USD = ${getExchangeRate().toLocaleString()} IQD — rate ـەکە لە Supabase ـدا هاوبەشە و بۆ هەموو staff یکسانە</span></div>
    <div style="display:flex; gap:8px; align-items:center;">
      <input class="field" type="number" id="exchangeRateInput" value="${getExchangeRate()}" style="max-width:120px;" placeholder="1500">
      <button class="btn btn-outline" style="padding:10px 16px;" data-gc-onclick="saveExchangeRate()">نوێکردنەوە</button>
    </div>
  </div>`;
  if(shipments.length===0) return listTitle + `<div class="admin-empty"><svg><use href="#i-card"></use></svg><p>هێشتا هیچ بارکردنێک تۆمار نەکراوە.</p></div>`;
  const rows = '<div class="admin-list">' + shipments.map(s=>{
    const remaining = (Number(s.totalAmount)||0) - (Number(s.paidAmount)||0);
    return `
    <div class="admin-row">
      <div class="admin-row-main">
        <b class="mono">${s.id}</b>
        <span>${escapeHtml(s.requester?.name||'—')}</span>
        <span class="admin-fin-remaining">ماوە: ${fmtUSD(remaining)}</span>
      </div>
      <div class="admin-fin-inputs">
        <div class="admin-fin-field"><label>کۆی گشتی ($)</label><input class="field" type="number" id="tot-${s.id}" value="${s.totalAmount||0}" style="max-width:110px;"></div>
        <div class="admin-fin-field"><label>پارەدراو ($)</label><input class="field" type="number" id="paid-${s.id}" value="${s.paidAmount||0}" style="max-width:110px;"></div>
        <button class="btn btn-outline" style="padding:10px 16px;" data-gc-onclick="updateShipmentFinance('${s.id}')">پاشەکەوتکردن</button>
      </div>
    </div>`;
  }).join('') + '</div>';
  return listTitle + rows;
}

function renderAdminOpsHTML(shipments){
  const total = shipments.length;
  const delivered = shipments.filter(s=>statusGroupForStep(s.currentStepIndex)==='delivered').length;
  const transit = shipments.filter(s=>statusGroupForStep(s.currentStepIndex)==='transit').length;
  const pending = shipments.filter(s=>statusGroupForStep(s.currentStepIndex)==='pending').length;
  const totalWeight = shipments.reduce((sum,s)=>sum+(Number(s.weightKg)||0),0);
  const weekAgo = Date.now() - 7*86400000;
  const thisWeek = shipments.filter(s=>{
    const placed = s.stepDates?.placed;
    return placed && new Date(placed).getTime() >= weekAgo;
  }).length;

  /* ---- Overdue alerts: unpaid balances and delayed shipments ---- */
  const now = Date.now();
  const overduePayments = shipments.filter(s => (Number(s.totalAmount||0) - Number(s.paidAmount||0)) > 0
    && s.createdAt && (now - new Date(s.createdAt).getTime()) > 14*86400000);
  const delayedShipments = shipments.filter(s => statusGroupForStep(s.currentStepIndex) !== 'delivered'
    && s.createdAt && (now - new Date(s.createdAt).getTime()) > 10*86400000);
  let alertsHTML = '';
  if(overduePayments.length || delayedShipments.length){
    alertsHTML = `<div class="admin-section-title" style="color:var(--amber-l);"><svg><use href="#i-clock"></use></svg><span>ئاگاداری — پێویستی چاودێری هەیە</span></div>
    <div class="admin-list" style="margin-bottom:18px;">
      ${overduePayments.slice(0,5).map(s=>`
        <div class="admin-row">
          <div class="admin-row-main"><b>پارەی دواکەوتوو — ${escapeHtml(s.id)}</b><span>${escapeHtml(s.requester?.name||'—')} · ماوە: ${fmtUSD(Number(s.totalAmount||0)-Number(s.paidAmount||0))}</span></div>
          <span class="hint">${new Date(s.createdAt).toLocaleDateString('en-GB')}</span>
        </div>`).join('')}
      ${delayedShipments.slice(0,5).map(s=>`
        <div class="admin-row">
          <div class="admin-row-main"><b>دواکەوتوو لە گەیاندن — ${escapeHtml(s.id)}</b><span>${escapeHtml(s.requester?.name||'—')} · ${STEP_LABELS_KU[s.currentStepIndex]}</span></div>
          <span class="hint">${new Date(s.createdAt).toLocaleDateString('en-GB')}</span>
        </div>`).join('')}
    </div>`;
  }

  /* ---- Global search across shipments, directory customers, and messages ---- */
  const globalSearchHTML = `<div class="form-row" style="max-width:420px; margin-bottom:18px;">
    <div class="field-icon-wrap">
      <svg class="icon-sm field-icon"><use href="#i-search"></use></svg>
      <input class="field" type="text" id="globalSearchInput" placeholder="گەڕانی گشتی: ناو، مۆبایل، ژمارەی شوێنکەوتن..." data-gc-oninput="runGlobalSearch(this.value)">
    </div>
    <div id="globalSearchResults"></div>
  </div>`;

  /* ---- Analytics charts: revenue trend + top routes ---- */
  const analyticsHTML = `<div class="admin-section-title"><svg><use href="#i-card"></use></svg><span>ئامار</span></div>
  <div class="admin-charts-grid">
    <div class="admin-chart-card"><b>داهاتی مانگانە</b><canvas id="chartRevenue" height="180"></canvas></div>
    <div class="admin-chart-card"><b>باشترین ڕووتەکان</b><canvas id="chartRoutes" height="180"></canvas></div>
  </div>`;

  const stats = `<div class="admin-stats">
    <div class="admin-stat-card" style="--accent-c:var(--teal);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-box"></use></svg><b>${total}</b><span>کۆی گشتی بار</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--amber-l);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-clock"></use></svg><b>${pending}</b><span>چاوەڕوان</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--teal-l);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-route"></use></svg><b>${transit}</b><span>لە ڕێگادا</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--mint);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-check"></use></svg><b>${delivered}</b><span>گەیشتوو</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--teal);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-box"></use></svg><b>${totalWeight.toLocaleString()}</b><span>کۆی کێش (kg)</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--amber-l);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-clock"></use></svg><b>${thisWeek}</b><span>ئەم هەفتەیە</span></div>
  </div>`;

  const routePanel = `<div class="admin-panel">
    <div class="admin-section-title"><svg><use href="#i-pin"></use></svg><span>زۆرترین ڕووتەکان</span></div>
    ${routeBreakdownHTML(shipments)}
  </div>`;

  const msgPanel = `<div class="admin-panel">
    <div class="admin-section-title"><svg><use href="#i-chat"></use></svg><span>نوێترین پەیامەکان</span></div>
    ${messagesPanelHTML(currentMessagesCache)}
  </div>`;

  const toolbar = `<div class="admin-toolbar">
    <div class="admin-tabs">
      <button class="admin-tab active" data-status="all" data-gc-onclick="setAdminFilter('all')">هەموو</button>
      <button class="admin-tab" data-status="pending" data-gc-onclick="setAdminFilter('pending')">چاوەڕوان</button>
      <button class="admin-tab" data-status="transit" data-gc-onclick="setAdminFilter('transit')">لە ڕێگادا</button>
      <button class="admin-tab" data-status="delivered" data-gc-onclick="setAdminFilter('delivered')">گەیشتوو</button>
    </div>
    <div class="admin-search"><input class="field" placeholder="گەڕان بە ID، ناو، مۆبایل..." data-gc-oninput="setAdminSearch(this.value)"></div>
  </div>`;

  const listTitle = `<div class="admin-section-title"><svg><use href="#i-box"></use></svg><span>هەموو بارەکان</span></div>`;

  adminFilterStatus = 'all';
  adminSearchQuery = '';

  return stats + alertsHTML + globalSearchHTML + analyticsHTML + routePanel + msgPanel + listTitle + toolbar + `<div id="adminShipmentListWrap"></div>`;
}

function renderAccountantOpsHTML(shipments){
  const totalRevenue = shipments.reduce((sum,s)=>sum+(Number(s.totalAmount)||0),0);
  const totalPaid = shipments.reduce((sum,s)=>sum+(Number(s.paidAmount)||0),0);
  const outstanding = totalRevenue - totalPaid;

  const stats = `<div class="admin-stats">
    <div class="admin-stat-card" style="--accent-c:var(--teal);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-box"></use></svg><b>${shipments.length}</b><span>کۆی گشتی بار</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--teal-l);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-card"></use></svg><b class="fin-stat-total">${totalRevenue.toLocaleString()}</b><span>کۆی گشتی ($)</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--mint);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-check"></use></svg><b class="fin-stat-paid">${totalPaid.toLocaleString()}</b><span>پارەدراو ($)</span></div>
    <div class="admin-stat-card" style="--accent-c:var(--amber-l);"><svg class="icon-sm" style="color:var(--accent-c); margin-bottom:6px;"><use href="#i-card"></use></svg><b class="fin-stat-outstanding">${outstanding.toLocaleString()}</b><span>ماوە ($)</span></div>
  </div>`;

  return stats + financeRowsHTML(shipments);
}

async function updateShipmentStep(id, stepIndex){
  const s = await getShipmentForStaff(id);
  if(!s) return;
  s.currentStepIndex = stepIndex;
  s.stepDates = s.stepDates || {};
  if(!s.stepDates[STEP_KEYS[stepIndex]]) s.stepDates[STEP_KEYS[stepIndex]] = new Date().toISOString();
  const {error} = await saveShipment(s);
  if(error){ showToast('هەڵەیەک ڕوویدا، دۆخی بار پاشەکەوت نەکرا.', 'error'); return; }
  logActivity('update_status', id, 'status → '+(STEP_LABELS_KU[stepIndex]||stepIndex));
  const idx = currentShipmentsCache.findIndex(x=>x.id===id);
  if(idx>-1) currentShipmentsCache[idx] = s;
  showToast('دۆخی بار نوێکرایەوە.', 'success');
  renderAdminShipmentList();
}

/* ================= WHATSAPP STATUS UPDATE =================
   There's no automatic/silent WhatsApp send here — that needs Meta's paid
   WhatsApp Business Cloud API (business verification + approved message
   templates), which this project doesn't have configured. This instead opens
   a wa.me link with the update message pre-filled, so staff just tap Send. */
function toWhatsAppDigits(phone){
  if(!phone) return null;
  let d = String(phone).replace(/[^\d]/g,'');
  if(!d) return null;
  if(d.startsWith('00')) d = d.slice(2);
  if(d.startsWith('0')) d = '964'+d.slice(1);
  else if(!d.startsWith('964')) d = '964'+d;
  return d;
}
/* Maps the shipment's current step to one of whatsapp-messenger.js's
   pre-written templates, so the message staff sends actually matches what
   happened (order placed vs warehouse arrival vs in-transit vs customs vs
   out-for-delivery vs delivered) instead of one generic line. Index must
   match STEP_ORDER above: ['placed','pickedUp','transit','customs',
   'outForDelivery','delivered'] — 'placed' is the customer's request just
   being submitted (nothing physically received yet), which is
   orderConfirmation, NOT warehouseReceived; 'pickedUp' is the real
   warehouse-arrival step. Falls back to the old plain message if
   whatsapp-messenger.js didn't load. */
const STEP_TO_WA_TEMPLATE = ['orderConfirmation','warehouseReceived','inTransit','customsClearance','outForDelivery','delivered'];
/* Builds a real, clickable tracking URL a customer can open from outside
   the app (e.g. from a WhatsApp message) — see the ?track= handling in
   init(). goTrack()/doTrackSearch() alone only work as in-app JS calls. */
function getTrackingShareLink(id){
  return location.origin + location.pathname + '?track=' + encodeURIComponent(id) + '#track';
}
async function sendWhatsAppUpdate(id){
  const s = await getShipmentForStaff(id);
  if(!s){ showToast('بار نەدۆزرایەوە.', 'error'); return; }
  const phone = s.requester?.phone;
  if(!toWhatsAppDigits(phone)){ showToast('ژمارەی مۆبایلی کڕیار تۆمار نەکراوە.', 'error'); return; }
  const statusLabel = STEP_LABELS_KU[s.currentStepIndex] || '';

  if(window.whatsappMessenger){
    const templateName = STEP_TO_WA_TEMPLATE[s.currentStepIndex] || 'inTransit';
    const vars = {
      name: s.requester?.name || '', orderId: s.id, status: statusLabel,
      origin: placeLabel(s.originKey), destination: placeLabel(s.destKey),
      eta: s.eta ? formatDate(s.eta) : '—', location: placeLabel(s.originKey),
      timestamp: new Date().toLocaleString(currentLang==='ku'?'ar':'en'),
      // orderConfirmation-only fields (real data — see rowToShipment()):
      weight: s.weightKg || '', type: s.type ? (s.type[0].toUpperCase()+s.type.slice(1)) : '',
      cost: s.totalAmount || '', trackingLink: getTrackingShareLink(s.id),
      // No address field exists anywhere in this project's data model (see
      // requester={name,phone,email,notes} in rowToShipment()) — `notes` is
      // a free-text "additional notes" box on the request form, not an
      // address, so it must not be relabeled as one here. Left unset on
      // purpose: outForDelivery's template falls back to its own '-'
      // rather than showing the customer their own note mislabeled
      // "🏠 Address:".
    };
    const sent = window.whatsappMessenger.sendMessage(phone, templateName, vars);
    if(sent) return;
  }
  // Fallback (no whatsapp-messenger.js, or unknown template)
  const name = s.requester?.name ? ('سڵاو '+s.requester.name+'، ') : 'سڵاو، ';
  const msg = name+'دۆخی بارەکەت ('+s.id+') نوێکرایەوە بۆ: '+statusLabel+'. — Globall Cloud';
  window.open('https://wa.me/'+toWhatsAppDigits(phone)+'?text='+encodeURIComponent(msg), '_blank');
}

async function updateShipmentFinance(id){
  const s = await getShipmentForStaff(id);
  if(!s) return;
  s.totalAmount = Number(document.getElementById('tot-'+id).value) || 0;
  s.paidAmount = Number(document.getElementById('paid-'+id).value) || 0;
  const {error} = await saveShipment(s);
  if(error){ showToast('هەڵەیەک ڕوویدا، دارایی پاشەکەوت نەکرا.', 'error'); return; }
  logActivity('update_finance', id, 'total=$'+s.totalAmount+' paid=$'+s.paidAmount);
  const idx = currentShipmentsCache.findIndex(x=>x.id===id);
  if(idx>-1) currentShipmentsCache[idx] = s;
  showToast('گۆڕانکارییەکانی دارایی پاشەکەوت کران.', 'success');
  const row = document.getElementById('tot-'+id)?.closest('.admin-row');
  const remainEl = row?.querySelector('.admin-fin-remaining');
  if(remainEl) remainEl.innerHTML = `ماوە: ${fmtUSD(s.totalAmount - s.paidAmount)}`;
  updateFinanceStatsUI();
}
/* Recomputes the summary cards at the top of the finance tab from the live
   cache so they don't go stale right after an edit. Safe no-op if the
   elements aren't on screen (e.g. viewing a different admin tab). */
function updateFinanceStatsUI(){
  const totalEls = document.querySelectorAll('.fin-stat-total');
  if(totalEls.length===0) return;
  const total = currentShipmentsCache.reduce((sum,s)=>sum+(Number(s.totalAmount)||0),0);
  const paid = currentShipmentsCache.reduce((sum,s)=>sum+(Number(s.paidAmount)||0),0);
  totalEls.forEach(el=>el.textContent = total.toLocaleString());
  document.querySelectorAll('.fin-stat-paid').forEach(el=>el.textContent = paid.toLocaleString());
  document.querySelectorAll('.fin-stat-outstanding').forEach(el=>el.textContent = (total-paid).toLocaleString());
}
/* Staff-side full read (bypasses the public RPC's limited columns; relies on the
   "staff full access" RLS policy, so this only actually returns data when signed in as staff) */
async function getShipmentForStaff(id){
  if(!sb) return null;
  const {data:{session}} = await sb.auth.getSession();
  if(!session) return null;
  const {data:staffRow} = await sb.from('staff').select('id,role,is_active').eq('id', session.user.id).maybeSingle();
  if(!staffRow || staffRow.is_active === false || !['admin','super_admin','accountant'].includes(staffRow.role)) return null;
  const {data} = await sb.from('shipments').select('*').eq('id', id).maybeSingle();
  return data ? rowToShipment(data) : null;
}

/* ================= SCROLL REVEAL ================= */
function setupReveal(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.querySelectorAll('.reveal').forEach(el=>el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{ if(entry.isIntersecting) entry.target.classList.add('in-view'); });
  }, {threshold:0.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}

/* ================= INIT ================= */
async function init(){
  const storedLang = await safeGet('lang', false);
  currentLang = storedLang || 'ku';
  document.documentElement.lang = currentLang==='ku' ? 'ckb' : 'en';
  document.documentElement.dir = currentLang==='ku' ? 'rtl' : 'ltr';
  setThemeIcon();

  await loadExchangeRate();
  initQuotePricingUI();
  await initShipments();
  applyI18n();
  await updateNavAuthState();
  setupReveal();
  const initialRoute = location.hash.replace('#','');
  // Supports a real, clickable tracking link from outside the app (e.g. a
  // WhatsApp message): ?track=<ID>#track. Without this, goTrack(prefill)
  // only works as an in-app JS call — there was no URL a customer could
  // actually tap from their phone that would land pre-filled on their
  // shipment. See getTrackingShareLink() near sendWhatsAppUpdate().
  const trackParam = new URLSearchParams(location.search).get('track');
  route(trackParam ? 'track' : (VALID_ROUTES.includes(initialRoute) ? initialRoute : 'home'));
  if(trackParam){
    document.getElementById('trackInput').value = trackParam;
    doTrackSearch();
  }
}
window.addEventListener('hashchange', ()=>{
  const id = location.hash.replace('#','');
  route(VALID_ROUTES.includes(id) ? id : 'home');
});
init();
