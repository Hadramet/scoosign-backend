import { labels } from '../aggregation/labels.js'

export function getPaginatorDefaultOptions(req) {
    return {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        customLabels: labels,
    }
}
