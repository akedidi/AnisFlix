import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { runVidzyDistinctionTests, testFStreamData } from '@/utils/testVidzyDistinction';

export default function VidzyDistinctionTest() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = () => {
    setIsRunning(true);
    try {
      const results = runVidzyDistinctionTests();
      setTestResults(results);
    } catch (error) {
      console.error('Erreur lors des tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const renderSourceCard = (source: any, index: number) => (
    <Card key={index} className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">{source.name}</h4>
            <p className="text-sm text-gray-500">{source.id}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{source.sourceKey}</Badge>
            {source.isEpisode && <Badge variant="secondary">Épisode</Badge>}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1 break-all">{source.url}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test de Distinction des Sources VIDZY</CardTitle>
          <CardDescription>
            Ce test vérifie que les sources VIDZY sont correctement distinguées avec vidzy1, vidzy2, etc.
            selon leur origine (VFF, VFQ, Default).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="mb-6"
          >
            {isRunning ? 'Exécution des tests...' : 'Lancer les tests'}
          </Button>

          {testResults && (
            <Tabs defaultValue="vf" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="vf">Sources VF ({testResults.vfSources.length})</TabsTrigger>
                <TabsTrigger value="vostfr">Sources VOSTFR ({testResults.vostfrSources.length})</TabsTrigger>
                <TabsTrigger value="episodes">Épisodes ({testResults.episodeSources.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="vf" className="mt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Sources VF</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Sources trouvées dans les clés VFF, VFQ et Default
                  </p>
                  {testResults.vfSources.length > 0 ? (
                    testResults.vfSources.map((source: any, index: number) => 
                      renderSourceCard(source, index)
                    )
                  ) : (
                    <p className="text-gray-500">Aucune source VF trouvée</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="vostfr" className="mt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Sources VOSTFR</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Sources trouvées dans la clé VOSTFR
                  </p>
                  {testResults.vostfrSources.length > 0 ? (
                    testResults.vostfrSources.map((source: any, index: number) => 
                      renderSourceCard(source, index)
                    )
                  ) : (
                    <p className="text-gray-500">Aucune source VOSTFR trouvée</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="episodes" className="mt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Sources d'Épisodes</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Sources trouvées dans les épisodes de séries
                  </p>
                  {testResults.episodeSources.length > 0 ? (
                    testResults.episodeSources.map((source: any, index: number) => 
                      renderSourceCard(source, index)
                    )
                  ) : (
                    <p className="text-gray-500">Aucune source d'épisode trouvée</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Données de test utilisées :</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(testFStreamData, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
