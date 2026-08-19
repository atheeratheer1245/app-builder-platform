# إعداد Google OAuth لموقع App Builder

## التشخيص

اختبار بدء تسجيل الدخول عبر المسار المنشور أعاد من Google الخطأ التالي:

> `Error 400: redirect_uri_mismatch`

السبب هو أن Google Cloud لا يحتوي بعد على رابط العودة الذي يرسله الموقع المنشور.

## رابط إعادة التوجيه المطلوب الآن

أضف الرابط التالي ضمن **Authorized redirect URIs** في عميل OAuth 2.0 من نوع Web application:

```text
https://appbuilder-ewgsiuw6.manus.space/api/auth/google/callback
```

بعد ربط نطاق مملوك مستقبلًا، أضف رابط callback المطابق لذلك النطاق أيضًا، ثم اترك الرابط الحالي إلى أن يكتمل الانتقال والاختبار.

## نتيجة إعادة الاختبار

حتى آخر اختبار، ما زال Google يعيد `redirect_uri_mismatch`. يعني ذلك أن الرابط لم يُحفظ في عميل OAuth الصحيح، أو أن المستخدم لم يصل بعد إلى إعدادات العميل. يجب إضافته إلى **العميل المرتبط بالـ Client ID الموجود في إعدادات المشروع**، لا إلى عميل OAuth آخر.

## خطوات Google Cloud

افتح Google Cloud Console ثم انتقل إلى: **APIs & Services → Credentials → OAuth 2.0 Client IDs → [عميل App Builder] → Authorized redirect URIs**. أضف الرابط أعلاه، ثم احفظ التغيير. لا تغيّر Client ID أو Client Secret داخل المشروع ما لم يصدر عميل OAuth جديد عمدًا.

## اسم التطبيق المعروض في Google

أظهر اختبار Google اسمًا قديمًا للتطبيق في شاشة الخطأ. لتظهر هوية **App Builder** بدلًا منه، افتح **Google Auth Platform → Branding** في المشروع نفسه، ثم حدّث **App name** و**User support email** واحفظ. هذا تغيير داخل Google Cloud ولا يتطلب تعديلًا لمعرف العميل داخل الموقع.

## قيد الوصول إلى Google Cloud

رفض Google Cloud تسجيل الدخول من بيئة الاختبار لأنها جهاز غير معروف للحساب. أكمل تعديل إعداد OAuth من جهاز أو متصفح سجّلت منه الدخول سابقًا إلى حساب Google المالك للمشروع؛ لا تشارك كلمة مرور الحساب أو رموز التحقق داخل المحادثة.
