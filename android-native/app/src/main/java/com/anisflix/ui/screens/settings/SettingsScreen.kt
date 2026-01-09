package com.anisflix.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.anisflix.domain.repository.AppTheme
import com.anisflix.domain.repository.ContentLanguage
import com.anisflix.ui.theme.RedPrimary
import com.anisflix.ui.viewmodel.SettingsViewModel

@Composable
fun SettingsScreen(
    navController: NavController,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
    ) {
        // App Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Text(
                text = "Paramètres",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 8.dp)
            )
        }

        HorizontalDivider(color = Color.Gray.copy(alpha = 0.3f))

        // Content Language Section
        SettingsSection(title = "Langue du contenu par défaut") {
             ContentLanguage.entries.forEach { lang ->
                 SettingsOption(
                     label = lang.name,
                     isSelected = state.contentLanguage == lang,
                     onClick = { viewModel.setContentLanguage(lang) }
                 )
             }
        }

        HorizontalDivider(color = Color.Gray.copy(alpha = 0.3f))

        // App Language Section (Simplified for now)
        SettingsSection(title = "Langue de l'application") {
            SettingsOption(
                label = "Français",
                isSelected = state.appLanguage == "fr",
                onClick = { viewModel.setAppLanguage("fr") }
            )
            SettingsOption(
                label = "English",
                isSelected = state.appLanguage == "en",
                onClick = { viewModel.setAppLanguage("en") }
            )
        }

        HorizontalDivider(color = Color.Gray.copy(alpha = 0.3f))

        // App Theme Section
        SettingsSection(title = "Thème") {
            AppTheme.entries.forEach { theme ->
                SettingsOption(
                    label = when(theme) {
                        AppTheme.SYSTEM -> "Système"
                        AppTheme.LIGHT -> "Clir"
                        AppTheme.DARK -> "Sombre"
                    },
                    isSelected = state.appTheme == theme,
                    onClick = { viewModel.setAppTheme(theme) }
                )
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // About
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("AnisFlix v1.0.0 (Alpha)", color = Color.Gray, fontSize = 12.sp)
        }
    }
}

@Composable
fun SettingsSection(title: String, content: @Composable () -> Unit) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(title, color = RedPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        content()
    }
}

@Composable
fun SettingsOption(label: String, isSelected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(
            selected = isSelected,
            onClick = onClick,
            colors = RadioButtonDefaults.colors(selectedColor = RedPrimary, unselectedColor = Color.Gray)
        )
        Text(text = label, color = Color.White, modifier = Modifier.padding(start = 8.dp))
    }
}
