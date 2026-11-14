import java.util.Properties

plugins {
    id("com.android.application")
}

// Release signing is read from a private file outside the repository:
//   storeFile=/path/to/key.jks, storePassword=, keyAlias=, keyPassword=
val signingFile = file(System.getenv("AUGUST_RACERS_SIGNING")
    ?: "${System.getProperty("user.home")}/.config/august-racers/signing.properties")
val signingProps = Properties().apply { if (signingFile.exists()) signingFile.inputStream().use { load(it) } }

android {
    namespace = "io.github.jonathanriche.augustracers"
    compileSdk = 36
    buildToolsVersion = "35.0.0"
    defaultConfig {
        applicationId = "io.github.jonathanriche.augustracers"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "1.1.0"
    }
    signingConfigs {
        if (signingFile.exists()) create("release") {
            storeFile = file(signingProps.getProperty("storeFile"))
            storePassword = signingProps.getProperty("storePassword")
            keyAlias = signingProps.getProperty("keyAlias")
            keyPassword = signingProps.getProperty("keyPassword")
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }
    lint { checkReleaseBuilds = false }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
