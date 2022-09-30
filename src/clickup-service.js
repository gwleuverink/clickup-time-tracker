import request from 'request';
import store from '@/store';
import cache from '@/cache';

const BASE_URL = 'https://api.clickup.com/api/v2';
const TASKS_CACHE_KEY = 'tasks';

function teamRootUrl() {
    return `${BASE_URL}/team/${store.get('settings.clickup_team_id')}`
}

export default {

    /*
     * Retrieves a page of tasks from the ClickUp API
     */
     tokenValid(token) {

        return new Promise((resolve, reject) => {

            request({
                method: 'GET',
                mode: 'no-cors',
                url: BASE_URL + '/user',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)

                const user = JSON.parse(response.body).user

                if (! user) reject('Invalid response')

                resolve(true)
            });
        })
    },



    /*
     * Get all time tracking entries within a given range
     */
    getTimeTrackingRange(start, end) {

        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${teamRootUrl()}/time_entries?` + new URLSearchParams({
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
    getTasksPage(page) {

        page = page || 0

        return new Promise((resolve, reject) => {

            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${teamRootUrl()}/task?` + new URLSearchParams({
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

        let tasks = await this.getTasks()

        tasks = tasks.map(task => ({
            id: task.id,
            name: `${task.name}`,
            folder: `${task.folder.name}`
        }))

        return cache.put(
            TASKS_CACHE_KEY,
            tasks,
            Date.now() + 3600 * 6 // plus 6 hours
        )
    },

    clearCachedTasks() {
        cache.clear(TASKS_CACHE_KEY)
    },

    /*
     * Create a new time tracking entry
     */
    createTimeTrackingEntry(taskId, description, start, end) {
        return new Promise((resolve, reject) => {

            request({
                method: 'POST',
                url: `${teamRootUrl()}/time_entries`,
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
    updateTimeTrackingEntry(entryId, description, start, end) {
        return new Promise((resolve, reject) => {

            request({
                method: 'PUT',
                url: `${teamRootUrl()}/time_entries/${entryId}`,
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
    deleteTimeTrackingEntry(entryId) {
        return new Promise((resolve, reject) => {

            request({
                method: 'DELETE',
                url: `${teamRootUrl()}/time_entries/${entryId}`,
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
