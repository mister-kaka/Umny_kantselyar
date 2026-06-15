export const toMoscowTime = (dateString: string): Date => {
    const date = new Date(dateString);
    const offsetMs = 3 * 60 * 60 * 1000;
    return new Date(date.getTime() + offsetMs);
};

export const formatMoscowDate = (dateString: string | null): string => {
    if (!dateString) return "—";
    return toMoscowTime(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

export const formatMoscowDateTime = (dateString: string | null): string => {
    if (!dateString) return "—";
    return toMoscowTime(dateString).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};