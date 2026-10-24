import { ImageViewer } from './ImageViewer';
import { IMAGE_VIEW_LABELS, IMAGE_VIEW_DESCRIPTIONS } from '@/types/api';
import type { ImageViewType } from '@/types/api';

interface ImageComparisonProps {
  images: Record<ImageViewType, string> | Partial<Record<ImageViewType, string>>;
  activeView: ImageViewType;
  onViewChange: (view: ImageViewType) => void;
  title?: string;
  className?: string;
  availableViews?: ImageViewType[];
}

const VIEW_ORDER: ImageViewType[] = ['original', 'enhanced', 'segmentation', 'disease', 'combined'];

export function ImageComparison({
  images,
  activeView,
  onViewChange,
  title = 'X-ray Views',
  className = '',
  availableViews,
}: ImageComparisonProps) {
  const views = availableViews ?? VIEW_ORDER.filter((v) => images[v]);

  if (views.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-slate-500">No images available</p>
      </div>
    );
  }

  return (
    <div className={`panel ${className}`}>
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-display font-semibold text-slate-900 mb-3">{title}</h3>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Image view selection">
          {views.map((view) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              role="tab"
              aria-selected={activeView === view}
              aria-label={IMAGE_VIEW_LABELS[view]}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${activeView === view
                  ? 'bg-accent-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
              `}
            >
              {IMAGE_VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="relative">
          <ImageViewer
            src={images[activeView]!}
            alt={IMAGE_VIEW_LABELS[activeView]}
            showControls={true}
            showZoomPercent={true}
            className="w-full h-auto max-h-[70vh]"
          />
        </div>
        <p className="mt-3 text-sm text-slate-500 text-center">
          {IMAGE_VIEW_DESCRIPTIONS[activeView]}
        </p>
      </div>
    </div>
  );
}