// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
function policy(def, id) {
    return def.rankings.find((p) => p.id === id);
}
function candidate(def, c) {
    return (
        c &&
        policy(def, c.boardId) &&
        Number.isSafeInteger(c.value) &&
        c.value >= 0
    );
}
function compare(p, a, b) {
    return p.order === 'asc' ? a.value - b.value : b.value - a.value;
}
function qualifies(def, records, run, c) {
    if (!candidate(def, c)) return false;
    const p = policy(def, c.boardId),
        list = records[c.boardId] || [],
        same = list.find((v) => v.runId === run);
    if (same)
        return (
            compare(p, c, same) < 0 ||
            (same.name === null && c.value === same.value)
        );
    return list.length < p.limit || compare(p, c, list[list.length - 1]) < 0;
}
function record(def, records, run, c, name) {
    if (
        candidate(def, c) &&
        (records[c.boardId] || []).some(
            (v) => v.runId === run && v.value === c.value && v.name === name,
        )
    )
        return;
    if (!/^[A-Z]{3}$/.test(name) || !qualifies(def, records, run, c))
        throw Error('Score does not qualify');
    const p = policy(def, c.boardId),
        list = (records[c.boardId] || []).filter((v) => v.runId !== run);
    list.push({ runId: run, name, value: c.value });
    list.sort((a, b) => compare(p, a, b));
    records[c.boardId] = list.slice(0, p.limit);
}
function valid(def, records) {
    if (
        !records ||
        typeof records !== 'object' ||
        Array.isArray(records) ||
        Object.keys(records).some((id) => !policy(def, id))
    )
        return false;
    return def.rankings.every((p) => {
        const a = records[p.id] || [];
        return (
            Array.isArray(a) &&
            a.length <= p.limit &&
            new Set(a.map((v) => v && v.runId)).size === a.length &&
            a.every(
                (v, i) =>
                    v &&
                    typeof v.runId === 'string' &&
                    v.runId.length <= 80 &&
                    (v.name === null || /^[A-Z]{3}$/.test(v.name)) &&
                    candidate(def, { boardId: p.id, value: v.value }) &&
                    (!i || compare(p, a[i - 1], v) <= 0),
            )
        );
    });
}
module.exports = { qualifies, record, valid, candidate };
