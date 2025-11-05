import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { testScraper, testMultipleUrls, TEST_URLS, ScraperTestResult } from '@/utils/testScraper';

export default function ScraperTest() {
  const [testUrl, setTestUrl] = useState(TEST_URLS.LULUSTREAM);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScraperTestResult | null>(null);
  const [multipleResults, setMultipleResults] = useState<ScraperTestResult[]>([]);

  const handleSingleTest = async () => {
    if (!testUrl.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const testResult = await testScraper(testUrl);
      setResult(testResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultipleTest = async () => {
    setIsLoading(true);
    setMultipleResults([]);
    
    try {
      const results = await testMultipleUrls(TEST_URLS.OTHER_STREAMING);
      setMultipleResults(results);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge variant="default" className="bg-green-500">Succès</Badge>
    ) : (
      <Badge variant="destructive">Échec</Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 Test du Scraper Vidzy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test simple */}
          <div className="space-y-2">
            <label className="text-sm font-medium">URL à tester:</label>
            <div className="flex gap-2">
              <Input
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://lulustream.com/e/yv1821qvwhep"
                className="flex-1"
              />
              <Button 
                onClick={handleSingleTest} 
                disabled={isLoading || !testUrl.trim()}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tester'}
              </Button>
            </div>
          </div>

          {/* Résultat du test simple */}
          {result && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.success)}
                    <span className="font-medium">Résultat du test</span>
                  </div>
                  {getStatusBadge(result.success)}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Temps de réponse: {result.responseTime}ms</span>
                  </div>
                  
                  {result.success && result.m3u8Url && (
                    <div>
                      <span className="font-medium text-green-600">M3U8 extrait:</span>
                      <div className="mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                        {result.m3u8Url}
                      </div>
                    </div>
                  )}
                  
                  {!result.success && result.error && (
                    <div>
                      <span className="font-medium text-red-600">Erreur:</span>
                      <div className="mt-1 text-red-600">{result.error}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test multiple */}
          <div className="pt-4 border-t">
            <Button 
              onClick={handleMultipleTest} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Tester plusieurs URLs
            </Button>
          </div>

          {/* Résultats des tests multiples */}
          {multipleResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Résultats des tests multiples:</h4>
              {multipleResults.map((result, index) => (
                <Card key={index} className="border-l-4 border-l-gray-300">
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.success)}
                        <span className="text-sm font-medium">Test {index + 1}</span>
                      </div>
                      {getStatusBadge(result.success)}
                    </div>
                    
                    <div className="text-xs space-y-1">
                      <div className="text-gray-600 break-all">{result.url}</div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{result.responseTime}ms</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
