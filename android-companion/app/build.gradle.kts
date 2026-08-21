plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val generatedApplicationId = System.getenv("APP_BUILDER_APPLICATION_ID")
    ?.takeIf { it.matches(Regex("[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*){2,}")) }
    ?: "sa.appbuilder.companion"
val generatedVersionName = System.getenv("APP_BUILDER_VERSION_NAME")
    ?.takeIf { it.matches(Regex("[0-9A-Za-z._-]{1,32}")) }
    ?: "1.2.0"
val generatedVersionCode = System.getenv("APP_BUILDER_VERSION_CODE")?.toIntOrNull()?.coerceAtLeast(1) ?: 4
val generatedAppName = System.getenv("APP_BUILDER_APP_NAME")?.trim()?.take(80)?.takeIf { it.isNotBlank() } ?: "App Builder"

android {
    namespace = "sa.appbuilder.companion"
    compileSdk = 35

    defaultConfig {
        applicationId = generatedApplicationId
        minSdk = 24
        targetSdk = 35
        versionCode = generatedVersionCode
        versionName = generatedVersionName
        resValue("string", "app_name", generatedAppName)
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
}
