import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionClasses: Record<NonNullable<TooltipProps['position']>, string> = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
};

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);

    const currentPositionClass = positionClasses[position];

    return (
        <div
            className="relative inline-flex items-center justify-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className={`fixed z-[99999] px-3 py-1.5 text-xs font-semibold text-white bg-black/90 backdrop-blur-sm border border-white/20 rounded shadow-lg whitespace-nowrap pointer-events-none ${currentPositionClass}`}>
                    {content}
                </div>
            )}
        </div>
    );
};
