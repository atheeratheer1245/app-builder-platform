# إعداد تسجيل Google الأصلي داخل تطبيق App Builder

تم استبدال تفويض Google داخل نافذة WebView بتدفق Android الأصلي عبر Credential Manager. يستعمل التطبيق معرّف عميل الويب الموجود للخادم فقط، ولا يضع أي سر داخل ملف APK.

## إعداد مطلوب مرة واحدة في Google Cloud

من صفحة **Google Auth Platform → Clients**، أنشئ عميل OAuth من النوع **Android** في مشروع Google Cloud نفسه. أدخل القيم الآتية:

| الحقل | القيمة |
|---|---|
| اسم الحزمة | `sa.appbuilder.companion` |
| بصمة SHA-1 لإصدار الاختبار | `21:1F:27:E5:81:22:85:65:D7:9D:CB:D6:69:6C:02:8F:38:08:39:78` |

بعد الحفظ، يبقى عميل الويب `271495009963-n86689drhqhmkqgkoc221ifs3e335a39.apps.googleusercontent.com` مضبوطًا في الخادم للتحقق من رمز الهوية الصادر عن Google. لا تضف سر عميل Web أو Android إلى APK.

## ما الذي يحدث بعد تسجيل Google؟

يعرض Android ورقة اختيار الحساب الأصلية من Google، ثم يرسل رمز الهوية عبر HTTPS إلى الموقع للتحقق من التوقيع والجمهور والصلاحية. عند نجاح التحقق، ينشئ الخادم جلسة المستخدم ويضعها داخل WebView حتى يفتح التطبيق في مساحة العمل مباشرةً.

## ملاحظة عن إصدار الاختبار

بصمة SHA-1 أعلاه تخص ملف APK الموقّع بتوقيع اختبار. قبل نشر إصدار متجر إنتاجي، يجب إنشاء مفتاح إنتاج خاص بالمالك، واستخراج بصمته، وإضافة عميل Android مناسب له أو تحديث العميل الحالي بالبصمة الجديدة.

## مراجع

- [دليل Android Credential Manager لتسجيل Google](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation)
- [إدارة عملاء OAuth في Google Auth Platform](https://support.google.com/cloud/answer/15549257?hl=en)
