import React, { useState, useEffect } from 'react';
import '../styles/ScrollToTop.css';

const ScrollToTop: React.FC = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollUp = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!visible) return null;

    return (
        <button className="scroll-to-top" onClick={scrollUp}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 15V3M9 3L4 8M9 3l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </button>
    );
};

export default ScrollToTop;