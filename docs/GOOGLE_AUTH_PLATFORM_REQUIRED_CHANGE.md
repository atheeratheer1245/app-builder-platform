# إعداد Google Auth Platform المطلوب لتسجيل App Builder

تم التحقق من الموقع المنشور في 20 أغسطس 2026. يبدأ التفويض بنجاح ويستخدم عميل الويب التالي ورابط العودة التالي، لذلك لا يلزم تغييرهما من الشيفرة:

| الإعداد | القيمة المطلوبة |
|---|---|
| عميل OAuth للويب | `271495009963-n86689drhqhmkqgkoc221ifs3e335a39.apps.googleusercontent.com` |
| Authorized redirect URI | `https://appbuilder-ewgsiuw6.manus.space/api/auth/google/callback` |
| Scopes | `openid email profile` |

لكن شاشة Google ما زالت تعرض اسمًا لا يخص المنتج، كما أن نتيجة `access_denied` تتحول الآن في الموقع إلى تشخيص جمهور OAuth. لا يمكن لخادم الموقع أو لمفتاح سر عميل OAuth تغيير **اسم شاشة الموافقة** أو **الجمهور**؛ يتطلبان دخول مالك مشروع Google Cloud أو حسابًا لديه صلاحية مناسبة.

## التغيير المطلوب في Google Auth Platform

1. افتح [Branding](https://console.developers.google.com/auth/branding)، واضبط **App name** إلى `App Builder` ثم اختر بريد الدعم الخاص بالمالك.
2. افتح [Audience](https://console.developers.google.com/auth/audience)، واختر **External**. لكي يعمل الدخول لكل الزائرين المؤهلين، اجعل حالة النشر **In production**. إن بقيت الحالة **Testing** مؤقتًا، أضف `atheer0atheer67@gmail.com` إلى **Test users**.
3. افتح [Clients](https://console.developers.google.com/auth/clients)، واختر عميل الويب المذكور في الجدول، وتأكد أن رابط العودة الموجود في الجدول موجود حرفيًا بلا مسافة أو شرطة مائلة إضافية.
4. لا تغيّر نطاقات OAuth؛ التطبيق يطلب فقط `openid email profile`، وهي الحد الأدنى اللازم لهوية المستخدم.

> تغيير **Branding** و**Audience** هو الجزء الخارجي المتبقي؛ بقية مسار الموقع أصبح يستخدم state موقعة قصيرة الأجل ويتحقق من التبادل والهوية والجلسة محليًا.

## المراجع الرسمية

- [Google: Configure the OAuth consent screen and choose scopes](https://developers.google.com/workspace/guides/configure-oauth-consent)
- [Google Cloud: Manage App Audience](https://support.google.com/cloud/answer/15549945)
