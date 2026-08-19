package sa.appbuilder.companion

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
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
    val id: String,
    val mark: String,
    val title: String,
    val description: String,
    val pages: List<String>,
    val color: Int,
)

class MainActivity : ComponentActivity() {
    private val apiUrl = "https://appbuilder-ewgsiuw6.manus.space"
    private val googleWebClientId = "271495009963-n86689drhqhmkqgkoc221ifs3e335a39.apps.googleusercontent.com"
    private val prefs by lazy { getSharedPreferences("app_builder_native", Context.MODE_PRIVATE) }
    private var googleBusy = false

    private val templates = listOf(
        Template("ecommerce", "🛍", "متجر إلكتروني", "متجر للمنتجات والبحث والسلة والمخزون.", listOf("الرئيسية", "المنتجات", "السلة", "الحساب"), Color.rgb(37, 99, 235)),
        Template("education", "🎓", "تطبيق تعليمي", "دروس ودورات واختبارات ومتابعة تقدّم.", listOf("الدروس", "الدورات", "الاختبارات", "الإنجازات"), Color.rgb(14, 116, 144)),
        Template("games", "🎮", "تطبيق ألعاب", "بداية اللعبة والمستويات والنقاط.", listOf("البداية", "المستويات", "اللعبة", "النقاط"), Color.rgb(124, 58, 237)),
        Template("music", "🎵", "تطبيق موسيقى", "اكتشاف الأغاني وقوائم التشغيل والألبومات.", listOf("اكتشف", "يعمل الآن", "القوائم", "الألبومات"), Color.rgb(219, 39, 119)),
        Template("podcasts", "🎙", "تطبيق بودكاست", "حلقات وقنوات وحفظ للاستماع لاحقًا.", listOf("اكتشف", "الحلقات", "القنوات", "المحفوظات"), Color.rgb(147, 51, 234)),
        Template("movies", "🎬", "أفلام ومسلسلات", "مكتبة مشاهدة منظمة بالتفاصيل والقائمة.", listOf("المختارات", "الأفلام", "المسلسلات", "قائمتي"), Color.rgb(234, 88, 12)),
        Template("services", "💼", "تطبيق خدمات", "خدمات وحجوزات وعملاء في تجربة واحدة.", listOf("الخدمات", "الحجز", "العملاء", "الحساب"), Color.rgb(5, 150, 105)),
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        window.statusBarColor = Color.WHITE
        window.navigationBarColor = Color.WHITE
        showHome()
    }

    private fun showHome() {
        val content = page("App Builder", "منصة تطبيقات أصلية تعمل من هاتفك، دون موقع أو متصفح.")
        val logo = ImageView(this).apply {
            setImageResource(R.drawable.app_builder_logo)
            adjustViewBounds = true
        }
        content.addView(logo, LinearLayout.LayoutParams(dp(92), dp(92)).apply { gravity = Gravity.CENTER_HORIZONTAL; bottomMargin = dp(14) })
        heading(content, "من فكرتك إلى تطبيق", 28)
        body(content, "اختر قالبًا، أنشئ مشروعك، واحفظه مباشرة على هاتفك.")
        primary("استكشف القوالب") { showTemplates() }.also(content::addView)
        secondary("مشاريعي") { showProjects() }.also(content::addView)
        navigation(content)
    }

