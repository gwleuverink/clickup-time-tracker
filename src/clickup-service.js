import moment from 'moment';
import request from 'request';

const TEAM_ID = process.env.VUE_APP_CLICKUP_TEAM_ID;
const API_TOKEN = process.env.VUE_APP_CLICKUP_ACCESS_TOKEN;
const BASE_URL = `https://api.clickup.com/api/v2/team/${TEAM_ID}`

export default  {

    /*
     * Get all time tracking entries within a given range
     */
    async getTimeTrackingRange(start, end) {

        return await new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/time_entries?` + new URLSearchParams({
                    start_date: start.valueOf(),
                    end_date: end.valueOf(),
                }),

                headers: {
                    'Authorization': API_TOKEN,
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if(error) return reject(error)
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
                url: `${BASE_URL}/task?` + new URLSearchParams({
                    page: page,
                    archived: false,
                    include_closed: false,

                    // Only tasks created less than 3 months ago
                    date_created_gt: moment().subtract(3, 'month').valueOf(),
                }),

                headers: {
                    'Authorization': API_TOKEN,
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if(error) return reject(error)

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
            } catch {
                console.warning(`Error retrieving tasks page ${page}. Retrying...`)
            }
        } while (results.length / page === 100)

        return results
    },

    /*
     * Create a new time tracking entry
     */
    async createTimeTrackingEntry(taskId, description, start, end) {
        return await new Promise((resolve, reject) => {

            request({
                method: 'POST',
                url: `${BASE_URL}/time_entries`,
                headers: {
                    'Authorization': API_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description,
                    "tid": taskId,
                    "start": start.valueOf(),
                    "duration": end.valueOf() - start.valueOf(),
                })
            }, (error, response) => {
                if(error) return reject(error)
                resolve(JSON.parse(response.body).data)
            })
        })
    },

    async updateTimeTrackingEntry(entryId, description, start, end) {
        return await new Promise((resolve, reject) => {

            request({
                method: 'PUT',
                url: `${BASE_URL}/time_entries/${entryId}`,
                headers: {
                    'Authorization': API_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description,
                    "start": start.valueOf(),
                    "duration": end.valueOf() - start.valueOf(),
                })
            }, (error, response) => {
                if(error) return reject(error)
                resolve(JSON.parse(response.body).data[0])
            })
        })
    }
}
