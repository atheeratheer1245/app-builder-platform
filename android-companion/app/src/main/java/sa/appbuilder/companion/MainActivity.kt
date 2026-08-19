package sa.appbuilder.companion

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
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
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private val appHost = "appbuilder-ewgsiuw6.manus.space"
    private val appUrl = "https://$appHost"
    private val googleWebClientId = "271495009963-n86689drhqhmkqgkoc221ifs3e335a39.apps.googleusercontent.com"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.WHITE

        CookieManager.getInstance().setAcceptCookie(true)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.loadsImagesAutomatically = true
            settings.mediaPlaybackRequiresUserGesture = true
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    return if (uri.host == appHost && uri.path == "/api/auth/google") {
                        startNativeGoogleSignIn()
                        true
                    } else if (uri.host == appHost) {
                        false
                    } else {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                        true
                    }
                }
            }
            loadUrl(appUrl)
        }
        setContentView(webView)
    }

    private fun startNativeGoogleSignIn() {
        val option = GetSignInWithGoogleOption.Builder(googleWebClientId).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        lifecycleScope.launch {
            try {
                val credential = CredentialManager.create(this@MainActivity).getCredential(this@MainActivity, request).credential
                if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    throw IllegalStateException("Unsupported Google credential")
                }
                val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                val sessionToken = withContext(Dispatchers.IO) { exchangeNativeGoogleToken(idToken) }
                CookieManager.getInstance().setCookie(appUrl, "app_builder_local_session=$sessionToken; Path=/; Secure; HttpOnly; SameSite=None")
                CookieManager.getInstance().flush()
                webView.loadUrl("$appUrl/app")
            } catch (error: GetCredentialException) {
                webView.loadUrl("$appUrl/auth?google=native_error")
            } catch (error: Exception) {
                webView.loadUrl("$appUrl/auth?google=native_error")
            }
        }
    }

    private fun exchangeNativeGoogleToken(idToken: String): String {
        val connection = (URL("$appUrl/api/auth/google/native").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 15_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }
        connection.outputStream.use { output -> output.write(JSONObject().put("idToken", idToken).toString().toByteArray()) }
        if (connection.responseCode !in 200..299) throw IllegalStateException("Native Google session exchange failed")
        return connection.inputStream.bufferedReader().use { input -> JSONObject(input.readText()).getString("sessionToken") }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
