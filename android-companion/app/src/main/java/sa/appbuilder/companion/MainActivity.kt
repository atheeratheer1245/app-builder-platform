package sa.appbuilder.companion

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import androidx.lifecycle.lifecycleScope
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

private data class Template(
    val id: String, val mark: String, val titleAr: String, val titleEn: String,
    val descriptionAr: String, val descriptionEn: String,
    val pagesAr: List<String>, val pagesEn: List<String>, val color: Int,
)

class MainActivity : ComponentActivity() {
    private val apiUrl = "https://appbuilder-ewgsiuw6.manus.space"
    private val googleWebClientId = "271495009963-n86689drhqhmkqgkoc221ifs3e335a39.apps.googleusercontent.com"
    private val prefs by lazy { getSharedPreferences("app_builder_native", Context.MODE_PRIVATE) }
    private var googleBusy = false
    private val isEnglish get() = prefs.getString("language", "ar") == "en"

    private val templates = listOf(
        Template("ecommerce", "🛍", "متجر إلكتروني", "E-commerce Store", "متجر للمنتجات والبحث والسلة والمخزون.", "A storefront for products, search, cart, and stock.", listOf("الرئيسية", "المنتجات", "السلة", "الحساب"), listOf("Home", "Products", "Cart", "Account"), Color.rgb(37, 99, 235)),
        Template("education", "🎓", "تطبيق تعليمي", "Education App", "دروس ودورات واختبارات ومتابعة تقدّم.", "Lessons, courses, quizzes, and progress tracking.", listOf("الدروس", "الدورات", "الاختبارات", "الإنجازات"), listOf("Lessons", "Courses", "Quizzes", "Achievements"), Color.rgb(14, 116, 144)),
        Template("games", "🎮", "تطبيق ألعاب", "Gaming App", "بداية اللعبة والمستويات والنقاط.", "Start, levels, gameplay, and scoring.", listOf("البداية", "المستويات", "اللعبة", "النقاط"), listOf("Start", "Levels", "Game", "Scores"), Color.rgb(124, 58, 237)),
        Template("music", "🎵", "تطبيق موسيقى", "Music App", "اكتشاف الأغاني وقوائم التشغيل والألبومات.", "Music discovery, playlists, and albums.", listOf("اكتشف", "يعمل الآن", "القوائم", "الألبومات"), listOf("Discover", "Now playing", "Playlists", "Albums"), Color.rgb(219, 39, 119)),
        Template("podcasts", "🎙", "تطبيق بودكاست", "Podcast App", "حلقات وقنوات وحفظ للاستماع لاحقًا.", "Episodes, channels, and saved listening.", listOf("اكتشف", "الحلقات", "القنوات", "المحفوظات"), listOf("Discover", "Episodes", "Channels", "Saved"), Color.rgb(147, 51, 234)),
        Template("movies", "🎬", "أفلام ومسلسلات", "Movies & Shows", "مكتبة مشاهدة منظمة بالتفاصيل والقائمة.", "A watch library with details and favourites.", listOf("المختارات", "الأفلام", "المسلسلات", "قائمتي"), listOf("Featured", "Movies", "Shows", "My list"), Color.rgb(234, 88, 12)),
        Template("services", "💼", "تطبيق خدمات", "Services App", "خدمات وحجوزات وعملاء في تجربة واحدة.", "Services, bookings, and clients in one experience.", listOf("الخدمات", "الحجز", "العملاء", "الحساب"), listOf("Services", "Bookings", "Clients", "Account"), Color.rgb(5, 150, 105)),
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        window.statusBarColor = Color.WHITE
        window.navigationBarColor = Color.WHITE
        showDashboard()
    }

    private fun tr(ar: String, en: String) = if (isEnglish) en else ar
    private fun direction() = if (isEnglish) View.LAYOUT_DIRECTION_LTR else View.LAYOUT_DIRECTION_RTL
    private fun templateTitle(t: Template) = if (isEnglish) t.titleEn else t.titleAr
    private fun templateDescription(t: Template) = if (isEnglish) t.descriptionEn else t.descriptionAr
    private fun templatePages(t: Template) = if (isEnglish) t.pagesEn else t.pagesAr

