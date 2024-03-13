// Import the functions you need from the SDKs you need
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, initializeAnalytics } from "firebase/analytics";
import { getPerformance, initializePerformance } from "firebase/performance";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { initializeApp } from "firebase/app";
import { getRemoteConfig, fetchAndActivate } from "firebase/remote-config";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

export function useFirebase() {
    if (window.providers === undefined) {
        window.providers = {};

        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
            measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        };

        // Initialize Firebase
        window.providers.app = initializeApp(firebaseConfig);

        window.providers.auth = getAuth(window.providers.app);
        window.providers.firestore = getFirestore(window.providers.app);
        window.providers.database = getDatabase(window.providers.app);
        window.providers.storage = getStorage(window.providers.app);
        window.providers.functions = getFunctions(window.providers.app, "europe-west1");

        window.providers.remoteConfig = getRemoteConfig(window.providers.app);

        void fetchAndActivate(window.providers.remoteConfig);

        if (import.meta.env.DEV && (<any>window).emulatorLoaded !== true) {
            // eslint-disable-next-line no-console
            console.log("Development mode");

            const host =
                import.meta.env.VITE_HOST !== undefined
                    ? import.meta.env.VITE_HOST
                    : "localhost";

            connectAuthEmulator(
                window.providers.auth,
                import.meta.env.VITE_FIRESTORE_AUTH_HOST !== undefined
                    ? import.meta.env.VITE_FIRESTORE_AUTH_HOST
                    : `http://${host}:${
                          import.meta.env.VITE_AUTH_PORT !== undefined
                              ? import.meta.env.VITE_AUTH_PORT
                              : 8012
                      }`
            );

            connectFirestoreEmulator(
                window.providers.firestore,
                host,
                import.meta.env.VITE_FIRESTORE_PORT !== undefined
                    ? import.meta.env.VITE_FIRESTORE_PORT
                    : 8014
            );

            connectFunctionsEmulator(
                window.providers.functions,
                host,
                import.meta.env.VITE_FUNCTION_PORT !== undefined
                    ? import.meta.env.VITE_FUNCTION_PORT
                    : 8013
            );

            connectDatabaseEmulator(
                window.providers.database,
                host,
                import.meta.env.VITE_DATABASE_PORT !== undefined
                    ? import.meta.env.VITE_DATABASE_PORT
                    : 8015
            );

            connectStorageEmulator(
                window.providers.storage,
                host,
                import.meta.env.VITE_STORAGE_PORT !== undefined
                    ? import.meta.env.VITE_STORAGE_PORT
                    : 8016
            );

            (<any>window).FIREBASE_APPCHECK_DEBUG_TOKEN =
                import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN;

            (<any>window).emulatorLoaded = true;

            window.providers.analytics = initializeAnalytics(window.providers.app, {
                allow_google_signals: false,
                allow_ad_perzonalization_signals: false,
                event_category: "dev",
            });
            window.providers.performance = initializePerformance(window.providers.app, {
                dataCollectionEnabled: false,
                instrumentationEnabled: false,
            });
        } else {
            window.providers.analytics = getAnalytics(window.providers.app);
            window.providers.performance = getPerformance(window.providers.app);
        }

        window.providers.check = initializeAppCheck(window.providers.app, {
            provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_KEY),

            // Optional argument. If true, the SDK automatically refreshes App Check
            // tokens as needed.
            // isTokenAutoRefreshEnabled: true,
        });
    }
    return window.providers;
}
