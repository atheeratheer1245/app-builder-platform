# فحص حي لمسار Google OAuth

**التاريخ:** 20 أغسطس 2026

تم فتح صفحة تسجيل الدخول المنشورة ثم بدء تسجيل Google. أثبتت الاستجابة الحية أن التطبيق يرسل معرف العميل النشط المنتهي بـ `n86689drhqhmkqgkoc221ifs3e335a39.apps.googleusercontent.com` وأن عنوان العودة هو بالضبط:

`https://appbuilder-ewgsiuw6.manus.space/api/auth/google/callback`

وصلت العملية إلى شاشة إدخال حساب Google، مما يستبعد خطأ `redirect_uri_mismatch` عند بداية التفويض. لكن شاشة Google تعرض تسمية **"to continue to manus.space"**، كما ظهرت عبارة **"Made with Manus"** في تذييل صفحة تسجيل الدخول المنشورة. يلزم تعديل تسمية شاشة موافقة Google في Google Auth Platform والتحقق من سبب ظهور تذييل الواجهة، ثم إجراء اختبار بحساب Google حقيقي للوصول إلى مرحلة الموافقة والاستدعاء الخلفي.
