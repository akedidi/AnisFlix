package com.anisflix.ui.components.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
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
import com.anisflix.domain.model.Subtitle
import com.anisflix.ui.theme.RedPrimary
import com.anisflix.ui.viewmodel.GlobalPlayerManager

@Composable
fun SubtitleSettingsSheet(
    playerManager: GlobalPlayerManager,
    onDismiss: () -> Unit
) {
    val state by playerManager.playerState.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF1A1A1A))
            .padding(16.dp)
    ) {
        Text("Sous-titres", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Size Control
        Text("Taille", color = Color.Gray, fontSize = 14.sp)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("A", color = Color.White, fontSize = 12.sp)
            Slider(
                value = state.subtitleSize,
                onValueChange = { playerManager.setSubtitleSize(it) },
                valueRange = 10f..30f,
                colors = SliderDefaults.colors(thumbColor = RedPrimary, activeTrackColor = RedPrimary),
                modifier = Modifier.weight(1f).padding(horizontal = 16.dp)
            )
            Text("A", color = Color.White, fontSize = 24.sp)
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Offset Control
        Text("Décalage (Synchro)", color = Color.Gray, fontSize = 14.sp)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { playerManager.setSubtitleOffset(state.subtitleOffset - 0.5f) }) {
                Icon(Icons.Default.Remove, contentDescription = "Decrease", tint = Color.White)
            }
            Text("${String.format("%.1f", state.subtitleOffset)} s", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            IconButton(onClick = { playerManager.setSubtitleOffset(state.subtitleOffset + 0.5f) }) {
                Icon(Icons.Default.Add, contentDescription = "Increase", tint = Color.White)
            }
        }
        
        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp), color = Color.Gray.copy(alpha = 0.3f))
        
        // Subtitle Track List
        Text("Pistes", color = Color.Gray, fontSize = 14.sp)
        Spacer(modifier = Modifier.height(8.dp))
        
        LazyColumn(modifier = Modifier.height(200.dp)) {
            item {
                SubtitleItem(
                    label = "Désactivé",
                    isSelected = state.selectedSubtitle == null,
                    onClick = { playerManager.setSubtitle(null) }
                )
            }
            items(state.subtitles) { subtitle ->
                SubtitleItem(
                    label = subtitle.language,
                    isSelected = state.selectedSubtitle == subtitle,
                    onClick = { playerManager.setSubtitle(subtitle) }
                )
            }
        }
    }
}

@Composable
fun SubtitleItem(label: String, isSelected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = if (isSelected) RedPrimary else Color.White)
        if (isSelected) {
            Icon(Icons.Default.Check, contentDescription = null, tint = RedPrimary)
        }
    }
}