    private fun showDashboard() {
        val content = screen("App Builder", tr("منصة بناء تطبيقات مستقلة", "Standalone mobile app builder"))
        val hero = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(dp(18), dp(18), dp(18), dp(18)); background = rounded(Color.rgb(238, 242, 255), 22) }
        val logo = ImageView(this).apply { setImageResource(R.drawable.app_builder_logo); adjustViewBounds = true }
        hero.addView(logo, LinearLayout.LayoutParams(dp(76), dp(76)).apply { marginEnd = dp(14) })
        val copy = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        addHeading(copy, tr("ابنِ تطبيقك بثقة", "Build your app with confidence"), 22)
        addText(copy, tr("قوالب ومشاريع وتصدير من تجربة جوال أصلية.", "Templates, projects, and exports in a native mobile experience."))
        hero.addView(copy, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        content.addView(hero, full(top = 5, bottom = 18))
        val projectsCount = projects().length()
        val stats = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER; layoutDirection = direction() }
        stats.addView(statCard(projectsCount.toString(), tr("مشاريع", "Projects")), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { marginEnd = dp(6) })
        stats.addView(statCard(templates.size.toString(), tr("قوالب", "Templates")), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(6) })
        content.addView(stats, full(bottom = 18))
        addHeading(content, tr("ابدأ الآن", "Start building"), 20)
        primary(tr("إنشاء مشروع جديد", "Create a new project")) { showTemplates() }.also(content::addView)
        secondary(tr("استعرض الأمثلة الاحترافية", "Explore professional examples")) { showExamples() }.also(content::addView)
        addHeading(content, tr("مشاريع حديثة", "Recent projects"), 20)
        val entries = projects()
        if (entries.length() == 0) emptyState(content, tr("أول مشروع يبدأ بفكرة", "Your first project starts with an idea"), tr("اختر قالبًا مناسبًا ثم أضف العناصر من المحرر.", "Choose a template, then add elements from the editor."))
        else {
            for (i in 0 until minOf(entries.length(), 2)) recentProjectCard(content, entries.getJSONObject(i))
        }
        nav(content, "home")
    }

    private fun showTemplates() {
        val content = screen(tr("مكتبة القوالب", "Template library"), tr("اختر نقطة بداية مصممة لفكرتك.", "Choose a tailored starting point for your idea."))
        templates.forEach { t ->
            val card = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(17), dp(16), dp(17), dp(15)); background = rounded(Color.WHITE, 18, Color.rgb(226, 232, 240)); setOnClickListener { showTemplate(t) } }
            addHeading(card, "${t.mark} ${templateTitle(t)}", 19)
            addText(card, templateDescription(t))
            val meta = TextView(this).apply { text = "${templatePages(t).size} ${tr("شاشات جاهزة", "ready screens")}"; textSize = 13f; setTypeface(typeface, Typeface.BOLD); setTextColor(t.color) }
            card.addView(meta, full(top = 6))
            content.addView(card, full(top = 7, bottom = 7))
        }
        nav(content, "templates")
    }

    private fun showTemplate(t: Template) {
        val content = screen(templateTitle(t), templateDescription(t))
        addHeading(content, tr("هيكل التطبيق", "App structure"), 21)
        templatePages(t).forEachIndexed { index, name ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; layoutDirection = direction(); setPadding(dp(14), dp(13), dp(14), dp(13)); background = rounded(Color.WHITE, 14, Color.rgb(226, 232, 240)) }
            val badge = TextView(this).apply { text = "${index + 1}"; gravity = Gravity.CENTER; setTextColor(Color.WHITE); setTypeface(typeface, Typeface.BOLD); background = rounded(t.color, 12) }
            row.addView(badge, LinearLayout.LayoutParams(dp(28), dp(28)).apply { marginEnd = dp(12) })
            row.addView(TextView(this).apply { text = name; textSize = 16f; setTextColor(Color.rgb(30, 41, 59)); setTypeface(typeface, Typeface.BOLD) })
            content.addView(row, full(top = 5, bottom = 5))
        }
        primary(tr("معاينة تفاعلية للقالب", "Interactive template preview")) { showTemplatePreview(t) }.also(content::addView)
        secondary(tr("استخدم هذا القالب", "Use this template")) { createProject(t) }.also(content::addView)
        secondary(tr("العودة إلى القوالب", "Back to templates")) { showTemplates() }.also(content::addView)
    }

    private fun showTemplatePreview(t: Template) {
        val content = screen(tr("معاينة ${templateTitle(t)}", "Preview · ${templateTitle(t)}"), tr("مثال حي لشكل التطبيق قبل إنشاء مشروعك.", "A live visual sample before creating your project."))
        val device = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(13), dp(13), dp(13), dp(13)); background = rounded(Color.rgb(15, 23, 42), 26) }
        val canvas = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(18), dp(16), dp(14)); background = rounded(Color.WHITE, 20) }
        val previewTop = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; layoutDirection = direction() }
        previewTop.addView(TextView(this).apply { text = "${t.mark} ${templateTitle(t)}"; textSize = 18f; setTypeface(typeface, Typeface.BOLD); setTextColor(Color.rgb(15, 23, 42)) }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        previewTop.addView(TextView(this).apply { text = "●"; textSize = 14f; setTextColor(t.color) })
        canvas.addView(previewTop, full(bottom = 12))
        if (t.id in setOf("ecommerce", "music", "podcasts", "movies")) {
            val search = TextView(this).apply { text = tr("⌕  ابحث داخل التطبيق", "⌕  Search this app"); textSize = 14f; setTextColor(Color.rgb(100, 116, 139)); setPadding(dp(13), dp(12), dp(13), dp(12)); background = rounded(Color.rgb(248, 250, 252), 13, Color.rgb(226, 232, 240)) }
            canvas.addView(search, full(bottom = 11))
        }
        val feature = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(15), dp(15), dp(15), dp(15)); background = rounded(t.color, 17) }
        addPreviewText(feature, templatePages(t).first(), 20, Color.WHITE, true)
        addPreviewText(feature, templateDescription(t), 13, Color.WHITE, false)
        canvas.addView(feature, full(bottom = 10))
        when (t.id) {
            "ecommerce" -> {
                val product = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(13), dp(12), dp(13), dp(12)); background = rounded(Color.rgb(248, 250, 252), 15, Color.rgb(226, 232, 240)) }
                addPreviewText(product, tr("سماعات لاسلكية", "Wireless headphones"), 16, Color.rgb(15, 23, 42), true)
                addPreviewText(product, tr("250 ر.س  ·  خصم 20%  ·  متبقي 8", "SAR 250  ·  20% off  ·  8 left"), 13, Color.rgb(79, 70, 229), false)
                canvas.addView(product, full(bottom = 9))
            }
            "education" -> previewLesson(canvas, tr("دورة اليوم", "Today's course"), tr("أساسيات تصميم التطبيقات", "Mobile app design foundations"), t.color)
            "games" -> previewLesson(canvas, tr("المستوى 12", "Level 12"), tr("اجمع النقاط وافتح التحدي التالي", "Collect points and unlock the next challenge"), t.color)
            "music" -> previewLesson(canvas, tr("يعمل الآن", "Now playing"), tr("قائمة تركيز المساء", "Evening focus playlist"), t.color)
            "podcasts" -> previewLesson(canvas, tr("حلقة جديدة", "New episode"), tr("كيف تحوّل الفكرة إلى منتج", "From idea to product"), t.color)
            "movies" -> previewLesson(canvas, tr("مختار لك", "Picked for you"), tr("رحلة عبر المدن", "A journey through cities"), t.color)
            "services" -> previewLesson(canvas, tr("الخدمة التالية", "Next service"), tr("احجز موعدك خلال دقيقة", "Book your appointment in a minute"), t.color)
        }
        val miniNav = TextView(this).apply { text = templatePages(t).take(4).joinToString("     "); textSize = 11f; gravity = Gravity.CENTER; setTextColor(Color.rgb(100, 116, 139)); setPadding(dp(5), dp(11), dp(5), dp(1)) }
        canvas.addView(miniNav, full())
        device.addView(canvas)
        content.addView(device, full(bottom = 14))
        primary(tr("إنشاء مشروعي من هذه المعاينة", "Create my project from this preview")) { createProject(t) }.also(content::addView)
        secondary(tr("العودة إلى تفاصيل القالب", "Back to template details")) { showTemplate(t) }.also(content::addView)
    }

    private fun previewLesson(parent: LinearLayout, eyebrow: String, title: String, accent: Int) {
        val item = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(13), dp(12), dp(13), dp(12)); background = rounded(Color.rgb(248, 250, 252), 15, Color.rgb(226, 232, 240)) }
        addPreviewText(item, eyebrow, 12, accent, true)
        addPreviewText(item, title, 16, Color.rgb(15, 23, 42), true)
        parent.addView(item, full(bottom = 9))
    }

    private fun addPreviewText(parent: LinearLayout, value: String, size: Int, color: Int, bold: Boolean) {
        parent.addView(TextView(this).apply { text = value; textSize = size.toFloat(); setTextColor(color); setTypeface(typeface, if (bold) Typeface.BOLD else Typeface.NORMAL); gravity = if (isEnglish) Gravity.LEFT else Gravity.RIGHT }, full(bottom = 4))
    }

    private fun showProjects() {
        val content = screen(tr("مشاريعي", "My projects"), tr("حرّر تطبيقاتك واحفظ تقدمك على جهازك.", "Edit your apps and save progress on this device."))
        val entries = projects()
        if (entries.length() == 0) emptyState(content, tr("لا توجد مشاريع بعد", "No projects yet"), tr("أنشئ مشروعًا من قالب ليظهر هنا.", "Create a project from a template to see it here."))
        else for (i in 0 until entries.length()) recentProjectCard(content, entries.getJSONObject(i))
        primary(tr("إنشاء مشروع", "Create project")) { showTemplates() }.also(content::addView)
        nav(content, "projects")
    }

    private fun recentProjectCard(content: LinearLayout, project: JSONObject) {
        val card = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(15), dp(16), dp(15)); background = rounded(Color.WHITE, 17, Color.rgb(226, 232, 240)); setOnClickListener { showProject(project) } }
        addHeading(card, project.optString(if (isEnglish) "nameEn" else "name", project.getString("name")), 18)
        addText(card, "${project.optString(if (isEnglish) "templateEn" else "template", project.getString("template"))}  •  ${project.getString("createdAt")}")
        val count = project.optJSONArray("components")?.length() ?: 0
        val meta = TextView(this).apply { text = "$count ${tr("عناصر", "elements")}"; textSize = 13f; setTextColor(Color.rgb(79, 70, 229)); setTypeface(typeface, Typeface.BOLD) }
        card.addView(meta, full(top = 5))
        content.addView(card, full(top = 7, bottom = 7))
    }

    private fun showProject(project: JSONObject) {
        val name = project.optString(if (isEnglish) "nameEn" else "name", project.getString("name"))
        val content = screen(name, tr("مسودة محفوظة محليًا ويمكن تعديل عناصرها.", "A locally saved draft with editable elements."))
        val summary = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(15), dp(14), dp(15), dp(14)); background = rounded(Color.rgb(248, 250, 252), 16, Color.rgb(226, 232, 240)) }
        addHeading(summary, tr("محرر المشروع", "Project editor"), 19)
        addText(summary, tr("أضف عناصر فعلية ثم راجعها قبل طلب التصدير.", "Add working elements, then review them before requesting export."))
        content.addView(summary, full(bottom = 10))
        addHeading(content, tr("العناصر", "Elements"), 20)
        val components = project.optJSONArray("components") ?: JSONArray()
        if (components.length() == 0) emptyState(content, tr("ابدأ بعنصر", "Start with an element"), tr("أضف بطاقة أو زرًا أو وسائط إلى المشروع.", "Add a card, button, or media to this project."))
        else {
            for (i in 0 until components.length()) elementRow(content, components.getString(i), i + 1)
        }
        primary(tr("إضافة بطاقة معلومات", "Add information card")) { addComponent(project.getString("id"), tr("بطاقة معلومات", "Information card")) }.also(content::addView)
        secondary(tr("إضافة زر مرتبط", "Add linked button")) { addComponent(project.getString("id"), tr("زر مرتبط", "Linked button")) }.also(content::addView)
        secondary(tr("إضافة صورة من المعرض", "Add gallery image")) { addComponent(project.getString("id"), tr("صورة من المعرض", "Gallery image")) }.also(content::addView)
        secondary(tr("إضافة نموذج الصفحة", "Add page form")) { addComponent(project.getString("id"), tr("نموذج الصفحة", "Page form")) }.also(content::addView)
        primary(tr("مركز التصدير", "Export center")) { showExports(project) }.also(content::addView)
        secondary(tr("العودة إلى المشاريع", "Back to projects")) { showProjects() }.also(content::addView)
    }

    private fun elementRow(content: LinearLayout, label: String, index: Int) {
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; layoutDirection = direction(); setPadding(dp(13), dp(12), dp(13), dp(12)); background = rounded(Color.WHITE, 14, Color.rgb(226, 232, 240)) }
        val number = TextView(this).apply { text = index.toString(); textSize = 13f; gravity = Gravity.CENTER; setTextColor(Color.rgb(79, 70, 229)); setTypeface(typeface, Typeface.BOLD); background = rounded(Color.rgb(238, 242, 255), 12) }
        row.addView(number, LinearLayout.LayoutParams(dp(28), dp(28)).apply { marginEnd = dp(10) })
        row.addView(TextView(this).apply { text = label; textSize = 16f; setTextColor(Color.rgb(30, 41, 59)); setTypeface(typeface, Typeface.BOLD) })
        content.addView(row, full(top = 5, bottom = 5))
    }

    private fun showExamples() {
        val content = screen(tr("أمثلة احترافية", "Professional examples"), tr("أمثلة متعددة الصفحات قابلة لاستخدامها كنقطة انطلاق.", "Multi-page examples ready to use as a starting point."))
        templates.forEach { t ->
            val card = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(15), dp(16), dp(15)); background = rounded(Color.WHITE, 17, Color.rgb(226, 232, 240)) }
            addHeading(card, "${t.mark} ${templateTitle(t)}", 18)
            addText(card, templatePages(t).joinToString(" • "))
            secondary(tr("إنشاء مشروع من المثال", "Create project from example")) { createProject(t) }.also(card::addView)
            content.addView(card, full(top = 7, bottom = 7))
        }
        nav(content, "examples")
    }

    private fun showExports(project: JSONObject) {
        val content = screen(tr("مركز التصدير", "Export center"), tr("${project.getString("name")} · اختر الصيغة المناسبة لتطبيقك.", "${project.optString("nameEn", project.getString("name"))} · Choose the format for your app."))
        val info = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(15), dp(16), dp(15)); background = rounded(Color.rgb(255, 251, 235), 17) }
        addHeading(info, "APK  /  AAB  /  IPA", 19)
        addText(info, tr("خدمة البناء السحابية مؤجلة حاليًا؛ لذلك يُحفظ طلبك داخل التطبيق فقط.", "Cloud builds are deferred; export requests are stored in the app only."))
        content.addView(info, full(bottom = 10))
        listOf("APK", "AAB", "IPA").forEach { format -> primary(tr("طلب $format", "Request $format")) { notice(tr("حُفظ طلب $format محليًا", "$format request saved locally")) }.also(content::addView) }
        secondary(tr("العودة إلى المشروع", "Back to project")) { showProject(project) }.also(content::addView)
    }

    private fun showAccount() {
        val email = prefs.getString("email", "") ?: ""
        if (email.isBlank()) return showAuth()
        val content = screen(tr("الحساب والإعدادات", "Account & settings"), tr("إدارة الجلسة واللغة من داخل التطبيق.", "Manage your session and language inside the app."))
        val card = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(16), dp(16), dp(16)); background = rounded(Color.WHITE, 17, Color.rgb(226, 232, 240)) }
        addHeading(card, email, 19)
        addText(card, tr("جلسة آمنة من دون موقع أو متصفح.", "A secure session without website or browser navigation."))
        content.addView(card, full(bottom = 12))
        secondary(tr("تغيير اللغة إلى English", "Switch language to العربية")) { toggleLanguage(); showAccount() }.also(content::addView)
        secondary(tr("تسجيل الخروج", "Sign out")) { prefs.edit().remove("session").remove("email").apply(); showDashboard() }.also(content::addView)
        nav(content, "account")
    }

    private fun showAuth(signUp: Boolean = false) {
        val content = screen(tr(if (signUp) "إنشاء حساب" else "تسجيل الدخول", if (signUp) "Create account" else "Sign in"), tr("تسجيل أصلي عبر Google أو البريد الإلكتروني، بلا متصفح.", "Native Google or email sign-in, with no browser."))
        primary(tr("المتابعة عبر Google", "Continue with Google")) { nativeGoogleSignIn() }.also(content::addView)
        val name = EditText(this).apply { hint = tr("الاسم الكامل", "Full name"); visibility = if (signUp) View.VISIBLE else View.GONE; setSingleLine(true); layoutDirection = direction() }
        val email = EditText(this).apply { hint = tr("البريد الإلكتروني", "Email address"); inputType = InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS; setSingleLine(true); layoutDirection = View.LAYOUT_DIRECTION_LTR }
        val password = EditText(this).apply { hint = tr("كلمة المرور", "Password"); inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD; setSingleLine(true); layoutDirection = View.LAYOUT_DIRECTION_LTR }
        content.addView(name, full(top = 5, bottom = 5)); content.addView(email, full(top = 5, bottom = 5)); content.addView(password, full(top = 5, bottom = 5))
        primary(tr(if (signUp) "إنشاء حساب بالبريد" else "تسجيل الدخول بالبريد", if (signUp) "Create account with email" else "Sign in with email")) { nativeEmailAuth(signUp, name.text.toString(), email.text.toString(), password.text.toString()) }.also(content::addView)
        secondary(tr(if (signUp) "لدي حساب بالفعل" else "إنشاء حساب جديد", if (signUp) "I already have an account" else "Create a new account")) { showAuth(!signUp) }.also(content::addView)
        nav(content, "account")
    }

    private fun nativeGoogleSignIn() {
        if (googleBusy) return
        googleBusy = true
        val request = GetCredentialRequest.Builder().addCredentialOption(GetSignInWithGoogleOption.Builder(googleWebClientId).build()).build()
        lifecycleScope.launch {
            try {
                val credential = CredentialManager.create(this@MainActivity).getCredential(this@MainActivity, request).credential
                if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) throw IllegalStateException("Unsupported credential")
                val google = GoogleIdTokenCredential.createFrom(credential.data)
                val token = withContext(Dispatchers.IO) { postJson("$apiUrl/api/auth/google/native", JSONObject().put("idToken", google.idToken)).getString("sessionToken") }
                prefs.edit().putString("session", token).putString("email", google.id).apply(); googleBusy = false; showDashboard()
            } catch (_: GetCredentialException) { googleBusy = false; notice(tr("تعذر فتح اختيار حساب Google. تحقق من خدمات Google Play.", "Could not open Google account chooser. Check Google Play services.")) }
            catch (_: Exception) { googleBusy = false; notice(tr("تعذر إكمال تسجيل Google. أعد المحاولة.", "Google sign-in could not complete. Try again.")) }
        }
    }

    private fun nativeEmailAuth(signUp: Boolean, name: String, email: String, password: String) {
        if (email.isBlank() || password.length < 8 || (signUp && name.trim().length < 2)) return notice(tr("أدخل بريدًا صحيحًا وكلمة مرور من 8 أحرف على الأقل.", "Enter a valid email and at least 8 password characters."))
        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) { val p = JSONObject().put("email", email.trim()).put("password", password); if (signUp) p.put("name", name.trim()); postJson("$apiUrl/api/mobile/auth/${if (signUp) "sign-up" else "sign-in"}", p) }
                prefs.edit().putString("session", result.getString("sessionToken")).putString("email", result.getString("email")).apply(); showDashboard()
            } catch (_: Exception) { notice(tr(if (signUp) "تعذر إنشاء الحساب. قد يكون البريد مستخدمًا." else "تحقق من البريد وكلمة المرور.", if (signUp) "Could not create account. The email may be in use." else "Check your email and password.")) }
        }
    }

    private fun postJson(endpoint: String, payload: JSONObject): JSONObject {
        val c = (URL(endpoint).openConnection() as HttpURLConnection).apply { requestMethod = "POST"; connectTimeout = 15_000; readTimeout = 15_000; doOutput = true; setRequestProperty("Content-Type", "application/json"); setRequestProperty("Accept", "application/json") }
        c.outputStream.use { it.write(payload.toString().toByteArray()) }
        val stream = if (c.responseCode in 200..299) c.inputStream else c.errorStream
        val text = stream.bufferedReader().use { it.readText() }
        if (c.responseCode !in 200..299) throw IllegalStateException(text)
        return JSONObject(text)
    }

    private fun createProject(t: Template) {
        val entries = projects()
        entries.put(JSONObject().put("id", UUID.randomUUID().toString()).put("name", "${t.titleAr} جديد").put("nameEn", "New ${t.titleEn}").put("template", t.titleAr).put("templateEn", t.titleEn).put("createdAt", tr("الآن", "Now")).put("components", JSONArray()))
        prefs.edit().putString("projects", entries.toString()).apply(); notice(tr("تم إنشاء المشروع على هاتفك", "Project created on your phone")); showProjects()
    }

    private fun addComponent(id: String, label: String) {
        val entries = projects()
        for (i in 0 until entries.length()) {
            val p = entries.getJSONObject(i)
            if (p.getString("id") != id) continue
            val components = p.optJSONArray("components") ?: JSONArray(); components.put(label); p.put("components", components); entries.put(i, p)
            prefs.edit().putString("projects", entries.toString()).apply(); notice(tr("تمت إضافة العنصر", "Element added")); showProject(p); return
        }
    }

    private fun projects(): JSONArray = try { JSONArray(prefs.getString("projects", "[]")) } catch (_: Exception) { JSONArray() }
    private fun toggleLanguage() { prefs.edit().putString("language", if (isEnglish) "ar" else "en").apply() }

    private fun screen(title: String, subtitle: String): LinearLayout {
        val scroll = ScrollView(this).apply { setBackgroundColor(Color.rgb(248, 250, 252)); isFillViewport = true }
        val content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; layoutDirection = direction(); setPadding(dp(20), dp(42), dp(20), dp(30)) }
        val top = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; layoutDirection = direction() }
        val titleView = TextView(this).apply { text = title; textSize = 25f; setTypeface(typeface, Typeface.BOLD); setTextColor(Color.rgb(15, 23, 42)); gravity = if (isEnglish) Gravity.LEFT else Gravity.RIGHT }
        top.addView(titleView, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        val language = TextView(this).apply { text = if (isEnglish) "العربية" else "English"; textSize = 13f; setTypeface(typeface, Typeface.BOLD); setTextColor(Color.rgb(79, 70, 229)); setPadding(dp(10), dp(8), dp(10), dp(8)); background = rounded(Color.rgb(238, 242, 255), 13); setOnClickListener { toggleLanguage(); showDashboard() } }
        top.addView(language)
        content.addView(top, full(bottom = 7))
        addText(content, subtitle)
        scroll.addView(content); setContentView(scroll); return content
    }

    private fun nav(content: LinearLayout, selected: String) {
        val nav = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER; layoutDirection = direction(); setPadding(dp(4), dp(7), dp(4), dp(7)); background = rounded(Color.WHITE, 18, Color.rgb(226, 232, 240)) }
        val items = listOf("home" to tr("الرئيسية", "Home") to ::showDashboard, "templates" to tr("القوالب", "Templates") to ::showTemplates, "projects" to tr("المشاريع", "Projects") to ::showProjects, "examples" to tr("الأمثلة", "Examples") to ::showExamples, "account" to tr("الحساب", "Account") to ::showAccount)
        items.forEach { (data, action) ->
            val (key, label) = data
            val active = key == selected
            nav.addView(TextView(this).apply { text = label; textSize = 12f; gravity = Gravity.CENTER; setTypeface(typeface, if (active) Typeface.BOLD else Typeface.NORMAL); setTextColor(if (active) Color.WHITE else Color.rgb(79, 70, 229)); setPadding(dp(5), dp(9), dp(5), dp(9)); background = rounded(if (active) Color.rgb(79, 70, 229) else Color.TRANSPARENT, 12); setOnClickListener { action() } }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }
        content.addView(nav, full(top = 24))
    }

    private fun statCard(value: String, label: String) = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(dp(12), dp(14), dp(12), dp(14)); background = rounded(Color.WHITE, 16, Color.rgb(226, 232, 240)); addView(TextView(this@MainActivity).apply { text = value; textSize = 26f; setTypeface(typeface, Typeface.BOLD); setTextColor(Color.rgb(79, 70, 229)); gravity = Gravity.CENTER }); addView(TextView(this@MainActivity).apply { text = label; textSize = 13f; setTextColor(Color.rgb(100, 116, 139)); gravity = Gravity.CENTER }) }
    private fun emptyState(parent: LinearLayout, title: String, detail: String) { val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(16), dp(16), dp(16)); background = rounded(Color.WHITE, 16, Color.rgb(226, 232, 240)) }; addHeading(box, title, 18); addText(box, detail); parent.addView(box, full(top = 5, bottom = 10)) }
    private fun addHeading(parent: LinearLayout, text: String, size: Int) { parent.addView(TextView(this).apply { this.text = text; textSize = size.toFloat(); setTypeface(typeface, Typeface.BOLD); setTextColor(Color.rgb(15, 23, 42)); gravity = if (isEnglish) Gravity.LEFT else Gravity.RIGHT }, full(top = 3, bottom = 6)) }
    private fun addText(parent: LinearLayout, text: String) { parent.addView(TextView(this).apply { this.text = text; textSize = 15f; setTextColor(Color.rgb(71, 85, 105)); gravity = if (isEnglish) Gravity.LEFT else Gravity.RIGHT; setLineSpacing(dp(3).toFloat(), 1f) }, full(bottom = 9)) }
    private fun primary(text: String, action: () -> Unit) = actionText(text, Color.rgb(79, 70, 229), Color.WHITE, true, action)
    private fun secondary(text: String, action: () -> Unit) = actionText(text, Color.rgb(238, 242, 255), Color.rgb(67, 56, 202), false, action)
    private fun actionText(text: String, backgroundColor: Int, foreground: Int, bold: Boolean, action: () -> Unit) = TextView(this).apply { this.text = text; textSize = 16f; gravity = Gravity.CENTER; setTextColor(foreground); setTypeface(typeface, if (bold) Typeface.BOLD else Typeface.NORMAL); setPadding(dp(14), dp(14), dp(14), dp(14)); background = rounded(backgroundColor, 15); isClickable = true; setOnClickListener { action() }; layoutParams = full(top = 6, bottom = 4) }
    private fun full(top: Int = 0, bottom: Int = 0) = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(top); bottomMargin = dp(bottom) }
    private fun rounded(color: Int, radius: Int, stroke: Int? = null) = GradientDrawable().apply { setColor(color); cornerRadius = dp(radius).toFloat(); if (stroke != null) setStroke(dp(1), stroke) }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun notice(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()
}
