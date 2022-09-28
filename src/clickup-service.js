import request from 'request';
import store from '@/store';
import cache from '@/cache';

const TASKS_CACHE_KEY = 'tasks';

function baseUrl() {
    return `https://api.clickup.com/api/v2/team/${store.get('settings.clickup_team_id')}`
}

export default {

    /*
     * Get all time tracking entries within a given range
     */
    async getTimeTrackingRange(start, end) {

        return await new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${baseUrl()}/time_entries?` + new URLSearchParams({
                    start_date: start.valueOf(),
                    end_date: end.valueOf(),
                }),

                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data || [])
            });
        })
    },

    /*
     * Retrieves a page of tasks from the ClickUp API
     */
    async getTasksPage(page) {

        page = page || 0

        return await new Promise((resolve, reject) => {

            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${baseUrl()}/task?` + new URLSearchParams({
                    page: page,
                    archived: false,
                    include_closed: false,
                }),

                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)

                resolve(JSON.parse(response.body).tasks || [])
            });
        })
    },

    /*
    * Get all tasks. Iterated over a paginated list in order to fetch them all.
    * This might take a while
    */
    async getTasks() {

        let page = 0
        let results = []

        do {
            try {
                results = await results.concat(await this.getTasksPage(page))
                page++
            } catch(e) {
                console.log(`Error retrieving tasks page ${page}. Retrying...`, e)
            }
        } while (results.length / page === 100)

        return results
    },

    async getCachedTasks() {

        const cached = cache.get(TASKS_CACHE_KEY)

        if (cached) {
            return cached
        }

        return cache.put(
            TASKS_CACHE_KEY,
            await this.getTasks(),
            Date.now() + 3600 * 6 // plus 6 hours
        )
    },

    async clearCachedTasks() {
        cache.clear(TASKS_CACHE_KEY)
    },

    /*
     * Create a new time tracking entry
     */
    async createTimeTrackingEntry(taskId, description, start, end) {
        return await new Promise((resolve, reject) => {

            request({
                method: 'POST',
                url: `${baseUrl()}/time_entries`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description,
                    "tid": taskId,
                    "start": start.valueOf(),
                    "duration": end.valueOf() - start.valueOf(),
                })
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data)
            })
        })
    },

    /*
     * Update an exisiting time tracking entry
     */
    async updateTimeTrackingEntry(entryId, description, start, end) {
        return await new Promise((resolve, reject) => {

            request({
                method: 'PUT',
                url: `${baseUrl()}/time_entries/${entryId}`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description,
                    "start": start.valueOf(),
                    "duration": end.valueOf() - start.valueOf(),
                })
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data[0])
            })
        })
    },

    /*
     * Deleta a time tracking entry
     */
    async deleteTimeTrackingEntry(entryId) {
        return await new Promise((resolve, reject) => {

            request({
                method: 'DELETE',
                url: `${baseUrl()}/time_entries/${entryId}`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data[0])
            })
        })
    }
}
