import { LayoutDashboard, FilePlus, History, Info, ChevronLeft, ChevronRight, Smile } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  modelsLoaded: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analysis', label: 'New Analysis', icon: FilePlus },
  { id: 'history', label: 'History', icon: History, disabled: true },
  { id: 'about', label: 'About / Model Info', icon: Info },
];

export function Sidebar({ isOpen, onToggle, activeTab, onTabChange, modelsLoaded }: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-full w-64 bg-white border-r border-slate-200
          transform transition-transform duration-200 ease-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Smile className="w-7 h-7 text-accent-600" aria-hidden="true" />
            <span className="font-display font-semibold text-slate-900">DentalAI</span>
          </div>
          <button
            className="lg:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            onClick={onToggle}
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon, disabled }) => (
            <button
              key={id}
              onClick={() => !disabled && onTabChange(id)}
              disabled={disabled}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${activeTab === id
                  ? 'bg-accent-50 text-accent-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Model status & disclaimer */}
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <span className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{modelsLoaded ? 'Models loaded' : 'Models unavailable'}</span>
          </div>

          <div className="disclaimer-banner" role="alert">
            <strong>Research use only.</strong> This system is not clinically validated. Model findings and tooth associations can be wrong. Do not use for diagnosis or treatment decisions. A qualified dental professional must review the original X-ray.
          </div>
        </div>

        {/* Desktop toggle */}
        <button
          className="hidden lg:flex items-center justify-center gap-2 px-4 py-2 mx-3 mt-auto mb-3 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          onClick={onToggle}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <ChevronRight className="w-4 h-4" />
              <span>Expand</span>
            </>
          )}
        </button>
      </aside>
    </>
  );
}