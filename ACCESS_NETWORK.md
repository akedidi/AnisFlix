# Accès au serveur depuis le réseau local

## IP locale du Mac
Votre IP locale est : **192.168.1.12**

## Accès depuis un autre appareil
Depuis un autre appareil sur le même réseau WiFi, accédez à :
```
http://192.168.1.12:3000
```

## Configuration du firewall macOS

### Option 1 : Désactiver temporairement le firewall (pour tester)
1. Ouvrez **Préférences Système** → **Sécurité et confidentialité** → **Firewall**
2. Cliquez sur le cadenas pour déverrouiller
3. Cliquez sur **Désactiver le firewall** (temporairement pour tester)
4. Testez l'accès depuis un autre appareil

### Option 2 : Autoriser Node.js dans le firewall
1. Ouvrez **Préférences Système** → **Sécurité et confidentialité** → **Firewall**
2. Cliquez sur **Options du firewall**
3. Cliquez sur le **+** pour ajouter une application
4. Naviguez vers `/usr/local/bin/node` ou trouvez Node.js dans Applications
5. Assurez-vous que Node.js est configuré pour **Autoriser les connexions entrantes**

### Option 3 : Utiliser la ligne de commande (recommandé)
```bash
# Autoriser Node.js dans le firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node

# Ou si Node.js est installé via Homebrew
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /opt/homebrew/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /opt/homebrew/bin/node

# Vérifier l'état
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --listapps
```

## Vérification

### Depuis le Mac (serveur)
```bash
# Vérifier que le serveur écoute sur toutes les interfaces
lsof -i :3000

# Vous devriez voir quelque chose comme :
# node  PID  user  27u  IPv4  TCP *:hbci (LISTEN)
```

### Depuis un autre appareil
1. Assurez-vous d'être sur le même réseau WiFi
2. Ouvrez un navigateur et allez sur `http://192.168.1.12:3000`
3. Si ça ne fonctionne pas, vérifiez le firewall

## Dépannage

### Le serveur ne répond pas depuis l'extérieur
1. Vérifiez que le serveur écoute bien sur `0.0.0.0` (pas seulement `127.0.0.1`)
2. Vérifiez le firewall macOS
3. Vérifiez que vous êtes sur le même réseau WiFi

### Erreur "Connection refused"
- Le firewall bloque probablement les connexions
- Utilisez les commandes ci-dessus pour autoriser Node.js

### Erreur "Unable to connect"
- Vérifiez que le serveur est bien démarré
- Vérifiez l'IP avec `ifconfig | grep "inet "`
- Vérifiez le port avec `lsof -i :3000`

## Sécurité

⚠️ **Important** : L'accès depuis le réseau local est pratique pour le développement, mais :
- Ne laissez pas le serveur accessible en permanence sans protection
- Utilisez un VPN ou un tunnel SSH pour un accès sécurisé depuis l'extérieur
- Ne partagez jamais votre IP publique avec des personnes non autorisées


