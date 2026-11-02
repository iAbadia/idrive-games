// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const LIMIT = 5;
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
function validArcade(a) {
    return a && Array.isArray(a.scores) && a.scores.length <= LIMIT &&
        a.scores.every((s, i) => s && integer(s.id) && s.id > 0 && /^[A-Z]{3}$/.test(s.name) && integer(s.score) && s.score > 0 &&
            (!i || a.scores[i - 1].score >= s.score)) &&
        new Set(a.scores.map((s) => s.id)).size === a.scores.length && integer(a.runId) && a.runId > 0 &&
        integer(a.nextId) && a.nextId > Math.max(a.runId, ...a.scores.map((s) => s.id)) &&
        integer(a.submittedScore) && integer(a.promptedScore) &&
        (a.draft === null || (a.draft && /^[A-Z]{3}$/.test(a.draft.name) && integer(a.draft.cursor) && a.draft.cursor < 3 &&
            ['over', 'scores'].indexOf(a.draft.returnTo) >= 0));
}
function create(saved) {
    return validArcade(saved) ? JSON.parse(JSON.stringify(saved)) :
        { scores: [], runId: 1, nextId: 2, submittedScore: 0, promptedScore: 0, draft: null };
}
function qualifies(a, score) {
    return score > a.submittedScore && score > 0 &&
        (a.scores.length < LIMIT || a.scores.some((s) => s.id === a.runId) || score > a.scores[a.scores.length - 1].score);
}
function record(a, name, score) {
    a.scores = a.scores.filter((s) => s.id !== a.runId).concat([{ id: a.runId, name, score }])
        .sort((x, y) => y.score - x.score || x.id - y.id).slice(0, LIMIT);
    a.submittedScore = score; a.draft = null;
}
function newRun(a) { a.runId = a.nextId++; a.submittedScore = 0; a.promptedScore = 0; a.draft = null; }
module.exports = { LIMIT, validArcade, create, qualifies, record, newRun };
