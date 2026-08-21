"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localDateKey = localDateKey;
exports.dayDifference = dayDifference;
exports.parseTime = parseTime;
exports.formatTime = formatTime;
/** Local calendar date as "YYYY-MM-DD" (device timezone). */
function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
/** Whole local-calendar-day difference between two "YYYY-MM-DD" keys. */
function dayDifference(fromKey, toKey) {
    const from = new Date(`${fromKey}T12:00:00`);
    const to = new Date(`${toKey}T12:00:00`);
    return Math.round((to.getTime() - from.getTime()) / 86400000);
}
/** Parse "HH:MM" → { hour, minute }; returns null when malformed. */
function parseTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match)
        return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59)
        return null;
    return { hour, minute };
}
function formatTime(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
