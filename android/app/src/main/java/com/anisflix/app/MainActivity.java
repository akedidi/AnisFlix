package com.anisflix.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "MainActivity";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Gérer les liens profonds au démarrage
        handleIntent(getIntent());
        
        // Vérifier si Picture-in-Picture est supporté
        checkPictureInPictureSupport();
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }
    
    private void handleIntent(Intent intent) {
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            // Traiter les liens profonds si nécessaire
            // Par exemple, rediriger vers une page spécifique
        }
    }
    
    /**
     * Vérifie si Picture-in-Picture est supporté sur cet appareil
     */
    private void checkPictureInPictureSupport() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            boolean hasFeature = getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE);
            Log.d(TAG, "Picture-in-Picture supporté: " + hasFeature);
        }
    }
    
    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        Log.d(TAG, "Mode Picture-in-Picture: " + isInPictureInPictureMode);
        
        // Notifier le JavaScript si nécessaire
        if (isInPictureInPictureMode) {
            // L'utilisateur est entré en mode PiP
            Log.d(TAG, "Entrée en mode Picture-in-Picture");
        } else {
            // L'utilisateur est sorti du mode PiP
            Log.d(TAG, "Sortie du mode Picture-in-Picture");
        }
    }
    
    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        // Cette méthode est appelée quand l'utilisateur appuie sur le bouton Home
        // Vous pouvez utiliser cette opportunité pour entrer en mode PiP si vous le souhaitez
    }
}
