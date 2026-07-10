import { useMessageStore } from '../store/useMessageStore';

export function GlobalMessages() {
  const { messages } = useMessageStore();

  const getScale = () => {
    if (typeof document === 'undefined') return 1;
    const match = document.body.style.transform.match(/scale\((.*?)\)/);
    return match ? parseFloat(match[1]) : 1;
  };

  const scale = getScale();

  return (
    <>
      {messages.map((msg) => {
        if (msg.type === 'mouse' && msg.x !== undefined && msg.y !== undefined) {
          return (
            <div 
              key={msg.id} 
              className="fixed pointer-events-none z-[9999] flex flex-col items-center animate-[mouseFloat_1.5s_linear_forwards]"
              style={{ left: msg.x / scale, top: (msg.y / scale) - 40 }}
            >
              <span className="font-sans text-red-400 font-bold text-[20px] whitespace-nowrap [text-shadow:2px_2px_1px_rgba(0,0,0,1)]">
                {msg.text}
              </span>
            </div>
          );
        }
        return null;
      })}
    </>
  );
}
