export function Message({ text, error = false }: { text?: string; error?: boolean }) { return text ? <div className={error ? 'notice error' : 'notice'}>{text}</div> : null; }
