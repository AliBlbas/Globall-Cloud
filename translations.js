// Globall Cloud — UI translations (ku / ar / en). Extracted from index.html
// so it can be edited without touching page logic.
const I18N = {
ku:{
  brand:{tagline:'لۆجستیک'},
  topbar:{note:'سەرەکییەکانی چین، دوبەی و هەولێر بەبەردەوامی چالاکن',support:'پشتیوانی زیندوو ٢٤/٧'},
  nav:{home:'سەرەکی',about:'دەربارەمان',services:'خزمەتگوزارییەکان',track:'شوێنکەوتن',contact:'پەیوەندی',signIn:'چوونەژوورەوە',dashboard:'داشبۆرد',quote:'داواکردنی نرخ'},
  hero:{eyebrow:'چین  ·  ئیمارات  ·  عێراق',title:'گەیاندنی بار بە متمانە، خێرایی و بێ سنوور',subtitle:'Globall Cloud بارت بە شێوەیەکی ئاسایشدار لە چین و ئیمارات بۆ هەموو شارەکانی عێراق دەگەیەنێت — بە شوێنکەوتنی ڕاستەوخۆ، ڕێکاری ڕوون و پشتیوانی ٢٤/٧.',ctaTrack:'شوێنکەوتنی بار',ctaQuote:'داواکردنی نرخ',route:{a:'گوانگژۆ، چین',b:'دوبەی، ئیمارات',c:'هەولێر، عێراق'},badge:'LIVE CORRIDOR',liveStatus:'Shipment moving right now',liveSub:'بارەکەت لە نێوان چین → دوبەی → هەولێر بەردەوامە و هەر نوێکارییەک زوو دەردەکەوێت.',routeOrigin:'سەرەتا / Origin Hub',routeTransit:'ترانزیت / Transit Hub',routeDestination:'گەیاندن / Delivery Hub'},
  trust:{s1v:'+٢٥K',s1l:'بار گەیەنراو',s2v:'١٢+',s2l:'شوێن و بازاڕ',s3v:'٢٤/٧',s3l:'پشتیوانی زیندوو',s4v:'٩٨%',s4l:'گەیاندنی لەکاتی خۆیدا'},
  liveTrack:{heading:'شوێنکەوتنی بارەکەت لە چرکەیەکدا',sub:'ژمارەی شوێنکەوتنەکەت بنووسە و نوێترین دۆخی بارەکەت ببینە',placeholder:'وەک GC10052341',button:'شوێنکەوتن'},
  business:{eyebrow:'پەڕەکانی بازرگانی',heading:'هەموو خزمەتگوزاری و پەڕە گرنگەکان لە یەک شوێن',sub:'بە یەک کلیک بچۆ بۆ خزمەتگوزاری، خەملاندنی نرخ، داشبۆرد، کۆگاکان و پەیوەندی.',
    items:{
      services:{title:'خزمەتگوزاری',desc:'گەیشتن بە Air، Sea، Land، گومرگ و Door-to-Door.',action:'بینینی خزمەتگوزاری',icon:'i-box',route:'services'},
      quote:{title:'نرخی بار',desc:'نرخی خێرا و خەمڵێنراو بزانە پێش داواکاری.',action:'خەملاندنی نرخ',icon:'i-card',route:'services'},
      dashboard:{title:'داشبۆردی کڕیار',desc:'بارەکان، ئاگادارییەکان و هەژمارەکانت بەڕێوەببە.',action:'کردنەوەی داشبۆرد',icon:'i-user',route:'portal'},
      track:{title:'شوێنکەوتن',desc:'ژمارەی شوێنکەوتن داخڵ بکە و دۆخی بار ببینە.',action:'شوێنکەوتن بکە',icon:'i-search',route:'track'},
      warehouses:{title:'کۆگاکان',desc:'هابەکانی چین، دوبەی و هەولێر لە یەک تۆڕدا.',action:'بینینی کۆگاکان',icon:'i-warehouse',route:'contact'},
      contact:{title:'پەیوەندی',desc:'واتساپ، ئیمەیل و ڕێکخستن لە کەمترین کاتدا.',action:'پەیوەندیمان پێوە بکە',icon:'i-chat',route:'contact'}
    }},
  dashboardPreview:{heading:'پێشبینی داشبۆردی کڕیار',sub:'کڕیاران دەتوانن لێرە بارەکان، نرخ و ئاگادارییەکان بە شێوەی خێرا بەڕێوەببەن.',stats:[{v:'4',l:'بارە چالاکەکان'},{v:'29',l:'گەیشتوو'},{v:'2',l:'چاوەڕوان'},{v:'8',l:'فاکتۆرەکان'}],btnPortal:'کردنەوەی پرۆتال',btnTrack:'شوێنکەوتن بکە'},
  warehouses:{eyebrow:'کۆگاکان',heading:'تۆڕی کۆگاکانمان',sub:'هابە سەرەکییەکان لە چین، دوبەی و هەولێر بۆ جوڵاندنی خێرای بار.',
    items:{
      guangzhou:{tag:'هاب سەرەکی چین',title:'کۆگای گوانگجو',address:'گوانگجو، چین',hours:'دووشەممە - شەممە',features:['کۆکردنەوەی بار','وێنەی QC','پاکەتکردنی خێرا']},
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
    quote:{eyebrow:'تەخمینی نرخ',heading:'حساباتی نرخی گەیاندن',type:'جۆری گەیاندن',air:'ئاسمانی (Air)',sea:'دەریایی (Sea)',land:'وشکانی (Land)',
      weight:'کێش (کیلۆگرام)',weightPh:'بۆ نموونە 50',dest:'شاری مەبەست لە عێراق',btn:'حسابکردنی تەخمین',
      needWeight:'تکایە کێشی بار بنووسە.',resultLabel:'تەخمینی نرخ',cta:'داواکردنی نرخی وردتر',
      note:'* ئەمە تەنها تەخمینێکی گشتییە — نرخی کۆتایی دوای پشکنینی وردی بار لەلایەن ستافمانەوە دیاری دەکرێت.'},
    items:{
      air:{title:'گەیاندنی ئاسمانی',desc:'خێراترین ڕێگا بۆ بارە پەلەیەکان.',features:['کاتی گەیشتن: ١-٣ ڕۆژ','گونجاو بۆ بارە بەنرخ و پەلەکان','شوێنکەوتنی ڕاستەوخۆ']},
      sea:{title:'گەیاندنی دەریایی',desc:'گونجاوترین تێچوون بۆ بارە قورس و گەورەکان.',features:['کاتی گەیشتن: ١٢-١٨ ڕۆژ','باشترین تێچوون بۆ بارە قورسەکان','گونجاو بۆ کۆنتەینەری تەواو یان بەشی کۆنتەینەر']},
      land:{title:'گەیاندنی وشکانی',desc:'گەیاندن بە رێگای وشکانی لە دوبەی بەرەو عێراق، بەڕێکەوتن بە سعودیە.',features:['کاتی گەیشتن: ٧-١٠ ڕۆژ','ڕێگا: دوبەی ← سعودیە ← عێراق (هەولێر)','گونجاو بۆ بارە مامناوەندەکان']},
      customs:{title:'ئاسانکاری گومرگی',desc:'کارگێڕی تەواوی مامەڵەی گومرگ لە بەندەرەکانی عێراق.',features:['کارگێڕی بەڵگەنامەکان','پارەدانی باج و تێچووەکان','ڕاوێژکاری یاسایی گومرگ']},
      warehouse:{title:'کۆگاداری',desc:'کۆگای پارێزراو و چاودێریکراو لە ئیمارات و عێراق.',features:['چاودێری ٢٤/٧','سیستەمی بەڕێوەبردنی کۆگا','بیمەی گونجاو بۆ کاڵاکان']},
      door:{title:'گەیاندن بۆ بەردەرگا',desc:'گەیاندنی کۆتایی بارەکەت ڕاستەوخۆ بۆ ماڵ یان کۆمپانیاکەت.',features:['گەیاندن بۆ هەموو شارەکانی عێراق','ڕێکخستنی کاتی گەیاندن','پشتڕاستکردنەوەی وەرگرتن']}
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
  about:{eyebrow:'دەربارەمان',heading:'دەربارەی Globall Cloud',sub:'هاوبەشی متمانەپێکراوت بۆ گەیاندنی بار لەنێوان چین، ئیمارات و عێراق.',
    missionTitle:'ئەرکمان',missionBody:'ئەرکی Globall Cloud گەیاندنی خزمەتگوزاری گەیاندنی بارە بە ستانداردی نێودەوڵەتی، بە شەفافیەت و متمانەوە، بۆ هەموو کڕیارێک لە هەرێمی کوردستان و عێراق.',
    visionTitle:'ئاواتمان',visionBody:'ئامانجمان ئەوەیە ببینە باشترین و متمانەپێکراوترین کۆمپانیای لۆجستیک لە هەرێم، بە بەکارهێنانی تەکنەلۆجیای نوێ و خزمەتگوزاریەکی کڕیار-ناوەندی.',
    valuesEyebrow:'بەهاکانمان',valuesHeading:'ئەوەی ڕێنماییمان دەکات',values:[
      {title:'ڕاستگۆیی',desc:'کارکردن بە ڕاستی و ڕوونی لەگەڵ هەموو کڕیارێک.',icon:'i-shield'},
      {title:'شەفافیەت',desc:'نرخ و پرۆسەکان ڕوون و بەبێ کێشەی شاراوە.',icon:'i-eye'},
      {title:'بەرپرسیارێتی',desc:'بەرپرسیارین لەسەر هەر بارێک تا گەیشتنی سەلامەت.',icon:'i-box'},
      {title:'ڕێزگرتن لە کڕیار',desc:'کاتی کڕیار و پێداویستیەکانی لە پێشینەن.',icon:'i-user'}
    ],
    storyTitle:'چیرۆکمان',storyBody:'Globall Cloud وەک هاوبەشێکی گەیاندنی بار دەستی کرد بۆ چارەسەرکردنی کێشەی گەیاندنی بار لەنێوان بازاڕەکانی چین و ئیمارات و شارەکانی عێراق. لە ڕێگەی کارامەیی و پابەندبوونمانەوە، بووینەتە هەڵبژاردەیەکی متمانەپێکراو بۆ کۆمپانیا و کەسانی زۆر کە پێویستیان بە گەیاندنی بارێکی ئارام و خێرایە. بەردەوامین لە پەرەپێدانی خزمەتگوزارییەکانمان بۆ باشترکردنی ئەزموونی هەر کڕیارێک.'},
  cta:{heading:'ئامادەیت بار بنێریت؟',sub:'ئەمڕۆ داواکاریەکەت بنێرە و لە کەمترین کات نرخێک وەربگرە.',b1:'داواکردنی نرخ',b2:'پەیوەندیمان پێوە بکە'},
  corridor:{eyebrow:'ڕێڕەوی کارەکە',heading:'لە چین بۆ دوبەی بۆ هەولێر',sub:'سێ هەنگاوی سەرەکی بە ڕوونی و بە شێوازی کۆمپانیایەکی نێودەوڵەتی ببینە.',badge:'ڕێڕەوی زیندوو',items:[
    {flag:'🇨🇳',title:'گەیاندن لە چین',meta:'Origin Hub',desc:'بارەکەت وەردەگیرێت، QC دەکرێت و بۆ ترانزیت ئامادە دەبێت.',tags:['QC','Packing','Pickup']},
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
  track:{heading:'شوێنکەوتنی بار',sub:'ژمارەی شوێنکەوتنی بارەکەت بنووسە بۆ زانینی دۆخی ئێستا',searchPh:'وەک GC10052341',searchBtn:'بگەڕێ',
    notFoundTitle:'هیچ بارێک نەدۆزرایەوە',notFoundBody:'تکایە ژمارەی شوێنکەوتن بپشکنە، یان داواکارییەکی نوێ تۆمار بکە.',requestInstead:'داواکاری نوێ بکە',
    detailsH:'زانیاری بارکردن',timelineH:'هێڵی کات',save:'زیادکردن بۆ بارەکانم',saved:'زیادکرا ✓',signInToSave:'چوونەژوورەوە بۆ هەڵگرتن',
    status:{pending:'چاوەڕوانە',transit:'لە ڕێگادایە',delivered:'گەیشت'},
    steps:{placed:'داواکاری تۆمارکرا',pickedUp:'وەرگیرا',transit:'لە ڕێگایە',customs:'گومرگ',outForDelivery:'بەرەو گەیاندن',delivered:'گەیشت'},
    type:{air:'گەیاندنی ئاسمانی',sea:'گەیاندنی دەریایی',land:'گەیاندنی وشکانی'},
    weight:'کێش',volume:'قەبارە',items:'ژمارەی کاڵا',total:'کۆی گشتی',paid:'دراوە',due:'ماوە',eta:'خەمڵێنراو:',pendingValue:'دوای پێداچوونەوە'},
  invoice:{downloadBtn:'دابەزاندنی وەسڵ (PDF)',generating:'خەریکی ئامادەکردنە...',title:'وەسڵی گەیاندن',trackingId:'ژمارەی شوێنکەوتن',dateIssued:'بەرواری دەرکردن',billTo:'کڕیار',route:'ڕێگا',serviceType:'جۆری خزمەتگوزاری',statusLabel:'دۆخ',thanks:'سوپاس بۆ باوەڕپێکردنتان بە Globall Cloud',failMsg:'دروستکردنی وەسڵ سەرکەوتوو نەبوو، تکایە دووبارە هەوڵبدەرەوە.'},
  request:{heading:'داواکردنی نرخ / بارکردنی نوێ',sub:'وردەکاری بارەکەت پڕبکەرەوە، ڕاستەوخۆ ژمارەی شوێنکەوتن وەردەگریت.',
    name:'ناوی تەواو',phone:'ژمارەی مۆبایل',email:'ئیمەیل (ئارەزوومەندانە)',origin:'لە کوێوە',destination:'بۆ کوێ',type:'جۆری گەیاندن',weight:'کێشی خەمڵێنراو (کیلۆگرام)',notes:'تێبینی زیاتر',
    submit:'ناردنی داواکاری',sending:'دەنێردرێت...',successTitle:'داواکاریەکەت وەرگیرا 🎉',successBody:'ژمارەی شوێنکەوتنت ئەمەیە، هەڵیبگرە بۆ داهاتوو:',trackNow:'ئێستا شوێنی بکەوە',backHome:'گەڕانەوە بۆ سەرەکی',waConfirm:'پشتڕاستکردنەوە بە واتساپ',waPrefix:'سڵاو، داواکارییەکم ناردووە — ژمارەی شوێنکەوتن:'},
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
  hero:{eyebrow:'CHINA  ·  UAE  ·  IRAQ',title:'Delivering Trust Across Borders',subtitle:'Globall Cloud moves your cargo safely and quickly from China and the United Arab Emirates to every city in Iraq — with live tracking, clear milestones, and 24/7 support.',ctaTrack:'Track Shipment',ctaQuote:'Get a Quote',route:{a:'Guangzhou, China',b:'Dubai, UAE',c:'Erbil, Iraq'},badge:'LIVE CORRIDOR',liveStatus:'Shipment moving right now',liveSub:'Your cargo is moving through our China → Dubai → Erbil network with live updates.',routeOrigin:'Origin Hub',routeTransit:'Transit Hub',routeDestination:'Delivery Hub'},
  trust:{s1v:'25K+',s1l:'Delivered shipments',s2v:'12+',s2l:'Connected markets',s3v:'24/7',s3l:'Live support',s4v:'98%',s4l:'On-time delivery'},
  liveTrack:{heading:'Track in seconds',sub:'Enter your tracking number to see the latest shipment status instantly.',placeholder:'e.g. GC10052341',button:'Track Shipment'},
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
  cta:{heading:'Ready to Ship?',sub:'Submit your request today and get a quote in minutes.',b1:'Get a Quote',b2:'Contact Us'},
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
  track:{heading:'Track Shipment',sub:'Enter your tracking ID to see its current status',searchPh:'e.g. GC10052341',searchBtn:'Track',
    notFoundTitle:'No shipment found',notFoundBody:'Please check the tracking ID, or submit a new request.',requestInstead:'Request a Shipment',
    detailsH:'Shipment Details',timelineH:'Timeline',save:'Add to My Shipments',saved:'Saved ✓',signInToSave:'Sign in to save',
    status:{pending:'Pending',transit:'In Transit',delivered:'Delivered'},
    steps:{placed:'Order Placed',pickedUp:'Picked Up',transit:'In Transit',customs:'Customs',outForDelivery:'Out for Delivery',delivered:'Delivered'},
    type:{air:'Air Freight',sea:'Sea Freight',land:'Land Freight'},
    weight:'Weight',volume:'Volume',items:'Items',total:'Total',paid:'Paid',due:'Due',eta:'Expected:',pendingValue:'To be confirmed'},
  invoice:{downloadBtn:'Download Invoice (PDF)',generating:'Generating...',title:'Shipping Invoice',trackingId:'Tracking ID',dateIssued:'Date Issued',billTo:'Bill To',route:'Route',serviceType:'Service Type',statusLabel:'Status',thanks:'Thank you for trusting Globall Cloud',failMsg:'Invoice generation failed, please try again.'},
  request:{heading:'Get a Quote / New Shipment',sub:'Fill in your shipment details and get a tracking ID instantly.',
    name:'Full Name',phone:'Phone Number',email:'Email (optional)',origin:'Origin',destination:'Destination',type:'Shipping Type',weight:'Estimated Weight (kg)',notes:'Additional Notes',
    submit:'Submit Request',sending:'Sending...',successTitle:'Request received 🎉',successBody:'Your tracking number is — save it for later:',trackNow:'Track It Now',backHome:'Back to Home',waConfirm:'Confirm via WhatsApp',waPrefix:'Hi, I just submitted a request — tracking number:'},
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
