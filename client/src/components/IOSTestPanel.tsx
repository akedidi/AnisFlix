import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, CheckCircle, XCircle, Wifi, Monitor } from 'lucide-react';
import { iosDebugger, runIOSTests } from '@/utils/iosDebugger';
import { Capacitor } from '@capacitor/core';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

export default function IOSTestPanel() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [platformInfo, setPlatformInfo] = useState<{
    isNative: boolean;
    platform: string;
    baseUrl: string;
  } | null>(null);

  useEffect(() => {
    // Initialiser les informations de plateforme
    setPlatformInfo({
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
      baseUrl: (iosDebugger as any)['apiClient']['baseUrl'] || 'N/A'
    });

    // Initialiser les tests
    setTests([
      { name: 'Connectivité réseau', status: 'pending' },
      { name: 'API VidMoly', status: 'pending' },
      { name: 'API Vidzy', status: 'pending' },
      { name: 'API VidSrc', status: 'pending' },
      { name: 'Lecteur vidéo', status: 'pending' }
    ]);
  }, []);

  const updateTest = (index: number, status: TestResult['status'], message?: string) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message } : test
    ));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setLogs([]);
    
    // Reset tous les tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const })));

    try {
      // Test de connectivité
      updateTest(0, 'running');
      const networkOK = await iosDebugger.testNetworkConnectivity();
      updateTest(0, networkOK ? 'success' : 'error', networkOK ? 'Connexion OK' : 'Connexion échouée');

      if (networkOK) {
        // Test VidMoly
        updateTest(1, 'running');
        const vidmolyOK = await iosDebugger.testVidMolyAPI();
        updateTest(1, vidmolyOK ? 'success' : 'error', vidmolyOK ? 'Extraction OK' : 'Extraction échouée');

        // Test Vidzy
        updateTest(2, 'running');
        const vidzyOK = await iosDebugger.testVidzyAPI();
        updateTest(2, vidzyOK ? 'success' : 'error', vidzyOK ? 'Extraction OK' : 'Extraction échouée');

        // Test VidSrc
        updateTest(3, 'running');
        const vidsrcOK = await iosDebugger.testVidSrcAPI();
        updateTest(3, vidsrcOK ? 'success' : 'error', vidsrcOK ? 'Extraction OK' : 'Extraction échouée');
      }

      // Test lecteur vidéo
      updateTest(4, 'running');
      const videoOK = iosDebugger.testVideoPlayer();
      updateTest(4, videoOK ? 'success' : 'error', videoOK ? 'Lecteur OK' : 'Lecteur échoué');

      // Récupérer les logs
      setLogs(iosDebugger.getLogs());

    } catch (error) {
      console.error('Erreur lors des tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">ÉCHEC</Badge>;
      case 'running':
        return <Badge variant="secondary">En cours...</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Tests iOS - AnisFlix
          </CardTitle>
        </CardHeader>
        <CardContent>
          {platformInfo && (
            <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">Informations de plateforme</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Plateforme:</strong> {platformInfo.platform}</div>
                <div><strong>Mode natif:</strong> {platformInfo.isNative ? 'Oui' : 'Non'}</div>
                <div><strong>URL API:</strong> {platformInfo.baseUrl}</div>
              </div>
            </div>
          )}

          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Tests en cours...' : 'Lancer tous les tests'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résultats des tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    {test.message && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {test.message}
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(test.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logs de débogage</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 w-full">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
