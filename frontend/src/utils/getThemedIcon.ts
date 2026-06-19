export const getThemedIcon = (path: string): string => {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') {
        const lastDot = path.lastIndexOf('.');
        if (lastDot !== -1) {
            return path.substring(0, lastDot) + '_dark' + path.substring(lastDot);
        }
    }
    return path;
};