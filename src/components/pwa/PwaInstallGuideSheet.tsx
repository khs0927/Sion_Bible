import { X, Share, PlusSquare, ExternalLink, Download } from 'lucide-react';
import type { DevicePlatform } from '../../services/pwaInstall';

interface PwaInstallGuideSheetProps {
  open: boolean;
  onClose: () => void;
  platform: DevicePlatform;
  instructions: string[];
  title: string;
}

export function PwaInstallGuideSheet({ open, onClose, platform, instructions, title }: PwaInstallGuideSheetProps) {
  if (!open) return null;

  const th = {
    bg: '#EADDD2',
    panel: '#FFFFFF',
    text: '#3D3129',
    sub: '#7B6A5D',
    accent: '#9A8FE3',
    line: '#E8D8C8',
    pill: '#F5E6D3',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div 
        onClick={onClose} 
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} 
      />
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          maxHeight: '90vh', 
          background: th.panel, 
          borderTopLeftRadius: 28, 
          borderTopRightRadius: 28, 
          padding: '20px 20px calc(24px + env(safe-area-inset-bottom))',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: th.line, margin: '0 auto -4px' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #FFF, #FDF6F0)', border: `1px solid ${th.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Download size={20} color={th.accent} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: th.text, margin: 0 }}>{title}</h3>
              <p style={{ fontSize: 13, color: th.sub, margin: '2px 0 0', fontWeight: 500 }}>더 편하게 말씀을 묵상해 보세요</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: '50%', background: th.pill, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} color={th.text} />
          </button>
        </div>

        <div style={{ background: '#FDF9F6', borderRadius: 20, padding: 20, border: `1px solid ${th.line}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {instructions.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 14 }}>
                <div style={{ 
                  flex: '0 0 24px', 
                  height: 24, 
                  borderRadius: '50%', 
                  background: th.accent, 
                  color: 'white', 
                  fontSize: 12, 
                  fontWeight: 900, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: 14, color: th.text, fontWeight: 600, lineHeight: 1.5, wordBreak: 'keep-all' }}>
                  {step}
                  {idx === 0 && platform === 'ios-safari' && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: th.accent, fontSize: 12 }}>
                      <Share size={14} /> 하단 중앙의 버튼을 찾아보세요
                    </div>
                  )}
                  {idx === 1 && platform === 'ios-safari' && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: th.accent, fontSize: 12 }}>
                      <PlusSquare size={14} /> 목록에 있는 기능이에요
                    </div>
                  )}
                  {platform === 'ios-other' && idx === 1 && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: th.accent, fontSize: 12 }}>
                      <ExternalLink size={14} /> 주소를 복사해 Safari에 붙여넣어 주세요
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={onClose}
          style={{ 
            width: '100%', 
            padding: '16px', 
            borderRadius: 18, 
            background: th.accent, 
            color: 'white', 
            border: 'none', 
            fontSize: 16, 
            fontWeight: 800, 
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(154, 143, 227, 0.3)'
          }}
        >
          확인했습니다
        </button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
