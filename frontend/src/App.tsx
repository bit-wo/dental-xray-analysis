import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AnalysisPanel } from './components/AnalysisPanel';
import { About } from './components/About';
import { useHealthCheck } from './hooks/useApi';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'about'>('dashboard');
  const { health, checkHealth } = useHealthCheck();

  // Check health on mount and periodically
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleNewAnalysis = useCallback(() => {
    setActiveTab('analysis');
    setSidebarOpen(false);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === 'history') return; // Disabled
    setActiveTab(tab as 'dashboard' | 'analysis' | 'about');
    setSidebarOpen(false);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard health={health} onNewAnalysis={handleNewAnalysis} />;
      case 'analysis':
        return <AnalysisPanel onNewAnalysis={handleNewAnalysis} />;
      case 'about':
        return <About health={health} />;
      default:
        return <Dashboard health={health} onNewAnalysis={handleNewAnalysis} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        modelsLoaded={health?.models_loaded ?? false}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          title={activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'analysis' ? 'New Analysis' : 'About / Model Info'}
          description={
            activeTab === 'dashboard'
              ? 'Overview of model status and analysis pipeline'
              : activeTab === 'analysis'
              ? 'Upload a panoramic X-ray for tooth segmentation and disease detection'
              : 'Model details, limitations, and references'
          }
          health={health}
          onMenuClick={() => setSidebarOpen(true)}
          onNewAnalysis={handleNewAnalysis}
          showReportButton={activeTab === 'analysis'}
          onDownloadReport={() => {}}
          showRefresh={true}
          onRefresh={checkHealth}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-full">
            {renderContent()}
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500 text-center">
            DentalAI — Research prototype. Not for clinical use.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;