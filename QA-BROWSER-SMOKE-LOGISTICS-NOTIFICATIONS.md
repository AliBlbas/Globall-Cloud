
# Logistics and Notifications browser smoke

لە local static server ـی v4، `logistics-os.html` بە سەرکەوتوویی render بوو. Login shell، customer-only empty state، shipment KPI، Smart Quote، Exception Center و Notification Center بەبێ credential دەرکەوتن؛ بۆ guest هیچ shipment/notification داتا پیشان نەدرا.

`operations-command-center.html` ـیش بە guest بە شێوەی staff-only shell دەرکەوت؛ داتا KPI ـەکان خاوێن و `Login required` بوون، و هیچ داتای operations بە guest پیشان نەدرا. ئەم smoke test ـە credential داخڵ نەکرد و هیچ mutation ـی live ئەنجام نەدرا. Authenticated role-based test بۆ staging پێویستە.
