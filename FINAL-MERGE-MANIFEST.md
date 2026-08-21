# Globall Cloud — Final Integrated Package

ئەم پەکیجە وەشانی کۆتایی و پاککراوی Globall Cloud ـە.

## Merge policy

- فایلە هاوبەشە production ـەکان لە `Globall-Cloud-ULTIMATE(1).zip` وەک سەرچاوەی سەرەکی هەڵبژێردراون.
- فایلە زیادە و ناسراوەکانی `Globall-Cloud-synced-2026-08-20(3).zip` تەنها ئەوکات زیاد کراون کە لە ULTIMATE/MERGED2 ـدا نەبوون.
- `MERGED2` وەک بنەمای تێکەڵکردن بەکار هاتووە، بەڵام هەموو `_merge-backup` و فایلەکانی conflict لە پەکیجی deploy ـکراو لابراون.
- هیچ فایلێکی ULTIMATE لە پەکیجی کۆتایی جیاواز نییە؛ بەراوردی byte-by-byte ئەمە پشتڕاست کردووە.

## Verification scope

پێش archive ـکردن، JavaScript syntax، package tests، production validation، asset integrity، CSP، service worker، Supabase migrations، Edge Functions و hardcoded service-role secret پشکنراون.

> تێبینی: ئەم پەکیجە source/release package ـە. پشتڕاستکردنەوەی production ـی ڕاستەقینە هێشتا پێویستی بە deploy ـی staging/production و پشکنینی database، Edge Functions و Cloudflare Pages هەیە.