    private fun showTemplates() {
        val content = page("القوالب", "سبعة قوالب جاهزة لبناء تطبيقات الموبايل.")
        templates.forEach { template ->
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(16), dp(15), dp(16), dp(15))
                background = rounded(Color.WHITE, 18, Color.rgb(226, 232, 240))
                setOnClickListener { showTemplate(template) }
            }
            heading(card, "${template.mark} ${template.title}", 19)
            body(card, template.description)
            val pages = TextView(this).apply { text = template.pages.joinToString("  •  "); textSize = 13f; setTextColor(template.color); setTypeface(typeface, Typeface.BOLD) }
            card.addView(pages, fullWidth(top = 6))
            content.addView(card, fullWidth(top = 7, bottom = 7))
        }
        navigation(content)
    }

    private fun showTemplate(template: Template) {
        val content = page(template.title, template.description)
        heading(content, "شاشات هذا القالب", 20)
        template.pages.forEachIndexed { index, title ->
            val item = TextView(this).apply {
                text = "${index + 1}.  $title"
                textSize = 16f
                setTextColor(Color.rgb(30, 41, 59))
                setPadding(dp(16), dp(13), dp(16), dp(13))
                background = rounded(Color.WHITE, 14, Color.rgb(226, 232, 240))
            }
            content.addView(item, fullWidth(top = 5, bottom = 5))
        }
        primary("إنشاء مشروع بهذا القالب") { createProject(template) }.also(content::addView)
        secondary("رجوع إلى القوالب") { showTemplates() }.also(content::addView)
    }

    private fun showProjects() {
        val content = page("مشاريعي", "مشاريع محفوظة محليًا على جهازك.")
        val projects = projects()
        if (projects.length() == 0) {
            heading(content, "لا توجد مشاريع بعد", 20)
            body(content, "اختر قالبًا لإنشاء مشروعك الأول.")
        } else {
            for (index in 0 until projects.length()) {
                val project = projects.getJSONObject(index)
                val card = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(dp(16), dp(14), dp(16), dp(14))
                    background = rounded(Color.WHITE, 16, Color.rgb(226, 232, 240))
                }
                heading(card, project.getString("name"), 18)
                body(card, "${project.getString("template")} · ${project.getString("createdAt")}")
                secondary("فتح المشروع") { showProject(project) }.also(card::addView)
                content.addView(card, fullWidth(top = 7, bottom = 7))
            }
        }
        primary("إنشاء مشروع") { showTemplates() }.also(content::addView)
        navigation(content)
    }

    private fun showProject(project: JSONObject) {
        val content = page(project.getString("name"), "مشروع مستقل يعمل داخل تطبيق App Builder.")
        heading(content, "مسودة محلية", 21)
        body(content, "أنشئ المشروع من قالب ${project.getString("template")}. مزامنة السحابة وملفات التصدير ستظهر هنا عند تفعيل خدمة البناء.")
        heading(content, "محرر العناصر", 20)
        val componentList = TextView(this).apply {
            text = project.optJSONArray("components")?.joinLabels() ?: "لا توجد عناصر بعد"
            textSize = 15f
            setTextColor(Color.rgb(71, 85, 105))
            setPadding(dp(14), dp(12), dp(14), dp(12))
            background = rounded(Color.WHITE, 14, Color.rgb(226, 232, 240))
        }
        content.addView(componentList, fullWidth(top = 5, bottom = 8))
        primary("إضافة بطاقة معلومات") { addComponent(project.getString("id"), "بطاقة معلومات") }.also(content::addView)
        secondary("إضافة زر مرتبط بصفحة") { addComponent(project.getString("id"), "زر مرتبط") }.also(content::addView)
        secondary("إضافة صورة من المعرض") { addComponent(project.getString("id"), "صورة من المعرض") }.also(content::addView)
        primary("فتح مركز التصدير") { showExports(project) }.also(content::addView)
        secondary("العودة إلى مشاريعي") { showProjects() }.also(content::addView)
    }

    private fun showExports(project: JSONObject) {
        val content = page("مركز التصدير", "${project.getString("name")} · اختر الصيغة المناسبة لتطبيقك.")
        heading(content, "APK / AAB / IPA", 21)
        body(content, "خدمة البناء السحابية ليست مفعلة بعد، لذلك يُحفظ طلب التصدير داخل التطبيق ولا يتم فتح أي متصفح.")
        listOf("طلب APK", "طلب AAB", "طلب IPA").forEach { format ->
            primary(format) { notice("حُفظ طلب $format محليًا حتى تفعيل خدمة البناء") }.also(content::addView)
        }
        secondary("العودة إلى المشروع") { showProject(project) }.also(content::addView)
    }

    private fun showExamples() {
        val content = page("أمثلة التطبيقات", "أمثلة أصلية جاهزة لاستخدامها كنقطة بداية.")
        templates.forEach { template ->
            val card = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(14), dp(16), dp(14)); background = rounded(Color.WHITE, 16, Color.rgb(226, 232, 240)) }
            heading(card, "${template.mark} مثال ${template.title}", 18)
            body(card, "يتضمن ${template.pages.joinToString("، ")}")
            secondary("استخدم المثال") { createProject(template) }.also(card::addView)
            content.addView(card, fullWidth(top = 7, bottom = 7))
        }
        navigation(content)
    }

    private fun showAccount() {
        val email = prefs.getString("email", "") ?: ""
        if (email.isBlank()) return showAuth()
        val content = page("الحساب", "جلسة آمنة داخل التطبيق الأصلي.")
        heading(content, email, 20)
        body(content, "تسجيل الدخول يتم من دون فتح الموقع أو أي متصفح.")
        secondary("تسجيل الخروج") { prefs.edit().clear().apply(); showHome() }.also(content::addView)
        navigation(content)
    }

    private fun showAuth(signUp: Boolean = false) {
        val content = page(if (signUp) "إنشاء حساب" else "تسجيل الدخول", "اختر Google أو البريد الإلكتروني. لا يفتح التطبيق متصفحًا.")
        primary("المتابعة عبر Google") { nativeGoogleSignIn() }.also(content::addView)
        val name = EditText(this).apply { hint = "الاسم الكامل"; visibility = if (signUp) View.VISIBLE else View.GONE; setSingleLine(true) }
        val email = EditText(this).apply { hint = "البريد الإلكتروني"; inputType = InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS; setSingleLine(true) }
        val password = EditText(this).apply { hint = "كلمة المرور"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD; setSingleLine(true) }
        content.addView(name, input())
        content.addView(email, input())
        content.addView(password, input())
        primary(if (signUp) "إنشاء حساب بالبريد" else "تسجيل الدخول بالبريد") { nativeEmailAuth(signUp, name.text.toString(), email.text.toString(), password.text.toString()) }.also(content::addView)
        secondary(if (signUp) "لدي حساب بالفعل" else "إنشاء حساب جديد") { showAuth(!signUp) }.also(content::addView)
        navigation(content)
    }

    private fun nativeGoogleSignIn() {
        if (googleBusy) return
        googleBusy = true
        val option = GetSignInWithGoogleOption.Builder(googleWebClientId).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        lifecycleScope.launch {
            try {
                val credential = CredentialManager.create(this@MainActivity).getCredential(this@MainActivity, request).credential
                if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) throw IllegalStateException("Unsupported credential")
                val google = GoogleIdTokenCredential.createFrom(credential.data)
                val token = withContext(Dispatchers.IO) { postJson("$apiUrl/api/auth/google/native", JSONObject().put("idToken", google.idToken)).getString("sessionToken") }
                prefs.edit().putString("session", token).putString("email", google.id).apply()
                googleBusy = false
                showHome()
            } catch (_: GetCredentialException) {
                googleBusy = false
                notice("تعذر فتح اختيار حساب Google. تحقق من خدمات Google Play.")
            } catch (_: Exception) {
                googleBusy = false
                notice("تعذر إكمال تسجيل Google. أعد المحاولة.")
            }
        }
    }

    private fun nativeEmailAuth(signUp: Boolean, name: String, email: String, password: String) {
        if (email.isBlank() || password.length < 8 || (signUp && name.trim().length < 2)) return notice("أدخل بريدًا صحيحًا وكلمة مرور من 8 أحرف على الأقل.")
        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    val payload = JSONObject().put("email", email.trim()).put("password", password)
                    if (signUp) payload.put("name", name.trim())
                    postJson("$apiUrl/api/mobile/auth/${if (signUp) "sign-up" else "sign-in"}", payload)
                }
                prefs.edit().putString("session", result.getString("sessionToken")).putString("email", result.getString("email")).apply()
                showHome()
            } catch (_: Exception) {
                notice(if (signUp) "تعذر إنشاء الحساب. قد يكون البريد مستخدمًا." else "تحقق من البريد وكلمة المرور.")
            }
        }
    }

    private fun postJson(endpoint: String, payload: JSONObject): JSONObject {
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"; connectTimeout = 15_000; readTimeout = 15_000; doOutput = true
            setRequestProperty("Content-Type", "application/json"); setRequestProperty("Accept", "application/json")
        }
        connection.outputStream.use { it.write(payload.toString().toByteArray()) }
        val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
        val response = stream.bufferedReader().use { it.readText() }
        if (connection.responseCode !in 200..299) throw IllegalStateException(response)
        return JSONObject(response)
    }

    private fun createProject(template: Template) {
        val entries = projects()
        entries.put(JSONObject().put("id", UUID.randomUUID().toString()).put("name", "${template.title} جديد").put("template", template.title).put("createdAt", "الآن").put("components", JSONArray()))
        prefs.edit().putString("projects", entries.toString()).apply()
        notice("تم إنشاء المشروع على هاتفك")
        showProjects()
    }

    private fun addComponent(projectId: String, label: String) {
        val entries = projects()
        for (index in 0 until entries.length()) {
            val project = entries.getJSONObject(index)
            if (project.getString("id") != projectId) continue
            val components = project.optJSONArray("components") ?: JSONArray()
            components.put(label)
            project.put("components", components)
            entries.put(index, project)
            prefs.edit().putString("projects", entries.toString()).apply()
            notice("تمت إضافة $label")
            showProject(project)
            return
        }
    }

    private fun projects(): JSONArray = try { JSONArray(prefs.getString("projects", "[]")) } catch (_: Exception) { JSONArray() }

    private fun page(title: String, subtitle: String): LinearLayout {
        val scroll = ScrollView(this).apply { setBackgroundColor(Color.rgb(248, 250, 252)); isFillViewport = true }
        val content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; layoutDirection = View.LAYOUT_DIRECTION_RTL; setPadding(dp(20), dp(42), dp(20), dp(30)) }
        heading(content, title, 25)
        body(content, subtitle)
        scroll.addView(content)
        setContentView(scroll)
        return content
    }

    private fun navigation(content: LinearLayout) {
        val nav = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; layoutDirection = View.LAYOUT_DIRECTION_RTL; gravity = Gravity.CENTER; setPadding(0, dp(22), 0, 0) }
        listOf("الرئيسية" to ::showHome, "القوالب" to ::showTemplates, "المشاريع" to ::showProjects, "الأمثلة" to ::showExamples, "الحساب" to ::showAccount).forEach { (label, action) ->
            nav.addView(TextView(this).apply { text = label; textSize = 13f; gravity = Gravity.CENTER; setTextColor(Color.rgb(79, 70, 229)); setPadding(dp(6), dp(8), dp(6), dp(8)); setOnClickListener { action() } }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }
        content.addView(nav, fullWidth())
    }

    private fun heading(parent: LinearLayout, text: String, size: Int) { parent.addView(TextView(this).apply { this.text = text; textSize = size.toFloat(); setTypeface(typeface, Typeface.BOLD); setTextColor(Color.rgb(15, 23, 42)); gravity = Gravity.RIGHT }, fullWidth(top = 3, bottom = 6)) }
    private fun body(parent: LinearLayout, text: String) { parent.addView(TextView(this).apply { this.text = text; textSize = 15f; setTextColor(Color.rgb(71, 85, 105)); gravity = Gravity.RIGHT; setLineSpacing(dp(3).toFloat(), 1f) }, fullWidth(bottom = 9)) }
    private fun primary(text: String, action: () -> Unit) = Button(this).apply { this.text = text; setTextColor(Color.WHITE); textSize = 16f; setTypeface(typeface, Typeface.BOLD); background = rounded(Color.rgb(79, 70, 229), 15); setOnClickListener { action() }; layoutParams = fullWidth(top = 8, bottom = 4) }
    private fun secondary(text: String, action: () -> Unit) = Button(this).apply { this.text = text; setTextColor(Color.rgb(67, 56, 202)); textSize = 15f; background = rounded(Color.rgb(238, 242, 255), 15); setOnClickListener { action() }; layoutParams = fullWidth(top = 4, bottom = 4) }
    private fun input() = fullWidth(top = 5, bottom = 5)
    private fun fullWidth(top: Int = 0, bottom: Int = 0) = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(top); bottomMargin = dp(bottom) }
    private fun rounded(color: Int, radius: Int, stroke: Int? = null) = GradientDrawable().apply { setColor(color); cornerRadius = dp(radius).toFloat(); if (stroke != null) setStroke(dp(1), stroke) }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun notice(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()
}

private fun JSONArray.joinLabels(): String = buildList {
    for (index in 0 until length()) add(getString(index))
}.joinToString("  •  ")
