import SwiftUI
#if canImport(GoogleCast)
import GoogleCast
#endif

struct CastDeviceSelectionView: View {
    #if canImport(GoogleCast)
    @ObservedObject var castManager = CastManager.shared
    #endif
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        #if canImport(GoogleCast)
        VStack(alignment: .leading, spacing: 0) {
            // Header
            Text("Sélectionner un appareil")
                .font(.headline)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
            
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Disconnect Option (if connected)
                    if castManager.isConnected {
                        Button {
                            castManager.disconnect()
                            dismiss()
                        } label: {
                            HStack(spacing: 16) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.title2)
                                    .foregroundColor(.red)
                                    .frame(width: 32)
                                
                                Text("Déconnecter")
                                    .foregroundColor(.primary)
                                
                                Spacer()
                            }
                            .padding(.horizontal)
                            .padding(.vertical, 12)
                        }
                    }
                    
                    // Device List
                    if castManager.discoveredDevices.isEmpty && !castManager.isConnected {
                        HStack(spacing: 16) {
                            ProgressView()
                                .frame(width: 32)
                            
                            Text("Recherche d'appareils...")
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal)
                        .padding(.vertical, 12)
                    } else {
                        ForEach(castManager.discoveredDevices, id: \.deviceID) { device in
                            Button {
                                castManager.connect(to: device)
                                dismiss()
                            } label: {
                                HStack(spacing: 16) {
                                    Image(systemName: "tv")
                                        .font(.title2)
                                        .foregroundColor(.primary)
                                        .frame(width: 32)
                                    
                                    Text(device.friendlyName ?? "Appareil inconnu")
                                        .foregroundColor(.primary)
                                    
                                    Spacer()
                                }
                                .padding(.horizontal)
                                .padding(.vertical, 12)
                            }
                        }
                    }
                }
            }
        }
        .padding(.bottom)
        .background(Color(UIColor.systemBackground))
        #else
        VStack {
            Text("Chromecast non disponible")
                .padding()
            Button("Fermer") {
                dismiss()
            }
        }
        #endif
    }
}
