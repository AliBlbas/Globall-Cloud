# Browser smoke — v4

لە local static server ـی v4، `index.html` بە سەرکەوتوویی render بوو؛ navigation، tracking form، quote CTA و public service cards لە viewport ـدا دەرکەوتن و هیچ broken asset ـێکی دیار نەبوو. `customer-portal.html` ـیش login boundary، quote submission ـی وردتر، documents، proof of delivery، payment history و quick actions ـی نیشان دا.

ئەم smoke test ـە credentials داخڵ نەکرد و هیچ mutation ـێکی live ئەنجام نەدرا. Authenticated Supabase workflow، notification provider sandbox delivery، signed document refresh و staff role matrix پێویستی staging/live test account و deploy ـی migration و Edge Function ـەکان هەیە.

لە `control-plane.html` ـدا login boundary بە دروستی نیشان درا؛ تەنها email، password و sign-in control ـەکان visible بوون و sign-out button hidden بوو. Browser console ـی customer portal ـیش هیچ output یان runtime error ـی نیشان نەدا.
